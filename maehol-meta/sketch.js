// noprotect
// =====================================================================
//  sketch.js  —  메타 투어 매홀 게임 코드 전부 (p5.js)
//
//  p5.js 는 setup() 을 한 번, draw() 를 1초에 약 60번 자동으로 불러줘요.
//  이 파일의 차례:
//    1. 준비      : 크기, 진행 상황, 그림 불러오기
//    2. 입력·소리 : 키보드, 마우스, 효과음
//    3. 꾸미기 도구: 글씨, 상자, 버튼, 대화창, 알림
//    4. 월드      : 맵, 충돌(벽에 막히기), 잠긴 문, 카메라, 그리기
//    5. 티처블 머신: 얼굴 인식(캐릭터 선택), 동작 인식(이동)
//    6. 화면들    : 시작 → 캐릭터 선택 → 게임(대화, 퀴즈)
//    7. p5 시작점 : setup(), draw()
//
//  파일은 모두 폴더 없이 한곳에 있어요:
//    index.html (화면 틀) · sketch.js (이 파일, 게임 코드) · content.js (★ 직접 고치는 설정·대사·퀴즈)
//    data.js (맵 데이터 + 글꼴, 자동으로 만들어져요) · 그림 묶음 png 한 장 (모든 그림이 들어 있어요)
//    ※ data.js 와 png 가 없으면 인터넷(GitHub)에서 대신 가져와서 실행해요. (아래 '파일 불러오기')
//  ※ p5.js 이름(text, rect, select, dist 등)과 겹치지 않게 이름을 지었어요.
// =====================================================================


// =====================================================================
//  1. 준비
// =====================================================================
const [W, H, Z, T] = [1280, 720, 2, 32];   // 화면 가로·세로, 맵 확대 배율, 타일(한 칸) 크기(픽셀)
const VW = W / Z, VH = H / Z;                // 화면에 보이는 맵의 크기(확대 전)
const times = (n) => [...Array(n).keys()];     // times(3) → [0, 1, 2]  (반복할 때 써요. for(;;) · while 은 p5 웹 에디터의 반복문 보호 기능과 충돌해서 쓰지 않아요)
let MAP, LIST, SCRIPT, QUIZ;   // 맵 데이터, 그림 위치 목록(data.js), 대사, 퀴즈(content.js) — 바로 아래 파일 불러오기 코드가 채워 줘요
const FONT = "Galmuri11";

const AREAS = ["playground", "cafeteria", "gym", "library"];   // 소개를 들어야 하는 구역 (이 순서대로)
const STOPS = [["playground", "운동장"], ["cafeteria", "급식실"], ["gym", "체육관"], ["library", "도서관"], ["classroom", "교실"]];
const CHARS = [   // 내가 고를 수 있는 캐릭터 (key = 캐릭터 그림의 이름)
  { key: "donghun", name: "동훈", desc: "까만 머리의 씩씩한 친구" },
  { key: "minseong", name: "민성", desc: "동그란 안경이 잘 어울려요" },
  { key: "seongmin", name: "성민", desc: "모자가 멋진 유쾌한 친구" },
];
const charName = (key) => (CHARS.find((c) => c.key === key) || { name: "나" }).name;

let scene = "boot", clock = 0;                    // 지금 화면, 화면이 켜진 뒤 흐른 시간(초)
let charKey = "donghun";                          // 내가 고른 캐릭터
let done = {}, quizDone = false, best = null;     // 소개를 끝낸 구역, 퀴즈를 풀었는지, 최고 점수
try { best = parseInt(localStorage.getItem("maehol_best")) || null; } catch (e) {}

// ---- 파일 불러오기: 파일이 안 불러와질 때(예: p5 웹 에디터에서 큰 파일이 올라가지 못했을 때)를 대비해서,
//      같은 파일을 인터넷(GitHub 에 올려 둔 것)에서 대신 가져와요. 고친 내용을 쓰고 싶으면 내 파일이 제대로 올라가 있어야 해요.
//      ※ 따옴표 친 파일 이름(content.js, data.js, art.png)은 이 파일 안에서 딱 한 번씩만 써야 해요. p5 웹 에디터가 올린 파일의 긴 주소로 바꿔 버리기 때문이에요.
//        그래서 인터넷에서 가져올 때 쓰는 이름(name)은 글자를 이어 붙여서(join) 만들었어요.
const SHA = "6f84d40c1231aeff34526c2bb23402db58224b38";   // 인터넷에 올려 둔 파일 버전(커밋 번호)
const ONLINE = [`https://raw.githubusercontent.com/MinsungKim805/Claude-projects/${SHA}/maehol-meta/`, `https://cdn.jsdelivr.net/gh/MinsungKim805/Claude-projects@${SHA}/maehol-meta/`];
const FILES = [   // src = 내 파일(에디터가 주소로 바꿔 줘요), name = 인터넷에서 가져올 때 쓰는 이름, key = 파일이 만들어 주는 이름
  { src: "content.js", name: ["content", "js"].join("."), key: "MAEHOL_QUIZ", what: "설정·대사·퀴즈" },
  { src: "data.js", name: ["data", "js"].join("."), key: "MAEHOL_MAP", what: "맵 데이터·글꼴" },
];
const ART = { src: "art.png", name: ["art", "png"].join("."), what: "그림 묶음" };
const loadState = {}, tried = {};   // loadState: 파일 → "내 파일" / "인터넷" / "없음",  tried: 파일 → 실패한 이유 목록(실패 화면에 보여 줘요)
const hostOf = (u) => { try { return new URL(u, document.baseURI).host; } catch (e) { return "?"; } };
const note = (f, u, why) => (tried[f.name] = tried[f.name] || []).push(`${hostOf(u)} ${why}`);

function addScript(src, text) {   // script 태그를 만들어서 실행해요 (text 가 있으면 그 글자를 바로 실행)
  return new Promise((ok) => {
    const el = document.createElement("script");
    if (text != null) { el.text = text; document.head.appendChild(el); return ok(true); }
    el.onload = () => ok(true); el.onerror = () => ok(false); el.src = src; document.head.appendChild(el);
  });
}
async function getScript(src, f) {   // 파일을 글자로 읽어서 실행해요. 안 되면(주소가 http 로 시작할 때만) script 태그로 한 번 더 시도해요
  try {
    const r = await fetch(src);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const t = await r.text();
    if (t.trimStart()[0] === "<") throw new Error("파일 대신 웹페이지가 왔어요");
    return addScript(null, t);
  } catch (e) { note(f, src, String(e.message || e).slice(0, 40)); }
  if (/^https?:/.test(src) && !(await addScript(src))) note(f, src, "script 태그로도 실패");
}
async function loadFile(f) {
  if (window[f.key]) return "내 파일";               // index.html 이 이미 불러왔어요
  await getScript(f.src, f);
  if (window[f.key]) return "내 파일";
  for (const base of ONLINE) { await getScript(base + f.name, f); if (window[f.key]) return "인터넷"; }
  return "없음";
}

// ---- 그림 불러오기: 모든 그림은 png 한 장에 묶여 있어요. 불러온 뒤 조각조각 잘라서 써요.
//      IMG.obj["desk"] = 책상 그림, IMG.spr["donghun"] = 동훈 시트, IMG.ui["star"] = 별, IMG.bg = 맵 배경, IMG.title = 시작 화면
const IMG = { obj: {}, spr: {}, ui: {}, bg: null, title: null };
const loadSheet = (src) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => { note(ART, src, "그림 불러오기 실패"); ok(null); }; im.src = src; });
async function loadImages() {
  let sheet = await loadSheet(ART.src), from = "내 파일";
  for (const base of ONLINE) if (!sheet) { sheet = await loadSheet(base + ART.name); from = "인터넷"; }
  loadState[ART.name] = sheet ? from : "없음";
  if (!sheet || !LIST) return;
  for (const name in LIST.rects) {
    const [x, y, w, h] = LIST.rects[name], cut = Object.assign(document.createElement("canvas"), { width: w, height: h });
    cut.getContext("2d").drawImage(sheet, x, y, w, h, 0, 0, w, h);
    const [kind, key] = name.split(":");   // 이름 앞에 spr: ui: img: 가 붙어 있으면 종류를 나타내요
    if (kind === "img") IMG[key] = cut;
    else (kind === "spr" ? IMG.spr : kind === "ui" ? IMG.ui : IMG.obj)[key || name] = cut;
  }
}

