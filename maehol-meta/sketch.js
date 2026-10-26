// noprotect
// =====================================================================
//  sketch.js  —  메타 투어 매홀 게임 코드 ① (p5.js)
// =====================================================================
//  게임 파일 6개 (폴더 없이 한 곳에 둬요)
//    index.html : 웹 페이지. 아래 파일들을 차례대로 불러와요
//    content.js : ★ 직접 고치는 파일 (설정 · 대사 · 퀴즈)
//    sketch.js  : 게임 코드 ①  ← 지금 이 파일
//    game.js    : 게임 코드 ②  (맵 · 티처블 머신 · 시작/캐릭터 선택/게임 화면)
//    data.js    : 맵 데이터와 글꼴   (프로그램이 만든 파일이라 고치지 않아요)
//    art.png    : 모든 그림을 한 장에 모은 것 (고치지 않아요)
//
//  이 파일의 차례
//    1. 기본 값            화면 크기, 캐릭터 목록, 진행 상황
//    2. 파일 불러오기       content.js · game.js · data.js · art.png (안 되면 인터넷에서 대신 가져와요)
//    3. 입력               키보드 · 마우스
//    4. 효과음
//    5. 화면 꾸미기 도구     글씨, 상자, 버튼, 알림, 대화창, 설정 창
//    6. 불러오기 화면 (boot)
//    7. p5.js 시작점        setup() 은 처음 한 번, draw() 는 1초에 60번 불려요
//  8 ~ 11 번은 game.js 에 있어요. (두 파일은 변수와 함수를 함께 써요)
//
//  ※ 지켜야 할 약속 (p5.js 웹 에디터 때문이에요)
//    - for(;;) · while 반복문을 쓰지 않아요. 반복은 for...of 나 times(n) 로 해요.
//    - 따옴표로 감싼 파일 이름(아래 2번의 src)은 이 파일에서 딱 한 번씩만 써요. 주석에도 쓰면 안 돼요.
//      에디터가 그 글자를 올린 파일의 긴 주소로 바꿔 버리기 때문이에요.
//    - p5.js 의 이름(text, rect, select, dist ...)과 겹치는 이름은 만들지 않아요.


// =====================================================================
//  1. 기본 값
// =====================================================================
const W = 1280, H = 720;        // 화면(캔버스) 크기
const Z = 2;                    // 맵을 몇 배로 키워서 보여 줄지
const T = 32;                   // 맵 한 칸(타일)의 크기 (픽셀)
const VW = W / Z, VH = H / Z;   // 화면에 보이는 맵의 넓이 (키우기 전)
const FONT = "Galmuri11";

// 반복 도우미: times(3) → [0, 1, 2]
const times = (n) => [...Array(n).keys()];

// 파일을 다 불러오면 채워져요
let MAP;     // 맵 (data.js)
let LIST;    // 그림 조각 위치 (data.js)
let SCRIPT;  // 대사 (content.js)
let QUIZ;    // 퀴즈 (content.js)

const AREAS = ["playground", "cafeteria", "gym", "library"];  // 소개를 들어야 하는 구역 (이 순서대로)
const STOPS = [["playground", "운동장"], ["cafeteria", "급식실"], ["gym", "체육관"], ["library", "도서관"], ["classroom", "교실"]];  // 위쪽 진행 바
const CHARS = [  // 고를 수 있는 캐릭터 (key = 캐릭터 그림 이름)
  { key: "donghun", name: "동훈", desc: "까만 머리의 씩씩한 친구" },
  { key: "minseong", name: "민성", desc: "동그란 안경이 잘 어울려요" },
  { key: "seongmin", name: "성민", desc: "모자가 멋진 유쾌한 친구" },
];
const charName = (key) => (CHARS.find((c) => c.key === key) || { name: "나" }).name;

// 진행 상황
let scene = "boot";        // 지금 화면: boot → title → select → game
let clock = 0;             // 지금 화면이 켜진 뒤 흐른 시간(초)
let charKey = "donghun";   // 내가 고른 캐릭터
let done = {};             // 소개를 끝낸 구역  예) { playground: true }
let quizDone = false;      // 퀴즈를 끝까지 풀었나
let best = null;           // 최고 퀴즈 점수 (저장하지 않아서 새로고침하면 처음부터예요)
try {
  localStorage.removeItem("maehol_best");  // 예전 버전이 브라우저에 저장해 둔 점수 지우기
} catch (e) {}


// =====================================================================
//  2. 파일 불러오기
//     파일마다 세 곳에서 "경주"를 시켜서 먼저 성공한 걸 써요.
//       1) 내 파일 (에디터에 올린 것)
//       2) 3초 안에 안 되면 GitHub  (raw.githubusercontent.com)
//       3) 또 3초 뒤 jsDelivr      (cdn.jsdelivr.net)
//     앞의 것이 실패하면 3초를 기다리지 않고 바로 다음 것을 시작해요.
// =====================================================================
const SHA = "bed7926cfd7262f927913158ac62b22708c0547e";  // 인터넷에 올려 둔 파일 버전(커밋 번호)
const ONLINE = [
  `https://raw.githubusercontent.com/MinsungKim805/Claude-projects/${SHA}/maehol-meta/`,
  `https://cdn.jsdelivr.net/gh/MinsungKim805/Claude-projects@${SHA}/maehol-meta/`,
];
// src  = 내 파일 (에디터가 긴 주소로 바꿔 줘요)
// name = 인터넷용 이름 (글자를 이어 붙여서 에디터가 바꾸지 못하게 해요)
// key  = 그 파일이 만들어 주는 이름 (이게 생기면 불러온 거예요)
const FILES = [
  { src: "content.js", name: ["content", "js"].join("."), key: "MAEHOL_QUIZ", what: "설정·대사·퀴즈" },
  { src: "game.js", name: ["game", "js"].join("."), key: "MAEHOL_GAME", what: "게임 코드 ②" },
  { src: "data.js", name: ["data", "js"].join("."), key: "MAEHOL_MAP", what: "맵 데이터·글꼴" },
];
const ART = { src: "art.png", name: ["art", "png"].join("."), what: "그림 묶음" };

