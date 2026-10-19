// noprotect
// ===== game.js  —  메타 투어 매홀 게임 코드 ② (p5.js): 월드 · 티처블 머신 · 시작/캐릭터 선택/게임 화면 =====
//  sketch.js 와 함께 쓰는 파일이에요. (index.html 에서 sketch.js 다음에 불러와요)
//  차례: 4.월드(맵·충돌·문·카메라)  5.티처블 머신  6.화면들(title · select · game)
//  ※ 이 파일에는 for(;;)·while 반복문을 쓰지 않아요(p5 웹 에디터의 반복문 보호와 충돌해요). 반복은 for...of / times(n) 로 해요.
//  ※ 맨 아래 MAEHOL_GAME 표시는 sketch.js 가 "이 파일이 불러와졌나?" 확인하는 데 써요.


// ===== 4. 월드: 맵, 충돌, 잠긴 문, 카메라, 그리기 =====
//     좌표는 모두 "픽셀"이에요. 캐릭터의 x, y 는 발 위치예요.
let grid, gates, npcs, objs, decor, player, cam, sparks = [];

function initWorld() {
  grid = MAP.collision.map((row) => [...row].map((c) => c === "1"));  // 칸마다 true(벽) / false(걸을 수 있음)
  gates = MAP.gates.map((g) => ({ ...g, open: false, tiles: Array.from({ length: g.size }, (_, i) => (g.o === "v" ? [g.x, g.y + i] : [g.x + i, g.y])) }));
  npcs = MAP.npcs.map((n) => ({ key: n.spr, name: n.name, id: n.id, area: n.area, role: n.role, tx: n.x, ty: n.y, x: (n.x + 0.5) * T, y: n.y * T + 27, dir: n.dir, home: n.dir }));
  // 가구: 그릴 위치와 "앞뒤 순서(sort)"를 미리 계산해 둬요. 아래쪽에 있는 것일수록 나중에(앞에) 그려요.
  objs = MAP.objects.map((o) => {
    const i = LIST.objects[o.n];
    return { n: o.n, x: o.x * T, y: (o.y + i.d) * T - i.ph + i.pad, sort: (o.y + i.d) * T, w: i.pw, h: i.ph };
  }).sort((a, b) => a.sort - b.sort);
  decor = MAP.decor.map((d) => ({ n: d.n, x: d.x, y: d.y, w: LIST.objects[d.n].pw, h: LIST.objects[d.n].ph }));  // 벽 장식
  player = { key: charKey, x: 0, y: 0, dir: "down", moving: false, anim: 0 };
  resetWorld();
}
function resetWorld() {  // 새 게임: 처음 상태로
  gates.forEach((g) => (g.open = false));
  Object.assign(player, { key: charKey, x: (MAP.spawn.x + 0.5) * T, y: MAP.spawn.y * T + 27, dir: "down", moving: false, sit: false });
  npcs.forEach((n) => (n.dir = n.home));
  sparks = [];
  openGates(false);
  moveCamera(0, true);
}

// (tx, ty) 칸이 막혔는지: 맵 밖, 벽, 닫힌 문, NPC가 서 있는 칸
function isBlocked(tx, ty) {
  if (grid[ty]?.[tx] !== false) return true;
  return gates.some((g) => !g.open && g.tiles.some(([x, y]) => x === tx && y === ty)) || npcs.some((n) => n.tx === tx && n.ty === ty);
}
// 발 위치(x, y)에 서면 막히는지 (발 주변 가로 16, 세로 6 크기의 상자를 검사해요)
function footBlocked(x, y) {
  const [x0, x1, y0, y1] = [Math.floor((x - 8) / T), Math.floor((x + 8) / T), Math.floor((y - 6) / T), Math.floor(y / T)];
  return times(y1 - y0 + 1).some((j) => times(x1 - x0 + 1).some((i) => isBlocked(x0 + i, y0 + j)));
}
// 조건(requires)을 채운 문을 열어요. 새로 열린 문 목록을 돌려줘요.
function openGates(effects) {
  const opened = gates.filter((g) => !g.open && g.requires.every((id) => done[id]));
  for (const g of opened) {
    g.open = true;
    if (!effects) continue;
    const [cx, cy] = g.o === "v" ? [(g.x + 0.5) * T, (g.y + g.size / 2) * T] : [(g.x + g.size / 2) * T, (g.y + 0.5) * T];
    for (const i of times(36)) {  // 반짝이는 불꽃 36개
      const a = Math.random() * 6.28, s = 20 + Math.random() * 70;
      sparks.push({ x: cx + Math.random() * 28 - 14, y: cy + Math.random() * 28 - 14, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.7 + Math.random() * 0.6, age: 0, col: ["#ffe14a", "#fff", "#9ae8ff", "#ffb0d0"][i % 4] });
    }
  }
  return opened;
}
const gateCenter = (g) => { const [x, y] = g.tiles[g.tiles.length >> 1]; return { x: (x + 0.5) * T, y: (y + 0.5) * T }; };
// 플레이어 바로 앞에 닫힌 문이 있으면 알려 줘요
const closedGateNear = (r) => gates.find((g) => !g.open && g.tiles.some(([x, y]) => Math.abs(player.x - (x + 0.5) * T) < T / 2 + r && Math.abs(player.y - 8 - (y + 0.5) * T) < T / 2 + r));
const zoneAt = (tx, ty) => MAP.zones.find((z) => tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h);  // (tx,ty) 칸이 어느 구역인지
const nearestNpc = (maxDist) => npcs.filter((n) => dist(player.x, player.y - 6, n.x, n.y - 6) < maxDist).sort((a, b) => dist(player.x, player.y, a.x, a.y) - dist(player.x, player.y, b.x, b.y))[0];

// 매 프레임 움직이기 (dt = 지난 프레임 이후 흐른 시간(초), move = 이동 방향)
function updateWorld(dt, move) {
  let { x, y } = move;
  const len = Math.hypot(x, y);
  player.moving = len > 0;
  if (len > 0) {
    x /= len; y /= len;  // 대각선으로 가도 빨라지지 않게 길이를 1로
    player.dir = move.x && Math.abs(move.x) >= Math.abs(move.y) ? (move.x < 0 ? "left" : "right") : move.y < 0 ? "up" : "down";
    const nx = player.x + x * CONFIG.PLAYER_SPEED * dt;  // 가로, 세로를 따로 움직여서 벽에 미끄러지게 해요
    if (!footBlocked(nx, player.y)) player.x = nx;
    const ny = player.y + y * CONFIG.PLAYER_SPEED * dt;
    if (!footBlocked(player.x, ny)) player.y = ny;
    player.anim += dt;
  } else player.anim = 0;
  for (const n of npcs) {  // NPC는 가까이 오면 나를 바라봐요
    const dx = player.x - n.x, dy = player.y - n.y;
    n.dir = Math.hypot(dx, dy) > 96 ? n.home : Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
  }
  sparks.forEach((q) => { q.age += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 60 * dt; });
  sparks = sparks.filter((q) => q.age < q.life);
  moveCamera(dt, false);
}
function moveCamera(dt, snap) {  // 카메라가 내 캐릭터를 따라가요 (맵 밖은 안 보이게)
  const tx = constrain(player.x - VW / 2, 0, MAP.w * T - VW), ty = constrain(player.y - 22 - VH / 2, 0, MAP.h * T - VH);
  const k = snap ? 1 : Math.min(1, 9 * dt);  // 9 = 따라가는 빠르기 (클수록 빨라요)
  cam = snap || !cam ? { x: tx, y: ty } : { x: cam.x + (tx - cam.x) * k, y: cam.y + (ty - cam.y) * k };
}
const toScreen = (x, y) => ({ x: (x - Math.round(cam.x)) * Z, y: (y - Math.round(cam.y)) * Z });  // 맵 좌표 → 화면 좌표

