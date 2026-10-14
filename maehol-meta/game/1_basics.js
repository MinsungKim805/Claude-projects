// =====================================================================
//  game/1_basics.js  —  기본 도구 모음
//
//  이 파일은 게임 전체가 같이 쓰는 "공용 도구"를 담고 있어요.
//    1) MH       : 게임의 공용 상자 (크기, 진행 상황, 장면 전환)
//    2) 이미지 불러오기
//    3) Input    : 키보드 / 마우스 입력
//    4) Sfx      : 효과음
//
//  고쳐 볼 만한 곳:  효과음의 높낮이(Sfx 안의 숫자), 화면 크기(MH.W / MH.H)
// =====================================================================


// ---------------------------------------------------------------------
// 1) MH : 게임의 공용 상자
//    여러 파일이 이 상자 하나를 같이 써서 서로의 데이터를 주고받아요.
// ---------------------------------------------------------------------
const MH = (window.MH = {
  W: 1280,        // 화면 가로 크기(픽셀)
  H: 720,         // 화면 세로 크기(픽셀)
  ZOOM: 2,        // 맵을 2배로 확대해서 보여줘요 (픽셀아트가 또렷하게 보여요)
  scenes: {},     // 화면(장면)들이 여기에 등록돼요: title, select, play ...
  scene: null,    // 지금 보여주고 있는 화면
});

// 게임을 하는 동안 바뀌는 "진행 상황"
MH.state = {
  charKey: "donghun",   // 내가 고른 캐릭터 (donghun / minseong / seongmin)
  done: {},             // 소개를 끝낸 구역. 예) { playground: true, cafeteria: true }
  quizDone: false,      // 퀴즈를 풀었는지
  best: null,           // 퀴즈 최고 점수
  reset() {
    this.done = {};
    this.quizDone = false;
  },
};

// ---- 자주 쓰는 계산 도구들 ----
MH.clamp = (v, min, max) => Math.max(min, Math.min(max, v));   // v를 min~max 사이로 묶기
MH.lerp = (a, b, t) => a + (b - a) * t;                        // a에서 b로 t만큼 부드럽게 가기
MH.dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);    // 두 점 사이 거리
MH.rnd = (a, b) => a + Math.random() * (b - a);                // a~b 사이 랜덤 숫자
// 글자 비교할 때 대소문자/띄어쓰기를 무시하려고 정리해 줘요. "No one" -> "noone"
MH.norm = (s) => String(s == null ? "" : s).toLowerCase().replace(/\s+/g, "");

// 최고 점수는 이 브라우저에만 저장해요. (저장이 막혀 있어도 게임은 잘 돌아가요)
MH.loadBest = function () {
  try {
    const v = localStorage.getItem("maehol_best");
    MH.state.best = v == null ? null : parseInt(v, 10);
  } catch (e) {
    MH.state.best = null;
  }
};
MH.saveBest = function (score) {
  if (MH.state.best == null || score > MH.state.best) {
    MH.state.best = score;
    try {
      localStorage.setItem("maehol_best", String(score));
    } catch (e) {}
  }
};

// 화면 바꾸기.  MH.go("select")  -> 캐릭터 선택 화면으로
MH.go = function (name, arg) {
  const next = MH.scenes[name];
  if (!next) return;
  MH.scene = next;
  if (next.enter) next.enter(arg);   // 화면에 들어올 때 한 번 실행되는 함수
};


// ---------------------------------------------------------------------
// 2) 이미지 불러오기
//    assets 폴더의 그림 파일들을 미리 불러와서 MH.A 에 넣어 둬요.
//      MH.A.obj["desk"]      -> 책상 그림
//      MH.A.spr["donghun"]   -> 동훈 캐릭터 시트(여러 모습이 한 장에 들어 있어요)
//      MH.A.bg               -> 맵 전체 배경(바닥 + 벽)
// ---------------------------------------------------------------------
MH.A = {
  obj: {}, spr: {}, portrait: {}, ui: {},
  bg: null, title: null,
  loaded: 0, total: 0, ready: false, errors: [],
};