const loadState = {};  // 파일 → 어디서 받았나 ("내 파일" / "인터넷" / "없음")
const tried = {};      // 파일 → 실패한 이유들 (실패 화면에 보여 줘요)
const phase = {};      // 파일 → 지금 하는 일 ("인터넷에서 받는 중" 등)
const manual = {};     // 파일 → 내 컴퓨터에서 직접 고른 파일 주소

const hostOf = (url) => {
  try {
    return new URL(url, document.baseURI).host;
  } catch (e) {
    return "?";
  }
};
// 실패 이유 적어 두기
function note(f, url, why) {
  const where = url.startsWith("blob:") ? "내 컴퓨터" : hostOf(url);
  (tried[f.name] = tried[f.name] || []).push(`${where} ${why}`);
}
// 글자로 받은 코드를 실행해요
function runScript(code) {
  const el = document.createElement("script");
  el.text = code;
  document.head.appendChild(el);
}

// tasks(가져오기 함수들)를 gap(ms) 간격으로 하나씩 시작해서, 제일 먼저 성공한 값을 돌려줘요. (모두 실패하면 null)
function firstOk(tasks, gap = 3000) {
  return new Promise((resolve) => {
    let next = 0;          // 다음에 시작할 순서
    let running = 0;       // 아직 안 끝난 가져오기 수
    let finished = false;
    let timer = 0;

    const finish = (value) => {
      finished = true;
      clearTimeout(timer);
      resolve(value);
    };
    const startNext = () => {
      clearTimeout(timer);
      if (finished || next >= tasks.length) return;
      const task = tasks[next++];
      running++;
      timer = setTimeout(startNext, gap);  // gap 이 지나도 안 끝나면 다음 것도 시작
      Promise.resolve()
        .then(task)
        .catch(() => null)
        .then((value) => {
          running--;
          if (finished) return;
          if (value) finish(value);
          else if (next < tasks.length) startNext();
          else if (running === 0) finish(null);
        });
    };
    startNext();
  });
}

// 파일 하나를 가져올 곳 목록: [어디서, 주소]
function sources(f) {
  if (manual[f.name]) return [["내 컴퓨터", manual[f.name]]];
  return [["내 파일", f.src], ...ONLINE.map((base) => ["인터넷", base + f.name])];
}
// get(주소) 로 여러 곳을 경주시켜요. 성공하면 [값, 어디서]
function fetchFirst(f, get) {
  return firstOk(sources(f).map(([who, src]) => async () => {
    phase[f.name] = who + "에서 받는 중";
    const value = await get(src, f);
    return value && [value, who];
  }));
}

// 주소의 글자(코드)를 받아요. 실패하면 null
async function fetchText(src, f) {
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout?.(40000) });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const code = await res.text();
    if (code.trimStart()[0] === "<") throw new Error("파일 대신 웹페이지가 왔어요");
    return code;
  } catch (e) {
    note(f, src, String(e.message || e).slice(0, 40));
    return null;
  }
}
// script 태그로 불러와 실행해요 (file:// 처럼 fetch 가 막힐 때). 성공하면 true
function tagScript(src, f) {
  return new Promise((resolve) => {
    const el = document.createElement("script");
    const end = (ok) => {
      clearTimeout(timer);
      if (!ok) note(f, src, "script 태그로도 실패");
      resolve(ok || null);
    };
    const timer = setTimeout(() => end(false), 40000);
    el.onload = () => end(true);
    el.onerror = () => end(false);
    el.src = src;
    document.head.appendChild(el);
  });
}
// content.js · game.js · data.js 불러오기. 돌려주는 값: 어디서 받았나 ("내 파일" / "인터넷" / "없음")
async function loadFile(f) {
  if (window[f.key]) return "내 파일";  // index.html 이 이미 불러왔어요

  const tryOne = async ([who, src]) => {
    phase[f.name] = who + "에서 받는 중";
    const code = await fetchText(src, f);
    if (code) return [code, who];
    // 내 파일을 글자로 못 읽었으면 script 태그로 한 번 더 해 봐요
    const canUseTag = who === "내 파일" && (/^https?:/.test(src) || location.protocol === "file:");
    if (canUseTag && (await tagScript(src, f)) && window[f.key]) return [true, who];
    return null;
  };
  const got = await firstOk(sources(f).map((s) => () => tryOne(s)));

  if (got && got[0] !== true) runScript(got[0]);  // 글자로 받은 코드는 여기서 실행
  if (!window[f.key]) return "없음";
  return got ? got[1] : "내 파일";
}

// ---- 그림: 모든 그림은 png 한 장에 묶여 있어요. 불러온 뒤 조각조각 잘라서 써요.
//      IMG.obj["desk"] = 책상,  IMG.spr["donghun"] = 동훈 그림판,  IMG.ui["star"] = 별,  IMG.bg = 맵 배경,  IMG.title = 시작 화면
const IMG = { obj: {}, spr: {}, ui: {}, bg: null, title: null };

