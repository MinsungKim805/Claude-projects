"""매홀중학교 큰 맵 빌더 (ZEP식 탑다운, 32px 타일).

운동장 → 복도 → 급식실 → 복도 → 체육관 → 복도 → 도서관 → 복도 → 교실(퀴즈 존)
이 순서로 한 줄로 이어진 맵이에요. 방에서 방으로 가는 통로(문)는 소개를 끝내야 열려요.

  build() -> dict(bg=Image, data=dict, objects=set of sprite names)
"""
from collections import deque
from PIL import Image, ImageDraw
from pxlib import TILE, hexc, shade, lighten, mix, hash2, text_image, FONT11B, FONT9

T = TILE
MAP_W, MAP_H = 66, 82

# (id, 한글 이름, 바닥 테마, x, y, w, h)  타일 단위, 걸어다닐 수 있는 바닥
#   운동장 -> (동쪽 복도) -> 급식실 -> (남쪽 복도) -> 체육관 -> (서쪽 복도) -> 도서관 -> (남쪽 복도) -> 교실
AREAS = [
    ("playground", "운동장", "sand", 1, 3, 26, 16),
    ("doorA", None, "corridor", 27, 10, 2, 4),
    ("c1", "복도", "corridor", 29, 10, 12, 4),
    ("doorB", None, "corridor", 41, 10, 2, 4),
    ("cafeteria", "급식실", "beige", 43, 3, 20, 16),
    ("c2", "복도", "corridor", 51, 19, 6, 15),      # 급식실 남쪽 벽을 뚫고 체육관 북쪽 벽까지
    ("gym", "체육관", "wood", 43, 34, 22, 16),
    ("doorE", None, "corridor", 41, 41, 2, 4),
    ("c3", "복도", "corridor", 29, 41, 12, 4),
    ("doorF", None, "corridor", 27, 41, 2, 4),
    ("library", "도서관", "carpet", 7, 34, 20, 16),
    ("c4", "복도", "corridor", 8, 50, 6, 15),       # 도서관 남쪽 벽을 뚫고 교실 북쪽 벽까지
    ("classroom", "교실", "beige", 7, 65, 20, 16),
]

# 잠긴 문: (id, 방향 v=세로 문/h=가로 문, x, y, 크기, 열리는 조건, 안내 문구)
GATES = [
    ("A", "v", 27, 10, 4, ["playground"], "운동장 소개를 끝내면 열려요"),
    ("C", "h", 51, 19, 6, ["cafeteria"], "급식실 소개를 끝내면 열려요"),
    ("E", "v", 42, 41, 4, ["gym"], "체육관 소개를 끝내면 열려요"),
    ("G", "h", 8, 50, 6, ["library"], "도서관 소개를 끝내면 열려요"),
    ("H", "h", 8, 64, 6, ["playground", "cafeteria", "gym", "library"], "소개를 모두 끝내야 퀴즈 존에 들어가요"),
]


