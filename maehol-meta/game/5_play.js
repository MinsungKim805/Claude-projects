// =====================================================================
//  game/5_play.js  —  게임 화면 (제일 중요한 파일!)
//
//  돌아다니기 → NPC에게 소개 듣기 → 문 열기 → 교실에서 퀴즈 풀기
//  이 모든 일이 여기서 일어나요.
//
//  이 화면은 3가지 "모드"를 오가요:
//      "explore"  : 돌아다니는 중
//      "dialogue" : NPC와 대화하는 중
//      "quiz"     : 퀴즈를 푸는 중
//  update()   → 지금 모드에 맞는 함수를 불러요 (updateExplore / updateDialogue / updateQuiz)
//  draw()     → 월드 + 이름표 + 화면 정보(HUD) + (대화창 또는 퀴즈 창)을 그려요.
//
//  고쳐 볼 만한 곳:  AREA_ORDER / STOPS (구역 순서), 퀴즈 결과 문구(drawResult), HUD 위치
// =====================================================================

// 소개를 들어야 하는 구역들 (이 순서대로 진행돼요). id 는 맵/대사 파일의 이름과 같아야 해요.
const AREA_ORDER = ["playground", "cafeteria", "gym", "library"];

// 화면 위쪽의 진행 바에 나오는 정거장들
const STOPS = [
  { id: "playground", label: "운동장" },
  { id: "cafeteria", label: "급식실" },
  { id: "gym", label: "체육관" },
  { id: "library", label: "도서관" },
  { id: "classroom", label: "교실" },
];

// content.js 에 적어 둔 대사와 퀴즈를 가져오는 도우미
const getScript = () => window.MAEHOL_SCRIPT;
const getQuiz = () => window.MAEHOL_QUIZ;

