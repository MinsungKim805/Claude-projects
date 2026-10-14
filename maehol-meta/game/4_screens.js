// =====================================================================
//  game/4_screens.js  —  시작 화면 + 캐릭터 선택 화면
//
//  이 게임은 "화면(장면)"들이 돌아가며 나와요.
//      boot(불러오기) → title(시작 화면) → select(캐릭터 선택) → play(게임)
//  각 화면은 MH.scenes.이름 = { enter(), update(dt), draw() } 모양이에요.
//      enter()   : 그 화면에 들어올 때 한 번
//      update(dt): 매 프레임 "움직이기" (dt = 지난 프레임 이후 흐른 시간, 초)
//      draw()    : 매 프레임 "그리기"
//
//  고쳐 볼 만한 곳:  CHARS 의 설명 문구, 캐릭터 카드 위치(CARD)
// =====================================================================


// ---------------------------------------------------------------------
// 1) 시작 화면
//    '메타 투어 매홀' 그림(assets/backgrounds/title.png) 위에
//    [시작하기] 버튼과 톱니바퀴(설정) 클릭 영역을 얹었어요.
// ---------------------------------------------------------------------
const START_BTN = { x: 543, y: 620, w: 194, h: 62 };    // 그림 속 시작하기 버튼 위치
const GEAR_BTN = { x: 1180, y: 626, w: 76, h: 80 };     // 그림 속 톱니바퀴 위치

MH.scenes.title = {
  t: 0,

  enter() {
    this.t = 0;
    MH.loadBest();                                   // 저장된 최고 점수 읽기
    if (MH.TM.running) MH.TM.stop();                 // 카메라가 켜져 있었다면 끄기
  },

  update(dt) {
    this.t += dt;
    Settings.update();
    if (Settings.open) return;                       // 설정 창이 열려 있으면 아래 입력은 무시
    if (Input.was("KeyM")) Sfx.toggle();
    if (Input.was("Enter") || Input.was("Space") || Input.was("NumpadEnter")) this.start();
  },

  start() {
    Sfx.select();
    MH.go("select");                                 // 캐릭터 선택 화면으로!
  },

  draw() {
    const ctx = drawingContext;
    ctx.imageSmoothingEnabled = false;
    if (MH.A.title) {
      ctx.drawImage(MH.A.title, 0, 0, MH.W, MH.H);   // 시작 화면 그림
    } else {
      // 그림 파일이 없을 때를 위한 대체 화면
      background("#27315c");
      UI.text("메타 투어 매홀", MH.W / 2, 220, 72, { align: CENTER, bold: true, color: "#ffd34a", outline: "#7a4a10", outlineW: 8 });
      if (UI.button("시작하기", MH.W / 2 - 100, 520, 200, 64)) this.start();
    }
    if (!Settings.open) this.drawOverlay();
    Settings.draw();
  },

  // 그림 위에 반짝이는 테두리와 클릭 영역을 얹어요.
  drawOverlay() {
    const overStart = UI.hover(START_BTN.x, START_BTN.y, START_BTN.w, START_BTN.h);
    const overGear = UI.hover(GEAR_BTN.x, GEAR_BTN.y, GEAR_BTN.w, GEAR_BTN.h);
    push();
    noFill();
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 4);          // 0~1 사이를 오가며 깜빡여요
    stroke(255, 255, 255, overStart ? 255 : 90 + 90 * pulse);
    strokeWeight(overStart ? 5 : 3);
    rect(START_BTN.x - 4, START_BTN.y - 4, START_BTN.w + 8, START_BTN.h + 8, 14);
    if (overGear) {
      stroke(255, 255, 255, 230);
      strokeWeight(4);
      rect(GEAR_BTN.x - 2, GEAR_BTN.y - 2, GEAR_BTN.w + 4, GEAR_BTN.h + 4, 12);
    }
    pop();
    if (overStart || overGear) cursor("pointer");

    UI.text("Enter 키 또는 [시작하기]", 20, 696, 11, { color: "#ffffff", outline: "rgba(0,0,0,0.8)", outlineW: 3 });
    if (MH.state.best != null) {
      UI.panel(24, 24, 250, 44, { fill: "rgba(20,22,50,0.8)", border: "#ffe27a", r: 10, shadow: false });
      UI.text(`최고 퀴즈 점수  ${MH.state.best} / ${window.MAEHOL_QUIZ.length}`, 149, 46, 16, { align: CENTER, valign: CENTER, bold: true, color: "#ffe27a" });
    }
    if (Input.clicked(START_BTN.x, START_BTN.y, START_BTN.w, START_BTN.h)) this.start();
    if (Input.clicked(GEAR_BTN.x, GEAR_BTN.y, GEAR_BTN.w, GEAR_BTN.h)) { Sfx.click(); Settings.show(false); }
  },
};


