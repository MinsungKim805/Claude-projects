// ============================================================
//  화면 UI 도우미 (p5로 그려요): 패널, 버튼, 이름표, 대화창, 알림
// ============================================================
(function () {
  const FONT = "Galmuri11";
  const UI = (MH.UI = {
    toasts: [],
    hoverId: null,
  });

  // ---------------------------------------------------------------- 기본 도구
  UI.font = function (size, bold) {
    textFont(FONT);
    textSize(size);
    textStyle(bold ? BOLD : NORMAL);
  };

  UI.text = function (s, x, y, size, o = {}) {
    push();
    UI.font(size, o.bold);
    textAlign(o.align || LEFT, o.valign || TOP);
    if (o.outline) {
      stroke(o.outline);
      strokeWeight(o.outlineW || 3);
      strokeJoin(ROUND);
    } else {
      noStroke();
    }
    fill(o.color || "#ffffff");
    text(s, Math.round(x), Math.round(y));
    pop();
  };

  UI.width = function (s, size, bold) {
    push();
    UI.font(size, bold);
    const w = textWidth(s);
    pop();
    return w;
  };

  // 가로 길이에 맞게 줄바꿈
  UI.wrap = function (s, maxW, size, bold) {
    const lines = [];
    push();
    UI.font(size, bold);
    for (const para of String(s).split("\n")) {
      let cur = "";
      const words = para.split(/(\s+)/);
      for (const w of words) {
        if (textWidth(cur + w) <= maxW) { cur += w; continue; }
        if (cur.trim()) { lines.push(cur.trimEnd()); cur = ""; }
        if (textWidth(w) <= maxW) { cur = w.trimStart(); continue; }
        for (const ch of w) {          // 단어가 너무 길면 글자 단위로 자르기
          if (textWidth(cur + ch) > maxW) { lines.push(cur); cur = ""; }
          cur += ch;
        }
      }
      lines.push(cur.trimEnd());
    }
    pop();
    return lines;
  };

  UI.panel = function (x, y, w, h, o = {}) {
    push();
    const r = o.r == null ? 10 : o.r;
    if (o.shadow !== false) {
      noStroke();
      fill(0, 0, 0, 70);
      rect(x + 4, y + 6, w, h, r);
    }
    fill(o.fill || "rgba(22,24,52,0.94)");
    stroke(o.border || "#8f94ff");
    strokeWeight(o.bw == null ? 4 : o.bw);
    rect(x, y, w, h, r);
    if (o.inner) {
      noFill();
      stroke(o.inner);
      strokeWeight(1);
      rect(x + 6, y + 6, w - 12, h - 12, Math.max(0, r - 4));
    }
    pop();
  };

  UI.hover = function (x, y, w, h) {
    return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
  };

  // 버튼: 눌렸으면 true. opts: { size, fill, hoverFill, color, border, disabled, key }
  UI.button = function (label, x, y, w, h, o = {}) {
    const hov = !o.disabled && UI.hover(x, y, w, h);
    push();
    const lift = hov ? -2 : 0;
    noStroke();
    fill(0, 0, 0, 80);
    rect(x + 3, y + 5, w, h, 10);
    fill(o.disabled ? "#6a6a7c" : hov ? o.hoverFill || "#ffe680" : o.fill || "#ffd34a");
    stroke(o.border || "#7a4a10");
    strokeWeight(4);
    rect(x, y + lift, w, h, 10);
    noStroke();
    fill(255, 255, 255, 70);
    rect(x + 6, y + lift + 5, w - 12, 5, 3);
    pop();
    UI.text(label, x + w / 2, y + h / 2 + lift + 1, o.size || 22, { align: CENTER, valign: CENTER, bold: true, color: o.color || "#5a2a08" });
    if (hov && MH.Input.click) {
      MH.Input.click = null;
      if (MH.Sfx) MH.Sfx.click();
      return true;
    }
    if (hov) cursor("pointer");
    return false;
  };

  // ZEP처럼 캐릭터 머리 위에 뜨는 이름표
  UI.nameTag = function (name, sx, sy, o = {}) {
    push();
    UI.font(11, true);
    const w = Math.ceil(textWidth(name)) + 14;
    const h = 18;
    noStroke();
    fill(o.bg || "rgba(14,14,30,0.72)");
    rect(Math.round(sx - w / 2), Math.round(sy - h), w, h, 9);
    pop();
    UI.text(name, sx, sy - h / 2 + 1, 11, { align: CENTER, valign: CENTER, bold: true, color: o.color || "#ffffff" });
  };

  UI.keycap = function (label, x, y) {
    const w = Math.max(26, UI.width(label, 11, true) + 14);
    push();
    noStroke();
    fill(0, 0, 0, 90);
    rect(x + 1, y + 3, w, 22, 5);
    fill("#f4f1ff");
    stroke("#5a56a0");
    strokeWeight(2);
    rect(x, y, w, 22, 5);
    pop();
    UI.text(label, x + w / 2, y + 12, 11, { align: CENTER, valign: CENTER, bold: true, color: "#3a3670" });
    return w;
  };

  // ---------------------------------------------------------------- 알림(토스트)
  UI.toast = function (msg, icon) {
    UI.toasts.push({ msg, icon, t: 0, life: 3.6 });
    if (UI.toasts.length > 3) UI.toasts.shift();
  };
  UI.updateToasts = function (dt) {
    for (const t of UI.toasts) t.t += dt;
    UI.toasts = UI.toasts.filter((t) => t.t < t.life);
  };
  UI.drawToasts = function () {
    let y = 96;
    for (const t of UI.toasts) {
      const a = Math.min(1, t.t / 0.2, (t.life - t.t) / 0.4);
      const w = Math.max(260, UI.width(t.msg, 22, true) + 70);
      const x = MH.W / 2 - w / 2;
      const yy = y + (1 - Math.min(1, t.t / 0.2)) * -14;
      push();
      drawingContext.globalAlpha = Math.max(0, a);
      UI.panel(x, yy, w, 52, { fill: "rgba(30,28,70,0.95)", border: "#ffd34a", r: 14 });
      pop();
      push();
      drawingContext.globalAlpha = Math.max(0, a);
      const im = t.icon && MH.A.ui[t.icon];
      if (im) drawingContext.drawImage(im, x + 16, yy + 26 - im.height, im.width * 2, im.height * 2);
      UI.text(t.msg, x + (im ? 50 : 0) + (w - (im ? 50 : 0)) / 2, yy + 27, 22, { align: CENTER, valign: CENTER, bold: true, color: "#ffffff" });
      pop();
      y += 62;
    }
  };

  // ---------------------------------------------------------------- 대화창
  // d: { name, portrait, text, shown, done }
  UI.dialogue = function (d, t) {
    const x = 90, y = 500, w = 1100, h = 196;
    // 이름표
    const nameW = Math.max(120, UI.width(d.name, 22, true) + 44);
    UI.panel(x, y, w, h, { fill: "rgba(20,22,50,0.95)", border: "#ffe27a", r: 14, inner: "rgba(255,255,255,0.12)" });
    UI.panel(x + 28, y - 22, nameW, 40, { fill: "#ffd34a", border: "#7a4a10", r: 10, shadow: false });
    UI.text(d.name, x + 28 + nameW / 2, y - 2, 22, { align: CENTER, valign: CENTER, bold: true, color: "#5a2a08" });
    // 얼굴
    push();
    fill("#e8e4ff");
    stroke("#8f94ff");
    strokeWeight(4);
    rect(x + 28, y + 30, 132, 132, 12);
    pop();
    const pi = d.portrait && MH.A.portrait[d.portrait] && MH.A.portrait[d.portrait].face;
    if (pi) {
      const s = 1.05;
      drawingContext.imageSmoothingEnabled = false;
      drawingContext.drawImage(pi, x + 28 + 66 - (pi.width * s) / 2, y + 30 + 70 - (pi.height * s) / 2, pi.width * s, pi.height * s);
    }
    // 글씨(한 글자씩)
    const tx = x + 190, tw = w - 190 - 40;
    const lines = UI.wrap(d.text, tw, 22, false);
    let left = Math.floor(d.shown);
    let ly = y + 36;
    for (const ln of lines) {
      if (left <= 0) break;
      UI.text(ln.slice(0, left), tx, ly, 22, { color: "#ffffff" });
      left -= ln.length;
      ly += 36;
    }
    if (d.done) {
      const a = 0.5 + 0.5 * Math.sin(t * 6);
      push();
      noStroke();
      fill(255, 226, 122, 255 * a);
      triangle(x + w - 60, y + h - 44, x + w - 36, y + h - 44, x + w - 48, y + h - 28);
      pop();
      UI.text("Space / 클릭", x + w - 40, y + h - 28, 11, { align: RIGHT, color: "rgba(255,255,255,0.6)" });
    }
  };

  UI.dim = function (a) {
    push();
    noStroke();
    fill(8, 6, 20, 255 * a);
    rect(0, 0, MH.W, MH.H);
    pop();
  };
})();
