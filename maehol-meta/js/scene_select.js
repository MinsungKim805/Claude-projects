// ============================================================
//  캐릭터 선택 화면
//   - 티처블 머신 얼굴 인식: 동훈 / 민성 / 성민 → 해당 캐릭터가 선택돼요. No one이면 "얼굴이 안 보여요".
//   - 링크가 비어 있으면 1·2·3 키 또는 클릭으로 골라요.
// ============================================================
(function () {
  const UI = MH.UI;
  const CHARS = [
    { key: "donghun", name: "동훈", desc: "까만 머리의 씩씩한 친구" },
    { key: "minseong", name: "민성", desc: "동그란 안경이 잘 어울려요" },
    { key: "seongmin", name: "성민", desc: "모자가 멋진 유쾌한 친구" },
  ];
  MH.CHARS = CHARS;
  MH.charName = (key) => (CHARS.find((c) => c.key === key) || { name: "나" }).name;

  const CARD = { x0: 360, y: 150, w: 252, h: 360, gap: 22 };
  const cardX = (i) => CARD.x0 + i * (CARD.w + CARD.gap);

  MH.scenes.select = {
    t: 0,
    sel: 0,
    hold: 0,
    lastKey: null,

    enter() {
      this.t = 0;
      this.hold = 0;
      this.lastKey = null;
      const i = CHARS.findIndex((c) => c.key === MH.state.charKey);
      this.sel = i < 0 ? 0 : i;
      if (MH.TM.anyConfigured()) MH.TM.start();
    },

    choose(i, silent) {
      if (i === this.sel) return;
      this.sel = i;
      if (!silent) MH.Sfx.select();
    },

    confirm() {
      MH.state.charKey = CHARS[this.sel].key;
      MH.Sfx.done();
      MH.go("play", { fresh: true });
    },

    update(dt) {
      this.t += dt;
      MH.Settings.update();
      if (MH.Settings.open) return;
      const I = MH.Input;
      if (I.was("KeyM")) MH.Sfx.toggle();
      const n = I.number();
      if (n >= 0 && n < CHARS.length) this.choose(n);
      if (I.was("ArrowLeft") || I.was("KeyA")) this.choose((this.sel + CHARS.length - 1) % CHARS.length);
      if (I.was("ArrowRight") || I.was("KeyD")) this.choose((this.sel + 1) % CHARS.length);
      if (I.was("Escape")) { MH.go("title"); return; }
      if (I.action()) { this.confirm(); return; }

      // 얼굴 인식: 같은 얼굴이 계속 보이면 선택이 확정돼요
      const f = MH.TM.face;
      if (f.enabled && f.model !== undefined && MH.TM.faceConfigured()) {
        const key = f.key;
        if (key) {
          const idx = CHARS.findIndex((c) => c.key === key);
          if (idx >= 0) this.choose(idx);
          if (key === this.lastKey) this.hold += dt * 1000;
          else this.hold = 0;
          this.lastKey = key;
          if (this.hold >= (CONFIG.FACE_HOLD_MS || 1800)) this.confirm();
        } else {
          this.hold = 0;
          this.lastKey = null;
        }
      }
    },

    draw() {
      // 배경
      const ctx = drawingContext;
      const g = ctx.createLinearGradient(0, 0, 0, MH.H);
      g.addColorStop(0, "#3a2f73");
      g.addColorStop(1, "#1b1740");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, MH.W, MH.H);
      noStroke();
      for (let i = 0; i < 46; i++) {
        const sx = (i * 197) % MH.W, sy = (i * 83) % 420;
        fill(255, 255, 255, 80 + 120 * Math.abs(Math.sin(this.t * 1.4 + i)));
        rect(sx, sy, 3, 3);
      }
      // 제목
      UI.text("캐릭터를 골라 주세요", MH.W / 2, 40, 40, { align: CENTER, bold: true, color: "#ffe27a", outline: "#2a1a50", outlineW: 6 });
      const faceOn = MH.TM.faceConfigured();
      UI.text(faceOn ? "카메라에 얼굴을 보여 주면 내 캐릭터가 자동으로 골라져요!" : "숫자 1 · 2 · 3 을 누르거나 카드를 클릭해서 골라요", MH.W / 2, 96, 22, { align: CENTER, color: "#d8d4ff" });

      this.drawCameraPanel();

      // 카드
      CHARS.forEach((c, i) => this.drawCard(c, i));

      // 시작 버튼
      if (UI.button("이 캐릭터로 시작하기", MH.W / 2 + 70 - 190, 556, 380, 70, { size: 26 })) this.confirm();
      UI.text("Space / Enter 로도 시작해요", MH.W / 2 + 70, 640, 11, { align: CENTER, color: "rgba(255,255,255,0.6)" });
      if (UI.button("← 처음 화면", 30, 650, 190, 46, { size: 20, fill: "#c9c6ff", hoverFill: "#e4e2ff", border: "#3a3670", color: "#26225a" })) MH.go("title");
      if (UI.button("설정", 1200 - 90, 650, 80, 46, { size: 20, fill: "#c9c6ff", hoverFill: "#e4e2ff", border: "#3a3670", color: "#26225a" })) MH.Settings.show(false);
      MH.Settings.draw();
    },

    drawCard(c, i) {
      const x = cardX(i), y = CARD.y, w = CARD.w, h = CARD.h;
      const sel = this.sel === i;
      const hov = UI.hover(x, y, w, h) && !MH.Settings.open;
      const lift = sel ? -10 : hov ? -4 : 0;
      const f = MH.TM.face;
      const faceHit = MH.TM.faceConfigured() && f.key === c.key;
      UI.panel(x, y + lift, w, h, {
        fill: sel ? "rgba(255,244,200,0.98)" : "rgba(238,234,255,0.94)",
        border: sel ? "#ffb21f" : "#8f94ff",
        bw: sel ? 6 : 4, r: 16,
      });
      // 바닥 원
      push();
      noStroke();
      fill(sel ? "rgba(255,190,60,0.35)" : "rgba(120,110,200,0.25)");
      ellipse(x + w / 2, y + lift + 270, 150, 38);
      pop();
      const full = MH.A.portrait[c.key] && MH.A.portrait[c.key].full;
      if (full) {
        const bob = sel ? Math.round(Math.sin(this.t * 5) * 4) : 0;
        drawingContext.imageSmoothingEnabled = false;
        drawingContext.drawImage(full, x + w / 2 - full.width / 2, y + lift + 28 + bob, full.width, full.height);
      }
      UI.text(c.name, x + w / 2, y + lift + 292, 30, { align: CENTER, bold: true, color: "#3a2a70" });
      UI.text(c.desc, x + w / 2, y + lift + 330, 11, { align: CENTER, color: "#6a5ea0" });
      // 번호표
      UI.keycap(String(i + 1), x + 14, y + lift + 14);
      if (sel) UI.text("선택!", x + w - 16, y + lift + 18, 22, { align: RIGHT, bold: true, color: "#e0701a" });
      if (faceHit) {
        UI.text("얼굴 인식!", x + w / 2, y + lift - 30, 22, { align: CENTER, bold: true, color: "#8affb0", outline: "#103a20", outlineW: 5 });
        // 유지 시간 막대
        const p = MH.clamp(this.hold / (CONFIG.FACE_HOLD_MS || 1800), 0, 1);
        push();
        noStroke();
        fill("rgba(0,0,0,0.35)");
        rect(x + 20, y + lift + h - 16, w - 40, 8, 4);
        fill("#4fd17a");
        rect(x + 20, y + lift + h - 16, (w - 40) * p, 8, 4);
        pop();
      }
      if (hov && MH.Input.clicked(x, y, w, h)) {
        if (this.sel === i) this.confirm();
        else this.choose(i);
      }
      if (hov) cursor("pointer");
    },

    drawCameraPanel() {
      const TM = MH.TM;
      const x = 34, y = 150, w = 300, h = 360;
      UI.panel(x, y, w, h, { fill: "rgba(14,12,40,0.85)", border: "#6a66c0", r: 14 });
      if (!TM.faceConfigured()) {
        UI.text("얼굴 인식", x + w / 2, y + 22, 22, { align: CENTER, bold: true, color: "#ffe27a" });
        const lines = UI.wrap("티처블 머신 얼굴 인식 링크가 비어 있어요.\n\nconfig.js 의 TM_FACE_MODEL_URL 에 링크를 붙여 넣으면 카메라로 캐릭터를 고를 수 있어요.", w - 40, 11);
        let yy = y + 78;
        for (const ln of lines) { UI.text(ln, x + 20, yy, 11, { color: "#d8d4ff" }); yy += 20; }
        UI.text("지금은 키보드/마우스로\n골라 주세요", x + w / 2, y + h - 80, 22, { align: CENTER, bold: true, color: "#9ad0ff" });
        return;
      }
      UI.text("얼굴 인식 카메라", x + w / 2, y + 16, 22, { align: CENTER, bold: true, color: "#ffe27a" });
      const vx = x + 30, vy = y + 56, vs = 240;
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
        const msg = TM.cameraError ? "카메라 오류" : "카메라를 켜는 중...";
        UI.text(msg, vx + vs / 2, vy + vs / 2 - 12, 22, { align: CENTER, color: "#ffb0b0" });
        if (TM.cameraError) {
          const ln = UI.wrap(TM.cameraError, vs - 20, 11);
          let yy = vy + vs / 2 + 20;
          for (const s of ln) { UI.text(s, vx + 10, yy, 11, { color: "#ffd0d0" }); yy += 16; }
        }
      }
      // 인식 결과
      const f = TM.face;
      let label = "얼굴을 비춰 주세요";
      let col = "#d8d4ff";
      if (String(f.status).startsWith("오류")) { label = f.status; col = "#ff9a9a"; }
      else if (f.model) {
        if (f.none) { label = "얼굴이 보이지 않아요 (No one)"; col = "#ffd27a"; }
        else if (f.key) { label = `${MH.charName(f.key)}  ${Math.round(f.prob * 100)}%`; col = "#8affb0"; }
        else if (f.label) { label = `${f.label}?  ${Math.round(f.prob * 100)}%`; col = "#ffe27a"; }
      } else {
        label = f.status;
      }
      UI.text(label, x + w / 2, vy + vs + 14, 22, { align: CENTER, bold: true, color: col });
      // 확률 막대
      if (f.probs && f.probs.length) {
        let yy = vy + vs + 50;
        const sorted = f.probs.slice().sort((a, b) => b.p - a.p).slice(0, 4);
        for (const pr of sorted) {
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
})();
