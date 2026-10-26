// noprotect
// =====================================================================
//  game.js  —  메타 투어 매홀 게임 코드 ② (p5.js)
// =====================================================================
//  sketch.js(게임 코드 ①) 다음에 불러와요. 두 파일은 변수와 함수를 함께 써요.
//
//  이 파일의 차례 (1 ~ 7 번은 sketch.js 에 있어요)
//    8.  월드          맵 · 충돌(벽) · 잠긴 문 · 카메라 · 맵 그리기
//    9.  티처블 머신    얼굴 인식(캐릭터 고르기) · 동작 인식(걷기)
//    10. 시작 화면 · 캐릭터 선택 화면
//    11. 게임 화면      돌아다니기 → NPC 소개 듣기 → 문 열기 → 교실 의자에 앉아 퀴즈
//
//  자주 고치는 곳
//    - 대사·퀴즈·속도·티처블 머신 링크 → content.js
//    - 장소 사진이 나오는 곳         → 11번의 PHOTO_OF
//    - 시험 모드 (모든 문 열기, Shift 로 빨리 걷기) → 주소 뒤에 ?unlock 또는 content.js 의 TEST_MODE
//
//  ※ for(;;) · while 반복문을 쓰지 않아요 (p5.js 웹 에디터와 충돌해요). 반복은 for...of 나 times(n) 로 해요.
//  ※ 맨 아래 MAEHOL_GAME 표시는 sketch.js 가 "이 파일이 불러와졌나?" 확인하는 데 써요.


// =====================================================================
//  8. 월드: 맵, 충돌, 잠긴 문, 카메라, 그리기
//     좌표는 모두 픽셀이에요. 캐릭터의 x, y 는 "발" 위치예요.
// =====================================================================
let grid;         // 칸마다 true(벽) / false(걸을 수 있음)
let gates;        // 잠긴 문들
let npcs;         // NPC들
let objs;         // 가구 (그릴 위치와 앞뒤 순서를 미리 계산해 둬요)
let decor;        // 벽 장식
let player;       // 나
let cam;          // 카메라 위치 (맵 좌표)
let sparks = [];  // 문이 열릴 때 튀는 불꽃

// 시험 모드: 주소 뒤에 ?unlock 을 붙이거나 content.js 의 TEST_MODE: true
const testMode = () => /[?&]unlock/.test(location.search) || window.CONFIG?.TEST_MODE === true;
// 시험 모드에서 Shift 를 누르고 걸으면 3배 빨라요
const fastWalk = () => testMode() && (down("ShiftLeft") || down("ShiftRight"));

// 맵 데이터(data.js)로 월드를 만들어요 (게임을 켤 때 한 번)
function initWorld() {
  grid = MAP.collision.map((row) => [...row].map((c) => c === "1"));
  gates = MAP.gates.map((g) => ({ ...g, open: false, tiles: gateTiles(g) }));
  npcs = MAP.npcs.map((n) => ({
    key: n.spr, name: n.name, id: n.id, area: n.area, role: n.role,
    tx: n.x, ty: n.y,                          // 서 있는 칸
    x: (n.x + 0.5) * T, y: n.y * T + 27,       // 발 위치 (픽셀)
    dir: n.dir, home: n.dir,                   // 바라보는 방향, 원래 방향
  }));
  // 가구: 아래쪽에 있는 것일수록 나중에(앞에) 그려요. sort = 가구 발밑 줄
  objs = MAP.objects.map((o) => {
    const info = LIST.objects[o.n];
    return { n: o.n, x: o.x * T, y: (o.y + info.d) * T - info.ph + info.pad, sort: (o.y + info.d) * T, w: info.pw, h: info.ph };
  });
  objs.sort((a, b) => a.sort - b.sort);
  decor = MAP.decor.map((d) => ({ n: d.n, x: d.x, y: d.y, w: LIST.objects[d.n].pw, h: LIST.objects[d.n].ph }));
  player = { key: charKey, x: 0, y: 0, dir: "down", moving: false, anim: 0 };
  resetWorld();
}
// 문 하나가 차지하는 칸들 (v = 세로 문, h = 가로 문)
function gateTiles(g) {
  return times(g.size).map((i) => (g.o === "v" ? [g.x, g.y + i] : [g.x + i, g.y]));
}
// 새 게임: 처음 상태로
function resetWorld() {
  gates.forEach((g) => (g.open = false));
  Object.assign(player, { key: charKey, x: (MAP.spawn.x + 0.5) * T, y: MAP.spawn.y * T + 27, dir: "down", moving: false, sit: false });
  npcs.forEach((n) => (n.dir = n.home));
  sparks = [];
  openGates(false);
  moveCamera(0, true);
}

// (tx, ty) 칸이 막혔나: 맵 밖, 벽, 닫힌 문, NPC가 서 있는 칸
function isBlocked(tx, ty) {
  if (grid[ty]?.[tx] !== false) return true;
  const onClosedGate = gates.some((g) => !g.open && g.tiles.some(([x, y]) => x === tx && y === ty));
  const onNpc = npcs.some((n) => n.tx === tx && n.ty === ty);
  return onClosedGate || onNpc;
}
// 발 위치(x, y)에 서면 막히나 (발 주변 가로 16, 세로 6 픽셀 상자가 닿는 칸을 모두 검사해요)
function footBlocked(x, y) {
  const x0 = Math.floor((x - 8) / T), x1 = Math.floor((x + 8) / T);
  const y0 = Math.floor((y - 6) / T), y1 = Math.floor(y / T);
  return times(y1 - y0 + 1).some((j) => times(x1 - x0 + 1).some((i) => isBlocked(x0 + i, y0 + j)));
}

// 조건(requires: 소개를 끝내야 하는 구역)을 채운 문을 열어요. 새로 열린 문 목록을 돌려줘요.
function openGates(effects) {
  const opened = gates.filter((g) => !g.open && g.requires.every((id) => done[id]));
  for (const g of opened) {
    g.open = true;
    if (effects) burstSparks(gateCenter(g));
  }
  return opened;
}
// 반짝이는 불꽃 36개를 터뜨려요
function burstSparks({ x, y }) {
  const colors = ["#ffe14a", "#fff", "#9ae8ff", "#ffb0d0"];
  for (const i of times(36)) {
    const angle = Math.random() * 6.28, speed = 20 + Math.random() * 70;
    sparks.push({
      x: x + Math.random() * 28 - 14, y: y + Math.random() * 28 - 14,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 20,
      life: 0.7 + Math.random() * 0.6, age: 0, col: colors[i % 4],
    });
  }
}
// 문의 가운데 (픽셀)
function gateCenter(g) {
  const [x, y] = g.tiles[g.tiles.length >> 1];
  return { x: (x + 0.5) * T, y: (y + 0.5) * T };
}
// 내 바로 앞(r 픽셀 안)에 닫힌 문이 있나
function closedGateNear(r) {
  const near = ([x, y]) => Math.abs(player.x - (x + 0.5) * T) < T / 2 + r && Math.abs(player.y - 8 - (y + 0.5) * T) < T / 2 + r;
  return gates.find((g) => !g.open && g.tiles.some(near));
}
// (tx, ty) 칸이 어느 장소인지
const zoneAt = (tx, ty) => MAP.zones.find((z) => tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h);
// maxDist 픽셀 안에서 제일 가까운 NPC
function nearestNpc(maxDist) {
  const close = npcs.filter((n) => dist(player.x, player.y - 6, n.x, n.y - 6) < maxDist);
  close.sort((a, b) => dist(player.x, player.y, a.x, a.y) - dist(player.x, player.y, b.x, b.y));
  return close[0];
}

// 매 프레임 월드 움직이기 (dt = 흐른 시간(초), move = 이동 방향 {x, y})
function updateWorld(dt, move) {
  movePlayer(dt, move);
  turnNpcsToPlayer();
  sparks.forEach((q) => {
    q.age += dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vy += 60 * dt;  // 떨어지는 힘
  });
  sparks = sparks.filter((q) => q.age < q.life);
  moveCamera(dt, false);
}
// 이동 방향 → 바라보는 방향 (가로로 더 많이 가면 왼쪽/오른쪽)
function dirOf(mx, my) {
  if (mx && Math.abs(mx) >= Math.abs(my)) return mx < 0 ? "left" : "right";
  return my < 0 ? "up" : "down";
}
function movePlayer(dt, move) {
  const len = Math.hypot(move.x, move.y);
  player.moving = len > 0;
  if (!player.moving) {
    player.anim = 0;
    return;
  }
  const fast = fastWalk();
  const step = CONFIG.PLAYER_SPEED * (fast ? 3 : 1) * dt;  // 이번 프레임에 걷는 거리
  const ux = move.x / len, uy = move.y / len;              // 대각선으로 가도 빨라지지 않게 길이를 1로
  player.dir = dirOf(move.x, move.y);
  // 가로, 세로를 따로 움직여서 벽에 부딪혀도 미끄러지듯 걸어요
  const nx = player.x + ux * step;
  if (!footBlocked(nx, player.y)) player.x = nx;
  const ny = player.y + uy * step;
  if (!footBlocked(player.x, ny)) player.y = ny;
  player.anim += fast ? dt * 2 : dt;
}
// NPC는 내가 가까이(3칸 안) 오면 나를 바라봐요
function turnNpcsToPlayer() {
  for (const n of npcs) {
    const dx = player.x - n.x, dy = player.y - n.y;
    if (Math.hypot(dx, dy) > 96) n.dir = n.home;
    else if (Math.abs(dx) > Math.abs(dy) * 1.2) n.dir = dx < 0 ? "left" : "right";
    else n.dir = dy < 0 ? "up" : "down";
  }
}
// 카메라가 나를 따라가요 (맵 밖은 안 보이게). snap = true 면 바로 이동
function moveCamera(dt, snap) {
  const tx = constrain(player.x - VW / 2, 0, MAP.w * T - VW);
  const ty = constrain(player.y - 22 - VH / 2, 0, MAP.h * T - VH);
  if (snap || !cam) {
    cam = { x: tx, y: ty };
    return;
  }
  const k = Math.min(1, 9 * dt);  // 9 = 따라가는 빠르기 (클수록 빨라요)
  cam = { x: cam.x + (tx - cam.x) * k, y: cam.y + (ty - cam.y) * k };
}
// 맵 좌표 → 화면 좌표
const toScreen = (x, y) => ({ x: (x - Math.round(cam.x)) * Z, y: (y - Math.round(cam.y)) * Z });

