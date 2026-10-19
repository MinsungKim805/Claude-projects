// noprotect
// ===== sketch.js  —  메타 투어 매홀 게임 코드 ① (p5.js): 준비 · 입력 · 꾸미기 도구 · 불러오기 화면 · setup/draw =====
//  p5.js 가 setup() 을 한 번, draw() 를 1초에 약 60번 불러줘요.
//  차례: 1.준비(불러오기)  2.입력·소리  3.꾸미기 도구  6.화면 틀·불러오기 화면  7.setup/draw   (4.월드 · 5.티처블 머신 · 나머지 화면은 game.js)
//  파일 6개(폴더 없이): index.html · sketch.js(이 파일) · game.js(게임 코드 ②) · content.js(★ 직접 고치는 설정·대사·퀴즈) · data.js(맵 데이터+글꼴) · art.png(그림 전부)
//  data.js, art.png, game.js 가 안 불러와지면 인터넷(GitHub)에서 대신 가져와요. (1. 준비의 파일 불러오기)
//  ※ p5.js 이름(text, rect, select, dist 등)과 겹치지 않게 이름을 지었어요.


// ===== 1. 준비 =====
const [W, H, Z, T] = [1280, 720, 2, 32];  // 화면 가로·세로, 맵 확대 배율, 타일(한 칸) 크기(픽셀)
const VW = W / Z, VH = H / Z;  // 화면에 보이는 맵의 크기(확대 전)
const times = (n) => [...Array(n).keys()];  // times(3) → [0, 1, 2]. 반복은 이걸로 해요 (for(;;)·while 은 p5 에디터의 반복문 보호와 충돌해요)
let MAP, LIST, SCRIPT, QUIZ;  // 맵 데이터, 그림 위치(data.js), 대사, 퀴즈(content.js) — 파일 불러오기 코드가 채워 줘요
const FONT = "Galmuri11";

const AREAS = ["playground", "cafeteria", "gym", "library"];  // 소개를 들어야 하는 구역 (이 순서대로)
const STOPS = [["playground", "운동장"], ["cafeteria", "급식실"], ["gym", "체육관"], ["library", "도서관"], ["classroom", "교실"]];
const CHARS = [  // 내가 고를 수 있는 캐릭터 (key = 캐릭터 그림의 이름)
  { key: "donghun", name: "동훈", desc: "까만 머리의 씩씩한 친구" },
  { key: "minseong", name: "민성", desc: "동그란 안경이 잘 어울려요" },
  { key: "seongmin", name: "성민", desc: "모자가 멋진 유쾌한 친구" },
];
const charName = (key) => (CHARS.find((c) => c.key === key) || { name: "나" }).name;

let scene = "boot", clock = 0;  // 지금 화면, 화면이 켜진 뒤 흐른 시간(초)
let charKey = "donghun";  // 내가 고른 캐릭터
let done = {}, quizDone = false, best = null;  // 소개를 끝낸 구역, 퀴즈를 풀었는지, 최고 점수
try { best = parseInt(localStorage.getItem("maehol_best")) || null; } catch (e) {}