function loadSheet(src, f) {
  return new Promise((resolve) => {
    const im = new Image();
    const fail = (why) => {
      clearTimeout(timer);
      note(f, src, why);
      resolve(null);
    };
    const timer = setTimeout(() => fail("시간 초과"), 40000);
    im.onload = () => {
      clearTimeout(timer);
      resolve(im);
    };
    im.onerror = () => fail("그림 불러오기 실패");
    im.src = src;
  });
}
// 묶음 그림을 조각으로 잘라요. 조각 위치는 data.js 의 LIST.rects 에 있어요.
// 조각 이름 앞에 "spr:" "ui:" "img:" 가 붙어 있으면 종류를 나타내요. (안 붙으면 가구·장식)
function sliceSheet(sheet) {
  for (const name in LIST.rects) {
    const [x, y, w, h] = LIST.rects[name];
    const cut = Object.assign(document.createElement("canvas"), { width: w, height: h });
    cut.getContext("2d").drawImage(sheet, x, y, w, h, 0, 0, w, h);
    const [kind, key] = name.split(":");
    if (kind === "img") IMG[key] = cut;
    else if (kind === "spr") IMG.spr[key] = cut;
    else if (kind === "ui") IMG.ui[key] = cut;
    else IMG.obj[name] = cut;
  }
}

// content.js 의 대사·퀴즈가 올바른지 점검해요. 문제 목록을 돌려줘요. (틀린 채 시작하면 게임 도중 멈추니까요)
function checkContent() {
  const bad = [];
  const S = SCRIPT, C = window.CONFIG;
  const isLines = (a) => Array.isArray(a) && a.length > 0 && a.every((t) => typeof t === "string");
  const hasNpc = (id, role) => MAP.npcs.some((n) => n.id === id && n.role === role);

  for (const a of AREAS) {
    if (!isLines(S.areas?.[a]?.lines)) bad.push(`areas.${a}.lines : 대사 목록이 비었거나 글이 아닌 게 있어요`);
    if (!hasNpc(S.areas?.[a]?.npc, "guide")) bad.push(`areas.${a}.npc : 안내 NPC 이름이 맞지 않아요 (haneul, doyun, seoyeon, jiu)`);
    if (!S.objective?.[a]) bad.push(`objective.${a} : 목표 문구가 없어요`);
  }
  for (const k of ["quiz", "done"]) {
    if (!S.objective?.[k]) bad.push(`objective.${k} : 목표 문구가 없어요`);
  }
  if (!hasNpc(S.quiz?.npc, "quiz")) bad.push("quiz.npc : 퀴즈 NPC 이름이 맞지 않아요 (banjang)");
  for (const k of ["locked", "intro", "again"]) {
    if (!isLines(S.quiz?.[k])) bad.push(`quiz.${k} : 대사 목록이 비었어요`);
  }

  if (!Array.isArray(QUIZ) || !QUIZ.length) bad.push("퀴즈가 하나도 없어요");
  else {
    QUIZ.forEach((q, i) => {
      const n = i + 1;
      if (!q.q || !Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 4) {
        bad.push(`퀴즈 ${n}번 : 문제(q)와 보기(choices 2~4개)가 필요해요`);
      } else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) {
        bad.push(`퀴즈 ${n}번 : answer 는 0부터 ${q.choices.length - 1} 사이 숫자여야 해요 (0 = 첫 번째 보기)`);
      }
    });
  }

  for (const k of ["PLAYER_SPEED", "TEXT_SPEED", "FACE_MIN_PROB", "FACE_HOLD_MS", "MOTION_MIN_PROB"]) {
    if (typeof C[k] !== "number") bad.push(`CONFIG.${k} : 숫자가 필요해요`);
  }
  return bad;
}

// 마지막 방법: zip 을 푼 폴더의 content.js, game.js, data.js, art.png 를 직접 골라요
function pickFiles() {
  const input = Object.assign(document.createElement("input"), { type: "file", multiple: true, accept: ".js,.png" });
  input.onchange = () => {
    for (const file of input.files) {
      const f = [...FILES, ART].find((x) => file.name.toLowerCase().startsWith(x.name.split(".")[0]));
      if (f) manual[f.name] = URL.createObjectURL(file);
    }
    scenes.boot.enter();  // 고른 파일로 다시 불러오기
  };
  input.click();
}

// ---- 캐릭터 그리기
//   캐릭터 그림판은 가로 3장(서기, 왼발, 오른발) x 세로 4줄(아래, 왼쪽, 오른쪽, 위)이고, 한 장은 30 x 46 픽셀이에요.
//   s = 확대 배율, crop = 한 장에서 일부만 오릴 때 [x, y, 가로, 세로]
const ROW = { down: 0, left: 1, right: 2, up: 3 };
const SIT = [9, 34];  // 앉은 모습: 뒷모습의 위쪽 34픽셀(머리~허리)만 9픽셀 내려 그려요
function sprite(key, dir, frame, x, y, s = 1, crop = [0, 0, 30, 46]) {
  const im = IMG.spr[key];
  if (!im) return;
  const [cx, cy, cw, ch] = crop;
  drawingContext.drawImage(im, frame * 30 + cx, ROW[dir] * 46 + cy, cw, ch, Math.round(x), Math.round(y), cw * s, ch * s);
}