// 맵 그리기
//   순서: 바닥·벽 → 벽 장식 → [가구, 문, 캐릭터]를 "발밑이 위쪽인 것부터" → 말풍선 → 불꽃
//   아래쪽에 있는 것을 나중에 그려서, 캐릭터가 책상 "뒤로" 걸어가는 것처럼 보여요.
function drawWorld(hintGate) {
  const c = drawingContext, cx = Math.round(cam.x), cy = Math.round(cam.y);
  const visible = (x, y, w, h) => x + w > cx && x < cx + VW && y + h > cy && y < cy + VH;  // 화면 밖은 그리지 않아요
  c.save();
  c.scale(Z, Z);
  c.imageSmoothingEnabled = false;

  if (IMG.bg) c.drawImage(IMG.bg, cx, cy, VW, VH, 0, 0, VW, VH);  // 바닥·벽: 큰 맵 그림에서 보이는 부분만
  for (const d of decor) {
    if (visible(d.x, d.y, d.w, d.h)) c.drawImage(IMG.obj[d.n], d.x - cx, d.y - cy);
  }

  const list = [];  // 앞뒤 순서를 맞춰서 그릴 것들: { sort(발밑 줄), draw() }
  for (const o of objs) {
    if (visible(o.x, o.y, o.w, o.h)) list.push({ sort: o.sort, draw: () => c.drawImage(IMG.obj[o.n], o.x - cx, o.y - cy) });
  }
  for (const g of gates) {
    const [gw, gh] = g.o === "v" ? [T, g.size * T] : [g.size * T, T];
    const im = IMG.obj[`gate_${g.o}${g.size}_${g.open ? "open" : "closed"}`];
    if (visible(g.x * T, g.y * T, gw, gh)) list.push({ sort: g.y * T + gh, draw: () => c.drawImage(im, g.x * T - cx, g.y * T - cy) });
  }
  for (const e of [...npcs, player]) {
    if (visible(e.x - 20, e.y - 50, 40, 60)) list.push({ sort: e.y, draw: () => drawCharacter(e, cx, cy) });
  }
  if (!player.sit) list.push({ sort: player.y - 1, draw: () => drawFootRing(cx, cy) });
  list.sort((a, b) => a.sort - b.sort).forEach((it) => it.draw());

  // NPC 머리 위 말풍선
  for (const n of npcs) {
    const icon = scene === "game" && mode === "explore" ? npcIcon(n) : null;
    if (icon && visible(n.x - 20, n.y - 90, 40, 70)) {
      c.drawImage(IMG.ui[icon], Math.round(n.x - 9 - cx), Math.round(n.y - 86 - cy + Math.sin(clock * 4 + n.tx) * 2));
    }
  }
  // 퀴즈 책상 위 느낌표 (소개를 다 듣고 아직 퀴즈 전)
  if (scene === "game" && mode === "explore" && allDone() && !quizDone) {
    c.drawImage(IMG.ui.bubble_exclaim, Math.round((MAP.seat.x + 0.5) * T - 9 - cx), Math.round((MAP.seat.y - 1) * T - 22 - cy + Math.sin(clock * 4) * 2));
  }
  // 방금 열린 문 위 화살표
  if (hintGate) {
    const g = gateCenter(hintGate);
    c.drawImage(IMG.ui.arrow_down, Math.round(g.x - 8 - cx), Math.round(g.y - 34 - cy + Math.sin(clock * 5) * 3));
  }
  for (const q of sparks) {
    c.globalAlpha = Math.max(0, 1 - q.age / q.life);
    c.fillStyle = q.col;
    c.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), 3, 3);
  }
  c.restore();
}
// 캐릭터 한 명 그리기 (나 또는 NPC)
function drawCharacter(e, cx, cy) {
  const x = e.x - 15 - cx, y = e.y - 43 - cy;
  if (e.sit) return sprite(e.key, "up", 0, x, y + SIT[0], 1, [0, 0, 30, SIT[1]]);  // 의자에 앉은 뒷모습
  const frame = e.moving ? [1, 0, 2, 0][Math.floor(e.anim * 8) % 4] : 0;      // 걸을 때 1→0→2→0 반복
  const breathe = e === player ? 0 : Math.round(Math.sin(clock * 2.2 + e.tx) * 0.6);  // NPC는 살짝 숨쉬듯 움직여요
  sprite(e.key, e.dir, frame, x, y + breathe);
}
// 내 발밑에서 깜빡이는 동그라미
function drawFootRing(cx, cy) {
  const c = drawingContext;
  c.globalAlpha = 0.75 + 0.25 * Math.sin(clock * 4);
  c.drawImage(IMG.ui.ring, Math.round(player.x - 18 - cx), Math.round(player.y - 12 - cy));
  c.globalAlpha = 1;
}


// =====================================================================
//  9. 티처블 머신
//     얼굴 인식: 동훈 / 민성 / 성민 / no face  →  캐릭터 고르기 (캐릭터 선택 화면에서만)
//     동작 인식: 위 / 아래 / 왼쪽 / 오른쪽 / 확인  →  걷기
//     content.js 의 링크가 비어 있으면 카메라도 모델도 켜지 않아요.
//     흐름: 카메라 켜기 → 라이브러리 받기 → 모델 받기 → 0.07초마다 카메라 그림을 모델에 넣기 → 결과(클래스, 확률)
// =====================================================================
const tm = {
  running: false,   // 켜져 있나
  gen: 0,           // 켤 때마다 바뀌는 번호 (껐다 켜면 예전에 하던 일은 멈춰요)
  cameraOn: false,
  error: null,      // 카메라·라이브러리 오류 (화면에 보여 줘요)
  video: null,      // 카메라 영상 (화면에는 안 보이게 숨겨요)
  canvas: null,     // 모델에 넣을 224 x 224 그림
  face: { status: "off", model: null, label: "", prob: 0, probs: [], key: null, none: false },  // key = 인식된 캐릭터, none = 사람 없음
  motion: { status: "off", model: null, label: "", dir: null },
};
const tmFaceUrl = () => (CONFIG.TM_FACE_MODEL_URL || "").trim();
const tmMotionUrl = () => (CONFIG.TM_MOTION_MODEL_URL || "").trim();
const tmWanted = () => tmFaceUrl() || tmMotionUrl();

// 이름 비교: 대소문자·띄어쓰기를 무시해요 ("No one" = "noone")
const simple = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
const sameName = (label, list) => (list || []).some((n) => simple(n) === simple(label));

// 얼굴 인식 결과 지우기 (예전 결과가 남아서 저절로 골라지지 않게)
function clearFace() {
  Object.assign(tm.face, { label: "", prob: 0, probs: [], key: null, none: false });
}
// 얼굴: 클래스 이름 → 캐릭터.   ("민성", 0.97) → face.key = "minseong",   ("no face", 0.99) → face.none = true
function readFace(label, prob, probs = []) {
  const f = tm.face;
  Object.assign(f, { label, prob, probs, key: null, none: sameName(label, CONFIG.FACE_NONE_CLASSES) });
  if (f.none || prob < CONFIG.FACE_MIN_PROB) return;  // 사람이 없거나 확률이 낮으면 아직 모르는 걸로
  f.key = Object.keys(CONFIG.FACE_CLASSES).find((k) => sameName(label, CONFIG.FACE_CLASSES[k])) || null;
}
// 동작: 클래스 이름 → 방향.   ("오른쪽", 0.95) → motion.dir = "right"
let lastMotionAction = 0;
function readMotion(label, prob) {
  const m = tm.motion, M = CONFIG.MOTION_CLASSES, oldDir = m.dir;
  m.label = label;
  m.dir = null;
  motion.action = false;
  const sure = prob >= CONFIG.MOTION_MIN_PROB && !sameName(label, CONFIG.MOTION_IDLE_CLASSES);
  if (sure) {
    m.dir = ["up", "down", "left", "right"].find((d) => sameName(label, M[d])) || null;
    if (sameName(label, M.action) && performance.now() - lastMotionAction > 900) {  // "확인" 동작은 0.9초에 한 번만
      motion.action = true;
      lastMotionAction = performance.now();
    }
  }
  if (m.dir !== oldDir) motion.nav = m.dir === "up" ? -1 : m.dir === "down" ? 1 : 0;  // 메뉴 위/아래
  motion.dir = m.dir;
}
// 시험용 (F12 콘솔에서): debugFace("민성", 0.95) / debugFace("no face") / debugMotion("오른쪽")
const debugFace = (label, prob = 0.95) => {
  tm.face.status = "준비됨(테스트)";
  readFace(label, prob, [{ name: label, p: prob }]);
};
const debugMotion = (label, prob = 0.95) => {
  tm.motion.status = "준비됨(테스트)";
  readMotion(label, prob);
};