// 캐릭터 시트에서 한 장면을 오려서 그려요. 시트는 가로 3프레임(서기, 왼발, 오른발) x 세로 4방향이고,
// 칸 하나는 30x46 픽셀이에요. s = 확대 배율, crop = 일부만 오릴 때 [x, y, 가로, 세로]
const ROW = { down: 0, left: 1, right: 2, up: 3 };
function sprite(key, dir, frame, x, y, s = 1, crop = [0, 0, 30, 46]) {
  const im = IMG.spr[key];
  if (im) drawingContext.drawImage(im, frame * 30 + crop[0], ROW[dir] * 46 + crop[1], crop[2], crop[3], Math.round(x), Math.round(y), crop[2] * s, crop[3] * s);
}


// =====================================================================
//  2. 입력과 소리
// =====================================================================
let keys = {}, pressed = {}, click = null;        // 누르는 중인 키, 이번 프레임에 눌린 키, 이번 프레임의 클릭 위치
let motion = { dir: null, action: false, nav: 0 };   // 티처블 머신 동작 인식 결과
// 키는 "KeyW" 같은 "자판 위치 이름"으로 확인해서, 한글 입력 상태(한/영)여도 WASD가 잘 먹어요.
const KEY_BY_NUMBER = { 87: "KeyW", 65: "KeyA", 83: "KeyS", 68: "KeyD", 69: "KeyE", 77: "KeyM", 32: "Space", 13: "Enter", 27: "Escape", 37: "ArrowLeft", 38: "ArrowUp", 39: "ArrowRight", 40: "ArrowDown" };
const KEY_BY_JAMO = { ㅈ: "KeyW", ㅉ: "KeyW", ㅁ: "KeyA", ㄴ: "KeyS", ㅇ: "KeyD", ㄷ: "KeyE", ㄸ: "KeyE", ㅡ: "KeyM" };   // 한글 자판으로 눌러도 같은 키
let keyEvents = 0;                                  // 키보드 입력이 한 번이라도 들어왔는지 (안 들어오면 화면에 안내해요)
function keyId(e) {
  if (e.code && e.code !== "Unidentified") return e.code;           // 보통은 이걸로 충분해요
  if (KEY_BY_JAMO[e.key]) return KEY_BY_JAMO[e.key];                  // code 가 없는 입력기(일부 태블릿·크롬북)
  if (/^[0-9]$/.test(e.key)) return "Digit" + e.key;
  if (/^[a-z]$/i.test(e.key)) return "Key" + e.key.toUpperCase();
  return KEY_BY_NUMBER[e.keyCode] || e.key;
}
addEventListener("keydown", (e) => {
  const id = keyId(e);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(id)) e.preventDefault();   // 페이지가 스크롤되지 않게
  if (!e.repeat) pressed[id] = true;
  keys[id] = true;
  keyEvents++;
  startAudio();
});
addEventListener("keyup", (e) => (keys[keyId(e)] = false));
addEventListener("blur", () => (keys = {}));
// 웹 에디터처럼 게임이 작은 창(iframe) 안에 있으면, 클릭해 주어야 키보드가 게임으로 들어와요. 클릭할 때마다 게임 창에 키보드를 맞춰 줘요.
function focusGame() { try { window.focus(); document.querySelector("canvas")?.focus({ preventScroll: true }); } catch (e) {} }
const down = (code) => keys[code];      // 지금 누르고 있나?
const was = (code) => pressed[code];    // 이번 프레임에 막 눌렀나?
const action = () => was("Space") || was("Enter") || was("KeyE") || motion.action;   // "확인" 키
// 이동 방향 {x, y} (각각 -1, 0, 1). WASD/방향키가 우선이고, 아무것도 안 누르면 동작 인식을 써요.
let walkHold = false;     // 마우스(손가락)를 누른 채 걷는 중인가
function moveVec() {
  let x = (down("KeyD") || down("ArrowRight") ? 1 : 0) - (down("KeyA") || down("ArrowLeft") ? 1 : 0);
  let y = (down("KeyS") || down("ArrowDown") ? 1 : 0) - (down("KeyW") || down("ArrowUp") ? 1 : 0);
  if (!x && !y && walkHold && mouseIsPressed) {   // 키보드가 안 될 때: 화면을 누르고 있으면 그쪽으로 걸어요
    const p = toScreen(player.x, player.y - 20), dx = mouseX - p.x, dy = mouseY - p.y, len = Math.hypot(dx, dy);
    if (len > 24) return { x: dx / len, y: dy / len };
  }
  if (!x && !y && motion.dir) { x = { left: -1, right: 1 }[motion.dir] || 0; y = { up: -1, down: 1 }[motion.dir] || 0; }
  return { x, y };
}
const numberKey = () => times(9).find((i) => was("Digit" + (i + 1)) || was("Numpad" + (i + 1))) ?? -1;   // 1~9 키 → 0~8
const navKey = () => (was("ArrowUp") || was("KeyW") ? -1 : was("ArrowDown") || was("KeyS") ? 1 : motion.nav);                    // 메뉴 위/아래

// ---- 효과음: [높이(Hz), 길이(초), 파형, 크기] 를 순서대로 "삑삑" 내요. 숫자를 바꾸면 소리가 달라져요.
let audio = null, muted = false;
function startAudio() {   // 브라우저는 첫 입력 뒤에야 소리를 허락해요
  if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  else if (audio.state === "suspended") audio.resume();
}
const SOUNDS = {
  blip: [[700, 0.04, "square", 0.025]], click: [[440, 0.05]], select: [[520, 0.07], [780, 0.09]], wrong: [[220, 0.25, "sawtooth"]],
  open: [[523, 0.12, "triangle"], [659, 0.12, "triangle"], [784, 0.12, "triangle"], [1047, 0.12, "triangle"]],
  correct: [[659, 0.14, "triangle"], [880, 0.14, "triangle"]],
  finish: [[523, 0.16, "triangle"], [659, 0.16, "triangle"], [784, 0.16, "triangle"], [1047, 0.16, "triangle"], [1319, 0.16, "triangle"]],
};
function sfx(name) {
  if (muted || !audio) return;
  SOUNDS[name].forEach(([freq, len, type = "square", vol = 0.05], i) => {
    const t0 = audio.currentTime + i * 0.09, osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + len + 0.02);
  });
}