// ---------------------------------------------------------------------
// 2) 캐릭터 선택 화면
//    - 티처블 머신 얼굴 인식: 동훈 / 민성 / 성민 → 그 캐릭터가 골라져요.
//                            "No one"(아무도 없음) → 아무것도 고르지 않아요.
//    - 링크가 비어 있으면 1·2·3 키나 클릭으로 골라요.
// ---------------------------------------------------------------------
// 고를 수 있는 캐릭터 목록. key 는 assets/sprites/ 의 파일 이름이에요.
const CHARS = [
  { key: "donghun", name: "동훈", desc: "까만 머리의 씩씩한 친구" },
  { key: "minseong", name: "민성", desc: "동그란 안경이 잘 어울려요" },
  { key: "seongmin", name: "성민", desc: "모자가 멋진 유쾌한 친구" },
];
MH.CHARS = CHARS;
// key 로 캐릭터 이름 찾기 ("donghun" -> "동훈")
MH.charName = (key) => (CHARS.find((c) => c.key === key) || { name: "나" }).name;

const CARD = { x0: 360, y: 150, w: 252, h: 360, gap: 22 };    // 카드의 위치와 크기
const cardX = (i) => CARD.x0 + i * (CARD.w + CARD.gap);          // i번째 카드의 x 위치