// ---- 라이브러리 받기: 첫 주소(jsDelivr)가 막히면 두 번째(unpkg)로 받아요. 20초 넘게 안 오면 다음 주소로.
const scriptCache = {};
function loadScript(src) {
  scriptCache[src] ||= new Promise((resolve, reject) => {
    const el = document.createElement("script");
    const fail = () => {
      delete scriptCache[src];
      reject(new Error("no"));
    };
    const timer = setTimeout(fail, 20000);
    el.src = src;
    el.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    el.onerror = () => {
      clearTimeout(timer);
      fail();
    };
    document.head.appendChild(el);
  });
  return scriptCache[src];
}
const CDNS = ["https://cdn.jsdelivr.net/npm/", "https://unpkg.com/"];
const LIB = {
  tf: CDNS.map((cdn) => cdn + "@tensorflow/tfjs@1.3.1/dist/tf.min.js"),
  pose: CDNS.map((cdn) => cdn + "@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js"),
  image: CDNS.map((cdn) => cdn + "@teachablemachine/image@0.8/dist/teachablemachine-image.min.js"),
};
async function loadLib(srcs) {
  for (const src of srcs) {
    const ok = await loadScript(src).then(() => true, () => false);
    if (ok) return;
  }
  throw new Error("티처블 머신 프로그램을 인터넷에서 받지 못했어요. 학교 인터넷에서 cdn.jsdelivr.net / unpkg.com 이 막혀 있는지 확인해 주세요");
}
// 카메라 오류를 알아듣기 쉬운 말로
const CAMERA_ERRORS = {
  NotAllowedError: "카메라 사용이 막혀 있어요. 주소창 왼쪽 아이콘을 눌러 카메라를 '허용'으로 바꾼 뒤 새로고침해 주세요",
  SecurityError: "카메라 사용이 막혀 있어요. 주소창 왼쪽 아이콘을 눌러 카메라를 '허용'으로 바꾼 뒤 새로고침해 주세요",
  NotFoundError: "카메라를 찾지 못했어요. 카메라가 연결돼 있는지 확인해 주세요",
  NotReadableError: "다른 프로그램(줌, 티처블 머신 창, 다른 브라우저 등)이 카메라를 쓰고 있어요. 그 창을 닫고 새로고침해 주세요",
  AbortError: "카메라를 켜지 못했어요. 다른 프로그램이 카메라를 쓰고 있지 않은지 확인하고 새로고침해 주세요",
};
const camError = (e) => CAMERA_ERRORS[e?.name] || e?.message || String(e);
// 모델 링크 → [model.json 주소, metadata.json 주소]
function modelUrls(base) {
  base = base.replace(/[^/]*\.json$/i, "");
  if (!base.endsWith("/")) base += "/";
  return [base + "model.json", base + "metadata.json"];
}

// 티처블 머신 켜기
async function startTeachable() {
  if (tm.running || !tmWanted()) return;
  tm.running = true;
  const gen = ++tm.gen;
  const stale = () => gen !== tm.gen;  // 기다리는 동안 꺼졌나 (다른 화면으로 갔을 때)

  // 1) 카메라 켜기 (https 또는 localhost 에서만 돼요)
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("이 브라우저에서는 카메라를 쓸 수 없어요 (https 또는 localhost 에서 열어 주세요)");
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
    if (stale()) return stream.getTracks().forEach((t) => t.stop());
    tm.video = Object.assign(document.createElement("video"), { srcObject: stream, muted: true, autoplay: true });
    tm.video.style.cssText = "position:fixed;left:-9999px;width:2px;height:2px;opacity:0";
    tm.video.setAttribute("playsinline", "");
    document.body.appendChild(tm.video);
    await tm.video.play();
    if (stale()) return;
    tm.canvas = Object.assign(document.createElement("canvas"), { width: 224, height: 224 });
    tm.cameraOn = true;
    tm.error = null;
  } catch (e) {
    if (!stale()) {
      tm.error = camError(e);
      tm.running = false;
    }
    return;
  }

  // 2) 라이브러리 받기 (링크가 있는 모델에 필요한 것만)
  const poseMode = CONFIG.TM_MOTION_TYPE !== "image" && tmMotionUrl();
  if (tmFaceUrl()) tm.face.status = "프로그램 받는 중...";
  if (tmMotionUrl()) tm.motion.status = "프로그램 받는 중...";
  try {
    await loadLib(LIB.tf);
    if (poseMode) await loadLib(LIB.pose);
    if (tmFaceUrl() || (tmMotionUrl() && !poseMode)) await loadLib(LIB.image);
  } catch (e) {
    if (!stale()) {
      stopTeachable();
      tm.error = e.message;
      tm.face.status = tm.motion.status = "off";
    }
    return;
  }
  if (stale()) return;

  // 3) 모델 받기 (한 번 받은 모델은 다시 받지 않아요)
  const load = async (key, url, lib) => {
    const r = tm[key];
    if (r.model) return void (r.status = "준비됨");
    r.status = "불러오는 중...";
    try {
      r.model = await lib.load(...modelUrls(url));
      r.status = "준비됨";
    } catch (e) {
      r.status = "오류: 모델을 불러오지 못했어요";
      console.warn(e);
    }
  };
  await Promise.all([
    tmFaceUrl() && load("face", tmFaceUrl(), window.tmImage),
    tmMotionUrl() && load("motion", tmMotionUrl(), poseMode ? window.tmPose : window.tmImage),
  ]);
  if (!stale()) tick(gen);
}
// 0.07초마다: 카메라 그림을 만들어 모델에 넣고 결과를 받아요
async function tick(gen) {
  if (!tm.running || gen !== tm.gen) return;
  try {
    const v = tm.video;
    if (v.readyState >= 2 && v.videoWidth) {
      // 가운데 정사각형만 잘라서 거울처럼 좌우를 뒤집어요 (티처블 머신 웹캠과 같게)
      const s = Math.min(v.videoWidth, v.videoHeight), c = tm.canvas.getContext("2d");
      c.save();
      c.translate(224, 0);
      c.scale(-1, 1);
      c.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, 224, 224);
      c.restore();

      const best = (preds) => preds.reduce((a, b) => (b.probability > a.probability ? b : a));  // 확률이 제일 큰 것
      if (tm.face.model && scene === "select") {  // 얼굴은 캐릭터 선택 화면에서만
        const preds = await tm.face.model.predict(tm.canvas), b = best(preds);
        if (gen === tm.gen) readFace(b.className, b.probability, preds.map((q) => ({ name: q.className, p: q.probability })));
      }
      if (tm.motion.model) {
        const m = tm.motion.model;
        const preds = CONFIG.TM_MOTION_TYPE === "image"
          ? await m.predict(tm.canvas)
          : await m.predict((await m.estimatePose(tm.canvas)).posenetOutput);  // 포즈 모델은 몸의 관절을 먼저 찾아요
        const b = best(preds);
        if (gen === tm.gen) readMotion(b.className, b.probability);  // 기다리는 사이에 꺼졌으면 결과를 버려요
      }
    }
  } catch (e) {
    console.warn("티처블 머신 오류", e);
  }
  setTimeout(() => tick(gen), 70);
}
// 티처블 머신 끄기 (카메라도 꺼요)
function stopTeachable() {
  tm.gen++;
  tm.running = tm.cameraOn = false;
  tm.video?.srcObject?.getTracks().forEach((t) => t.stop());
  tm.video?.remove();
  clearFace();
  tm.motion.dir = motion.dir = null;
}