// ---- 파일 불러오기: 파일(content.js, game.js, data.js, art.png)을 여러 곳에서 동시에 가져와서, 먼저 성공한 걸 써요.
//      1) 내 파일(에디터에 올린 것) 2) 3초 안에 안 되면 GitHub 3) 또 3초 뒤 jsDelivr. 앞의 것이 실패하면 바로 다음 것을 시작해요.
//      ※ 따옴표 친 파일 이름(content.js, game.js, data.js, art.png)은 딱 한 번씩만 써요. p5 웹 에디터가 올린 파일의 긴 주소로 바꿔 버리기 때문이에요. (인터넷용 이름 name 은 글자를 이어 붙여 만들었어요)
const SHA = "e5cca503d07047f04dfbe9817ee0d9bc4d67d827";  // 인터넷에 올려 둔 파일 버전(커밋 번호)
const ONLINE = [`https://raw.githubusercontent.com/MinsungKim805/Claude-projects/${SHA}/maehol-meta/`, `https://cdn.jsdelivr.net/gh/MinsungKim805/Claude-projects@${SHA}/maehol-meta/`];
const FILES = [  // src = 내 파일, name = 인터넷용 이름, key = 파일이 만들어 주는 이름
  { src: "content.js", name: ["content", "js"].join("."), key: "MAEHOL_QUIZ", what: "설정·대사·퀴즈" },
  { src: "game.js", name: ["game", "js"].join("."), key: "MAEHOL_GAME", what: "게임 코드 ②" },
  { src: "data.js", name: ["data", "js"].join("."), key: "MAEHOL_MAP", what: "맵 데이터·글꼴" },
];
const ART = { src: "art.png", name: ["art", "png"].join("."), what: "그림 묶음" };
const loadState = {}, tried = {}, phase = {}, manual = {};  // loadState: 파일 → 어디서 받았나, tried: 실패 이유(실패 화면에 보여 줘요), phase: 지금 하는 일, manual: 내 컴퓨터에서 직접 고른 파일
const hostOf = (u) => { try { return new URL(u, document.baseURI).host; } catch (e) { return "?"; } };
const note = (f, u, why) => (tried[f.name] = tried[f.name] || []).push(`${u.startsWith("blob:") ? "내 컴퓨터" : hostOf(u)} ${why}`);
const runScript = (text) => { const el = document.createElement("script"); el.text = text; document.head.appendChild(el); };  // 글자로 받은 코드를 실행해요

// 가져오기를 gap(ms) 간격으로 하나씩 시작해서 먼저 성공한 값을 돌려줘요. 앞의 것이 실패하면 바로 다음을 시작해요. (모두 실패하면 null)
function firstOk(tasks, gap = 3000) {
  return new Promise((ok) => {
    let next = 0, alive = 0, done = false, timer = 0;
    const end = (v) => { done = true; clearTimeout(timer); ok(v); };
    const start = () => {
      clearTimeout(timer);
      if (done || next >= tasks.length) return;
      const task = tasks[next++]; alive++;
      timer = setTimeout(start, gap);
      Promise.resolve().then(task).catch(() => null).then((v) => { alive--; if (done) return; if (v) end(v); else if (next < tasks.length) start(); else if (!alive) end(null); });
    };
    start();
  });
}
const sources = (f) => (manual[f.name] ? [["내 컴퓨터", manual[f.name]]] : [["내 파일", f.src], ...ONLINE.map((base) => ["인터넷", base + f.name])]);  // [어디서, 주소]
const fetchFirst = (f, get) => firstOk(sources(f).map(([who, src]) => async () => { phase[f.name] = who + "에서 받는 중"; const v = await get(src, f); return v && [v, who]; }));  // 성공하면 [값, 어디서]