MH.scenes.select = {
  t: 0,
  sel: 0,          // 지금 골라진 카드 번호 (0, 1, 2)
  hold: 0,         // 같은 얼굴이 유지된 시간(ms)
  lastKey: null,

  enter() {
    this.t = 0;
    this.hold = 0;
    this.lastKey = null;
    const i = CHARS.findIndex((c) => c.key === MH.state.charKey);
    this.sel = i < 0 ? 0 : i;
    if (MH.TM.anyConfigured()) MH.TM.start();        // 링크가 있으면 카메라와 모델을 켜요
  },

  choose(i) {
    if (i === this.sel) return;
    this.sel = i;
    Sfx.select();
  },

  // 이 캐릭터로 게임 시작!
  confirm() {
    MH.state.charKey = CHARS[this.sel].key;
    Sfx.done();
    MH.go("play", { fresh: true });
  },

  update(dt) {
    this.t += dt;
    Settings.update();
    if (Settings.open) return;
    if (Input.was("KeyM")) Sfx.toggle();

    // 키보드로 고르기: 1·2·3 / ← → / A D
    const n = Input.number();
    if (n >= 0 && n < CHARS.length) this.choose(n);
    if (Input.was("ArrowLeft") || Input.was("KeyA")) this.choose((this.sel + CHARS.length - 1) % CHARS.length);
    if (Input.was("ArrowRight") || Input.was("KeyD")) this.choose((this.sel + 1) % CHARS.length);
    if (Input.was("Escape")) { MH.go("title"); return; }
    if (Input.action()) { this.confirm(); return; }

    // ---- 얼굴 인식으로 고르기 ----
    const face = MH.TM.face;
    if (face.enabled && MH.TM.faceConfigured()) {
      if (face.key) {                                       // 동훈/민성/성민 중 하나로 확실히 인식됨
        const idx = CHARS.findIndex((c) => c.key === face.key);
        if (idx >= 0) this.choose(idx);
        if (face.key === this.lastKey) this.hold += dt * 1000;   // 같은 얼굴이면 시간이 쌓여요
        else this.hold = 0;
        this.lastKey = face.key;
        if (this.hold >= (CONFIG.FACE_HOLD_MS || 1800)) this.confirm();   // 충분히 유지되면 자동 시작
      } else {
        // face.key 가 비어 있으면: "No one"이거나 확률이 낮은 경우 → 아무것도 고르지 않아요
        this.hold = 0;
        this.lastKey = null;
      }
    }
  },

  draw() {
    // 배경: 위에서 아래로 어두워지는 보라색 + 반짝이는 별
    const ctx = drawingContext;
    const grad = ctx.createLinearGradient(0, 0, 0, MH.H);
    grad.addColorStop(0, "#3a2f73");
    grad.addColorStop(1, "#1b1740");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, MH.W, MH.H);
    noStroke();
    for (let i = 0; i < 46; i++) {
      fill(255, 255, 255, 80 + 120 * Math.abs(Math.sin(this.t * 1.4 + i)));
      rect((i * 197) % MH.W, (i * 83) % 420, 3, 3);
    }

    // 제목과 안내 문구
    UI.text("캐릭터를 골라 주세요", MH.W / 2, 40, 40, { align: CENTER, bold: true, color: "#ffe27a", outline: "#2a1a50", outlineW: 6 });
    const faceOn = MH.TM.faceConfigured();
    UI.text(faceOn ? "카메라에 얼굴을 보여 주면 내 캐릭터가 자동으로 골라져요!" : "숫자 1 · 2 · 3 을 누르거나 카드를 클릭해서 골라요",
      MH.W / 2, 96, 22, { align: CENTER, color: "#d8d4ff" });

    this.drawCameraPanel();                          // 왼쪽: 카메라 화면
    CHARS.forEach((c, i) => this.drawCard(c, i));    // 가운데: 캐릭터 카드 3장

    // 아래 버튼들
    if (UI.button("이 캐릭터로 시작하기", MH.W / 2 + 70 - 190, 556, 380, 70, { size: 26 })) this.confirm();
    UI.text("Space / Enter 로도 시작해요", MH.W / 2 + 70, 640, 11, { align: CENTER, color: "rgba(255,255,255,0.6)" });
    if (UI.button("← 처음 화면", 30, 650, 190, 46, { size: 20, fill: "#c9c6ff", hoverFill: "#e4e2ff", border: "#3a3670", color: "#26225a" })) MH.go("title");
    if (UI.button("설정", 1110, 650, 80, 46, { size: 20, fill: "#c9c6ff", hoverFill: "#e4e2ff", border: "#3a3670", color: "#26225a" })) Settings.show(false);
    Settings.draw();
  },

  // 캐릭터 카드 한 장 그리기
  drawCard(c, i) {
    const x = cardX(i), y = CARD.y, w = CARD.w, h = CARD.h;
    const selected = this.sel === i;
    const hovering = UI.hover(x, y, w, h) && !Settings.open;
    const lift = selected ? -10 : hovering ? -4 : 0;          // 골라진 카드는 위로 떠올라요
    const faceHit = MH.TM.faceConfigured() && MH.TM.face.key === c.key;   // 지금 얼굴이 이 캐릭터로 인식됐는지

    UI.panel(x, y + lift, w, h, {
      fill: selected ? "rgba(255,244,200,0.98)" : "rgba(238,234,255,0.94)",
      border: selected ? "#ffb21f" : "#8f94ff",
      bw: selected ? 6 : 4, r: 16,
    });
    // 발밑 동그라미
    push();
    noStroke();
    fill(selected ? "rgba(255,190,60,0.35)" : "rgba(120,110,200,0.25)");
    ellipse(x + w / 2, y + lift + 270, 150, 38);
    pop();
    // 캐릭터 그림 (골라지면 통통 튀어요)
    const full = MH.A.portrait[c.key] && MH.A.portrait[c.key].full;
    if (full) {
      const bounce = selected ? Math.round(Math.sin(this.t * 5) * 4) : 0;
      drawingContext.imageSmoothingEnabled = false;
      drawingContext.drawImage(full, x + w / 2 - full.width / 2, y + lift + 28 + bounce, full.width, full.height);
    }
    UI.text(c.name, x + w / 2, y + lift + 292, 30, { align: CENTER, bold: true, color: "#3a2a70" });
    UI.text(c.desc, x + w / 2, y + lift + 330, 11, { align: CENTER, color: "#6a5ea0" });
    UI.keycap(String(i + 1), x + 14, y + lift + 14);
    if (selected) UI.text("선택!", x + w - 16, y + lift + 18, 22, { align: RIGHT, bold: true, color: "#e0701a" });

    // 얼굴이 이 캐릭터로 인식되면 "얼굴 인식!"과 시간 막대를 보여줘요
    if (faceHit) {
      UI.text("얼굴 인식!", x + w / 2, y + lift - 30, 22, { align: CENTER, bold: true, color: "#8affb0", outline: "#103a20", outlineW: 5 });
      const progress = MH.clamp(this.hold / (CONFIG.FACE_HOLD_MS || 1800), 0, 1);
      push();
      noStroke();
      fill("rgba(0,0,0,0.35)");
      rect(x + 20, y + lift + h - 16, w - 40, 8, 4);
      fill("#4fd17a");
      rect(x + 20, y + lift + h - 16, (w - 40) * progress, 8, 4);
      pop();
    }
    // 카드를 클릭: 처음 클릭하면 고르기, 이미 골라진 카드를 또 클릭하면 시작
    if (hovering && Input.clicked(x, y, w, h)) {
      if (this.sel === i) this.confirm();
      else this.choose(i);
    }
    if (hovering) cursor("pointer");
  },

  // 왼쪽 패널: 카메라 화면과 인식 결과 (링크가 비어 있으면 안내 문구)
  drawCameraPanel() {
    const TM = MH.TM;
    const x = 34, y = 150, w = 300, h = 360;
    UI.panel(x, y, w, h, { fill: "rgba(14,12,40,0.85)", border: "#6a66c0", r: 14 });

    if (!TM.faceConfigured()) {
      UI.text("얼굴 인식", x + w / 2, y + 22, 22, { align: CENTER, bold: true, color: "#ffe27a" });
      const lines = UI.wrap("티처블 머신 얼굴 인식 링크가 비어 있어요.\n\nconfig.js 의 TM_FACE_MODEL_URL 에 링크를 붙여 넣으면 카메라로 캐릭터를 고를 수 있어요.", w - 40, 11);
      let yy = y + 78;
      for (const line of lines) { UI.text(line, x + 20, yy, 11, { color: "#d8d4ff" }); yy += 20; }
      UI.text("지금은 키보드/마우스로\n골라 주세요", x + w / 2, y + h - 80, 22, { align: CENTER, bold: true, color: "#9ad0ff" });
      return;
    }

    UI.text("얼굴 인식 카메라", x + w / 2, y + 16, 22, { align: CENTER, bold: true, color: "#ffe27a" });
    const vx = x + 30, vy = y + 56, vs = 240;      // 카메라 화면 위치와 크기
    push();
    fill("#0a0818");
    stroke("#6a66c0");
    strokeWeight(3);
    rect(vx - 2, vy - 2, vs + 4, vs + 4, 8);
    pop();
    if (TM.cameraOn && TM.canvas) {
      drawingContext.imageSmoothingEnabled = true;
      drawingContext.drawImage(TM.canvas, vx, vy, vs, vs);
    } else {
      UI.text(TM.cameraError ? "카메라 오류" : "카메라를 켜는 중...", vx + vs / 2, vy + vs / 2 - 12, 22, { align: CENTER, color: "#ffb0b0" });
      if (TM.cameraError) {
        let yy = vy + vs / 2 + 20;
        for (const s of UI.wrap(TM.cameraError, vs - 20, 11)) { UI.text(s, vx + 10, yy, 11, { color: "#ffd0d0" }); yy += 16; }
      }
    }

    // 인식 결과 한 줄
    const f = TM.face;
    let label = "얼굴을 비춰 주세요", color = "#d8d4ff";
    if (String(f.status).startsWith("오류")) { label = f.status; color = "#ff9a9a"; }
    else if (f.model) {
      if (f.none) { label = "얼굴이 보이지 않아요 (No one)"; color = "#ffd27a"; }
      else if (f.key) { label = `${MH.charName(f.key)}  ${Math.round(f.prob * 100)}%`; color = "#8affb0"; }
      else if (f.label) { label = `${f.label}?  ${Math.round(f.prob * 100)}%`; color = "#ffe27a"; }
    } else {
      label = f.status;
    }
    UI.text(label, x + w / 2, vy + vs + 14, 22, { align: CENTER, bold: true, color });

    // 클래스별 확률 막대
    if (f.probs && f.probs.length) {
      let yy = vy + vs + 50;
      for (const pr of f.probs.slice().sort((a, b) => b.p - a.p).slice(0, 4)) {
        UI.text(pr.name, x + 20, yy, 11, { color: "#d8d4ff" });
        push();
        noStroke();
        fill("rgba(255,255,255,0.15)");
        rect(x + 90, yy + 2, 180, 8, 4);
        fill(pr.p > 0.8 ? "#4fd17a" : "#8f94ff");
        rect(x + 90, yy + 2, 180 * pr.p, 8, 4);
        pop();
        yy += 16;
      }
    }
  },
};
