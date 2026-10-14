// ============================================================
//  월드: 큰 맵, 충돌, 잠긴 문, NPC, 카메라, 그리기
//  좌표는 모두 '원래 해상도(32px 타일)' 기준이고, 화면에는 2배로 확대해서 보여줘요.
// ============================================================
(function () {
  const T = 32;
  const VW = 640, VH = 360;       // 화면에 보이는 월드 크기(원래 해상도)

  class Entity {
    constructor(key, name, x, y) {
      this.key = key;
      this.name = name;
      this.x = x;            // 발 중앙 위치
      this.y = y;
      this.dir = "down";
      this.moving = false;
      this.anim = 0;
      this.isNpc = false;
      this.bob = 0;
    }
    frame() { return this.moving ? [1, 0, 2, 0][Math.floor(this.anim * 8) % 4] : 0; }
    image() {
      const s = MH.A.spr[this.key];
      return s && s[this.dir] ? s[this.dir][this.frame()] : null;
    }
  }

  const World = (MH.World = {
    Entity, T, VW, VH,
    time: 0,
    particles: [],

    init() {
      const M = (this.M = window.MAEHOL_MAP);
      const AS = window.MAEHOL_ASSETS;
      this.w = M.w;
      this.h = M.h;
      this.pw = M.w * T;
      this.ph = M.h * T;
      this.grid = M.collision.map((r) => Uint8Array.from(r, (c) => (c === "1" ? 1 : 0)));

      this.gates = M.gates.map((g) => {
        const tiles = [];
        for (let i = 0; i < g.size; i++) tiles.push(g.o === "v" ? [g.x, g.y + i] : [g.x + i, g.y]);
        return Object.assign({}, g, { open: false, tiles });
      });

      this.npcs = M.npcs.map((n) => {
        const e = new Entity(n.spr, n.name, (n.x + 0.5) * T, n.y * T + 27);
        e.isNpc = true;
        e.id = n.id;
        e.area = n.area;
        e.role = n.role;
        e.tx = n.x;
        e.ty = n.y;
        e.homeDir = n.dir;
        e.dir = n.dir;
        return e;
      });
      this.npcById = {};
      this.npcs.forEach((n) => (this.npcById[n.id] = n));

      // 가구와 소품은 아래쪽 줄 기준으로 미리 정렬해 둬요
      this.objs = M.objects.map((o) => {
        const info = AS.objects[o.n];
        return { n: o.n, x: o.x * T, y: (o.y + info.d) * T - info.ph + info.pad, sortY: (o.y + info.d) * T, w: info.pw, h: info.ph };
      });
      this.objs.sort((a, b) => a.sortY - b.sortY);
      this.decor = M.decor.map((d) => ({ n: d.n, x: d.x, y: d.y, w: AS.objects[d.n].pw, h: AS.objects[d.n].ph }));

      this.player = new Entity(MH.state.charKey, "나", (M.spawn.x + 0.5) * T, M.spawn.y * T + 27);
      this.cam = { x: 0, y: 0 };
      this.particles = [];
      this.rebuildBlock();
      this.refreshGates(false);
      this.follow(0, true);
    },

    // 새 게임을 시작할 때
    reset() {
      const M = this.M;
      this.gates.forEach((g) => (g.open = false));
      this.player.key = MH.state.charKey;
      this.player.x = (M.spawn.x + 0.5) * T;
      this.player.y = M.spawn.y * T + 27;
      this.player.dir = "down";
      this.player.moving = false;
      this.npcs.forEach((n) => (n.dir = n.homeDir));
      this.particles = [];
      this.refreshGates(false);
      this.follow(0, true);
    },

    // ---------------------------------------------------------------- 충돌
    rebuildBlock() {
      this.dyn = new Set();
      for (const g of this.gates) if (!g.open) for (const [x, y] of g.tiles) this.dyn.add(x + y * this.w);
      for (const n of this.npcs) this.dyn.add(n.tx + n.ty * this.w);
    },
    tileBlocked(tx, ty) {
      if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;
      return this.grid[ty][tx] === 1 || this.dyn.has(tx + ty * this.w);
    },
    boxBlocked(x0, y0, x1, y1) {
      const a = Math.floor(x0 / T), b = Math.floor(x1 / T), c = Math.floor(y0 / T), d = Math.floor(y1 / T);
      for (let ty = c; ty <= d; ty++) for (let tx = a; tx <= b; tx++) if (this.tileBlocked(tx, ty)) return true;
      return false;
    },
    footBlocked(x, y) { return this.boxBlocked(x - 8, y - 6, x + 8, y); },

    // ---------------------------------------------------------------- 문
    gateOpenable(g) { return g.requires.every((id) => MH.state.done[id]); },
    // 조건을 채운 문을 열어요. 새로 열린 문 목록을 돌려줘요.
    refreshGates(effects) {
      const opened = [];
      for (const g of this.gates) {
        if (!g.open && this.gateOpenable(g)) {
          g.open = true;
          opened.push(g);
          if (effects) this.sparkle(g);
        }
      }
      this.rebuildBlock();
      return opened;
    },
    gateCenter(g) {
      const [x, y] = g.tiles[Math.floor(g.tiles.length / 2)];
      return { x: (x + 0.5) * T, y: (y + 0.5) * T };
    },
    sparkle(g) {
      const c = g.o === "v" ? { x: (g.x + 0.5) * T, y: (g.y + g.size / 2) * T } : { x: (g.x + g.size / 2) * T, y: (g.y + 0.5) * T };
      for (let i = 0; i < 36; i++) {
        const a = Math.random() * Math.PI * 2, s = MH.rnd(20, 90);
        this.particles.push({ x: c.x + MH.rnd(-14, 14), y: c.y + MH.rnd(-14, 14), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: MH.rnd(0.7, 1.3), age: 0,
          col: ["#ffe14a", "#ffffff", "#9ae8ff", "#ffb0d0"][i % 4] });
      }
    },
    // 플레이어 가까이에 있는 닫힌 문
    closedGateNear(p, r = 26) {
      for (const g of this.gates) {
        if (g.open) continue;
        for (const [x, y] of g.tiles) {
          const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
          if (Math.abs(p.x - cx) < T / 2 + r && Math.abs(p.y - 8 - cy) < T / 2 + r) return g;
        }
      }
      return null;
    },

    // ---------------------------------------------------------------- 위치
    zoneAt(tx, ty) {
      for (const z of this.M.zones) if (tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h) return z;
      return null;
    },
    nearestNpc(p, maxDist = 46) {
      let best = null, bd = maxDist;
      for (const n of this.npcs) {
        const d = MH.dist(p.x, p.y - 6, n.x, n.y - 6);
        if (d < bd) { bd = d; best = n; }
      }
      return best;
    },

    // ---------------------------------------------------------------- 갱신
    update(dt, move) {
      this.time += dt;
      const p = this.player;
      let { x, y } = move || { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      p.moving = len > 0;
      if (len > 0) {
        x /= len; y /= len;
        if (move.x !== 0 && Math.abs(move.x) >= Math.abs(move.y)) p.dir = move.x < 0 ? "left" : "right";
        else p.dir = move.y < 0 ? "up" : "down";
        const sp = (window.CONFIG && CONFIG.PLAYER_SPEED) || 112;
        const nx = p.x + x * sp * dt;
        if (!this.footBlocked(nx, p.y)) p.x = nx;
        const ny = p.y + y * sp * dt;
        if (!this.footBlocked(p.x, ny)) p.y = ny;
        p.anim += dt;
      } else {
        p.anim = 0;
      }
      // NPC는 가까이 오면 플레이어 쪽을 바라봐요
      for (const n of this.npcs) {
        const dx = p.x - n.x, dy = p.y - n.y;
        if (Math.hypot(dx, dy) < 96) n.dir = Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
        else n.dir = n.homeDir;
      }
      // 불꽃
      for (const q of this.particles) { q.age += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 60 * dt; }
      this.particles = this.particles.filter((q) => q.age < q.life);
      this.follow(dt, false);
    },

    follow(dt, snap) {
      const p = this.player;
      const tx = MH.clamp(p.x - VW / 2, 0, this.pw - VW);
      const ty = MH.clamp(p.y - 22 - VH / 2, 0, this.ph - VH);
      if (snap) { this.cam.x = tx; this.cam.y = ty; return; }
      const k = Math.min(1, 9 * dt);
      this.cam.x += (tx - this.cam.x) * k;
      this.cam.y += (ty - this.cam.y) * k;
    },

    // 월드 좌표 → 화면(캔버스) 좌표
    toScreen(x, y) {
      return { x: (x - Math.round(this.cam.x)) * MH.ZOOM, y: (y - Math.round(this.cam.y)) * MH.ZOOM };
    },

    // ---------------------------------------------------------------- 그리기
    draw(ctx, opts = {}) {
      const A = MH.A, AS = window.MAEHOL_ASSETS;
      const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
      ctx.save();
      ctx.scale(MH.ZOOM, MH.ZOOM);
      ctx.imageSmoothingEnabled = false;
      if (A.bg) ctx.drawImage(A.bg, cx, cy, VW, VH, 0, 0, VW, VH);

      const vis = (x, y, w, h) => x + w > cx && x < cx + VW && y + h > cy && y < cy + VH;
      for (const d of this.decor) if (vis(d.x, d.y, d.w, d.h)) ctx.drawImage(A.obj[d.n], d.x - cx, d.y - cy);

      const list = [];
      for (const o of this.objs) if (vis(o.x, o.y, o.w, o.h)) list.push({ k: 0, sortY: o.sortY, o });
      for (const g of this.gates) {
        const gw = g.o === "v" ? T : g.size * T, gh = g.o === "v" ? g.size * T : T;
        if (vis(g.x * T, g.y * T, gw, gh)) list.push({ k: 2, sortY: (g.y + (g.o === "v" ? g.size : 1)) * T, g });
      }
      for (const n of this.npcs) if (vis(n.x - 20, n.y - 50, 40, 60)) list.push({ k: 1, sortY: n.y, e: n });
      const p = this.player;
      list.push({ k: 3, sortY: p.y - 1 });
      list.push({ k: 1, sortY: p.y, e: p, me: true });
      list.sort((a, b) => a.sortY - b.sortY);

      for (const it of list) {
        if (it.k === 0) {
          ctx.drawImage(A.obj[it.o.n], it.o.x - cx, it.o.y - cy);
        } else if (it.k === 2) {
          const g = it.g;
          const im = A.obj[`gate_${g.o}_${g.open ? "open" : "closed"}`];
          if (im) ctx.drawImage(im, g.x * T - cx, g.y * T - cy);
        } else if (it.k === 3) {
          const ring = A.ui.ring;
          if (ring && opts.ring !== false) {
            ctx.globalAlpha = 0.75 + 0.25 * Math.sin(this.time * 4);
            ctx.drawImage(ring, Math.round(p.x - 18 - cx), Math.round(p.y - 12 - cy));
            ctx.globalAlpha = 1;
          }
        } else {
          const e = it.e;
          const im = e.image();
          const info = AS.sprites[e.key];
          if (im && info) {
            const bob = e.isNpc ? Math.round(Math.sin(this.time * 2.2 + e.tx) * 0.6) : e.moving && e.frame() === 0 ? -1 : 0;
            ctx.drawImage(im, Math.round(e.x - info.ax - cx), Math.round(e.y - info.ay - cy + bob));
          }
        }
      }

      // NPC 위의 말풍선 아이콘
      for (const n of this.npcs) {
        const icon = opts.npcIcon ? opts.npcIcon(n) : null;
        const im = icon && A.ui[icon];
        if (im && vis(n.x - 20, n.y - 90, 40, 70)) {
          const by = Math.round(Math.sin(this.time * 4 + n.tx) * 2);
          ctx.drawImage(im, Math.round(n.x - im.width / 2 - cx), Math.round(n.y - 86 - cy + by));
        }
      }
      // 열린 문 화살표(안내)
      if (opts.hintGate) {
        const g = opts.hintGate;
        const c = this.gateCenter(g);
        const im = A.ui.arrow_down;
        if (im) ctx.drawImage(im, Math.round(c.x - 8 - cx), Math.round(c.y - 34 - cy + Math.sin(this.time * 5) * 3));
      }
      // 불꽃
      for (const q of this.particles) {
        ctx.globalAlpha = Math.max(0, 1 - q.age / q.life);
        ctx.fillStyle = q.col;
        ctx.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), 3, 3);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    },
  });
})();