class Builder:
    def __init__(self):
        self.floor = [[False] * MAP_W for _ in range(MAP_H)]
        self.theme = [[None] * MAP_W for _ in range(MAP_H)]
        self.area = [[None] * MAP_W for _ in range(MAP_H)]
        for (aid, name, theme, x, y, w, h) in AREAS:
            for yy in range(y, y + h):
                for xx in range(x, x + w):
                    self.floor[yy][xx] = True
                    self.theme[yy][xx] = theme
                    self.area[yy][xx] = aid
        self.objects = []      # (name, tx, ty)
        self.decor = []        # (name, px, py)
        self.sx = self.sy = 0  # 방을 옮겨 놓을 때 쓰는 이동량(타일)
        self.npcs = []
        self.sprite_info = {}  # name -> dict

    # ---- 배치 도우미
    def shift(self, sx, sy):
        self.sx, self.sy = sx, sy

    def obj(self, name, tx, ty):
        self.objects.append((name, tx + self.sx, ty + self.sy))

    def dec(self, name, tx, ty, dx=0, dy=0):
        self.decor.append((name, int((tx + self.sx) * T + dx), int((ty + self.sy) * T + dy)))

    def is_floor(self, x, y):
        return 0 <= x < MAP_W and 0 <= y < MAP_H and self.floor[y][x]

    # ---- 벽 분류: floor / face_low / face_up / cap / void
    def kind(self, x, y):
        if self.is_floor(x, y):
            return "floor"
        if self.is_floor(x, y + 1):
            return "face_low"
        if self.is_floor(x, y + 2):
            return "face_up"
        if self.is_floor(x, y + 3):
            return "cap"
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if (dx or dy) and self.is_floor(x + dx, y + dy):
                    return "cap"
        return "void"

    def wall_room(self, x, y):
        """벽 타일이 어느 방의 벽인지(테마 결정용)."""
        for dy in (1, 2, 3):
            if self.is_floor(x, y + dy):
                return self.area[y + dy][x]
        for dy in (0, -1, 1):
            for dx in (-1, 1, 0):
                if self.is_floor(x + dx, y + dy):
                    return self.area[y + dy][x + dx]
        return None