const Play = (MH.scenes.play = {
  t: 0,                  // 게임 화면이 켜진 뒤 흐른 시간
  mode: "explore",       // 지금 모드 (위 설명 참고)
  dlg: null,             // 진행 중인 대화 정보
  quiz: null,            // 진행 중인 퀴즈 정보
  hintGate: null,        // 방금 열린 문 (화살표로 알려 줘요)
  zoneId: null,          // 지금 있는 장소 id
  zoneName: "",          // 지금 있는 장소 이름
  zoneT: 0,              // 장소 이름 배너를 보여준 시간
  nearNpc: null,         // 가까이 있는 NPC
  cool: {},              // NPC마다 "잠깐 쉬는 시간" (대화 직후 바로 다시 시작되지 않게)
  gateCool: 0,           // 문 안내 알림이 연속으로 뜨지 않게
  chatIdx: {},           // 수다 NPC가 몇 번째 말을 할 차례인지
  faceSince: 0,
  mini: null,            // 미니맵 그림

  // -------------------------------------------------------------------
  // 게임 화면에 들어올 때
  //   arg.fresh === true 면 "새 게임"이에요. (진행 상황을 모두 처음으로)
  // -------------------------------------------------------------------
  enter(arg) {
    if (!World.player) World.init();
    if (arg && arg.fresh) {
      MH.state.reset();
      World.reset();
      this.mode = "explore";
      this.dlg = null;
      this.quiz = null;
      this.hintGate = null;
      this.zoneId = null;
      this.cool = {};
      this.chatIdx = {};
      UI.toasts = [];
      UI.toast("W A S D 로 걸어 다녀요!", "star");
      // 주소 뒤에 ?unlock 을 붙이면 소개를 건너뛰고 모든 문이 열려요 (시험/발표 연습용)
      if (/[?&]unlock/.test(location.search)) {
        AREA_ORDER.forEach((a) => (MH.state.done[a] = true));
        World.refreshGates(false);
        UI.toast("시험 모드: 모든 문이 열려 있어요", "check");
      }
    }
    World.player.key = MH.state.charKey;
    if (!this.mini) this.buildMini();
    if (MH.TM.anyConfigured()) MH.TM.start();      // 티처블 머신 링크가 있으면 켜기
  },

  // 미니맵: 맵 큰 그림을 작게 줄여서 한 번만 만들어 둬요.
  buildMini() {
    const w = 150, h = Math.round((150 * World.h) / World.w);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = "high";
    x.fillStyle = "#14101f";
    x.fillRect(0, 0, w, h);
    if (MH.A.bg) x.drawImage(MH.A.bg, 0, 0, w, h);
    this.mini = c;
  },


  // =================================================================
  //  진행 상황 확인 도우미
  // =================================================================

  // 4곳 소개를 모두 끝냈는지
  allDone() { return AREA_ORDER.every((a) => MH.state.done[a]); },

  // 다음에 만나야 할 NPC (화살표가 가리키는 대상)
  nextTarget() {
    for (const a of AREA_ORDER) {
      if (!MH.state.done[a]) return World.npcById[getScript().areas[a].npc];
    }
    if (!MH.state.quizDone) return World.npcById[getScript().quiz.npc];
    return null;
  },

  // 화면 왼쪽 위에 보여줄 "목표" 문구
  objective() {
    const o = getScript().objective;
    for (const a of AREA_ORDER) if (!MH.state.done[a]) return o[a];
    return MH.state.quizDone ? o.done : o.quiz;
  },

  // NPC 머리 위에 어떤 말풍선 아이콘을 보일지 (없으면 null)
  npcIcon(n) {
    if (this.mode !== "explore") return null;
    if (n.role === "guide" && !MH.state.done[n.area]) return "bubble_exclaim";                      // 아직 안 들은 소개
    if (n.role === "quiz" && this.allDone() && !MH.state.quizDone) return "bubble_exclaim";         // 퀴즈 준비됨
    if (n === this.nearNpc) return "bubble_talk";                                                    // 가까이 가면 말풍선
    return null;
  },


  // =================================================================
  //  매 프레임 "움직이기"
  // =================================================================
  update(dt) {
    this.t += dt;
    UI.updateToasts(dt);
    if (Input.was("KeyM")) Sfx.toggle();
    Settings.update();
    if (Settings.open) return;                                           // 설정 창이 열려 있으면 멈춤
    if (Input.was("Escape") && this.mode === "explore") { Settings.show(true); return; }

    for (const k in this.cool) this.cool[k] = Math.max(0, this.cool[k] - dt);   // 쉬는 시간 줄이기
    this.gateCool = Math.max(0, this.gateCool - dt);

    // 지금 모드에 맞는 함수 실행
    if (this.mode === "explore") this.updateExplore(dt);
    else if (this.mode === "dialogue") this.updateDialogue(dt);
    else if (this.mode === "quiz") this.updateQuiz(dt);
  },

  // ---- 모드 1: 돌아다니기 ----
  updateExplore(dt) {
    const p = World.player;
    const move = Input.move();            // WASD / 방향키 / 동작 인식
    World.update(dt, move);

    // (1) 지금 있는 장소 이름 확인
    const zone = World.zoneAt(Math.floor(p.x / 32), Math.floor((p.y - 4) / 32));
    if (zone && zone.id !== this.zoneId) {
      this.zoneId = zone.id;
      this.zoneName = zone.id === "classroom" ? "교실 (퀴즈 존)" : zone.name;
      this.zoneT = 0;                      // 장소 이름 배너를 다시 보여줘요
    }
    this.zoneT += dt;

    // (2) 열린 문 안내 화살표는 문 가까이 가면 사라져요
    if (this.hintGate) {
      const c = World.gateCenter(this.hintGate);
      if (MH.dist(p.x, p.y, c.x, c.y) < 56) this.hintGate = null;
    }

    // (3) 얼굴 인식으로 게임 중에도 캐릭터 바꾸기 (config.js 에서 FACE_LIVE_IN_GAME 을 true 로 했을 때만)
    if (CONFIG.FACE_LIVE_IN_GAME && MH.TM.face.model) {
      const k = MH.TM.face.key;
      if (k && k !== p.key) {
        this.faceSince += dt;
        if (this.faceSince > 0.8) {          // 0.8초 동안 같은 얼굴이면 바꿔요
          p.key = k;
          MH.state.charKey = k;
          this.faceSince = 0;
          UI.toast(`${MH.charName(k)}(으)로 바뀌었어요!`, "heart");
          Sfx.select();
        }
      } else this.faceSince = 0;
    }

    // (4) NPC와 대화하기
    this.nearNpc = World.nearestNpc(p, 46);
    // 아직 안 들은 소개 NPC에게 가까이 가면 자동으로 대화가 시작돼요
    for (const n of World.npcs) {
      if (n.role === "guide" && !MH.state.done[n.area] && !(this.cool[n.id] > 0)) {
        if (MH.dist(p.x, p.y, n.x, n.y) < 62) { this.startNpc(n); return; }
      }
    }
    // 가까이 있는 NPC에게 Space/Enter/E 를 누르면 대화
    if (this.nearNpc && Input.action()) { this.startNpc(this.nearNpc); return; }
    // NPC를 마우스로 클릭해도 대화
    if (Input.click) {
      const wx = Input.click.x / MH.ZOOM + Math.round(World.cam.x);    // 클릭한 곳의 월드 좌표
      const wy = Input.click.y / MH.ZOOM + Math.round(World.cam.y);
      for (const n of World.npcs) {
        if (Math.abs(wx - n.x) < 16 && wy > n.y - 48 && wy < n.y + 4) {
          Input.click = null;
          if (MH.dist(p.x, p.y, n.x, n.y) < 90) this.startNpc(n);
          else UI.toast(`${n.name}에게 더 가까이 가 보세요`, "bubble_talk");
          return;
        }
      }
    }

    // (5) 닫힌 문에 부딪히면 왜 안 열리는지 알려줘요
    if ((move.x || move.y) && this.gateCool <= 0) {
      const g = World.closedGateNear(p, 10);
      if (g) {
        UI.toast(g.label, "lock");
        Sfx.wrong();
        this.gateCool = 3;       // 3초 동안은 다시 알리지 않아요
      }
    }
  },


  // =================================================================
  //  NPC 대화
  // =================================================================

  // NPC n 과 대화를 시작해요. NPC의 역할(role)에 따라 하는 말이 달라요.
  startNpc(n) {
    const S = getScript();
    if (n.role === "guide") {
      // 소개 NPC: 대사를 다 들으면 이 구역이 "완료"돼요
      this.openDialogue(n, S.areas[n.area].lines, () => this.completeArea(n.area));
    } else if (n.role === "quiz") {
      // 퀴즈 NPC(반장): 소개를 다 못 들었으면 돌려보내고, 다 들었으면 퀴즈 시작
      const q = S.quiz;
      if (!this.allDone()) this.openDialogue(n, q.locked, null);
      else if (MH.state.quizDone) this.openDialogue(n, q.again, () => this.startQuiz());
      else this.openDialogue(n, q.intro, () => this.startQuiz());
    } else {
      // 수다 NPC: 말을 걸 때마다 다음 말을 해요
      const list = S.chat[n.id] || ["안녕!"];
      const i = (this.chatIdx[n.id] || 0) % list.length;
      this.chatIdx[n.id] = i + 1;
      this.openDialogue(n, [list[i]], null);
    }
  },

  // 대화창을 열어요. lines = 대사 목록, onDone = 대화가 끝난 뒤 할 일
  openDialogue(npc, lines, onDone) {
    const arr = (lines || []).map((l) => (typeof l === "string" ? l : l.text));
    if (!arr.length) { if (onDone) onDone(); return; }
    this.mode = "dialogue";
    this.dlg = { npc, lines: arr, idx: 0, shown: 0, done: false, onDone };
    Sfx.click();
  },

  // ---- 모드 2: 대화하는 중 ----
  updateDialogue(dt) {
    World.update(dt, { x: 0, y: 0 });            // 내 캐릭터는 가만히, 불꽃 같은 것만 움직여요
    const d = this.dlg;
    const text = d.lines[d.idx];                  // 지금 보여주는 대사

    // 글자가 한 글자씩 나타나요
    if (!d.done) {
      const before = Math.floor(d.shown);
      d.shown += dt * (CONFIG.TEXT_SPEED || 42);
      if (Math.floor(d.shown) !== before && Math.floor(d.shown) % 3 === 0) Sfx.blip();
      if (d.shown >= text.length) { d.shown = text.length; d.done = true; }
    }

    // Space / Enter / E / 클릭
    if (Input.action() || Input.click) {
      Input.click = null;
      if (!d.done) { d.shown = text.length; d.done = true; return; }   // 아직 나오는 중이면 한 번에 다 보여주기
      d.idx++;                                                          // 다음 대사로
      d.shown = 0;
      d.done = false;
      Sfx.click();
      if (d.idx >= d.lines.length) {                                    // 대사가 끝났어요!
        this.mode = "explore";
        this.cool[d.npc.id] = 2.5;                                      // 2.5초 동안은 자동으로 다시 시작하지 않아요
        const callback = d.onDone;
        this.dlg = null;
        if (callback) callback();
      }
    }
  },

  // 구역 소개를 끝냈을 때: 완료로 기록하고, 조건이 맞는 문을 열어요.
  completeArea(area) {
    if (MH.state.done[area]) return;               // 이미 끝낸 구역이면 아무것도 안 해요
    MH.state.done[area] = true;
    Sfx.done();
    UI.toast(getScript().areas[area].done || "소개를 잘 들었어요!", "star");
    const opened = World.refreshGates(true);       // 새로 열린 문들
    if (opened.length) {
      this.hintGate = opened[opened.length - 1];   // 화살표로 알려 줄 문
      setTimeout(() => { Sfx.open(); UI.toast("문이 열렸어요! 화살표를 따라가 보세요", "check"); }, 900);
    }
  },


  // =================================================================
  //  퀴즈
  //    state: "ask"(문제 보는 중) → "feedback"(정답 확인) → ... → "result"(결과)
  // =================================================================
  startQuiz() {
    this.mode = "quiz";
    this.quiz = { i: 0, score: 0, state: "ask", sel: 0, picked: -1, results: [], t: 0 };
  },

  // idx 번째 보기를 골랐을 때
  pick(idx) {
    const Q = this.quiz;
    const q = getQuiz()[Q.i];
    if (Q.state !== "ask" || idx < 0 || idx >= q.choices.length) return;
    Q.picked = idx;
    Q.sel = idx;
    const correct = idx === q.answer;             // 정답인지 비교!
    if (correct) { Q.score++; Sfx.correct(); } else Sfx.wrong();
    Q.results.push(correct);
    Q.state = "feedback";
    Q.t = 0;
  },

  // 다음 문제로 (마지막이면 결과 화면)
  nextQuestion() {
    const Q = this.quiz;
    Q.i++;
    Q.picked = -1;
    Q.sel = 0;
    Q.t = 0;
    if (Q.i >= getQuiz().length) {
      Q.state = "result";
      MH.state.quizDone = true;
      MH.saveBest(Q.score);
      Sfx.done();
    } else {
      Q.state = "ask";
    }
  },

  // ---- 모드 3: 퀴즈 푸는 중 ----
  updateQuiz(dt) {
    const Q = this.quiz;
    Q.t += dt;
    World.update(dt, { x: 0, y: 0 });
    const q = getQuiz()[Q.i];
    if (Q.state === "ask") {
      const n = Input.number();                                   // 1~4 키
      if (n >= 0) this.pick(n);
      const nav = Input.nav();                                    // ↑ ↓ 키
      if (nav) { Q.sel = (Q.sel + nav + q.choices.length) % q.choices.length; Sfx.click(); }
      if (Input.action()) this.pick(Q.sel);                       // Space 로 확정
    } else if (Q.state === "feedback") {
      if (Q.t > 0.3 && (Input.action() || Input.click)) { Input.click = null; this.nextQuestion(); }
    } else if (Q.state === "result") {
      if (Input.was("Escape")) this.closeQuiz();
    }
  },

  closeQuiz() {
    this.mode = "explore";
    this.quiz = null;
    this.cool.banjang = 1.5;     // 닫자마자 반장이 다시 퀴즈를 시작하지 않게
  },


  // =================================================================
  //  매 프레임 "그리기"
  // =================================================================
  draw() {
    background("#14101f");
    World.draw(drawingContext, { npcIcon: (n) => this.npcIcon(n), hintGate: this.hintGate });   // 맵과 캐릭터
    this.drawTags();       // 이름표
    this.drawHUD();        // 장소 이름, 목표, 진행 바, 미니맵...
    if (this.mode === "dialogue" && this.dlg) {
      const d = this.dlg;
      UI.dialogue({ name: d.npc.name, portrait: d.npc.key, text: d.lines[d.idx], shown: d.shown, done: d.done }, this.t);
    }
    if (this.mode === "quiz") this.drawQuiz();
    UI.drawToasts();
    Settings.draw();
  },

  // 캐릭터 머리 위 이름표 (NPC는 초록, 나는 노랑)
  drawTags() {
    const p = World.player;
    for (const n of World.npcs) {
      const s = World.toScreen(n.x, n.y - 48);
      if (s.x < -60 || s.x > MH.W + 60 || s.y < -20 || s.y > MH.H + 20) continue;   // 화면 밖이면 건너뛰기
      UI.nameTag(n.name, s.x, s.y - 4, { color: "#b8ffd8", bg: "rgba(10,40,30,0.75)" });
      if (n === this.nearNpc && this.mode === "explore") {
        // 가까이 가면 [Space] 대화 안내
        const tw = UI.width(n.name, 11, true) / 2 + 14;
        const w = UI.keycap("Space", s.x + tw + 4, s.y - 24);
        UI.text("대화", s.x + tw + 4 + w + 6, s.y - 20, 11, { bold: true, color: "#ffffff", outline: "rgba(0,0,0,0.85)" });
      }
    }
    const s = World.toScreen(p.x, p.y - 48);
    UI.nameTag(MH.charName(p.key), s.x, s.y - 4, { color: "#ffe27a", bg: "rgba(60,40,10,0.78)" });
  },

  // HUD = 게임 화면 위에 항상 떠 있는 정보들
  drawHUD() {
    // (1) 왼쪽 위: 지금 있는 장소
    const zname = this.zoneName || "운동장";
    const zw = UI.width(zname, 22, true) + 56;
    UI.panel(16, 16, zw, 42, { fill: "rgba(20,22,50,0.86)", border: "#8f94ff", r: 10, shadow: false });
    push();
    noStroke();
    fill("#ff6a6a");
    ellipse(36, 34, 14, 14);     // 빨간 위치 점
    fill("#ffffff");
    ellipse(36, 34, 5, 5);
    pop();
    UI.text(zname, 52, 38, 22, { valign: CENTER, bold: true });

    // (2) 그 아래: 목표
    const goal = this.objective();
    const gw = Math.min(640, UI.width(goal, 22, false) + 40);
    UI.panel(16, 82, gw, 42, { fill: "rgba(60,40,10,0.86)", border: "#ffd34a", r: 10, shadow: false });
    UI.text(goal, 36, 104, 22, { valign: CENTER, color: "#ffe9a8" });

    this.drawRoute();     // 위쪽 가운데: 진행 바
    this.drawMini();      // 오른쪽 위: 미니맵
    this.drawCam();       // 카메라 화면 (티처블 머신을 쓸 때)
    this.drawArrow();     // 목표가 화면 밖이면 방향 화살표

    if (UI.button("설정", 1110, 212, 150, 36, { size: 22, fill: "#c9c6ff", hoverFill: "#e4e2ff", border: "#3a3670", color: "#26225a" }) && this.mode === "explore") Settings.show(true);

    // (3) 처음 14초 동안만 조작 힌트
    if (this.mode === "explore" && this.t < 14) {
      push();
      drawingContext.globalAlpha = Math.min(1, (14 - this.t) / 2);
      UI.text("WASD 이동  ·  Space 대화  ·  Esc 설정", MH.W / 2, 690, 11, { align: CENTER, color: "#ffffff", outline: "rgba(0,0,0,0.9)", outlineW: 4 });
      pop();
    }
    // (4) 새 장소에 들어서면 큰 글씨로 장소 이름
    if (this.zoneT < 2.4 && this.mode === "explore") {
      push();
      drawingContext.globalAlpha = Math.max(0, Math.min(1, this.zoneT / 0.3, (2.4 - this.zoneT) / 0.5));
      UI.text(this.zoneName, MH.W / 2, 170, 40, { align: CENTER, bold: true, color: "#ffffff", outline: "#2a1a50", outlineW: 8 });
      pop();
    }
  },

  // 위쪽 가운데: 1~5번 정거장과 완료 표시(초록 체크)
  drawRoute() {
    const w = 540, h = 56, x = (MH.W - w) / 2 - 80, y = 16;
    UI.panel(x, y, w, h, { fill: "rgba(20,22,50,0.86)", border: "#6a66c0", r: 12, shadow: false });
    const n = STOPS.length;
    const xs = STOPS.map((_, i) => x + 50 + (i * (w - 100)) / (n - 1));    // 정거장들의 x 위치
    push();
    for (let i = 0; i < n - 1; i++) {                                       // 정거장을 잇는 선 (끝낸 곳은 초록)
      stroke(MH.state.done[STOPS[i].id] ? "#4fd17a" : "#4a4a78");
      strokeWeight(5);
      line(xs[i] + 14, y + 22, xs[i + 1] - 14, y + 22);
    }
    pop();
    STOPS.forEach((s, i) => {
      const done = s.id === "classroom" ? MH.state.quizDone : MH.state.done[s.id];
      const here = this.zoneId === s.id;                                    // 지금 있는 곳이면 노란 테두리
      push();
      stroke(here ? "#ffe27a" : "#2a2a50");
      strokeWeight(here ? 4 : 3);
      fill(done ? "#4fd17a" : "#3a3a68");
      ellipse(xs[i], y + 22, 24, 24);
      pop();
      if (done) {
        const check = MH.A.ui.check;
        if (check) drawingContext.drawImage(check, xs[i] - 8, y + 14, 16, 16);
      } else {
        UI.text(String(i + 1), xs[i], y + 23, 11, { align: CENTER, valign: CENTER, bold: true, color: "#c9c6ff" });
      }
      UI.text(s.label, xs[i], y + 40, 11, { align: CENTER, bold: here, color: here ? "#ffe27a" : "#d8d4ff" });
    });
  },

  // 오른쪽 위: 미니맵 (흰 네모 = 지금 보이는 곳, 노란 점 = 나, 빨강/초록 점 = NPC)
  drawMini() {
    if (!this.mini) return;
    const mw = this.mini.width, mh = this.mini.height;
    const x = MH.W - mw - 22, y = 18;
    UI.panel(x - 6, y - 6, mw + 12, mh + 12, { fill: "rgba(20,22,50,0.9)", border: "#6a66c0", bw: 3, r: 8, shadow: false });
    drawingContext.imageSmoothingEnabled = true;
    drawingContext.drawImage(this.mini, x, y);
    const k = mw / World.pw;                         // 실제 맵 → 미니맵 축소 비율
    push();
    noFill();
    stroke(255, 255, 255, 140);
    strokeWeight(1);
    rect(x + World.cam.x * k, y + World.cam.y * k, 640 * k, 360 * k);   // 지금 화면이 보는 영역
    noStroke();
    for (const n of World.npcs) {
      if (n.role === "chat") continue;
      fill(n.role === "quiz" ? "#ffb21f" : MH.state.done[n.area] ? "#4fd17a" : "#ff6a6a");
      rect(x + n.x * k - 2, y + n.y * k - 2, 4, 4);
    }
    fill("#ffe27a");
    stroke("#2a1a50");
    strokeWeight(1);
    ellipse(x + World.player.x * k, y + World.player.y * k, 7, 7);
    pop();
  },

  // 티처블 머신을 쓸 때 카메라 화면을 작게 보여줘요
  drawCam() {
    const TM = MH.TM;
    if (!TM.cameraOn || !TM.canvas) return;
    const x = 20, y = 142, s = 128;
    UI.panel(x - 4, y - 4, s + 8, s + 8 + 22, { fill: "rgba(20,22,50,0.9)", border: "#6a66c0", bw: 3, r: 8, shadow: false });
    drawingContext.imageSmoothingEnabled = true;
    drawingContext.drawImage(TM.canvas, x, y, s, s);
    let label = "";
    if (TM.motion.model) label = TM.motion.dir ? `동작: ${TM.motion.label}` : "동작: 정지";
    else if (TM.face.model) label = TM.face.none ? "No one" : TM.face.key ? MH.charName(TM.face.key) : "인식 중";
    UI.text(label, x + s / 2, y + s + 6, 11, { align: CENTER, bold: true, color: "#9ad0ff" });
  },

  // 목표 NPC가 화면 밖에 있으면 화면 가장자리에 방향 화살표를 보여줘요
  drawArrow() {
    if (this.mode !== "explore") return;
    const target = this.nextTarget();
    if (!target) return;
    const s = World.toScreen(target.x, target.y - 20);
    const margin = 60;
    if (s.x > margin && s.x < MH.W - margin && s.y > 130 && s.y < MH.H - margin) return;   // 화면 안이면 필요 없어요
    const cx = MH.W / 2, cy = MH.H / 2;
    const angle = Math.atan2(s.y - cy, s.x - cx);                   // 화면 가운데에서 목표를 향한 각도
    const ex = MH.clamp(cx + Math.cos(angle) * 900, margin, MH.W - margin);
    const ey = MH.clamp(cy + Math.sin(angle) * 900, 140, MH.H - margin);
    const bounce = Math.sin(this.t * 5) * 4;
    push();
    translate(ex + Math.cos(angle) * bounce, ey + Math.sin(angle) * bounce);
    rotate(angle);
    stroke("#7a4a10");
    strokeWeight(4);
    fill("#ffe14a");
    triangle(24, 0, -14, -18, -14, 18);
    pop();
    UI.text(target.name, ex, ey + 30, 11, { align: CENTER, bold: true, color: "#ffe14a", outline: "rgba(0,0,0,0.85)", outlineW: 4 });
  },


  // =================================================================
  //  퀴즈 화면 그리기
  // =================================================================
  drawQuiz() {
    const Q = this.quiz;
    const data = getQuiz();
    UI.dim(0.55);
    const x = 110, y = 36, w = 1060, h = 648;          // 퀴즈 창의 위치와 크기
    UI.panel(x, y, w, h, { fill: "rgba(24,26,58,0.98)", border: "#ffe27a", r: 18, inner: "rgba(255,255,255,0.1)" });

    if (Q.state === "result") return this.drawResult(x, y, w, h);

    const q = data[Q.i];
    // 머리글: "퀴즈 2 / 5" 와 점 표시 (초록=정답, 빨강=오답)
    UI.text(`퀴즈 ${Q.i + 1} / ${data.length}`, x + 40, y + 28, 22, { bold: true, color: "#ffe27a" });
    for (let i = 0; i < data.length; i++) {
      const answered = i < Q.results.length;
      push();
      stroke("#2a2a50");
      strokeWeight(3);
      fill(answered ? (Q.results[i] ? "#4fd17a" : "#ff6a6a") : i === Q.i ? "#ffe27a" : "#3a3a68");
      ellipse(x + w - 60 - (data.length - 1 - i) * 30, y + 40, 20, 20);
      pop();
    }
    // 문제 글
    const qLines = UI.wrap(q.q, w - 100, 30, true);
    let qy = y + 76;
    for (const line of qLines) { UI.text(line, x + 50, qy, 30, { bold: true, color: "#ffffff" }); qy += 42; }

    // 보기들
    const n = q.choices.length;
    const top = y + 76 + Math.max(1, qLines.length) * 42 + 20;     // 첫 보기의 y 위치
    const boxH = 62, gap = 12;
    for (let i = 0; i < n; i++) {
      const by = top + i * (boxH + gap);
      const hovering = UI.hover(x + 50, by, w - 100, boxH) && Q.state === "ask";
      const isSel = Q.sel === i;
      let fillColor = "rgba(60,62,120,0.9)", border = "#6a66c0";
      if (Q.state === "ask" && (hovering || isSel)) { fillColor = "rgba(110,100,190,0.95)"; border = "#ffe27a"; }
      if (Q.state === "feedback") {                                  // 정답은 초록, 내가 고른 오답은 빨강
        if (i === q.answer) { fillColor = "rgba(40,120,70,0.95)"; border = "#8affb0"; }
        else if (i === Q.picked) { fillColor = "rgba(150,50,60,0.95)"; border = "#ff9aa8"; }
        else { fillColor = "rgba(40,42,80,0.7)"; border = "#3a3a68"; }
      }
      UI.panel(x + 50, by, w - 100, boxH, { fill: fillColor, border, r: 12, shadow: false, bw: 3 });
      push();
      noStroke();
      fill(Q.state === "feedback" && i === q.answer ? "#4fd17a" : "#ffe27a");
      ellipse(x + 92, by + boxH / 2, 40, 40);                        // 번호 동그라미
      pop();
      UI.text(String(i + 1), x + 92, by + boxH / 2 + 1, 22, { align: CENTER, valign: CENTER, bold: true, color: "#3a2a08" });
      UI.text(q.choices[i], x + 130, by + boxH / 2 + 1, 22, { valign: CENTER, color: "#ffffff" });
      if (Q.state === "feedback" && i === q.answer) UI.text("정답!", x + w - 80, by + boxH / 2 + 1, 22, { align: RIGHT, valign: CENTER, bold: true, color: "#b8ffd0" });
      if (Q.state === "ask" && hovering) {
        cursor("pointer");
        if (Input.clicked(x + 50, by, w - 100, boxH)) this.pick(i);   // 클릭하면 이 보기를 골라요
      }
    }
    if (Q.state === "ask") {
      UI.text("1~4 번호 · ↑↓ + Space · 클릭으로 골라요", x + w / 2, y + h - 34, 11, { align: CENTER, color: "rgba(255,255,255,0.6)" });
    }
    // 정답 확인 단계: 해설과 [다음 문제] 버튼
    if (Q.state === "feedback") {
      const ok = Q.results[Q.results.length - 1];
      const fy = y + h - 108;
      UI.text(ok ? "정답이에요!" : "아쉬워요! 다시 기억해 봐요", x + 50, fy, 30, { bold: true, color: ok ? "#8affb0" : "#ffb0b8" });
      let ey = fy + 44;
      for (const line of UI.wrap(q.explain || "", w - 360, 22, false).slice(0, 2)) { UI.text(line, x + 50, ey, 22, { color: "#e8e4ff" }); ey += 30; }
      const last = Q.i === data.length - 1;
      if (UI.button(last ? "결과 보기" : "다음 문제", x + w - 250, fy + 6, 200, 60, { size: 24 }) && Q.t > 0.3) this.nextQuestion();
    }
  },

  // 퀴즈 결과 화면: 점수, 별, 응원 문구, 버튼 3개
  drawResult(x, y, w, h) {
    const Q = this.quiz;
    const total = getQuiz().length;
    const ratio = Q.score / total;                     // 맞힌 비율 (0~1)
    UI.text("퀴즈 결과", x + w / 2, y + 36, 36, { align: CENTER, bold: true, color: "#ffe27a" });
    UI.text(`${Q.score} / ${total}`, x + w / 2, y + 120, 96, { align: CENTER, bold: true, color: "#ffffff", outline: "#2a1a50", outlineW: 10 });

    // 별: 만점이면 3개, 60% 이상 2개, 하나라도 맞히면 1개
    const stars = ratio >= 1 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;
    for (let i = 0; i < 3; i++) {
      const im = MH.A.ui.star;
      const sx = x + w / 2 - 120 + i * 80, sy = y + 270;
      if (im) {
        drawingContext.imageSmoothingEnabled = false;
        drawingContext.globalAlpha = i < stars ? 1 : 0.25;
        drawingContext.drawImage(im, sx - 32, sy - 32 + (i < stars ? Math.sin(this.t * 4 + i) * 4 : 0), 64, 64);
        drawingContext.globalAlpha = 1;
      }
    }
    // 응원 문구 (여기 글을 바꿔도 돼요)
    const msg = ratio >= 1 ? "만점이에요! 우리 학교 박사님이네요!" : ratio >= 0.6 ? "잘했어요! 우리 학교를 잘 알고 있어요." : "소개를 다시 한 번 들어 보고 도전해 봐요!";
    UI.text(msg, x + w / 2, y + 340, 30, { align: CENTER, bold: true, color: "#ffffff" });
    if (MH.state.best != null) UI.text(`내 최고 점수  ${MH.state.best} / ${total}`, x + w / 2, y + 400, 22, { align: CENTER, color: "#ffe27a" });

    const by = y + h - 130;
    if (UI.button("다시 풀기", x + 90, by, 270, 70, { size: 26 })) { this.startQuiz(); Sfx.select(); }
    if (UI.button("계속 둘러보기", x + 395, by, 270, 70, { size: 26, fill: "#9ad0ff", hoverFill: "#c6e6ff", border: "#1f4a7a", color: "#12304f" })) this.closeQuiz();
    if (UI.button("처음으로", x + 700, by, 270, 70, { size: 26, fill: "#ff9aa8", hoverFill: "#ffc4cc", border: "#7a1f2f", color: "#4f1220" })) MH.go("title");
  },
});
