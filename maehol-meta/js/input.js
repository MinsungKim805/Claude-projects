// 입력 장치 모으기: 키보드 + 마우스 + (티처블 머신 동작 인식)
(function () {
  const Input = (MH.Input = {
    keys: {},
    pressed: {},
    click: null,        // 이번 프레임에 클릭된 위치 {x, y} (UI가 처리하면 비워요)
    motionDir: null,    // 동작 인식이 알려 주는 방향 'up'|'down'|'left'|'right'|null
    motionAction: false,
    _motionNav: 0,
    _lastMotionDir: null,

    init() {
      const GAME_KEYS = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
      window.addEventListener("keydown", (e) => {
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        if (!e.repeat) this.pressed[e.code] = true;
        this.keys[e.code] = true;
        if (MH.Sfx) MH.Sfx.unlock();
      });
      window.addEventListener("keyup", (e) => { this.keys[e.code] = false; });
      window.addEventListener("blur", () => { this.keys = {}; });
    },

    down(code) { return !!this.keys[code]; },
    was(code) { return !!this.pressed[code]; },

    // 움직임 방향(WASD, 화살표, 동작 인식). 화면 기준 위/아래/왼쪽/오른쪽이에요.
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

    // 확인(대화 넘기기, 선택)
    action() {
      return this.was("Space") || this.was("Enter") || this.was("NumpadEnter") || this.was("KeyE") || this.motionAction;
    },

    // 메뉴 위/아래 이동: -1, +1, 0
    nav() {
      if (this.was("ArrowUp") || this.was("KeyW")) return -1;
      if (this.was("ArrowDown") || this.was("KeyS")) return 1;
      return this._motionNav;
    },

    // 숫자키 1~4 → 0~3, 없으면 -1
    number() {
      for (let i = 0; i < 9; i++) {
        if (this.was("Digit" + (i + 1)) || this.was("Numpad" + (i + 1))) return i;
      }
      return -1;
    },

    setMotion(dir, action) {
      this.motionDir = dir || null;
      if (dir !== this._lastMotionDir) {
        this._motionNav = dir === "up" ? -1 : dir === "down" ? 1 : 0;
        this._lastMotionDir = dir;
      }
      if (action) this.motionAction = true;
    },

    // 클릭이 사각형 안에서 일어났는지 확인하고, 맞으면 클릭을 소비해요.
    clicked(x, y, w, h) {
      const c = this.click;
      if (c && c.x >= x && c.x <= x + w && c.y >= y && c.y <= y + h) {
        this.click = null;
        return true;
      }
      return false;
    },

    endFrame() {
      this.pressed = {};
      this.click = null;
      this.motionAction = false;
      this._motionNav = 0;
    },
  });
})();
