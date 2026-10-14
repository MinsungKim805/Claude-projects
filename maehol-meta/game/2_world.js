// =====================================================================
//  game/2_world.js  —  월드(세계)
//
//  이 파일은 "게임 속 세상"을 담당해요.
//    - 큰 맵을 읽어서 걸어갈 수 있는 곳 / 막힌 곳을 알아내기  (충돌)
//    - 캐릭터와 NPC 움직이기
//    - 잠긴 문 열고 닫기
//    - 카메라가 내 캐릭터를 따라다니기
//    - 맵, 가구, 캐릭터를 순서대로 그리기
//
//  단위 이야기:  한 칸(타일)은 32픽셀이에요.  좌표는 모두 "픽셀"이고,
//               화면에 그릴 때 2배로 확대해요 (MH.ZOOM).
//  고쳐 볼 만한 곳:  update() 안의 충돌 크기, follow() 의 카메라 부드러움
// =====================================================================

const T = 32;                  // 타일 한 칸의 크기(픽셀)
const VW = 640, VH = 360;      // 화면에 보이는 월드의 크기 (확대하기 전 크기)


// ---------------------------------------------------------------------
// Entity : 움직이는 것(내 캐릭터, NPC) 하나를 나타내요.
//   x, y 는 캐릭터의 "발" 위치예요. (발이 땅에 닿는 점)
// ---------------------------------------------------------------------
class Entity {
  constructor(key, name, x, y) {
    this.key = key;          // 어떤 캐릭터 그림인지 (예: "donghun")
    this.name = name;        // 이름표에 쓰는 이름
    this.x = x;
    this.y = y;
    this.dir = "down";       // 바라보는 방향: down / up / left / right
    this.moving = false;     // 걷는 중인지
    this.anim = 0;           // 걷기 애니메이션 시간
    this.isNpc = false;
  }
  // 지금 보여줄 프레임 번호: 서 있으면 0, 걸으면 1 → 0 → 2 → 0 을 반복해요.
  frame() {
    return this.moving ? [1, 0, 2, 0][Math.floor(this.anim * 8) % 4] : 0;
  }
}


