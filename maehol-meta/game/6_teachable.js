// =====================================================================
//  game/6_teachable.js  —  티처블 머신 연결
//
//  티처블 머신으로 만든 AI 모델을 게임에 연결하는 파일이에요.
//    - 얼굴 인식 모델  : 동훈 / 민성 / 성민 / No one(사람 없음)  →  캐릭터 선택
//    - 동작 인식 모델  : 위 / 아래 / 왼쪽 / 오른쪽 / 확인        →  캐릭터 이동
//
//  config.js 의 링크(TM_FACE_MODEL_URL, TM_MOTION_MODEL_URL)가 "" (비어 있음)이면
//  카메라도 모델도 켜지 않아요. 그러면 키보드/마우스로만 플레이해요.
//
//  흐름:  카메라 켜기 → (0.07초마다) 카메라 그림을 모델에 넣기 → 결과(클래스 이름, 확률) 받기
//         → config.js 의 이름표와 비교해서 "캐릭터" 또는 "방향"으로 바꾸기
// =====================================================================

const TM = (MH.TM = {
  video: null,         // 카메라 영상
  canvas: null,        // 모델에 넣을 그림 (224 x 224, 좌우를 뒤집은 정사각형)
  cctx: null,
  stream: null,
  cameraOn: false,
  cameraError: null,
  running: false,

  // 얼굴 인식 결과
  face: {
    enabled: false, model: null, status: "off",
    label: "",       // 모델이 말한 클래스 이름 (예: "민성")
    prob: 0,         // 그 클래스일 확률 (0~1)
    probs: [],       // 모든 클래스의 확률
    key: null,       // 확실히 인식된 캐릭터 (donghun / minseong / seongmin) 또는 null
    none: false,     // "No one" (사람이 없음) 인지
    updated: 0,
  },
  // 동작 인식 결과
  motion: {
    enabled: false, model: null, status: "off",
    label: "", prob: 0, probs: [], dir: null, action: false,
  },

  _scripts: {},        // 이미 불러온 라이브러리
  _lastAction: 0,
});

// config.js 의 설정 가져오기
const tmConfig = () => window.CONFIG || {};
const tmHasUrl = (u) => typeof u === "string" && u.trim().length > 0;

TM.faceConfigured = () => tmHasUrl(tmConfig().TM_FACE_MODEL_URL);
TM.motionConfigured = () => tmHasUrl(tmConfig().TM_MOTION_MODEL_URL);
TM.anyConfigured = () => TM.faceConfigured() || TM.motionConfigured();


