"""매홀중학교 큰 맵 빌더 (ZEP식 탑다운, 고해상도: 그림 타일 64px = 게임 칸 32px의 2배).

운동장 → 복도 → 급식실 ↓ 복도 ↓ 체육관 ← 복도 ← 도서관 ↓ 복도 ↓ 교실(퀴즈 존)
방에서 방으로 가는 통로(문)는 소개를 끝내야 열려요.

  build() -> dict(bg=Image, data=dict, sprites=dict, ...)
"""
import math
from collections import deque
from PIL import Image, ImageDraw
from pxlib import hexc, shade, lighten, mix, hash2, text_image, FONT11B, FONT9
from sp import TILE, ART

T = TILE                 # 그림 한 칸(픽셀)
MAP_W, MAP_H = 66, 82    # 맵 크기(칸)

# (id, 한글 이름, 바닥 테마, x, y, w, h)  칸 단위, 걸어다닐 수 있는 바닥
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
    ("classroom", "교실", "plank", 7, 65, 20, 16),
]

# 잠긴 문: (id, 방향 v=세로 문/h=가로 문, x, y, 크기, 열리는 조건, 안내 문구)
GATES = [
    ("A", "v", 27, 10, 4, ["playground"], "운동장 소개를 끝내면 열려요"),
    ("C", "h", 51, 19, 6, ["cafeteria"], "급식실 소개를 끝내면 열려요"),
    ("E", "v", 42, 41, 4, ["gym"], "체육관 소개를 끝내면 열려요"),
    ("G", "h", 8, 50, 6, ["library"], "도서관 소개를 끝내면 열려요"),
    ("H", "h", 8, 64, 6, ["playground", "cafeteria", "gym", "library"], "소개를 모두 끝내야 퀴즈 존에 들어가요"),
]


def rnd(*k):
    return hash2(*[int(v) & 0xFFFF for v in k])


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
        self.decor = []        # (name, px, py)  (그림 픽셀 좌표)
        self.npcs = []
        self.sprite_info = {}

    # ---- 배치 도우미
    def obj(self, name, tx, ty):
        self.objects.append((name, tx, ty))

    def dec(self, name, tx, ty, dx=0, dy=0):
        """벽 장식 배치. (tx, ty)는 칸, dx/dy 는 그림 픽셀 단위 조정이에요."""
        self.decor.append((name, int(tx * T + dx) & ~1, int(ty * T + dy) & ~1))   # 짝수 위치(줄일 때 글자가 안 깨져요)

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
        for dy in (1, 2, 3):
            if self.is_floor(x, y + dy):
                return self.area[y + dy][x]
        for dy in (0, -1, 1):
            for dx in (-1, 1, 0):
                if self.is_floor(x + dx, y + dy):
                    return self.area[y + dy][x + dx]
        return None


# ====================================================================== 바닥 질감
def fill(d, X, Y, c):
    d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=c)


def speck(d, X, Y, tx, ty, cols, n, seed, w=1, h=1):
    for k in range(n):
        x = X + int(rnd(tx, ty, seed + k * 2) * (T - w))
        y = Y + int(rnd(tx, ty, seed + k * 2 + 1) * (T - h))
        d.rectangle([x, y, x + w - 1, y + h - 1], fill=cols[int(rnd(tx, ty, seed + 500 + k) * len(cols))])


