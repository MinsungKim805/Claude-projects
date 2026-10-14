// =====================================================================
//  sketch.js  —  게임의 시작점  (p5.js)
//
//  p5.js 는 아래 두 함수를 자동으로 불러줘요.
//      setup() : 게임을 켤 때 딱 한 번
//      draw()  : 1초에 약 60번 (매 프레임)  →  "움직이기" 후 "그리기"
//
//  이 게임은 화면(장면)이 여러 개예요:
//      boot(불러오기) → title(시작 화면) → select(캐릭터 선택) → play(게임)
//  각 화면의 코드는 game/ 폴더에 있어요.
//
//  코드를 읽는 추천 순서:
//      sketch.js → game/1_basics.js → 2_world.js → 3_ui.js → 4_screens.js → 5_play.js → 6_teachable.js
// =====================================================================


// ---------------------------------------------------------------------
// boot 화면: 그림과 글꼴을 불러오는 동안 진행 막대를 보여줘요.
// ---------------------------------------------------------------------
MH.scenes.boot = {
  t: 0,
  fontsReady: false,
  assetsReady: false,

  enter() {
    this.t = 0;
    // 글꼴(Galmuri)을 먼저 불러와요. 그래야 첫 화면부터 한글이 예쁘게 나와요.
    const fonts = ["22px Galmuri11", "bold 22px Galmuri11", "11px Galmuri11"];
    Promise.all(fonts.map((f) => document.fonts.load(f, "매홀중학교 ABC 123"))).then(
      () => (this.fontsReady = true),
      () => (this.fontsReady = true)
    );
    // 모든 그림 불러오기 (1_basics.js)
    MH.loadAssets().then(() => (this.assetsReady = true));
  },

  update(dt) {
    this.t += dt;
    if (this.fontsReady && this.assetsReady && this.t > 0.4) {
      MH.World.init();      // 맵 준비 (2_world.js)
      MH.go("title");       // 시작 화면으로!
    }
  },

  draw() {
    background("#14101f");
    const A = MH.A;
    const progress = A.total ? A.loaded / A.total : 0;      // 0 ~ 1
    textFont(this.fontsReady ? "Galmuri11" : "sans-serif");
    noStroke();
    fill("#ffe27a");
    textAlign(CENTER, CENTER);
    textSize(44);
    text("메타 투어 매홀", MH.W / 2, MH.H / 2 - 60);
    fill("rgba(255,255,255,0.15)");
    rect(MH.W / 2 - 220, MH.H / 2 + 10, 440, 18, 9);              // 막대 바탕
    fill("#4fd17a");
    rect(MH.W / 2 - 220, MH.H / 2 + 10, 440 * progress, 18, 9);   // 막대 (불러온 만큼)
    fill("#d8d4ff");
    textSize(22);
    text("불러오는 중... " + Math.round(progress * 100) + "%", MH.W / 2, MH.H / 2 + 60);
    if (A.errors.length) {
      fill("#ff9a9a");
      textSize(11);
      text("이미지 " + A.errors.length + "개를 못 불러왔어요 (폴더 구조를 확인해 주세요)", MH.W / 2, MH.H / 2 + 96);
    }
  },
};


// ---------------------------------------------------------------------
// setup(): 게임을 켤 때 한 번 실행돼요.
// ---------------------------------------------------------------------
function setup() {
  const canvas = createCanvas(MH.W, MH.H);   // 1280 x 720 그림판 만들기
  canvas.parent("game");                      // index.html 의 <div id="game"> 안에 넣기
  pixelDensity(1);
  noSmooth();                                  // 그림을 확대해도 흐려지지 않게 (픽셀아트!)
  frameRate(60);
  Input.init();                                // 키보드 감시 시작 (1_basics.js)
  MH.go("boot");                               // 불러오기 화면부터 시작
}

// ---------------------------------------------------------------------
// draw(): 1초에 약 60번 실행돼요.
//   dt = 지난 프레임 이후 흐른 시간(초). 컴퓨터가 느려도 캐릭터 속도가 같도록 곱해 줘요.
// ---------------------------------------------------------------------
function draw() {
  const dt = Math.min(deltaTime / 1000, 0.05);
  cursor("default");
  if (MH.scene) {
    MH.scene.update(dt);   // 1) 움직이기
    MH.scene.draw();       // 2) 그리기
  }
  Input.endFrame();        // 3) 이번 프레임에만 유효한 입력 지우기
}

// 마우스를 눌렀을 때 p5.js 가 자동으로 불러줘요.
function mousePressed() {
  Input.click = { x: mouseX, y: mouseY };
  Sfx.unlock();
  return false;
}

// 방향키/스페이스를 눌러도 웹페이지가 움직이지 않게 막아요.
function keyPressed() {
  if ([32, 37, 38, 39, 40].includes(keyCode)) return false;
}
