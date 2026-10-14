// ============================================================
//  플레이 장면: 돌아다니기 → NPC 소개 듣기 → 문 열기 → 교실 퀴즈
// ============================================================
(function () {
  const UI = MH.UI;
  const W = MH.World;
  const AREA_ORDER = ["playground", "cafeteria", "gym", "library"];
  const STOPS = [
    { id: "playground", label: "운동장" },
    { id: "cafeteria", label: "급식실" },
    { id: "gym", label: "체육관" },
    { id: "library", label: "도서관" },
    { id: "classroom", label: "교실" },
  ];
  const script = () => window.MAEHOL_SCRIPT;
  const quizData = () => window.MAEHOL_QUIZ;

  const Play = (MH.scenes.play = {
    t: 0,
    mode: "explore",           // explore | dialogue | quiz
    dlg: null,
    quiz: null,
    hintGate: null,
    zoneId: null,
    zoneName: "",
    zoneT: 0,
    nearNpc: null,
    cool: {},
    gateCool: 0,
    chatIdx: {},
    faceSince: 0,
    mini: null,

    // ---------------------------------------------------------------- 시작
    enter(arg) {
      if (!W.player) W.init();
      if (arg && arg.fresh) {
        MH.state.reset();
        W.reset();
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
          W.refreshGates(false);
          UI.toast("시험 모드: 모든 문이 열려 있어요", "check");
        }
      }
      W.player.key = MH.state.charKey;
      if (!this.mini) this.buildMini();
      if (MH.TM.anyConfigured()) MH.TM.start();
    },

    buildMini() {
      const w = 150, h = Math.round((150 * W.h) / W.w);
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

    // ---------------------------------------------------------------- 진행 상태
    allDone() { return AREA_ORDER.every((a) => MH.state.done[a]); },

    nextTarget() {
      for (const a of AREA_ORDER) if (!MH.state.done[a]) return W.npcById[script().areas[a].npc];
      if (!MH.state.quizDone) return W.npcById[script().quiz.npc];
      return null;
    },

    objective() {
      const o = script().objective;
      for (const a of AREA_ORDER) if (!MH.state.done[a]) return o[a];
      return MH.state.quizDone ? o.done : o.quiz;
    },

    npcIcon(n) {
      if (this.mode !== "explore") return null;
      if (n.role === "guide" && !MH.state.done[n.area]) return "bubble_exclaim";
      if (n.role === "quiz" && this.allDone() && !MH.state.quizDone) return "bubble_exclaim";
      if (n === this.nearNpc) return "bubble_talk";
      return null;
    },

    // ---------------------------------------------------------------- 갱신
    update(dt) {
      this.t += dt;
      UI.updateToasts(dt);
      const I = MH.Input;
      if (I.was("KeyM")) MH.Sfx.toggle();
      MH.Settings.update();
      if (MH.Settings.open) return;
      if (I.was("Escape") && this.mode === "explore") { MH.Settings.show(true); return; }
      for (const k in this.cool) this.cool[k] = Math.max(0, this.cool[k] - dt);
      this.gateCool = Math.max(0, this.gateCool - dt);
      if (this.mode === "explore") this.updateExplore(dt);
      else if (this.mode === "dialogue") this.updateDialogue(dt);
      else if (this.mode === "quiz") this.updateQuiz(dt);
    },

    updateExplore(dt) {
      const I = MH.Input;
      const p = W.player;
      const move = I.move();
      W.update(dt, move);

      // 지금 있는 장소 이름
      const z = W.zoneAt(Math.floor(p.x / 32), Math.floor((p.y - 4) / 32));
      if (z && z.id !== this.zoneId) {
        this.zoneId = z.id;
        this.zoneName = z.id === "classroom" ? "교실 (퀴즈 존)" : z.name;
        this.zoneT = 0;
      }
      this.zoneT += dt;

      // 열린 문 안내 화살표는 문 가까이 가면 사라져요
      if (this.hintGate) {
        const c = W.gateCenter(this.hintGate);
        if (MH.dist(p.x, p.y, c.x, c.y) < 56) this.hintGate = null;
      }

      // 얼굴 인식으로 게임 중에도 캐릭터 바꾸기(설정에서 켰을 때만)
      if (CONFIG.FACE_LIVE_IN_GAME && MH.TM.face.model) {
        const k = MH.TM.face.key;
        if (k && k !== p.key) {
          this.faceSince += dt;
          if (this.faceSince > 0.8) {
            p.key = k;
            MH.state.charKey = k;
            this.faceSince = 0;
            UI.toast(`${MH.charName(k)}(으)로 바뀌었어요!`, "heart");
            MH.Sfx.select();
          }
        } else this.faceSince = 0;
      }

      // NPC 상호작용
      this.nearNpc = W.nearestNpc(p, 46);
      for (const n of W.npcs) {
        if (n.role === "guide" && !MH.state.done[n.area] && !(this.cool[n.id] > 0)) {
          if (MH.dist(p.x, p.y, n.x, n.y) < 62) { this.startNpc(n); return; }
        }
      }
      if (this.nearNpc && I.action()) { this.startNpc(this.nearNpc); return; }
      if (I.click) {
        const wx = I.click.x / MH.ZOOM + Math.round(W.cam.x), wy = I.click.y / MH.ZOOM + Math.round(W.cam.y);
        for (const n of W.npcs) {
          if (Math.abs(wx - n.x) < 16 && wy > n.y - 48 && wy < n.y + 4) {
            I.click = null;
            if (MH.dist(p.x, p.y, n.x, n.y) < 90) this.startNpc(n);
            else UI.toast(`${n.name}에게 더 가까이 가 보세요`, "bubble_talk");
            return;
          }
        }
      }

      // 닫힌 문에 부딪히면 이유를 알려줘요
      if ((move.x || move.y) && this.gateCool <= 0) {
        const g = W.closedGateNear(p, 10);
        if (g) {
          UI.toast(g.label, "lock");
          MH.Sfx.wrong();
          this.gateCool = 3;
        }
      }
    },

    // ---------------------------------------------------------------- NPC 대화
    startNpc(n) {
      const S = script();
      if (n.role === "guide") {
        const a = S.areas[n.area];
        this.openDialogue(n, a.lines, () => this.completeArea(n.area));
      } else if (n.role === "quiz") {
        const q = S.quiz;
        if (!this.allDone()) this.openDialogue(n, q.locked, null);
        else if (MH.state.quizDone) this.openDialogue(n, q.again, () => this.startQuiz());
        else this.openDialogue(n, q.intro, () => this.startQuiz());
      } else {
        const list = S.chat[n.id] || ["안녕!"];
        const i = (this.chatIdx[n.id] || 0) % list.length;
        this.chatIdx[n.id] = i + 1;
        this.openDialogue(n, [list[i]], null);
      }
    },

    openDialogue(npc, lines, onDone) {
      const arr = (lines || []).map((l) => (typeof l === "string" ? l : l.text));
      if (!arr.length) { if (onDone) onDone(); return; }
      this.mode = "dialogue";
      this.dlg = { npc, lines: arr, idx: 0, shown: 0, done: false, onDone, blip: 0 };
      MH.Sfx.click();
    },

    updateDialogue(dt) {
      const I = MH.Input;
      W.update(dt, { x: 0, y: 0 });
      const d = this.dlg;
      const text = d.lines[d.idx];
      if (!d.done) {
        const before = Math.floor(d.shown);
        d.shown += dt * (CONFIG.TEXT_SPEED || 42);
        if (Math.floor(d.shown) !== before && Math.floor(d.shown) % 3 === 0) MH.Sfx.blip();
        if (d.shown >= text.length) { d.shown = text.length; d.done = true; }
      }
      if (I.action() || I.click) {
        I.click = null;
        if (!d.done) { d.shown = text.length; d.done = true; return; }
        d.idx++;
        d.shown = 0;
        d.done = false;
        MH.Sfx.click();
        if (d.idx >= d.lines.length) {
          this.mode = "explore";
          this.cool[d.npc.id] = 2.5;
          const cb = d.onDone;
          this.dlg = null;
          if (cb) cb();
        }
      }
    },

    completeArea(area) {
      if (MH.state.done[area]) return;
      MH.state.done[area] = true;
      MH.Sfx.done();
      const a = script().areas[area];
      UI.toast(a.done || "소개를 잘 들었어요!", "star");
      const opened = W.refreshGates(true);
      if (opened.length) {
        this.hintGate = opened[opened.length - 1];
        setTimeout(() => { MH.Sfx.open(); UI.toast("문이 열렸어요! 화살표를 따라가 보세요", "check"); }, 900);
      }
    },

    // ---------------------------------------------------------------- 퀴즈
    startQuiz() {
      this.mode = "quiz";
      this.quiz = { i: 0, score: 0, state: "ask", sel: 0, picked: -1, results: [], t: 0 };
    },

    pick(idx) {
      const Q = this.quiz;
      const q = quizData()[Q.i];
      if (Q.state !== "ask" || idx < 0 || idx >= q.choices.length) return;
      Q.picked = idx;
      Q.sel = idx;
      const ok = idx === q.answer;
      if (ok) { Q.score++; MH.Sfx.correct(); } else MH.Sfx.wrong();
      Q.results.push(ok);
      Q.state = "feedback";
      Q.t = 0;
    },

    nextQuestion() {
      const Q = this.quiz;
      Q.i++;
      Q.picked = -1;
      Q.sel = 0;
      Q.t = 0;
      if (Q.i >= quizData().length) {
        Q.state = "result";
        MH.state.quizDone = true;
        MH.saveBest(Q.score);
        MH.Sfx.done();
      } else Q.state = "ask";
    },

    updateQuiz(dt) {
      const I = MH.Input;
      const Q = this.quiz;
      Q.t += dt;
      W.update(dt, { x: 0, y: 0 });
      const q = quizData()[Q.i];
      if (Q.state === "ask") {
        const n = I.number();
        if (n >= 0) this.pick(n);
        const nv = I.nav();
        if (nv) { Q.sel = (Q.sel + nv + q.choices.length) % q.choices.length; MH.Sfx.click(); }
        if (I.action()) this.pick(Q.sel);
      } else if (Q.state === "feedback") {
        if (Q.t > 0.3 && (I.action() || I.click)) { I.click = null; this.nextQuestion(); }
      } else if (Q.state === "result") {
        if (I.was("Escape")) this.closeQuiz();
      }
    },

    closeQuiz() {
      this.mode = "explore";
      this.quiz = null;
      this.cool.banjang = 1.5;
    },

    // ---------------------------------------------------------------- 그리기
    draw() {
      background("#14101f");
      W.draw(drawingContext, { npcIcon: (n) => this.npcIcon(n), hintGate: this.hintGate });
      this.drawTags();
      this.drawHUD();
      if (this.mode === "dialogue" && this.dlg) {
        const d = this.dlg;
        UI.dialogue({ name: d.npc.name, portrait: d.npc.key, text: d.lines[d.idx], shown: d.shown, done: d.done }, this.t);
      }
      if (this.mode === "quiz") this.drawQuiz();
      UI.drawToasts();
      MH.Settings.draw();
    },

    drawTags() {
      const p = W.player;
      for (const n of W.npcs) {
        const s = W.toScreen(n.x, n.y - 48);
        if (s.x < -60 || s.x > MH.W + 60 || s.y < -20 || s.y > MH.H + 20) continue;
        UI.nameTag(n.name, s.x, s.y - 4, { color: "#b8ffd8", bg: "rgba(10,40,30,0.75)" });
        if (n === this.nearNpc && this.mode === "explore") {
          const tw = UI.width(n.name, 11, true) / 2 + 14;
          const w = UI.keycap("Space", s.x + tw + 4, s.y - 24);
          UI.text("대화", s.x + tw + 4 + w + 6, s.y - 20, 11, { bold: true, color: "#ffffff", outline: "rgba(0,0,0,0.85)" });
        }
      }
      const s = W.toScreen(p.x, p.y - 48);
      UI.nameTag(MH.charName(p.key), s.x, s.y - 4, { color: "#ffe27a", bg: "rgba(60,40,10,0.78)" });
    },

    drawHUD() {
      // 장소 이름
      const zname = this.zoneName || "운동장";
      const zw = UI.width(zname, 22, true) + 56;
      UI.panel(16, 16, zw, 42, { fill: "rgba(20,22,50,0.86)", border: "#8f94ff", r: 10, shadow: false });
      push();
      noStroke();
      fill("#ff6a6a");
      ellipse(36, 34, 14, 14);
      fill("#ffffff");
      ellipse(36, 34, 5, 5);
      pop();
      UI.text(zname, 52, 38, 22, { valign: CENTER, bold: true });

      // 목표
      const obj = this.objective();
      const ow = Math.min(640, UI.width(obj, 22, false) + 40);
      UI.panel(16, 82, ow, 42, { fill: "rgba(60,40,10,0.86)", border: "#ffd34a", r: 10, shadow: false });
      UI.text(obj, 36, 104, 22, { valign: CENTER, color: "#ffe9a8" });

      this.drawRoute();
      this.drawMini();
      this.drawCam();
      this.drawArrow();
      if (UI.button("설정", 1110, 212, 150, 36, { size: 22, fill: "#c9c6ff", hoverFill: "#e4e2ff", border: "#3a3670", color: "#26225a" }) && this.mode === "explore") MH.Settings.show(true);
      // 조작 힌트
      if (this.mode === "explore" && this.t < 14) {
        const a = Math.min(1, (14 - this.t) / 2);
        push();
        drawingContext.globalAlpha = a;
        UI.text("WASD 이동  ·  Space 대화  ·  Esc 설정", MH.W / 2, 690, 11, { align: CENTER, color: "#ffffff", outline: "rgba(0,0,0,0.9)", outlineW: 4 });
        pop();
      }
      // 장소 이동 배너
      if (this.zoneT < 2.4 && this.mode === "explore") {
        const a = Math.min(1, this.zoneT / 0.3, (2.4 - this.zoneT) / 0.5);
        push();
        drawingContext.globalAlpha = Math.max(0, a);
        UI.text(this.zoneName, MH.W / 2, 170, 40, { align: CENTER, bold: true, color: "#ffffff", outline: "#2a1a50", outlineW: 8 });
        pop();
      }
    },

    // 위쪽 가운데: 가야 할 곳과 진행 상황
    drawRoute() {
      const w = 540, h = 56, x = (MH.W - w) / 2 - 80, y = 16;
      UI.panel(x, y, w, h, { fill: "rgba(20,22,50,0.86)", border: "#6a66c0", r: 12, shadow: false });
      const n = STOPS.length;
      const xs = STOPS.map((_, i) => x + 50 + (i * (w - 100)) / (n - 1));
      push();
      for (let i = 0; i < n - 1; i++) {
        const ok = MH.state.done[STOPS[i].id];
        stroke(ok ? "#4fd17a" : "#4a4a78");
        strokeWeight(5);
        line(xs[i] + 14, y + 22, xs[i + 1] - 14, y + 22);
      }
      pop();
      STOPS.forEach((s, i) => {
        const done = s.id === "classroom" ? MH.state.quizDone : MH.state.done[s.id];
        const cur = this.zoneId === s.id;
        push();
        stroke(cur ? "#ffe27a" : "#2a2a50");
        strokeWeight(cur ? 4 : 3);
        fill(done ? "#4fd17a" : "#3a3a68");
        ellipse(xs[i], y + 22, 24, 24);
        pop();
        if (done) {
          const c = MH.A.ui.check;
          if (c) drawingContext.drawImage(c, xs[i] - 8, y + 14, 16, 16);
        } else {
          UI.text(String(i + 1), xs[i], y + 23, 11, { align: CENTER, valign: CENTER, bold: true, color: "#c9c6ff" });
        }
        UI.text(s.label, xs[i], y + 40, 11, { align: CENTER, bold: cur, color: cur ? "#ffe27a" : "#d8d4ff" });
      });
    },

    drawMini() {
      if (!this.mini) return;
      const mw = this.mini.width, mh = this.mini.height;
      const x = MH.W - mw - 22, y = 18;
      UI.panel(x - 6, y - 6, mw + 12, mh + 12, { fill: "rgba(20,22,50,0.9)", border: "#6a66c0", bw: 3, r: 8, shadow: false });
      drawingContext.imageSmoothingEnabled = true;
      drawingContext.drawImage(this.mini, x, y);
      const k = mw / W.pw;
      push();
      noStroke();
      // 보이는 영역
      noFill();
      stroke(255, 255, 255, 140);
      strokeWeight(1);
      rect(x + W.cam.x * k, y + W.cam.y * k, 640 * k, 360 * k);
      noStroke();
      for (const n of W.npcs) {
        if (n.role === "chat") continue;
        fill(n.role === "quiz" ? "#ffb21f" : MH.state.done[n.area] ? "#4fd17a" : "#ff6a6a");
        rect(x + n.x * k - 2, y + n.y * k - 2, 4, 4);
      }
      fill("#ffe27a");
      stroke("#2a1a50");
      strokeWeight(1);
      ellipse(x + W.player.x * k, y + W.player.y * k, 7, 7);
      pop();
    },

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

    // 목표가 화면 밖에 있으면 가장자리에 화살표를 보여줘요
    drawArrow() {
      if (this.mode !== "explore") return;
      const t = this.nextTarget();
      if (!t) return;
      const s = W.toScreen(t.x, t.y - 20);
      const m = 60;
      if (s.x > m && s.x < MH.W - m && s.y > 130 && s.y < MH.H - m) return;
      const cx = MH.W / 2, cy = MH.H / 2;
      const ang = Math.atan2(s.y - cy, s.x - cx);
      const ex = MH.clamp(cx + Math.cos(ang) * 900, m, MH.W - m);
      const ey = MH.clamp(cy + Math.sin(ang) * 900, 140, MH.H - m);
      const bob = Math.sin(this.t * 5) * 4;
      push();
      translate(ex + Math.cos(ang) * bob, ey + Math.sin(ang) * bob);
      rotate(ang);
      stroke("#7a4a10");
      strokeWeight(4);
      fill("#ffe14a");
      triangle(24, 0, -14, -18, -14, 18);
      pop();
      UI.text(t.name, ex, ey + 30, 11, { align: CENTER, bold: true, color: "#ffe14a", outline: "rgba(0,0,0,0.85)", outlineW: 4 });
    },

    // ---------------------------------------------------------------- 퀴즈 그리기
    drawQuiz() {
      const Q = this.quiz;
      const data = quizData();
      UI.dim(0.55);
      const x = 110, y = 36, w = 1060, h = 648;
      UI.panel(x, y, w, h, { fill: "rgba(24,26,58,0.98)", border: "#ffe27a", r: 18, inner: "rgba(255,255,255,0.1)" });

      if (Q.state === "result") return this.drawResult(x, y, w, h);

      const q = data[Q.i];
      // 머리글
      UI.text(`퀴즈 ${Q.i + 1} / ${data.length}`, x + 40, y + 28, 22, { bold: true, color: "#ffe27a" });
      for (let i = 0; i < data.length; i++) {
        const done = i < Q.results.length;
        push();
        stroke("#2a2a50");
        strokeWeight(3);
        fill(done ? (Q.results[i] ? "#4fd17a" : "#ff6a6a") : i === Q.i ? "#ffe27a" : "#3a3a68");
        ellipse(x + w - 60 - (data.length - 1 - i) * 30, y + 40, 20, 20);
        pop();
      }
      // 문제
      const ql = UI.wrap(q.q, w - 100, 30, true);
      let qy = y + 76;
      for (const ln of ql) { UI.text(ln, x + 50, qy, 30, { bold: true, color: "#ffffff" }); qy += 42; }

      // 보기
      const n = q.choices.length;
      const cy0 = y + 76 + Math.max(1, ql.length) * 42 + 20;
      const ch = 62, gap = 12;
      for (let i = 0; i < n; i++) {
        const cy = cy0 + i * (ch + gap);
        const hov = UI.hover(x + 50, cy, w - 100, ch) && Q.state === "ask";
        const isSel = Q.sel === i;
        let fillc = "rgba(60,62,120,0.9)", border = "#6a66c0";
        if (Q.state === "ask" && (hov || isSel)) { fillc = "rgba(110,100,190,0.95)"; border = "#ffe27a"; }
        if (Q.state === "feedback") {
          if (i === q.answer) { fillc = "rgba(40,120,70,0.95)"; border = "#8affb0"; }
          else if (i === Q.picked) { fillc = "rgba(150,50,60,0.95)"; border = "#ff9aa8"; }
          else { fillc = "rgba(40,42,80,0.7)"; border = "#3a3a68"; }
        }
        UI.panel(x + 50, cy, w - 100, ch, { fill: fillc, border, r: 12, shadow: false, bw: 3 });
        push();
        noStroke();
        fill(Q.state === "feedback" && i === q.answer ? "#4fd17a" : "#ffe27a");
        ellipse(x + 92, cy + ch / 2, 40, 40);
        pop();
        UI.text(String(i + 1), x + 92, cy + ch / 2 + 1, 22, { align: CENTER, valign: CENTER, bold: true, color: "#3a2a08" });
        UI.text(q.choices[i], x + 130, cy + ch / 2 + 1, 22, { valign: CENTER, color: "#ffffff" });
        if (Q.state === "feedback" && i === q.answer) UI.text("정답!", x + w - 80, cy + ch / 2 + 1, 22, { align: RIGHT, valign: CENTER, bold: true, color: "#b8ffd0" });
        if (Q.state === "ask" && hov) {
          cursor("pointer");
          if (MH.Input.clicked(x + 50, cy, w - 100, ch)) this.pick(i);
        }
      }
      if (Q.state === "ask") {
        UI.text("1~4 번호 · ↑↓ + Space · 클릭으로 골라요", x + w / 2, y + h - 34, 11, { align: CENTER, color: "rgba(255,255,255,0.6)" });
      }
      // 결과 안내
      if (Q.state === "feedback") {
        const ok = Q.results[Q.results.length - 1];
        const by = y + h - 108;
        UI.text(ok ? "정답이에요!" : "아쉬워요! 다시 기억해 봐요", x + 50, by, 30, { bold: true, color: ok ? "#8affb0" : "#ffb0b8" });
        const el = UI.wrap(q.explain || "", w - 360, 22, false);
        let ey = by + 44;
        for (const ln of el.slice(0, 2)) { UI.text(ln, x + 50, ey, 22, { color: "#e8e4ff" }); ey += 30; }
        const last = Q.i === data.length - 1;
        if (UI.button(last ? "결과 보기" : "다음 문제", x + w - 250, by + 6, 200, 60, { size: 24 }) && Q.t > 0.3) this.nextQuestion();
      }
    },

    drawResult(x, y, w, h) {
      const Q = this.quiz;
      const n = quizData().length;
      const ratio = Q.score / n;
      UI.text("퀴즈 결과", x + w / 2, y + 36, 36, { align: CENTER, bold: true, color: "#ffe27a" });
      UI.text(`${Q.score} / ${n}`, x + w / 2, y + 120, 96, { align: CENTER, bold: true, color: "#ffffff", outline: "#2a1a50", outlineW: 10 });
      // 별
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
      const msg = ratio >= 1 ? "만점이에요! 우리 학교 박사님이네요!" : ratio >= 0.6 ? "잘했어요! 우리 학교를 잘 알고 있어요." : "소개를 다시 한 번 들어 보고 도전해 봐요!";
      UI.text(msg, x + w / 2, y + 340, 30, { align: CENTER, bold: true, color: "#ffffff" });
      if (MH.state.best != null) UI.text(`내 최고 점수  ${MH.state.best} / ${n}`, x + w / 2, y + 400, 22, { align: CENTER, color: "#ffe27a" });
      const by = y + h - 130;
      if (UI.button("다시 풀기", x + 90, by, 270, 70, { size: 26 })) { this.startQuiz(); MH.Sfx.select(); }
      if (UI.button("계속 둘러보기", x + 395, by, 270, 70, { size: 26, fill: "#9ad0ff", hoverFill: "#c6e6ff", border: "#1f4a7a", color: "#12304f" })) this.closeQuiz();
      if (UI.button("처음으로", x + 700, by, 270, 70, { size: 26, fill: "#ff9aa8", hoverFill: "#ffc4cc", border: "#7a1f2f", color: "#4f1220" })) MH.go("title");
    },
  });
})();