// 맵 그리기.  순서: 배경(바닥+벽) → 벽 장식 → [가구, 문, 캐릭터]를 "아래쪽 줄" 순서로 → 말풍선 → 불꽃
// 아래쪽에 있는 것을 나중에 그려서, 캐릭터가 책상 "뒤로" 걸어가는 것처럼 보여요.
function drawWorld(hintGate) {
  const c = drawingContext, cx = Math.round(cam.x), cy = Math.round(cam.y);
  const visible = (x, y, w, h) => x + w > cx && x < cx + VW && y + h > cy && y < cy + VH;  // 안 보이는 건 그리지 않아요
  c.save(); c.scale(Z, Z); c.imageSmoothingEnabled = false;
  if (IMG.bg) c.drawImage(IMG.bg, cx, cy, VW, VH, 0, 0, VW, VH);  // 배경: 큰 맵 그림에서 보이는 부분만
  for (const d of decor) if (visible(d.x, d.y, d.w, d.h)) c.drawImage(IMG.obj[d.n], d.x - cx, d.y - cy);
  const list = [];  // 앞뒤 순서를 맞춰서 그릴 것들
  for (const o of objs) if (visible(o.x, o.y, o.w, o.h)) list.push({ sort: o.sort, draw: () => c.drawImage(IMG.obj[o.n], o.x - cx, o.y - cy) });
  for (const g of gates) {
    const [gw, gh] = g.o === "v" ? [T, g.size * T] : [g.size * T, T];
    if (visible(g.x * T, g.y * T, gw, gh)) list.push({ sort: (g.y + gh / T) * T, draw: () => c.drawImage(IMG.obj[`gate_${g.o}${g.size}_${g.open ? "open" : "closed"}`], g.x * T - cx, g.y * T - cy) });
  }
  for (const e of [...npcs, player]) {
    const isNpc = e !== player, frame = e.moving ? [1, 0, 2, 0][Math.floor(e.anim * 8) % 4] : 0;  // 걸을 때 1→0→2→0 반복
    if (!visible(e.x - 20, e.y - 50, 40, 60)) continue;
    list.push({ sort: e.y, draw: () => e.sit ? sprite(e.key, "up", 0, e.x - 15 - cx, e.y - 43 + SIT[0] - cy, 1, [0, 0, 30, SIT[1]]) : sprite(e.key, e.dir, frame, e.x - 15 - cx, e.y - 43 - cy + (isNpc ? Math.round(Math.sin(clock * 2.2 + e.tx) * 0.6) : 0)) });
  }
  if (!player.sit) list.push({ sort: player.y - 1, draw: () => { c.globalAlpha = 0.75 + 0.25 * Math.sin(clock * 4); c.drawImage(IMG.ui.ring, Math.round(player.x - 18 - cx), Math.round(player.y - 12 - cy)); c.globalAlpha = 1; } });  // 내 발밑 하이라이트 원
  list.sort((a, b) => a.sort - b.sort).forEach((it) => it.draw());
  for (const n of npcs) {  // NPC 머리 위 말풍선 아이콘
    const icon = scene === "game" && mode === "explore" ? npcIcon(n) : null;
    if (icon && visible(n.x - 20, n.y - 90, 40, 70)) c.drawImage(IMG.ui[icon], Math.round(n.x - 9 - cx), Math.round(n.y - 86 - cy + Math.sin(clock * 4 + n.tx) * 2));
  }
  if (scene === "game" && mode === "explore" && allDone() && !quizDone) c.drawImage(IMG.ui.bubble_exclaim, Math.round((MAP.seat.x + 0.5) * T - 9 - cx), Math.round((MAP.seat.y - 1) * T - 22 - cy + Math.sin(clock * 4) * 2));  // 퀴즈 책상 위 느낌표
  if (hintGate) { const g = gateCenter(hintGate); c.drawImage(IMG.ui.arrow_down, Math.round(g.x - 8 - cx), Math.round(g.y - 34 - cy + Math.sin(clock * 5) * 3)); }  // 방금 열린 문 위 화살표
  for (const q of sparks) { c.globalAlpha = Math.max(0, 1 - q.age / q.life); c.fillStyle = q.col; c.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), 3, 3); }
  c.restore();
}


// ===== 5. 티처블 머신 =====
//     얼굴 인식: 동훈 / 민성 / 성민 / No one  →  캐릭터 선택
//     동작 인식: 위 / 아래 / 왼쪽 / 오른쪽 / 확인 →  캐릭터 이동
//     content.js 의 링크가 비어 있으면 카메라도 모델도 켜지 않아요.
//     흐름: 카메라 켜기 → 0.07초마다 그림을 모델에 넣기 → 결과(클래스, 확률) → 캐릭터/방향
const tm = {
  running: false, cameraOn: false, error: null, video: null, canvas: null,
  face: { status: "off", model: null, label: "", prob: 0, probs: [], key: null, none: false },  // key = 인식된 캐릭터, none = "No one"
  motion: { status: "off", model: null, label: "", dir: null },
};
const tmFaceUrl = () => (CONFIG.TM_FACE_MODEL_URL || "").trim(), tmMotionUrl = () => (CONFIG.TM_MOTION_MODEL_URL || "").trim();
const tmWanted = () => tmFaceUrl() || tmMotionUrl();
const simple = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");  // 비교할 때 대소문자·띄어쓰기 무시: "No one" → "noone"
const sameName = (label, list) => (list || []).some((n) => simple(n) === simple(label));

// 클래스 이름 → 캐릭터.  ("민성", 0.97) → face.key = "minseong" /  ("No one", 0.99) → face.none = true
function readFace(label, prob, probs = []) {
  const f = tm.face;
  Object.assign(f, { label, prob, probs, none: sameName(label, CONFIG.FACE_NONE_CLASSES), key: null });
  if (!f.none) f.key = Object.keys(CONFIG.FACE_CLASSES).find((k) => sameName(label, CONFIG.FACE_CLASSES[k])) || null;
  if (prob < CONFIG.FACE_MIN_PROB) f.key = null;  // 확률이 낮으면 아직 모르는 걸로 둬요
}
// 클래스 이름 → 방향.  ("오른쪽", 0.95) → motion.dir = "right"
let lastMotionAction = 0;
function readMotion(label, prob) {
  const m = tm.motion, old = m.dir, M = CONFIG.MOTION_CLASSES;
  m.label = label;
  m.dir = null;
  motion.action = false;
  if (prob >= CONFIG.MOTION_MIN_PROB && !sameName(label, CONFIG.MOTION_IDLE_CLASSES)) {
    m.dir = ["up", "down", "left", "right"].find((d) => sameName(label, M[d])) || null;
    if (sameName(label, M.action) && performance.now() - lastMotionAction > 900) { motion.action = true; lastMotionAction = performance.now(); }
  }
  if (m.dir !== old) motion.nav = m.dir === "up" ? -1 : m.dir === "down" ? 1 : 0;
  motion.dir = m.dir;
}
// 시험용(F12 콘솔): debugFace("민성", 0.95) / debugFace("No one") / debugMotion("오른쪽")
const debugFace = (label, prob = 0.95) => { tm.face.status = "준비됨(테스트)"; readFace(label, prob, [{ name: label, p: prob }]); };
const debugMotion = (label, prob = 0.95) => { tm.motion.status = "준비됨(테스트)"; readMotion(label, prob); };

