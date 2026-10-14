// =====================================================================
//  game/3_ui.js  —  화면 꾸미기 도구 (UI)
//
//  버튼, 패널(상자), 이름표, 대화창, 알림 같은 "화면 위에 얹는 것"을
//  그리는 도구들이에요. 모두 p5.js 로 그려요. (rect, text, fill ...)
//  마지막에는 "설정 창"도 들어 있어요.
//
//  고쳐 볼 만한 곳:  색깔(예: "#ffd34a"), 글자 크기, 대화창 위치(UI.dialogue 의 x, y)
// =====================================================================

const FONT = "Galmuri11";      // 한글 픽셀 폰트 (fonts 폴더)

const UI = (MH.UI = {
  toasts: [],                  // 위쪽에 잠깐 뜨는 알림 목록
});


// ---------------------------------------------------------------------
// 글씨 쓰기
// ---------------------------------------------------------------------

// 글꼴 크기를 정해요. bold=true 면 굵게.
UI.font = function (size, bold) {
  textFont(FONT);
  textSize(size);
  textStyle(bold ? BOLD : NORMAL);
};

// 글씨를 (x, y) 에 써요.
//   o 에 { align: CENTER, valign: CENTER, bold: true, color: "#ffffff", outline: "#000000" } 처럼 옵션을 넣어요.
UI.text = function (s, x, y, size, o = {}) {
  push();
  UI.font(size, o.bold);
  textAlign(o.align || LEFT, o.valign || TOP);
  if (o.outline) {                       // 글씨 테두리
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

// 글씨의 가로 길이(픽셀)
UI.width = function (s, size, bold) {
  push();
  UI.font(size, bold);
  const w = textWidth(s);
  pop();
  return w;
};

// 긴 글을 maxW 너비에 맞게 여러 줄로 나눠요. 결과는 줄들의 배열이에요.
UI.wrap = function (s, maxW, size, bold) {
  const lines = [];
  push();
  UI.font(size, bold);
  for (const para of String(s).split("\n")) {
    let cur = "";
    for (const word of para.split(/(\s+)/)) {
      if (textWidth(cur + word) <= maxW) { cur += word; continue; }   // 아직 한 줄에 들어가요
      if (cur.trim()) { lines.push(cur.trimEnd()); cur = ""; }         // 넘치면 줄바꿈
      if (textWidth(word) <= maxW) { cur = word.trimStart(); continue; }
      for (const ch of word) {                                         // 단어가 너무 길면 글자 단위로 자르기
        if (textWidth(cur + ch) > maxW) { lines.push(cur); cur = ""; }
        cur += ch;
      }
    }
    lines.push(cur.trimEnd());
  }
  pop();
  return lines;
};


// ---------------------------------------------------------------------
// 상자(패널)와 버튼
// ---------------------------------------------------------------------

// 둥근 모서리 상자. o 에 { fill, border, r(둥글기), bw(테두리 굵기), shadow } 를 넣을 수 있어요.
UI.panel = function (x, y, w, h, o = {}) {
  push();
  const r = o.r == null ? 10 : o.r;
  if (o.shadow !== false) {              // 그림자
    noStroke();
    fill(0, 0, 0, 70);
    rect(x + 4, y + 6, w, h, r);
  }
  fill(o.fill || "rgba(22,24,52,0.94)");
  stroke(o.border || "#8f94ff");
  strokeWeight(o.bw == null ? 4 : o.bw);
  rect(x, y, w, h, r);
  if (o.inner) {                         // 안쪽 얇은 줄
    noFill();
    stroke(o.inner);
    strokeWeight(1);
    rect(x + 6, y + 6, w - 12, h - 12, Math.max(0, r - 4));
  }
  pop();
};

// 마우스가 사각형 위에 있는지
UI.hover = function (x, y, w, h) {
  return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
};

// 버튼을 그리고, "눌렸으면 true" 를 돌려줘요.
//   사용 예)  if (UI.button("시작", 100, 100, 200, 60)) { ...눌렀을 때 할 일... }
UI.button = function (label, x, y, w, h, o = {}) {
  const hovering = !o.disabled && UI.hover(x, y, w, h);
  push();
  const lift = hovering ? -2 : 0;        // 마우스를 올리면 살짝 떠올라요
  noStroke();
  fill(0, 0, 0, 80);
  rect(x + 3, y + 5, w, h, 10);          // 그림자
  fill(o.disabled ? "#6a6a7c" : hovering ? o.hoverFill || "#ffe680" : o.fill || "#ffd34a");
  stroke(o.border || "#7a4a10");
  strokeWeight(4);
  rect(x, y + lift, w, h, 10);
  noStroke();
  fill(255, 255, 255, 70);
  rect(x + 6, y + lift + 5, w - 12, 5, 3);   // 반짝이는 줄
  pop();
  UI.text(label, x + w / 2, y + h / 2 + lift + 1, o.size || 22, { align: CENTER, valign: CENTER, bold: true, color: o.color || "#5a2a08" });
  if (hovering && Input.click) {         // 마우스를 올린 채 클릭했다면
    Input.click = null;
    Sfx.click();
    return true;
  }
  if (hovering) cursor("pointer");
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

// 키보드 키 모양 그림 (예: [Space]). 가로 길이를 돌려줘요.
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

// 화면 전체를 어둡게 (팝업 뒤에 깔아요). a = 0~1
UI.dim = function (a) {
  push();
  noStroke();
  fill(8, 6, 20, 255 * a);
  rect(0, 0, MH.W, MH.H);
  pop();
};


// ---------------------------------------------------------------------
// 알림(토스트): 위쪽에 잠깐 떴다 사라지는 메시지
//   UI.toast("문이 열렸어요!", "check");   // 두 번째는 아이콘 이름(없어도 돼요)
// ---------------------------------------------------------------------
UI.toast = function (msg, icon) {
  UI.toasts.push({ msg, icon, t: 0, life: 3.6 });
  if (UI.toasts.length > 3) UI.toasts.shift();    // 최대 3개까지만
};
UI.updateToasts = function (dt) {
  for (const t of UI.toasts) t.t += dt;
  UI.toasts = UI.toasts.filter((t) => t.t < t.life);   // 시간이 지난 알림은 지워요
};
UI.drawToasts = function () {
  let y = 96;
  for (const t of UI.toasts) {
    const alpha = Math.min(1, t.t / 0.2, (t.life - t.t) / 0.4);       // 서서히 나타나고 서서히 사라져요
    const w = Math.max(260, UI.width(t.msg, 22, true) + 70);
    const x = MH.W / 2 - w / 2;
    const yy = y + (1 - Math.min(1, t.t / 0.2)) * -14;               // 위에서 살짝 내려오며 등장
    push();
    drawingContext.globalAlpha = Math.max(0, alpha);
    UI.panel(x, yy, w, 52, { fill: "rgba(30,28,70,0.95)", border: "#ffd34a", r: 14 });
    const im = t.icon && MH.A.ui[t.icon];
    if (im) drawingContext.drawImage(im, x + 16, yy + 26 - im.height, im.width * 2, im.height * 2);
    UI.text(t.msg, x + (im ? 50 : 0) + (w - (im ? 50 : 0)) / 2, yy + 27, 22, { align: CENTER, valign: CENTER, bold: true, color: "#ffffff" });
    pop();
    y += 62;
  }
};


// ---------------------------------------------------------------------
// 대화창: NPC가 말할 때 아래쪽에 나오는 상자
//   d = { name: 이름, portrait: 캐릭터 key, text: 대사, shown: 지금까지 보여준 글자 수, done: 다 나왔는지 }
// ---------------------------------------------------------------------
UI.dialogue = function (d, t) {
  const x = 90, y = 500, w = 1100, h = 196;        // 대화창의 위치와 크기

  // 상자와 이름표
  const nameW = Math.max(120, UI.width(d.name, 22, true) + 44);
  UI.panel(x, y, w, h, { fill: "rgba(20,22,50,0.95)", border: "#ffe27a", r: 14, inner: "rgba(255,255,255,0.12)" });
  UI.panel(x + 28, y - 22, nameW, 40, { fill: "#ffd34a", border: "#7a4a10", r: 10, shadow: false });
  UI.text(d.name, x + 28 + nameW / 2, y - 2, 22, { align: CENTER, valign: CENTER, bold: true, color: "#5a2a08" });

  // 얼굴 그림
  push();
  fill("#e8e4ff");
  stroke("#8f94ff");
  strokeWeight(4);
  rect(x + 28, y + 30, 132, 132, 12);
  pop();
  const face = d.portrait && MH.A.portrait[d.portrait] && MH.A.portrait[d.portrait].face;
  if (face) {
    drawingContext.imageSmoothingEnabled = false;
    drawingContext.drawImage(face, x + 28 + 66 - face.width / 2, y + 30 + 70 - face.height / 2, face.width, face.height);
  }

  // 글씨: 한 글자씩 나타나요 (d.shown 개까지만 보여줘요)
  const textX = x + 190, textW = w - 190 - 40;
  const lines = UI.wrap(d.text, textW, 22, false);
  let left = Math.floor(d.shown);
  let lineY = y + 36;
  for (const line of lines) {
    if (left <= 0) break;
    UI.text(line.slice(0, left), textX, lineY, 22, { color: "#ffffff" });
    left -= line.length;
    lineY += 36;
  }

  // 다 나왔으면 "다음" 표시(▼)가 깜빡여요
  if (d.done) {
    const blink = 0.5 + 0.5 * Math.sin(t * 6);
    push();
    noStroke();
    fill(255, 226, 122, 255 * blink);
    triangle(x + w - 60, y + h - 44, x + w - 36, y + h - 44, x + w - 48, y + h - 28);
    pop();
    UI.text("Space / 클릭", x + w - 40, y + h - 28, 11, { align: RIGHT, color: "rgba(255,255,255,0.6)" });
  }
};


// =====================================================================
//  설정 창 (시작 화면과 게임 중에 모두 열 수 있어요)
//  조작 방법과 티처블 머신 연결 상태를 보여줘요.
// =====================================================================
const Settings = (MH.Settings = {
  open: false,
  fromGame: false,     // 게임 중에 열었는지 (그러면 "처음으로" 버튼이 나와요)

  show(fromGame) { this.open = true; this.fromGame = !!fromGame; },
  hide() { this.open = false; },

  // 티처블 머신 연결 상태를 한 줄로 알려 줘요.  kind = "face" 또는 "motion"
  statusLine(kind) {
    const connected = kind === "face" ? MH.TM.faceConfigured() : MH.TM.motionConfigured();
    if (!connected) return { text: "링크가 비어 있어요 (키보드/마우스 사용)", col: "#b8b8d8" };
    const status = kind === "face" ? MH.TM.face.status : MH.TM.motion.status;
    if (MH.TM.cameraError) return { text: "카메라 오류: " + MH.TM.cameraError, col: "#ff9a9a" };
    if (status === "준비됨" || status === "준비됨(테스트)") return { text: "연결됨", col: "#8affb0" };
    if (String(status).startsWith("오류")) return { text: status, col: "#ff9a9a" };
    return { text: status === "off" ? "아직 시작하지 않았어요" : status, col: "#ffe27a" };
  },

  update() {
    if (this.open && Input.was("Escape")) this.hide();    // Esc 로 닫기
  },

  draw() {
    if (!this.open) return;
    UI.dim(0.6);
    const x = 240, y = 70, w = 800, h = 580;
    UI.panel(x, y, w, h, { fill: "rgba(24,26,58,0.98)", border: "#ffe27a", r: 16, inner: "rgba(255,255,255,0.1)" });
    UI.text("설정 / 조작 방법", x + w / 2, y + 22, 30, { align: CENTER, bold: true, color: "#ffe27a" });

    // 조작 방법 표
    const rows = [
      ["이동", "W A S D  또는  방향키"],
      ["대화 / 선택", "Space  ·  Enter  ·  E  또는  마우스 클릭"],
      ["퀴즈 답 고르기", "1 2 3 4  또는  ↑ ↓ + Space  또는  클릭"],
      ["소리 켜기/끄기", "M"],
      ["이 창 열기/닫기", "Esc"],
    ];
    let yy = y + 82;
    for (const [name, how] of rows) {
      UI.text(name, x + 50, yy, 22, { bold: true, color: "#9ad0ff" });
      UI.text(how, x + 290, yy, 22, { color: "#ffffff" });
      yy += 42;
    }

    // 티처블 머신 상태
    yy += 10;
    UI.text("티처블 머신", x + 50, yy, 24, { bold: true, color: "#ffe27a" });
    yy += 40;
    const face = this.statusLine("face"), motion = this.statusLine("motion");
    UI.text("얼굴 인식 (캐릭터 선택)", x + 50, yy, 22, { color: "#ffffff" });
    UI.text(face.text, x + 400, yy, 22, { color: face.col });
    yy += 38;
    UI.text("동작 인식 (캐릭터 이동)", x + 50, yy, 22, { color: "#ffffff" });
    UI.text(motion.text, x + 400, yy, 22, { color: motion.col });
    yy += 44;
    UI.text("링크는 config.js 의 TM_FACE_MODEL_URL / TM_MOTION_MODEL_URL 에 붙여 넣어요.", x + 50, yy, 11, { color: "rgba(255,255,255,0.65)" });

    // 아래 버튼들
    const by = y + h - 84;
    if (UI.button("닫기", x + 60, by, 200, 56, { size: 24 })) this.hide();
    const soundLabel = Sfx.muted ? "소리 켜기" : "소리 끄기";
    if (UI.button(soundLabel, x + 290, by, 200, 56, { size: 22, fill: "#9ad0ff", hoverFill: "#c6e6ff", border: "#1f4a7a", color: "#12304f" })) Sfx.toggle();
    if (this.fromGame) {
      if (UI.button("처음으로", x + 520, by, 220, 56, { size: 22, fill: "#ff9aa8", hoverFill: "#ffc4cc", border: "#7a1f2f", color: "#4f1220" })) {
        this.hide();
        MH.go("title");
      }
    }
  },
});