// ---------------------------------------------------------------------
// World : 세상 전체
// ---------------------------------------------------------------------
const World = (MH.World = {
  time: 0,
  particles: [],      // 문이 열릴 때 반짝이는 불꽃들

  // ---- 게임을 처음 켤 때 한 번: 맵 데이터를 읽어서 준비해요 ----------
  init() {
    const M = (this.M = window.MAEHOL_MAP);         // 맵 데이터 (game/map_data.js)
    const LIST = window.MAEHOL_ASSETS;              // 이미지 목록
    this.w = M.w;                                   // 맵 가로(칸 수)
    this.h = M.h;                                   // 맵 세로(칸 수)
    this.pw = M.w * T;                              // 맵 가로(픽셀)
    this.ph = M.h * T;

    // 충돌 지도: 칸마다 1(막힘) 또는 0(걸을 수 있음)
    this.grid = M.collision.map((row) => Uint8Array.from(row, (c) => (c === "1" ? 1 : 0)));

    // 잠긴 문들. 문이 차지하는 칸(tiles)도 계산해 둬요.
    this.gates = M.gates.map((g) => {
      const tiles = [];
      for (let i = 0; i < g.size; i++) tiles.push(g.o === "v" ? [g.x, g.y + i] : [g.x + i, g.y]);
      return Object.assign({}, g, { open: false, tiles });
    });

    // NPC들
    this.npcs = M.npcs.map((n) => {
      const e = new Entity(n.spr, n.name, (n.x + 0.5) * T, n.y * T + 27);
      e.isNpc = true;
      e.id = n.id;          // "haneul" 같은 이름표(id)
      e.area = n.area;      // 어느 구역에 있는지
      e.role = n.role;      // guide(소개) / quiz(퀴즈) / chat(수다)
      e.tx = n.x;           // 서 있는 칸
      e.ty = n.y;
      e.homeDir = n.dir;    // 원래 바라보는 방향
      e.dir = n.dir;
      return e;
    });
    this.npcById = {};
    this.npcs.forEach((n) => (this.npcById[n.id] = n));

    // 가구와 소품: 그릴 위치와 "앞뒤 순서(sortY)"를 미리 계산해서 정렬해 둬요.
    this.objs = M.objects.map((o) => {
      const info = LIST.objects[o.n];
      return {
        n: o.n,
        x: o.x * T,
        y: (o.y + info.d) * T - info.ph + info.pad,   // 그림의 왼쪽 위 모서리
        sortY: (o.y + info.d) * T,                    // 아래쪽 줄: 이 값이 작을수록 먼저(뒤에) 그려요
        w: info.pw,
        h: info.ph,
      };
    });
    this.objs.sort((a, b) => a.sortY - b.sortY);

    // 벽에 붙어 있는 장식(창문, 칠판, 포스터...)
    this.decor = M.decor.map((d) => ({ n: d.n, x: d.x, y: d.y, w: LIST.objects[d.n].pw, h: LIST.objects[d.n].ph }));

    // 내 캐릭터
    this.player = new Entity(MH.state.charKey, "나", (M.spawn.x + 0.5) * T, M.spawn.y * T + 27);
    this.cam = { x: 0, y: 0 };     // 카메라 위치
    this.particles = [];
    this.rebuildBlock();
    this.refreshGates(false);
    this.follow(0, true);
  },

  // ---- 새 게임을 시작할 때: 처음 상태로 되돌려요 ---------------------
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


  // =================================================================
  //  충돌: 어디까지 걸어갈 수 있을까?
  // =================================================================

  // 닫힌 문과 NPC가 서 있는 칸을 "막힌 칸 목록"(dyn)에 모아 둬요.
  rebuildBlock() {
    this.dyn = new Set();
    for (const g of this.gates) {
      if (!g.open) for (const [x, y] of g.tiles) this.dyn.add(x + y * this.w);
    }
    for (const n of this.npcs) this.dyn.add(n.tx + n.ty * this.w);
  },

  // (tx, ty) 칸이 막혀 있는지
  tileBlocked(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;   // 맵 밖
    return this.grid[ty][tx] === 1 || this.dyn.has(tx + ty * this.w);
  },

  // 사각형(x0,y0)~(x1,y1) 안에 막힌 칸이 하나라도 있는지
  boxBlocked(x0, y0, x1, y1) {
    const a = Math.floor(x0 / T), b = Math.floor(x1 / T);
    const c = Math.floor(y0 / T), d = Math.floor(y1 / T);
    for (let ty = c; ty <= d; ty++) {
      for (let tx = a; tx <= b; tx++) {
        if (this.tileBlocked(tx, ty)) return true;
      }
    }
    return false;
  },

  // 발 위치(x, y)에 서면 막히는지. 발 주변의 작은 사각형(가로 16, 세로 6)만 검사해요.
  footBlocked(x, y) {
    return this.boxBlocked(x - 8, y - 6, x + 8, y);
  },


  // =================================================================
  //  잠긴 문
  // =================================================================

  // 이 문이 열릴 조건(requires)을 모두 채웠는지
  gateOpenable(g) {
    return g.requires.every((id) => MH.state.done[id]);
  },

  // 조건을 채운 문을 열어요. 새로 열린 문 목록을 돌려줘요.
  refreshGates(effects) {
    const opened = [];
    for (const g of this.gates) {
      if (!g.open && this.gateOpenable(g)) {
        g.open = true;
        opened.push(g);
        if (effects) this.sparkle(g);     // 반짝 효과
      }
    }
    this.rebuildBlock();
    return opened;
  },

  // 문의 가운데 위치(픽셀)
  gateCenter(g) {
    const [x, y] = g.tiles[Math.floor(g.tiles.length / 2)];
    return { x: (x + 0.5) * T, y: (y + 0.5) * T };
  },

  // 문이 열릴 때 반짝이는 불꽃 만들기
  sparkle(g) {
    const c = g.o === "v"
      ? { x: (g.x + 0.5) * T, y: (g.y + g.size / 2) * T }
      : { x: (g.x + g.size / 2) * T, y: (g.y + 0.5) * T };
    for (let i = 0; i < 36; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = MH.rnd(20, 90);
      this.particles.push({
        x: c.x + MH.rnd(-14, 14), y: c.y + MH.rnd(-14, 14),
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 20,
        life: MH.rnd(0.7, 1.3), age: 0,
        col: ["#ffe14a", "#ffffff", "#9ae8ff", "#ffb0d0"][i % 4],
      });
    }
  },

  // 플레이어 바로 앞에 닫힌 문이 있으면 그 문을 알려 줘요. (없으면 null)
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


  // =================================================================
  //  위치 찾기
  // =================================================================

  // (tx, ty) 칸이 어느 구역(운동장, 급식실...)인지
  zoneAt(tx, ty) {
    for (const z of this.M.zones) {
      if (tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h) return z;
    }
    return null;
  },

  // 플레이어에게 가장 가까운 NPC (maxDist 안에 있을 때만)
  nearestNpc(p, maxDist = 46) {
    let best = null, bestDist = maxDist;
    for (const n of this.npcs) {
      const d = MH.dist(p.x, p.y - 6, n.x, n.y - 6);
      if (d < bestDist) { bestDist = d; best = n; }
    }
    return best;
  },


  // =================================================================
  //  매 프레임 움직이기  (dt = 지난 프레임부터 흐른 시간, 초)
  // =================================================================
  update(dt, move) {
    this.time += dt;
    const p = this.player;

    // ---- 내 캐릭터 걷기 ----
    let { x, y } = move || { x: 0, y: 0 };
    const len = Math.hypot(x, y);
    p.moving = len > 0;
    if (len > 0) {
      x /= len;                    // 대각선으로 가도 빨라지지 않게 길이를 1로 맞춰요
      y /= len;
      // 바라보는 방향 정하기 (좌우가 더 크면 좌우, 아니면 위아래)
      if (move.x !== 0 && Math.abs(move.x) >= Math.abs(move.y)) p.dir = move.x < 0 ? "left" : "right";
      else p.dir = move.y < 0 ? "up" : "down";

      const speed = (window.CONFIG && CONFIG.PLAYER_SPEED) || 112;
      // 가로, 세로를 따로 시도해요. 벽에 막혀도 미끄러지듯 움직일 수 있어요.
      const nx = p.x + x * speed * dt;
      if (!this.footBlocked(nx, p.y)) p.x = nx;
      const ny = p.y + y * speed * dt;
      if (!this.footBlocked(p.x, ny)) p.y = ny;
      p.anim += dt;
    } else {
      p.anim = 0;
    }

    // ---- NPC는 가까이 오면 플레이어를 바라봐요 ----
    for (const n of this.npcs) {
      const dx = p.x - n.x, dy = p.y - n.y;
      if (Math.hypot(dx, dy) < 96) {
        n.dir = Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
      } else {
        n.dir = n.homeDir;
      }
    }

    // ---- 불꽃 움직이기 ----
    for (const q of this.particles) {
      q.age += dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += 60 * dt;       // 아래로 떨어지게
    }
    this.particles = this.particles.filter((q) => q.age < q.life);

    this.follow(dt, false);
  },

  // 카메라가 내 캐릭터를 따라가요. snap=true 면 즉시 이동, 아니면 부드럽게.
  follow(dt, snap) {
    const p = this.player;
    // 캐릭터가 화면 가운데에 오도록 하되, 맵 밖은 보이지 않게 묶어요.
    const targetX = MH.clamp(p.x - VW / 2, 0, this.pw - VW);
    const targetY = MH.clamp(p.y - 22 - VH / 2, 0, this.ph - VH);
    if (snap) { this.cam.x = targetX; this.cam.y = targetY; return; }
    const k = Math.min(1, 9 * dt);             // 9 = 따라가는 빠르기 (클수록 빨라요)
    this.cam.x += (targetX - this.cam.x) * k;
    this.cam.y += (targetY - this.cam.y) * k;
  },

  // 월드 좌표 -> 화면(캔버스) 좌표. 이름표 같은 글씨를 캐릭터 위에 그릴 때 써요.
  toScreen(x, y) {
    return { x: (x - Math.round(this.cam.x)) * MH.ZOOM, y: (y - Math.round(this.cam.y)) * MH.ZOOM };
  },


  // =================================================================
  //  그리기
  //   순서:  배경(바닥+벽) → 벽 장식 → [가구, 문, NPC, 나]를 "아래쪽 줄" 순서로 → 말풍선 → 불꽃
  //   아래쪽에 있는 것일수록 나중에(위에) 그려서, 캐릭터가 책상 "뒤로" 걸어가는 것처럼 보여요.
  // =================================================================
  draw(ctx, opts = {}) {
    const A = MH.A;
    const LIST = window.MAEHOL_ASSETS;
    const camX = Math.round(this.cam.x), camY = Math.round(this.cam.y);

    ctx.save();
    ctx.scale(MH.ZOOM, MH.ZOOM);               // 2배 확대
    ctx.imageSmoothingEnabled = false;         // 픽셀아트를 흐리지 않게

    // 1) 배경: 맵 큰 그림에서 카메라가 보는 부분만 오려서 그려요.
    if (A.bg) ctx.drawImage(A.bg, camX, camY, VW, VH, 0, 0, VW, VH);

    // 화면 안에 보이는 물체인지 검사하는 도우미 (안 보이면 그리지 않아서 빨라요)
    const visible = (x, y, w, h) => x + w > camX && x < camX + VW && y + h > camY && y < camY + VH;

    // 2) 벽 장식
    for (const d of this.decor) {
      if (visible(d.x, d.y, d.w, d.h)) ctx.drawImage(A.obj[d.n], d.x - camX, d.y - camY);
    }

    // 3) 앞뒤 순서를 맞춰서 그릴 것들을 한 줄로 모아요.  kind: 0 가구, 1 캐릭터, 2 문, 3 발밑 원
    const list = [];
    for (const o of this.objs) {
      if (visible(o.x, o.y, o.w, o.h)) list.push({ kind: 0, sortY: o.sortY, o });
    }
    for (const g of this.gates) {
      const gw = g.o === "v" ? T : g.size * T;
      const gh = g.o === "v" ? g.size * T : T;
      if (visible(g.x * T, g.y * T, gw, gh)) list.push({ kind: 2, sortY: (g.y + (g.o === "v" ? g.size : 1)) * T, g });
    }
    for (const n of this.npcs) {
      if (visible(n.x - 20, n.y - 50, 40, 60)) list.push({ kind: 1, sortY: n.y, e: n });
    }
    const p = this.player;
    list.push({ kind: 3, sortY: p.y - 1 });                 // 내 발밑 하이라이트 원
    list.push({ kind: 1, sortY: p.y, e: p });               // 나
    list.sort((a, b) => a.sortY - b.sortY);                 // 아래쪽 줄 순서로 정렬!

    for (const it of list) {
      if (it.kind === 0) {
        ctx.drawImage(A.obj[it.o.n], it.o.x - camX, it.o.y - camY);
      } else if (it.kind === 2) {
        const g = it.g;
        const im = A.obj[`gate_${g.o}_${g.open ? "open" : "closed"}`];   // 열렸으면 열린 문 그림
        if (im) ctx.drawImage(im, g.x * T - camX, g.y * T - camY);
      } else if (it.kind === 3) {
        const ring = A.ui.ring;
        if (ring && opts.ring !== false) {
          ctx.globalAlpha = 0.75 + 0.25 * Math.sin(this.time * 4);     // 깜빡깜빡
          ctx.drawImage(ring, Math.round(p.x - 18 - camX), Math.round(p.y - 12 - camY));
          ctx.globalAlpha = 1;
        }
      } else {
        const e = it.e;
        const info = LIST.sprites[e.key];
        if (info) {
          // NPC는 숨 쉬듯 살짝 움직이고, 내 캐릭터는 걸을 때 살짝 통통 튀어요.
          const bob = e.isNpc ? Math.round(Math.sin(this.time * 2.2 + e.tx) * 0.6) : e.moving && e.frame() === 0 ? -1 : 0;
          MH.drawSprite(ctx, e.key, e.dir, e.frame(), e.x - info.ax - camX, e.y - info.ay - camY + bob);
        }
      }
    }

    // 4) NPC 머리 위 말풍선("!" 같은 아이콘). 어떤 아이콘을 보일지는 play 화면이 정해 줘요.
    for (const n of this.npcs) {
      const icon = opts.npcIcon ? opts.npcIcon(n) : null;
      const im = icon && A.ui[icon];
      if (im && visible(n.x - 20, n.y - 90, 40, 70)) {
        const bounce = Math.round(Math.sin(this.time * 4 + n.tx) * 2);
        ctx.drawImage(im, Math.round(n.x - im.width / 2 - camX), Math.round(n.y - 86 - camY + bounce));
      }
    }

    // 5) 방금 열린 문 위의 화살표(안내)
    if (opts.hintGate) {
      const c = this.gateCenter(opts.hintGate);
      const im = A.ui.arrow_down;
      if (im) ctx.drawImage(im, Math.round(c.x - 8 - camX), Math.round(c.y - 34 - camY + Math.sin(this.time * 5) * 3));
    }

    // 6) 반짝이는 불꽃
    for (const q of this.particles) {
      ctx.globalAlpha = Math.max(0, 1 - q.age / q.life);    // 점점 흐려져요
      ctx.fillStyle = q.col;
      ctx.fillRect(Math.round(q.x - camX), Math.round(q.y - camY), 3, 3);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },
});