// =====================================================================
//  10. 시작 화면 · 캐릭터 선택 화면
// =====================================================================
// ---- 시작 화면: '메타 투어 매홀' 그림 위에 [시작하기]와 톱니바퀴 클릭 영역을 얹었어요
const START_BTN = [543, 620, 194, 62];  // [x, y, 가로, 세로]
const GEAR_BTN = [1180, 626, 76, 80];
scenes.title = {
  enter() {
    if (tm.running) stopTeachable();
  },
  update() {
    if (settingsOpen) return;
    if (was("Enter") || was("Space")) {
      sfx("select");
      goTo("select");
    }
  },
  draw() {
    drawingContext.imageSmoothingEnabled = false;
    if (IMG.title) drawingContext.drawImage(IMG.title, 0, 0, W, H);
    else {
      background("#27315c");
      txt("메타 투어 매홀", W / 2, 220, 72, { align: CENTER, bold: true, color: "#ffd34a" });
    }
    if (settingsOpen) return;

    const overStart = hover(...START_BTN), overGear = hover(...GEAR_BTN);
    push();
    noFill();
    stroke(255, 255, 255, overStart ? 255 : 90 + 90 * Math.sin(clock * 4) ** 2);  // [시작하기] 둘레가 깜빡여요
    strokeWeight(overStart ? 5 : 3);
    rect(START_BTN[0] - 4, START_BTN[1] - 4, START_BTN[2] + 8, START_BTN[3] + 8, 14);
    if (overGear) {
      stroke(255);
      rect(GEAR_BTN[0] - 2, GEAR_BTN[1] - 2, GEAR_BTN[2] + 4, GEAR_BTN[3] + 4, 12);
    }
    pop();
    if (overStart || overGear) cursor("pointer");

    txt("Space 키 또는 [시작하기]", 20, 696, 11, { outline: "rgba(0,0,0,0.8)" });
    const web = [...FILES, ART].filter((f) => loadState[f.name] === "인터넷").map((f) => f.name);  // 인터넷 파일로 실행 중이면 알려 줘요
    if (web.length) txt(`내 파일 대신 인터넷(GitHub)의 ${web.join(", ")} 로 실행 중이에요`, 20, 676, 11, { color: "#ffe27a", outline: "rgba(0,0,0,0.8)" });
    if (best != null) {
      panel(24, 24, 250, 44, { fill: "rgba(20,22,50,0.8)", border: "#ffe27a", shadow: false });
      txt(`최고 퀴즈 점수  ${best} / ${QUIZ.length}`, 149, 46, 16, { align: CENTER, valign: CENTER, bold: true, color: "#ffe27a" });
    }
    if (clicked(...START_BTN)) {
      sfx("select");
      goTo("select");
    }
    if (clicked(...GEAR_BTN)) {
      sfx("click");
      showSettings(false);
    }
  },
};

// ---- 캐릭터 선택 화면
//   ← → (또는 1·2·3, 클릭)로 고르고 Space 로 시작해요.
//   얼굴 인식 링크가 있으면: 얼굴이 FACE_MIN_PROB(80%) 이상으로 인식되는 동안 카드의 게이지가 차고, 가득 차면 자동 시작!
let sel = 0;          // 골라진 카드 번호
let holdMs = 0;       // 게이지 (같은 얼굴이 인식된 시간, ms)
let lastFace = null;  // 게이지가 차고 있는 캐릭터
const CARD = { y: 150, w: 252, h: 360 };
const cardX = (i) => 360 + i * 274;
scenes.select = {
  enter() {
    sel = Math.max(0, CHARS.findIndex((c) => c.key === charKey));
    holdMs = 0;
    lastFace = null;
    clearFace();
    startTeachable();
  },
  choose(i) {
    if (i === sel) return;
    sel = i;
    sfx("select");
  },
  confirm() {
    charKey = CHARS[sel].key;
    sfx("finish");
    goTo("game", { fresh: true });
  },
  update(dt) {
    if (settingsOpen) return;
    const n = numberKey();
    if (n >= 0 && n < CHARS.length) this.choose(n);
    if (was("ArrowLeft") || was("KeyA")) this.choose((sel + CHARS.length - 1) % CHARS.length);
    if (was("ArrowRight") || was("KeyD")) this.choose((sel + 1) % CHARS.length);
    if (was("Escape")) return goTo("title");
    if (action()) return this.confirm();
    this.updateFaceGauge(dt);
  },
  updateFaceGauge(dt) {
    const f = tm.face;
    if (tmFaceUrl() && f.key) {  // 동훈·민성·성민 중 하나가 80% 이상
      this.choose(CHARS.findIndex((c) => c.key === f.key));
      if (f.key !== lastFace) holdMs = 0;  // 다른 얼굴로 바뀌면 처음부터
      holdMs += dt * 1000;
      lastFace = f.key;
      if (holdMs >= CONFIG.FACE_HOLD_MS) this.confirm();  // 게이지가 가득 차면 자동 시작!
    } else {
      holdMs = Math.max(0, holdMs - dt * 500);  // 80% 아래로 잠깐 흔들리면 천천히 줄어요 (바로 0이 되지 않게)
    }
  },
  draw() {
    // 배경: 위에서 아래로 어두워지는 보라색 + 반짝이는 별
    const g = drawingContext.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#3a2f73");
    g.addColorStop(1, "#1b1740");
    drawingContext.fillStyle = g;
    drawingContext.fillRect(0, 0, W, H);
    noStroke();
    for (const i of times(46)) {
      fill(255, 255, 255, 80 + 120 * Math.abs(Math.sin(clock * 1.4 + i)));
      rect((i * 197) % W, (i * 83) % 420, 3, 3);
    }

    txt("캐릭터를 골라 주세요", W / 2, 40, 40, { align: CENTER, bold: true, color: "#ffe27a", outline: "#2a1a50", outlineW: 6 });
    const sub = tmFaceUrl() ? "카메라에 얼굴을 보여 주면 내 캐릭터가 자동으로 골라져요!" : "← → 로 고르고 Space 로 시작해요";
    txt(sub, W / 2, 96, 22, { align: CENTER, color: "#d8d4ff" });
    this.drawCamera();
    CHARS.forEach((c, i) => this.drawCard(c, i));

    if (button("이 캐릭터로 시작하기", W / 2 - 120, 556, 380, 70, { size: 26 })) this.confirm();
    txt("← → 로 고르고 Space 로 시작해요", W / 2 + 70, 640, 11, { align: CENTER, color: "rgba(255,255,255,0.6)" });
    if (button("← 처음 화면", 30, 650, 190, 46, { size: 20, ...GRAY })) goTo("title");
    if (button("설정", 1110, 650, 80, 46, { size: 20, ...GRAY })) showSettings(false);
  },
  drawCard(c, i) {
    const x = cardX(i), { y, w, h } = CARD;
    const on = sel === i, hov = hover(x, y, w, h) && !settingsOpen;
    const ly = y + (on ? -10 : hov ? -4 : 0);  // 골라진 카드는 위로 떠올라요
    panel(x, ly, w, h, { fill: on ? "rgba(255,244,200,0.98)" : "rgba(238,234,255,0.94)", border: on ? "#ffb21f" : "#8f94ff", bw: on ? 6 : 4, r: 16 });
    push();  // 발밑 그림자
    noStroke();
    fill(on ? "rgba(255,190,60,0.35)" : "rgba(120,110,200,0.25)");
    ellipse(x + w / 2, ly + 270, 150, 38);
    pop();

    drawingContext.imageSmoothingEnabled = false;
    const bounce = on ? Math.round(Math.sin(clock * 5) * 4) : 0;
    sprite(c.key, "down", 0, x + w / 2 - 75, ly + 28 + bounce, 5);  // 캐릭터를 5배로 크게
    txt(c.name, x + w / 2, ly + 292, 30, { align: CENTER, bold: true, color: "#3a2a70" });
    txt(c.desc, x + w / 2, ly + 330, 11, { align: CENTER, color: "#6a5ea0" });
    keycap(String(i + 1), x + 14, ly + 14);
    if (on) txt("선택!", x + w - 16, ly + 18, 22, { align: RIGHT, bold: true, color: "#e0701a" });

    // 얼굴 인식: 이 캐릭터로 인식되면 카드 아래에 "얼굴 인식!", 카드 안에 게이지
    if (tmFaceUrl() && tm.face.key === c.key) {
      txt("얼굴 인식!", x + w / 2, ly + h + 12, 22, { align: CENTER, bold: true, color: "#8affb0", outline: "#103a20", outlineW: 5 });
    }
    if (tmFaceUrl() && lastFace === c.key && holdMs > 0) {
      const full = constrain(holdMs / CONFIG.FACE_HOLD_MS, 0, 1);
      push();
      noStroke();
      fill("rgba(0,0,0,0.35)");
      rect(x + 20, ly + h - 16, w - 40, 9, 4);
      fill(tm.face.key === c.key ? "#4fd17a" : "#b8c890");  // 인식이 잠깐 끊기면 연한 색
      rect(x + 20, ly + h - 16, (w - 40) * full, 9, 4);
      pop();
    }

    if (hov) {  // 클릭: 처음엔 고르기, 또 누르면 시작
      cursor("pointer");
      if (clicked(x, y, w, h)) sel === i ? this.confirm() : this.choose(i);
    }
  },
  // 왼쪽 칸: 카메라 화면과 인식 결과
  drawCamera() {
    const [x, y, w, h] = [34, 150, 300, 360];
    panel(x, y, w, h, { fill: "rgba(14,12,40,0.85)", border: "#6a66c0", r: 14 });
    if (!tmFaceUrl()) {
      txt("얼굴 인식", x + w / 2, y + 22, 22, { align: CENTER, bold: true, color: "#ffe27a" });
      const help = "티처블 머신 얼굴 인식 링크가 비어 있어요.\n\ncontent.js 의 TM_FACE_MODEL_URL 에 링크를 붙여 넣으면 카메라로 캐릭터를 고를 수 있어요.";
      wrapText(help, w - 40, 11).forEach((l, i) => txt(l, x + 20, y + 78 + i * 20, 11, { color: "#d8d4ff" }));
      txt("지금은 키보드/마우스로\n골라 주세요", x + w / 2, y + h - 80, 22, { align: CENTER, bold: true, color: "#9ad0ff" });
      return;
    }
    txt("얼굴 인식 카메라", x + w / 2, y + 16, 22, { align: CENTER, bold: true, color: "#ffe27a" });
    panel(x + 28, y + 54, 244, 244, { fill: "#0a0818", border: "#6a66c0", bw: 3, r: 8, shadow: false });
    if (tm.cameraOn && !tm.error) drawingContext.drawImage(tm.canvas, x + 30, y + 56, 240, 240);
    else {
      const msg = tm.error || "카메라를 켜는 중...\n\n(카메라를 쓸지 물어보면 '허용'을 눌러 주세요)";
      wrapText(msg, 204, 11).forEach((l, i) => txt(l, x + 48, y + 80 + i * 20, 11, { color: "#ffb0b0" }));
    }
    const [label, color] = this.faceStatus();
    txt(label, x + w / 2, y + 314, 22, { align: CENTER, bold: true, color });
  },
  // 카메라 아래 인식 결과 한 줄: [글, 색]
  faceStatus() {
    const f = tm.face, pct = Math.round(f.prob * 100);
    if (tm.error) return ["얼굴 인식을 못 켰어요", "#ff9a9a"];
    if (f.status.startsWith("오류")) return [f.status, "#ff9a9a"];
    if (!f.model && !f.label) return [f.status === "off" ? "얼굴을 비춰 주세요" : f.status, "#d8d4ff"];
    if (f.none) return ["얼굴이 보이지 않아요", "#ffd27a"];
    if (f.key) return [`${charName(f.key)}  ${pct}%`, "#8affb0"];
    return [`${f.label}?  ${pct}%`, "#ffe27a"];  // 80% 가 안 돼요
  },
};