def plank_rows(d, X, Y, tx, ty, base_cols, ph, seed, amt, plank_len, gloss=False, seam=None):
    """가로로 긴 마루판. 전체 좌표를 기준으로 그려서 칸 경계에서도 이어져요."""
    rows = T // ph
    for r in range(rows):
        R = (Y // ph) + r                      # 전체 맵에서의 판자 줄 번호
        y0 = Y + r * ph
        base = base_cols[int(rnd(R, seed, 1) * len(base_cols))]
        d.rectangle([X, y0, X + T - 1, y0 + ph - 1], fill=base)
        for yy in range(ph):
            for i in range(X // 24, (X + T - 1) // 24 + 1):
                f = 1 + (rnd(R, yy + seed, i) - 0.5) * 2 * amt
                xs, xe = max(X, i * 24), min(X + T - 1, i * 24 + 23)
                if xe >= xs:
                    d.line([(xs, y0 + yy), (xe, y0 + yy)], fill=shade(base, f))
        # 위쪽 하이라이트와 아래쪽 이음선
        d.line([(X, y0), (X + T - 1, y0)], fill=lighten(base, 0.18))
        d.line([(X, y0 + ph - 1), (X + T - 1, y0 + ph - 1)], fill=seam or shade(base, 0.72))
        # 판자 끝 이음새(줄마다 위치가 달라요)
        off = int(rnd(R, seed, 7) * plank_len)
        for jx in range(-plank_len, MAP_W * T + plank_len, plank_len):
            gx = jx + off
            if X <= gx < X + T:
                d.line([(gx, y0), (gx, y0 + ph - 1)], fill=seam or shade(base, 0.7))
                d.line([(gx + 1, y0), (gx + 1, y0 + ph - 1)], fill=lighten(base, 0.12))
        if gloss and rnd(R, seed, 9) > 0.55:        # 니스칠 반사광
            gx0 = X + int(rnd(R, tx, 10) * 30)
            d.line([(gx0, y0 + 3), (gx0 + 24, y0 + 3)], fill=lighten(base, 0.3))


def draw_floor(d, th, tx, ty, X, Y):
    if th == "sand":
        base = hexc("#e9cd94") if (tx + ty) % 2 == 0 else hexc("#e7ca90")
        fill(d, X, Y, base)
        speck(d, X, Y, tx, ty, [hexc("#f6e4b8"), hexc("#d6b878"), hexc("#f0daa4")], 90, 1)
        speck(d, X, Y, tx, ty, [hexc("#cba76a"), hexc("#fff0c8")], 26, 200, 2, 1)
        if rnd(tx, ty, 99) > 0.7:                                          # 작은 돌멩이
            px, py = X + int(rnd(tx, ty, 5) * 50) + 4, Y + int(rnd(tx, ty, 6) * 50) + 4
            d.ellipse([px, py, px + 5, py + 3], fill=hexc("#b8a078"), outline=hexc("#8a7650"))
            d.line([(px + 1, py + 1), (px + 3, py + 1)], fill=hexc("#d8c49a"))
        if rnd(tx, ty, 98) > 0.93:                                         # 발자국 같은 긁힘
            px, py = X + int(rnd(tx, ty, 7) * 40), Y + int(rnd(tx, ty, 8) * 50)
            d.arc([px, py, px + 20, py + 10], 200, 340, fill=hexc("#d0b070"))
    elif th == "corridor":
        bx, by = tx // 2, ty // 2
        big = (bx + by) % 2
        dark_patch = rnd(bx, by, 3) > 0.74
        if dark_patch:
            base = hexc("#868a96")
        else:
            base = hexc("#e2ded4") if big == 0 else hexc("#d6d2cc")
        fill(d, X, Y, base)
        if dark_patch:
            speck(d, X, Y, tx, ty, [hexc("#666a76"), hexc("#a4a8b2"), hexc("#727682"), hexc("#bcc0ca")], 300, 1)
        else:
            speck(d, X, Y, tx, ty, [shade(base, 0.94), lighten(base, 0.2), shade(base, 0.88)], 40, 1)
        if tx % 2 == 0:                                                   # 타일 경계(줄눈)
            d.line([(X, Y), (X, Y + T - 1)], fill=shade(base, 0.8))
            d.line([(X + 1, Y), (X + 1, Y + T - 1)], fill=lighten(base, 0.22))
        if ty % 2 == 0:
            d.line([(X, Y), (X + T - 1, Y)], fill=shade(base, 0.8))
            d.line([(X, Y + 1), (X + T - 1, Y + 1)], fill=lighten(base, 0.22))
        if not dark_patch and rnd(tx, ty, 21) > 0.6:                       # 광택 줄
            d.line([(X + 10, Y + 40), (X + 34, Y + 22)], fill=lighten(base, 0.3))
    elif th == "beige":
        base = hexc("#efd8a4") if (tx + ty) % 2 == 0 else hexc("#ebd29a")
        fill(d, X, Y, base)
        speck(d, X, Y, tx, ty, [shade(base, 0.95), lighten(base, 0.2)], 24, 1)
        d.line([(X, Y + T - 1), (X + T - 1, Y + T - 1)], fill=hexc("#cfb57a"))
        d.line([(X + T - 1, Y), (X + T - 1, Y + T - 1)], fill=hexc("#cfb57a"))
        d.line([(X, Y + T - 2), (X + T - 2, Y + T - 2)], fill=hexc("#dcc48c"))
        d.line([(X, Y), (X + T - 3, Y)], fill=lighten(base, 0.45))
        d.line([(X, Y), (X, Y + T - 3)], fill=lighten(base, 0.3))
        if rnd(tx, ty, 31) > 0.7:                                          # 광택 반사
            d.line([(X + 8, Y + 36), (X + 30, Y + 12)], fill=lighten(base, 0.5), width=2)
    elif th == "carpet":
        base = hexc("#8c777a") if (tx + ty) % 2 == 0 else hexc("#8a7578")
        fill(d, X, Y, base)
        speck(d, X, Y, tx, ty, [shade(base, 0.92), lighten(base, 0.1), shade(base, 0.85), lighten(base, 0.18)], 340, 1)
        for k in range(0, T, 8):                                           # 카펫 짜임
            d.line([(X, Y + k), (X + T - 1, Y + k)], fill=shade(base, 0.965))
        for k in range(0, T, 8):
            d.line([(X + k, Y), (X + k, Y + T - 1)], fill=shade(base, 0.975))
    elif th == "wood":     # 체육관: 밝은 니스칠 마루
        plank_rows(d, X, Y, tx, ty, [hexc("#e0aa62"), hexc("#d9a15a"), hexc("#e4b06c"), hexc("#d89f58")], 16, 3, 0.05, 192, gloss=True)
    elif th == "plank":    # 교실: 따뜻한 갈색 마루판
        plank_rows(d, X, Y, tx, ty, [hexc("#d89f67"), hexc("#c7955d"), hexc("#d0995f"), hexc("#bf8c56")], 16, 17, 0.06, 224)
    else:
        fill(d, X, Y, hexc("#cccccc"))


# ====================================================================== 벽 질감
def draw_brick(d, X, Y, w, h, base, mortar, gx, gy, bw=32, bh=16, var=0.1):
    d.rectangle([X, Y, X + w - 1, Y + h - 1], fill=mortar)
    for ry in range(0, h, bh):
        row = (gy + ry) // bh
        off = (bw // 2) if row % 2 else 0
        x = -off
        while x < w:
            col = (gx + x + off) // bw
            v = 1 + (rnd(col, row, 4) - 0.5) * 2 * var
            c = shade(base, v)
            x0, x1 = max(0, x + 1), min(w - 1, x + bw - 2)
            if x1 >= x0:
                d.rectangle([X + x0, Y + ry + 1, X + x1, Y + ry + bh - 3], fill=c)
                d.line([(X + x0, Y + ry + 1), (X + x1, Y + ry + 1)], fill=lighten(c, 0.24))     # 윗면 빛
                d.line([(X + x0, Y + ry + bh - 3), (X + x1, Y + ry + bh - 3)], fill=shade(c, 0.78))  # 아랫면 그늘
                if x - 0 >= 0:
                    d.line([(X + x0, Y + ry + 1), (X + x0, Y + ry + bh - 3)], fill=lighten(c, 0.1))
                if rnd(col, row, 9) > 0.7:                                                      # 벽돌 얼룩
                    px = X + x0 + int(rnd(col, row, 11) * max(1, x1 - x0 - 4))
                    d.rectangle([px, Y + ry + 5, px + 3, Y + ry + 6], fill=shade(c, 0.88))
            x += bw


THEMES = {
    "playground": dict(kind="facade"),
    "cafeteria": dict(kind="cream_brick", cream="#f6e2b0", brick="#cf8660"),
    "gym": dict(kind="cream_wood", cream="#f6e0aa", wood="#a8703c"),
    "library": dict(kind="plaster", cream="#d9ceb8", base="#8a7a68"),
    "classroom": dict(kind="plaster", cream="#d9c8a8", base="#a8896a"),
    "corridor": dict(kind="brick"),
}


def theme_of(room):
    return THEMES.get(room, THEMES["corridor"])


def vgrad(d, X, Y, w, h, c1, c2):
    for i in range(h):
        d.line([(X, Y + i), (X + w - 1, Y + i)], fill=mix(c1, c2, i / max(1, h - 1)))


def draw_wall(d, b, x, y, kind, X, Y):
    room = b.wall_room(x, y)
    th = theme_of(room)
    k = th["kind"]
    if kind == "cap":
        hedge = k == "facade" and not b.is_floor(x, y + 3)
        if hedge:                                                          # 운동장 둘레 생울타리
            d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=hexc("#2f6e38"))
            greens = [hexc("#3d8044"), hexc("#4f984f"), hexc("#62ae58"), hexc("#2f6a36")]
            for i in range(14):
                cx = X + int(rnd(x, y, i) * 60) + 2
                cy = Y + int(rnd(x, y, i + 20) * 60) + 2
                r = 6 + int(rnd(x, y, i + 40) * 6)
                d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=greens[i % 4], outline=shade(hexc("#2f6a36"), 0.8))
            for i in range(26):
                cx = X + int(rnd(x, y, i + 60) * 62)
                cy = Y + int(rnd(x, y, i + 80) * 62)
                d.rectangle([cx, cy, cx + 2, cy + 1], fill=hexc("#a6e07c"))
            return
        base = hexc("#5b4650")
        d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=base)
        for i in range(30):
            d.point((X + int(rnd(x, y, i) * 64), Y + int(rnd(x, y, i + 50) * 64)), fill=[hexc("#6a5460"), hexc("#4a3640")][i % 2])
        d.rectangle([X, Y, X + T - 1, Y + 3], fill=hexc("#7a6270"))
        d.line([(X, Y + 4), (X + T - 1, Y + 4)], fill=hexc("#6a5462"))
        if k == "facade" and b.is_floor(x, y + 3):                         # 본관 지붕 선
            d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=hexc("#6a7288"))
            for ix in range(0, T, 16):
                d.line([(X + ix, Y), (X + ix, Y + T - 12)], fill=hexc("#5a627a"))
            d.rectangle([X, Y + T - 12, X + T - 1, Y + T - 1], fill=hexc("#4a5268"))
            d.rectangle([X, Y, X + T - 1, Y + 4], fill=hexc("#9aa2b8"))
            d.line([(X, Y + T - 12), (X + T - 1, Y + T - 12)], fill=hexc("#7a82a0"))
        for (dx, dy, rect) in ((1, 0, [X + T - 6, Y, X + T - 1, Y + T - 1]), (-1, 0, [X, Y, X + 5, Y + T - 1]),
                               (0, -1, [X, Y, X + T - 1, Y + 5]), (0, 1, [X, Y + T - 6, X + T - 1, Y + T - 1])):
            if b.is_floor(x + dx, y + dy):
                d.rectangle(rect, fill=hexc("#3a2c34"))
        return
    low = kind == "face_low"
    if k == "facade":
        draw_brick(d, X, Y, T, T, hexc("#cf7a54"), hexc("#e6b698"), x * T, y * T, var=0.07)
        if low:
            d.rectangle([X, Y + T - 6, X + T - 1, Y + T - 1], fill=hexc("#8a6a5a"))
            d.line([(X, Y + T - 6), (X + T - 1, Y + T - 6)], fill=hexc("#b8907a"))
    elif k == "brick":
        draw_brick(d, X, Y, T, T, hexc("#c47a5e"), hexc("#e4b898"), x * T, y * T, var=0.09)
        if low:
            d.rectangle([X, Y + T - 8, X + T - 1, Y + T - 1], fill=hexc("#3a2c30"))      # 걸레받이
            d.line([(X, Y + T - 8), (X + T - 1, Y + T - 8)], fill=hexc("#6a5a5e"))
            d.line([(X, Y + T - 7), (X + T - 1, Y + T - 7)], fill=hexc("#4a3a40"))
    elif k == "cream_brick":
        cream = hexc(th["cream"])
        if low:
            draw_brick(d, X, Y, T, T, hexc(th["brick"]), hexc("#e8c8a8"), x * T, y * T, var=0.08)
            d.rectangle([X, Y, X + T - 1, Y + 3], fill=hexc("#8a5a42"))
            d.line([(X, Y + 4), (X + T - 1, Y + 4)], fill=hexc("#b07a5e"))
            d.rectangle([X, Y + T - 6, X + T - 1, Y + T - 1], fill=hexc("#5a3e30"))
        else:
            vgrad(d, X, Y, T, T, lighten(cream, 0.08), cream)
            d.line([(X, Y + T - 1), (X + T - 1, Y + T - 1)], fill=shade(cream, 0.88))
            speck(d, X, Y, x, y, [shade(cream, 0.96), lighten(cream, 0.2)], 14, 3)
    elif k == "cream_wood":
        cream, wood = hexc(th["cream"]), hexc(th["wood"])
        if low:
            d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=wood)
            for xx in range(0, T, 16):                                    # 세로 판자 벽
                c = shade(wood, 0.94 + 0.1 * rnd(x, xx, 3))
                d.rectangle([X + xx, Y + 8, X + xx + 14, Y + T - 7], fill=c)
                d.line([(X + xx + 15, Y + 8), (X + xx + 15, Y + T - 7)], fill=shade(wood, 0.68))
                d.line([(X + xx, Y + 8), (X + xx, Y + T - 7)], fill=lighten(wood, 0.2))
                for gy in range(Y + 12, Y + T - 8, 6):
                    d.line([(X + xx + 3, gy), (X + xx + 3 + int(rnd(x, xx, gy) * 8), gy)], fill=shade(c, 0.88))
            d.rectangle([X, Y, X + T - 1, Y + 7], fill=lighten(wood, 0.28))
            d.line([(X, Y + 8), (X + T - 1, Y + 8)], fill=shade(wood, 0.6))
            d.rectangle([X, Y + T - 6, X + T - 1, Y + T - 1], fill=shade(wood, 0.55))
        else:
            vgrad(d, X, Y, T, T, lighten(cream, 0.1), cream)
    elif k == "plaster":
        cream, basec = hexc(th["cream"]), hexc(th["base"])
        vgrad(d, X, Y, T, T, lighten(cream, 0.07) if not low else cream, cream if not low else shade(cream, 0.93))
        speck(d, X, Y, x, y, [shade(cream, 0.96), lighten(cream, 0.18)], 20, 3)
        if (x * 1) % 4 == 0:                                              # 패널 이음
            d.line([(X, Y), (X, Y + T - 1)], fill=shade(cream, 0.9))
            d.line([(X + 1, Y), (X + 1, Y + T - 1)], fill=lighten(cream, 0.2))
        if low:
            d.rectangle([X, Y + T - 12, X + T - 1, Y + T - 1], fill=basec)           # 걸레받이
            d.line([(X, Y + T - 12), (X + T - 1, Y + T - 12)], fill=lighten(basec, 0.3))
            d.line([(X, Y + T - 11), (X + T - 1, Y + T - 11)], fill=shade(basec, 0.8))
            d.rectangle([X, Y + T - 3, X + T - 1, Y + T - 1], fill=shade(basec, 0.6))
    else:
        d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=hexc("#d9c8a8"))


