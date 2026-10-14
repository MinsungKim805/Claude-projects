// 아주 작은 효과음(웹 오디오). 브라우저 규칙상 첫 클릭/키 입력 뒤부터 소리가 나요.
(function () {
  const Sfx = (MH.Sfx = {
    ctx: null,
    muted: false,
    unlock() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume();
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      } catch (e) {}
    },
    tone(freq, dur, type = "square", vol = 0.05, slideTo = null, delay = 0) {
      if (this.muted || !this.ctx) return;
      const t0 = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    },
    blip() { this.tone(660 + Math.random() * 120, 0.04, "square", 0.025); },
    select() { this.tone(520, 0.07, "square", 0.05); this.tone(780, 0.09, "square", 0.05, null, 0.06); },
    click() { this.tone(440, 0.05, "square", 0.04); },
    open() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, "triangle", 0.07, null, i * 0.09)); },
    correct() { [659, 880].forEach((f, i) => this.tone(f, 0.14, "triangle", 0.08, null, i * 0.1)); },
    wrong() { this.tone(220, 0.25, "sawtooth", 0.05, 140); },
    done() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, "triangle", 0.07, null, i * 0.1)); },
    toggle() { this.muted = !this.muted; return this.muted; },
  });
})();