# ====================================================================== 타일 그리기
def draw_floor(d, th, tx, ty, X, Y):
    if th == "sand":
        base = hexc("#e9cd94") if (tx + ty) % 2 == 0 else hexc("#e6c98c")
        d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=base)
        for k in range(7):
            px = X + int(hash2(tx, ty, k) * 31)
            py = Y + int(hash2(tx, ty, k + 11) * 31)
            c = hexc("#f4e2b4") if k % 2 == 0 else hexc("#d3b274")
            d.rectangle([px, py, px + 1, py], fill=c)
        if hash2(tx, ty, 99) > 0.86:
            px, py = X + int(hash2(tx, ty, 5) * 24), Y + int(hash2(tx, ty, 6) * 24)
            d.rectangle([px, py, px + 4, py + 2], fill=hexc("#d9b97c"))
    elif th == "corridor":
        a, b = hexc("#ddd5ca"), hexc("#bcb2bd")
        big = ((tx // 2) + (ty // 2)) % 2
        base = a if big == 0 else b
        d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=base)
        # 타일 경계(2x2 칸 단위)와 잔무늬
        if tx % 2 == 0:
            d.line([(X, Y), (X, Y + T - 1)], fill=shade(base, 0.9))
        if ty % 2 == 0:
            d.line([(X, Y), (X + T - 1, Y)], fill=shade(base, 0.9))
        if hash2(tx, ty, 3) > 0.82:
            for k in range(26):
                px = X + int(hash2(tx, ty, k + 20) * 31)
                py = Y + int(hash2(tx, ty, k + 50) * 31)
                d.point((px, py), fill=hexc("#74707e") if big else hexc("#8a8590"))
    elif th in ("beige", "carpet"):
        if th == "beige":
            base = hexc("#efd8a4") if (tx + ty) % 2 == 0 else hexc("#ebd29a")
            grout = hexc("#d6bd84")
        else:
            base = hexc("#e2c690") if (tx + ty) % 2 == 0 else hexc("#dcbf86")
            grout = hexc("#c4a46c")
        d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=base)
        d.line([(X, Y + T - 1), (X + T - 1, Y + T - 1)], fill=grout)
        d.line([(X + T - 1, Y), (X + T - 1, Y + T - 1)], fill=grout)
        d.line([(X, Y), (X + T - 2, Y)], fill=lighten(base, 0.35))
        if hash2(tx, ty, 7) > 0.8:
            px, py = X + int(hash2(tx, ty, 8) * 26) + 2, Y + int(hash2(tx, ty, 9) * 26) + 2
            d.rectangle([px, py, px + 2, py], fill=shade(base, 0.94))
    elif th == "wood":
        for r in range(4):
            yy = Y + r * 8
            row = (ty * 4 + r)
            tone = [hexc("#e0aa62"), hexc("#d9a15a"), hexc("#e4b06c"), hexc("#d89f58")][row % 4]
            d.rectangle([X, yy, X + T - 1, yy + 7], fill=tone)
            d.line([(X, yy + 7), (X + T - 1, yy + 7)], fill=shade(tone, 0.86))
            off = int(hash2(row, 1, 5) * 32)
            jx = (X - X % T) + off
            jx = (tx * T + off) - ((tx * T + off) // 32) * 0
            # 판자 이음매 (행마다 엇갈리게)
            for jj in range(0, 2):
                jpx = ((off + jj * 32) % 64) - 32 + (tx // 2) * 64
                if X <= jpx < X + T:
                    d.line([(jpx, yy), (jpx, yy + 7)], fill=shade(tone, 0.82))
        d.line([(X, Y), (X + T - 1, Y)], fill=hexc("#f0c07c"))
    else:
        d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=hexc("#cccccc"))


def draw_brick(d, X, Y, w, h, base, mortar, gx, gy, bw=16, bh=8, var=0.1):
    d.rectangle([X, Y, X + w - 1, Y + h - 1], fill=mortar)
    for ry in range(0, h, bh):
        row = (gy + ry) // bh
        off = (bw // 2) if row % 2 else 0
        x = -off
        while x < w:
            col = (gx + x + off) // bw
            v = 1 + (hash2(col, row, 4) - 0.5) * 2 * var
            c = shade(base, v)
            x0, x1 = max(0, x + 1), min(w - 1, x + bw - 2)
            if x1 >= x0:
                d.rectangle([X + x0, Y + ry + 1, X + x1, Y + ry + bh - 2], fill=c)
                d.line([(X + x0, Y + ry + 1), (X + x1, Y + ry + 1)], fill=lighten(c, 0.18))
            x += bw


THEMES = {
    # 방 id -> 벽 모양
    "playground": dict(kind="facade"),
    "cafeteria": dict(kind="cream_brick", cream="#f6e2b0", brick="#cf8660"),
    "gym": dict(kind="cream_wood", cream="#f6e0aa", wood="#a8703c"),
    "library": dict(kind="cream_brick", cream="#f4e0b0", brick="#c07850"),
    "classroom": dict(kind="cream", cream="#f6e6b8"),
    "corridor": dict(kind="brick"),
}


def theme_of(room):
    if room is None:
        return THEMES["corridor"]
    if room in THEMES:
        return THEMES[room]
    return THEMES["corridor"]


def draw_wall(d, b, x, y, kind, X, Y):
    room = b.wall_room(x, y)
    th = theme_of(room)
    k = th["kind"]
    if kind == "cap":
        # 벽 윗면(어두운 갈색) + 가장자리
        base = hexc("#5b4650")
        if k == "facade" and not (b.is_floor(x, y + 3)):
            # 운동장 주변은 생울타리
            base = None
        if base is None:
            d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=hexc("#3d8044"))
            for i in range(5):
                cx = X + int(hash2(x, y, i) * 28) + 2
                cy = Y + int(hash2(x, y, i + 9) * 28) + 2
                d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=[hexc("#4f984f"), hexc("#3a7a40"), hexc("#62ae58")][i % 3])
            for i in range(4):
                cx = X + int(hash2(x, y, i + 30) * 30)
                cy = Y + int(hash2(x, y, i + 40) * 30)
                d.point((cx, cy), fill=hexc("#9cd87c"))
        else:
            d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=base)
            if not b.is_floor(x, y + 3):
                pass
            d.rectangle([X, Y, X + T - 1, Y + 1], fill=hexc("#7a6270"))
            if k == "facade" and b.is_floor(x, y + 3):
                d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=hexc("#6a7288"))
                d.rectangle([X, Y + T - 6, X + T - 1, Y + T - 1], fill=hexc("#4a5268"))
                d.rectangle([X, Y, X + T - 1, Y + 2], fill=hexc("#9aa2b8"))
        # 바닥과 맞닿는 안쪽 가장자리 그림자
        for (dx, dy, rect) in ((1, 0, [X + T - 3, Y, X + T - 1, Y + T - 1]), (-1, 0, [X, Y, X + 2, Y + T - 1]),
                               (0, -1, [X, Y, X + T - 1, Y + 2]), (0, 1, [X, Y + T - 3, X + T - 1, Y + T - 1])):
            if b.is_floor(x + dx, y + dy) and base is not None:
                d.rectangle(rect, fill=hexc("#3a2c34"))
        return
    low = kind == "face_low"
    if k == "facade":
        draw_brick(d, X, Y, T, T, hexc("#cf7a54"), hexc("#e6b698"), x * T, y * T, var=0.07)
    elif k == "brick":
        draw_brick(d, X, Y, T, T, hexc("#c47a5e"), hexc("#e4b898"), x * T, y * T, var=0.09)
    elif k == "cream_brick":
        cream = hexc(th["cream"])
        if low:
            draw_brick(d, X, Y, T, T, hexc(th["brick"]), hexc("#e8c8a8"), x * T, y * T, var=0.08)
            d.rectangle([X, Y, X + T - 1, Y + 1], fill=hexc("#8a5a42"))
        else:
            d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=cream)
            d.line([(X, Y + T - 1), (X + T - 1, Y + T - 1)], fill=shade(cream, 0.9))
    elif k == "cream_wood":
        cream = hexc(th["cream"])
        wood = hexc(th["wood"])
        if low:
            d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=wood)
            for xx in range(0, T, 8):
                d.line([(X + xx, Y + 3), (X + xx, Y + T - 1)], fill=shade(wood, 0.84))
            d.rectangle([X, Y, X + T - 1, Y + 2], fill=lighten(wood, 0.25))
        else:
            d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=cream)
    else:  # cream
        cream = hexc(th["cream"])
        d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=cream)
        if low:
            d.rectangle([X, Y + T - 5, X + T - 1, Y + T - 1], fill=hexc("#c49a68"))
            d.line([(X, Y + T - 5), (X + T - 1, Y + T - 5)], fill=hexc("#e0bc88"))
    if low and k != "cream_brick" and k != "cream_wood":
        d.rectangle([X, Y + T - 3, X + T - 1, Y + T - 1], fill=hexc("#6a4a3c"))
    if low and k in ("cream_brick", "cream_wood"):
        d.rectangle([X, Y + T - 3, X + T - 1, Y + T - 1], fill=hexc("#5a3e30"))