// =====================================================================
//  3. 입력 (키보드 · 마우스)
//     키는 "KeyW", "Space", "ArrowUp" 같은 자판 위치 이름으로 확인해요. (한글 입력 상태여도 돼요)
//     down("ArrowUp") = 지금 누르고 있나?    was("Space") = 이번 프레임에 막 눌렀나?
// =====================================================================
let keys = {};      // 누르고 있는 키
let pressed = {};   // 이번 프레임에 막 눌린 키
let click = null;   // 이번 프레임의 클릭 위치 {x, y}
let keyEvents = 0;  // 키보드 입력이 한 번이라도 들어왔나 (안 들어오면 "화면을 클릭하세요" 안내)
let motion = { dir: null, action: false, nav: 0 };  // 티처블 머신 동작 인식 결과 (game.js 가 채워요)

const KEY_BY_NUMBER = { 87: "KeyW", 65: "KeyA", 83: "KeyS", 68: "KeyD", 69: "KeyE", 77: "KeyM", 32: "Space", 13: "Enter", 27: "Escape", 37: "ArrowLeft", 38: "ArrowUp", 39: "ArrowRight", 40: "ArrowDown" };
const KEY_BY_JAMO = { ㅈ: "KeyW", ㅉ: "KeyW", ㅁ: "KeyA", ㄴ: "KeyS", ㅇ: "KeyD", ㄷ: "KeyE", ㄸ: "KeyE", ㅡ: "KeyM" };  // 한글 자판으로 눌러도 같은 키

function keyId(e) {
  if (e.code && e.code !== "Unidentified") return e.code;  // 보통은 이걸로 충분해요
  if (KEY_BY_JAMO[e.key]) return KEY_BY_JAMO[e.key];       // code 가 없는 입력기 (일부 태블릿·크롬북)
  if (/^[0-9]$/.test(e.key)) return "Digit" + e.key;
  if (/^[a-z]$/i.test(e.key)) return "Key" + e.key.toUpperCase();
  return KEY_BY_NUMBER[e.keyCode] || e.key;
}
addEventListener("keydown", (e) => {
  const id = keyId(e);
  // 페이지가 스크롤되지 않게
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(id)) e.preventDefault();
  // Ctrl+S(저장)·Ctrl+D(북마크) 같은 브라우저 단축키 막기 (Ctrl+W 는 브라우저가 막지 못하게 해요)
  if ((e.ctrlKey || e.metaKey) && ["KeyA", "KeyS", "KeyD", "KeyE"].includes(id)) e.preventDefault();
  if (!e.repeat) pressed[id] = true;
  keys[id] = true;
  keyEvents++;
  startAudio();
});
addEventListener("keyup", (e) => (keys[keyId(e)] = false));
addEventListener("blur", () => (keys = {}));  // 다른 창으로 가면 누른 키를 모두 뗀 걸로

// 에디터처럼 게임이 작은 창(iframe) 안에 있으면 클릭해야 키보드가 들어와요. 클릭할 때마다 키보드를 게임에 맞춰요.
function focusGame() {
  try {
    window.focus();
    document.querySelector("canvas")?.focus({ preventScroll: true });
  } catch (e) {}
}

const down = (code) => keys[code];
const was = (code) => pressed[code];
const action = () => was("Space") || was("Enter") || was("KeyE") || motion.action;  // "확인" 키

// 이동 방향 {x, y} (-1 ~ 1). 키보드가 먼저, 안 누르면 마우스(누르고 있기), 그다음 동작 인식
let walkHold = false;  // 마우스(손가락)를 누른 채 걷는 중인가
function moveVec() {
  const right = down("KeyD") || down("ArrowRight"), left = down("KeyA") || down("ArrowLeft");
  const downKey = down("KeyS") || down("ArrowDown"), upKey = down("KeyW") || down("ArrowUp");
  let x = (right ? 1 : 0) - (left ? 1 : 0);
  let y = (downKey ? 1 : 0) - (upKey ? 1 : 0);
  if (x || y) return { x, y };

  if (walkHold && mouseIsPressed) {  // 화면을 누르고 있으면 그쪽으로 걸어요
    const p = toScreen(player.x, player.y - 20);
    const dx = mouseX - p.x, dy = mouseY - p.y, len = Math.hypot(dx, dy);
    if (len > 24) return { x: dx / len, y: dy / len };
  }
  if (motion.dir) {
    x = { left: -1, right: 1 }[motion.dir] || 0;
    y = { up: -1, down: 1 }[motion.dir] || 0;
  }
  return { x, y };
}
// 숫자 1~9 키 → 0~8 (안 눌렀으면 -1)
const numberKey = () => times(9).find((i) => was("Digit" + (i + 1)) || was("Numpad" + (i + 1))) ?? -1;
// 메뉴 위/아래: ↑ = -1, ↓ = 1
function navKey() {
  if (was("ArrowUp") || was("KeyW")) return -1;
  if (was("ArrowDown") || was("KeyS")) return 1;
  return motion.nav;
}