// =====================================================================
//  11. 게임 화면: 돌아다니기 → NPC 소개 듣기 → 문 열기 → 교실 의자에 앉아 퀴즈
//      mode (지금 하는 일)
//        "explore"  돌아다니는 중
//        "dialogue" 대화 중
//        "photo"    새 장소 사진을 보는 중
//        "seated"   퀴즈 의자에 앉아 있는 중
//        "quiz"     퀴즈 푸는 중
// =====================================================================
let mode = "explore";
let dlg = null;          // 진행 중인 대화
let quiz = null;         // 진행 중인 퀴즈
let zone = null;         // 지금 있는 장소
let zoneT = 0;           // 장소 이름을 크게 보여 준 시간
let hintGate = null;     // 방금 열린 문 (화살표로 알려 줘요)
let nearNpc = null;      // 가까이 있는 NPC
let nearSeat = false;    // 퀴즈 의자 앞에 있나
let cooldown = {};       // NPC별 쉬는 시간 (대화가 끝나자마자 또 말을 걸지 않게)
let gateCool = 0;        // 닫힌 문 알림 간격
let mini = null;         // 미니맵 그림

// 새 장소에 처음 들어가면 그 장소 사진을 반짝이는 효과와 함께 잠깐 보여 줘요 (사진은 art.png 안에 있어요)
const PHOTO_OF = { c1: "corr1", cafeteria: "cafeteria", gym: "gym", library: "library", classroom: "classroom" };  // 장소 → 사진 (복도는 처음 만나는 본관 복도 c1 만)
const PHOTO_T = 3.4;     // 사진이 떠 있는 시간(초)
let seen = {};           // 이미 가 본 장소
let photo = null;        // 지금 보여 주는 사진 { t, id, name }