def render_bg(b):
    bg = Image.new("RGBA", (MAP_W * T, MAP_H * T), hexc("#1c1626"))
    d = ImageDraw.Draw(bg)
    for y in range(MAP_H):
        for x in range(MAP_W):
            X, Y = x * T, y * T
            k = b.kind(x, y)
            if k == "void":
                continue
            if k == "floor":
                draw_floor(d, b.theme[y][x], x, y, X, Y)
            else:
                draw_wall(d, b, x, y, k, X, Y)
    # 벽 바로 아래 바닥 그림자
    sh = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    ds = ImageDraw.Draw(sh)
    for y in range(MAP_H):
        for x in range(MAP_W):
            if b.is_floor(x, y) and not b.is_floor(x, y - 1):
                for i in range(7):
                    ds.rectangle([x * T, y * T + i, x * T + T - 1, y * T + i], fill=(40, 20, 40, 52 - i * 7))
            if b.is_floor(x, y) and not b.is_floor(x - 1, y):
                for i in range(4):
                    ds.rectangle([x * T + i, y * T, x * T + i, y * T + T - 1], fill=(40, 20, 40, 30 - i * 7))
    bg.alpha_composite(sh)
    d = ImageDraw.Draw(bg)
    paint_markings(bg, d, b)
    return bg