// =====================================================================
//  4. 효과음
//     소리 하나 = [높이(Hz), 길이(초), 파형, 크기] 를 순서대로 "삑삑" 내요. 숫자를 바꾸면 소리가 달라져요.
// =====================================================================
let audio = null, muted = false;
const SOUNDS = {
  blip: [[700, 0.04, "square", 0.025]],
  click: [[440, 0.05]],
  select: [[520, 0.07], [780, 0.09]],
  wrong: [[220, 0.25, "sawtooth"]],
  open: [[523, 0.12, "triangle"], [659, 0.12, "triangle"], [784, 0.12, "triangle"], [1047, 0.12, "triangle"]],
  correct: [[659, 0.14, "triangle"], [880, 0.14, "triangle"]],
  finish: [[523, 0.16, "triangle"], [659, 0.16, "triangle"], [784, 0.16, "triangle"], [1047, 0.16, "triangle"], [1319, 0.16, "triangle"]],
};
// 브라우저는 첫 입력(키·클릭) 뒤에야 소리를 허락해요
function startAudio() {
  if (!audio) {
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  } else if (audio.state === "suspended") audio.resume();
}
function sfx(name) {
  if (muted || !audio) return;
  SOUNDS[name].forEach(([freq, len, type = "square", vol = 0.05], i) => {
    const t0 = audio.currentTime + i * 0.09;
    const osc = audio.createOscillator(), gain = audio.createGain();
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
//  5. 화면 꾸미기 도구 (p5.js 로 그려요)
// =====================================================================
// 색 묶음 (버튼에 써요)
const BLUE = { fill: "#9ad0ff", hoverFill: "#c6e6ff", border: "#1f4a7a", color: "#12304f" };
const PINK = { fill: "#ff9aa8", hoverFill: "#ffc4cc", border: "#7a1f2f", color: "#4f1220" };
const GRAY = { fill: "#c9c6ff", hoverFill: "#e4e2ff", border: "#3a3670", color: "#26225a" };

// 글씨 쓰기.  o = { align, valign, bold, color, outline(테두리 색), outlineW(테두리 굵기) }
function txt(s, x, y, size, o = {}) {
  push();
  textFont(FONT);
  textSize(size);
  textStyle(o.bold ? BOLD : NORMAL);
  textAlign(o.align || LEFT, o.valign || TOP);
  if (o.outline) {
    stroke(o.outline);
    strokeWeight(o.outlineW || 3);
    strokeJoin(ROUND);
  } else noStroke();
  fill(o.color || "#fff");
  text(String(s), Math.round(x), Math.round(y));
  pop();
}
// 글씨의 가로 길이
function textW(s, size, bold) {
  push();
  textFont(FONT);
  textSize(size);
  textStyle(bold ? BOLD : NORMAL);
  const w = textWidth(s);
  pop();
  return w;
}
// 긴 글을 maxW 너비에 맞게 여러 줄로 나눠요 (글자 단위). 한 번 나눈 결과는 기억해 둬요.
const wrapMemo = new Map();
function wrapText(s, maxW, size, bold) {
  const memoKey = `${s}|${maxW}|${size}|${bold}`;
  if (wrapMemo.has(memoKey)) return wrapMemo.get(memoKey);
  const lines = [];
  for (const para of String(s).split("\n")) {
    let cur = "";
    for (const ch of para) {
      if (textW(cur + ch, size, bold) > maxW) {
        lines.push(cur);
        cur = "";
      }
      cur += ch;
    }
    lines.push(cur);
  }
  if (wrapMemo.size > 300) wrapMemo.clear();
  wrapMemo.set(memoKey, lines);
  return lines;
}
// 둥근 상자.  o = { fill, border, r(둥글기), bw(테두리 굵기), shadow(false 면 그림자 없음) }
function panel(x, y, w, h, o = {}) {
  push();
  if (o.shadow !== false) {
    noStroke();
    fill(0, 0, 0, 70);
    rect(x + 4, y + 6, w, h, o.r ?? 10);
  }
  fill(o.fill || "rgba(22,24,52,0.94)");
  stroke(o.border || "#8f94ff");
  strokeWeight(o.bw ?? 4);
  rect(x, y, w, h, o.r ?? 10);
  pop();
}
// 화면 전체를 어둡게 (a = 0~1)
function dim(a) {
  push();
  noStroke();
  fill(8, 6, 20, 255 * a);
  rect(0, 0, W, H);
  pop();
}
// 마우스가 사각형 위에 있나
const hover = (x, y, w, h) => mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
// 이번 프레임의 클릭이 사각형 안이면 true (클릭은 한 번 쓰면 없어져요)
function clicked(x, y, w, h) {
  if (click && click.x >= x && click.x <= x + w && click.y >= y && click.y <= y + h) {
    click = null;
    return true;
  }
  return false;
}
// 버튼을 그리고, 클릭됐으면 true.   예) if (button("시작", 100, 100, 200, 60)) { ... }
//   o = { size(글씨 크기), fill, hoverFill, border, color, focus }
//   focus: true 면 방향키로 골라진 버튼이라 하얀 테두리가 반짝여요
function button(label, x, y, w, h, o = {}) {
  const on = hover(x, y, w, h);
  const lit = on || o.focus;
  const lift = lit ? -2 : 0;  // 골라지면 살짝 떠올라요
  push();
  noStroke();
  fill(0, 0, 0, 80);
  rect(x + 3, y + 5, w, h, 10);  // 그림자
  if (o.focus) {
    noFill();
    stroke(255, 255, 255, 150 + 105 * Math.sin(clock * 8));
    strokeWeight(4);
    rect(x - 7, y - 7 + lift, w + 14, h + 14, 14);
  }
  fill(lit ? o.hoverFill || "#ffe680" : o.fill || "#ffd34a");
  stroke(o.border || "#7a4a10");
  strokeWeight(4);
  rect(x, y + lift, w, h, 10);
  pop();
  txt(label, x + w / 2, y + h / 2 + lift + 1, o.size || 22, { align: CENTER, valign: CENTER, bold: true, color: o.color || "#5a2a08" });
  if (on) cursor("pointer");
  if (on && click) {
    click = null;
    sfx("click");
    return true;
  }
  return false;
}
// 캐릭터 머리 위 이름표 (ZEP처럼)
function nameTag(name, sx, sy, color, bg) {
  const w = Math.ceil(textW(name, 11, true)) + 14;
  push();
  noStroke();
  fill(bg);
  rect(Math.round(sx - w / 2), Math.round(sy - 18), w, 18, 9);
  pop();
  txt(name, sx, sy - 8, 11, { align: CENTER, valign: CENTER, bold: true, color });
}
// [Space] 같은 키 모양. 가로 길이를 돌려줘요
function keycap(label, x, y) {
  const w = Math.max(26, textW(label, 11, true) + 14);
  panel(x, y, w, 22, { fill: "#f4f1ff", border: "#5a56a0", bw: 2, r: 5, shadow: false });
  txt(label, x + w / 2, y + 12, 11, { align: CENTER, valign: CENTER, bold: true, color: "#3a3670" });
  return w;
}

// ---- 알림: 위쪽에 잠깐 떴다 사라져요.   toast("문이 열렸어요!", "check")  (두 번째 = 아이콘 이름)
let toasts = [];
const TOAST_LIFE = 3.6;  // 알림이 떠 있는 시간(초)
function toast(msg, icon) {
  toasts.push({ msg, icon, age: 0 });
  if (toasts.length > 3) toasts.shift();  // 최대 3개
}
function drawToasts(dt) {
  toasts.forEach((t) => (t.age += dt));
  toasts = toasts.filter((t) => t.age < TOAST_LIFE);
  toasts.forEach((t, i) => {
    const w = Math.max(260, textW(t.msg, 22, true) + 70);
    const x = W / 2 - w / 2, y = 96 + i * 62;
    const im = IMG.ui[t.icon];
    const iconW = im ? 50 : 0;
    push();
    drawingContext.globalAlpha = Math.max(0, Math.min(1, t.age / 0.2, (TOAST_LIFE - t.age) / 0.4));  // 서서히 나타났다 사라져요
    panel(x, y, w, 52, { fill: "rgba(30,28,70,0.95)", border: "#ffd34a", r: 14 });
    if (im) drawingContext.drawImage(im, x + 16, y + 26 - im.height, im.width * 2, im.height * 2);
    txt(t.msg, x + iconW + (w - iconW) / 2, y + 27, 22, { align: CENTER, valign: CENTER, bold: true });
    pop();
  });
}

// ---- 대화창: NPC가 말할 때 아래쪽에 나와요.   d = { npc, lines, idx(몇 번째 줄), shown(보여 준 글자 수), done(다 나왔나) }
function drawDialogue(d) {
  const [x, y, w, h] = [90, 500, 1100, 196];
  const name = d.npc.name, nameW = Math.max(120, textW(name, 22, true) + 44);
  panel(x, y, w, h, { fill: "rgba(20,22,50,0.95)", border: "#ffe27a", r: 14 });
  panel(x + 28, y - 22, nameW, 40, { fill: "#ffd34a", border: "#7a4a10", shadow: false });  // 이름표
  txt(name, x + 28 + nameW / 2, y - 2, 22, { align: CENTER, valign: CENTER, bold: true, color: "#5a2a08" });

  panel(x + 28, y + 30, 132, 132, { fill: "#e8e4ff", r: 12, shadow: false });  // 얼굴: 캐릭터 그림의 머리 부분을 4배로
  drawingContext.imageSmoothingEnabled = false;
  sprite(d.npc.key, "down", 0, x + 42, y + 36, 4, [2, 0, 26, 30]);

  let left = Math.floor(d.shown);  // 글씨는 한 글자씩 나타나요
  let ly = y + 36;
  for (const line of wrapText(d.lines[d.idx], w - 230, 22)) {
    if (left <= 0) break;
    txt(line.slice(0, left), x + 190, ly, 22);
    left -= line.length;
    ly += 36;
  }
  if (d.done) {  // 다 나왔으면 깜빡이는 ▼
    push();
    noStroke();
    fill(255, 226, 122, 255 * (0.5 + 0.5 * Math.sin(clock * 6)));
    triangle(x + w - 60, y + h - 44, x + w - 36, y + h - 44, x + w - 48, y + h - 28);
    pop();
    txt("Space / 클릭", x + w - 40, y + h - 28, 11, { align: RIGHT, color: "rgba(255,255,255,0.6)" });
  }
}

// ---- 설정 창: 조작 방법과 티처블 머신 연결 상태 (Esc · 설정 버튼으로 열어요)
let settingsOpen = false;    // 열려 있나
let settingsInGame = false;  // 게임 중에 열었나 ([처음으로] 버튼을 보여 줘요)
let settingsFrame = 0;       // 연 프레임 (연 그 키로 바로 닫히지 않게)
function showSettings(inGame) {
  settingsOpen = true;
  settingsInGame = inGame;
  settingsFrame = frameCount;
}
// 티처블 머신 상태 한 줄: [글, 색]
function tmStatusText(url, r) {
  if (!url) return ["링크가 비어 있어요 (키보드/마우스 사용)", "#b8b8d8"];
  if (tm.error) return ["카메라 오류: " + tm.error, "#ff9a9a"];
  if (r.status.startsWith("준비됨")) return ["연결됨", "#8affb0"];
  return [r.status === "off" ? "아직 시작하지 않았어요" : r.status, "#ffe27a"];
}
function drawSettings() {
  if (!settingsOpen) return;
  if ((was("Escape") || was("Space")) && frameCount !== settingsFrame) {  // Esc · Space 로 닫기
    settingsOpen = false;
    return;
  }
  dim(0.6);
  const [x, y, w, h] = [240, 70, 800, 580];
  panel(x, y, w, h, { fill: "rgba(24,26,58,0.98)", border: "#ffe27a", r: 16 });
  txt("설정 / 조작 방법", x + w / 2, y + 22, 30, { align: CENTER, bold: true, color: "#ffe27a" });

  const rows = [
    ["이동", "방향키  또는  W A S D"],
    ["대화 / 선택", "Space  (Enter · E · 마우스 클릭도 돼요)"],
    ["퀴즈 답 고르기", "↑ ↓ 로 고르고 Space  (1 2 3 4 · 클릭도 돼요)"],
    ["소리 켜기/끄기", "M"],
    ["이 창 열기/닫기", "Esc  (닫기는 Space 도 돼요)"],
  ];
  rows.forEach(([a, b], i) => {
    txt(a, x + 50, y + 82 + i * 42, 22, { bold: true, color: "#9ad0ff" });
    txt(b, x + 290, y + 82 + i * 42, 22);
  });

  txt("티처블 머신", x + 50, y + 312, 24, { bold: true, color: "#ffe27a" });
  const tmRows = [["얼굴 인식 (캐릭터 선택)", tmFaceUrl(), tm.face], ["동작 인식 (캐릭터 이동)", tmMotionUrl(), tm.motion]];
  tmRows.forEach(([name, url, r], i) => {
    const [text, color] = tmStatusText(url, r);
    txt(name, x + 50, y + 352 + i * 38, 22);
    txt(text, x + 400, y + 352 + i * 38, 22, { color });
  });
  txt("링크는 content.js 맨 위에 붙여 넣어요.", x + 50, y + 432, 11, { color: "rgba(255,255,255,0.65)" });

  const by = y + h - 84;
  if (button("닫기", x + 60, by, 200, 56, { size: 24 })) settingsOpen = false;
  if (button(muted ? "소리 켜기" : "소리 끄기", x + 290, by, 200, 56, BLUE)) muted = !muted;
  if (settingsInGame && button("처음으로", x + 520, by, 220, 56, PINK)) {
    settingsOpen = false;
    goTo("title");
  }
}


// =====================================================================
//  6. 화면들
//     boot(불러오기) → title(시작) → select(캐릭터 선택) → game(게임)
//     화면마다 enter(들어올 때 한 번) / update(움직이기) / draw(그리기) 가 있어요.
//     boot 는 여기, 나머지는 game.js 에 있어요.
// =====================================================================
const scenes = {};
function goTo(name, arg) {
  scene = name;
  clock = 0;
  scenes[name].enter?.(arg);
}

// ---- 불러오기 화면
let boot = { step: 0, state: "loading" };  // step: 끝낸 일 수 (0~4),  state: loading → ok / fail
scenes.boot = {
  enter() {
    boot = { step: 0, state: "loading", problems: [] };
    for (const o of [loadState, tried, phase]) Object.keys(o).forEach((k) => delete o[k]);
    this.loadAll();
  },
  async loadAll() {
    // 세 파일과 그림을 동시에 가져와요
    const tasks = FILES.map(async (f) => {
      loadState[f.name] = await loadFile(f);
      boot.step++;
    });
    const artTask = fetchFirst(ART, loadSheet).then((got) => {
      loadState[ART.name] = got ? got[1] : "없음";
      boot.step++;
      return got;
    });
    const [sheet] = (await artTask) || [];
    await Promise.all(tasks);

    MAP = window.MAEHOL_MAP;
    LIST = window.MAEHOL_ASSETS;
    SCRIPT = window.MAEHOL_SCRIPT;
    QUIZ = window.MAEHOL_QUIZ;
    if (sheet && LIST) sliceSheet(sheet);

    const fonts = ["22px Galmuri11", "bold 22px Galmuri11", "11px Galmuri11"];  // 글꼴 (data.js 안에 들어 있어요)
    await Promise.all(fonts.map((f) => document.fonts.load(f, "매홀중학교 ABC"))).catch(() => {});
    boot.step++;

    const ready = MAP && LIST && SCRIPT && QUIZ && window.CONFIG && window.MAEHOL_GAME && IMG.bg && IMG.title;
    boot.state = ready ? "ok" : "fail";
    if (ready) {
      boot.problems = checkContent();  // 파일은 왔는데 content.js 내용이 틀렸을 때
      if (boot.problems.length) boot.state = "fail";
    }
  },
  update() {
    if (boot.state === "ok" && clock > 0.4) {
      initWorld();
      goTo("title");
    }
  },
  draw() {
    background("#14101f");
    if (boot.state === "fail") return this.drawFail();
    txt("메타 투어 매홀", W / 2, H / 2 - 110, 44, { align: CENTER, bold: true, color: "#ffe27a" });
    const p = boot.step / (FILES.length + 2);
    push();  // 진행 막대
    noStroke();
    fill("rgba(255,255,255,0.15)");
    rect(W / 2 - 220, H / 2 - 20, 440, 18, 9);
    fill("#4fd17a");
    rect(W / 2 - 220, H / 2 - 20, 440 * p, 18, 9);
    pop();
    txt(`불러오는 중... ${Math.round(p * 100)}%  (${Math.floor(clock)}초)`, W / 2, H / 2 + 20, 22, { align: CENTER, color: "#d8d4ff" });
    [...FILES, ART].forEach((f, i) => {  // 파일마다 지금 어디서 받고 있는지
      const st = loadState[f.name];
      const msg = st ? "✓ " + st : phase[f.name] || "기다리는 중";
      txt(`${f.what}   ${msg}`, W / 2, H / 2 + 70 + i * 28, 17, { align: CENTER, color: st ? "#4fd17a" : "#b9b5e6" });
    });
  },
  // 시작할 수 없을 때: 뭐가 왜 안 불러와졌는지, 어떻게 하면 되는지 알려 줘요
  drawFail() {
    const [x, y, w, h] = [150, 60, 980, 600];
    panel(x, y, w, h, { fill: "rgba(30,24,60,0.95)", border: "#ff9a9a" });

    if (boot.problems?.length) {  // 파일은 왔는데 content.js 내용이 틀렸을 때
      txt("content.js 를 확인해 주세요", W / 2, y + 34, 28, { align: CENTER, bold: true, color: "#ff9a9a" });
      boot.problems.slice(0, 12).forEach((t, i) => txt(t, x + 50, y + 94 + i * 34, 18, { color: "#ffe9a8" }));
      txt("content.js 를 고친 뒤 에디터에서 ▶ 를 다시 누르거나, 브라우저에서는 새로고침(F5) 해 주세요", x + 50, y + h - 70, 17, { color: "#d8d4ff" });
      return;
    }

    txt("게임 파일을 불러오지 못했어요", W / 2, y + 34, 28, { align: CENTER, bold: true, color: "#ff9a9a" });
    [...FILES, ART].forEach((f, i) => {
      const st = loadState[f.name] || "없음", yy = y + 84 + i * 62, ok = st !== "없음";
      txt(`${f.name}  (${f.what})`, x + 50, yy, 22, { color: "#ffffff" });
      txt(ok ? `✓ ${st}` : "✗ 없음", x + w - 50, yy, 22, { align: RIGHT, color: ok ? "#4fd17a" : "#ff9a9a" });
      if (!ok) {  // 실패한 이유
        const why = wrapText((tried[f.name] || []).join("  ·  "), w - 100, 13).slice(0, 3);
        why.forEach((l, j) => txt(l, x + 50, yy + 26 + j * 17, 13, { color: "#b9b5e6" }));
      }
    });
    const help = [
      "이렇게 해 보세요",
      "1. 인터넷을 확인하고 [다시 시도]를 눌러요",
      "2. 학교·회사 인터넷은 github, amazonaws 주소를 막기도 해요. 집 인터넷이나 핫스팟으로 해 보세요",
      "3. 안 되면 [내 컴퓨터에서 파일 고르기]로 zip 을 푼 폴더의 content.js, game.js, data.js, art.png 를 직접 골라요",
      "4. 위 빨간 글자(실패 이유)를 알려 주시면 원인을 찾을 수 있어요",
    ];
    help.forEach((s, i) => txt(s, x + 50, y + 352 + i * 34, i ? 17 : 22, { color: i ? "#d8d4ff" : "#ffe27a", bold: !i }));
    if (button("다시 시도", W / 2 - 330, y + h - 76, 250, 56, { size: 24 })) this.enter();
    if (button("내 컴퓨터에서 파일 고르기", W / 2 - 60, y + h - 76, 390, 56, { size: 24, ...BLUE })) pickFiles();
  },
};


// =====================================================================
//  7. p5.js 시작점
// =====================================================================
function setup() {
  const cv = createCanvas(W, H);
  if (!document.getElementById("game")) {  // index.html 이 기본 파일이어도 화면이 맞도록 직접 꾸며요
    document.body.insertAdjacentHTML("beforeend", '<div id="game"></div><style>html,body{margin:0;height:100%;background:#120d1a;overflow:hidden}#game{width:100%;height:100%;display:flex;align-items:center;justify-content:center}canvas{image-rendering:pixelated;width:min(100vw,177.78vh)!important;height:auto!important;display:block;outline:none}</style>');
  }
  cv.parent("game");       // 1280 x 720 그림판을 <div id="game"> 안에 만들어요
  cv.elt.tabIndex = 0;     // 키보드를 받을 수 있게
  focusGame();
  pixelDensity(1);
  noSmooth();              // 그림을 키워도 흐려지지 않게 (픽셀아트!)
  frameRate(60);
  goTo("boot");            // 불러오기 화면부터 시작
}

function draw() {
  const dt = Math.min(deltaTime / 1000, 0.05);  // 지난 프레임 뒤 흐른 시간(초). 느린 컴퓨터도 같은 속도로 움직이게 곱해 줘요
  clock += dt;
  cursor("default");
  drawingContext.imageSmoothingEnabled = false;
  if (was("KeyM")) muted = !muted;

  if (!settingsOpen) scenes[scene].update(dt);  // 1) 움직이기 (설정 창이 열려 있으면 멈춰요)
  scenes[scene].draw();                         // 2) 그리기
  if (scene === "game" && mode !== "photo") drawToasts(dt);  // 사진이 떠 있는 동안은 알림을 잠깐 미뤄요
  drawSettings();

  // 3) 아무도 안 쓴 클릭: NPC를 눌렀으면 대화, 아니면 그쪽으로 걷기
  if (click && scene === "game" && mode === "explore" && !settingsOpen) {
    const s = nearNpc && toScreen(nearNpc.x, nearNpc.y - 22);
    if (s && Math.hypot(click.x - s.x, click.y - s.y) < 46) scenes.game.talk(nearNpc);
    else walkHold = true;
  }
  if (!(scene === "game" && mode === "explore")) walkHold = false;

  // 4) 이번 프레임에만 쓰는 입력 지우기
  pressed = {};
  click = null;
  motion.nav = 0;
  motion.action = false;
}

// 마우스를 누르면 p5.js 가 불러줘요
function mousePressed() {
  focusGame();
  click = { x: mouseX, y: mouseY };
  startAudio();
  return false;
}
function mouseReleased() {
  walkHold = false;
}
// 스페이스·방향키로 페이지가 움직이지 않게
function keyPressed() {
  if ([32, 37, 38, 39, 40].includes(keyCode)) return false;
}
