"""ZEP식 탑다운(위에서 비스듬히 내려다보는) 오브젝트 스프라이트 생성기.

get_sprite(name) -> dict(img=Image, w=가로 칸 수, d=세로 칸 수(바닥 차지), pad=그림자 여백, solid=bool)
  * 바닥에 놓이는 물건: 스프라이트 아래쪽(pad 제외)이 바닥 차지 영역의 아랫변이에요.
  * 벽 장식(window_, blackboard_ 등): 칸 단위가 아닌 픽셀 크기로 그려서 벽 위에 붙여요.
"""
from PIL import Image, ImageDraw
from pxlib import (TILE, hexc, shade, lighten, darken, mix, text_image, hash2,
                   FONT11, FONT11B, FONT9)

T = TILE
PAD = 3

WOOD = hexc("#c98d4e")
WOOD_L = hexc("#e3ad6a")
WOOD_D = hexc("#8a5530")
STEEL = hexc("#c9cfdc")
STEEL_D = hexc("#8b93a8")
DESK_TOP = hexc("#f6f5fc")
LEG = hexc("#7d7a93")
CHAIR = {"red": hexc("#c4604f"), "yel": hexc("#e0b848"), "grn": hexc("#7fae58"),
         "blu": hexc("#5f90c0"), "pur": hexc("#9272c0"), "gry": hexc("#9a9aa6"), "org": hexc("#e8902f")}
BOOK_COLS = [hexc(c) for c in ("#b0453d", "#d9a04a", "#5f9a58", "#4f78b0", "#8a5bb0", "#ece0b0",
                               "#7a4a2c", "#3f8c8a", "#cc6a6a", "#a6b85a")]