// =====================================================================
//  3. 화면 꾸미기 도구 (p5.js 로 그려요)
// =====================================================================
// 글씨 쓰기. o = { align, valign, bold, color, outline } 옵션
function txt(s, x, y, size, o = {}) {
  push();
  textFont(FONT); textSize(size); textStyle(o.bold ? BOLD : NORMAL); textAlign(o.align || LEFT, o.valign || TOP);
  if (o.outline) { stroke(o.outline); strokeWeight(o.outlineW || 3); strokeJoin(ROUND); } else noStroke();
  fill(o.color || "#fff");
  text(String(s), Math.round(x), Math.round(y));
  pop();
}
function textW(s, size, bold) { push(); textFont(FONT); textSize(size); textStyle(bold ? BOLD : NORMAL); const w = textWidth(s); pop(); return w; }
// 긴 글을 maxW 너비에 맞게 여러 줄로 나눠요 (글자 단위로 자르기)
function wrapText(s, maxW, size, bold) {
  const lines = [];
  for (const para of String(s).split("\n")) {
    let cur = "";
    for (const ch of para) { if (textW(cur + ch, size, bold) > maxW) { lines.push(cur); cur = ""; } cur += ch; }
    lines.push(cur);
  }
  return lines;
}
// 둥근 상자. o = { fill, border, r(둥글기), bw(테두리 굵기), shadow }
function panel(x, y, w, h, o = {}) {
  push();
  if (o.shadow !== false) { noStroke(); fill(0, 0, 0, 70); rect(x + 4, y + 6, w, h, o.r ?? 10); }
  fill(o.fill || "rgba(22,24,52,0.94)"); stroke(o.border || "#8f94ff"); strokeWeight(o.bw ?? 4);
  rect(x, y, w, h, o.r ?? 10);
  pop();
}
const dim = (a) => { push(); noStroke(); fill(8, 6, 20, 255 * a); rect(0, 0, W, H); pop(); };   // 화면 어둡게
const hover = (x, y, w, h) => mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
// 이번 프레임의 클릭이 사각형 안이면 true (클릭은 "써 버려서" 한 번만 처리돼요)
function clicked(x, y, w, h) {
  if (click && click.x >= x && click.x <= x + w && click.y >= y && click.y <= y + h) { click = null; return true; }
  return false;
}
// 버튼을 그리고 눌렸으면 true.   사용 예)  if (button("시작", 100, 100, 200, 60)) { ... }
const BLUE = { fill: "#9ad0ff", hoverFill: "#c6e6ff", border: "#1f4a7a", color: "#12304f" };
const PINK = { fill: "#ff9aa8", hoverFill: "#ffc4cc", border: "#7a1f2f", color: "#4f1220" };
const GRAY = { fill: "#c9c6ff", hoverFill: "#e4e2ff", border: "#3a3670", color: "#26225a" };
function button(label, x, y, w, h, o = {}) {
  const on = hover(x, y, w, h), lift = on ? -2 : 0;
  push();
  noStroke(); fill(0, 0, 0, 80); rect(x + 3, y + 5, w, h, 10);
  fill(on ? o.hoverFill || "#ffe680" : o.fill || "#ffd34a"); stroke(o.border || "#7a4a10"); strokeWeight(4);
  rect(x, y + lift, w, h, 10);
  pop();
  txt(label, x + w / 2, y + h / 2 + lift + 1, o.size || 22, { align: CENTER, valign: CENTER, bold: true, color: o.color || "#5a2a08" });
  if (on) cursor("pointer");
  if (on && click) { click = null; sfx("click"); return true; }
  return false;
}
// 캐릭터 머리 위 이름표 (ZEP처럼)
function nameTag(name, sx, sy, color, bg) {
  const w = Math.ceil(textW(name, 11, true)) + 14;
  push(); noStroke(); fill(bg); rect(Math.round(sx - w / 2), Math.round(sy - 18), w, 18, 9); pop();
  txt(name, sx, sy - 8, 11, { align: CENTER, valign: CENTER, bold: true, color });
}
function keycap(label, x, y) {   // [Space] 같은 키 모양. 가로 길이를 돌려줘요
  const w = Math.max(26, textW(label, 11, true) + 14);
  panel(x, y, w, 22, { fill: "#f4f1ff", border: "#5a56a0", bw: 2, r: 5, shadow: false });
  txt(label, x + w / 2, y + 12, 11, { align: CENTER, valign: CENTER, bold: true, color: "#3a3670" });
  return w;
}
// 위쪽에 잠깐 떴다 사라지는 알림.  toast("문이 열렸어요!", "check")  (두 번째는 아이콘 이름)
let toasts = [];
const toast = (msg, icon) => { toasts.push({ msg, icon, age: 0 }); if (toasts.length > 3) toasts.shift(); };
function drawToasts(dt) {
  toasts.forEach((t) => (t.age += dt));
  toasts = toasts.filter((t) => t.age < 3.6);
  toasts.forEach((t, i) => {
    const w = Math.max(260, textW(t.msg, 22, true) + 70), x = W / 2 - w / 2, y = 96 + i * 62;
    push();
    drawingContext.globalAlpha = Math.max(0, Math.min(1, t.age / 0.2, (3.6 - t.age) / 0.4));   // 서서히 나타나고 사라져요
    panel(x, y, w, 52, { fill: "rgba(30,28,70,0.95)", border: "#ffd34a", r: 14 });
    const im = IMG.ui[t.icon];
    if (im) drawingContext.drawImage(im, x + 16, y + 26 - im.height, im.width * 2, im.height * 2);
    txt(t.msg, x + (im ? 50 : 0) + (w - (im ? 50 : 0)) / 2, y + 27, 22, { align: CENTER, valign: CENTER, bold: true });
    pop();
  });
}
// 대화창 (NPC가 말할 때 아래쪽에 나와요). d = { npc, lines, idx, shown(보여준 글자 수), done }
function drawDialogue(d) {
  const [x, y, w, h] = [90, 500, 1100, 196], name = d.npc.name, nameW = Math.max(120, textW(name, 22, true) + 44);
  panel(x, y, w, h, { fill: "rgba(20,22,50,0.95)", border: "#ffe27a", r: 14 });
  panel(x + 28, y - 22, nameW, 40, { fill: "#ffd34a", border: "#7a4a10", shadow: false });
  txt(name, x + 28 + nameW / 2, y - 2, 22, { align: CENTER, valign: CENTER, bold: true, color: "#5a2a08" });
  panel(x + 28, y + 30, 132, 132, { fill: "#e8e4ff", r: 12, shadow: false });
  drawingContext.imageSmoothingEnabled = false;
  sprite(d.npc.key, "down", 0, x + 28 + 14, y + 30 + 6, 4, [2, 0, 26, 30]);       // 얼굴: 캐릭터 시트의 머리 부분을 4배 확대
  let left = Math.floor(d.shown), ly = y + 36;                                       // 글씨는 한 글자씩 나타나요
  for (const line of wrapText(d.lines[d.idx], w - 230, 22)) {
    if (left <= 0) break;
    txt(line.slice(0, left), x + 190, ly, 22);
    left -= line.length;
    ly += 36;
  }
  if (d.done) {   // 다 나왔으면 깜빡이는 ▼
    push(); noStroke(); fill(255, 226, 122, 255 * (0.5 + 0.5 * Math.sin(clock * 6))); triangle(x + w - 60, y + h - 44, x + w - 36, y + h - 44, x + w - 48, y + h - 28); pop();
    txt("Space / 클릭", x + w - 40, y + h - 28, 11, { align: RIGHT, color: "rgba(255,255,255,0.6)" });
  }
}
// 설정 창: 조작 방법과 티처블 머신 연결 상태
let settingsOpen = false, settingsInGame = false, settingsFrame = 0;
const showSettings = (inGame) => { settingsOpen = true; settingsInGame = inGame; settingsFrame = frameCount; };
function drawSettings() {
  if (!settingsOpen) return;
  if (was("Escape") && frameCount !== settingsFrame) { settingsOpen = false; return; }   // Esc 로 닫기 (연 바로 그 프레임은 제외)
  dim(0.6);
  const [x, y, w, h] = [240, 70, 800, 580];
  panel(x, y, w, h, { fill: "rgba(24,26,58,0.98)", border: "#ffe27a", r: 16 });
  txt("설정 / 조작 방법", x + w / 2, y + 22, 30, { align: CENTER, bold: true, color: "#ffe27a" });
  const rows = [["이동", "W A S D  또는  방향키"], ["대화 / 선택", "Space · Enter · E  또는  마우스 클릭"], ["퀴즈 답 고르기", "1 2 3 4  또는  ↑ ↓ + Space  또는  클릭"], ["소리 켜기/끄기", "M"], ["이 창 열기/닫기", "Esc"]];
  rows.forEach(([a, b], i) => { txt(a, x + 50, y + 82 + i * 42, 22, { bold: true, color: "#9ad0ff" }); txt(b, x + 290, y + 82 + i * 42, 22); });
  txt("티처블 머신", x + 50, y + 312, 24, { bold: true, color: "#ffe27a" });
  [["얼굴 인식 (캐릭터 선택)", tmFaceUrl(), tm.face], ["동작 인식 (캐릭터 이동)", tmMotionUrl(), tm.motion]].forEach(([name, url, r], i) => {
    const [text, color] = !url ? ["링크가 비어 있어요 (키보드/마우스 사용)", "#b8b8d8"] : tm.error ? ["카메라 오류: " + tm.error, "#ff9a9a"] : r.status.startsWith("준비됨") ? ["연결됨", "#8affb0"] : [r.status === "off" ? "아직 시작하지 않았어요" : r.status, "#ffe27a"];
    txt(name, x + 50, y + 352 + i * 38, 22);
    txt(text, x + 400, y + 352 + i * 38, 22, { color });
  });
  txt("링크는 content.js 맨 위에 붙여 넣어요.", x + 50, y + 432, 11, { color: "rgba(255,255,255,0.65)" });
  const by = y + h - 84;
  if (button("닫기", x + 60, by, 200, 56, { size: 24 })) settingsOpen = false;
  if (button(muted ? "소리 켜기" : "소리 끄기", x + 290, by, 200, 56, BLUE)) muted = !muted;
  if (settingsInGame && button("처음으로", x + 520, by, 220, 56, PINK)) { settingsOpen = false; goTo("title"); }
}


// =====================================================================
//  4. 월드: 맵, 충돌, 잠긴 문, 카메라, 그리기
//     좌표는 모두 "픽셀"이에요. 캐릭터의 x, y 는 발 위치예요.
// =====================================================================
let grid, gates, npcs, objs, decor, player, cam, sparks = [];