MH.loadAssets = function () {
  const LIST = window.MAEHOL_ASSETS;    // game/map_data.js 에 들어 있는 이미지 목록
  const A = MH.A;
  const jobs = [];

  // 그림 하나를 불러오는 함수. 다 불러오면 set(그림)을 실행해서 A 에 넣어 줘요.
  function load(url, set) {
    A.total++;
    jobs.push(
      new Promise((done) => {
        const im = new Image();
        im.onload = () => { A.loaded++; set(im); done(); };
        im.onerror = () => { A.loaded++; A.errors.push(url); done(); };
        im.src = url;
      })
    );
  }

  // 가구/소품/벽 장식 (오브젝트 하나당 PNG 하나)
  for (const name in LIST.objects) {
    load("assets/objects/" + LIST.objects[name].file, (im) => (A.obj[name] = im));
  }
  // 캐릭터 시트 + 얼굴 그림
  for (const key in LIST.sprites) {
    A.portrait[key] = {};
    load(`assets/sprites/${key}.png`, (im) => (A.spr[key] = im));
    load(`assets/portraits/${key}.png`, (im) => (A.portrait[key].face = im));
    if (LIST.sprites[key].full) load(`assets/portraits/${key}_full.png`, (im) => (A.portrait[key].full = im));
  }
  // 아이콘, 맵 배경, 시작 화면
  for (const u of LIST.ui) load(`assets/ui/${u}.png`, (im) => (A.ui[u] = im));
  load("assets/backgrounds/map.png", (im) => (A.bg = im));
  if (LIST.title) load("assets/backgrounds/title.png", (im) => (A.title = im));

  return Promise.all(jobs).then(() => { A.ready = true; });
};

// 캐릭터 시트에서 "한 장면"만 오려서 그려요.
//   시트는 가로로 프레임 3개(0 서기, 1 왼발, 2 오른발), 세로로 방향 4개가 들어 있어요.
const SHEET_ROW = { down: 0, left: 1, right: 2, up: 3 };
MH.drawSprite = function (ctx, key, dir, frame, x, y) {
  const sheet = MH.A.spr[key];
  if (!sheet) return;
  const info = window.MAEHOL_ASSETS.sprites[key];
  const sx = frame * info.w;            // 시트에서 오려 낼 위치
  const sy = SHEET_ROW[dir] * info.h;
  ctx.drawImage(sheet, sx, sy, info.w, info.h, Math.round(x), Math.round(y), info.w, info.h);
};