// ---------------------------------------------------------------------
// 도우미: 자바스크립트 파일을 필요할 때 불러오기
//   (TensorFlow 같은 큰 라이브러리는 링크가 있을 때만 불러와서 게임이 가벼워요)
// ---------------------------------------------------------------------
function tmLoadScript(src) {
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

// 티처블 머신 링크에서 model.json / metadata.json 주소를 만들어요.
//   "https://teachablemachine.withgoogle.com/models/AbC/"  →  .../AbC/model.json
function tmUrls(base) {
  let b = base.trim();
  if (/\.json$/i.test(b)) b = b.replace(/[^/]*$/, "");
  if (!b.endsWith("/")) b += "/";
  return { model: b + "model.json", meta: b + "metadata.json" };
}


// ---------------------------------------------------------------------
// 카메라 켜고 끄기
// ---------------------------------------------------------------------
TM.startCamera = async function () {
  if (TM.cameraOn) return true;
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("이 브라우저에서는 카메라를 쓸 수 없어요 (https 또는 localhost에서 열어 주세요)");
    }
    TM.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
    // 화면에는 안 보이는 video 태그에 카메라 영상을 연결해요
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

// 카메라 영상을 모델에 넣을 그림으로 바꿔요.
// 티처블 머신 웹캠처럼 좌우를 뒤집고, 가운데 정사각형만 잘라요.
function tmDrawFrame() {
  const v = TM.video;
  if (!v || v.readyState < 2 || !v.videoWidth) return false;
  const size = Math.min(v.videoWidth, v.videoHeight);
  const sx = (v.videoWidth - size) / 2;
  const sy = (v.videoHeight - size) / 2;
  const c = TM.cctx;
  c.save();
  c.translate(224, 0);
  c.scale(-1, 1);                                  // 좌우 뒤집기
  c.drawImage(v, sx, sy, size, size, 0, 0, 224, 224);
  c.restore();
  return true;
}


// ---------------------------------------------------------------------
// 결과 해석: 모델이 말한 클래스 이름을 게임이 이해하는 말로 바꿔요.
// ---------------------------------------------------------------------

// label 이 이름 목록(list) 안에 있는지 (대소문자, 띄어쓰기 무시)
function tmMatch(label, list) {
  const n = MH.norm(label);
  return (list || []).some((x) => MH.norm(x) === n);
}

// 얼굴 인식 결과 해석.  예) ("민성", 0.97) → face.key = "minseong"
//                          ("No one", 0.99) → face.none = true, face.key = null
TM.interpretFace = function (label, prob, probs) {
  const f = TM.face;
  f.label = label;
  f.prob = prob;
  f.probs = probs || [];
  f.updated = performance.now();
  f.none = tmMatch(label, tmConfig().FACE_NONE_CLASSES);       // "No one" 인가?
  f.key = null;
  if (!f.none) {
    // config.js 의 FACE_CLASSES 에서 이 클래스 이름이 어느 캐릭터인지 찾아요
    for (const [key, names] of Object.entries(tmConfig().FACE_CLASSES || {})) {
      if (tmMatch(label, names)) { f.key = key; break; }
    }
  }
  // 확률이 낮으면(기본 80% 미만) 아직 모르는 걸로 둬요
  if (f.key && prob < (tmConfig().FACE_MIN_PROB || 0.8)) f.key = null;
};

// 동작 인식 결과 해석.  예) ("오른쪽", 0.95) → motion.dir = "right"
TM.interpretMotion = function (label, prob, probs) {
  const m = TM.motion;
  m.label = label;
  m.prob = prob;
  m.probs = probs || [];
  let dir = null, action = false;
  const confident = prob >= (tmConfig().MOTION_MIN_PROB || 0.75);
  if (confident && !tmMatch(label, tmConfig().MOTION_IDLE_CLASSES)) {
    const classes = tmConfig().MOTION_CLASSES || {};
    for (const d of ["up", "down", "left", "right"]) {
      if (tmMatch(label, classes[d])) dir = d;
    }
    if (tmMatch(label, classes.action)) {                       // "확인" 동작
      const now = performance.now();
      if (now - TM._lastAction > 900) { action = true; TM._lastAction = now; }   // 0.9초에 한 번만
    }
  }
  m.dir = dir;
  Input.setMotion(dir, action);        // 1_basics.js 의 Input 에게 알려 줘요 → 캐릭터가 움직여요
};


// ---------------------------------------------------------------------
// 모델 불러오기
// ---------------------------------------------------------------------
async function tmLoadLibs(kind) {
  await tmLoadScript("lib/tf.min.js");                       // TensorFlow.js
  if (kind === "pose") {
    await tmLoadScript("lib/posenet.min.js");
    await tmLoadScript("lib/teachablemachine-pose.min.js");
  } else {
    await tmLoadScript("lib/teachablemachine-image.min.js");
  }
}

async function tmInitFace() {
  const f = TM.face;
  f.enabled = true;
  f.status = "불러오는 중...";
  try {
    await tmLoadLibs("image");
    const u = tmUrls(tmConfig().TM_FACE_MODEL_URL);
    f.model = await window.tmImage.load(u.model, u.meta);
    f.status = "준비됨";
  } catch (e) {
    f.model = null;
    f.status = "오류: 얼굴 모델을 불러오지 못했어요";
    console.warn(e);
  }
}

async function tmInitMotion() {
  const m = TM.motion;
  m.enabled = true;
  m.status = "불러오는 중...";
  try {
    const kind = tmConfig().TM_MOTION_TYPE === "image" ? "image" : "pose";
    await tmLoadLibs(kind);
    const u = tmUrls(tmConfig().TM_MOTION_MODEL_URL);
    m.kind = kind;
    m.model = kind === "pose" ? await window.tmPose.load(u.model, u.meta) : await window.tmImage.load(u.model, u.meta);
    m.status = "준비됨";
  } catch (e) {
    m.model = null;
    m.status = "오류: 동작 모델을 불러오지 못했어요";
    console.warn(e);
  }
}

// 예측 결과 중 확률이 가장 높은 것
function tmTopPrediction(preds) {
  let best = preds[0];
  for (const p of preds) if (p.probability > best.probability) best = p;
  return best;
}

// 0.07초마다 반복: 카메라 그림을 모델에 넣고 결과를 받아요.
async function tmTick() {
  if (!TM.running) return;
  try {
    if (TM.cameraOn && tmDrawFrame()) {
      if (TM.face.model) {
        const preds = await TM.face.model.predict(TM.canvas);
        const best = tmTopPrediction(preds);
        TM.interpretFace(best.className, best.probability, preds.map((p) => ({ name: p.className, p: p.probability })));
      }
      if (TM.motion.model) {
        let preds;
        if (TM.motion.kind === "pose") {
          const { posenetOutput } = await TM.motion.model.estimatePose(TM.canvas);   // 몸의 관절 위치 찾기
          preds = await TM.motion.model.predict(posenetOutput);
        } else {
          preds = await TM.motion.model.predict(TM.canvas);
        }
        const best = tmTopPrediction(preds);
        TM.interpretMotion(best.className, best.probability, preds.map((p) => ({ name: p.className, p: p.probability })));
      }
    }
  } catch (e) {
    console.warn("티처블 머신 예측 오류", e);
  }
  setTimeout(tmTick, 70);
}


// ---------------------------------------------------------------------
// 시작 / 멈춤
// ---------------------------------------------------------------------

// 링크가 있는 모델만 불러와요. 여러 번 불러도 한 번만 시작해요.
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
  if (TM.faceConfigured()) jobs.push(tmInitFace());
  if (TM.motionConfigured()) jobs.push(tmInitMotion());
  await Promise.all(jobs);
  tmTick();
};

TM.stop = function () {
  TM.running = false;
  TM.stopCamera();
  Input.setMotion(null, false);
};

// 시험용: 카메라 없이 결과를 흉내 낼 수 있어요.
//   브라우저 개발자 도구(F12) 콘솔에 이렇게 입력해 보세요:
//     MH.TM.debug.face("민성", 0.95)       → 민성으로 인식된 것처럼
//     MH.TM.debug.face("No one", 0.99)     → 사람이 없는 것처럼
//     MH.TM.debug.motion("오른쪽", 0.95)   → 오른쪽 동작처럼 (캐릭터가 오른쪽으로 걸어요)
TM.debug = {
  face(label, prob = 0.95) {
    TM.face.enabled = true;
    TM.face.status = "준비됨(테스트)";
    TM.interpretFace(label, prob, [{ name: label, p: prob }]);
  },
  motion(label, prob = 0.95) {
    TM.motion.enabled = true;
    TM.motion.status = "준비됨(테스트)";
    TM.interpretMotion(label, prob, [{ name: label, p: prob }]);
  },
};