function initWorld() {
  grid = MAP.collision.map((row) => [...row].map((c) => c === "1"));      // 칸마다 true(벽) / false(걸을 수 있음)
  gates = MAP.gates.map((g) => ({ ...g, open: false, tiles: Array.from({ length: g.size }, (_, i) => (g.o === "v" ? [g.x, g.y + i] : [g.x + i, g.y])) }));
  npcs = MAP.npcs.map((n) => ({ key: n.spr, name: n.name, id: n.id, area: n.area, role: n.role, tx: n.x, ty: n.y, x: (n.x + 0.5) * T, y: n.y * T + 27, dir: n.dir, home: n.dir }));
  // 가구: 그릴 위치와 "앞뒤 순서(sort)"를 미리 계산해 둬요. 아래쪽에 있는 것일수록 나중에(앞에) 그려요.
  objs = MAP.objects.map((o) => {
    const i = LIST.objects[o.n];
    return { n: o.n, x: o.x * T, y: (o.y + i.d) * T - i.ph + i.pad, sort: (o.y + i.d) * T, w: i.pw, h: i.ph };
  }).sort((a, b) => a.sort - b.sort);
  decor = MAP.decor.map((d) => ({ n: d.n, x: d.x, y: d.y, w: LIST.objects[d.n].pw, h: LIST.objects[d.n].ph }));   // 벽 장식
  player = { key: charKey, x: 0, y: 0, dir: "down", moving: false, anim: 0 };
  resetWorld();
}
function resetWorld() {   // 새 게임: 처음 상태로
  gates.forEach((g) => (g.open = false));
  Object.assign(player, { key: charKey, x: (MAP.spawn.x + 0.5) * T, y: MAP.spawn.y * T + 27, dir: "down", moving: false });
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
    for (const i of times(36)) {   // 반짝이는 불꽃 36개
      const a = Math.random() * 6.28, s = 20 + Math.random() * 70;
      sparks.push({ x: cx + Math.random() * 28 - 14, y: cy + Math.random() * 28 - 14, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.7 + Math.random() * 0.6, age: 0, col: ["#ffe14a", "#fff", "#9ae8ff", "#ffb0d0"][i % 4] });
    }
  }
  return opened;
}
const gateCenter = (g) => { const [x, y] = g.tiles[g.tiles.length >> 1]; return { x: (x + 0.5) * T, y: (y + 0.5) * T }; };
// 플레이어 바로 앞에 닫힌 문이 있으면 알려 줘요
const closedGateNear = (r) => gates.find((g) => !g.open && g.tiles.some(([x, y]) => Math.abs(player.x - (x + 0.5) * T) < T / 2 + r && Math.abs(player.y - 8 - (y + 0.5) * T) < T / 2 + r));
const zoneAt = (tx, ty) => MAP.zones.find((z) => tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h);   // (tx,ty) 칸이 어느 구역인지
const nearestNpc = (maxDist) => npcs.filter((n) => dist(player.x, player.y - 6, n.x, n.y - 6) < maxDist).sort((a, b) => dist(player.x, player.y, a.x, a.y) - dist(player.x, player.y, b.x, b.y))[0];

// 매 프레임 움직이기 (dt = 지난 프레임 이후 흐른 시간(초), move = 이동 방향)
function updateWorld(dt, move) {
  let { x, y } = move;
  const len = Math.hypot(x, y);
  player.moving = len > 0;
  if (len > 0) {
    x /= len; y /= len;                          // 대각선으로 가도 빨라지지 않게 길이를 1로
    player.dir = move.x && Math.abs(move.x) >= Math.abs(move.y) ? (move.x < 0 ? "left" : "right") : move.y < 0 ? "up" : "down";
    const nx = player.x + x * CONFIG.PLAYER_SPEED * dt;        // 가로, 세로를 따로 움직여서 벽에 미끄러지게 해요
    if (!footBlocked(nx, player.y)) player.x = nx;
    const ny = player.y + y * CONFIG.PLAYER_SPEED * dt;
    if (!footBlocked(player.x, ny)) player.y = ny;
    player.anim += dt;
  } else player.anim = 0;
  for (const n of npcs) {   // NPC는 가까이 오면 나를 바라봐요
    const dx = player.x - n.x, dy = player.y - n.y;
    n.dir = Math.hypot(dx, dy) > 96 ? n.home : Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
  }
  sparks.forEach((q) => { q.age += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 60 * dt; });
  sparks = sparks.filter((q) => q.age < q.life);
  moveCamera(dt, false);
}
function moveCamera(dt, snap) {   // 카메라가 내 캐릭터를 따라가요 (맵 밖은 안 보이게)
  const tx = constrain(player.x - VW / 2, 0, MAP.w * T - VW), ty = constrain(player.y - 22 - VH / 2, 0, MAP.h * T - VH);
  const k = snap ? 1 : Math.min(1, 9 * dt);     // 9 = 따라가는 빠르기 (클수록 빨라요)
  cam = snap || !cam ? { x: tx, y: ty } : { x: cam.x + (tx - cam.x) * k, y: cam.y + (ty - cam.y) * k };
}
const toScreen = (x, y) => ({ x: (x - Math.round(cam.x)) * Z, y: (y - Math.round(cam.y)) * Z });   // 맵 좌표 → 화면 좌표

// 맵 그리기.  순서: 배경(바닥+벽) → 벽 장식 → [가구, 문, 캐릭터]를 "아래쪽 줄" 순서로 → 말풍선 → 불꽃
// 아래쪽에 있는 것을 나중에 그려서, 캐릭터가 책상 "뒤로" 걸어가는 것처럼 보여요.
function drawWorld(hintGate) {
  const c = drawingContext, cx = Math.round(cam.x), cy = Math.round(cam.y);
  const visible = (x, y, w, h) => x + w > cx && x < cx + VW && y + h > cy && y < cy + VH;   // 안 보이는 건 그리지 않아요
  c.save(); c.scale(Z, Z); c.imageSmoothingEnabled = false;
  if (IMG.bg) c.drawImage(IMG.bg, cx, cy, VW, VH, 0, 0, VW, VH);                              // 배경: 큰 맵 그림에서 보이는 부분만
  for (const d of decor) if (visible(d.x, d.y, d.w, d.h)) c.drawImage(IMG.obj[d.n], d.x - cx, d.y - cy);
  const list = [];   // 앞뒤 순서를 맞춰서 그릴 것들
  for (const o of objs) if (visible(o.x, o.y, o.w, o.h)) list.push({ sort: o.sort, draw: () => c.drawImage(IMG.obj[o.n], o.x - cx, o.y - cy) });
  for (const g of gates) {
    const [gw, gh] = g.o === "v" ? [T, g.size * T] : [g.size * T, T];
    if (visible(g.x * T, g.y * T, gw, gh)) list.push({ sort: (g.y + gh / T) * T, draw: () => c.drawImage(IMG.obj[`gate_${g.o}${g.size}_${g.open ? "open" : "closed"}`], g.x * T - cx, g.y * T - cy) });
  }
  for (const e of [...npcs, player]) {
    const isNpc = e !== player, frame = e.moving ? [1, 0, 2, 0][Math.floor(e.anim * 8) % 4] : 0;   // 걸을 때 1→0→2→0 반복
    if (!visible(e.x - 20, e.y - 50, 40, 60)) continue;
    list.push({ sort: e.y, draw: () => sprite(e.key, e.dir, frame, e.x - 15 - cx, e.y - 43 - cy + (isNpc ? Math.round(Math.sin(clock * 2.2 + e.tx) * 0.6) : 0)) });
  }
  list.push({ sort: player.y - 1, draw: () => { c.globalAlpha = 0.75 + 0.25 * Math.sin(clock * 4); c.drawImage(IMG.ui.ring, Math.round(player.x - 18 - cx), Math.round(player.y - 12 - cy)); c.globalAlpha = 1; } });   // 내 발밑 하이라이트 원
  list.sort((a, b) => a.sort - b.sort).forEach((it) => it.draw());
  for (const n of npcs) {   // NPC 머리 위 말풍선 아이콘
    const icon = scene === "game" && mode === "explore" ? npcIcon(n) : null;
    if (icon && visible(n.x - 20, n.y - 90, 40, 70)) c.drawImage(IMG.ui[icon], Math.round(n.x - 9 - cx), Math.round(n.y - 86 - cy + Math.sin(clock * 4 + n.tx) * 2));
  }
  if (hintGate) { const g = gateCenter(hintGate); c.drawImage(IMG.ui.arrow_down, Math.round(g.x - 8 - cx), Math.round(g.y - 34 - cy + Math.sin(clock * 5) * 3)); }   // 방금 열린 문 위 화살표
  for (const q of sparks) { c.globalAlpha = Math.max(0, 1 - q.age / q.life); c.fillStyle = q.col; c.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), 3, 3); }
  c.restore();
}