// ---------------------------------------------------------------------
// 3) Input : 키보드와 마우스
//    - 키는 "KeyW" 같은 코드로 확인해요. 한글 입력 상태여도 WASD가 잘 먹어요.
//    - was("Space") : 이번 프레임에 막 눌렸는지(한 번만 true)
//    - down("KeyW") : 지금 누르고 있는지
// ---------------------------------------------------------------------
const Input = (MH.Input = {
  keys: {},          // 누르고 있는 키
  pressed: {},       // 이번 프레임에 새로 눌린 키
  click: null,       // 이번 프레임의 마우스 클릭 위치 {x, y}
  motionDir: null,   // 티처블 머신 동작 인식이 알려 주는 방향
  motionAction: false,
  _motionNav: 0,
  _lastMotionDir: null,

  // 게임이 시작될 때 한 번 실행: 키보드 감시를 켜요.
  init() {
    const BLOCK = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];  // 페이지가 스크롤되지 않게 막을 키
    window.addEventListener("keydown", (e) => {
      if (BLOCK.includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      Sfx.unlock();   // 브라우저는 첫 입력 뒤에야 소리를 허락해요
    });
    window.addEventListener("keyup", (e) => { this.keys[e.code] = false; });
    window.addEventListener("blur", () => { this.keys = {}; });   // 창을 벗어나면 키 초기화
  },

  down(code) { return !!this.keys[code]; },
  was(code) { return !!this.pressed[code]; },

  // 이동 방향을 {x, y} 로 알려 줘요. (-1, 0, 1)
  //   WASD / 방향키가 우선이고, 아무 키도 안 눌렸으면 티처블 머신 동작 인식을 써요.
  move() {
    let x = 0, y = 0;
    if (this.down("KeyA") || this.down("ArrowLeft")) x -= 1;
    if (this.down("KeyD") || this.down("ArrowRight")) x += 1;
    if (this.down("KeyW") || this.down("ArrowUp")) y -= 1;
    if (this.down("KeyS") || this.down("ArrowDown")) y += 1;
    if (!x && !y && this.motionDir) {
      if (this.motionDir === "left") x = -1;
      if (this.motionDir === "right") x = 1;
      if (this.motionDir === "up") y = -1;
      if (this.motionDir === "down") y = 1;
    }
    return { x, y };
  },

  // "확인" 키(대화 넘기기, 선택): Space, Enter, E, 또는 동작 인식의 '확인'
  action() {
    return this.was("Space") || this.was("Enter") || this.was("NumpadEnter") || this.was("KeyE") || this.motionAction;
  },

  // 메뉴에서 위/아래로 움직이기: -1(위), +1(아래), 0(안 움직임)
  nav() {
    if (this.was("ArrowUp") || this.was("KeyW")) return -1;
    if (this.was("ArrowDown") || this.was("KeyS")) return 1;
    return this._motionNav;
  },

  // 숫자키 1~9를 눌렀으면 0~8, 아니면 -1
  number() {
    for (let i = 0; i < 9; i++) {
      if (this.was("Digit" + (i + 1)) || this.was("Numpad" + (i + 1))) return i;
    }
    return -1;
  },

  // 티처블 머신(teachable.js)이 동작 인식 결과를 여기에 알려 줘요.
  setMotion(dir, action) {
    this.motionDir = dir || null;
    if (dir !== this._lastMotionDir) {
      this._motionNav = dir === "up" ? -1 : dir === "down" ? 1 : 0;
      this._lastMotionDir = dir;
    }
    if (action) this.motionAction = true;
  },

  // 클릭이 사각형(x, y, 가로 w, 세로 h) 안에서 일어났는지 확인해요. 맞으면 클릭을 "써 버려요".
  clicked(x, y, w, h) {
    const c = this.click;
    if (c && c.x >= x && c.x <= x + w && c.y >= y && c.y <= y + h) {
      this.click = null;
      return true;
    }
    return false;
  },

  // 매 프레임이 끝날 때 "이번 프레임에만 유효한 것들"을 지워요.
  endFrame() {
    this.pressed = {};
    this.click = null;
    this.motionAction = false;
    this._motionNav = 0;
  },
});


// ---------------------------------------------------------------------
// 4) Sfx : 효과음
//    소리 파일 없이 "삑" 소리를 직접 만들어요. tone(높이, 길이, ...)
// ---------------------------------------------------------------------
const Sfx = (MH.Sfx = {
  ctx: null,
  muted: false,

  // 소리를 쓸 수 있게 준비해요. (키보드/마우스를 처음 쓸 때 자동으로 불려요)
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch (e) {}
  },

  // 소리 하나 내기. freq=높이(Hz), dur=길이(초), vol=크기, slideTo=끝에서의 높이, delay=늦게 시작할 시간
  tone(freq, dur, type = "square", vol = 0.05, slideTo = null, delay = 0) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.linearRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },

  // 자주 쓰는 소리들 (숫자를 바꾸면 소리가 달라져요)
  blip() { this.tone(660 + Math.random() * 120, 0.04, "square", 0.025); },     // 대화 글자 소리
  click() { this.tone(440, 0.05, "square", 0.04); },                            // 버튼
  select() { this.tone(520, 0.07, "square", 0.05); this.tone(780, 0.09, "square", 0.05, null, 0.06); },
  open() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, "triangle", 0.07, null, i * 0.09)); },   // 문 열림
  correct() { [659, 880].forEach((f, i) => this.tone(f, 0.14, "triangle", 0.08, null, i * 0.1)); },            // 정답
  wrong() { this.tone(220, 0.25, "sawtooth", 0.05, 140); },                                                    // 오답
  done() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, "triangle", 0.07, null, i * 0.1)); },
  toggle() { this.muted = !this.muted; return this.muted; },   // M 키: 소리 켜기/끄기
});