def paint_markings(bg, d, b):
    """바닥에 그려지는 표시들(운동장 라인, 농구 코트, 퀴즈 존 매트, 복도 화살표)."""
    white = hexc("#fbf6e8")
    # ---- 운동장: 축구장 라인
    x0, y0, x1, y1 = 4 * T, 5 * T, 24 * T, 17 * T
    for off in (0, 1):
        d.rectangle([x0 + off, y0 + off, x1 - off, y1 - off], outline=white)
    d.line([((x0 + x1) // 2, y0), ((x0 + x1) // 2, y1)], fill=white, width=2)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    d.ellipse([cx - 44, cy - 44, cx + 44, cy + 44], outline=white, width=2)
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=white)
    d.rectangle([x0, cy - 56, x0 + 70, cy + 56], outline=white, width=2)
    d.rectangle([x1 - 70, cy - 56, x1, cy + 56], outline=white, width=2)
    # ---- 체육관: 농구 코트 (x 45..57, y 36..49)
    gx0, gy0, gx1, gy1 = 45 * T, 36 * T, 57 * T, 49 * T
    for off in (0, 1):
        d.rectangle([gx0 + off, gy0 + off, gx1 - off, gy1 - off], outline=white)
    gcx = (gx0 + gx1) // 2
    gcy = (gy0 + gy1) // 2
    d.line([(gx0, gcy), (gx1, gcy)], fill=white, width=2)
    d.ellipse([gcx - 30, gcy - 30, gcx + 30, gcy + 30], outline=white, width=2)
    for (ya, yb, up) in ((gy0, gy0 + 4 * T, True), (gy1 - 4 * T, gy1, False)):
        d.rectangle([gcx - 2 * T, ya, gcx + 2 * T, yb], outline=white, width=2)
        ry = yb if up else ya
        d.arc([gcx - 48, ry - 48, gcx + 48, ry + 48], 0 if up else 180, 180 if up else 360, fill=white, width=2)
    # ---- 교실: 퀴즈 존 매트 (x 12..21, y 72..75)
    qx0, qy0, qx1, qy1 = 12 * T, 72 * T, 22 * T, 76 * T
    d.rectangle([qx0, qy0, qx1 - 1, qy1 - 1], fill=hexc("#f6c24a"))
    d.rectangle([qx0 + 4, qy0 + 4, qx1 - 5, qy1 - 5], fill=hexc("#fff0b4"))
    d.rectangle([qx0 + 4, qy0 + 4, qx1 - 5, qy1 - 5], outline=hexc("#e08a2a"), width=2)
    for xx in range(qx0 + 10, qx1 - 10, 16):
        d.rectangle([xx, qy0 + 8, xx + 6, qy0 + 9], fill=hexc("#f2b43a"))
        d.rectangle([xx + 8, qy1 - 10, xx + 14, qy1 - 9], fill=hexc("#f2b43a"))
    t = text_image("QUIZ ZONE", hexc("#d9602a"), FONT11B, 11)
    bg.alpha_composite(t, ((qx0 + qx1) // 2 - t.width // 2, qy0 + 8))
    t2 = text_image("퀴즈 존", hexc("#b8451a"), FONT11B, 11)
    bg.alpha_composite(t2, ((qx0 + qx1) // 2 - t2.width // 2, qy1 - 22))
    # ---- 급식실: 배식 대기선
    for xx in range(54 * T, 62 * T, 16):
        d.rectangle([xx, 4 * T + 12, xx + 9, 4 * T + 14], fill=hexc("#f0c030"))
    # ---- 세로 복도: 아래쪽을 가리키는 노란 화살표
    for (cxp, y_a, y_b) in ((53.5 * T + 16, 21, 30), (11 * T, 52, 61)):
        for yy in range(y_a, y_b, 3):
            cxi = int(cxp)
            py = yy * T
            for k in range(3):
                d.polygon([(cxi - 20, py + k * 4), (cxi, py + 16 + k * 4), (cxi + 20, py + k * 4),
                           (cxi + 20, py + 5 + k * 4), (cxi, py + 21 + k * 4), (cxi - 20, py + 5 + k * 4)],
                          fill=hexc(["#f6c93a", "#f2d66a", "#f6e4a0"][k]))


# ====================================================================== 방 꾸미기
def furnish(b):
    # ------------------------------------------------------------ 운동장 (x 1..26, y 3..18)
    b.shift(0, 0)
    for x in (2, 5, 8, 17, 20, 23):
        b.dec("window_2_glass", x, 1)
    b.dec("facadesign_매홀중학교", 11, 0, dx=-4, dy=8)
    b.dec("doorclass_본관", 13, 1)
    b.dec("flagwall", 15, 1, dx=-6, dy=14)
    b.obj("flagpole", 6, 5)
    b.obj("signstone", 8, 4)
    for (tx, ty) in ((2, 4), (23, 4), (2, 16), (24, 16)):
        b.obj("tree", tx, ty)
    b.obj("goal_4", 14, 4)
    b.obj("goal_4", 14, 17)
    b.obj("bench_3", 6, 18)
    b.obj("bench_3", 18, 18)
    b.obj("bush_3", 9, 18)
    b.obj("bush_3", 21, 18)
    for (cx, cy) in ((10, 8), (10, 15), (19, 8), (19, 15)):
        b.obj("cone", cx, cy)
    for (bx, by) in ((13, 9), (17, 14), (8, 12)):
        b.obj("ball", bx, by)
    b.obj("extinguisher", 4, 3)

    # ------------------------------------------------------------ 가로 복도 c1, c3 (벽 쪽 장식)
    for i, (cx, cy, left_t, right_t, dxs) in enumerate([(29, 10, "운동장", "급식실", 0), (29, 41, "도서관", "체육관", 0)]):
        # c3은 서쪽(도서관)으로 걸어가는 복도라서 간판 방향이 거꾸로예요
        b.dec(f"doorclass_1-{i * 2 + 1}", cx + 1, cy - 2)
        b.dec("bulletin_2", cx + 4, cy - 2, dy=12)
        b.dec("clock", cx + 6, cy - 2, dx=2, dy=8)
        b.dec(f"doorclass_2-{i * 2 + 1}", cx + 7, cy - 2)
        b.obj("dispenser", cx + 3, cy)
        b.obj("trash", cx + 6, cy) if i == 0 else b.obj("plant", cx + 6, cy)
        b.obj("plant", cx + 11, cy)
        b.obj("bench_3", cx + 6, cy + 3) if i == 0 else b.obj("bench_3", cx + 2, cy + 3)
        b.obj("extinguisher", cx + 10, cy)
    # 통로 위 안내 간판
    b.dec("signhang_운동장_7a6ac0", 29, 9, dx=2, dy=-8)
    b.dec("signhang_급식실_3f8a5a", 39, 9, dx=-6, dy=-8)
    b.dec("signhang_체육관_3f8a5a", 29, 40, dx=2, dy=-8)
    b.dec("signhang_도서관_7a6ac0", 39, 40, dx=-6, dy=-8)

    # ------------------------------------------------------------ 세로 복도 c2 (x 51..56, y 19..33), c4 (x 8..13, y 50..64)
    for (cx, y0) in ((51, 19), (8, 50)):
        b.obj("extinguisher", cx, y0 + 2)
        b.obj("plant", cx + 5, y0 + 2)
        b.obj("posterstand", cx, y0 + 7)
        b.obj("bench_3", cx + 3, y0 + 10)
        b.obj("trophy_2", cx + 4, y0 + 13) if cx == 51 else b.obj("plant", cx + 5, y0 + 12)
        b.obj("plant", cx, y0 + 12)

    # ------------------------------------------------------------ 급식실 (x 43..62, y 3..18) - 서쪽/남쪽 출입구
    b.dec("window_3_field", 44, 1)
    b.dec("window_3_field", 48, 1)
    b.dec("poster_gupsik", 52, 1, dx=-2, dy=8)
    b.dec("kitchen_8", 54, 1)
    b.obj("steel_7", 54, 3)
    b.obj("dispenser", 44, 3)
    b.obj("fridge", 61, 3)
    chair_cols = ["org", "org", "yel", "org", "org", "yel"]
    for (tx, ty, w) in ((45, 6, 6), (53, 6, 6), (44, 15, 6), (58, 15, 4)):
        b.obj(f"table_{w}x2_brown_tray", tx, ty)
        for i in range(w):
            c = chair_cols[(i + tx) % 6]
            b.obj(f"chair_{c}_s", tx + i, ty - 1)
            b.obj(f"chair_{c}_n", tx + i, ty + 2)
    b.obj("trash", 62, 18)
    b.obj("plant", 43, 18)

    # ------------------------------------------------------------ 체육관 (x 43..64, y 34..49)  북쪽/서쪽 출입구
    b.shift(-36, 31)
    b.dec("banner_매홀중학교~체육관_8", 79, 0, dy=2)
    b.dec("window_3_field", 79, 1)
    b.dec("window_3_field", 83, 1)
    b.dec("window_2_field", 93, 1)
    b.dec("curtain_6", 95, 1)
    b.obj("stage_6x3", 95, 3)
    b.obj("hoop", 86, 4)
    b.obj("speaker", 94, 3)
    b.obj("speaker", 94, 6)
    b.obj("flagstand", 99, 6)
    b.obj("bench_3", 80, 5)
    b.obj("bench_3", 80, 8)
    b.obj("ballcart", 80, 15)
    b.obj("ballcart", 80, 17)
    b.obj("mat_red", 96, 15)
    b.obj("mat_blue", 98, 15)
    b.obj("mat_blue", 96, 17)
    b.obj("trophy_2", 82, 3)
    b.obj("ball", 89, 8)
    b.obj("ball", 84, 14)
    b.obj("plant", 99, 18)

    # ------------------------------------------------------------ 도서관 (x 7..26, y 34..49)  동쪽/남쪽 출입구
    b.shift(-110, 31)
    b.dec("window_3_field", 118, 1)
    b.dec("poster_libguide", 122, 1, dx=-2, dy=8)
    for sx in (125, 128, 131, 134):
        b.obj("shelf_3", sx, 3)
    for (tx, ty) in ((119, 6), (127, 6), (125, 15)):
        b.obj("table_4x2_white", tx, ty)
        for i in range(4):
            c = ["blu", "gry", "yel", "gry"][i]
            b.obj(f"chair_{c}_s", tx + i, ty - 1)
            b.obj(f"chair_{c}_n", tx + i, ty + 2)
    b.obj("libcounter_4", 132, 16)
    b.obj("bookcart", 130, 16)
    b.obj("plant", 117, 18)
    b.obj("plant", 136, 7)

    # ------------------------------------------------------------ 교실 (x 7..26, y 65..80)  북쪽 출입구
    b.shift(-146, 62)
    b.dec("bulletin_2", 160, 1, dy=10)
    b.dec("blackboard_6_퀴즈~시간!", 162, 1, dy=4)
    b.dec("flagwall", 168, 1, dx=6, dy=14)
    b.dec("clock", 170, 1, dx=8, dy=8)
    b.dec("bulletin_2", 171, 1, dy=10)
    b.obj("tdesk", 164, 3)
    b.obj("cabinet_2", 168, 3)
    b.obj("shelf_2", 171, 3)
    cols = [161, 162, 164, 165, 167, 168, 170, 171]
    for ry in (6, 8, 15, 17):
        for x in cols:
            b.obj("desk_book" if (x + ry) % 3 == 0 else "desk", x, ry)
            b.obj(f"chair_{['red', 'blu', 'yel', 'grn', 'pur'][(x + ry) % 5]}_n", x, ry + 1)
    b.obj("backpack_gr", 160, 8)
    b.obj("backpack_bl", 172, 16)
    b.obj("trash", 153, 18)
    b.shift(0, 0)


NPCS = [
    # id, 이름, 스프라이트, 타일 x, y, 방향, 구역, 역할
    ("haneul", "하늘", "haneul", 15, 11, "down", "playground", "guide"),
    ("doyun", "도윤", "doyun", 51, 11, "down", "cafeteria", "guide"),
    ("seoyeon", "서연", "seoyeon", 52, 42, "down", "gym", "guide"),
    ("jiu", "지우", "jiu", 23, 46, "down", "library", "guide"),
    ("banjang", "반장", "banjang", 17, 74, "down", "classroom", "quiz"),
    # 지나가는 학생들(필수 아님)
    ("walker1", "민준", "extra_a", 35, 12, "left", "c1", "chat"),
    ("walker2", "채원", "extra_b", 53, 26, "down", "c2", "chat"),
    ("walker3", "서진", "extra_c", 35, 43, "right", "c3", "chat"),
    ("walker4", "다은", "extra_d", 10, 57, "down", "c4", "chat"),
]


def build():
    b = Builder()
    furnish(b)
    bg = render_bg(b)

    # 스프라이트 정보 모으기
    from objects import get_sprite
    names = set(n for (n, _, _) in b.objects) | set(n for (n, _, _) in b.decor)
    names |= {"gate_v_closed", "gate_v_open", "gate_h_closed", "gate_h_open"}
    for n in sorted(names):
        b.sprite_info[n] = get_sprite(n)

    # 충돌 지도
    blocked = [[not b.floor[y][x] for x in range(MAP_W)] for y in range(MAP_H)]
    for (n, tx, ty) in b.objects:
        sp = b.sprite_info[n]
        if sp["solid"]:
            for yy in range(ty, ty + sp["d"]):
                for xx in range(tx, tx + sp["w"]):
                    if 0 <= yy < MAP_H and 0 <= xx < MAP_W:
                        blocked[yy][xx] = True

    # 문 장식과 충돌
    gates = []
    for (gid, ori, gx, gy, size, req, label) in GATES:
        gates.append(dict(id=gid, o=ori, x=gx, y=gy, size=size, requires=req, label=label))

    # 도달 가능성 검사 (문을 모두 열었다고 가정)
    def reach(start):
        seen = {start}
        q = deque([start])
        while q:
            x, y = q.popleft()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < MAP_W and 0 <= ny < MAP_H and not blocked[ny][nx] and (nx, ny) not in seen:
                    seen.add((nx, ny))
                    q.append((nx, ny))
        return seen
    r = reach((3, 11))
    for (nid, nm, sp, tx, ty, dr, area, role) in NPCS:
        if (tx, ty) not in r:
            print("!! NPC 도달 불가:", nid, tx, ty)
    for yy in range(MAP_H):
        for xx in range(MAP_W):
            if b.floor[yy][xx] and not blocked[yy][xx] and (xx, yy) not in r:
                print("!! 갇힌 칸:", xx, yy)
                break
    print("교실 도달:", (17, 75) in r)

    zones = []
    seen_ids = set()
    for (aid, name, theme, x, y, w, h) in AREAS:
        if name:
            zones.append(dict(id=aid, name=name, x=x, y=y, w=w, h=h))
    data = dict(
        tile=T, w=MAP_W, h=MAP_H,
        collision=["".join("1" if blocked[y][x] else "0" for x in range(MAP_W)) for y in range(MAP_H)],
        objects=[dict(n=n, x=tx, y=ty) for (n, tx, ty) in b.objects],
        decor=[dict(n=n, x=px, y=py) for (n, px, py) in b.decor],
        npcs=[dict(id=i, name=nm, spr=sp, x=tx, y=ty, dir=dr, area=area, role=role)
              for (i, nm, sp, tx, ty, dr, area, role) in NPCS],
        gates=gates, zones=zones, spawn=dict(x=3, y=11),
        order=["playground", "cafeteria", "gym", "library"],
    )
    return dict(bg=bg, data=data, sprites=b.sprite_info, builder=b, blocked=blocked)