// 퀴즈 하나의 보기를 섞고 정답 번호도 맞춰 바꿔요 (fixed: true 면 그대로)
function shuffled(q) {
  if (q.fixed) return q;
  const order = q.choices.map((_, i) => [Math.random(), i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  return { ...q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) };
}
// 새 퀴즈 (시작할 때마다 정답 위치가 달라져요)
//   i: 지금 문제, sel: 고르고 있는 보기, rsel: 결과 화면에서 고른 버튼, picked: 고른 답, results: 맞았나 목록
const newQuiz = () => ({ i: 0, score: 0, state: "ask", sel: 0, rsel: 1, picked: -1, results: [], t: 0, qs: QUIZ.map(shuffled) });
const allDone = () => AREAS.every((a) => done[a]);  // 4곳 소개를 모두 끝냈나

// NPC 머리 위 말풍선 (없으면 null)
function npcIcon(n) {
  const newIntro = n.role === "guide" && !done[n.area];
  const quizReady = n.role === "quiz" && allDone() && !quizDone;
  if (newIntro || quizReady) return "bubble_exclaim";
  return n === nearNpc ? "bubble_talk" : null;
}

scenes.game = {
  enter(arg) {
    if (arg?.fresh) this.newGame();
    player.key = charKey;
    if (!mini) {  // 미니맵: 맵 그림을 작게 줄여서 한 번만 만들어 둬요
      mini = Object.assign(document.createElement("canvas"), { width: 150, height: Math.round((150 * MAP.h) / MAP.w) });
      mini.getContext("2d").drawImage(IMG.bg, 0, 0, mini.width, mini.height);
    }
    // 게임 중 카메라는 동작 인식이 있을 때만 켜요 (얼굴 인식은 캐릭터 고를 때만 써서 꺼 둬요 → 컴퓨터가 덜 느려져요)
    if (tmMotionUrl()) startTeachable();
    else if (tm.running) stopTeachable();
  },
  // 새 게임: 진행 상황을 모두 처음으로
  newGame() {
    done = {};
    seen = {};
    quizDone = false;
    mode = "explore";
    dlg = quiz = hintGate = zone = photo = null;
    cooldown = {};
    toasts = [];
    resetWorld();
    toast("방향키로 걸어 다녀요!", "star");
    if (testMode()) {  // 시험 모드: 모든 소개를 끝낸 걸로 하고 문을 다 열어요
      AREAS.forEach((a) => (done[a] = true));
      openGates(false);
      toast("시험 모드: 모든 문이 열려 있어요 · Shift 를 누르고 걸으면 빨라요", "check");
    }
  },

  // ---- 매 프레임 움직이기
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

  // ---- 모드: 돌아다니기
  explore(dt) {
    const move = moveVec();
    updateWorld(dt, move);
    if (this.checkNewZone()) return;  // 처음 온 장소면 사진부터!
    zoneT += dt;

    // 방금 열린 문 가까이 가면 화살표가 사라져요
    if (hintGate && dist(player.x, player.y, gateCenter(hintGate).x, gateCenter(hintGate).y) < 56) hintGate = null;

    nearNpc = nearestNpc(46);
    const seatDist = dist(player.x, player.y - 6, (MAP.seat.x + 0.5) * T, MAP.seat.y * T + 20);  // 퀴즈 의자까지 거리
    nearSeat = seatDist < 46 && !(nearNpc && dist(player.x, player.y, nearNpc.x, nearNpc.y) < seatDist);

    // 아직 안 들은 소개 NPC 가까이 가면 대화가 저절로 시작돼요
    for (const n of npcs) {
      const waiting = n.role === "guide" && !done[n.area] && !cooldown[n.id];
      if (waiting && dist(player.x, player.y, n.x, n.y) < 62) return this.talk(n);
    }
    if (nearSeat && action()) return this.sit();           // 퀴즈 의자 앞에서 Space → 앉기
    if (nearNpc && action()) return this.talk(nearNpc);     // NPC 앞에서 Space → 대화

    // 닫힌 문에 부딪히면 왜 닫혔는지 알려 줘요 (3초에 한 번)
    if ((move.x || move.y) && gateCool <= 0) {
      const g = closedGateNear(10);
      if (g) {
        toast(g.label, "lock");
        sfx("wrong");
        gateCool = 3;
      }
    }
  },
  // 다른 장소로 들어왔나 확인. 처음 온 곳이면 사진을 보여 주고 true
  checkNewZone() {
    const z = zoneAt(Math.floor(player.x / T), Math.floor((player.y - 4) / T));
    if (!z || z === zone) return false;
    zone = z;
    zoneT = 0;
    const first = !seen[z.id];
    seen[z.id] = true;
    if (!first || !IMG["photo_" + PHOTO_OF[z.id]]) return false;
    mode = "photo";
    photo = { t: 0, id: PHOTO_OF[z.id], name: z.name };
    sfx("open");
    return true;
  },

  // ---- NPC와 대화 시작. NPC의 역할(role)에 따라 하는 말이 달라요
  talk(n) {
    const S = SCRIPT;
    if (n.role === "guide") {  // 안내 NPC: 대사를 다 들으면 이 구역이 "완료"
      this.say(n, S.areas[n.area].lines, () => this.finishArea(n.area));
    } else if (n.role === "quiz") {  // 반장: 소개를 다 듣기 전엔 돌려보내요
      if (!allDone()) this.say(n, S.quiz.locked);
      else this.say(n, quizDone ? S.quiz.again : S.quiz.intro);
    } else {  // 복도 NPC: 학교 이야기 (안 들어도 돼요)
      this.say(n, S.chat[n.id] || ["안녕!"]);
    }
  },
  // 대화창 열기. lines = 대사 목록, onDone = 다 들은 뒤 할 일
  say(npc, lines, onDone) {
    lines = (Array.isArray(lines) ? lines : [lines]).filter((t) => typeof t === "string" && t);  // content.js 에서 대사를 비워도 멈추지 않게
    if (!lines.length) return onDone?.();
    mode = "dialogue";
    dlg = { npc, lines, idx: 0, shown: 0, done: false, onDone };
    sfx("click");
  },
  // 소개를 끝내면 완료로 기록하고 문을 열어요
  finishArea(area) {
    if (done[area]) return;
    done[area] = true;
    sfx("finish");
    toast(SCRIPT.areas[area].done || "소개를 잘 들었어요!", "star");
    const opened = openGates(true);
    if (!opened.length) return;
    hintGate = opened[opened.length - 1];
    setTimeout(() => {
      sfx("open");
      toast("문이 열렸어요! 화살표를 따라가 보세요", "check");
    }, 900);
  },

  // ---- 모드: 대화 중
  dialogue(dt) {
    updateWorld(dt, { x: 0, y: 0 });
    const d = dlg, text = d.lines[d.idx];
    if (!d.done) {  // 글자가 한 글자씩 나타나요
      const before = Math.floor(d.shown / 3);
      d.shown += dt * CONFIG.TEXT_SPEED;
      if (Math.floor(d.shown / 3) !== before) sfx("blip");  // 글자 3개마다 삑
      if (d.shown >= text.length) {
        d.shown = text.length;
        d.done = true;
      }
    }
    if (!(action() || click)) return;  // Space / 클릭으로 넘겨요
    click = null;
    if (!d.done) {  // 아직 나오는 중이면 한 번에 다 보여 주기
      d.shown = text.length;
      d.done = true;
      return;
    }
    d.idx++;
    d.shown = 0;
    d.done = false;
    sfx("click");
    if (d.idx >= d.lines.length) {  // 대사가 끝났어요!
      mode = "explore";
      cooldown[d.npc.id] = 2.5;
      dlg = null;
      d.onDone?.();
    }
  },

  // ---- 모드: 장소 사진 (잠깐 보여 주고 저절로 사라져요. Space / 클릭하면 바로 넘어가요)
  photoUpdate(dt) {
    updateWorld(dt, { x: 0, y: 0 });
    photo.t += dt;
    const canSkip = photo.t > 0.7 && photo.t < PHOTO_T - 0.5;
    if ((action() || click) && canSkip) {
      click = null;
      photo.t = PHOTO_T - 0.5;  // 사라지는 장면으로 건너뛰기
      sfx("click");
    }
    if (photo.t >= PHOTO_T) {
      mode = "explore";
      photo = null;
      zoneT = 0;
    }
  },
  photoDraw() {
    const { t, id, name } = photo, c = drawingContext;
    const pw = 880, ph = 495;  // 사진 크기
    const appear = Math.min(1, t / 0.5);                      // 나타나는 정도 0→1
    const vanish = Math.max(0, (t - PHOTO_T + 0.5) / 0.5);    // 사라지는 정도 0→1
    const alpha = appear * (1 - vanish);
    const ease = 1 - (1 - appear) ** 3;                       // 부드럽게 멈추는 움직임

    dim(0.6 * alpha);
    push();
    translate(W / 2, H / 2 - 20);
    rotate((1 - ease) * -0.07);                         // 살짝 돌면서
    scale((0.8 + 0.2 * ease) * (1 + 0.06 * vanish));    // 커지며 나타나요
    c.globalAlpha = alpha;
    panel(-pw / 2 - 12, -ph / 2 - 12, pw + 24, ph + 24, { fill: "#fff8e0", border: "#ffe27a", r: 14 });
    c.imageSmoothingEnabled = true;
    c.drawImage(IMG["photo_" + id], -pw / 2, -ph / 2, pw, ph);
    c.imageSmoothingEnabled = false;
    if (t > 0.3 && t < 1.8) {  // 사진 위로 반짝 지나가는 빛
      const sx = -pw / 2 - 200 + (t - 0.3) * 1100;
      c.save();
      c.beginPath();
      c.rect(-pw / 2, -ph / 2, pw, ph);
      c.clip();
      c.fillStyle = "rgba(255,255,255,0.38)";
      c.beginPath();
      c.moveTo(sx, -ph / 2);
      c.lineTo(sx + 100, -ph / 2);
      c.lineTo(sx - 40, ph / 2);
      c.lineTo(sx - 140, ph / 2);
      c.fill();
      c.restore();
    }
    noStroke();  // 아래 이름 띠
    fill(20, 16, 40, 205);
    rect(-pw / 2, ph / 2 - 92, pw, 92);
    txt(name, -pw / 2 + 32, ph / 2 - 80, 44, { bold: true, outline: "#2a1a50", outlineW: 8 });
    txt("새로운 장소를 발견했어요!", -pw / 2 + 34, ph / 2 - 30, 18, { color: "#ffe27a" });
    txt("Space · 클릭: 넘기기", pw / 2 - 20, ph / 2 - 24, 11, { align: RIGHT, color: "rgba(255,255,255,0.7)" });
    pop();

    for (const i of times(16)) {  // 사진 둘레에서 반짝이는 별
      const r = i * 0.4 + t * 0.35, twinkle = Math.max(0, Math.sin(t * 5 + i * 2)), size = 14 + 14 * twinkle;
      c.globalAlpha = alpha * (0.35 + 0.65 * twinkle);
      c.drawImage(IMG.ui.star, W / 2 + Math.cos(r) * (pw / 2 + 46) - size / 2, H / 2 - 20 + Math.sin(r) * (ph / 2 + 40) - size / 2, size, size);
    }
    c.globalAlpha = 1;
    if (t < 0.3) {  // 처음에 하얗게 번쩍
      noStroke();
      fill(255, 255, 255, 210 * (1 - t / 0.3));
      rect(0, 0, W, H);
    }
  },

  // ---- 모드: 퀴즈 의자에 앉아 있기 (Space: 퀴즈 시작,  ↓: 일어나기)
  sit() {
    Object.assign(player, { x: (MAP.seat.x + 0.5) * T, y: MAP.seat.y * T + 8, dir: "up", moving: false, sit: true });
    mode = "seated";
    sfx("select");
  },
  // 의자 왼쪽으로 일어나요 (막혀 있으면 아래쪽, 오른쪽 순서로)
  stand() {
    const spots = [[-1, 0], [0, 1], [1, 0]];
    const free = ([dx, dy]) => !footBlocked((MAP.seat.x + dx + 0.5) * T, (MAP.seat.y + dy) * T + 27);
    const [dx, dy] = spots.find(free) || [0, 1];
    Object.assign(player, { x: (MAP.seat.x + dx + 0.5) * T, y: (MAP.seat.y + dy) * T + 27, dir: "down", sit: false });
    mode = "explore";
  },
  startQuiz() {
    if (!allDone()) {
      toast("소개를 모두 끝내야 퀴즈를 시작할 수 있어요", "lock");
      return sfx("wrong");
    }
    mode = "quiz";
    quiz = newQuiz();
    sfx("select");
  },
  seatedUpdate(dt) {
    updateWorld(dt, { x: 0, y: 0 });
    if (was("Escape") || was("ArrowDown") || was("KeyS")) this.stand();
    else if (action()) this.startQuiz();
  },
  seatedDraw() {
    const ok = allDone();
    if (button(ok ? "퀴즈 시작하기!" : "소개를 더 들어야 해요", W / 2 - 180, 570, 360, 70, { size: 28, ...(ok ? {} : GRAY) })) this.startQuiz();
    if (button("일어나기", W / 2 + 200, 584, 150, 44, { size: 20, ...BLUE })) this.stand();
    txt(ok ? "Space: 퀴즈 시작     ↓: 일어나기" : "↓: 일어나기", W / 2, 654, 11, { align: CENTER, outline: "rgba(0,0,0,0.9)", outlineW: 4 });
  },

  // ---- 모드: 퀴즈 (state: "ask" 문제 → "feedback" 정답 확인 → ... → "result" 결과)
  pick(i) {  // 답 고르기
    const q = quiz.qs[quiz.i];
    if (quiz.state !== "ask" || i < 0 || i >= q.choices.length) return;
    quiz.picked = quiz.sel = i;
    const ok = i === q.answer;
    if (ok) quiz.score++;
    sfx(ok ? "correct" : "wrong");
    quiz.results.push(ok);
    quiz.state = "feedback";
    quiz.t = 0;
  },
  next() {  // 다음 문제 (마지막이면 결과 화면)
    quiz.i++;
    quiz.picked = -1;
    quiz.sel = 0;
    quiz.t = 0;
    if (quiz.i < QUIZ.length) {
      quiz.state = "ask";
      return;
    }
    quiz.state = "result";
    quizDone = true;
    sfx("finish");
    if (best == null || quiz.score > best) best = quiz.score;  // 최고 점수 (새로고침하면 사라져요)
  },
  quizUpdate(dt) {
    quiz.t += dt;
    updateWorld(dt, { x: 0, y: 0 });
    if (quiz.state === "ask") {
      if (numberKey() >= 0) this.pick(numberKey());  // 1~4 키
      if (navKey()) {  // ↑ ↓ 로 보기 고르기
        const n = quiz.qs[quiz.i].choices.length;
        quiz.sel = (quiz.sel + navKey() + n) % n;
        sfx("click");
      }
      if (action()) this.pick(quiz.sel);  // Space 로 정하기
    } else if (quiz.state === "feedback") {
      if (quiz.t > 0.3 && (action() || click)) {
        click = null;
        this.next();
      }
    } else if (quiz.state === "result") {  // ← → (↑ ↓) 로 버튼 고르고 Space 로 누르기
      const right = was("ArrowRight") || was("ArrowDown") || was("KeyD");
      const left = was("ArrowLeft") || was("ArrowUp") || was("KeyA");
      const d = (right ? 1 : 0) - (left ? 1 : 0);
      if (d) {
        quiz.rsel = (quiz.rsel + d + 3) % 3;
        sfx("click");
      }
      if (action() && quiz.t > 0.4) this.resultAct(quiz.rsel);
    }
  },
  // 결과 화면 버튼: 0 다시 풀기 · 1 계속 둘러보기 · 2 처음으로
  resultAct(i) {
    if (i === 0) {
      quiz = newQuiz();
      sfx("select");
    } else if (i === 1) this.closeQuiz();
    else goTo("title");
  },
  // 퀴즈를 닫으면 일어나서 반장이 마무리 인사를 해요
  closeQuiz() {
    this.stand();
    quiz = null;
    cooldown.banjang = 1.5;
    const n = npcs.find((x) => x.id === SCRIPT.quiz.npc);
    if (n && SCRIPT.quiz.after) this.say(n, SCRIPT.quiz.after);
  },

  // ---- 매 프레임 그리기
  draw() {
    background("#14101f");
    drawWorld(hintGate);
    this.drawNameTags();
    this.hud();
    if (mode === "dialogue" && dlg) drawDialogue(dlg);
    if (mode === "photo" && photo) this.photoDraw();
    if (mode === "seated") this.seatedDraw();
    if (mode === "quiz") this.quizDraw();
  },
  // 이름표: NPC는 초록, 나는 노랑.  가까이 가면 [Space] 대화 / [Space] 앉기 안내
  drawNameTags() {
    for (const n of npcs) {
      const s = toScreen(n.x, n.y - 48);
      if (s.x < -60 || s.x > W + 60 || s.y < -20 || s.y > H + 20) continue;
      nameTag(n.name, s.x, s.y - 4, "#b8ffd8", "rgba(10,40,30,0.75)");
      if (n === nearNpc && mode === "explore") {
        const kx = s.x + textW(n.name, 11, true) / 2 + 18;
        const kw = keycap("Space", kx, s.y - 24);
        txt("대화", kx + kw + 6, s.y - 20, 11, { bold: true, outline: "rgba(0,0,0,0.85)" });
      }
    }
    if (nearSeat && mode === "explore") {
      const q = toScreen((MAP.seat.x + 0.5) * T, MAP.seat.y * T - 30);
      const kw = keycap("Space", q.x - 40, q.y + 4);
      nameTag("퀴즈 자리", q.x, q.y, "#ffe27a", "rgba(60,40,10,0.78)");
      txt("앉기", q.x - 40 + kw + 6, q.y + 8, 11, { bold: true, outline: "rgba(0,0,0,0.85)" });
    }
    const ps = toScreen(player.x, player.y - 48);
    nameTag(charName(player.key), ps.x, ps.y - 4, "#ffe27a", "rgba(60,40,10,0.78)");
  },

  // ---- HUD: 게임 화면 위에 항상 떠 있는 정보
  hud() {
    const zname = zone ? zone.name : "운동장";
    // 왼쪽 위: 지금 있는 장소
    panel(16, 16, textW(zname, 22, true) + 56, 42, { fill: "rgba(20,22,50,0.86)", shadow: false });
    push();
    noStroke();
    fill("#ff6a6a");
    ellipse(36, 34, 14);
    fill("#fff");
    ellipse(36, 34, 5);
    pop();
    txt(zname, 52, 38, 22, { valign: CENTER, bold: true });
    // 그 아래: 지금 할 일
    const goal = this.currentGoal();
    panel(16, 82, Math.min(640, textW(goal, 22) + 40), 42, { fill: "rgba(60,40,10,0.86)", border: "#ffd34a", shadow: false });
    txt(goal, 36, 104, 22, { valign: CENTER, color: "#ffe9a8" });

    this.hudProgress();
    this.hudMinimap();
    if (button("설정", 1110, 212, 150, 36, { size: 22, ...GRAY }) && mode === "explore") showSettings(true);
    if (tm.cameraOn && tm.motion.model) {  // 동작 인식 상태
      txt(tm.motion.dir ? `동작: ${tm.motion.label}` : "동작: 정지", 20, 134, 11, { bold: true, color: "#9ad0ff" });
    }
    this.hudTargetArrow();
    this.hudHints(zname);
  },
  // 지금 할 일 (안 끝낸 첫 구역의 목표 → 퀴즈 → 끝)
  currentGoal() {
    const next = AREAS.find((a) => !done[a]);
    if (next) return SCRIPT.objective[next];
    return quizDone ? SCRIPT.objective.done : SCRIPT.objective.quiz;
  },
  // 위쪽 가운데: 진행 바 (1~5번 정거장, 끝낸 곳은 초록 체크, 아직 가 보지 않은 곳은 이름 대신 ???)
  hudProgress() {
    const rx = W / 2 - 350, ry = 16, rw = 540;
    const xs = STOPS.map((_, i) => rx + 50 + (i * (rw - 100)) / 4);
    panel(rx, ry, rw, 56, { fill: "rgba(20,22,50,0.86)", border: "#6a66c0", r: 12, shadow: false });
    STOPS.forEach(([id, label], i) => {
      const ok = id === "classroom" ? quizDone : done[id];
      const here = zone?.id === id;
      push();
      if (i < STOPS.length - 1) {  // 다음 정거장까지 선
        stroke(done[id] ? "#4fd17a" : "#4a4a78");
        strokeWeight(5);
        line(xs[i] + 14, ry + 22, xs[i + 1] - 14, ry + 22);
      }
      stroke(here ? "#ffe27a" : "#2a2a50");
      strokeWeight(here ? 4 : 3);
      fill(ok ? "#4fd17a" : "#3a3a68");
      ellipse(xs[i], ry + 22, 24);
      pop();
      if (ok) drawingContext.drawImage(IMG.ui.check, xs[i] - 8, ry + 14, 16, 16);
      else txt(i + 1, xs[i], ry + 23, 11, { align: CENTER, valign: CENTER, bold: true, color: "#c9c6ff" });
      const known = seen[id] || ok;  // 한 번이라도 가 본 곳만 이름이 보여요
      txt(known ? label : "???", xs[i], ry + 40, 11, { align: CENTER, bold: here, color: here ? "#ffe27a" : known ? "#d8d4ff" : "#8a86b8" });
    });
  },
  // 오른쪽 위: 미니맵 (흰 네모 = 지금 화면, 노란 점 = 나, 빨강/초록 점 = 안내 NPC, 주황 = 반장)
  hudMinimap() {
    const mx = W - mini.width - 22, my = 18, k = mini.width / (MAP.w * T);
    panel(mx - 6, my - 6, mini.width + 12, mini.height + 12, { fill: "rgba(20,22,50,0.9)", border: "#6a66c0", bw: 3, r: 8, shadow: false });
    drawingContext.imageSmoothingEnabled = true;
    drawingContext.drawImage(mini, mx, my);
    drawingContext.imageSmoothingEnabled = false;
    push();
    noFill();
    stroke(255, 255, 255, 140);
    strokeWeight(1);
    rect(mx + cam.x * k, my + cam.y * k, VW * k, VH * k);
    noStroke();
    for (const n of npcs) {
      if (n.role === "chat") continue;
      fill(n.role === "quiz" ? "#ffb21f" : done[n.area] ? "#4fd17a" : "#ff6a6a");
      rect(mx + n.x * k - 2, my + n.y * k - 2, 4, 4);
    }
    fill("#ffe27a");
    stroke("#2a1a50");
    ellipse(mx + player.x * k, my + player.y * k, 7);
    pop();
  },
  // 다음에 만날 NPC가 화면 밖이면 화면 가장자리에 방향 화살표
  hudTargetArrow() {
    if (mode !== "explore") return;
    const nextArea = AREAS.find((a) => !done[a]);
    const targetId = nextArea ? SCRIPT.areas[nextArea].npc : !quizDone && SCRIPT.quiz.npc;
    const target = targetId && npcs.find((n) => n.id === targetId);
    if (!target) return;
    const s = toScreen(target.x, target.y - 20);
    const onScreen = s.x > 60 && s.x < W - 60 && s.y > 130 && s.y < H - 60;
    if (onScreen) return;
    const a = Math.atan2(s.y - H / 2, s.x - W / 2);
    const ex = constrain(W / 2 + Math.cos(a) * 900, 60, W - 60), ey = constrain(H / 2 + Math.sin(a) * 900, 140, H - 60);
    push();
    translate(ex, ey);
    rotate(a);
    stroke("#7a4a10");
    strokeWeight(4);
    fill("#ffe14a");
    triangle(24, 0, -14, -18, -14, 18);
    pop();
    txt(target.name, ex, ey + 30, 11, { align: CENTER, bold: true, color: "#ffe14a", outline: "rgba(0,0,0,0.85)", outlineW: 4 });
  },
  // 아래쪽 안내 글, 시험 모드 표시, 새 장소 이름
  hudHints(zname) {
    if (mode !== "explore") return;
    const shadow = { outline: "rgba(0,0,0,0.9)", outlineW: 4 };
    if (keyEvents === 0 && clock > 3) {  // 키보드 입력이 없을 때
      txt("키보드가 안 되면 화면을 한 번 클릭하세요  ·  마우스를 누르고 있으면 그쪽으로 걸어가요", W / 2, 690, 11, { align: CENTER, color: "#ffe27a", ...shadow });
    } else if (clock < 14) {  // 처음 14초 동안 조작 힌트
      txt("방향키 이동  ·  Space 대화", W / 2, 690, 11, { align: CENTER, ...shadow });
    }
    if (testMode()) {
      txt(fastWalk() ? "시험 모드  >> 빠르게 걷는 중" : "시험 모드  ·  Shift 를 누르고 걸으면 빨라요", 20, 690, 11, { color: "#9affc0", ...shadow });
    }
    if (walkHold && mouseIsPressed) {  // 마우스로 누르고 있는 곳
      push();
      noFill();
      stroke(255, 255, 255, 200);
      strokeWeight(3);
      circle(mouseX, mouseY, 28 + Math.sin(clock * 10) * 5);
      pop();
    }
    if (zoneT < 2.4) {  // 새 장소에 들어서면 이름을 크게
      push();
      drawingContext.globalAlpha = Math.max(0, Math.min(1, zoneT / 0.3, (2.4 - zoneT) / 0.5));
      txt(zname, W / 2, 170, 40, { align: CENTER, bold: true, outline: "#2a1a50", outlineW: 8 });
      pop();
    }
  },

  // ---- 퀴즈 창 (정답은 초록, 내가 고른 오답은 빨강)
  quizDraw() {
    dim(0.55);
    const [x, y, w, h] = [110, 36, 1060, 648], Q = quiz, q = Q.qs[Q.i];
    panel(x, y, w, h, { fill: "rgba(24,26,58,0.98)", border: "#ffe27a", r: 18 });
    if (Q.state === "result") return this.resultDraw(x, y, w, h);

    txt(`퀴즈 ${Q.i + 1} / ${QUIZ.length}`, x + 40, y + 28, 22, { bold: true, color: "#ffe27a" });
    QUIZ.forEach((_, i) => {  // 오른쪽 위 진행 점 (맞음 초록, 틀림 빨강, 지금 노랑)
      let col = "#3a3a68";
      if (i < Q.results.length) col = Q.results[i] ? "#4fd17a" : "#ff6a6a";
      else if (i === Q.i) col = "#ffe27a";
      push();
      stroke("#2a2a50");
      strokeWeight(3);
      fill(col);
      ellipse(x + w - 60 - (QUIZ.length - 1 - i) * 30, y + 40, 20);
      pop();
    });

    const qLines = wrapText(q.q, w - 100, 30, true);
    qLines.forEach((l, i) => txt(l, x + 50, y + 76 + i * 42, 30, { bold: true }));
    q.choices.forEach((choice, i) => {
      const by = y + 96 + qLines.length * 42 + i * 74;
      const on = hover(x + 50, by, w - 100, 62) && Q.state === "ask";
      const [fillC, border] = this.choiceColors(i, on);
      const isAnswer = Q.state === "feedback" && i === q.answer;
      panel(x + 50, by, w - 100, 62, { fill: fillC, border, r: 12, bw: 3, shadow: false });
      push();
      noStroke();
      fill(isAnswer ? "#4fd17a" : "#ffe27a");
      ellipse(x + 92, by + 31, 40);
      pop();
      txt(i + 1, x + 92, by + 32, 22, { align: CENTER, valign: CENTER, bold: true, color: "#3a2a08" });
      txt(choice, x + 130, by + 32, 22, { valign: CENTER });
      if (isAnswer) txt("정답!", x + w - 80, by + 32, 22, { align: RIGHT, valign: CENTER, bold: true, color: "#b8ffd0" });
      if (on) {  // 클릭해서 고르기
        cursor("pointer");
        if (clicked(x + 50, by, w - 100, 62)) this.pick(i);
      }
    });

    if (Q.state === "ask") {
      txt("↑ ↓ 로 고르고 Space 로 정해요", x + w / 2, y + h - 34, 11, { align: CENTER, color: "rgba(255,255,255,0.6)" });
      return;
    }
    // 정답 확인: 맞았나, 해설, [다음 문제] 버튼
    const ok = Q.results[Q.results.length - 1], fy = y + h - 108;
    txt(ok ? "정답이에요!" : "아쉬워요! 다시 기억해 봐요", x + 50, fy, 30, { bold: true, color: ok ? "#8affb0" : "#ffb0b8" });
    wrapText(q.explain || "", w - 360, 22).slice(0, 2).forEach((l, i) => txt(l, x + 50, fy + 44 + i * 30, 22, { color: "#e8e4ff" }));
    const last = Q.i === QUIZ.length - 1;
    if (button(last ? "결과 보기" : "다음 문제", x + w - 250, fy + 6, 200, 60, { size: 24, focus: true }) && Q.t > 0.3) this.next();
    txt("Space", x + w - 150, fy + 76, 11, { align: CENTER, color: "rgba(255,255,255,0.6)" });
  },
  // 보기 칸 색: [채우기, 테두리]
  choiceColors(i, hovered) {
    const Q = quiz, q = Q.qs[Q.i];
    if (Q.state === "feedback") {
      if (i === q.answer) return ["rgba(40,120,70,0.95)", "#8affb0"];   // 정답
      if (i === Q.picked) return ["rgba(150,50,60,0.95)", "#ff9aa8"];   // 내가 고른 오답
      return ["rgba(40,42,80,0.7)", "#3a3a68"];
    }
    if (hovered || Q.sel === i) return ["rgba(110,100,190,0.95)", "#ffe27a"];  // 고르고 있는 보기
    return ["rgba(60,62,120,0.9)", "#6a66c0"];
  },
  // 결과 화면: 점수, 별, 응원 문구, 버튼 3개
  resultDraw(x, y, w, h) {
    const ratio = quiz.score / QUIZ.length;
    const stars = ratio >= 1 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;  // 만점 3개, 60% 이상 2개, 하나라도 맞히면 1개
    txt("퀴즈 결과", x + w / 2, y + 36, 36, { align: CENTER, bold: true, color: "#ffe27a" });
    txt(`${quiz.score} / ${QUIZ.length}`, x + w / 2, y + 120, 96, { align: CENTER, bold: true, outline: "#2a1a50", outlineW: 10 });
    for (const i of times(3)) {
      const lit = i < stars;
      drawingContext.globalAlpha = lit ? 1 : 0.25;
      drawingContext.drawImage(IMG.ui.star, x + w / 2 - 152 + i * 80, y + 238 + (lit ? Math.sin(clock * 4 + i) * 4 : 0), 64, 64);
    }
    drawingContext.globalAlpha = 1;
    // 응원 문구 (바꿔도 돼요)
    const cheer = ratio >= 1 ? "만점이에요! 우리 학교 박사님이네요!" : ratio >= 0.6 ? "잘했어요! 우리 학교를 잘 알고 있어요." : "소개를 다시 한 번 들어 보고 도전해 봐요!";
    txt(cheer, x + w / 2, y + 340, 30, { align: CENTER, bold: true });
    if (best != null) txt(`내 최고 점수  ${best} / ${QUIZ.length}`, x + w / 2, y + 400, 22, { align: CENTER, color: "#ffe27a" });

    const by = y + h - 130;
    const buttons = [["다시 풀기", {}], ["계속 둘러보기", BLUE], ["처음으로", PINK]];
    buttons.forEach(([label, colors], i) => {
      if (!quiz || quiz.state !== "result") return;  // 앞 버튼을 눌러서 결과 화면이 끝났으면 그만
      if (button(label, x + 90 + i * 305, by, 270, 70, { size: 26, ...colors, focus: quiz.rsel === i })) this.resultAct(i);
    });
    txt("← → 로 고르고 Space 로 눌러요", x + w / 2, by + 92, 11, { align: CENTER, color: "rgba(255,255,255,0.6)" });
  },
};

window.MAEHOL_GAME = true;
