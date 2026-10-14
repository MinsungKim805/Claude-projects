// ============================================================
//  메타 투어 매홀 - p5.js 진입점
//  장면: 불러오기 → 시작 화면 → 캐릭터 선택 → 플레이(맵 돌아다니기, 소개, 퀴즈)
// ============================================================

// 불러오기 장면
MH.scenes.boot = {
  t: 0,
  fontsReady: false,
  assetsReady: false,
  enter() {
    this.t = 0;
    const fonts = ["22px Galmuri11", "bold 22px Galmuri11", "11px Galmuri11"];
    Promise.all(fonts.map((f) => document.fonts.load(f, "매홀중학교 ABC 123"))).then(
      () => (this.fontsReady = true),
      () => (this.fontsReady = true)
    );
    MH.loadAssets().then(() => (this.assetsReady = true));
  },
  update(dt) {
    this.t += dt;
    if (this.fontsReady && this.assetsReady && this.t > 0.4) {
      MH.World.init();
      MH.go("title");
    }
  },
  draw() {
    background("#14101f");
    const A = MH.A;
    const p = A.total ? A.loaded / A.total : 0;
    textFont(this.fontsReady ? "Galmuri11" : "sans-serif");
    noStroke();
    fill("#ffe27a");
    textAlign(CENTER, CENTER);
    textSize(44);
    text("메타 투어 매홀", MH.W / 2, MH.H / 2 - 60);
    fill("rgba(255,255,255,0.15)");
    rect(MH.W / 2 - 220, MH.H / 2 + 10, 440, 18, 9);
    fill("#4fd17a");
    rect(MH.W / 2 - 220, MH.H / 2 + 10, 440 * p, 18, 9);
    fill("#d8d4ff");
    textSize(22);
    text("불러오는 중... " + Math.round(p * 100) + "%", MH.W / 2, MH.H / 2 + 60);
    if (A.errors.length) {
      fill("#ff9a9a");
      textSize(11);
      text("이미지 " + A.errors.length + "개를 못 불러왔어요 (폴더 구조를 확인해 주세요)", MH.W / 2, MH.H / 2 + 96);
    }
  },
};

function setup() {
  const c = createCanvas(MH.W, MH.H);
  c.parent("game");
  pixelDensity(1);
  noSmooth();
  frameRate(60);
  MH.Input.init();
  MH.go("boot");
}

function draw() {
  const dt = Math.min(deltaTime / 1000, 0.05);
  cursor("default");
  const s = MH.scene;
  if (s) {
    s.update(dt);
    s.draw();
  }
  MH.Input.endFrame();
}

function mousePressed() {
  MH.Input.click = { x: mouseX, y: mouseY };
  MH.Sfx.unlock();
  return false;
}

function keyPressed() {
  // 방향키/스페이스로 페이지가 움직이지 않도록 막아요
  if ([32, 37, 38, 39, 40].includes(keyCode)) return false;
}