// =====================================================================
//  5. 티처블 머신
//     얼굴 인식: 동훈 / 민성 / 성민 / No one  →  캐릭터 선택
//     동작 인식: 위 / 아래 / 왼쪽 / 오른쪽 / 확인 →  캐릭터 이동
//     content.js 의 링크가 비어 있으면 카메라도 모델도 켜지 않아요.
//     흐름: 카메라 켜기 → 0.07초마다 카메라 그림을 모델에 넣기 → 결과(클래스 이름, 확률) → 캐릭터/방향으로 바꾸기
// =====================================================================
const tm = {
  running: false, cameraOn: false, error: null, video: null, canvas: null,
  face: { status: "off", model: null, label: "", prob: 0, probs: [], key: null, none: false },   // key = 인식된 캐릭터, none = "No one"
  motion: { status: "off", model: null, label: "", dir: null },
};
const tmFaceUrl = () => (CONFIG.TM_FACE_MODEL_URL || "").trim(), tmMotionUrl = () => (CONFIG.TM_MOTION_MODEL_URL || "").trim();
const tmWanted = () => tmFaceUrl() || tmMotionUrl();
const simple = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");           // 비교할 때 대소문자·띄어쓰기 무시: "No one" → "noone"
const sameName = (label, list) => (list || []).some((n) => simple(n) === simple(label));

// 클래스 이름 → 캐릭터.  ("민성", 0.97) → face.key = "minseong" /  ("No one", 0.99) → face.none = true
function readFace(label, prob, probs = []) {
  const f = tm.face;
  Object.assign(f, { label, prob, probs, none: sameName(label, CONFIG.FACE_NONE_CLASSES), key: null });
  if (!f.none) f.key = Object.keys(CONFIG.FACE_CLASSES).find((k) => sameName(label, CONFIG.FACE_CLASSES[k])) || null;
  if (prob < CONFIG.FACE_MIN_PROB) f.key = null;      // 확률이 낮으면 아직 모르는 걸로 둬요
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
// 시험용: 카메라 없이 결과를 흉내 내요.  F12 콘솔에서  debugFace("민성", 0.95)  /  debugFace("No one")  /  debugMotion("오른쪽")
const debugFace = (label, prob = 0.95) => { tm.face.status = "준비됨(테스트)"; readFace(label, prob, [{ name: label, p: prob }]); };
const debugMotion = (label, prob = 0.95) => { tm.motion.status = "준비됨(테스트)"; readMotion(label, prob); };

// 필요한 라이브러리를 그때그때 불러와요 (링크가 없으면 불러오지 않아서 게임이 가벼워요)
const scriptCache = {};
const loadScript = (src) => (scriptCache[src] ||= new Promise((ok, fail) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => fail(new Error("불러오기 실패: " + src)); document.head.appendChild(s); }));
// 티처블 머신 라이브러리 주소 (티처블 머신 공식 안내와 같아요). 링크를 넣었을 때만 인터넷에서 불러와요.
const LIB = {
  tf: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js",
  pose: "https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js",
  image: "https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js",
};
const modelUrls = (base) => { base = base.replace(/[^/]*\.json$/i, ""); base += base.endsWith("/") ? "" : "/"; return [base + "model.json", base + "metadata.json"]; };

