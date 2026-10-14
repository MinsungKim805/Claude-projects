// ============================================================
//  티처블 머신 연결
//   - 얼굴 인식 모델: 동훈 / 민성 / 성민 / No one(사람 없음) → 캐릭터 선택
//   - 동작 인식 모델: 위 / 아래 / 왼쪽 / 오른쪽 / 확인 → 캐릭터 이동
//  링크(CONFIG.TM_FACE_MODEL_URL, CONFIG.TM_MOTION_MODEL_URL)가 비어 있으면 아무것도 켜지 않아요.
// ============================================================
(function () {
  const TM = (MH.TM = {
    video: null,
    canvas: null,
    cctx: null,
    stream: null,
    cameraOn: false,
    cameraError: null,
    running: false,
    face: { enabled: false, model: null, status: "off", label: "", prob: 0, probs: [], key: null, none: false, updated: 0 },
    motion: { enabled: false, model: null, status: "off", label: "", prob: 0, probs: [], dir: null, action: false },
    _scripts: {},
    _lastAction: 0,
  });

  const cfg = () => window.CONFIG || {};
  const hasUrl = (u) => typeof u === "string" && u.trim().length > 0;

  TM.faceConfigured = () => hasUrl(cfg().TM_FACE_MODEL_URL);
  TM.motionConfigured = () => hasUrl(cfg().TM_MOTION_MODEL_URL);
  TM.anyConfigured = () => TM.faceConfigured() || TM.motionConfigured();

  function loadScript(src) {
    if (TM._scripts[src]) return TM._scripts[src];
    TM._scripts[src] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("스크립트를 불러오지 못했어요: " + src));
      document.head.appendChild(s);
    });
    return TM._scripts[src];
  }

  function urls(base) {
    let b = base.trim();
    if (/\.json$/i.test(b)) b = b.replace(/[^/]*$/, "");
    if (!b.endsWith("/")) b += "/";
    return { model: b + "model.json", meta: b + "metadata.json" };
  }

  // ---------------------------------------------------------------- 카메라
  TM.startCamera = async function () {
    if (TM.cameraOn) return true;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("이 브라우저에서는 카메라를 쓸 수 없어요 (https 또는 localhost에서 열어 주세요)");
      }
      TM.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
      const v = document.createElement("video");
      v.setAttribute("playsinline", "");
      v.muted = true;
      v.autoplay = true;
      v.style.cssText = "position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none";
      document.body.appendChild(v);
      v.srcObject = TM.stream;
      await v.play();
      TM.video = v;
      TM.canvas = document.createElement("canvas");
      TM.canvas.width = TM.canvas.height = 224;
      TM.cctx = TM.canvas.getContext("2d");
      TM.cameraOn = true;
      TM.cameraError = null;
      return true;
    } catch (e) {
      TM.cameraError = e && e.message ? e.message : String(e);
      TM.cameraOn = false;
      return false;
    }
  };

  TM.stopCamera = function () {
    if (TM.stream) TM.stream.getTracks().forEach((t) => t.stop());
    if (TM.video && TM.video.parentNode) TM.video.parentNode.removeChild(TM.video);
    TM.stream = TM.video = TM.canvas = TM.cctx = null;
    TM.cameraOn = false;
  };

  // 티처블 머신 웹캠처럼 좌우를 뒤집고 가운데 정사각형만 잘라서 모델에 넣어요.
  function drawFrame() {
    const v = TM.video;
    if (!v || v.readyState < 2 || !v.videoWidth) return false;
    const s = Math.min(v.videoWidth, v.videoHeight);
    const sx = (v.videoWidth - s) / 2;
    const sy = (v.videoHeight - s) / 2;
    const c = TM.cctx;
    c.save();
    c.translate(224, 0);
    c.scale(-1, 1);
    c.drawImage(v, sx, sy, s, s, 0, 0, 224, 224);
    c.restore();
    return true;
  }

  // ---------------------------------------------------------------- 결과 해석
  function matchList(label, list) {
    const n = MH.norm(label);
    return (list || []).some((x) => MH.norm(x) === n);
  }

  TM.interpretFace = function (label, prob, probs) {
    const f = TM.face;
    f.label = label;
    f.prob = prob;
    f.probs = probs || [];
    f.updated = performance.now();
    f.none = matchList(label, cfg().FACE_NONE_CLASSES);
    f.key = null;
    if (!f.none) {
      for (const [key, names] of Object.entries(cfg().FACE_CLASSES || {})) {
        if (matchList(label, names)) { f.key = key; break; }
      }
    }
    if (f.key && prob < (cfg().FACE_MIN_PROB || 0.8)) f.key = null;   // 확신이 낮으면 아직 모르는 걸로 둬요
  };

  TM.interpretMotion = function (label, prob, probs) {
    const m = TM.motion;
    m.label = label;
    m.prob = prob;
    m.probs = probs || [];
    let dir = null, action = false;
    if (prob >= (cfg().MOTION_MIN_PROB || 0.75) && !matchList(label, cfg().MOTION_IDLE_CLASSES)) {
      const mc = cfg().MOTION_CLASSES || {};
      for (const d of ["up", "down", "left", "right"]) if (matchList(label, mc[d])) dir = d;
      if (matchList(label, mc.action)) {
        const now = performance.now();
        if (now - TM._lastAction > 900) { action = true; TM._lastAction = now; }
      }
    }
    m.dir = dir;
    MH.Input.setMotion(dir, action);
  };

  // ---------------------------------------------------------------- 모델 불러오기
  async function loadLibs(kind) {
    await loadScript("lib/tf.min.js");
    if (kind === "pose") {
      await loadScript("lib/posenet.min.js");
      await loadScript("lib/teachablemachine-pose.min.js");
    } else {
      await loadScript("lib/teachablemachine-image.min.js");
    }
  }

  async function initFace() {
    const f = TM.face;
    f.enabled = true;
    f.status = "불러오는 중...";
    try {
      await loadLibs("image");
      const u = urls(cfg().TM_FACE_MODEL_URL);
      f.model = await window.tmImage.load(u.model, u.meta);
      f.status = "준비됨";
    } catch (e) {
      f.model = null;
      f.status = "오류: 얼굴 모델을 불러오지 못했어요";
      console.warn(e);
    }
  }

  async function initMotion() {
    const m = TM.motion;
    m.enabled = true;
    m.status = "불러오는 중...";
    try {
      const kind = cfg().TM_MOTION_TYPE === "image" ? "image" : "pose";
      await loadLibs(kind);
      const u = urls(cfg().TM_MOTION_MODEL_URL);
      m.kind = kind;
      m.model = kind === "pose" ? await window.tmPose.load(u.model, u.meta) : await window.tmImage.load(u.model, u.meta);
      m.status = "준비됨";
    } catch (e) {
      m.model = null;
      m.status = "오류: 동작 모델을 불러오지 못했어요";
      console.warn(e);
    }
  }

  function top(preds) {
    let best = preds[0];
    for (const p of preds) if (p.probability > best.probability) best = p;
    return best;
  }

  async function tick() {
    if (!TM.running) return;
    try {
      if (TM.cameraOn && drawFrame()) {
        if (TM.face.model) {
          const preds = await TM.face.model.predict(TM.canvas);
          const b = top(preds);
          TM.interpretFace(b.className, b.probability, preds.map((p) => ({ name: p.className, p: p.probability })));
        }
        if (TM.motion.model) {
          let preds;
          if (TM.motion.kind === "pose") {
            const { posenetOutput } = await TM.motion.model.estimatePose(TM.canvas);
            preds = await TM.motion.model.predict(posenetOutput);
          } else {
            preds = await TM.motion.model.predict(TM.canvas);
          }
          const b = top(preds);
          TM.interpretMotion(b.className, b.probability, preds.map((p) => ({ name: p.className, p: p.probability })));
        }
      }
    } catch (e) {
      console.warn("티처블 머신 예측 오류", e);
    }
    setTimeout(tick, 70);
  }

  // 시작: 링크가 있는 모델만 불러와요. 여러 번 불러도 한 번만 시작해요.
  TM.start = async function () {
    if (TM.running || !TM.anyConfigured()) return;
    TM.running = true;
    const ok = await TM.startCamera();
    if (!ok) {
      TM.face.status = TM.faceConfigured() ? "카메라를 켜지 못했어요" : "off";
      TM.motion.status = TM.motionConfigured() ? "카메라를 켜지 못했어요" : "off";
      TM.running = false;
      return;
    }
    const jobs = [];
    if (TM.faceConfigured()) jobs.push(initFace());
    if (TM.motionConfigured()) jobs.push(initMotion());
    await Promise.all(jobs);
    tick();
  };

  TM.stop = function () {
    TM.running = false;
    TM.stopCamera();
    MH.Input.setMotion(null, false);
  };

  // 시험용: 카메라 없이 결과를 흉내 낼 때 써요. (개발자 도구 콘솔에서 MH.TM.debug.face("민성", 0.95))
  TM.debug = {
    face(label, prob = 0.95) { TM.face.enabled = true; TM.face.status = "준비됨(테스트)"; TM.interpretFace(label, prob, [{ name: label, p: prob }]); },
    motion(label, prob = 0.95) { TM.motion.enabled = true; TM.motion.status = "준비됨(테스트)"; TM.interpretMotion(label, prob, [{ name: label, p: prob }]); },
  };
})();