def render_bg(b):
    bg = Image.new("RGBA", (MAP_W * T, MAP_H * T), hexc("#1c1626"))
    d = ImageDraw.Draw(bg)
    for y in range(MAP_H):
        for x in range(MAP_W):
            X, Y = x * T, y * T
            kd = b.kind(x, y)
            if kd == "void":
                continue
            if kd == "floor":
                draw_floor(d, b.theme[y][x], x, y, X, Y)
            else:
                draw_wall(d, b, x, y, kd, X, Y)
    # 벽 바로 아래 그림자(부드럽게)와 창문 빛
    sh = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    ds = ImageDraw.Draw(sh)
    for y in range(MAP_H):
        for x in range(MAP_W):
            if b.is_floor(x, y) and not b.is_floor(x, y - 1):
                for i in range(16):
                    ds.rectangle([x * T, y * T + i, x * T + T - 1, y * T + i], fill=(40, 20, 40, int(64 - i * 4)))
            if b.is_floor(x, y) and not b.is_floor(x - 1, y):
                for i in range(8):
                    ds.rectangle([x * T + i, y * T, x * T + i, y * T + T - 1], fill=(40, 20, 40, int(36 - i * 4.5)))
    bg.alpha_composite(sh)
    # 창문에서 들어오는 햇빛
    light = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    dl = ImageDraw.Draw(light)
    for (name, px, py) in b.decor:
        if name.startswith("window_") and "glass" not in name:
            n = int(name.split("_")[1])
            wx0, wx1 = px + 10, px + n * T - 10
            fy = (py // T + 2 + 1) * T + 4          # 창 바로 아래 바닥 시작
            dl.polygon([(wx0, fy), (wx1, fy), (wx1 + 90, fy + 230), (wx0 + 90, fy + 230)], fill=(255, 244, 200, 26))
            dl.polygon([(wx0 + 14, fy), (wx1 - 14, fy), (wx1 + 70, fy + 210), (wx0 + 104, fy + 210)], fill=(255, 250, 220, 16))
    # 햇빛은 바닥 위에만 비치게 잘라요(벽 위로 번지지 않게)
    fmask = Image.new("L", bg.size, 0)
    dm = ImageDraw.Draw(fmask)
    for y in range(MAP_H):
        for x in range(MAP_W):
            if b.is_floor(x, y):
                dm.rectangle([x * T, y * T, x * T + T - 1, y * T + T - 1], fill=255)
    light.putalpha(Image.composite(light.getchannel("A"), Image.new("L", bg.size, 0), fmask))
    bg.alpha_composite(light)
    d = ImageDraw.Draw(bg)
    lines = paint_markings(bg, d, b)
    return bg, lines


def paint_markings(bg, d, b):
    """바닥에 그려지는 표시들(운동장 라인, 농구 코트, 퀴즈 존 매트, 복도 화살표).
    하얀 라인은 따로 투명 그림(lines)에 그려요. 줄일 때 끊기지 않게 나중에 얹어요."""
    lines = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    dl = ImageDraw.Draw(lines)
    white = hexc("#fbf6e8")
    wl = lambda col=white: dict(fill=col)

    def rect_line(x0, y0, x1, y1, w=4, col=white):
        for o in range(w):
            dl.rectangle([x0 + o, y0 + o, x1 - o, y1 - o], outline=col)

    # ---- 운동장: 축구장 라인
    x0, y0, x1, y1 = 4 * T, 5 * T, 24 * T, 17 * T
    rect_line(x0, y0, x1, y1)
    dl.line([((x0 + x1) // 2, y0), ((x0 + x1) // 2, y1)], fill=white, width=4)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    dl.ellipse([cx - 88, cy - 88, cx + 88, cy + 88], outline=white, width=4)
    dl.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=white)
    rect_line(x0, cy - 112, x0 + 140, cy + 112, 4)
    rect_line(x1 - 140, cy - 112, x1, cy + 112, 4)
    rect_line(x0, cy - 56, x0 + 56, cy + 56, 4)
    rect_line(x1 - 56, cy - 56, x1, cy + 56, 4)
    # ---- 체육관: 농구 코트 (x 45..57, y 36..49)
    gx0, gy0, gx1, gy1 = 45 * T, 36 * T, 57 * T, 49 * T
    rect_line(gx0, gy0, gx1, gy1, 4)
    gcx, gcy = (gx0 + gx1) // 2, (gy0 + gy1) // 2
    dl.line([(gx0, gcy), (gx1, gcy)], fill=white, width=4)
    dl.ellipse([gcx - 60, gcy - 60, gcx + 60, gcy + 60], outline=white, width=4)
    for (ya, yb, up) in ((gy0, gy0 + 4 * T, True), (gy1 - 4 * T, gy1, False)):
        dl.rectangle([gcx - 2 * T, ya, gcx + 2 * T, yb], outline=white, width=4)
        ry = yb if up else ya
        dl.arc([gcx - 96, ry - 96, gcx + 96, ry + 96], 0 if up else 180, 180 if up else 360, fill=white, width=4)
    # ---- 교실: 퀴즈 존 매트 (x 12..21, y 72..75)
    qx0, qy0, qx1, qy1 = 12 * T, 72 * T, 22 * T, 76 * T
    d.rounded_rectangle([qx0, qy0, qx1 - 1, qy1 - 1], 14, fill=hexc("#f6c24a"))
    d.rounded_rectangle([qx0 + 8, qy0 + 8, qx1 - 9, qy1 - 9], 10, fill=hexc("#fff0b4"), outline=hexc("#e08a2a"), width=3)
    for xx in range(qx0 + 22, qx1 - 30, 28):
        d.rectangle([xx, qy0 + 16, xx + 12, qy0 + 19], fill=hexc("#f2b43a"))
        d.rectangle([xx + 14, qy1 - 20, xx + 26, qy1 - 17], fill=hexc("#f2b43a"))
    for (cxx, cyy) in ((qx0 + 24, qy0 + 24), (qx1 - 24, qy0 + 24), (qx0 + 24, qy1 - 24), (qx1 - 24, qy1 - 24)):
        d.ellipse([cxx - 6, cyy - 6, cxx + 6, cyy + 6], fill=hexc("#f2b43a"), outline=hexc("#e08a2a"))
    t = text_image("QUIZ ZONE", hexc("#d9602a"), FONT11B, 11)
    t = t.resize((t.width * 3, t.height * 3), Image.NEAREST)
    bg.alpha_composite(t, (((qx0 + qx1) // 2 - t.width // 2) & ~1, (qy0 + 26) & ~1))
    t2 = text_image("퀴즈 존", hexc("#b8451a"), FONT11B, 11)
    t2 = t2.resize((t2.width * 2, t2.height * 2), Image.NEAREST)
    bg.alpha_composite(t2, (((qx0 + qx1) // 2 - t2.width // 2) & ~1, (qy1 - 56) & ~1))
    # ---- 급식실: 배식 대기선
    for xx in range(54 * T, 62 * T, 32):
        d.rectangle([xx, 4 * T + 24, xx + 18, 4 * T + 29], fill=hexc("#f0c030"))
    # ---- 세로 복도: 아래쪽을 가리키는 노란 화살표
    for (cxp, y_a, y_b) in ((int(53.5 * T + 32), 21, 30), (11 * T, 52, 61)):
        for yy in range(y_a, y_b, 3):
            py = yy * T
            for k in range(3):
                d.polygon([(cxp - 40, py + k * 8), (cxp, py + 32 + k * 8), (cxp + 40, py + k * 8),
                           (cxp + 40, py + 10 + k * 8), (cxp, py + 42 + k * 8), (cxp - 40, py + 10 + k * 8)],
                          fill=hexc(["#f6c93a", "#f2d66a", "#f6e4a0"][k]))
    return lines


# ====================================================================== 방 꾸미기
def furnish(b):
    # ------------------------------------------------------------ 운동장 (x 1..26, y 3..18)
    for x in (2, 5, 8, 17, 20, 23):
        b.dec("window_2_glass", x, 1)
    b.dec("facadesign_매홀중학교", 12, 0, dx=43, dy=18)
    b.dec("doorclass_본관", 13, 1)
    b.dec("flagwall", 15, 1, dx=12, dy=28)
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
    for i, (cx, cy) in enumerate([(29, 10), (29, 41)]):
        b.dec(f"doorclass_1-{i * 2 + 1}", cx + 1, cy - 2)
        b.dec("bulletin_2", cx + 4, cy - 2, dy=24)
        b.dec("clock", cx + 6, cy - 2, dx=4, dy=18)
        b.dec(f"doorclass_2-{i * 2 + 1}", cx + 7, cy - 2)
        b.obj("purifier", cx + 3, cy)
        b.obj("trash", cx + 6, cy) if i == 0 else b.obj("plant", cx + 6, cy)
        b.obj("plant", cx + 11, cy)
        b.obj("bench_3", cx + 6, cy + 3) if i == 0 else b.obj("bench_3", cx + 2, cy + 3)
        b.obj("extinguisher", cx + 10, cy)
    b.dec("signhang_운동장_7a6ac0", 29, 9, dx=4, dy=-14)
    b.dec("signhang_급식실_3f8a5a", 38, 9, dx=40, dy=-14)
    b.dec("signhang_체육관_3f8a5a", 29, 40, dx=4, dy=-14)
    b.dec("signhang_도서관_7a6ac0", 38, 40, dx=40, dy=-14)

    # ------------------------------------------------------------ 세로 복도 c2 (x 51..56, y 19..33), c4 (x 8..13, y 50..64)
    for (cx, y0) in ((51, 19), (8, 50)):
        b.obj("extinguisher", cx, y0 + 2)
        b.obj("plant", cx + 5, y0 + 2)
        b.obj("posterstand", cx, y0 + 7)
        b.obj("bench_3", cx + 3, y0 + 10)
        b.obj("trophy_2", cx + 4, y0 + 13) if cx == 51 else b.obj("plant", cx + 5, y0 + 12)
        b.obj("plant", cx, y0 + 12)

    # ------------------------------------------------------------ 급식실 (x 43..62, y 3..18)
    b.dec("window_3_field", 44, 1)
    b.dec("poster_water", 47, 1, dx=-4, dy=14)
    b.dec("window_3_field", 48, 1)
    b.dec("poster_gupsik", 52, 1, dx=-6, dy=16)
    b.dec("kitchen_8", 54, 1)
    b.obj("steel_7", 54, 3)
    b.obj("dispenser", 44, 3)
    b.obj("glasscab", 45, 3)
    b.obj("fridge", 61, 3)
    chair_cols = ["red", "grn", "blu", "yel", "pur", "red"]
    for (tx, ty, w) in ((45, 6, 6), (53, 6, 6), (44, 15, 6), (58, 15, 4)):
        b.obj(f"table_{w}x2_brown_tray", tx, ty)
        for i in range(w):
            c = chair_cols[(i + tx) % 6]
            b.obj(f"chair_{c}_s", tx + i, ty - 1)
            b.obj(f"chair_{c}_n", tx + i, ty + 2)
    b.obj("trash", 62, 18)
    b.obj("plant", 43, 18)

    # ------------------------------------------------------------ 체육관 (x 43..64, y 34..49)  북쪽/서쪽 출입구
    b.dec("banner_매홀중학교~체육관_8", 43, 31, dx=0, dy=10)
    b.dec("truss_8", 57, 31, dy=12)
    b.dec("window_3_field", 43, 32)
    b.dec("window_3_field", 47, 32)
    b.dec("window_2_field", 57, 32)
    b.dec("curtain_6", 59, 32)
    b.obj("stage_6x3", 59, 34)
    b.obj("hoop", 50, 35)
    b.obj("speaker", 58, 34)
    b.obj("speaker", 58, 37)
    b.obj("flagstand", 63, 37)
    b.obj("bench_3", 44, 36)
    b.obj("bench_3", 44, 39)
    b.obj("ballcart", 44, 46)
    b.obj("ballcart", 44, 48)
    b.obj("mat_red", 60, 46)
    b.obj("mat_blue", 62, 46)
    b.obj("mat_blue", 60, 48)
    b.obj("trophy_2", 46, 34)
    b.obj("ball", 53, 39)
    b.obj("ball", 48, 45)
    b.obj("plant", 63, 49)

    # ------------------------------------------------------------ 도서관 (x 7..26, y 34..49)  동쪽/남쪽 출입구
    b.dec("window_3_blind", 8, 32)
    b.dec("window_3_blind", 11, 32)
    b.dec("poster_libguide", 14, 32, dx=0, dy=22)
    for sx in (17, 19, 21, 23, 25):
        b.obj("wshelf_2", sx, 34)
    b.obj("barcounter_6", 8, 34)
    for sx in (8, 10, 12):
        b.obj("stool", sx, 35)
    b.obj("nook", 14, 36)
    b.obj("bookcart", 20, 36)
    b.obj("libcounter_4", 21, 37)
    b.obj("otable_6x2", 9, 39)
    wc = ["wht", "blk"]
    for i in range(6):
        b.obj(f"chair_{wc[i % 2]}_s", 9 + i, 38)
        b.obj(f"chair_{wc[(i + 1) % 2]}_n", 9 + i, 41)
    for sx in (17, 20, 23):
        b.obj("wshelf_3", sx, 47)
    b.obj("benchc_3", 8, 46)
    b.obj("bookcart", 15, 46)
    for (tx, w, cc) in ((15, 4, ("wht", "blk")), (21, 4, ("blk", "wht"))):
        b.obj(f"otable_{w}x2", tx, 42)
        for i in range(w):
            b.obj(f"chair_{cc[i % 2]}_s", tx + i, 41)
            b.obj(f"chair_{cc[(i + 1) % 2]}_n", tx + i, 44)
    b.obj("plant", 7, 49)
    b.obj("plant", 26, 38)

    # ------------------------------------------------------------ 교실 (x 7..26, y 65..80)  북쪽 출입구
    b.dec("flagwall", 14, 63, dx=4, dy=24)
    b.dec("blackboard_6_퀴즈~시간!_steel", 16, 63, dy=-20)
    b.dec("tv", 22, 63, dx=4, dy=12)
    b.dec("window_3_blind", 24, 63)
    b.dec("fan", 13, 63, dx=36, dy=18)
    b.obj("cubby_x", 14, 65)
    b.obj("lockerbank_6", 16, 65)
    b.obj("tabcart", 22, 65)
    b.obj("ac", 24, 65)
    b.obj("bin", 26, 65)
    b.obj("tdesk", 18, 67)
    cols = [15, 16, 18, 19, 21, 22, 24, 25]
    for ry in (68, 70, 77, 79):
        for x in cols:
            b.obj("desk_book" if (x + ry) % 3 == 0 else ("desk_pencil" if (x + ry) % 5 == 0 else "desk"), x, ry)
            b.obj("chair_grn_n", x, ry + 1)
    b.obj("backpack_gr", 17, 70)
    b.obj("backpack_bl", 20, 71)
    b.obj("backpack_pk", 23, 69)
    b.obj("backpack_gy", 26, 78)
    b.obj("trash", 7, 80)


NPCS = [
    # id, 이름, 스프라이트, 칸 x, y, 방향, 구역, 역할
    ("haneul", "하늘", "haneul", 15, 11, "down", "playground", "guide"),
    ("doyun", "도윤", "doyun", 51, 11, "down", "cafeteria", "guide"),
    ("seoyeon", "서연", "seoyeon", 52, 42, "down", "gym", "guide"),
    ("jiu", "지우", "jiu", 23, 39, "down", "library", "guide"),
    ("banjang", "반장", "banjang", 17, 74, "down", "classroom", "quiz"),
    ("walker1", "민준", "extra_a", 35, 12, "left", "c1", "chat"),
    ("walker2", "채원", "extra_b", 53, 26, "down", "c2", "chat"),
    ("walker3", "서진", "extra_c", 35, 43, "right", "c3", "chat"),
    ("walker4", "다은", "extra_d", 10, 57, "down", "c4", "chat"),
]


def build():
    b = Builder()
    furnish(b)
    bg, lines = render_bg(b)

    from objects import get_sprite
    names = set(n for (n, _, _) in b.objects) | set(n for (n, _, _) in b.decor)
    names |= {"gate_v_closed", "gate_v_open", "gate_h_closed", "gate_h_open"}
    for n in sorted(names):
        b.sprite_info[n] = get_sprite(n)

    blocked = [[not b.floor[y][x] for x in range(MAP_W)] for y in range(MAP_H)]
    for (n, tx, ty) in b.objects:
        sp = b.sprite_info[n]
        if sp["solid"]:
            for yy in range(ty, ty + sp["d"]):
                for xx in range(tx, tx + sp["w"]):
                    if 0 <= yy < MAP_H and 0 <= xx < MAP_W:
                        blocked[yy][xx] = True

    gates = [dict(id=gid, o=ori, x=gx, y=gy, size=size, requires=req, label=label) for (gid, ori, gx, gy, size, req, label) in GATES]

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
    # NPC 칸도 막힌 칸이에요(플레이어는 못 들어가요). 그 칸을 뺀 상태에서 도달 가능한지 봐요.
    for (nid, nm, sp, tx, ty, dr, area, role) in NPCS:
        if blocked[ty][tx]:
            print("!! NPC가 막힌 칸 위에 있어요:", nid, tx, ty)
    npc_cells = {(n[3], n[4]) for n in NPCS}
    for (x, y) in npc_cells:
        blocked[y][x] = True
    r = reach((3, 11))
    for (nid, nm, sp, tx, ty, dr, area, role) in NPCS:
        if not any((tx + dx, ty + dy) in r for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            print("!! NPC 도달 불가:", nid, tx, ty)
    stuck = [(xx, yy) for yy in range(MAP_H) for xx in range(MAP_W) if b.floor[yy][xx] and not blocked[yy][xx] and (xx, yy) not in r]
    if stuck:
        print("!! 갇힌 칸 수:", len(stuck), stuck[:6])
    print("교실 도달:", (17, 76) in r)
    for (xx, yy) in npc_cells:
        blocked[yy][xx] = False

    zones = [dict(id=aid, name=name, x=x, y=y, w=w, h=h) for (aid, name, theme, x, y, w, h) in AREAS if name]
    data = dict(
        tile=32, w=MAP_W, h=MAP_H,
        collision=["".join("1" if blocked[y][x] else "0" for x in range(MAP_W)) for y in range(MAP_H)],
        objects=[dict(n=n, x=tx, y=ty) for (n, tx, ty) in b.objects],
        decor=[dict(n=n, x=px // ART, y=py // ART) for (n, px, py) in b.decor],
        npcs=[dict(id=i, name=nm, spr=sp, x=tx, y=ty, dir=dr, area=area, role=role) for (i, nm, sp, tx, ty, dr, area, role) in NPCS],
        gates=gates, zones=zones, spawn=dict(x=3, y=11),
        order=["playground", "cafeteria", "gym", "library"],
    )
    return dict(bg=bg, lines=lines, data=data, sprites=b.sprite_info, builder=b, blocked=blocked)