async function fetchText(src, f) {  // 주소의 글자(코드)를 받아요. 실패하면 null
  try {
    const r = await fetch(src, { signal: AbortSignal.timeout?.(40000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const t = await r.text();
    if (t.trimStart()[0] === "<") throw new Error("파일 대신 웹페이지가 왔어요");
    return t;
  } catch (e) { note(f, src, String(e.message || e).slice(0, 40)); return null; }
}
function tagScript(src, f) {  // script 태그로 불러와 실행 (fetch 가 막히는 file:// 같을 때)
  return new Promise((done) => {
    const el = document.createElement("script"), end = (ok) => { clearTimeout(t); if (!ok) note(f, src, "script 태그로도 실패"); done(ok || null); }, t = setTimeout(() => end(false), 40000);
    el.onload = () => end(true); el.onerror = () => end(false); el.src = src; document.head.appendChild(el);
  });
}
async function loadFile(f) {  // content.js, data.js: 이미 있으면 그대로, 아니면 내 파일 → GitHub → jsDelivr 순서로 겨뤄서 가져와 실행
  if (window[f.key]) return "내 파일";
  const got = await firstOk(sources(f).map(([who, src]) => async () => {
    phase[f.name] = who + "에서 받는 중";
    const v = (await fetchText(src, f)) ?? (who === "내 파일" && (/^https?:/.test(src) || location.protocol === "file:") && (await tagScript(src, f)));  // 내 파일은 글자로 못 읽으면 태그로 한 번 더
    return v === true && !window[f.key] ? null : v && [v, who];
  }));
  if (got && got[0] !== true) runScript(got[0]);
  return window[f.key] ? (got ? got[1] : "내 파일") : "없음";
}

// ---- 그림 불러오기: 모든 그림은 png 한 장에 묶여 있어요. 불러온 뒤 조각조각 잘라서 써요.
//      IMG.obj["desk"] = 책상 그림, IMG.spr["donghun"] = 동훈 시트, IMG.ui["star"] = 별, IMG.bg = 맵 배경, IMG.title = 시작 화면
const IMG = { obj: {}, spr: {}, ui: {}, bg: null, title: null };
const loadSheet = (src, f) => new Promise((ok) => {
  const im = new Image(), fail = (why) => { clearTimeout(t); note(f, src, why); ok(null); }, t = setTimeout(() => fail("시간 초과"), 40000);
  im.onload = () => { clearTimeout(t); ok(im); }; im.onerror = () => fail("그림 불러오기 실패"); im.src = src;
});
function sliceSheet(sheet) {  // 묶음 그림을 조각으로 잘라요 (조각 위치는 data.js 의 LIST)
  for (const name in LIST.rects) {
    const [x, y, w, h] = LIST.rects[name], cut = Object.assign(document.createElement("canvas"), { width: w, height: h });
    cut.getContext("2d").drawImage(sheet, x, y, w, h, 0, 0, w, h);
    const [kind, key] = name.split(":");  // 이름 앞에 spr: ui: img: 가 붙어 있으면 종류를 나타내요
    if (kind === "img") IMG[key] = cut;
    else (kind === "spr" ? IMG.spr : kind === "ui" ? IMG.ui : IMG.obj)[key || name] = cut;
  }
}

// content.js 의 대사·퀴즈가 올바른지 점검해서 문제 목록을 돌려줘요 (틀린 채 시작하면 게임 도중 멈춰요)
function checkContent() {
  const bad = [], S = SCRIPT, C = window.CONFIG, lines = (a) => Array.isArray(a) && a.length > 0 && a.every((t) => typeof t === "string");
  const npcOf = (id, role) => MAP.npcs.some((n) => n.id === id && n.role === role);
  AREAS.forEach((a) => {
    if (!lines(S.areas?.[a]?.lines)) bad.push(`areas.${a}.lines : 대사 목록이 비었거나 글이 아닌 게 있어요`);
    if (!npcOf(S.areas?.[a]?.npc, "guide")) bad.push(`areas.${a}.npc : 안내 NPC 이름이 맞지 않아요 (haneul, doyun, seoyeon, jiu)`);
    if (!S.objective?.[a]) bad.push(`objective.${a} : 목표 문구가 없어요`);
  });
  ["quiz", "done"].forEach((k) => S.objective?.[k] || bad.push(`objective.${k} : 목표 문구가 없어요`));
  if (!npcOf(S.quiz?.npc, "quiz")) bad.push("quiz.npc : 퀴즈 NPC 이름이 맞지 않아요 (banjang)");
  ["locked", "intro", "again"].forEach((k) => lines(S.quiz?.[k]) || bad.push(`quiz.${k} : 대사 목록이 비었어요`));
  if (!Array.isArray(QUIZ) || !QUIZ.length) bad.push("퀴즈가 하나도 없어요");
  else QUIZ.forEach((q, i) => {
    if (!q.q || !Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 4) bad.push(`퀴즈 ${i + 1}번 : 문제(q)와 보기(choices 2~4개)가 필요해요`);
    else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) bad.push(`퀴즈 ${i + 1}번 : answer 는 0부터 ${q.choices.length - 1} 사이 숫자여야 해요 (0 = 첫 번째 보기)`);
  });
  ["PLAYER_SPEED", "TEXT_SPEED", "FACE_MIN_PROB", "FACE_HOLD_MS", "MOTION_MIN_PROB"].forEach((k) => typeof C[k] === "number" || bad.push(`CONFIG.${k} : 숫자가 필요해요`));
  return bad;
}

// 마지막 방법: zip 을 푼 폴더의 content.js, data.js, art.png 를 직접 골라요
function pickFiles() {
  const el = Object.assign(document.createElement("input"), { type: "file", multiple: true, accept: ".js,.png" });
  el.onchange = () => {
    for (const file of el.files) { const f = [...FILES, ART].find((x) => file.name.toLowerCase().startsWith(x.name.split(".")[0])); if (f) manual[f.name] = URL.createObjectURL(file); }
    scenes.boot.enter();
  };
  el.click();
}

// 캐릭터 시트에서 한 장면을 오려서 그려요. 시트는 가로 3프레임(서기, 왼발, 오른발) x 세로 4방향이고,
// 칸 하나는 30x46 픽셀이에요. s = 확대 배율, crop = 일부만 오릴 때 [x, y, 가로, 세로]
const ROW = { down: 0, left: 1, right: 2, up: 3 };
const SIT = [9, 34];  // 앉은 모습: 등 쪽 그림의 위쪽(머리~허리)만 내려서 앉은 것처럼 그려요 [내리는 양, 자를 높이]
function sprite(key, dir, frame, x, y, s = 1, crop = [0, 0, 30, 46]) {
  const im = IMG.spr[key];
  if (im) drawingContext.drawImage(im, frame * 30 + crop[0], ROW[dir] * 46 + crop[1], crop[2], crop[3], Math.round(x), Math.round(y), crop[2] * s, crop[3] * s);
}


// ===== 2. 입력과 소리 =====
let keys = {}, pressed = {}, click = null;  // 누르는 중인 키, 이번 프레임에 눌린 키, 클릭 위치
let motion = { dir: null, action: false, nav: 0 };  // 티처블 머신 동작 인식 결과
// 키는 "KeyW" 같은 자판 위치 이름으로 확인해서 한글 입력 상태여도 WASD가 먹어요.
const KEY_BY_NUMBER = { 87: "KeyW", 65: "KeyA", 83: "KeyS", 68: "KeyD", 69: "KeyE", 77: "KeyM", 32: "Space", 13: "Enter", 27: "Escape", 37: "ArrowLeft", 38: "ArrowUp", 39: "ArrowRight", 40: "ArrowDown" };
const KEY_BY_JAMO = { ㅈ: "KeyW", ㅉ: "KeyW", ㅁ: "KeyA", ㄴ: "KeyS", ㅇ: "KeyD", ㄷ: "KeyE", ㄸ: "KeyE", ㅡ: "KeyM" };  // 한글 자판으로 눌러도 같은 키
let keyEvents = 0;  // 키보드 입력이 들어왔는지 (안 들어오면 안내해요)
function keyId(e) {
  if (e.code && e.code !== "Unidentified") return e.code;  // 보통은 이걸로 충분해요
  if (KEY_BY_JAMO[e.key]) return KEY_BY_JAMO[e.key];  // code 가 없는 입력기(일부 태블릿·크롬북)
  if (/^[0-9]$/.test(e.key)) return "Digit" + e.key;
  if (/^[a-z]$/i.test(e.key)) return "Key" + e.key.toUpperCase();
  return KEY_BY_NUMBER[e.keyCode] || e.key;
}
addEventListener("keydown", (e) => {
  const id = keyId(e);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(id)) e.preventDefault();  // 페이지가 스크롤되지 않게
  if (!e.repeat) pressed[id] = true;
  keys[id] = true;
  keyEvents++;
  startAudio();
});
addEventListener("keyup", (e) => (keys[keyId(e)] = false));
addEventListener("blur", () => (keys = {}));
// 에디터처럼 게임이 작은 창(iframe) 안에 있으면 클릭해야 키보드가 들어와요. 클릭할 때마다 키보드를 게임에 맞춰 줘요.
function focusGame() { try { window.focus(); document.querySelector("canvas")?.focus({ preventScroll: true }); } catch (e) {} }
const down = (code) => keys[code];  // 지금 누르고 있나?
const was = (code) => pressed[code];  // 이번 프레임에 막 눌렀나?
const action = () => was("Space") || was("Enter") || was("KeyE") || motion.action;  // "확인" 키
// 이동 방향 {x, y} (-1, 0, 1). WASD/방향키가 우선, 안 누르면 동작 인식
let walkHold = false;  // 마우스(손가락)를 누른 채 걷는 중인가
function moveVec() {
  let x = (down("KeyD") || down("ArrowRight") ? 1 : 0) - (down("KeyA") || down("ArrowLeft") ? 1 : 0);
  let y = (down("KeyS") || down("ArrowDown") ? 1 : 0) - (down("KeyW") || down("ArrowUp") ? 1 : 0);
  if (!x && !y && walkHold && mouseIsPressed) {  // 키보드가 안 될 때: 화면을 누르고 있으면 그쪽으로 걸어요
    const p = toScreen(player.x, player.y - 20), dx = mouseX - p.x, dy = mouseY - p.y, len = Math.hypot(dx, dy);
    if (len > 24) return { x: dx / len, y: dy / len };
  }
  if (!x && !y && motion.dir) { x = { left: -1, right: 1 }[motion.dir] || 0; y = { up: -1, down: 1 }[motion.dir] || 0; }
  return { x, y };
}
const numberKey = () => times(9).find((i) => was("Digit" + (i + 1)) || was("Numpad" + (i + 1))) ?? -1;  // 1~9 키 → 0~8
const navKey = () => (was("ArrowUp") || was("KeyW") ? -1 : was("ArrowDown") || was("KeyS") ? 1 : motion.nav);  // 메뉴 위/아래

// ---- 효과음: [높이(Hz), 길이(초), 파형, 크기] 를 순서대로 "삑삑" 내요. 숫자를 바꾸면 소리가 달라져요.
let audio = null, muted = false;
function startAudio() {  // 브라우저는 첫 입력 뒤에야 소리를 허락해요
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


// ===== 3. 화면 꾸미기 도구 (p5.js 로 그려요) =====
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
const wrapMemo = new Map();
function wrapText(s, maxW, size, bold) {
  const key = `${s}|${maxW}|${size}|${bold}`;
  if (wrapMemo.has(key)) return wrapMemo.get(key);
  const lines = [];
  for (const para of String(s).split("\n")) {
    let cur = "";
    for (const ch of para) { if (textW(cur + ch, size, bold) > maxW) { lines.push(cur); cur = ""; } cur += ch; }
    lines.push(cur);
  }
  if (wrapMemo.size > 300) wrapMemo.clear();
  wrapMemo.set(key, lines);
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
const dim = (a) => { push(); noStroke(); fill(8, 6, 20, 255 * a); rect(0, 0, W, H); pop(); };  // 화면 어둡게
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
function keycap(label, x, y) {  // [Space] 같은 키 모양. 가로 길이를 돌려줘요
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
    drawingContext.globalAlpha = Math.max(0, Math.min(1, t.age / 0.2, (3.6 - t.age) / 0.4));  // 서서히 나타나고 사라져요
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
  sprite(d.npc.key, "down", 0, x + 28 + 14, y + 30 + 6, 4, [2, 0, 26, 30]);  // 얼굴: 캐릭터 시트의 머리 부분을 4배 확대
  let left = Math.floor(d.shown), ly = y + 36;  // 글씨는 한 글자씩 나타나요
  for (const line of wrapText(d.lines[d.idx], w - 230, 22)) {
    if (left <= 0) break;
    txt(line.slice(0, left), x + 190, ly, 22);
    left -= line.length;
    ly += 36;
  }
  if (d.done) {  // 다 나왔으면 깜빡이는 ▼
    push(); noStroke(); fill(255, 226, 122, 255 * (0.5 + 0.5 * Math.sin(clock * 6))); triangle(x + w - 60, y + h - 44, x + w - 36, y + h - 44, x + w - 48, y + h - 28); pop();
    txt("Space / 클릭", x + w - 40, y + h - 28, 11, { align: RIGHT, color: "rgba(255,255,255,0.6)" });
  }
}
// 설정 창: 조작 방법과 티처블 머신 연결 상태
let settingsOpen = false, settingsInGame = false, settingsFrame = 0;
const showSettings = (inGame) => { settingsOpen = true; settingsInGame = inGame; settingsFrame = frameCount; };
function drawSettings() {
  if (!settingsOpen) return;
  if (was("Escape") && frameCount !== settingsFrame) { settingsOpen = false; return; }  // Esc 로 닫기 (연 바로 그 프레임은 제외)
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


// ===== 6. 화면들 =====  (불러오기 화면 boot 는 여기, 나머지 title · select · game 은 game.js)
//     boot(불러오기) → title(시작 화면) → select(캐릭터 선택) → game(게임)
//     화면마다 enter(들어올 때 한 번) / update(움직이기) / draw(그리기) 가 있어요.
const scenes = {};
function goTo(name, arg) { scene = name; clock = 0; scenes[name].enter?.(arg); }

// ---------------------------------------------------------------------
//  불러오기 화면
// ---------------------------------------------------------------------
let boot = { step: 0, state: "loading" };  // step: 끝낸 일의 수(0~4), state: loading → ok / fail
scenes.boot = {
  enter() {
    boot = { step: 0, state: "loading", problems: [] };
    [loadState, tried, phase].forEach((o) => Object.keys(o).forEach((k) => delete o[k]));
    (async () => {
      const tasks = FILES.map(async (f) => { loadState[f.name] = await loadFile(f); boot.step++; });  // 세 파일을 동시에 가져와요
      tasks.push(fetchFirst(ART, loadSheet).then((got) => { loadState[ART.name] = got ? got[1] : "없음"; boot.step++; return got; }));
      const sheet = (await Promise.all(tasks)).at(-1)?.[0];
      [MAP, LIST, SCRIPT, QUIZ] = [window.MAEHOL_MAP, window.MAEHOL_ASSETS, window.MAEHOL_SCRIPT, window.MAEHOL_QUIZ];
      if (sheet && LIST) sliceSheet(sheet);
      await Promise.all(["22px Galmuri11", "bold 22px Galmuri11", "11px Galmuri11"].map((f) => document.fonts.load(f, "매홀중학교 ABC"))).catch(() => {});  // 글꼴
      boot.step++;
      boot.state = MAP && LIST && SCRIPT && QUIZ && window.CONFIG && window.MAEHOL_GAME && IMG.bg && IMG.title ? "ok" : "fail";
      if (boot.state === "ok" && (boot.problems = checkContent()).length) boot.state = "fail";  // 파일은 왔는데 내용이 틀렸을 때
    })();
  },
  update() { if (boot.state === "ok" && clock > 0.4) { initWorld(); goTo("title"); } },
  draw() {
    background("#14101f");
    if (boot.state === "fail") return this.drawFail();
    txt("메타 투어 매홀", W / 2, H / 2 - 110, 44, { align: CENTER, bold: true, color: "#ffe27a" });
    const p = boot.step / (FILES.length + 2);
    push(); noStroke(); fill("rgba(255,255,255,0.15)"); rect(W / 2 - 220, H / 2 - 20, 440, 18, 9); fill("#4fd17a"); rect(W / 2 - 220, H / 2 - 20, 440 * p, 18, 9); pop();  // 진행 막대
    txt(`불러오는 중... ${Math.round(p * 100)}%  (${Math.floor(clock)}초)`, W / 2, H / 2 + 20, 22, { align: CENTER, color: "#d8d4ff" });
    [...FILES, ART].forEach((f, i) => {  // 파일마다 지금 어디서 받고 있는지
      const st = loadState[f.name];
      txt(`${f.what}   ${st ? "✓ " + st : phase[f.name] || "기다리는 중"}`, W / 2, H / 2 + 70 + i * 28, 17, { align: CENTER, color: st ? "#4fd17a" : "#b9b5e6" });
    });
  },
  drawFail() {  // 시작할 수 없을 때: 뭐가 왜 안 불러와졌는지, 어떻게 하면 되는지 알려줘요
    const [x, y, w, h] = [150, 60, 980, 600];
    if (boot.problems?.length) {  // 파일은 왔는데 content.js 내용이 틀렸을 때
      panel(x, y, w, h, { fill: "rgba(30,24,60,0.95)", border: "#ff9a9a" });
      txt("content.js 를 확인해 주세요", W / 2, y + 34, 28, { align: CENTER, bold: true, color: "#ff9a9a" });
      boot.problems.slice(0, 12).forEach((t, i) => txt(t, x + 50, y + 94 + i * 34, 18, { color: "#ffe9a8" }));
      txt("content.js 를 고친 뒤 에디터에서 ▶ 를 다시 누르거나, 브라우저에서는 새로고침(F5) 해 주세요", x + 50, y + h - 70, 17, { color: "#d8d4ff" });
      return;
    }
    panel(x, y, w, h, { fill: "rgba(30,24,60,0.95)", border: "#ff9a9a" });
    txt("게임 파일을 불러오지 못했어요", W / 2, y + 34, 28, { align: CENTER, bold: true, color: "#ff9a9a" });
    [...FILES, ART].forEach((f, i) => {
      const st = loadState[f.name] || "없음", yy = y + 84 + i * 80;
      txt(`${f.name}  (${f.what})`, x + 50, yy, 22, { color: "#ffffff" });
      txt(st === "없음" ? "✗ 없음" : `✓ ${st}`, x + w - 50, yy, 22, { align: RIGHT, color: st === "없음" ? "#ff9a9a" : "#4fd17a" });
      if (st === "없음") wrapText((tried[f.name] || []).join("  ·  "), w - 100, 13).slice(0, 3).forEach((l, j) => txt(l, x + 50, yy + 26 + j * 17, 13, { color: "#b9b5e6" }));  // 실패한 이유
    });
    ["이렇게 해 보세요", "1. 인터넷을 확인하고 [다시 시도]를 눌러요", "2. 학교·회사 인터넷은 github, amazonaws 주소를 막기도 해요. 집 인터넷이나 핫스팟으로 해 보세요",
      "3. 안 되면 [내 컴퓨터에서 파일 고르기]로 zip 을 푼 폴더의 content.js, data.js, art.png 를 직접 골라요", "4. 위 빨간 글자(실패 이유)를 알려 주시면 원인을 찾을 수 있어요"].forEach((s, i) => txt(s, x + 50, y + 340 + i * 34, i ? 17 : 22, { color: i ? "#d8d4ff" : "#ffe27a", bold: !i }));
    if (button("다시 시도", W / 2 - 330, y + h - 76, 250, 56, { size: 24 })) this.enter();
    if (button("내 컴퓨터에서 파일 고르기", W / 2 - 60, y + h - 76, 390, 56, { size: 24, ...BLUE })) pickFiles();
  },
};

// ===== 7. p5.js 시작점 =====
function setup() {
  const cv = createCanvas(W, H);
  if (!document.getElementById("game")) {  // index.html 이 기본 파일이어도 화면이 맞도록 직접 꾸며요
    document.body.insertAdjacentHTML("beforeend", '<div id="game"></div><style>html,body{margin:0;height:100%;background:#120d1a;overflow:hidden}#game{width:100%;height:100%;display:flex;align-items:center;justify-content:center}canvas{image-rendering:pixelated;width:min(100vw,177.78vh)!important;height:auto!important;display:block;outline:none}</style>');
  }
  cv.parent("game");  // 1280 x 720 그림판을 <div id="game"> 안에 만들어요
  cv.elt.tabIndex = 0; focusGame();  // 키보드를 받을 수 있게 해요
  pixelDensity(1);
  noSmooth();  // 그림을 확대해도 흐려지지 않게 (픽셀아트!)
  frameRate(60);
  goTo("boot");  // 불러오기 화면부터 시작
}

function draw() {
  const dt = Math.min(deltaTime / 1000, 0.05);  // 지난 프레임 이후 흐른 시간(초). 느린 컴퓨터도 속도가 같게 곱해 줘요
  clock += dt;
  cursor("default");
  drawingContext.imageSmoothingEnabled = false;
  if (was("KeyM")) muted = !muted;
  if (!settingsOpen) scenes[scene].update(dt);  // 1) 움직이기  (설정 창이 열려 있으면 멈춰요)
  scenes[scene].draw();  // 2) 그리기
  if (scene === "game" && mode !== "photo") drawToasts(dt);   // 사진이 떠 있는 동안은 알림을 잠깐 미뤄요
  drawSettings();
  if (click && scene === "game" && mode === "explore" && !settingsOpen) {  // 4) 남은 클릭: NPC면 대화, 아니면 그쪽으로 걷기
    const s = nearNpc && toScreen(nearNpc.x, nearNpc.y - 22);
    if (s && Math.hypot(click.x - s.x, click.y - s.y) < 46) scenes.game.talk(nearNpc); else walkHold = true;
  }
  if (!(scene === "game" && mode === "explore")) walkHold = false;
  pressed = {}; click = null; motion.nav = 0; motion.action = false;  // 3) 이번 프레임에만 유효한 입력 지우기
}

function mousePressed() { focusGame(); click = { x: mouseX, y: mouseY }; startAudio(); return false; }  // 마우스를 누르면 p5.js 가 자동으로 불러줘요
function mouseReleased() { walkHold = false; }
function keyPressed() { if ([32, 37, 38, 39, 40].includes(keyCode)) return false; }  // 스페이스/방향키로 페이지가 움직이지 않게