async function startTeachable() {
  if (tm.running || !tmWanted()) return;
  tm.running = true;
  try {   // 1) 카메라 켜기 (https 또는 localhost 에서만 돼요)
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("이 브라우저에서는 카메라를 쓸 수 없어요 (https 또는 localhost 에서 열어 주세요)");
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
    tm.video = Object.assign(document.createElement("video"), { srcObject: stream, muted: true, autoplay: true });
    tm.video.style.cssText = "position:fixed;left:-9999px;width:2px;height:2px;opacity:0";
    tm.video.setAttribute("playsinline", "");
    document.body.appendChild(tm.video);
    await tm.video.play();
    tm.canvas = Object.assign(document.createElement("canvas"), { width: 224, height: 224 });   // 모델에 넣을 224x224 그림
    tm.cameraOn = true;
    tm.error = null;
  } catch (e) { tm.error = e.message; tm.running = false; return; }
  // 2) 링크가 있는 모델만 불러오기
  await loadScript(LIB.tf);
  const poseMode = CONFIG.TM_MOTION_TYPE !== "image" && tmMotionUrl();
  if (poseMode) await loadScript(LIB.pose);
  if (tmFaceUrl() || (tmMotionUrl() && !poseMode)) await loadScript(LIB.image);
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
      c.save(); c.translate(224, 0); c.scale(-1, 1);                             // 거울처럼 좌우를 뒤집고
      c.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, 224, 224);   // 가운데 정사각형만 잘라요 (티처블 머신 웹캠과 같아요)
      c.restore();
      const best = (preds) => preds.reduce((a, b) => (b.probability > a.probability ? b : a));
      if (tm.face.model) { const p = await tm.face.model.predict(tm.canvas), b = best(p); readFace(b.className, b.probability, p.map((q) => ({ name: q.className, p: q.probability }))); }
      if (tm.motion.model) {
        const m = tm.motion.model, p = CONFIG.TM_MOTION_TYPE === "image" ? await m.predict(tm.canvas) : await m.predict((await m.estimatePose(tm.canvas)).posenetOutput), b = best(p);   // 포즈 모델은 몸의 관절을 먼저 찾아요
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


// =====================================================================
//  6. 화면들
//     boot(불러오기) → title(시작 화면) → select(캐릭터 선택) → game(게임)
//     화면마다 enter(들어올 때 한 번) / update(움직이기) / draw(그리기) 가 있어요.
// =====================================================================
const scenes = {};
function goTo(name, arg) { scene = name; clock = 0; scenes[name].enter?.(arg); }

// ---------------------------------------------------------------------
//  불러오기 화면
// ---------------------------------------------------------------------
let boot = { step: 0, state: "loading" };   // step: 끝낸 단계 수(0~3), state: loading → ok / fail
scenes.boot = {
  enter() {
    boot = { step: 0, state: "loading" };
    Object.keys(tried).forEach((k) => delete tried[k]);
    (async () => {
      for (const f of FILES) { loadState[f.name] = await loadFile(f); boot.step++; }
      [MAP, LIST, SCRIPT, QUIZ] = [window.MAEHOL_MAP, window.MAEHOL_ASSETS, window.MAEHOL_SCRIPT, window.MAEHOL_QUIZ];
      await Promise.all(["22px Galmuri11", "bold 22px Galmuri11", "11px Galmuri11"].map((f) => document.fonts.load(f, "매홀중학교 ABC")).concat(loadImages())).catch(() => {});   // 글꼴, 그림
      boot.step++;
      boot.state = MAP && LIST && SCRIPT && QUIZ && window.CONFIG && IMG.bg && IMG.title ? "ok" : "fail";
    })();
  },
  update() { if (boot.state === "ok" && clock > 0.4) { initWorld(); goTo("title"); } },
  draw() {
    background("#14101f");
    if (boot.state === "fail") return this.drawFail();
    txt("메타 투어 매홀", W / 2, H / 2 - 80, 44, { align: CENTER, bold: true, color: "#ffe27a" });
    const p = boot.step / (FILES.length + 1), online = Object.values(loadState).includes("인터넷");
    push(); noStroke(); fill("rgba(255,255,255,0.15)"); rect(W / 2 - 220, H / 2 + 10, 440, 18, 9); fill("#4fd17a"); rect(W / 2 - 220, H / 2 + 10, 440 * p, 18, 9); pop();   // 진행 막대
    txt(`불러오는 중... ${Math.round(p * 100)}%` + (online ? "  (인터넷에서 가져오고 있어요)" : ""), W / 2, H / 2 + 50, 22, { align: CENTER, color: "#d8d4ff" });
  },
  drawFail() {   // 파일이 없어서 시작할 수 없을 때: 뭐가 안 불러와졌는지, 왜 그런지, 어떻게 하면 되는지 알려줘요
    const [x, y, w, h] = [150, 60, 980, 600];
    panel(x, y, w, h, { fill: "rgba(30,24,60,0.95)", border: "#ff9a9a" });
    txt("게임 파일을 불러오지 못했어요", W / 2, y + 34, 28, { align: CENTER, bold: true, color: "#ff9a9a" });
    [...FILES, ART].forEach((f, i) => {
      const st = loadState[f.name] || "없음", yy = y + 84 + i * 80;
      txt(`${f.name}  (${f.what})`, x + 50, yy, 22, { color: "#ffffff" });
      txt(st === "없음" ? "✗ 없음" : `✓ ${st}`, x + w - 50, yy, 22, { align: RIGHT, color: st === "없음" ? "#ff9a9a" : "#4fd17a" });
      if (st === "없음") wrapText((tried[f.name] || []).join("  ·  "), w - 100, 13).slice(0, 3).forEach((l, j) => txt(l, x + 50, yy + 26 + j * 17, 13, { color: "#b9b5e6" }));   // 실패한 이유
    });
    ["이렇게 해 보세요", "1. 인터넷이 연결되어 있는지 확인해요", "2. 학교·회사 인터넷에서는 github, amazonaws 같은 주소가 막혀 있을 수 있어요. 집 인터넷이나 휴대폰 핫스팟으로 해 보세요",
      "3. p5 웹 에디터의 Sketch Files 에 index.html, sketch.js, content.js, data.js, art.png 가 모두 있는지 봐요", "4. 위 빨간 글자(실패한 이유)를 알려 주시면 원인을 찾을 수 있어요"].forEach((s, i) => txt(s, x + 50, y + 340 + i * 34, i ? 17 : 22, { color: i ? "#d8d4ff" : "#ffe27a", bold: !i }));
    if (button("다시 시도", W / 2 - 110, y + h - 76, 220, 56, { size: 24 })) this.enter();
  },
};

// ---------------------------------------------------------------------
//  시작 화면: '메타 투어 매홀' 그림 위에 [시작하기]와 톱니바퀴 클릭 영역을 얹었어요.
// ---------------------------------------------------------------------
const START_BTN = [543, 620, 194, 62], GEAR_BTN = [1180, 626, 76, 80];   // [x, y, 가로, 세로]
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
      rect(START_BTN[0] - 4, START_BTN[1] - 4, START_BTN[2] + 8, START_BTN[3] + 8, 14);       // 깜빡이는 테두리
      if (overGear) { stroke(255); rect(GEAR_BTN[0] - 2, GEAR_BTN[1] - 2, GEAR_BTN[2] + 4, GEAR_BTN[3] + 4, 12); }
      pop();
      if (overStart || overGear) cursor("pointer");
      txt("Enter 키 또는 [시작하기]", 20, 696, 11, { outline: "rgba(0,0,0,0.8)" });
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
let sel = 0, holdMs = 0, lastFace = null;    // 골라진 카드 번호, 같은 얼굴이 유지된 시간(ms), 직전에 인식된 얼굴
const cardX = (i) => 360 + i * 274;          // i번째 카드의 x 위치 (카드 크기 252 x 360, y 150)
scenes.select = {
  enter() { sel = Math.max(0, CHARS.findIndex((c) => c.key === charKey)); holdMs = 0; lastFace = null; startTeachable(); },
  choose(i) { if (i !== sel) { sel = i; sfx("select"); } },
  confirm() { charKey = CHARS[sel].key; sfx("finish"); goTo("game", { fresh: true }); },
  update(dt) {
    if (settingsOpen) return;
    const n = numberKey();
    if (n >= 0 && n < CHARS.length) this.choose(n);
    if (was("ArrowLeft") || was("KeyA")) this.choose((sel + 2) % 3);
    if (was("ArrowRight") || was("KeyD")) this.choose((sel + 1) % 3);
    if (was("Escape")) return goTo("title");
    if (action()) return this.confirm();
    const f = tm.face;   // ---- 얼굴 인식으로 고르기 ----
    if (tmFaceUrl() && f.key) {                                // 동훈/민성/성민 중 하나로 확실히 인식됨
      this.choose(CHARS.findIndex((c) => c.key === f.key));
      holdMs = f.key === lastFace ? holdMs + dt * 1000 : 0;    // 같은 얼굴이면 시간이 쌓여요
      lastFace = f.key;
      if (holdMs >= CONFIG.FACE_HOLD_MS) this.confirm();       // 충분히 유지되면 자동 시작!
    } else { holdMs = 0; lastFace = null; }                    // key 가 비면 "No one"이거나 확률이 낮은 경우: 아무것도 안 골라요
  },
  draw() {
    const g = drawingContext.createLinearGradient(0, 0, 0, H);   // 배경: 위에서 아래로 어두워지는 보라색 + 반짝이는 별
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
    const ly = y + (on ? -10 : hov ? -4 : 0);        // 골라진 카드는 위로 떠올라요
    panel(x, ly, w, h, { fill: on ? "rgba(255,244,200,0.98)" : "rgba(238,234,255,0.94)", border: on ? "#ffb21f" : "#8f94ff", bw: on ? 6 : 4, r: 16 });
    push(); noStroke(); fill(on ? "rgba(255,190,60,0.35)" : "rgba(120,110,200,0.25)"); ellipse(x + w / 2, ly + 270, 150, 38); pop();
    drawingContext.imageSmoothingEnabled = false;
    sprite(c.key, "down", 0, x + w / 2 - 75, ly + 28 + (on ? Math.round(Math.sin(clock * 5) * 4) : 0), 5);   // 캐릭터를 5배로 크게
    txt(c.name, x + w / 2, ly + 292, 30, { align: CENTER, bold: true, color: "#3a2a70" });
    txt(c.desc, x + w / 2, ly + 330, 11, { align: CENTER, color: "#6a5ea0" });
    keycap(String(i + 1), x + 14, ly + 14);
    if (on) txt("선택!", x + w - 16, ly + 18, 22, { align: RIGHT, bold: true, color: "#e0701a" });
    if (tmFaceUrl() && tm.face.key === c.key) {      // 얼굴이 이 캐릭터로 인식되면 시간 막대가 차올라요
      txt("얼굴 인식!", x + w / 2, ly - 30, 22, { align: CENTER, bold: true, color: "#8affb0", outline: "#103a20", outlineW: 5 });
      push(); noStroke(); fill("rgba(0,0,0,0.35)"); rect(x + 20, ly + h - 16, w - 40, 8, 4); fill("#4fd17a"); rect(x + 20, ly + h - 16, (w - 40) * constrain(holdMs / CONFIG.FACE_HOLD_MS, 0, 1), 8, 4); pop();
    }
    if (hov) { cursor("pointer"); if (clicked(x, y, w, h)) (sel === i ? this.confirm() : this.choose(i)); }   // 처음 클릭하면 고르기, 또 클릭하면 시작
  },
  drawCamera() {   // 왼쪽 패널: 카메라 화면과 인식 결과 (링크가 비어 있으면 안내 문구)
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
let mode = "explore", dlg = null, quiz = null;             // 지금 모드, 진행 중인 대화, 진행 중인 퀴즈
let zone = null, zoneT = 0, hintGate = null, nearNpc = null;   // 지금 장소, 장소 이름을 보여준 시간, 방금 열린 문, 가까이 있는 NPC
let cooldown = {}, gateCool = 0, mini = null;    // NPC별 쉬는 시간, 문 알림 간격, 미니맵 그림
const allDone = () => AREAS.every((a) => done[a]);        // 4곳 소개를 모두 끝냈는지
// NPC 머리 위에 어떤 말풍선을 보일지 (없으면 null)
function npcIcon(n) {
  if ((n.role === "guide" && !done[n.area]) || (n.role === "quiz" && allDone() && !quizDone)) return "bubble_exclaim";   // 아직 안 들은 소개 / 퀴즈 준비됨
  return n === nearNpc ? "bubble_talk" : null;
}

scenes.game = {
  enter(arg) {
    if (arg?.fresh) {   // 새 게임: 진행 상황을 모두 처음으로
      done = {}; quizDone = false; mode = "explore"; dlg = quiz = hintGate = zone = null; cooldown = {}; toasts = [];
      resetWorld();
      toast("W A S D 로 걸어 다녀요!", "star");
      if (/[?&]unlock/.test(location.search)) { AREAS.forEach((a) => (done[a] = true)); openGates(false); toast("시험 모드: 모든 문이 열려 있어요", "check"); }   // 주소 뒤에 ?unlock → 모든 문이 열려요
    }
    player.key = charKey;
    if (!mini) {   // 미니맵: 맵 큰 그림을 작게 줄여서 한 번만 만들어 둬요
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
    else this.quizUpdate(dt);
  },

  // 모드 1: 돌아다니기
  explore(dt) {
    const move = moveVec();
    updateWorld(dt, move);
    const z = zoneAt(Math.floor(player.x / T), Math.floor((player.y - 4) / T));   // 지금 있는 장소
    if (z && z !== zone) { zone = z; zoneT = 0; }
    zoneT += dt;
    if (hintGate && dist(player.x, player.y, gateCenter(hintGate).x, gateCenter(hintGate).y) < 56) hintGate = null;   // 문 가까이 가면 화살표 사라짐
    nearNpc = nearestNpc(46);
    for (const n of npcs) {   // 아직 안 들은 소개 NPC에게 가까이 가면 자동으로 대화가 시작돼요
      if (n.role === "guide" && !done[n.area] && !cooldown[n.id] && dist(player.x, player.y, n.x, n.y) < 62) return this.talk(n);
    }
    if (nearNpc && action()) return this.talk(nearNpc);      // 가까이 가서 Space / Enter / E
    if ((move.x || move.y) && gateCool <= 0) {   // 닫힌 문에 부딪히면 이유를 알려줘요
      const g = closedGateNear(10);
      if (g) { toast(g.label, "lock"); sfx("wrong"); gateCool = 3; }
    }
  },

  // NPC와 대화 시작. NPC의 역할(role)에 따라 하는 말이 달라요.
  talk(n) {
    const S = SCRIPT;
    if (n.role === "guide") this.say(n, S.areas[n.area].lines, () => this.finishArea(n.area));       // 대사를 다 들으면 이 구역이 "완료"
    else if (n.role === "quiz") {                                                                      // 반장: 소개를 다 듣기 전엔 돌려보내요
      if (!allDone()) this.say(n, S.quiz.locked);
      else this.say(n, quizDone ? S.quiz.again : S.quiz.intro, () => { mode = "quiz"; quiz = { i: 0, score: 0, state: "ask", sel: 0, picked: -1, results: [], t: 0 }; });
    } else this.say(n, S.chat[n.id] || ["안녕!"]);   // 복도 NPC: 학교 이야기를 들려줘요 (필수는 아니에요)
  },
  say(npc, lines, onDone) {   // 대화창 열기. lines = 대사 목록, onDone = 끝난 뒤 할 일
    mode = "dialogue"; dlg = { npc, lines, idx: 0, shown: 0, done: false, onDone }; sfx("click");
  },
  finishArea(area) {   // 소개를 끝냈을 때: 완료로 기록하고, 조건이 맞는 문을 열어요
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
    if (!d.done) {   // 글자가 한 글자씩 나타나요
      d.shown += dt * CONFIG.TEXT_SPEED;
      if (Math.floor(d.shown) % 3 === 0) sfx("blip");
      if (d.shown >= text.length) { d.shown = text.length; d.done = true; }
    }
    if (action() || click) {   // Space / Enter / E / 클릭
      click = null;
      if (!d.done) { d.shown = text.length; d.done = true; return; }   // 아직 나오는 중이면 한 번에 다 보여주기
      d.idx++; d.shown = 0; d.done = false; sfx("click");
      if (d.idx >= d.lines.length) { mode = "explore"; cooldown[d.npc.id] = 2.5; dlg = null; d.onDone?.(); }   // 대사가 끝났어요!
    }
  },

  // 모드 3: 퀴즈 푸는 중.  state: "ask"(문제) → "feedback"(정답 확인) → ... → "result"(결과)
  pick(i) {
    const q = QUIZ[quiz.i];
    if (quiz.state !== "ask" || i < 0 || i >= q.choices.length) return;
    quiz.picked = quiz.sel = i;
    const ok = i === q.answer;   // 정답인지 비교!
    if (ok) quiz.score++;
    sfx(ok ? "correct" : "wrong");
    quiz.results.push(ok);
    quiz.state = "feedback"; quiz.t = 0;
  },
  next() {   // 다음 문제 (마지막이면 결과 화면)
    quiz.i++; quiz.picked = -1; quiz.sel = 0; quiz.t = 0;
    if (quiz.i < QUIZ.length) return (quiz.state = "ask");
    quiz.state = "result"; quizDone = true; sfx("finish");
    if (best == null || quiz.score > best) { best = quiz.score; try { localStorage.setItem("maehol_best", best); } catch (e) {} }   // 최고 점수 저장
  },
  quizUpdate(dt) {
    quiz.t += dt;
    updateWorld(dt, { x: 0, y: 0 });
    if (quiz.state === "ask") {
      if (numberKey() >= 0) this.pick(numberKey());                                              // 1~4 키
      if (navKey()) { quiz.sel = (quiz.sel + navKey() + QUIZ[quiz.i].choices.length) % QUIZ[quiz.i].choices.length; sfx("click"); }   // ↑ ↓ 키
      if (action()) this.pick(quiz.sel);                                                          // Space 로 확정
    } else if (quiz.state === "feedback" && quiz.t > 0.3 && (action() || click)) { click = null; this.next(); }
  },
  closeQuiz() { mode = "explore"; quiz = null; cooldown.banjang = 1.5; },   // 닫자마자 반장이 다시 퀴즈를 시작하지 않게

  // ---- 매 프레임 그리기 ----
  draw() {
    background("#14101f");
    drawWorld(hintGate);
    // 이름표: NPC는 초록, 나는 노랑
    for (const n of npcs) {
      const s = toScreen(n.x, n.y - 48);
      if (s.x < -60 || s.x > W + 60 || s.y < -20 || s.y > H + 20) continue;
      nameTag(n.name, s.x, s.y - 4, "#b8ffd8", "rgba(10,40,30,0.75)");
      if (n === nearNpc && mode === "explore") { const tw = textW(n.name, 11, true) / 2 + 18; txt("대화", s.x + tw + keycap("Space", s.x + tw, s.y - 24) + 6, s.y - 20, 11, { bold: true, outline: "rgba(0,0,0,0.85)" }); }   // 가까이 가면 [Space] 대화 안내
    }
    const ps = toScreen(player.x, player.y - 48);
    nameTag(charName(player.key), ps.x, ps.y - 4, "#ffe27a", "rgba(60,40,10,0.78)");
    this.hud();
    if (mode === "dialogue" && dlg) drawDialogue(dlg);
    if (mode === "quiz") this.quizDraw();
  },
  // HUD = 게임 화면 위에 항상 떠 있는 정보
  hud() {
    const zname = zone ? (zone.id === "classroom" ? "교실 (퀴즈 존)" : zone.name) : "운동장";
    panel(16, 16, textW(zname, 22, true) + 56, 42, { fill: "rgba(20,22,50,0.86)", shadow: false });          // 왼쪽 위: 지금 있는 장소
    push(); noStroke(); fill("#ff6a6a"); ellipse(36, 34, 14); fill("#fff"); ellipse(36, 34, 5); pop();
    txt(zname, 52, 38, 22, { valign: CENTER, bold: true });
    const goal = AREAS.map((a) => !done[a] && SCRIPT.objective[a]).find(Boolean) || (quizDone ? SCRIPT.objective.done : SCRIPT.objective.quiz);   // 그 아래: 목표
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
    if (tm.cameraOn && tm.motion.model) txt(tm.motion.dir ? `동작: ${tm.motion.label}` : "동작: 정지", 20, 134, 11, { bold: true, color: "#9ad0ff" });   // 동작 인식 상태
    // 목표 NPC가 화면 밖이면 화면 가장자리에 방향 화살표
    const target = AREAS.map((a) => !done[a] && npcs.find((n) => n.id === SCRIPT.areas[a].npc)).find(Boolean) || (!quizDone && npcs.find((n) => n.id === SCRIPT.quiz.npc));
    const s = target && toScreen(target.x, target.y - 20);
    if (mode === "explore" && target && !(s.x > 60 && s.x < W - 60 && s.y > 130 && s.y < H - 60)) {
      const a = Math.atan2(s.y - H / 2, s.x - W / 2), ex = constrain(W / 2 + Math.cos(a) * 900, 60, W - 60), ey = constrain(H / 2 + Math.sin(a) * 900, 140, H - 60);
      push(); translate(ex, ey); rotate(a); stroke("#7a4a10"); strokeWeight(4); fill("#ffe14a"); triangle(24, 0, -14, -18, -14, 18); pop();
      txt(target.name, ex, ey + 30, 11, { align: CENTER, bold: true, color: "#ffe14a", outline: "rgba(0,0,0,0.85)", outlineW: 4 });
    }
    if (mode === "explore" && keyEvents === 0 && clock > 3) txt("키보드가 안 되면 화면을 한 번 클릭하세요  ·  마우스를 누르고 있으면 그쪽으로 걸어가요", W / 2, 690, 11, { align: CENTER, color: "#ffe27a", outline: "rgba(0,0,0,0.9)", outlineW: 4 });   // 키보드 입력이 없을 때 안내
    else if (mode === "explore" && clock < 14) txt("WASD 이동  ·  Space 대화  ·  Esc 설정", W / 2, 690, 11, { align: CENTER, outline: "rgba(0,0,0,0.9)", outlineW: 4 });   // 처음 14초 동안 조작 힌트
    if (walkHold && mouseIsPressed && mode === "explore") { push(); noFill(); stroke(255, 255, 255, 200); strokeWeight(3); circle(mouseX, mouseY, 28 + Math.sin(clock * 10) * 5); pop(); }   // 누르고 있는 곳 표시
    if (zoneT < 2.4 && mode === "explore") { push(); drawingContext.globalAlpha = Math.max(0, Math.min(1, zoneT / 0.3, (2.4 - zoneT) / 0.5)); txt(zname, W / 2, 170, 40, { align: CENTER, bold: true, outline: "#2a1a50", outlineW: 8 }); pop(); }   // 새 장소에 들어서면 큰 글씨로
  },

  // 퀴즈 창 (정답은 초록, 내가 고른 오답은 빨강)
  quizDraw() {
    dim(0.55);
    const [x, y, w, h] = [110, 36, 1060, 648], Q = quiz, q = QUIZ[Q.i];
    panel(x, y, w, h, { fill: "rgba(24,26,58,0.98)", border: "#ffe27a", r: 18 });
    if (Q.state === "result") return this.resultDraw(x, y, w, h);
    txt(`퀴즈 ${Q.i + 1} / ${QUIZ.length}`, x + 40, y + 28, 22, { bold: true, color: "#ffe27a" });
    QUIZ.forEach((_, i) => { push(); stroke("#2a2a50"); strokeWeight(3); fill(i < Q.results.length ? (Q.results[i] ? "#4fd17a" : "#ff6a6a") : i === Q.i ? "#ffe27a" : "#3a3a68"); ellipse(x + w - 60 - (QUIZ.length - 1 - i) * 30, y + 40, 20); pop(); });   // 진행 점
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
      if (on) { cursor("pointer"); if (clicked(x + 50, by, w - 100, 62)) this.pick(i); }   // 클릭해서 고르기
    });
    if (Q.state === "ask") txt("1~4 번호 · ↑↓ + Space · 클릭으로 골라요", x + w / 2, y + h - 34, 11, { align: CENTER, color: "rgba(255,255,255,0.6)" });
    else {   // 정답 확인 단계: 해설과 [다음 문제] 버튼
      const ok = Q.results[Q.results.length - 1], fy = y + h - 108;
      txt(ok ? "정답이에요!" : "아쉬워요! 다시 기억해 봐요", x + 50, fy, 30, { bold: true, color: ok ? "#8affb0" : "#ffb0b8" });
      wrapText(q.explain || "", w - 360, 22).slice(0, 2).forEach((l, i) => txt(l, x + 50, fy + 44 + i * 30, 22, { color: "#e8e4ff" }));
      if (button(Q.i === QUIZ.length - 1 ? "결과 보기" : "다음 문제", x + w - 250, fy + 6, 200, 60, { size: 24 }) && Q.t > 0.3) this.next();
    }
  },
  // 결과 화면: 점수, 별, 응원 문구, 버튼 3개
  resultDraw(x, y, w, h) {
    const ratio = quiz.score / QUIZ.length, stars = ratio >= 1 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;   // 만점이면 별 3개, 60% 이상 2개, 하나라도 맞히면 1개
    txt("퀴즈 결과", x + w / 2, y + 36, 36, { align: CENTER, bold: true, color: "#ffe27a" });
    txt(`${quiz.score} / ${QUIZ.length}`, x + w / 2, y + 120, 96, { align: CENTER, bold: true, outline: "#2a1a50", outlineW: 10 });
    for (const i of times(3)) { drawingContext.globalAlpha = i < stars ? 1 : 0.25; drawingContext.drawImage(IMG.ui.star, x + w / 2 - 152 + i * 80, y + 238 + (i < stars ? Math.sin(clock * 4 + i) * 4 : 0), 64, 64); }
    drawingContext.globalAlpha = 1;
    txt(ratio >= 1 ? "만점이에요! 우리 학교 박사님이네요!" : ratio >= 0.6 ? "잘했어요! 우리 학교를 잘 알고 있어요." : "소개를 다시 한 번 들어 보고 도전해 봐요!", x + w / 2, y + 340, 30, { align: CENTER, bold: true });   // 응원 문구 (바꿔도 돼요)
    if (best != null) txt(`내 최고 점수  ${best} / ${QUIZ.length}`, x + w / 2, y + 400, 22, { align: CENTER, color: "#ffe27a" });
    const by = y + h - 130;
    if (button("다시 풀기", x + 90, by, 270, 70, { size: 26 })) { quiz = { i: 0, score: 0, state: "ask", sel: 0, picked: -1, results: [], t: 0 }; sfx("select"); }
    if (button("계속 둘러보기", x + 395, by, 270, 70, { size: 26, ...BLUE })) this.closeQuiz();
    if (button("처음으로", x + 700, by, 270, 70, { size: 26, ...PINK })) goTo("title");
  },
};


// =====================================================================
//  7. p5.js 시작점
// =====================================================================
function setup() {
  const cv = createCanvas(W, H);
  if (!document.getElementById("game")) {   // index.html 이 기본 파일이어도 화면이 맞도록 직접 꾸며요
    document.body.insertAdjacentHTML("beforeend", '<div id="game"></div><style>html,body{margin:0;height:100%;background:#120d1a;overflow:hidden}#game{width:100%;height:100%;display:flex;align-items:center;justify-content:center}canvas{image-rendering:pixelated;width:min(100vw,177.78vh)!important;height:auto!important;display:block;outline:none}</style>');
  }
  cv.parent("game");                   // 1280 x 720 그림판을 <div id="game"> 안에 만들어요
  cv.elt.tabIndex = 0; focusGame();    // 키보드를 받을 수 있게 해요
  pixelDensity(1);
  noSmooth();                          // 그림을 확대해도 흐려지지 않게 (픽셀아트!)
  frameRate(60);
  goTo("boot");                        // 불러오기 화면부터 시작
}

function draw() {
  const dt = Math.min(deltaTime / 1000, 0.05);   // 지난 프레임 이후 흐른 시간(초). 컴퓨터가 느려도 속도가 같도록 곱해 줘요
  clock += dt;
  cursor("default");
  drawingContext.imageSmoothingEnabled = false;
  if (was("KeyM")) muted = !muted;
  if (!settingsOpen) scenes[scene].update(dt);   // 1) 움직이기  (설정 창이 열려 있으면 멈춰요)
  scenes[scene].draw();                          // 2) 그리기
  if (scene === "game") drawToasts(dt);
  drawSettings();
  if (click && scene === "game" && mode === "explore" && !settingsOpen) {   // 4) 버튼이 쓰지 않은 클릭: NPC를 눌렀으면 대화, 아니면 그쪽으로 걷기
    const s = nearNpc && toScreen(nearNpc.x, nearNpc.y - 22);
    if (s && Math.hypot(click.x - s.x, click.y - s.y) < 46) scenes.game.talk(nearNpc); else walkHold = true;
  }
  if (!(scene === "game" && mode === "explore")) walkHold = false;
  pressed = {}; click = null; motion.nav = 0; motion.action = false;   // 3) 이번 프레임에만 유효한 입력 지우기
}

function mousePressed() { focusGame(); click = { x: mouseX, y: mouseY }; startAudio(); return false; }   // 마우스를 누르면 p5.js 가 자동으로 불러줘요
function mouseReleased() { walkHold = false; }
function keyPressed() { if ([32, 37, 38, 39, 40].includes(keyCode)) return false; }          // 스페이스/방향키로 페이지가 움직이지 않게