// 필요한 라이브러리를 그때그때 불러와요
const scriptCache = {};
const loadScript = (src) => (scriptCache[src] ||= new Promise((ok, fail) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => { delete scriptCache[src]; fail(new Error("라이브러리를 불러오지 못했어요 (인터넷을 확인해 주세요)")); }; document.head.appendChild(s); }));
// 티처블 머신 라이브러리 주소. 링크를 넣었을 때만 불러와요.
const LIB = {
  tf: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js",
  pose: "https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js",
  image: "https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js",
};
const modelUrls = (base) => { base = base.replace(/[^/]*\.json$/i, ""); base += base.endsWith("/") ? "" : "/"; return [base + "model.json", base + "metadata.json"]; };

async function startTeachable() {
  if (tm.running || !tmWanted()) return;
  tm.running = true;
  try {  // 1) 카메라 켜기 (https 또는 localhost 에서만 돼요)
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("이 브라우저에서는 카메라를 쓸 수 없어요 (https 또는 localhost 에서 열어 주세요)");
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
    tm.video = Object.assign(document.createElement("video"), { srcObject: stream, muted: true, autoplay: true });
    tm.video.style.cssText = "position:fixed;left:-9999px;width:2px;height:2px;opacity:0";
    tm.video.setAttribute("playsinline", "");
    document.body.appendChild(tm.video);
    await tm.video.play();
    tm.canvas = Object.assign(document.createElement("canvas"), { width: 224, height: 224 });  // 모델에 넣을 224x224 그림
    tm.cameraOn = true;
    tm.error = null;
  } catch (e) { tm.error = e.message; tm.running = false; return; }
  // 2) 링크가 있는 모델만 불러오기
  const poseMode = CONFIG.TM_MOTION_TYPE !== "image" && tmMotionUrl();
  try {
    await loadScript(LIB.tf);
    if (poseMode) await loadScript(LIB.pose);
    if (tmFaceUrl() || (tmMotionUrl() && !poseMode)) await loadScript(LIB.image);
  } catch (e) { tm.error = e.message; tm.running = false; return; }
  const load = async (key, url, lib) => { tm[key].status = "불러오는 중..."; try { tm[key].model = await lib.load(...modelUrls(url)); tm[key].status = "준비됨"; } catch (e) { tm[key].status = "오류: 모델을 불러오지 못했어요"; console.warn(e); } };
  await Promise.all([tmFaceUrl() && load("face", tmFaceUrl(), window.tmImage), tmMotionUrl() && load("motion", tmMotionUrl(), poseMode ? window.tmPose : window.tmImage)]);
  tick();
}
// 0.07초마다: 카메라 그림을 만들어 모델에 넣고 결과를 받아요
async function tick() {
  if (!tm.running) return;
  try {
    const v = tm.video;
    if (v.readyState >= 2 && v.videoWidth) {
      const s = Math.min(v.videoWidth, v.videoHeight), c = tm.canvas.getContext("2d");
      c.save(); c.translate(224, 0); c.scale(-1, 1);  // 거울처럼 좌우를 뒤집고
      c.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, 224, 224);  // 가운데 정사각형만 잘라요 (티처블 머신 웹캠과 같아요)
      c.restore();
      const best = (preds) => preds.reduce((a, b) => (b.probability > a.probability ? b : a));
      if (tm.face.model) { const p = await tm.face.model.predict(tm.canvas), b = best(p); readFace(b.className, b.probability, p.map((q) => ({ name: q.className, p: q.probability }))); }
      if (tm.motion.model) {
        const m = tm.motion.model, p = CONFIG.TM_MOTION_TYPE === "image" ? await m.predict(tm.canvas) : await m.predict((await m.estimatePose(tm.canvas)).posenetOutput), b = best(p);  // 포즈 모델은 몸의 관절을 먼저 찾아요
        readMotion(b.className, b.probability);
      }
    }
  } catch (e) { console.warn("티처블 머신 오류", e); }
  setTimeout(tick, 70);
}
function stopTeachable() {
  tm.running = tm.cameraOn = false;
  tm.video?.srcObject?.getTracks().forEach((t) => t.stop());
  tm.video?.remove();
  motion.dir = null;
}


// ---------------------------------------------------------------------
//  시작 화면: '메타 투어 매홀' 그림 위에 [시작하기]와 톱니바퀴 클릭 영역을 얹었어요.
// ---------------------------------------------------------------------
const START_BTN = [543, 620, 194, 62], GEAR_BTN = [1180, 626, 76, 80];  // [x, y, 가로, 세로]
scenes.title = {
  enter() { if (tm.running) stopTeachable(); },
  update() { if (!settingsOpen && (was("Enter") || was("Space"))) { sfx("select"); goTo("select"); } },
  draw() {
    drawingContext.imageSmoothingEnabled = false;
    if (IMG.title) drawingContext.drawImage(IMG.title, 0, 0, W, H);
    else { background("#27315c"); txt("메타 투어 매홀", W / 2, 220, 72, { align: CENTER, bold: true, color: "#ffd34a" }); }
    if (!settingsOpen) {
      const [overStart, overGear] = [hover(...START_BTN), hover(...GEAR_BTN)];
      push(); noFill(); stroke(255, 255, 255, overStart ? 255 : 90 + 90 * Math.sin(clock * 4) ** 2); strokeWeight(overStart ? 5 : 3);
      rect(START_BTN[0] - 4, START_BTN[1] - 4, START_BTN[2] + 8, START_BTN[3] + 8, 14);  // 깜빡이는 테두리
      if (overGear) { stroke(255); rect(GEAR_BTN[0] - 2, GEAR_BTN[1] - 2, GEAR_BTN[2] + 4, GEAR_BTN[3] + 4, 12); }
      pop();
      if (overStart || overGear) cursor("pointer");
      txt("Enter 키 또는 [시작하기]", 20, 696, 11, { outline: "rgba(0,0,0,0.8)" });
      const web = [...FILES, ART].filter((f) => loadState[f.name] === "인터넷").map((f) => f.name);  // 내 파일 대신 인터넷 파일을 쓰는 중이면 알려줘요
      if (web.length) txt(`내 파일 대신 인터넷(GitHub)의 ${web.join(", ")} 로 실행 중이에요`, 20, 676, 11, { color: "#ffe27a", outline: "rgba(0,0,0,0.8)" });
      if (best != null) { panel(24, 24, 250, 44, { fill: "rgba(20,22,50,0.8)", border: "#ffe27a", shadow: false }); txt(`최고 퀴즈 점수  ${best} / ${QUIZ.length}`, 149, 46, 16, { align: CENTER, valign: CENTER, bold: true, color: "#ffe27a" }); }
      if (clicked(...START_BTN)) { sfx("select"); goTo("select"); }
      if (clicked(...GEAR_BTN)) { sfx("click"); showSettings(false); }
    }
  },
};

