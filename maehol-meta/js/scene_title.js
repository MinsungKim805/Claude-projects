// ============================================================
//  시작 화면 + 설정 창
// ============================================================
(function () {
  const UI = MH.UI;

  // ---------------------------------------------------------------- 설정 창 (시작 화면과 게임 중에 모두 써요)
  const Settings = (MH.Settings = {
    open: false,
    fromGame: false,
    show(fromGame) { this.open = true; this.fromGame = !!fromGame; },
    hide() { this.open = false; },

    statusLine(kind) {
      const TM = MH.TM;
      const conf = kind === "face" ? TM.faceConfigured() : TM.motionConfigured();
      if (!conf) return { text: "링크가 비어 있어요 (키보드/마우스 사용)", col: "#b8b8d8" };
      const st = kind === "face" ? TM.face.status : TM.motion.status;
      if (TM.cameraError) return { text: "카메라 오류: " + TM.cameraError, col: "#ff9a9a" };
      if (st === "준비됨" || st === "준비됨(테스트)") return { text: "연결됨 ✔", col: "#8affb0" };
      if (String(st).startsWith("오류")) return { text: st, col: "#ff9a9a" };
      return { text: st === "off" ? "아직 시작하지 않았어요" : st, col: "#ffe27a" };
    },

    update() {
      if (this.open && MH.Input.was("Escape")) this.hide();
    },

    draw() {
      if (!this.open) return;
      UI.dim(0.6);
      const x = 240, y = 70, w = 800, h = 580;
      UI.panel(x, y, w, h, { fill: "rgba(24,26,58,0.98)", border: "#ffe27a", r: 16, inner: "rgba(255,255,255,0.1)" });
      UI.text("설정 / 조작 방법", x + w / 2, y + 22, 30, { align: CENTER, bold: true, color: "#ffe27a" });
      const rows = [
        ["이동", "W A S D  또는  방향키"],
        ["대화 / 선택", "Space  ·  Enter  ·  E  또는  마우스 클릭"],
        ["퀴즈 답 고르기", "1 2 3 4  또는  ↑ ↓ + Space  또는  클릭"],
        ["소리 켜기/끄기", "M"],
        ["이 창 열기/닫기", "Esc"],
      ];
      let yy = y + 82;
      for (const [k, v] of rows) {
        UI.text(k, x + 50, yy, 22, { bold: true, color: "#9ad0ff" });
        UI.text(v, x + 290, yy, 22, { color: "#ffffff" });
        yy += 42;
      }
      yy += 10;
      UI.text("티처블 머신", x + 50, yy, 24, { bold: true, color: "#ffe27a" });
      yy += 40;
      const f = this.statusLine("face"), m = this.statusLine("motion");
      UI.text("얼굴 인식 (캐릭터 선택)", x + 50, yy, 22, { color: "#ffffff" });
      UI.text(f.text, x + 400, yy, 22, { color: f.col });
      yy += 38;
      UI.text("동작 인식 (캐릭터 이동)", x + 50, yy, 22, { color: "#ffffff" });
      UI.text(m.text, x + 400, yy, 22, { color: m.col });
      yy += 44;
      UI.text("링크는 config.js 의 TM_FACE_MODEL_URL / TM_MOTION_MODEL_URL 에 붙여 넣어요.", x + 50, yy, 11, { color: "rgba(255,255,255,0.65)" });

      const by = y + h - 84;
      if (UI.button("닫기", x + 60, by, 200, 56, { size: 24 })) this.hide();
      const sound = MH.Sfx.muted ? "소리 켜기" : "소리 끄기";
      if (UI.button(sound, x + 290, by, 200, 56, { size: 22, fill: "#9ad0ff", hoverFill: "#c6e6ff", border: "#1f4a7a", color: "#12304f" })) MH.Sfx.toggle();
      if (this.fromGame) {
        if (UI.button("처음으로", x + 520, by, 220, 56, { size: 22, fill: "#ff9aa8", hoverFill: "#ffc4cc", border: "#7a1f2f", color: "#4f1220" })) {
          this.hide();
          MH.go("title");
        }
      }
    },
  });

  // ---------------------------------------------------------------- 시작 화면
  // 그림 속 버튼 위치(1280x720 기준)
  const START = { x: 543, y: 620, w: 194, h: 62 };
  const GEAR = { x: 1180, y: 626, w: 76, h: 80 };

  MH.scenes.title = {
    t: 0,
    enter() {
      this.t = 0;
      MH.loadBest();
      MH.TM.stop && MH.TM.running && MH.TM.stop();
    },
    update(dt) {
      this.t += dt;
      Settings.update();
      if (Settings.open) return;
      if (MH.Input.was("KeyM")) MH.Sfx.toggle();
      if (MH.Input.was("Enter") || MH.Input.was("Space") || MH.Input.was("NumpadEnter")) this.start();
    },
    start() {
      MH.Sfx.select();
      MH.go("select");
    },
    draw() {
      const ctx = drawingContext;
      ctx.imageSmoothingEnabled = false;
      if (MH.A.title) {
        ctx.drawImage(MH.A.title, 0, 0, MH.W, MH.H);
      } else {
        background("#27315c");
        UI.text("메타 투어 매홀", MH.W / 2, 220, 72, { align: CENTER, bold: true, color: "#ffd34a", outline: "#7a4a10", outlineW: 8 });
        UI.text("(나와 만나는 학교)", MH.W / 2, 320, 30, { align: CENTER, color: "#9ad0ff" });
        UI.button("시작하기", MH.W / 2 - 100, 520, 200, 64, {}) && this.start();
      }
      Settings.open || this.drawOverlay();
      Settings.draw();
    },
    drawOverlay() {
      // 그림 속 버튼 위로 클릭 영역과 반짝임을 올려요
      const hovS = UI.hover(START.x, START.y, START.w, START.h);
      const hovG = UI.hover(GEAR.x, GEAR.y, GEAR.w, GEAR.h);
      push();
      noFill();
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 4);
      stroke(255, 255, 255, hovS ? 255 : 90 + 90 * pulse);
      strokeWeight(hovS ? 5 : 3);
      rect(START.x - 4, START.y - 4, START.w + 8, START.h + 8, 14);
      if (hovG) {
        stroke(255, 255, 255, 230);
        strokeWeight(4);
        rect(GEAR.x - 2, GEAR.y - 2, GEAR.w + 4, GEAR.h + 4, 12);
      }
      pop();
      if (hovS || hovG) cursor("pointer");
      UI.text("Enter 키 또는 [시작하기]", 20, 696, 11, { color: "#ffffff", outline: "rgba(0,0,0,0.8)", outlineW: 3 });
      if (MH.state.best != null) {
        UI.panel(24, 24, 250, 44, { fill: "rgba(20,22,50,0.8)", border: "#ffe27a", r: 10, shadow: false });
        UI.text(`최고 퀴즈 점수  ${MH.state.best} / ${window.MAEHOL_QUIZ.length}`, 149, 46, 11 * 2 - 6, { align: CENTER, valign: CENTER, bold: true, color: "#ffe27a" });
      }
      if (MH.Input.clicked(START.x, START.y, START.w, START.h)) this.start();
      if (MH.Input.clicked(GEAR.x, GEAR.y, GEAR.w, GEAR.h)) { MH.Sfx.click(); Settings.show(false); }
    },
  };
})();