class S:
    """작은 그림 캔버스."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def r(self, x0, y0, x1, y1, c):
        self.d.rectangle([x0, y0, x1, y1], fill=c)

    def ro(self, x0, y0, x1, y1, c, ol):
        self.d.rectangle([x0, y0, x1, y1], fill=c, outline=ol)

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((x, y), c)

    def line(self, a, b, c):
        self.d.line([a, b], fill=c)

    def ell(self, x0, y0, x1, y1, c, ol=None):
        self.d.ellipse([x0, y0, x1, y1], fill=c, outline=ol)

    def blk(self, x0, y0, x1, y1, top_h, col, ol=None, top=None, front=None):
        """윗면(top_h 높이)과 앞면이 보이는 직육면체."""
        ol = ol or shade(col, 0.45)
        top = top or lighten(col, 0.22)
        front = front or col
        self.d.rectangle([x0, y0, x1, y1], fill=front, outline=ol)
        self.d.rectangle([x0 + 1, y0 + 1, x1 - 1, y0 + top_h - 1], fill=top)
        self.d.line([(x0 + 1, y0 + top_h), (x1 - 1, y0 + top_h)], fill=shade(col, 0.66))
        self.d.line([(x0 + 1, y0 + 1), (x1 - 1, y0 + 1)], fill=lighten(top, 0.4))
        self.d.line([(x1 - 1, y0 + top_h + 1), (x1 - 1, y1 - 1)], fill=shade(front, 0.82))

    def shadow(self, x0, x1, a=52):
        sh = Image.new("RGBA", self.im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(sh)
        d.rectangle([x0 + 2, self.h - PAD - 1, x1 - 2, self.h - 1], fill=(30, 20, 40, a))
        base = self.im
        base.alpha_composite(sh)
        self.im = base
        self.d = ImageDraw.Draw(self.im)

    def paste(self, im, x, y):
        self.im.alpha_composite(im, (x, y))


def _ret(s, w, d, solid=True):
    return dict(img=s.im, w=w, d=d, pad=PAD, solid=solid)


def _books(s, x0, y0, x1, y1, seed, rows=3):
    s.r(x0, y0, x1, y1, hexc("#5a3a26"))
    rh = (y1 - y0 + 1) // rows
    for r in range(rows):
        top = y0 + r * rh
        yb = top + rh - 1
        x = x0 + 1
        k = 0
        while x < x1 - 2:
            bw = 2 + int(hash2(seed, r * 31 + k, 1) * 3)
            bh = rh - 4 - int(hash2(seed, r * 31 + k, 2) * 4)
            col = BOOK_COLS[int(hash2(seed, r * 31 + k, 3) * len(BOOK_COLS))]
            if hash2(seed, r * 31 + k, 4) > 0.92:
                x += 3
                k += 1
                continue
            s.r(x, yb - bh, min(x1 - 1, x + bw - 1), yb - 1, col)
            s.line((x, yb - bh), (x, yb - 1), lighten(col, 0.3))
            x += bw
            k += 1
        s.line((x0, yb), (x1, yb), WOOD_D)
    s.line((x0, y0), (x1, y0), shade(WOOD_D, 0.6))


# ====================================================================== 가구
def desk(variant=""):
    s = S(T, 30 + PAD)
    s.r(5, 22, 6, 29, LEG)
    s.r(25, 22, 26, 29, LEG)
    s.blk(3, 2, 28, 22, 14, DESK_TOP, ol=hexc("#8a88a2"), top=hexc("#fbfaff"), front=hexc("#d6d5e8"))
    if variant == "book":
        s.ro(9, 6, 22, 12, hexc("#fff8d8"), hexc("#b0a070"))
        s.line((15, 6), (15, 12), hexc("#b0a070"))
        s.line((11, 8), (14, 8), hexc("#a09070"))
        s.line((17, 8), (20, 8), hexc("#a09070"))
    elif variant == "pencil":
        s.r(21, 6, 25, 9, hexc("#e0604f"))
        s.r(8, 7, 10, 7, hexc("#f0c040"))
    s.shadow(3, 28)
    return _ret(s, 1, 1)


def chair(col, facing):
    c = CHAIR[col]
    s = S(T, 32 + PAD)
    ol = shade(c, 0.45)
    if facing == "n":  # 북쪽을 보고 앉음 -> 등받이가 화면 쪽(아래)
        s.r(10, 26, 11, 31, LEG)
        s.r(20, 26, 21, 31, LEG)
        s.ro(8, 10, 23, 20, lighten(c, 0.18), ol)
        s.ro(8, 19, 23, 28, c, ol)
        s.line((9, 22), (22, 22), shade(c, 0.78))
        s.line((9, 25), (22, 25), shade(c, 0.78))
    else:  # 남쪽(화면)을 보고 앉음 -> 등받이가 위
        s.r(10, 24, 11, 31, LEG)
        s.r(20, 24, 21, 31, LEG)
        s.ro(8, 2, 23, 11, shade(c, 0.9), ol)
        s.line((9, 5), (22, 5), shade(c, 0.72))
        s.line((9, 8), (22, 8), shade(c, 0.72))
        s.ro(8, 11, 23, 21, lighten(c, 0.2), ol)
        s.ro(8, 21, 23, 24, c, ol)
    s.shadow(8, 23, 40)
    return _ret(s, 1, 1)


def table(w, d, style, tray=False):
    W, H = w * T, d * T
    s = S(W, H + PAD)
    if style == "white":
        top, front, ol = hexc("#f9f9ff"), hexc("#d0cfe4"), hexc("#8a88a2")
    elif style == "brown":
        top, front, ol = hexc("#b06c3c"), hexc("#8a5030"), hexc("#4a2a16")
    else:
        top, front, ol = WOOD_L, WOOD, WOOD_D
    s.blk(1, 3, W - 2, H - 3, H - 14, front, ol=ol, top=top, front=front)
    if style in ("white", "brown"):
        for k in range(0, W - 30, 64):
            s.line((8 + k, 7), (22 + k, 7), lighten(top, 0.55 if style == "white" else 0.3))
    if tray:
        for k in range(8, W - 24, 36):
            s.ro(k, 8, k + 23, 8 + (H - 30 if H > 40 else 11), hexc("#f2e6b8"), hexc("#a08a50"))
            s.r(k + 3, 11, k + 9, 15, hexc("#d9604f"))
            s.r(k + 11, 11, k + 16, 15, hexc("#e8c040"))
            s.r(k + 3, 17, k + 8, 19, hexc("#7aa25a"))
            s.r(k + 14, 17, k + 20, 19, hexc("#f8f4e8"))
    s.shadow(1, W - 2)
    return _ret(s, w, d)


def shelf(w, tall=True):
    W = w * T
    H = 62 if tall else 44
    s = S(W, H + PAD)
    s.blk(0, 0, W - 1, H - 1, 8, WOOD, ol=WOOD_D, top=WOOD_L)
    _books(s, 3, 11, W - 4, H - 4, w * 7 + H, rows=3 if tall else 2)
    s.shadow(0, W - 1)
    return _ret(s, w, 1)


def cabinet(w, glass=True, col=None):
    W = w * T
    H = 46
    c = col or hexc("#b8854c")
    s = S(W, H + PAD)
    s.blk(0, 0, W - 1, H - 1, 8, c, ol=shade(c, 0.45))
    n = max(2, w * 2)
    seg = (W - 6) / n
    for i in range(n):
        x0 = 3 + int(i * seg)
        x1 = 3 + int((i + 1) * seg) - 2
        s.ro(x0, 11, x1, H - 4, shade(c, 0.86), shade(c, 0.55))
        if glass:
            s.ro(x0 + 3, 14, x1 - 3, H - 14, hexc("#bcdce8"), shade(c, 0.5))
            s.line((x0 + 4, 16), (x0 + 6, 18), hexc("#eaf6fa"))
        s.r(x1 - 3 if i % 2 == 0 else x0 + 2, H - 14, x1 - 3 if i % 2 == 0 else x0 + 2, H - 9, hexc("#f0e0a0"))
    s.shadow(0, W - 1)
    return _ret(s, w, 1)


def locker(w):
    W = w * T
    H = 60
    c = hexc("#7d92b8")
    s = S(W, H + PAD)
    s.blk(0, 0, W - 1, H - 1, 6, c, ol=shade(c, 0.45))
    n = w * 2
    seg = (W - 4) / n
    for i in range(n):
        x0 = 2 + int(i * seg)
        x1 = 2 + int((i + 1) * seg) - 2
        s.ro(x0, 9, x1, H - 4, shade(c, 0.92), shade(c, 0.55))
        for k in range(3):
            s.line((x0 + 3, 13 + k * 2), (x1 - 3, 13 + k * 2), shade(c, 0.6))
        s.r(x1 - 3, 32, x1 - 2, 36, hexc("#f0e8b0"))
    s.shadow(0, W - 1)
    return _ret(s, w, 1)


def tdesk():
    W = 2 * T
    s = S(W, 40 + PAD)
    s.blk(1, 2, W - 2, 39, 16, WOOD, ol=WOOD_D, top=WOOD_L)
    for i in range(2):
        s.ro(5 + i * 29, 22, 29 + i * 29, 36, shade(WOOD, 0.88), shade(WOOD, 0.55))
        s.r(15 + i * 29, 26, 19 + i * 29, 27, hexc("#f0e0a0"))
    s.ro(10, 6, 24, 13, hexc("#fffbe8"), hexc("#a59a78"))
    s.line((12, 9), (22, 9), hexc("#a59a78"))
    s.r(42, 6, 47, 12, hexc("#e0604f"))
    s.r(50, 5, 55, 12, hexc("#5f90c0"))
    s.shadow(1, W - 2)
    return _ret(s, 2, 1)


def steel_counter(w):
    W = w * T
    s = S(W, 46 + PAD)
    s.blk(0, 8, W - 1, 45, 14, STEEL, ol=hexc("#5c6274"), top=hexc("#e6eaf4"), front=hexc("#b1b9cc"))
    n = w * 2
    seg = (W - 4) / n
    for i in range(n):
        x0 = 2 + int(i * seg)
        s.ro(x0 + 1, 26, x0 + int(seg) - 2, 42, hexc("#bcc3d4"), hexc("#7d8396"))
        s.r(x0 + int(seg) // 2 - 2, 31, x0 + int(seg) // 2 + 1, 32, hexc("#6e7488"))
    foods = [hexc("#e8a64a"), hexc("#8a4a2c"), hexc("#f2e4a2"), hexc("#7aaa5a"), hexc("#dc6450"), hexc("#f0c040")]
    k = 0
    x = 4
    while x + 26 < W:
        s.ro(x, 3, x + 25, 17, hexc("#d4dae8"), hexc("#5c6274"))
        s.ell(x + 3, 5, x + 22, 13, foods[k % len(foods)], shade(foods[k % len(foods)], 0.6))
        s.line((x + 6, 7), (x + 10, 7), lighten(foods[k % len(foods)], 0.4))
        k += 1
        x += 32
    s.shadow(0, W - 1)
    return _ret(s, w, 1)


def tray_counter(w):
    W = w * T
    c = hexc("#7a4e38")
    s = S(W, 38 + PAD)
    s.blk(0, 4, W - 1, 37, 14, c, ol=shade(c, 0.4), top=hexc("#c3c9d8"), front=c)
    for i in range(w * 2):
        s.ro(3 + i * 15, 21, 15 + i * 15, 34, shade(c, 0.85), shade(c, 0.5))
        s.r(8 + i * 15, 25, 10 + i * 15, 26, hexc("#e8d9a0"))
    for i in range(w):
        for z in range(3):
            s.ro(6 + i * 32, 4 - z * 2 + 2, 26 + i * 32, 12 - z * 2 + 2, hexc("#dfe3ee"), hexc("#7d8396"))
    s.shadow(0, W - 1)
    return _ret(s, w, 1)


def lib_counter(w):
    W = w * T
    s = S(W, 44 + PAD)
    s.blk(0, 10, W - 1, 43, 14, hexc("#d9dce8"), ol=hexc("#7d8396"), top=hexc("#f4f5fb"), front=hexc("#c0c5d6"))
    for i in range(w):
        s.ro(4 + i * 32, 28, 28 + i * 32, 40, hexc("#cdd2e0"), hexc("#7d8396"))
    # 모니터
    s.ro(6, 0, 24, 11, hexc("#34384a"), hexc("#14161e"))
    s.r(8, 2, 22, 9, hexc("#6ab0e0"))
    s.line((9, 4), (20, 4), hexc("#e8f4fc"))
    s.line((9, 6), (17, 6), hexc("#e8f4fc"))
    # 명패
    if w >= 3:
        s.ro(W - 30, 12, W - 10, 18, hexc("#fffbe8"), hexc("#a08a50"))
        s.line((W - 27, 15), (W - 13, 15), hexc("#a08a50"))
    s.shadow(0, W - 1)
    return _ret(s, w, 1)


def sink():
    W = 2 * T
    s = S(W, 46 + PAD)
    s.blk(0, 6, W - 1, 45, 16, STEEL, ol=hexc("#5c6274"), top=hexc("#e6eaf4"), front=hexc("#b1b9cc"))
    s.ro(5, 10, 28, 19, hexc("#9aa4bc"), hexc("#5c6274"))
    s.ro(35, 10, 58, 19, hexc("#9aa4bc"), hexc("#5c6274"))
    s.r(30, 4, 33, 9, hexc("#6e7488"))
    s.r(28, 2, 35, 4, hexc("#6e7488"))
    s.ro(5, 26, 58, 42, hexc("#bcc3d4"), hexc("#7d8396"))
    s.shadow(0, W - 1)
    return _ret(s, 2, 1)


def fridge():
    s = S(T, 60 + PAD)
    s.blk(2, 0, 29, 59, 6, hexc("#d6dbe8"), ol=hexc("#6e7488"), top=hexc("#eef0f8"))
    s.line((3, 24), (28, 24), hexc("#8b93a8"))
    s.r(24, 14, 25, 20, hexc("#6e7488"))
    s.r(24, 30, 25, 40, hexc("#6e7488"))
    s.shadow(2, 29)
    return _ret(s, 1, 1)


def dispenser():
    s = S(T, 50 + PAD)
    s.blk(5, 18, 26, 49, 6, hexc("#d8dbe6"), ol=hexc("#6e7488"), top=hexc("#f0f2f8"))
    s.ro(9, 28, 22, 36, hexc("#4a7ab0"), hexc("#2e4a66"))
    s.r(11, 30, 14, 33, hexc("#9ad0f0"))
    s.r(17, 30, 20, 33, hexc("#e07a6a"))
    s.r(13, 38, 18, 40, hexc("#7d8396"))
    s.ro(9, 3, 22, 18, hexc("#8cc8f0"), hexc("#3d6d8c"))
    s.r(11, 5, 13, 12, hexc("#d4f0fc"))
    s.shadow(5, 26)
    return _ret(s, 1, 1)


def plant():
    s = S(T, 46 + PAD)
    s.blk(9, 30, 22, 45, 5, hexc("#c0703c"), ol=hexc("#5c3018"), top=hexc("#8a4a2c"))
    g1, g2 = hexc("#4f9a4a"), hexc("#7cc05c")
    for (x, y, r) in ((16, 22, 8), (9, 24, 6), (23, 24, 6), (16, 12, 7), (11, 17, 5), (21, 17, 5)):
        s.ell(x - r, y - r, x + r, y + r, g1, shade(g1, 0.55))
    for (x, y) in ((12, 10), (19, 14), (9, 20), (22, 22)):
        s.r(x, y, x + 2, y + 1, g2)
    s.shadow(8, 23)
    return _ret(s, 1, 1)


def trash():
    s = S(T, 28 + PAD)
    s.blk(9, 8, 22, 27, 6, hexc("#8f98ad"), ol=hexc("#454c60"), top=hexc("#b6bdd0"))
    s.r(8, 6, 23, 9, hexc("#a9b1c5"))
    s.line((8, 6), (23, 6), hexc("#cdd3e2"))
    s.shadow(8, 23)
    return _ret(s, 1, 1)


def bench(w):
    W = w * T
    s = S(W, 26 + PAD)
    c = hexc("#b87a44")
    s.r(4, 14, 6, 25, hexc("#6a6f84"))
    s.r(W - 7, 14, W - 5, 25, hexc("#6a6f84"))
    s.blk(1, 3, W - 2, 18, 10, c, ol=shade(c, 0.4), top=lighten(c, 0.2))
    s.shadow(1, W - 2)
    return _ret(s, w, 1)


def backpack(col):
    c = {"gr": hexc("#6b9a56"), "bl": hexc("#4a74aa"), "pk": hexc("#d06a82"), "gy": hexc("#7a7a8c")}[col]
    s = S(T, 24 + PAD)
    s.blk(9, 3, 22, 22, 8, c, ol=shade(c, 0.4))
    s.ro(11, 14, 20, 20, shade(c, 0.85), shade(c, 0.4))
    s.shadow(9, 22, 40)
    return _ret(s, 1, 1, solid=False) | dict(solid=False)


def speaker():
    s = S(T, 52 + PAD)
    s.blk(6, 0, 25, 51, 6, hexc("#3a3a46"), ol=hexc("#14141c"), top=hexc("#5a5a6a"))
    s.ell(10, 10, 21, 21, hexc("#1c1c24"), hexc("#6a6a7c"))
    s.ell(8, 26, 23, 41, hexc("#1c1c24"), hexc("#6a6a7c"))
    s.ell(13, 31, 18, 36, hexc("#4a4a5c"))
    s.shadow(6, 25)
    return _ret(s, 1, 1)


def ball_cart():
    s = S(T, 44 + PAD)
    st = hexc("#9aa2b6")
    s.ro(3, 14, 28, 36, hexc("#2a2f40"), hexc("#5c6274"))
    for (x, y) in ((8, 22), (16, 20), (23, 22), (11, 30), (20, 30), (16, 26)):
        s.ell(x - 4, y - 4, x + 4, y + 4, hexc("#e0902f"), hexc("#7a3a10"))
        s.line((x - 4, y), (x + 4, y), hexc("#7a3a10"))
        s.line((x, y - 4), (x, y + 4), hexc("#7a3a10"))
    for x in (3, 8, 13, 18, 23, 28):
        s.line((x, 14), (x, 36), st)
    s.line((3, 14), (28, 14), hexc("#d0d6e4"))
    s.line((3, 36), (28, 36), st)
    s.r(4, 37, 6, 41, hexc("#4a4f60"))
    s.r(25, 37, 27, 41, hexc("#4a4f60"))
    s.shadow(3, 28)
    return _ret(s, 1, 1)


def mat(col):
    c = {"red": hexc("#c4504a"), "blue": hexc("#4a6ec0")}[col]
    s = S(2 * T, T)
    s.ro(1, 4, 62, 27, c, shade(c, 0.45))
    s.line((3, 6), (60, 6), lighten(c, 0.4))
    s.r(2, 22, 61, 26, hexc("#e0c060"))
    for x in range(8, 60, 14):
        s.line((x, 10), (x, 20), shade(c, 0.8))
    return _ret(s, 2, 1, solid=False) | dict(solid=False)


def hoop():
    s = S(2 * T, 110 + PAD)
    blue = hexc("#4a68a8")
    st = hexc("#9aa2b6")
    s.ro(18, 96, 45, 108, blue, shade(blue, 0.45))
    s.r(30, 50, 33, 96, st)
    s.line((30, 50), (30, 96), lighten(st, 0.3))
    s.ro(14, 2, 49, 34, hexc("#f4f6fc"), hexc("#6a728a"))
    s.ro(24, 14, 39, 28, hexc("#f4f6fc"), hexc("#d0584a"))
    s.line((14, 33), (49, 33), hexc("#bcc2d4"))
    s.ell(23, 34, 40, 41, None, hexc("#e8702a"))
    s.d.ellipse([23, 34, 40, 41], outline=hexc("#e8702a"), width=2)
    for x in range(24, 40, 3):
        s.line((x, 40), (x + (31 - x) // 3 + 1, 52), hexc("#f2f2f2"))
    s.line((26, 46), (37, 46), hexc("#f2f2f2"))
    s.shadow(18, 45)
    return _ret(s, 2, 1)


def stage(w, d):
    W, H = w * T, d * T
    s = S(W, H + PAD)
    s.blk(0, 0, W - 1, H - 1, H - 16, hexc("#b88040"), ol=hexc("#5c3a1c"), top=hexc("#e8b36e"),
          front=hexc("#b88040"))
    for k in range(6, H - 16, 7):
        s.line((2, k), (W - 3, k), hexc("#d89c58"))
    for i in range(w):
        s.ro(i * T + 3, H - 13, i * T + 28, H - 3, hexc("#c48c4a"), hexc("#8a5e30"))
    s.shadow(0, W - 1)
    return _ret(s, w, d)


def flag_stand():
    s = S(T, 66 + PAD)
    s.ro(8, 58, 23, 65, hexc("#6e7488"), hexc("#3a3f50"))
    s.r(15, 12, 16, 58, hexc("#d8c070"))
    s.ro(7, 14, 24, 34, hexc("#2f7a52"), hexc("#143424"))
    s.ell(12, 19, 19, 27, hexc("#e8d27a"))
    s.r(14, 4, 17, 10, hexc("#e8c24a"))
    s.shadow(8, 23)
    return _ret(s, 1, 1)


def book_cart():
    s = S(T, 40 + PAD)
    st = hexc("#9aa2b6")
    s.ro(3, 4, 28, 36, hexc("#2a2f40"), hexc("#5c6274"))
    for r, y in enumerate((6, 18)):
        for k in range(6):
            col = BOOK_COLS[(k + r * 3) % len(BOOK_COLS)]
            s.r(5 + k * 4, y, 8 + k * 4, y + 9, col)
        s.line((3, y + 10), (28, y + 10), st)
    s.line((3, 33), (28, 33), st)
    s.r(5, 37, 7, 39, hexc("#4a4f60"))
    s.r(24, 37, 26, 39, hexc("#4a4f60"))
    s.shadow(3, 28)
    return _ret(s, 1, 1)


def tree():
    s = S(2 * T, 100 + PAD)
    s.r(28, 64, 35, 98, hexc("#7a4a2c"))
    s.r(28, 64, 30, 98, hexc("#946038"))
    s.r(34, 64, 35, 98, hexc("#5a3420"))
    g = [hexc("#3d8044"), hexc("#53984f"), hexc("#72b85c")]
    for (x, y, r, c) in ((18, 50, 16, 0), (46, 50, 16, 0), (32, 38, 20, 1), (22, 28, 15, 1), (42, 28, 15, 1),
                         (32, 18, 15, 2), (24, 40, 8, 2), (42, 40, 8, 2)):
        s.ell(x - r, y - r, x + r, y + r, g[c], shade(g[c], 0.55))
    for (x, y) in ((22, 22), (38, 12), (46, 26), (28, 44), (14, 44), (40, 46)):
        s.r(x, y, x + 2, y + 1, hexc("#aee08a"))
    s.shadow(24, 40)
    return _ret(s, 2, 1)


def bush(w):
    W = w * T
    s = S(W, 30 + PAD)
    g = [hexc("#3d8044"), hexc("#53984f")]
    for i in range(w * 2):
        x = 8 + i * 16
        s.ell(x - 9, 6, x + 9, 28, g[i % 2], shade(g[0], 0.55))
    for i in range(w * 2):
        x = 8 + i * 16
        s.r(x - 3, 11, x - 1, 12, hexc("#9cd87c"))
        s.r(x + 3, 16, x + 4, 17, hexc("#9cd87c"))
    s.shadow(0, W - 1)
    return _ret(s, w, 1)


def goal(w):
    W = w * T
    s = S(W, 60 + PAD)
    wc = hexc("#f6f6fa")
    net = hexc("#c4cade")
    for x in range(4, W - 4, 5):
        s.line((x, 8), (x, 54), net)
    for y in range(8, 54, 5):
        s.line((3, y), (W - 4, y), net)
    s.r(2, 4, 4, 58, wc)
    s.r(W - 5, 4, W - 3, 58, wc)
    s.r(2, 4, W - 3, 6, wc)
    s.shadow(2, W - 3)
    return _ret(s, w, 1)


def flagpole():
    s = S(T, 130 + PAD)
    s.ro(8, 120, 23, 129, hexc("#8a90a2"), hexc("#3a3f50"))
    s.r(15, 6, 17, 120, hexc("#d8dbe6"))
    s.r(17, 6, 17, 120, hexc("#8a90a2"))
    s.ell(14, 2, 18, 6, hexc("#e8c24a"))
    fl = Image.new("RGBA", (30, 20), (0, 0, 0, 0))
    paint_taegukgi(ImageDraw.Draw(fl), 30, 20)
    s.paste(fl, 1, 8)
    s.shadow(8, 23)
    return _ret(s, 1, 1)


def sign_stone():
    W = 3 * T
    s = S(W, 38 + PAD)
    s.blk(2, 2, W - 3, 37, 8, hexc("#a9a496"), ol=hexc("#5a564a"), top=hexc("#d0cbbb"))
    t = text_image("매홀중학교", hexc("#fff6d0"), FONT11B, 11, outline=hexc("#3a3830"))
    s.paste(t, (W - t.width) // 2, 14)
    s.shadow(2, W - 3)
    return _ret(s, 3, 1)


def ball():
    s = S(T, 14 + PAD)
    s.ell(12, 2, 19, 9, hexc("#f6f6f6"), hexc("#3a3a46"))
    s.r(14, 4, 17, 7, hexc("#3a3a46"))
    s.shadow(10, 21, 36)
    return _ret(s, 1, 1, solid=False) | dict(solid=False)


def cone():
    s = S(T, 24 + PAD)
    s.r(9, 20, 22, 23, hexc("#e0e0e8"))
    s.d.polygon([(12, 20), (19, 20), (17, 4), (14, 4)], fill=hexc("#e8803a"), outline=hexc("#7a3a10"))
    s.r(13, 11, 18, 13, hexc("#f6f6f6"))
    s.shadow(9, 22, 36)
    return _ret(s, 1, 1)


def trophy(w):
    W = w * T
    s = S(W, 52 + PAD)
    col = hexc("#8a5a38")
    s.blk(0, 0, W - 1, 51, 6, col, ol=shade(col, 0.45))
    s.ro(3, 9, W - 4, 47, hexc("#cfe8f0"), hexc("#4a3426"))
    for z in (24, 38):
        s.line((3, z), (W - 4, z), hexc("#4a3426"))
    for i in range(w * 2):
        x = 8 + i * 15
        for z, c in ((23, "#e8c24a"), (37, "#dcdce8"), (46, "#e8c24a")):
            s.r(x, z - 7, x + 5, z - 2, hexc(c))
            s.r(x + 1, z - 9, x + 4, z - 7, hexc(c))
    s.shadow(0, W - 1)
    return _ret(s, w, 1)


def poster_stand():
    s = S(T, 60 + PAD)
    s.r(6, 40, 8, 59, hexc("#6e7488"))
    s.r(23, 40, 25, 59, hexc("#6e7488"))
    s.ro(2, 2, 29, 42, hexc("#c8a070"), hexc("#5a3a20"))
    s.ro(5, 6, 14, 20, hexc("#f4f0e0"), hexc("#a09070"))
    s.ro(17, 7, 26, 16, hexc("#f0e08a"), hexc("#a09040"))
    s.ro(8, 24, 24, 36, hexc("#d8e8f0"), hexc("#7090a0"))
    s.shadow(6, 25)
    return _ret(s, 1, 1)


def extinguisher():
    s = S(T, 30 + PAD)
    s.ro(11, 8, 20, 28, hexc("#d03a3a"), hexc("#7a1a1a"))
    s.r(13, 3, 18, 8, hexc("#2a2a30"))
    s.r(17, 1, 22, 3, hexc("#2a2a30"))
    s.r(12, 15, 19, 19, hexc("#f4f0e0"))
    s.shadow(10, 21, 40)
    return _ret(s, 1, 1)


# ====================================================================== 벽 장식
def paint_taegukgi(d, w, h):
    d.rectangle([0, 0, w - 1, h - 1], fill=hexc("#f8f6f2"), outline=hexc("#8a8a90"))
    cx, cy = w // 2, h // 2
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=hexc("#3a5fb0"))
    d.pieslice([cx - 4, cy - 4, cx + 4, cy + 4], 180, 360, fill=hexc("#d0383a"))
    for (ax, ay) in ((3, 3), (w - 8, 3), (3, h - 8), (w - 8, h - 8)):
        for k in range(3):
            d.line([(ax, ay + k * 2), (ax + 4, ay + k * 2)], fill=hexc("#22202a"))


def window(n, scene="field"):
    W, H = n * T, 2 * T
    s = S(W, H)
    fr = hexc("#8d89a3")
    s.r(0, 0, W - 1, H - 1, shade(fr, 0.5))
    s.r(1, 1, W - 2, H - 2, fr)
    pw = (W - 6) // n
    for i in range(n):
        x0 = 3 + i * pw
        x1 = x0 + pw - 2
        y0, y1 = 4, H - 6
        # 풍경
        for y in range(y0, y1 + 1):
            t = (y - y0) / (y1 - y0)
            if scene == "field":
                if t < 0.45:
                    c = mix(hexc("#cfe9f6"), hexc("#f2f9fc"), t / 0.45)
                elif t < 0.62:
                    c = hexc("#6fae5a")
                else:
                    c = mix(hexc("#e8cc94"), hexc("#d8b878"), (t - 0.62) / 0.38)
            else:
                c = mix(hexc("#cfe9f6"), hexc("#f2f9fc"), t)
            s.r(x0, y, x1, y, c)
        if scene == "field":
            for k in range(3):
                cx = x0 + 4 + k * (pw // 3)
                s.ell(cx - 5, y0 + 14, cx + 6, y0 + 28, hexc("#4f9a4a"), hexc("#3a7a3a"))
            s.line((x0 + 2, y1 - 6), (x1 - 2, y1 - 6), hexc("#f8f4e8"))
        s.line((x0 + pw // 2 - 1, y0), (x0 + pw // 2 - 1, y1), fr)
        s.line((x0, (y0 + y1) // 2), (x1, (y0 + y1) // 2), fr)
        s.line((x0 + 2, y0 + 2), (x0 + 5, y0 + 2), hexc("#ffffff"))
        s.ro(x0, y0, x1, y1, None, shade(fr, 0.55))
    s.line((1, 1), (W - 2, 1), lighten(fr, 0.5))
    s.r(0, H - 5, W - 1, H - 3, lighten(fr, 0.3))
    s.r(0, H - 2, W - 1, H - 1, shade(fr, 0.55))
    return dict(img=s.im, w=n, d=2, pad=0, solid=False, decor=True)


def blackboard(n, text=""):
    W, H = n * T, 56
    s = S(W, H)
    s.r(0, 0, W - 1, H - 1, hexc("#7a4a2c"))
    s.r(1, 1, W - 2, H - 2, hexc("#b57a44"))
    s.r(5, 5, W - 6, H - 14, hexc("#3b7058"))
    s.ro(5, 5, W - 6, H - 14, hexc("#3b7058"), hexc("#2a4a3a"))
    for i in range(4):
        s.line((12 + i * 29, 12 + (i % 2) * 4), (26 + i * 29, 13 + (i % 2) * 4), hexc("#5a8c74"))
    if text:
        t = text_image(text, hexc("#f4f4e8"), FONT11, 11)
        s.paste(t, (W - t.width) // 2, (H - 14) // 2 - 4)
    s.r(5, H - 12, W - 6, H - 9, hexc("#d8c090"))
    s.r(12, H - 14, 17, H - 12, hexc("#f4f4f4"))
    s.r(W - 24, H - 15, W - 14, H - 12, hexc("#8a6a4a"))
    return dict(img=s.im, w=n, d=2, pad=0, solid=False, decor=True)


def bulletin(n):
    W, H = n * T, 44
    s = S(W, H)
    s.r(0, 0, W - 1, H - 1, hexc("#7a4a2c"))
    s.r(2, 2, W - 3, H - 3, hexc("#3f7a5a"))
    paper = [hexc("#f8f4e4"), hexc("#f6e08a"), hexc("#d4e8f0"), hexc("#f4c8c0")]
    for i in range(n * 2):
        x = 5 + i * 15
        s.r(x, 6 + (i % 2) * 3, x + 9, 20 + (i % 2) * 3, paper[i % 4])
        s.line((x + 2, 9 + (i % 2) * 3), (x + 7, 9 + (i % 2) * 3), hexc("#9a8a6a"))
        s.line((x + 2, 12 + (i % 2) * 3), (x + 7, 12 + (i % 2) * 3), hexc("#9a8a6a"))
        s.r(x + 4, 5 + (i % 2) * 3, x + 5, 6 + (i % 2) * 3, hexc("#d04a4a"))
    s.r(8, 28, 7 + 14, 36, hexc("#f4e8b0"))
    return dict(img=s.im, w=n, d=1, pad=0, solid=False, decor=True)


POSTERS = {
    "gupsik": ("급식 질서", "#f0f6e0", "#4f8a4a"),
    "menu": ("오늘의 급식", "#fff4d8", "#c46a3a"),
    "water": ("음수대", "#d8ecfa", "#3a6aa8"),
    "libguide": ("도서관 이용 안내", "#f8f4dc", "#4f8a4a"),
    "recommend": ("이달의 추천 도서", "#fdf0e0", "#a8453d"),
    "sports": ("체육 대회", "#e8f0fc", "#3a5fb0"),
    "safety": ("안전 수칙", "#fff0d0", "#d9602a"),
    "quiet": ("조용히 읽어요", "#f4f0fa", "#6a4ab0"),
    "welcome": ("환영합니다", "#fff4e0", "#c46a3a"),
}


def poster(key):
    title, bg, fg = POSTERS[key]
    t = text_image(title, hexc(fg), FONT9, 9)
    W = max(36, t.width + 8)
    H = 50
    s = S(W, H)
    s.ro(0, 0, W - 1, H - 1, hexc(bg), shade(hexc(fg), 0.6))
    s.paste(t, (W - t.width) // 2, 4)
    for i in range(3):
        s.line((5, 18 + i * 4), (W - 6 - (i % 2) * 6, 18 + i * 4), shade(hexc(bg), 0.78))
    s.r(W // 2 - 6, 32, W // 2 + 5, 44, mix(hexc(bg), hexc(fg), 0.35))
    s.r(W // 2 - 4, 34, W // 2 + 3, 42, mix(hexc(bg), hexc(fg), 0.18))
    return dict(img=s.im, w=W / T, d=H / T, pad=0, solid=False, decor=True)


def flag_wall():
    s = S(40, 32)
    s.ro(0, 0, 39, 31, hexc("#b57a44"), hexc("#5a3a20"))
    fl = Image.new("RGBA", (34, 24), (0, 0, 0, 0))
    paint_taegukgi(ImageDraw.Draw(fl), 34, 24)
    s.paste(fl, 3, 4)
    return dict(img=s.im, w=40 / T, d=1, pad=0, solid=False, decor=True)


def clock():
    s = S(28, 28)
    s.ell(0, 0, 27, 27, hexc("#f8f6f0"), hexc("#3a3a46"))
    s.line((14, 14), (14, 5), hexc("#3a3a46"))
    s.line((14, 14), (20, 17), hexc("#3a3a46"))
    s.r(13, 13, 14, 14, hexc("#d04a4a"))
    return dict(img=s.im, w=28 / T, d=28 / T, pad=0, solid=False, decor=True)


def door_class(label):
    W, H = 2 * T, 2 * T
    s = S(W, H)
    wood = hexc("#b87a44")
    s.r(0, 0, W - 1, H - 1, shade(wood, 0.5))
    s.r(2, 2, W - 3, H - 1, wood)
    for i in range(2):
        x0 = 4 + i * 29
        s.ro(x0, 12, x0 + 26, H - 2, shade(wood, 1.05), shade(wood, 0.55))
        s.ro(x0 + 3, 15, x0 + 23, 31, hexc("#9cc0cf"), shade(wood, 0.5))
        s.line((x0 + 5, 17), (x0 + 9, 21), hexc("#e0f0f6"))
        s.ro(x0 + 3, 36, x0 + 23, H - 6, shade(wood, 0.95), shade(wood, 0.6))
    s.r(30, 44, 31, 52, hexc("#e8d9a0"))
    s.r(33, 44, 34, 52, hexc("#e8d9a0"))
    t = text_image(label, hexc("#ffffff"), FONT9, 9)
    s.ro(18, 1, 45, 11, hexc("#3f8a5a"), hexc("#1f5030"))
    s.paste(t, 32 - t.width // 2, 1)
    return dict(img=s.im, w=2, d=2, pad=0, solid=False, decor=True)


def banner(text, n):
    W, H = n * T, 28
    s = S(W, H)
    s.ro(0, 0, W - 1, H - 1, hexc("#3a5fb0"), hexc("#1f3a70"))
    s.r(1, 1, W - 2, 3, hexc("#e8c24a"))
    s.r(1, H - 4, W - 2, H - 2, hexc("#e8c24a"))
    s.r(1, 4, 5, H - 5, hexc("#3fae8a"))
    s.r(W - 6, 4, W - 2, H - 5, hexc("#3fae8a"))
    t = text_image(text, hexc("#ffffff"), FONT11B, 11, outline=hexc("#1f3a70"))
    s.paste(t, (W - t.width) // 2, (H - t.height) // 2)
    return dict(img=s.im, w=n, d=H / T, pad=0, solid=False, decor=True)


def curtain(n):
    W, H = n * T, 2 * T
    s = S(W, H)
    red = hexc("#a8403c")
    s.r(0, 0, W - 1, H - 1, hexc("#2a1a22"))
    cw = max(24, W // 4)
    for side in (0, 1):
        x0 = 0 if side == 0 else W - cw
        s.r(x0, 0, x0 + cw - 1, H - 1, red)
        for k in range(0, cw, 6):
            s.r(x0 + k, 0, x0 + k + 2, H - 1, shade(red, 0.78))
        s.line((x0, 0), (x0 + cw - 1, 0), lighten(red, 0.3))
    s.r(0, 0, W - 1, 5, hexc("#d8b040"))
    s.r(0, 5, W - 1, 6, hexc("#8a6a20"))
    # 무대 뒤 태극기 연출
    fl = Image.new("RGBA", (34, 24), (0, 0, 0, 0))
    paint_taegukgi(ImageDraw.Draw(fl), 34, 24)
    s.paste(fl, W // 2 - 17, 18)
    return dict(img=s.im, w=n, d=2, pad=0, solid=False, decor=True)


def kitchen(n):
    W, H = n * T, 2 * T
    s = S(W, H)
    s.r(0, 0, W - 1, H - 1, hexc("#8b93a8"))
    s.r(3, 3, W - 4, H - 4, hexc("#4a5062"))
    s.r(5, 5, W - 6, H - 5, hexc("#6a7288"))
    # 뒤쪽 선반과 타일
    for x in range(5, W - 5, 12):
        s.line((x, 5), (x, H // 2), hexc("#7a8298"))
    s.r(5, H // 2, W - 6, H // 2 + 2, hexc("#9aa2b6"))
    for x in range(10, W - 30, 60):
        s.ro(x, 10, x + 20, 20, hexc("#aab2c6"), hexc("#5c6274"))
    # 조리사 두 분
    for cx in (W // 3, 2 * W // 3 + 10):
        s.ell(cx - 11, 22, cx + 11, 44, hexc("#e88aa0"), hexc("#8a3a52"))
        s.ro(cx - 6, 14, cx + 6, 26, hexc("#fbcfaf"), hexc("#b08a6a"))
        s.r(cx - 6, 20, cx + 6, 26, hexc("#f4f4f8"))
        s.r(cx - 4, 17, cx - 3, 18, hexc("#22192a"))
        s.r(cx + 3, 17, cx + 4, 18, hexc("#22192a"))
        s.ro(cx - 8, 5, cx + 8, 14, hexc("#fafafe"), hexc("#a0a0b0"))
        s.r(cx - 6, 2, cx + 6, 6, hexc("#fafafe"))
    s.r(0, H - 5, W - 1, H - 1, hexc("#b9bfcc"))
    s.line((0, H - 5), (W - 1, H - 5), hexc("#e8ecf6"))
    return dict(img=s.im, w=n, d=2, pad=0, solid=False, decor=True)


def sign_hang(text, col="#3f8a5a"):
    t = text_image(text, hexc("#ffffff"), FONT11B, 11, outline=shade(hexc(col), 0.5))
    W, H = t.width + 12, 18
    s = S(W, H)
    s.ro(0, 0, W - 1, H - 1, hexc(col), shade(hexc(col), 0.5))
    s.line((1, 1), (W - 2, 1), lighten(hexc(col), 0.4))
    s.paste(t, 6, 2)
    return dict(img=s.im, w=W / T, d=H / T, pad=0, solid=False, decor=True)


def facade_sign(text):
    t = text_image(text, hexc("#fff3d0"), FONT11B, 11, outline=hexc("#5a3a20"))
    W, H = t.width + 28, 26
    s = S(W, H)
    c = hexc("#b87a44")
    s.ro(0, 2, W - 1, H - 3, c, hexc("#5a3a20"))
    s.line((2, 3), (W - 3, 3), lighten(c, 0.4))
    s.line((2, H - 4), (W - 3, H - 4), shade(c, 0.7))
    s.paste(t, (W - t.width) // 2, (H - t.height) // 2)
    return dict(img=s.im, w=W / T, d=H / T, pad=0, solid=False, decor=True)


def speaker_wall():
    s = S(22, 30)
    s.ro(0, 0, 21, 29, hexc("#34343f"), hexc("#14141c"))
    s.ell(5, 4, 16, 15, hexc("#1c1c24"), hexc("#6a6a7c"))
    s.ell(7, 18, 14, 25, hexc("#1c1c24"), hexc("#6a6a7c"))
    return dict(img=s.im, w=22 / T, d=30 / T, pad=0, solid=False, decor=True)


def gate(orient, open_):
    """잠긴 문. v는 세로로 서 있는 문(1x4칸), h는 가로로 놓인 문(6x1칸)."""
    if orient == "v":
        W, H = T, 4 * T
    else:
        W, H = 6 * T, T
    s = S(W, H)
    dark, mid = hexc("#4a4f60"), hexc("#8a90a8")
    if not open_:
        s.r(0, 0, W - 1, H - 1, dark)
        s.r(2, 2, W - 3, H - 3, mid)
        for y in range(4, H - 4):
            for x in range(4, W - 4):
                if orient == "v" and (y % 8) >= 4 and False:
                    continue
        # 위험 줄무늬
        for y in range(4, H - 4):
            for x in range(4, W - 4):
                ph = ((x + y) // 5) % 2
                s.px(x, y, hexc("#f0c030") if ph == 0 else hexc("#2a2a34"))
        cx, cy = W // 2, H // 2
        s.ro(cx - 14, cy - 12, cx + 13, cy + 12, hexc("#fff4d0"), hexc("#3a3f50"))
        s.ro(cx - 6, cy - 3, cx + 5, cy + 8, hexc("#e8b830"), hexc("#7a5a10"))
        s.d.arc([cx - 5, cy - 10, cx + 4, cy], 180, 360, fill=hexc("#7a5a10"), width=2)
        s.r(cx - 1, cy + 1, cx, cy + 4, hexc("#5a3a10"))
    else:
        if orient == "v":
            for y in (0, H - 8):
                s.r(0, y, W - 1, y + 7, hexc("#6a7088"))
                s.r(2, y + 1, W - 3, y + 6, mid)
            s.r(0, 8, 3, H - 9, mid)
            s.r(0, 8, 1, H - 9, hexc("#6a7088"))
        else:
            for x in (0, W - 8):
                s.r(x, 0, x + 7, H - 1, hexc("#6a7088"))
                s.r(x + 1, 2, x + 6, H - 3, mid)
            s.r(8, 0, W - 9, 3, mid)
            s.r(8, 0, W - 9, 1, hexc("#6a7088"))
    return dict(img=s.im, w=W // T, d=H // T, pad=0, solid=False, decor=True)


# ====================================================================== 이름으로 만들기
def get_sprite(name):
    p = name.split("_")
    k = p[0]
    if k == "desk":
        return desk(p[1] if len(p) > 1 else "")
    if k == "chair":
        return chair(p[1], p[2])
    if k == "table":
        w, d = [int(v) for v in p[1].split("x")]
        return table(w, d, p[2], tray=(len(p) > 3 and p[3] == "tray"))
    if k == "tdesk":
        return tdesk()
    if k == "shelf":
        return shelf(int(p[1]))
    if k == "lowshelf":
        return shelf(int(p[1]), tall=False)
    if k == "cabinet":
        return cabinet(int(p[1]))
    if k == "locker":
        return locker(int(p[1]))
    if k == "steel":
        return steel_counter(int(p[1]))
    if k == "traycounter":
        return tray_counter(int(p[1]))
    if k == "libcounter":
        return lib_counter(int(p[1]))
    if k == "sink":
        return sink()
    if k == "fridge":
        return fridge()
    if k == "dispenser":
        return dispenser()
    if k == "plant":
        return plant()
    if k == "trash":
        return trash()
    if k == "bench":
        return bench(int(p[1]))
    if k == "backpack":
        return backpack(p[1])
    if k == "speaker":
        return speaker()
    if k == "ballcart":
        return ball_cart()
    if k == "mat":
        return mat(p[1])
    if k == "hoop":
        return hoop()
    if k == "stage":
        w, d = [int(v) for v in p[1].split("x")]
        return stage(w, d)
    if k == "flagstand":
        return flag_stand()
    if k == "bookcart":
        return book_cart()
    if k == "tree":
        return tree()
    if k == "bush":
        return bush(int(p[1]))
    if k == "goal":
        return goal(int(p[1]))
    if k == "flagpole":
        return flagpole()
    if k == "signstone":
        return sign_stone()
    if k == "ball":
        return ball()
    if k == "cone":
        return cone()
    if k == "trophy":
        return trophy(int(p[1]))
    if k == "posterstand":
        return poster_stand()
    if k == "extinguisher":
        return extinguisher()
    # ---- 벽 장식
    if k == "window":
        return window(int(p[1]), p[2] if len(p) > 2 else "field")
    if k == "blackboard":
        return blackboard(int(p[1]), p[2].replace("~", " ") if len(p) > 2 else "")
    if k == "bulletin":
        return bulletin(int(p[1]))
    if k == "poster":
        return poster(p[1])
    if k == "flagwall":
        return flag_wall()
    if k == "clock":
        return clock()
    if k == "doorclass":
        return door_class(p[1])
    if k == "banner":
        return banner(p[1].replace("~", " "), int(p[2]))
    if k == "curtain":
        return curtain(int(p[1]))
    if k == "kitchen":
        return kitchen(int(p[1]))
    if k == "signhang":
        return sign_hang(p[1].replace("~", " "), "#" + p[2] if len(p) > 2 else "#3f8a5a")
    if k == "facadesign":
        return facade_sign(p[1].replace("~", " "))
    if k == "speakerwall":
        return speaker_wall()
    if k == "gate":
        return gate(p[1], p[2] == "open")
    raise KeyError(name)