// ---------------------------------------------------------------------
//  캐릭터 선택 화면
//    얼굴 인식: 동훈/민성/성민 → 그 캐릭터가 골라져요.  "No one" → 아무도 고르지 않아요.
//    링크가 비어 있으면 1·2·3 키나 클릭으로 골라요.
// ---------------------------------------------------------------------
let sel = 0, holdMs = 0, lastFace = null;  // 고른 카드, 같은 얼굴 유지 시간(ms), 직전 얼굴
const cardX = (i) => 360 + i * 274;  // i번째 카드의 x 위치 (카드 크기 252 x 360, y 150)
scenes.select = {
  enter() { sel = Math.max(0, CHARS.findIndex((c) => c.key === charKey)); holdMs = 0; lastFace = null; startTeachable(); },
  choose(i) { if (i !== sel) { sel = i; sfx("select"); } },
  confirm() { charKey = CHARS[sel].key; sfx("finish"); goTo("game", { fresh: true }); },
  update(dt) {
    if (settingsOpen) return;
    const n = numberKey();
    if (n >= 0 && n < CHARS.length) this.choose(n);
    if (was("ArrowLeft") || was("KeyA")) this.choose((sel + CHARS.length - 1) % CHARS.length);
    if (was("ArrowRight") || was("KeyD")) this.choose((sel + 1) % CHARS.length);
    if (was("Escape")) return goTo("title");
    if (action()) return this.confirm();
    const f = tm.face;  // ---- 얼굴 인식으로 고르기 ----
    if (tmFaceUrl() && f.key) {  // 동훈/민성/성민 중 하나로 확실히 인식됨
      this.choose(CHARS.findIndex((c) => c.key === f.key));
      holdMs = f.key === lastFace ? holdMs + dt * 1000 : 0;  // 같은 얼굴이면 시간이 쌓여요
      lastFace = f.key;
      if (holdMs >= CONFIG.FACE_HOLD_MS) this.confirm();  // 충분히 유지되면 자동 시작!
    } else { holdMs = 0; lastFace = null; }  // key 가 비면 No one 이거나 확률이 낮은 경우
  },
  draw() {
    const g = drawingContext.createLinearGradient(0, 0, 0, H);  // 배경: 위에서 아래로 어두워지는 보라색 + 반짝이는 별
    g.addColorStop(0, "#3a2f73"); g.addColorStop(1, "#1b1740");
    drawingContext.fillStyle = g; drawingContext.fillRect(0, 0, W, H);
    noStroke();
    for (const i of times(46)) { fill(255, 255, 255, 80 + 120 * Math.abs(Math.sin(clock * 1.4 + i))); rect((i * 197) % W, (i * 83) % 420, 3, 3); }
    txt("캐릭터를 골라 주세요", W / 2, 40, 40, { align: CENTER, bold: true, color: "#ffe27a", outline: "#2a1a50", outlineW: 6 });
    txt(tmFaceUrl() ? "카메라에 얼굴을 보여 주면 내 캐릭터가 자동으로 골라져요!" : "숫자 1 · 2 · 3 을 누르거나 카드를 클릭해서 골라요", W / 2, 96, 22, { align: CENTER, color: "#d8d4ff" });
    this.drawCamera();
    CHARS.forEach((c, i) => this.drawCard(c, i));
    if (button("이 캐릭터로 시작하기", W / 2 + 70 - 190, 556, 380, 70, { size: 26 })) this.confirm();
    txt("Space / Enter 로도 시작해요", W / 2 + 70, 640, 11, { align: CENTER, color: "rgba(255,255,255,0.6)" });
    if (button("← 처음 화면", 30, 650, 190, 46, { size: 20, ...GRAY })) goTo("title");
    if (button("설정", 1110, 650, 80, 46, { size: 20, ...GRAY })) showSettings(false);
  },
  drawCard(c, i) {
    const [x, y, w, h] = [cardX(i), 150, 252, 360], on = sel === i, hov = hover(x, y, w, h) && !settingsOpen;
    const ly = y + (on ? -10 : hov ? -4 : 0);  // 골라진 카드는 위로 떠올라요
    panel(x, ly, w, h, { fill: on ? "rgba(255,244,200,0.98)" : "rgba(238,234,255,0.94)", border: on ? "#ffb21f" : "#8f94ff", bw: on ? 6 : 4, r: 16 });
    push(); noStroke(); fill(on ? "rgba(255,190,60,0.35)" : "rgba(120,110,200,0.25)"); ellipse(x + w / 2, ly + 270, 150, 38); pop();
    drawingContext.imageSmoothingEnabled = false;
    sprite(c.key, "down", 0, x + w / 2 - 75, ly + 28 + (on ? Math.round(Math.sin(clock * 5) * 4) : 0), 5);  // 캐릭터를 5배로 크게
    txt(c.name, x + w / 2, ly + 292, 30, { align: CENTER, bold: true, color: "#3a2a70" });
    txt(c.desc, x + w / 2, ly + 330, 11, { align: CENTER, color: "#6a5ea0" });
    keycap(String(i + 1), x + 14, ly + 14);
    if (on) txt("선택!", x + w - 16, ly + 18, 22, { align: RIGHT, bold: true, color: "#e0701a" });
    if (tmFaceUrl() && tm.face.key === c.key) {  // 얼굴이 이 캐릭터로 인식되면 시간 막대가 차올라요
      txt("얼굴 인식!", x + w / 2, ly + h + 12, 22, { align: CENTER, bold: true, color: "#8affb0", outline: "#103a20", outlineW: 5 });
      push(); noStroke(); fill("rgba(0,0,0,0.35)"); rect(x + 20, ly + h - 16, w - 40, 8, 4); fill("#4fd17a"); rect(x + 20, ly + h - 16, (w - 40) * constrain(holdMs / CONFIG.FACE_HOLD_MS, 0, 1), 8, 4); pop();
    }
    if (hov) { cursor("pointer"); if (clicked(x, y, w, h)) (sel === i ? this.confirm() : this.choose(i)); }  // 처음 클릭하면 고르기, 또 클릭하면 시작
  },
  drawCamera() {  // 왼쪽 패널: 카메라 화면과 인식 결과
    const [x, y, w, h] = [34, 150, 300, 360], f = tm.face;
    panel(x, y, w, h, { fill: "rgba(14,12,40,0.85)", border: "#6a66c0", r: 14 });
    if (!tmFaceUrl()) {
      txt("얼굴 인식", x + w / 2, y + 22, 22, { align: CENTER, bold: true, color: "#ffe27a" });
      wrapText("티처블 머신 얼굴 인식 링크가 비어 있어요.\n\ncontent.js 의 TM_FACE_MODEL_URL 에 링크를 붙여 넣으면 카메라로 캐릭터를 고를 수 있어요.", w - 40, 11).forEach((l, i) => txt(l, x + 20, y + 78 + i * 20, 11, { color: "#d8d4ff" }));
      return txt("지금은 키보드/마우스로\n골라 주세요", x + w / 2, y + h - 80, 22, { align: CENTER, bold: true, color: "#9ad0ff" });
    }
    txt("얼굴 인식 카메라", x + w / 2, y + 16, 22, { align: CENTER, bold: true, color: "#ffe27a" });
    panel(x + 28, y + 54, 244, 244, { fill: "#0a0818", border: "#6a66c0", bw: 3, r: 8, shadow: false });
    if (tm.cameraOn) drawingContext.drawImage(tm.canvas, x + 30, y + 56, 240, 240);
    else txt(tm.error || "카메라를 켜는 중...", x + 40, y + 160, 11, { color: "#ffb0b0" });
    // 인식 결과 한 줄 (No one 이면 "얼굴이 보이지 않아요")
    const [label, color] = f.status.startsWith("오류") ? [f.status, "#ff9a9a"] : !f.model && !f.label ? [f.status === "off" ? "얼굴을 비춰 주세요" : f.status, "#d8d4ff"]
      : f.none ? ["얼굴이 보이지 않아요 (No one)", "#ffd27a"] : f.key ? [`${charName(f.key)}  ${Math.round(f.prob * 100)}%`, "#8affb0"] : [`${f.label}?  ${Math.round(f.prob * 100)}%`, "#ffe27a"];
    txt(label, x + w / 2, y + 314, 22, { align: CENTER, bold: true, color });
  },
};

