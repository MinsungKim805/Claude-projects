// 공용 도구 모음
(function () {
  const MH = (window.MH = { W: 1280, H: 720, ZOOM: 2, scenes: {}, scene: null });

  MH.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  MH.lerp = (a, b, t) => a + (b - a) * t;
  MH.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  MH.norm = (s) => String(s == null ? "" : s).toLowerCase().replace(/\s+/g, "");
  MH.rnd = (a, b) => a + Math.random() * (b - a);

  // 게임 진행 상태
  MH.state = {
    charKey: "donghun",
    done: {},            // 소개를 끝낸 구역 { playground: true, ... }
    quizDone: false,
    best: null,
    reset() {
      this.done = {};
      this.quizDone = false;
    },
  };

  // 최고 점수는 이 브라우저에만 저장해요 (막혀 있어도 게임은 잘 돌아가요)
  MH.loadBest = function () {
    try {
      const v = localStorage.getItem("maehol_best");
      MH.state.best = v == null ? null : parseInt(v, 10);
    } catch (e) {
      MH.state.best = null;
    }
  };
  MH.saveBest = function (score) {
    if (MH.state.best == null || score > MH.state.best) {
      MH.state.best = score;
      try {
        localStorage.setItem("maehol_best", String(score));
      } catch (e) {}
    }
  };

  // 장면 전환
  MH.go = function (name, arg) {
    const next = MH.scenes[name];
    if (!next) return;
    MH.scene = next;
    if (next.enter) next.enter(arg);
  };

  // 이미지 그리기(소수점 좌표 → 정수로 맞춰서 선명하게)
  MH.img = function (ctx, im, x, y) {
    if (im) ctx.drawImage(im, Math.round(x), Math.round(y));
  };
})();