// ---------------------------------------------------------------------
//  게임 화면: 돌아다니기 → NPC 소개 듣기 → 문 열기 → 교실에서 퀴즈
//    mode:  "explore"(돌아다니는 중) / "dialogue"(대화 중) / "quiz"(퀴즈 푸는 중)
// ---------------------------------------------------------------------
let mode = "explore", dlg = null, quiz = null;  // 지금 모드, 진행 중인 대화, 진행 중인 퀴즈
let zone = null, zoneT = 0, hintGate = null, nearNpc = null, nearSeat = false;  // 지금 장소, 이름 보인 시간, 방금 열린 문, 가까운 NPC
let cooldown = {}, gateCool = 0, mini = null;  // NPC별 쉬는 시간, 문 알림 간격, 미니맵 그림
// 새 장소에 처음 들어가면 그 장소 사진을 반짝이는 효과와 함께 잠깐 보여줘요. (사진은 art.png 안에 있어요)
const PHOTO_OF = { c1: "corr1", cafeteria: "cafeteria", gym: "gym", library: "library", classroom: "classroom" };  // 장소 → 사진 이름 (복도는 처음 만나는 본관 복도 c1 만)
const PHOTO_T = 3.4;  // 사진이 떠 있는 시간(초)
let seen = {}, photo = null;  // 이미 가 본 장소, 지금 보여주는 사진 {t, id, name}
const shuffled = (q) => {   // 보기를 섞고 정답 번호도 맞춰 바꿔요. fixed: true 면 그대로
  if (q.fixed) return q;
  const idx = q.choices.map((_, i) => [Math.random(), i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  return { ...q, choices: idx.map((i) => q.choices[i]), answer: idx.indexOf(q.answer) };
};
const newQuiz = () => ({ i: 0, score: 0, state: "ask", sel: 0, picked: -1, results: [], t: 0, qs: QUIZ.map(shuffled) });   // 퀴즈를 시작할 때마다 정답 위치가 달라져요
const allDone = () => AREAS.every((a) => done[a]);  // 4곳 소개를 모두 끝냈는지
// NPC 머리 위에 어떤 말풍선을 보일지 (없으면 null)
function npcIcon(n) {
  if ((n.role === "guide" && !done[n.area]) || (n.role === "quiz" && allDone() && !quizDone)) return "bubble_exclaim";  // 아직 안 들은 소개 / 퀴즈 준비됨
  return n === nearNpc ? "bubble_talk" : null;
}

scenes.game = {
  enter(arg) {
    if (arg?.fresh) {  // 새 게임: 진행 상황을 모두 처음으로
      done = {}; seen = {}; quizDone = false; mode = "explore"; dlg = quiz = hintGate = zone = photo = null; cooldown = {}; toasts = [];
      resetWorld();
      toast("W A S D 로 걸어 다녀요!", "star");
      if (/[?&]unlock/.test(location.search)) { AREAS.forEach((a) => (done[a] = true)); openGates(false); toast("시험 모드: 모든 문이 열려 있어요", "check"); }  // 주소 뒤에 ?unlock → 모든 문이 열려요
    }
    player.key = charKey;
    if (!mini) {  // 미니맵: 맵 큰 그림을 작게 줄여서 한 번만 만들어 둬요
      mini = Object.assign(document.createElement("canvas"), { width: 150, height: Math.round((150 * MAP.h) / MAP.w) });
      mini.getContext("2d").drawImage(IMG.bg, 0, 0, mini.width, mini.height);
    }
    startTeachable();
  },

  // ---- 매 프레임 움직이기 ----
  update(dt) {
    if (settingsOpen) return;
    if (was("Escape") && mode === "explore") return showSettings(true);
    for (const k in cooldown) cooldown[k] = Math.max(0, cooldown[k] - dt);
    gateCool = Math.max(0, gateCool - dt);
    if (mode === "explore") this.explore(dt);
    else if (mode === "dialogue") this.dialogue(dt);
    else if (mode === "photo") this.photoUpdate(dt);
    else if (mode === "seated") this.seatedUpdate(dt);
    else this.quizUpdate(dt);
  },

  // 모드 1: 돌아다니기
  explore(dt) {
    const move = moveVec();
    updateWorld(dt, move);
    const z = zoneAt(Math.floor(player.x / T), Math.floor((player.y - 4) / T));  // 지금 있는 장소
    if (z && z !== zone) {
      zone = z; zoneT = 0;
      const first = !seen[z.id];
      seen[z.id] = true;
      if (first && IMG["photo_" + PHOTO_OF[z.id]]) { mode = "photo"; photo = { t: 0, id: PHOTO_OF[z.id], name: z.name }; sfx("open"); return; }  // 처음 온 곳이면 사진부터!
    }
    zoneT += dt;
    if (hintGate && dist(player.x, player.y, gateCenter(hintGate).x, gateCenter(hintGate).y) < 56) hintGate = null;  // 문 가까이 가면 화살표 사라짐
    nearNpc = nearestNpc(46);
    const sd = dist(player.x, player.y - 6, (MAP.seat.x + 0.5) * T, MAP.seat.y * T + 20);  // 퀴즈 의자와의 거리
    nearSeat = sd < 46 && !(nearNpc && dist(player.x, player.y, nearNpc.x, nearNpc.y) < sd);
    for (const n of npcs) {  // 안 들은 소개 NPC 가까이 가면 대화가 자동 시작
      if (n.role === "guide" && !done[n.area] && !cooldown[n.id] && dist(player.x, player.y, n.x, n.y) < 62) return this.talk(n);
    }
    if (nearSeat && action()) return this.sit();       // 퀴즈 의자 앞에서 Space / Enter / E → 앉기
    if (nearNpc && action()) return this.talk(nearNpc);  // 가까이 가서 Space / Enter / E
    if ((move.x || move.y) && gateCool <= 0) {  // 닫힌 문에 부딪히면 이유를 알려줘요
      const g = closedGateNear(10);
      if (g) { toast(g.label, "lock"); sfx("wrong"); gateCool = 3; }
    }
  },

  // NPC와 대화 시작. NPC의 역할(role)에 따라 하는 말이 달라요.
  talk(n) {
    const S = SCRIPT;
    if (n.role === "guide") this.say(n, S.areas[n.area].lines, () => this.finishArea(n.area));  // 대사를 다 들으면 이 구역이 "완료"
    else if (n.role === "quiz") {  // 반장: 소개를 다 듣기 전엔 돌려보내요
      if (!allDone()) this.say(n, S.quiz.locked);
      else this.say(n, quizDone ? S.quiz.again : S.quiz.intro);
    } else this.say(n, S.chat[n.id] || ["안녕!"]);  // 복도 NPC: 학교 이야기를 들려줘요 (필수는 아니에요)
  },
  sit() {  // 퀴즈 책상 의자에 앉아요 → 시작 버튼이 나와요
    Object.assign(player, { x: (MAP.seat.x + 0.5) * T, y: MAP.seat.y * T + 8, dir: "up", moving: false, sit: true });
    mode = "seated"; sfx("select");
  },
  stand() {  // 의자 왼쪽으로 일어나요 (막혀 있으면 아래쪽, 오른쪽 순서로)
    const [dx, dy] = [[-1, 0], [0, 1], [1, 0]].find(([dx, dy]) => !footBlocked((MAP.seat.x + dx + 0.5) * T, (MAP.seat.y + dy) * T + 27)) || [0, 1];
    Object.assign(player, { x: (MAP.seat.x + dx + 0.5) * T, y: (MAP.seat.y + dy) * T + 27, dir: "down", sit: false }); mode = "explore";
  },
  startQuiz() {
    if (!allDone()) { toast("소개를 모두 끝내야 퀴즈를 시작할 수 있어요", "lock"); return sfx("wrong"); }
    mode = "quiz"; quiz = newQuiz(); sfx("select");
  },
  seatedUpdate(dt) {  // 앉아 있는 동안: Space / Enter 로 시작, Esc / ↓ 로 일어나기
    updateWorld(dt, { x: 0, y: 0 });
    if (was("Escape") || was("ArrowDown") || was("KeyS")) this.stand();
    else if (action()) this.startQuiz();
  },
  seatedDraw() {
    const ok = allDone();
    if (button(ok ? "퀴즈 시작하기!" : "소개를 더 들어야 해요", W / 2 - 180, 570, 360, 70, { size: 28, ...(ok ? {} : GRAY) })) this.startQuiz();
    if (button("일어나기", W / 2 + 200, 584, 150, 44, { size: 20, ...BLUE })) this.stand();
    txt(ok ? "Space · Enter: 시작     Esc · ↓: 일어나기" : "Esc · ↓: 일어나기", W / 2, 654, 11, { align: CENTER, outline: "rgba(0,0,0,0.9)", outlineW: 4 });
  },
  say(npc, lines, onDone) {  // 대화창 열기. lines = 대사 목록, onDone = 끝난 뒤 할 일
    mode = "dialogue"; dlg = { npc, lines, idx: 0, shown: 0, done: false, onDone }; sfx("click");
  },
  finishArea(area) {  // 소개를 끝내면 완료로 기록하고 문을 열어요
    if (done[area]) return;
    done[area] = true;
    sfx("finish");
    toast(SCRIPT.areas[area].done || "소개를 잘 들었어요!", "star");
    const opened = openGates(true);
    if (opened.length) { hintGate = opened[opened.length - 1]; setTimeout(() => { sfx("open"); toast("문이 열렸어요! 화살표를 따라가 보세요", "check"); }, 900); }
  },

  // 모드 2: 대화하는 중
  dialogue(dt) {
    updateWorld(dt, { x: 0, y: 0 });
    const d = dlg, text = d.lines[d.idx];
    if (!d.done) {  // 글자가 한 글자씩 나타나요
      const before = Math.floor(d.shown / 3);
      d.shown += dt * CONFIG.TEXT_SPEED;
      if (Math.floor(d.shown / 3) !== before) sfx("blip");  // 글자 3개마다 삑 소리 한 번
      if (d.shown >= text.length) { d.shown = text.length; d.done = true; }
    }
    if (action() || click) {  // Space / Enter / E / 클릭
      click = null;
      if (!d.done) { d.shown = text.length; d.done = true; return; }  // 아직 나오는 중이면 한 번에 다 보여주기
      d.idx++; d.shown = 0; d.done = false; sfx("click");
      if (d.idx >= d.lines.length) { mode = "explore"; cooldown[d.npc.id] = 2.5; dlg = null; d.onDone?.(); }  // 대사가 끝났어요!
    }
  },

  // 모드: 장소 사진 (잠깐 보여주고 저절로 사라져요. Space / 클릭하면 바로 넘어가요)
  photoUpdate(dt) {
    updateWorld(dt, { x: 0, y: 0 });
    photo.t += dt;
    if ((action() || click) && photo.t > 0.7 && photo.t < PHOTO_T - 0.5) { click = null; photo.t = PHOTO_T - 0.5; sfx("click"); }
    if (photo.t >= PHOTO_T) { mode = "explore"; photo = null; zoneT = 0; }
  },
  photoDraw() {
    const { t, id, name } = photo, c = drawingContext, [pw, ph] = [880, 495];
    const k = Math.min(1, t / 0.5), out = Math.max(0, (t - PHOTO_T + 0.5) / 0.5), a = k * (1 - out), e = 1 - (1 - k) ** 3;  // 나타나는 정도 / 사라지는 정도 / 투명도 / 부드러운 움직임
    dim(0.6 * a);
    push(); translate(W / 2, H / 2 - 20); rotate((1 - e) * -0.07); scale((0.8 + 0.2 * e) * (1 + 0.06 * out)); c.globalAlpha = a;  // 살짝 돌면서 커지며 나타나요
    panel(-pw / 2 - 12, -ph / 2 - 12, pw + 24, ph + 24, { fill: "#fff8e0", border: "#ffe27a", r: 14 });
    c.imageSmoothingEnabled = true; c.drawImage(IMG["photo_" + id], -pw / 2, -ph / 2, pw, ph); c.imageSmoothingEnabled = false;
    if (t > 0.3 && t < 1.8) {  // 사진 위로 반짝 지나가는 빛
      const sx = -pw / 2 - 200 + (t - 0.3) * 1100;
      c.save(); c.beginPath(); c.rect(-pw / 2, -ph / 2, pw, ph); c.clip();
      c.fillStyle = "rgba(255,255,255,0.38)"; c.beginPath(); c.moveTo(sx, -ph / 2); c.lineTo(sx + 100, -ph / 2); c.lineTo(sx - 40, ph / 2); c.lineTo(sx - 140, ph / 2); c.fill(); c.restore();
    }
    noStroke(); fill(20, 16, 40, 205); rect(-pw / 2, ph / 2 - 92, pw, 92);  // 아래 이름표 띠
    txt(name, -pw / 2 + 32, ph / 2 - 80, 44, { bold: true, outline: "#2a1a50", outlineW: 8 });
    txt("새로운 장소를 발견했어요!", -pw / 2 + 34, ph / 2 - 30, 18, { color: "#ffe27a" });
    txt("Space · 클릭: 넘기기", pw / 2 - 20, ph / 2 - 24, 11, { align: RIGHT, color: "rgba(255,255,255,0.7)" });
    pop();
    c.globalAlpha = a;
    for (const i of times(16)) {  // 사진 둘레에서 반짝이는 별
      const r = i * 0.4 + t * 0.35, tw = Math.max(0, Math.sin(t * 5 + i * 2)), sz = 14 + 14 * tw;
      c.globalAlpha = a * (0.35 + 0.65 * tw);
      c.drawImage(IMG.ui.star, W / 2 + Math.cos(r) * (pw / 2 + 46) - sz / 2, H / 2 - 20 + Math.sin(r) * (ph / 2 + 40) - sz / 2, sz, sz);
    }
    c.globalAlpha = 1;
    if (t < 0.3) { noStroke(); fill(255, 255, 255, 210 * (1 - t / 0.3)); rect(0, 0, W, H); }  // 처음에 하얗게 번쩍
  },

  // 모드 3: 퀴즈 푸는 중.  state: "ask"(문제) → "feedback"(정답 확인) → ... → "result"(결과)
  pick(i) {
    const q = quiz.qs[quiz.i];
    if (quiz.state !== "ask" || i < 0 || i >= q.choices.length) return;
    quiz.picked = quiz.sel = i;
    const ok = i === q.answer;  // 정답인지 비교!
    if (ok) quiz.score++;
    sfx(ok ? "correct" : "wrong");
    quiz.results.push(ok);
    quiz.state = "feedback"; quiz.t = 0;
  },
  next() {  // 다음 문제 (마지막이면 결과 화면)
    quiz.i++; quiz.picked = -1; quiz.sel = 0; quiz.t = 0;
    if (quiz.i < QUIZ.length) return (quiz.state = "ask");
    quiz.state = "result"; quizDone = true; sfx("finish");
    if (best == null || quiz.score > best) { best = quiz.score; try { localStorage.setItem("maehol_best", best); } catch (e) {} }  // 최고 점수 저장
  },
  quizUpdate(dt) {
    quiz.t += dt;
    updateWorld(dt, { x: 0, y: 0 });
    if (quiz.state === "ask") {
      if (numberKey() >= 0) this.pick(numberKey());  // 1~4 키
      if (navKey()) { const n = quiz.qs[quiz.i].choices.length; quiz.sel = (quiz.sel + navKey() + n) % n; sfx("click"); }  // ↑ ↓ 키
      if (action()) this.pick(quiz.sel);  // Space 로 확정
    } else if (quiz.state === "feedback" && quiz.t > 0.3 && (action() || click)) { click = null; this.next(); }
  },
  closeQuiz() {  // 퀴즈를 닫으면 일어나서 반장이 마무리 인사를 해요
    this.stand(); quiz = null; cooldown.banjang = 1.5;
    const n = npcs.find((x) => x.id === SCRIPT.quiz.npc);
    if (n && SCRIPT.quiz.after) this.say(n, SCRIPT.quiz.after);
  },

  // ---- 매 프레임 그리기 ----
  draw() {
    background("#14101f");
    drawWorld(hintGate);
    // 이름표: NPC는 초록, 나는 노랑
    for (const n of npcs) {
      const s = toScreen(n.x, n.y - 48);
      if (s.x < -60 || s.x > W + 60 || s.y < -20 || s.y > H + 20) continue;
      nameTag(n.name, s.x, s.y - 4, "#b8ffd8", "rgba(10,40,30,0.75)");
      if (n === nearNpc && mode === "explore") { const tw = textW(n.name, 11, true) / 2 + 18; txt("대화", s.x + tw + keycap("Space", s.x + tw, s.y - 24) + 6, s.y - 20, 11, { bold: true, outline: "rgba(0,0,0,0.85)" }); }  // 가까이 가면 [Space] 대화 안내
    }
    if (nearSeat && mode === "explore") {  // 퀴즈 의자 앞: [Space] 앉기 안내
      const q = toScreen((MAP.seat.x + 0.5) * T, MAP.seat.y * T - 30), w = keycap("Space", q.x - 40, q.y + 4);
      nameTag("퀴즈 자리", q.x, q.y, "#ffe27a", "rgba(60,40,10,0.78)"); txt("앉기", q.x - 40 + w + 6, q.y + 8, 11, { bold: true, outline: "rgba(0,0,0,0.85)" });
    }
    const ps = toScreen(player.x, player.y - 48);
    nameTag(charName(player.key), ps.x, ps.y - 4, "#ffe27a", "rgba(60,40,10,0.78)");
    this.hud();
    if (mode === "dialogue" && dlg) drawDialogue(dlg);
    if (mode === "photo" && photo) this.photoDraw();
    if (mode === "seated") this.seatedDraw();
    if (mode === "quiz") this.quizDraw();
  },
  // HUD = 게임 화면 위에 항상 떠 있는 정보
  hud() {
    const zname = zone ? zone.name : "운동장";
    panel(16, 16, textW(zname, 22, true) + 56, 42, { fill: "rgba(20,22,50,0.86)", shadow: false });  // 왼쪽 위: 지금 있는 장소
    push(); noStroke(); fill("#ff6a6a"); ellipse(36, 34, 14); fill("#fff"); ellipse(36, 34, 5); pop();
    txt(zname, 52, 38, 22, { valign: CENTER, bold: true });
    const goal = AREAS.map((a) => !done[a] && SCRIPT.objective[a]).find(Boolean) || (quizDone ? SCRIPT.objective.done : SCRIPT.objective.quiz);  // 그 아래: 목표
    panel(16, 82, Math.min(640, textW(goal, 22) + 40), 42, { fill: "rgba(60,40,10,0.86)", border: "#ffd34a", shadow: false });
    txt(goal, 36, 104, 22, { valign: CENTER, color: "#ffe9a8" });
    // 위쪽 가운데: 진행 바 (1~5번 정거장, 끝낸 곳은 초록 체크)
    const [rx, ry, rw] = [W / 2 - 350, 16, 540], xs = STOPS.map((_, i) => rx + 50 + (i * (rw - 100)) / 4);
    panel(rx, ry, rw, 56, { fill: "rgba(20,22,50,0.86)", border: "#6a66c0", r: 12, shadow: false });
    STOPS.forEach(([id, label], i) => {
      const ok = id === "classroom" ? quizDone : done[id], here = zone?.id === id;
      push();
      if (i < 4) { stroke(done[id] ? "#4fd17a" : "#4a4a78"); strokeWeight(5); line(xs[i] + 14, ry + 22, xs[i + 1] - 14, ry + 22); }
      stroke(here ? "#ffe27a" : "#2a2a50"); strokeWeight(here ? 4 : 3); fill(ok ? "#4fd17a" : "#3a3a68"); ellipse(xs[i], ry + 22, 24);
      pop();
      if (ok) drawingContext.drawImage(IMG.ui.check, xs[i] - 8, ry + 14, 16, 16); else txt(i + 1, xs[i], ry + 23, 11, { align: CENTER, valign: CENTER, bold: true, color: "#c9c6ff" });
      txt(label, xs[i], ry + 40, 11, { align: CENTER, bold: here, color: here ? "#ffe27a" : "#d8d4ff" });
    });
    // 오른쪽 위: 미니맵 (흰 네모 = 지금 화면, 노란 점 = 나, 빨강/초록 점 = NPC)
    const [mx, my, k] = [W - mini.width - 22, 18, mini.width / (MAP.w * T)];
    panel(mx - 6, my - 6, mini.width + 12, mini.height + 12, { fill: "rgba(20,22,50,0.9)", border: "#6a66c0", bw: 3, r: 8, shadow: false });
    drawingContext.imageSmoothingEnabled = true; drawingContext.drawImage(mini, mx, my); drawingContext.imageSmoothingEnabled = false;
    push(); noFill(); stroke(255, 255, 255, 140); strokeWeight(1); rect(mx + cam.x * k, my + cam.y * k, VW * k, VH * k); noStroke();
    npcs.filter((n) => n.role !== "chat").forEach((n) => { fill(n.role === "quiz" ? "#ffb21f" : done[n.area] ? "#4fd17a" : "#ff6a6a"); rect(mx + n.x * k - 2, my + n.y * k - 2, 4, 4); });
    fill("#ffe27a"); stroke("#2a1a50"); ellipse(mx + player.x * k, my + player.y * k, 7);
    pop();
    if (button("설정", 1110, 212, 150, 36, { size: 22, ...GRAY }) && mode === "explore") showSettings(true);
    if (tm.cameraOn && tm.motion.model) txt(tm.motion.dir ? `동작: ${tm.motion.label}` : "동작: 정지", 20, 134, 11, { bold: true, color: "#9ad0ff" });  // 동작 인식 상태
    // 목표 NPC가 화면 밖이면 화면 가장자리에 방향 화살표
    const target = AREAS.map((a) => !done[a] && npcs.find((n) => n.id === SCRIPT.areas[a].npc)).find(Boolean) || (!quizDone && npcs.find((n) => n.id === SCRIPT.quiz.npc));
    const s = target && toScreen(target.x, target.y - 20);
    if (mode === "explore" && target && !(s.x > 60 && s.x < W - 60 && s.y > 130 && s.y < H - 60)) {
      const a = Math.atan2(s.y - H / 2, s.x - W / 2), ex = constrain(W / 2 + Math.cos(a) * 900, 60, W - 60), ey = constrain(H / 2 + Math.sin(a) * 900, 140, H - 60);
      push(); translate(ex, ey); rotate(a); stroke("#7a4a10"); strokeWeight(4); fill("#ffe14a"); triangle(24, 0, -14, -18, -14, 18); pop();
      txt(target.name, ex, ey + 30, 11, { align: CENTER, bold: true, color: "#ffe14a", outline: "rgba(0,0,0,0.85)", outlineW: 4 });
    }
    if (mode === "explore" && keyEvents === 0 && clock > 3) txt("키보드가 안 되면 화면을 한 번 클릭하세요  ·  마우스를 누르고 있으면 그쪽으로 걸어가요", W / 2, 690, 11, { align: CENTER, color: "#ffe27a", outline: "rgba(0,0,0,0.9)", outlineW: 4 });  // 키보드 입력이 없을 때 안내
    else if (mode === "explore" && clock < 14) txt("WASD 이동  ·  Space 대화  ·  Esc 설정", W / 2, 690, 11, { align: CENTER, outline: "rgba(0,0,0,0.9)", outlineW: 4 });  // 처음 14초 동안 조작 힌트
    if (walkHold && mouseIsPressed && mode === "explore") { push(); noFill(); stroke(255, 255, 255, 200); strokeWeight(3); circle(mouseX, mouseY, 28 + Math.sin(clock * 10) * 5); pop(); }  // 누르고 있는 곳 표시
    if (zoneT < 2.4 && mode === "explore") { push(); drawingContext.globalAlpha = Math.max(0, Math.min(1, zoneT / 0.3, (2.4 - zoneT) / 0.5)); txt(zname, W / 2, 170, 40, { align: CENTER, bold: true, outline: "#2a1a50", outlineW: 8 }); pop(); }  // 새 장소에 들어서면 큰 글씨로
  },

  // 퀴즈 창 (정답은 초록, 내가 고른 오답은 빨강)
  quizDraw() {
    dim(0.55);
    const [x, y, w, h] = [110, 36, 1060, 648], Q = quiz, q = Q.qs[Q.i];
    panel(x, y, w, h, { fill: "rgba(24,26,58,0.98)", border: "#ffe27a", r: 18 });
    if (Q.state === "result") return this.resultDraw(x, y, w, h);
    txt(`퀴즈 ${Q.i + 1} / ${QUIZ.length}`, x + 40, y + 28, 22, { bold: true, color: "#ffe27a" });
    QUIZ.forEach((_, i) => { push(); stroke("#2a2a50"); strokeWeight(3); fill(i < Q.results.length ? (Q.results[i] ? "#4fd17a" : "#ff6a6a") : i === Q.i ? "#ffe27a" : "#3a3a68"); ellipse(x + w - 60 - (QUIZ.length - 1 - i) * 30, y + 40, 20); pop(); });  // 진행 점
    const qLines = wrapText(q.q, w - 100, 30, true);
    qLines.forEach((l, i) => txt(l, x + 50, y + 76 + i * 42, 30, { bold: true }));
    q.choices.forEach((choice, i) => {
      const by = y + 76 + qLines.length * 42 + 20 + i * 74, on = hover(x + 50, by, w - 100, 62) && Q.state === "ask";
      let fillC = "rgba(60,62,120,0.9)", border = "#6a66c0";
      if (Q.state === "ask" && (on || Q.sel === i)) [fillC, border] = ["rgba(110,100,190,0.95)", "#ffe27a"];
      if (Q.state === "feedback") [fillC, border] = i === q.answer ? ["rgba(40,120,70,0.95)", "#8affb0"] : i === Q.picked ? ["rgba(150,50,60,0.95)", "#ff9aa8"] : ["rgba(40,42,80,0.7)", "#3a3a68"];
      panel(x + 50, by, w - 100, 62, { fill: fillC, border, r: 12, bw: 3, shadow: false });
      push(); noStroke(); fill(Q.state === "feedback" && i === q.answer ? "#4fd17a" : "#ffe27a"); ellipse(x + 92, by + 31, 40); pop();
      txt(i + 1, x + 92, by + 32, 22, { align: CENTER, valign: CENTER, bold: true, color: "#3a2a08" });
      txt(choice, x + 130, by + 32, 22, { valign: CENTER });
      if (Q.state === "feedback" && i === q.answer) txt("정답!", x + w - 80, by + 32, 22, { align: RIGHT, valign: CENTER, bold: true, color: "#b8ffd0" });
      if (on) { cursor("pointer"); if (clicked(x + 50, by, w - 100, 62)) this.pick(i); }  // 클릭해서 고르기
    });
    if (Q.state === "ask") txt("1~4 번호 · ↑↓ + Space · 클릭으로 골라요", x + w / 2, y + h - 34, 11, { align: CENTER, color: "rgba(255,255,255,0.6)" });
    else {  // 정답 확인 단계: 해설과 [다음 문제] 버튼
      const ok = Q.results[Q.results.length - 1], fy = y + h - 108;
      txt(ok ? "정답이에요!" : "아쉬워요! 다시 기억해 봐요", x + 50, fy, 30, { bold: true, color: ok ? "#8affb0" : "#ffb0b8" });
      wrapText(q.explain || "", w - 360, 22).slice(0, 2).forEach((l, i) => txt(l, x + 50, fy + 44 + i * 30, 22, { color: "#e8e4ff" }));
      if (button(Q.i === QUIZ.length - 1 ? "결과 보기" : "다음 문제", x + w - 250, fy + 6, 200, 60, { size: 24 }) && Q.t > 0.3) this.next();
    }
  },
  // 결과 화면: 점수, 별, 응원 문구, 버튼 3개
  resultDraw(x, y, w, h) {
    const ratio = quiz.score / QUIZ.length, stars = ratio >= 1 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;  // 만점이면 별 3개, 60% 이상 2개, 하나라도 맞히면 1개
    txt("퀴즈 결과", x + w / 2, y + 36, 36, { align: CENTER, bold: true, color: "#ffe27a" });
    txt(`${quiz.score} / ${QUIZ.length}`, x + w / 2, y + 120, 96, { align: CENTER, bold: true, outline: "#2a1a50", outlineW: 10 });
    for (const i of times(3)) { drawingContext.globalAlpha = i < stars ? 1 : 0.25; drawingContext.drawImage(IMG.ui.star, x + w / 2 - 152 + i * 80, y + 238 + (i < stars ? Math.sin(clock * 4 + i) * 4 : 0), 64, 64); }
    drawingContext.globalAlpha = 1;
    txt(ratio >= 1 ? "만점이에요! 우리 학교 박사님이네요!" : ratio >= 0.6 ? "잘했어요! 우리 학교를 잘 알고 있어요." : "소개를 다시 한 번 들어 보고 도전해 봐요!", x + w / 2, y + 340, 30, { align: CENTER, bold: true });  // 응원 문구 (바꿔도 돼요)
    if (best != null) txt(`내 최고 점수  ${best} / ${QUIZ.length}`, x + w / 2, y + 400, 22, { align: CENTER, color: "#ffe27a" });
    const by = y + h - 130;
    if (button("다시 풀기", x + 90, by, 270, 70, { size: 26 })) { quiz = newQuiz(); sfx("select"); }
    if (button("계속 둘러보기", x + 395, by, 270, 70, { size: 26, ...BLUE })) this.closeQuiz();
    if (button("처음으로", x + 700, by, 270, 70, { size: 26, ...PINK })) goTo("title");
  },
};

window.MAEHOL_GAME = true;
