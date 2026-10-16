"""가구·소품·벽 장식 도트 그림 (ZEP 느낌: 알록달록한 색, 약간의 입체감, 동글동글 귀엽게).

게임 칸 하나 = 32px. 물건 그림은 아래쪽 PAD 줄이 바닥 그림자예요.
get_sprite("이름") 으로 그림과 크기(w, d)를 받아요.
"""
import re
from PIL import Image
from pxlib import (S, PAD, ol_of, ret, decor_ret, hexc, shade, lighten, mix, text_image,
                   FONT11, FONT11B, FONT9, hash2)

T = 32

# ---------------------------------------------------------------- 색 모음
CHAIR = dict(grn="#79cc4a", red="#ee6a5a", yel="#ffc43a", blu="#58a0f0", pur="#a07ae0",
             gry="#9aa3b8", org="#ff9a3c", blk="#4d4d66", wht="#f6f4fa", pnk="#ff8fb8", mnt="#4fd0b0")
BOOKS = ["#e8605a", "#f2a03e", "#f6d24a", "#5cc27a", "#4cb8c4", "#4f86e0", "#8c6ad8", "#ee86b0", "#b07a4a"]
STEEL = hexc("#7f89aa")


def c(h):
    return hexc(h)


def rnd(*k):
    return hash2(*[int(v) & 0xFFFF for v in k])


# ---------------------------------------------------------------- 의자 / 책상 / 탁자
def chair(col, facing):
    """facing 's' = 등받이가 위쪽(북쪽) / 'n' = 등받이가 아래쪽(남쪽)."""
    base = c(CHAIR[col])
    o, lt, dk = ol_of(base), lighten(base, 0.38), shade(base, 0.8)
    s = S(T, T + PAD)
    if facing == "s":
        s.r(9, 25, 10, 29, STEEL)
        s.r(21, 25, 22, 29, STEEL)
        s.rr(8, 2, 23, 14, base, o, 3, hi=lt)            # 등받이
        s.rr(7, 12, 24, 25, lt, o, 3)                      # 방석
        s.r(9, 22, 22, 23, base)
        s.line((9, 23), (22, 23), dk)
    else:
        s.r(9, 27, 10, 30, STEEL)
        s.r(21, 27, 22, 30, STEEL)
        s.rr(7, 5, 24, 18, lt, o, 3)                      # 방석
        s.rr(8, 14, 23, 28, base, o, 3, hi=lt, lo=dk)      # 등받이(뒤에서 본 모습)
        s.r(11, 17, 20, 17, lt)
    s.shadow(6, 25, 54)
    return ret(s, 1, 1)


def desk(variant=""):
    oak = variant.startswith("oak")                        # 교실 ②의 나무 책상
    variant = variant[3:] if oak else variant
    top = c("#e6a867") if oak else c("#f9d39b")
    o = c("#5a3a22") if oak else c("#80553a")
    s = S(T, T + PAD)
    for x in (5, 24):
        s.r(x, 21, x + 2, 29, STEEL)
    s.r(5, 28, 26, 29, shade(STEEL, 0.85))
    s.rr(2, 8, 29, 22, top, o, 3, hi=lighten(top, 0.55))
    s.r(4, 19, 27, 20, shade(top, 0.84))
    if oak:                                                # 나뭇결 + 앞쪽 짙은 테두리
        for yy in (12, 15):
            s.line((5, yy), (26, yy), shade(top, 0.9))
        s.r(3, 21, 28, 22, c("#3a2a24"))
    if variant == "book":
        s.rr(6, 11, 15, 17, c("#4f86e0"), ol_of(c("#4f86e0")), 1)
        s.rr(16, 11, 25, 17, c("#fffdf2"), c("#9a8a6a"), 1)
        s.line((17, 13), (24, 13), c("#c8c0a8"))
        s.line((17, 15), (24, 15), c("#c8c0a8"))
    elif variant == "pencil":
        s.line((8, 16), (22, 11), c("#ffd23a"))
        s.line((8, 17), (22, 12), c("#e8a820"))
        s.px(23, 10, c("#ff8fa8"))
        s.rr(22, 14, 26, 18, c("#8ec0ff"), c("#4a6aa8"), 1)
    s.shadow(3, 28, 56)
    return ret(s, 1, 1)


def table(w, d, mat, tray=False):
    """긴 식탁/탁자: 윗면 + 두툼한 앞면 + 다리."""
    W, H = w * T, d * T
    cols = {"brown": ("#e8a468", "#c07a40"), "wood": ("#f6cf90", "#d4a468"), "white": ("#fbf8f2", "#cfc8dc")}
    top, edge = c(cols[mat][0]), c(cols[mat][1])
    o = ol_of(edge, 0.5)
    s = S(W, H + PAD)
    for x in (4, W - 9):
        s.r(x, H - 9, x + 4, H - 1, shade(edge, 0.7))
    s.rr(1, 3, W - 2, H - 7, top, o, 4, hi=lighten(top, 0.5))
    s.rr(1, H - 14, W - 2, H - 7, edge, o, 2)                   # 앞면(두께)
    s.r(3, H - 13, W - 4, H - 13, lighten(edge, 0.3))
    if tray:
        for i in range(w - 1):
            x = 8 + i * (W - 16) // max(1, w - 1) - 4 if w > 1 else 6
            _tray(s, x + 4, 12)
    s.shadow(2, W - 3, 58)
    return ret(s, w, d)


def _tray(s, x, y):
    s.rr(x, y, x + 22, y + 15, c("#fdfbf4"), c("#a79bb8"), 2)
    s.rr(x + 2, y + 2, x + 8, y + 8, c("#ffffff"), c("#b8b0c8"), 2)         # 밥
    s.rr(x + 10, y + 2, x + 20, y + 7, c("#ee5a4a"), None, 1)               # 반찬
    s.rr(x + 2, y + 9, x + 10, y + 13, c("#5cc27a"), None, 1)
    s.rr(x + 12, y + 9, x + 20, y + 13, c("#ffb43a"), None, 1)


def otable(w, d):
    W, H = w * T, d * T
    top, edge = c("#f3ecdf"), c("#cfc2ad")
    o = ol_of(edge, 0.55)
    s = S(W, H + PAD)
    s.rr(W // 4, H - 12, W - W // 4, H - 3, shade(edge, 0.85), o, 3)       # 받침
    s.rr(0, 8 - 4, W - 1, H - 6, edge, o, 14)                               # 두께
    s.rr(0, 3, W - 1, H - 13, top, o, 14, hi=c("#ffffff"))
    for i in range(w):                                                     # 종이
        x = 12 + i * (W - 24) // w
        yy = 12 if i % 2 == 0 else H - 30
        s.rr(x, yy, x + 11, yy + 8, c("#ffffff"), c("#9aa0b8"), 1)
        s.line((x + 2, yy + 3), (x + 9, yy + 3), c("#c0c6dc"))
        s.line((x + 2, yy + 5), (x + 9, yy + 5), c("#c0c6dc"))
    for k in (1, w - 2):
        s.rr(k * T + 10, 22, k * T + 15, 30, c("#41415a"), c("#25253a"), 1)   # 휴대폰
    s.shadow(3, W - 4, 54)
    return ret(s, w, d)


def stool():
    s = S(T, T + PAD)
    leg = shade(STEEL, 0.9)
    for x in (9, 21):
        s.r(x, 19, x + 1, 30, leg)
    s.r(9, 26, 22, 26, leg)
    s.ell(5, 8, 26, 22, c("#c98a52"), ol_of(c("#c98a52")))
    s.ell(7, 8, 24, 18, c("#e8aa70"))
    s.shadow(7, 24, 52)
    return ret(s, 1, 1)


# ---------------------------------------------------------------- 책장 / 사물함
def books(s, x0, y0, x1, y1, seed, bg=None):
    """칸 하나 안에 알록달록한 책을 세워 꽂아요."""
    if bg:
        s.r(x0, y0, x1, y1, bg)
    x = x0
    k = 0
    while x <= x1 - 1:
        w = 3 + int(rnd(seed, k, 1) * 2)
        w = min(w, x1 - x + 1)
        h = (y1 - y0) - 1 - int(rnd(seed, k, 2) * 4)
        col = c(BOOKS[int(rnd(seed, k, 3) * len(BOOKS))])
        s.r(x, y1 - h, x + w - 1, y1, col)
        s.line((x, y1 - h), (x + w - 1, y1 - h), lighten(col, 0.4))
        s.line((x + w - 1, y1 - h + 1), (x + w - 1, y1), shade(col, 0.78))
        x += w
        k += 1
        if rnd(seed, k, 4) > 0.82 and x < x1 - 4:      # 가끔 눕혀 놓은 책
            x += 1
    return s


def wshelf(n, tall=False):
    """도서관 흰색 철제 책장 (앞에서 본 모습). tall=True 면 키가 큰 책장(여섯 칸)."""
    W, H = n * T, 100 if tall else 68
    s = S(W, H + PAD)
    frame, o = c("#f2f4fa"), c("#7480a8")
    s.rr(0, 0, W - 1, H - 1, frame, o, 2)
    s.r(2, 1, W - 3, 4, c("#ffffff"))
    s.line((2, 5), (W - 3, 5), c("#c8d0e4"))
    # 위쪽 색 라벨
    for i in range(n * 2):
        s.r(5 + i * 16, 2, 14 + i * 16, 3, c(BOOKS[(i * 3 + n) % len(BOOKS)]))
    rows = 6 if tall else 4
    rh = (H - 10) // rows
    for r in range(rows):
        y0 = 7 + r * rh
        books(s, 3, y0, W - 4, y0 + rh - 2, seed=n * 10 + r + (50 if tall else 0), bg=c("#dfe5f3"))
        s.line((3, y0 + rh - 1), (W - 4, y0 + rh - 1), c("#aeb8d4"))
    for i in range(1, n):
        s.line((i * T, 6), (i * T, H - 3), o)                  # 기둥
    s.shadow(1, W - 2, 60)
    return ret(s, n, 1)


def lockerbank(n):
    """연두/흰 체크무늬 사물함."""
    W, H = n * T, 60
    s = S(W, H + PAD)
    s.rr(0, 0, W - 1, H - 1, c("#e8ecf4"), c("#7a86a6"), 2)
    s.r(2, 1, W - 3, 5, c("#ffffff"))
    cw, ch = 16, 17
    cols = W // cw
    for r in range(3):
        for i in range(cols):
            green = (i + r) % 2 == 0
            base = c("#9ad84a") if green else c("#fafbf6")
            x0, y0 = i * cw, 6 + r * ch
            s.rr(x0 + 1, y0, x0 + cw - 2, y0 + ch - 2, base, ol_of(base, 0.7), 1, hi=lighten(base, 0.4))
            s.r(x0 + cw - 6, y0 + 4, x0 + cw - 5, y0 + 8, c("#4a4a62"))
            s.r(x0 + 4, y0 + 3, x0 + 4, y0 + 4, shade(base, 0.8))
    s.shadow(1, W - 2, 60)
    return ret(s, n, 1)


# ---------------------------------------------------------------- 나무/식물/소품
def plant():
    s = S(T, 49 + PAD)
    g1, g2, g3 = c("#4cb860"), c("#6fd070"), c("#2f8a48")
    s.rr(9, 34, 22, 48, c("#e88a52"), ol_of(c("#e88a52")), 2, hi=c("#ffb078"))
    s.r(10, 36, 21, 37, c("#c8683a"))
    for (x, y, r) in ((16, 12, 9), (9, 20, 8), (23, 20, 8), (16, 25, 8)):
        s.ell(x - r, y - r, x + r, y + r, g1, ol_of(g1, 0.5))
    for (x, y, r) in ((14, 10, 5), (8, 19, 4), (21, 18, 4), (15, 24, 4)):
        s.ell(x - r, y - r, x + r, y + r, g2)
    s.px(18, 8, c("#c8f4a0"))
    s.r(11, 31, 20, 33, g3)
    s.shadow(7, 24, 58)
    return ret(s, 1, 1)


def tree():
    s = S(2 * T, 100 + PAD)
    g1, g2, g3 = c("#46b45a"), c("#74d26c"), c("#2c8c4a")
    brown = c("#a86a3c")
    s.rr(26, 60, 37, 98, brown, ol_of(brown), 2, hi=c("#d89a62"))
    s.r(34, 62, 36, 96, shade(brown, 0.8))
    for (x, y, r) in ((32, 24, 24), (14, 40, 15), (50, 40, 15), (32, 46, 19), (22, 28, 13), (44, 28, 13)):
        s.ell(x - r, y - r, x + r, y + r, g1, ol_of(g1, 0.5))
    for (x, y, r) in ((26, 20, 13), (16, 36, 8), (46, 36, 8), (30, 42, 9)):
        s.ell(x - r, y - r, x + r, y + r, g2)
    for (x, y) in ((22, 14), (36, 10), (14, 34), (48, 32), (30, 40)):
        s.rr(x, y, x + 2, y + 1, c("#d6f6a8"), None, 0)
    for (x, y) in ((38, 40), (20, 46), (52, 44)):
        s.ell(x - 3, y - 2, x + 3, y + 2, g3)
    s.shadow(14, 50, 66)
    return ret(s, 2, 1)


def bush(n):
    W = n * T
    s = S(W, 30 + PAD)
    g1, g2 = c("#46b45a"), c("#74d26c")
    for i in range(n * 2):
        x = 8 + i * (W - 16) // max(1, n * 2 - 1)
        s.ell(x - 9, 6, x + 9, 28, g1, ol_of(g1, 0.5))
    for i in range(n * 2):
        x = 8 + i * (W - 16) // max(1, n * 2 - 1)
        s.ell(x - 6, 8, x + 3, 17, g2)
    s.shadow(2, W - 3, 60)
    return ret(s, n, 1)



# ---------------------------------------------------------------- 교실 가구
def tdesk():
    """선생님 책상(교탁)."""
    W = 2 * T
    s = S(W, 38 + PAD)
    wood, o = c("#e8a468"), c("#7a4a2a")
    s.rr(2, 6, W - 3, 36, wood, o, 3)
    s.rr(3, 7, W - 4, 17, c("#f8cc92"), None, 2, hi=c("#fff0d0"))             # 윗면
    s.line((4, 18), (W - 5, 18), shade(wood, 0.8))
    for x in (8, 38):
        s.rr(x, 22, x + 16, 33, shade(wood, 0.92), shade(wood, 0.6), 1)        # 서랍
        s.r(x + 6, 27, x + 10, 27, c("#ffd96a"))
    s.rr(8, 8, 22, 15, c("#4f86e0"), ol_of(c("#4f86e0")), 1)                   # 노트북
    s.r(10, 10, 20, 12, c("#9ad0ff"))
    s.rr(26, 9, 36, 14, c("#fffdf2"), c("#9a8a6a"), 1)                         # 종이
    s.rr(45, 8, 49, 14, c("#ee5a4a"), ol_of(c("#ee5a4a")), 1)                  # 컵
    s.rr(52, 9, 56, 14, c("#58a0f0"), ol_of(c("#58a0f0")), 1)
    s.shadow(2, W - 3, 58)
    return ret(s, 2, 1)


def cubby():
    """사물함 겸 외투 걸이장(나무)."""
    W = 2 * T
    s = S(W, 50 + PAD)
    wood, o = c("#d9955a"), c("#6e4326")
    s.rr(0, 8, W - 1, 49, wood, o, 3)
    s.r(2, 9, W - 3, 12, c("#f0b87c"))
    for x in (8, 20, 32, 44, 54):                                              # 옷걸이 고리
        s.r(x, 3, x + 1, 9, c("#4a4a62"))
        s.rr(x - 1, 0, x + 2, 3, c("#ffd96a"), None, 1)
    s.rr(3, 15, 30, 46, shade(wood, 0.95), shade(wood, 0.62), 2)
    s.rr(33, 15, W - 4, 46, shade(wood, 0.95), shade(wood, 0.62), 2)
    s.r(6, 20, 14, 28, c("#f4ecd8"))                                           # 알림 쪽지
    s.r(15, 38, 17, 41, c("#ffd96a"))
    s.r(46, 38, 48, 41, c("#ffd96a"))
    s.shadow(1, W - 2, 58)
    return ret(s, 2, 1)


def ac():
    s = S(T, 60 + PAD)
    s.rr(4, 0, 27, 59, c("#f6f7fb"), c("#7b86a8"), 3)
    s.r(6, 2, 25, 4, c("#ffffff"))
    for y in range(7, 24, 3):
        s.r(8, y, 23, y + 1, c("#9aa5c4"))
    s.rr(8, 27, 23, 36, c("#3a4260"), c("#262c44"), 1)
    s.r(10, 30, 13, 32, c("#5cf0a0"))
    s.r(15, 30, 16, 32, c("#ff7a6a"))
    s.r(18, 30, 21, 32, c("#9ad0ff"))
    s.rr(8, 40, 23, 54, c("#e4e8f4"), None, 1)
    s.line((9, 47), (22, 47), c("#c0c8dc"))
    s.shadow(4, 27, 58)
    return ret(s, 1, 1)


def tabcart():
    s = S(T, 50 + PAD)
    s.rr(3, 0, 28, 8, c("#f6f7fb"), c("#7b86a8"), 2, hi=c("#ffffff"))
    s.rr(6, 1, 25, 5, c("#e8ecf6"), None, 0)
    s.rr(4, 8, 27, 44, c("#3f5fbf"), ol_of(c("#3f5fbf")), 3, hi=c("#6f8ff0"))
    s.r(6, 12, 25, 12, c("#6f8ff0"))
    s.rr(8, 16, 23, 28, c("#34509f"), None, 1)
    s.r(20, 31, 22, 36, c("#ffd96a"))
    s.r(7, 45, 9, 48, c("#3a3a52"))
    s.r(22, 45, 24, 48, c("#3a3a52"))
    s.shadow(4, 27, 58)
    return ret(s, 1, 1)


def bin_():
    s = S(T, 26 + PAD)
    s.rr(7, 6, 24, 25, c("#58a0f0"), ol_of(c("#58a0f0")), 2, hi=c("#9ad0ff"))
    s.rr(5, 2, 26, 8, c("#4a8ae0"), ol_of(c("#58a0f0")), 2, hi=c("#9ad0ff"))
    s.r(14, 11, 17, 19, c("#d8ecff"))
    s.r(12, 14, 19, 16, c("#d8ecff"))
    s.shadow(5, 26, 54)
    return ret(s, 1, 1)


def trash():
    s = S(T, 28 + PAD)
    g = c("#9aa3b8")
    s.rr(8, 6, 23, 27, g, ol_of(g), 2, hi=lighten(g, 0.4))
    s.rr(6, 2, 25, 7, lighten(g, 0.15), ol_of(g), 2, hi=lighten(g, 0.5))
    for x in (12, 15, 18):
        s.line((x, 11), (x, 24), shade(g, 0.78))
    s.shadow(6, 25, 54)
    return ret(s, 1, 1)


def backpack(col):
    cols = dict(gr="#5cc27a", bl="#58a0f0", pk="#ff8fb8", gy="#9aa3b8")
    b = c(cols[col])
    s = S(T, 25 + PAD)
    o = ol_of(b)
    s.rr(8, 2, 23, 22, b, o, 4, hi=lighten(b, 0.45))
    s.rr(11, 13, 20, 20, shade(b, 0.86), o, 2)
    s.line((12, 16), (19, 16), lighten(b, 0.35))
    s.rr(13, 0, 18, 3, shade(b, 0.8), o, 1)
    s.shadow(7, 24, 52)
    return ret(s, 1, 1, solid=False)


# ---------------------------------------------------------------- 식당/복도/체육관 소품
def steel_counter(n):
    W = n * T
    s = S(W, 46 + PAD)
    steel, o = c("#c9d0e2"), c("#6b7699")
    s.rr(0, 14, W - 1, 45, steel, o, 2)
    s.rr(0, 8, W - 1, 17, c("#eef1fa"), o, 2, hi=c("#ffffff"))                # 윗면
    for i in range(n * 2 - 1):                                                  # 서랍/문
        x = 3 + i * 16
        s.rr(x, 22, x + 13, 41, c("#dfe4f2"), c("#8a94b4"), 1)
        s.r(x + 5, 29, x + 8, 30, c("#7480a8"))
    cols = ["#ffb43a", "#a8643a", "#ffe68a", "#7ad27a", "#ee5a4a", "#ffc83a", "#ff9a3c"]
    for i in range(n):                                                          # 배식 통
        x = 4 + i * T
        s.rr(x, 0, x + 23, 11, c("#aeb6d0"), o, 3)
        s.rr(x + 2, 2, x + 21, 8, c(cols[i % len(cols)]), None, 3)
        s.r(x + 5, 3, x + 9, 4, lighten(c(cols[i % len(cols)]), 0.5))
    s.shadow(1, W - 2, 58)
    return ret(s, n, 1)


def sink_():
    return ret(S(T, T + PAD), 1, 1)


def fridge():
    s = S(T, 60 + PAD)
    s.rr(4, 0, 27, 59, c("#f2f5fb"), c("#7480a8"), 3)
    s.line((5, 24), (26, 24), c("#7480a8"))
    s.r(6, 2, 25, 3, c("#ffffff"))
    s.r(22, 8, 23, 18, c("#9aa5c4"))
    s.r(22, 30, 23, 44, c("#9aa5c4"))
    s.shadow(4, 27, 58)
    return ret(s, 1, 1)


def dispenser():
    s = S(T, 50 + PAD)
    s.rr(11, 0, 20, 8, c("#9ad8ff"), c("#4a8ac0"), 3, hi=c("#d8f2ff"))       # 물통
    s.rr(6, 8, 25, 49, c("#f2f5fb"), c("#7480a8"), 3)
    s.rr(9, 14, 22, 26, c("#dbe3f6"), c("#9aa5c4"), 1)
    s.r(11, 17, 14, 19, c("#58a0f0"))
    s.r(17, 17, 20, 19, c("#ff7a6a"))
    s.rr(10, 31, 21, 38, c("#e4e8f4"), c("#9aa5c4"), 1)
    s.r(9, 41, 22, 41, c("#c0c8dc"))
    s.shadow(6, 25, 58)
    return ret(s, 1, 1)


def purifier():
    s = S(T, 56 + PAD)
    s.rr(7, 6, 24, 55, c("#c9d0e2"), c("#6b7699"), 3, hi=c("#eef1fa"))
    s.rr(9, 10, 22, 22, c("#3a4260"), c("#262c44"), 1)
    s.r(11, 13, 16, 15, c("#5cf0a0"))
    s.r(11, 17, 20, 18, c("#58a0f0"))
    s.rr(11, 27, 20, 36, c("#e4e8f4"), c("#8a94b4"), 1)
    s.rr(13, 32, 18, 35, c("#58a0f0"), None, 0)
    s.rr(10, 42, 21, 54, c("#aeb6d0"), None, 1)
    s.shadow(7, 24, 58)
    return ret(s, 1, 1)


def glasscab():
    s = S(T, 60 + PAD)
    s.rr(3, 0, 28, 59, c("#d2e8f8"), c("#5a7aa8"), 3)
    s.rr(5, 3, 26, 56, c("#eef8ff"), None, 2)
    for y in (18, 34, 50):
        s.r(5, y, 26, y + 1, c("#9ac0e0"))
    for y in (10, 26, 42):
        for x in (7, 14, 21):
            s.ell(x, y + 1, x + 4, y + 5, c("#ffffff"), c("#9ab0d0"))
    s.r(6, 4, 7, 55, c("#ffffff"))
    s.shadow(3, 28, 56)
    return ret(s, 1, 1)


def trophy(n):
    W = n * T
    s = S(W, 54 + PAD)
    wood, o = c("#c98a52"), c("#6e4326")
    s.rr(0, 0, W - 1, 53, wood, o, 3)
    s.rr(3, 4, W - 4, 40, c("#eaf6ff"), c("#8a6a46"), 2)
    for y in (22,):
        s.r(4, y, W - 5, y + 1, c("#b8d4ea"))
    for i in range(n * 2):
        x = 8 + i * 14
        for (yy, gold) in ((8, True), (26, i % 2 == 0)):
            col = c("#ffc83a") if gold else c("#c8d0e0")
            s.rr(x, yy, x + 8, yy + 6, col, ol_of(col), 2, hi=lighten(col, 0.5))
            s.r(x + 3, yy + 7, x + 5, yy + 10, shade(col, 0.8))
            s.r(x + 1, yy + 11 - 1, x + 7, yy + 12 - 1, shade(col, 0.7))
    s.r(5, 5, 7, 38, c("#ffffff"))
    s.rr(4, 43, W - 5, 51, shade(wood, 0.9), None, 1)
    s.shadow(1, W - 2, 58)
    return ret(s, n, 1)


def speaker():
    s = S(T, 52 + PAD)
    s.rr(5, 0, 26, 51, c("#4a4a62"), c("#25253a"), 3, hi=c("#7a7a98"))
    for (cy, r) in ((13, 7), (35, 9)):
        s.ell(15 - r, cy - r, 15 + r, cy + r, c("#2c2c40"), c("#16162a"))
        s.ell(15 - r + 3, cy - r + 3, 15 + r - 3, cy + r - 3, c("#5a5a7a"))
        s.ell(13, cy - 2, 17, cy + 2, c("#9a9ac0"))
    s.shadow(5, 26, 58)
    return ret(s, 1, 1)


def ballcart():
    s = S(T, 45 + PAD)
    s.rr(2, 12, 29, 41, c("#dbe2f2"), c("#6b7699"), 2)
    s.rr(4, 14, 27, 38, c("#b8c0d8"), None, 1)
    for (x, y) in ((6, 15), (14, 15), (21, 15), (9, 24), (17, 24), (6, 31), (14, 31), (22, 31)):
        s.ell(x, y, x + 7, y + 7, c("#ff8a2a"), c("#a84a10"))
        s.line((x + 3, y + 1), (x + 3, y + 6), c("#a84a10"))
        s.line((x + 1, y + 3), (x + 6, y + 3), c("#a84a10"))
    for x in range(5, 28, 4):
        s.line((x, 12), (x, 41), c("#8a94b4"))
    s.line((2, 12), (29, 12), c("#8a94b4"))
    s.ell(4, 41, 8, 44, c("#3a3a52"))
    s.ell(23, 41, 27, 44, c("#3a3a52"))
    s.shadow(2, 29, 58)
    return ret(s, 1, 1)


def bookcart():
    s = S(T, 41 + PAD)
    s.rr(4, 2, 27, 36, c("#f4f6fc"), c("#7480a8"), 2)
    books(s, 6, 4, 25, 17, 77, bg=c("#dfe5f3"))
    books(s, 6, 21, 25, 34, 78, bg=c("#dfe5f3"))
    s.r(5, 18, 26, 19, c("#aeb8d4"))
    s.ell(5, 37, 9, 41, c("#3a3a52"))
    s.ell(22, 37, 26, 41, c("#3a3a52"))
    s.shadow(4, 27, 56)
    return ret(s, 1, 1)


def bench(n, cushion=False):
    W = n * T
    s = S(W, 26 + PAD)
    wood, o = c("#d9955a"), c("#6e4326")
    for x in (6, W - 9):
        s.r(x, 14, x + 2, 25, STEEL)
    if cushion:
        s.rr(2, 1, W - 3, 18, c("#fff1cf"), c("#a8845a"), 4, hi=c("#ffffff"))
        for x in range(T, W - 4, T):
            s.line((x, 3), (x, 15), c("#e8d4a8"))
        s.rr(2, 17, W - 3, 21, wood, o, 1)
    else:
        s.rr(1, 4, W - 2, 18, wood, o, 3, hi=c("#f6c08a"))
        s.line((3, 11), (W - 4, 11), shade(wood, 0.8))
        s.r(2, 17, W - 3, 18, shade(wood, 0.7))
    s.shadow(2, W - 3, 54)
    return ret(s, n, 1)


def benchv(n):
    """세로로 놓인 벤치(세로 복도용): 긴 쪽이 위아래로 놓여 있어요. (가로 1칸, 세로 n칸)"""
    H = n * T
    s = S(T, H + PAD)
    wood, o = c("#d9955a"), c("#6e4326")
    for x in (9, 20):                                                       # 앞쪽 다리
        s.r(x, H - 8, x + 2, H - 1, STEEL)
    s.rr(7, 3, 24, H - 10, wood, o, 3, hi=c("#f6c08a"))                     # 윗판
    for y in range(11, H - 12, 9):
        s.line((9, y), (22, y), shade(wood, 0.82))
    s.rr(7, H - 14, 24, H - 7, shade(wood, 0.82), o, 2)                     # 앞쪽 두께
    s.shadow(5, 26, 54)
    return ret(s, 1, n)


def trophyv(n):
    """세로로 놓인 유리 진열장(세로 복도용): 위에서 트로피가 보여요. (가로 1칸, 세로 n칸)"""
    H = n * T
    s = S(T, H + PAD)
    wood, o = c("#c98a52"), c("#6e4326")
    s.rr(3, 2, 28, H - 6, wood, o, 3)
    s.rr(6, 5, 25, H - 16, c("#eaf6ff"), c("#8a6a46"), 2)                    # 유리 덮개
    s.r(8, 7, 9, H - 19, c("#ffffff"))
    for k in range(n * 2):                                                  # 트로피
        y = 9 + k * (H - 30) // max(1, n * 2 - 1)
        col = c("#ffc83a") if k % 2 == 0 else c("#c8d0e0")
        s.rr(11, y, 20, y + 7, col, ol_of(col), 2, hi=lighten(col, 0.5))
        s.r(14, y + 8, 17, y + 10, shade(col, 0.8))
    s.rr(5, H - 14, 26, H - 7, shade(wood, 0.9), o, 1)                      # 앞쪽 면
    s.r(11, H - 12, 20, H - 10, c("#ffd96a"))
    s.shadow(3, 28, 56)
    return ret(s, 1, n)


def extinguisher():
    s = S(T, 31 + PAD)
    s.rr(11, 6, 20, 29, c("#ee4a42"), ol_of(c("#ee4a42")), 3, hi=c("#ff8a7a"))
    s.rr(13, 14, 18, 22, c("#fff6e0"), None, 1)
    s.r(14, 16, 17, 17, c("#ee4a42"))
    s.rr(13, 1, 18, 6, c("#4a4a62"), c("#25253a"), 1)
    s.line((18, 2), (23, 4), c("#25253a"))
    s.shadow(9, 22, 54)
    return ret(s, 1, 1)


def cone():
    s = S(T, 25 + PAD)
    s.rr(6, 21, 25, 24, c("#ffb43a"), ol_of(c("#ff8a2a")), 1)
    s.poly([(16, 2), (23, 21), (9, 21)], c("#ff7a2a"), ol_of(c("#ff7a2a")))
    s.r(12, 10, 19, 12, c("#ffffff"))
    s.r(11, 15, 20, 17, c("#ffffff"))
    s.shadow(6, 25, 54)
    return ret(s, 1, 1)


def ball():
    s = S(T, 15 + PAD)
    s.ell(10, 1, 21, 12, c("#ffffff"), c("#3a3a52"))
    s.poly([(16, 4), (19, 6), (18, 9), (14, 9), (13, 6)], c("#3a3a52"))
    s.shadow(9, 22, 50)
    return ret(s, 1, 1, solid=False)


def mat(col):
    base = c("#ee6a5a") if col == "red" else c("#58a0f0")
    s = S(2 * T, 29 + PAD)
    s.rr(0, 6, 63, 27, c("#ffd96a"), ol_of(c("#e0a020")), 3)            # 옆면
    s.rr(0, 0, 63, 20, base, ol_of(base), 4, hi=lighten(base, 0.5))      # 윗면
    for x in (14, 32, 50):
        s.line((x, 3), (x, 17), shade(base, 0.82))
    s.line((3, 12), (60, 12), lighten(base, 0.25))
    s.shadow(2, 61, 54)
    return ret(s, 2, 1, solid=False)


def hoop():
    s = S(2 * T, 110 + PAD)
    s.rr(14, 0, 49, 25, c("#ffffff"), c("#7480a8"), 3)
    s.rr(26, 8, 37, 17, c("#ffffff"), c("#ee4a42"), 0)
    s.r(15, 22, 48, 24, c("#dfe5f3"))
    s.line((24, 26), (39, 26), c("#ff6a2a"))
    s.r(24, 26, 39, 27, c("#ff6a2a"))
    for x in range(26, 38, 3):
        s.line((x, 28), (x + 1, 34), c("#ffffff"))
    s.line((26, 28), (28, 35), c("#ffffff")); s.line((37, 28), (35, 35), c("#ffffff"))
    s.r(30, 27, 33, 100, c("#9aa3b8"))
    s.r(30, 27, 31, 100, c("#c8d0e4"))
    s.r(33, 27, 33, 100, c("#6b7699"))
    s.rr(15, 92, 48, 109, c("#4f6ed0"), ol_of(c("#4f6ed0")), 3, hi=c("#8aa4f0"))
    s.shadow(12, 51, 60)
    return ret(s, 2, 1)


def hoop_end(top):
    """세로 코트 끝에 달린 농구 골대 (가로 2칸). top=True: 위쪽 끝(백보드가 위), False: 아래쪽 끝(백보드가 아래)."""
    W, H = 2 * T, 40
    s = S(W, H + PAD)
    board, rim = c("#ffffff"), c("#ff6a2a")
    def net(y0):
        for x in range(24, 41, 4):
            s.line((x, y0), (x + 1 if x < 32 else x - 1, y0 + 8), c("#f4f6ff"))
        s.line((24, y0 + 3), (40, y0 + 3), c("#dfe6f4")); s.line((26, y0 + 6), (38, y0 + 6), c("#dfe6f4"))
    if top:
        s.rr(14, 0, 49, 15, board, c("#7480a8"), 3)
        s.rr(26, 4, 37, 11, board, c("#ee4a42"), 0)
        s.r(24, 16, 39, 17, rim)
        net(18)
        s.r(14, 14, 49, 15, c("#dfe5f3"))
        s.rr(29, 26, 34, 30, c("#9aa3b8"), None, 0)
    else:
        net(2)
        s.r(24, 12, 39, 13, rim)
        s.rr(14, 15, 49, 30, board, c("#7480a8"), 3)
        s.rr(26, 19, 37, 26, board, c("#ee4a42"), 0)
        s.r(15, 27, 48, 29, c("#dfe5f3"))
    s.shadow(12, 51, 34)
    return ret(s, 2, 1)


def door_room(label, col):
    """체육관 옆 작은 방(준비실 등)의 문. 위에 이름표가 붙어 있어요. (가로 2칸, 세로 2칸)"""
    s = S(2 * T, 2 * T)
    wood, fo = c("#d9955a"), c("#6e4326")
    s.rr(2, 8, 61, 63, c("#f6c08a"), fo, 2)                                    # 문틀
    s.rr(6, 12, 57, 63, wood, fo, 2, hi=c("#f6c08a"))                          # 문짝
    s.rr(11, 17, 52, 32, c("#bfe8ff"), c("#6a8aa8"), 1)                        # 유리창
    s.line((14, 29), (22, 20), c("#ffffff"))
    s.rr(11, 37, 52, 59, shade(wood, 0.92), shade(wood, 0.65), 1)              # 아래 판넬
    s.r(47, 44, 49, 52, c("#ffd96a"))                                           # 손잡이
    base = c("#" + col)
    t = text_image(label, c("#ffffff"), FONT9, 9)
    pw = max(24, t.width + 10)
    s.rr(32 - pw // 2, 0, 32 + pw // 2, 11, base, ol_of(base), 2, hi=lighten(base, 0.35))
    s.paste(t, 32 - t.width // 2, 1)
    return decor_ret(s, 2, 2)


def goal(n):
    W = n * T
    s = S(W, 58 + PAD)
    s.rr(0, 0, W - 1, 57, c("#f6f8ff"), None, 1)
    for x in range(2, W - 2, 4):
        s.line((x, 3), (x, 54), c("#dfe6f4"))
    for y in range(4, 54, 4):
        s.line((2, y), (W - 3, y), c("#dfe6f4"))
    s.r(0, 0, W - 1, 3, c("#ffffff")); s.line((0, 3), (W - 1, 3), c("#aab4d0"))
    s.r(0, 0, 3, 57, c("#ffffff")); s.r(W - 4, 0, W - 1, 57, c("#ffffff"))
    s.line((3, 0), (3, 57), c("#aab4d0")); s.line((W - 4, 0), (W - 4, 57), c("#aab4d0"))
    s.shadow(0, W - 1, 56)
    return ret(s, n, 1)


def taegukgi(w, h):
    """태극기 (작은 도트 버전)."""
    s = S(w, h)
    s.rr(0, 0, w - 1, h - 1, c("#ffffff"), c("#9a9ab0"), 1)
    cx, cy, r = w // 2, h // 2, max(3, h // 4)
    s.ell(cx - r, cy - r, cx + r, cy + r, c("#3a5fd0"))
    s.d.pieslice([cx - r, cy - r, cx + r, cy + r], 180, 360, fill=c("#ee4a42"))
    k = c("#2a2a3a")
    for (x, y) in ((2, 2), (w - 5, 2), (2, h - 4), (w - 5, h - 4)):
        s.r(x, y, x + 2, y, k)
        s.r(x, y + 2, x + 2, y + 2, k)
    return s.im


def flagpole():
    s = S(T, 130 + PAD)
    s.r(15, 6, 16, 126, c("#c8d0e4"))
    s.r(15, 6, 15, 126, c("#ffffff"))
    s.ell(13, 1, 18, 6, c("#ffd96a"), c("#a87a20"))
    s.paste(taegukgi(22, 15), 17, 8)
    s.rr(10, 124, 21, 130, c("#7a86a8"), ol_of(c("#7a86a8")), 2, hi=c("#b0bad4"))
    s.shadow(8, 23, 54)
    return ret(s, 1, 1)


def flagstand():
    s = S(T, 66 + PAD)
    s.r(15, 12, 16, 60, c("#e8c24a"))
    s.ell(13, 5, 18, 10, c("#ffd96a"), c("#a87a20"))
    s.rr(16, 12, 30, 34, c("#3f8a5a"), ol_of(c("#3f8a5a")), 2, hi=c("#6fc68a"))
    s.ell(19, 17, 27, 29, c("#ffe68a"))
    s.rr(8, 58, 23, 65, c("#7a86a8"), ol_of(c("#7a86a8")), 2, hi=c("#b0bad4"))
    s.shadow(7, 24, 56)
    return ret(s, 1, 1)


def posterstand():
    s = S(T, 59 + PAD)
    s.r(7, 44, 9, 58, c("#9aa3b8"))
    s.r(22, 44, 24, 58, c("#9aa3b8"))
    s.rr(3, 0, 28, 46, c("#fff3c8"), c("#c8963a"), 3)
    s.rr(6, 4, 25, 17, c("#ffd96a"), None, 1)
    s.ell(12, 7, 19, 14, c("#ff8a2a"))
    for y in (22, 27, 32, 37):
        s.line((7, y), (24 - (y % 2) * 5, y), c("#c8b890"))
    s.shadow(5, 26, 54)
    return ret(s, 1, 1)


def signstone():
    s = S(3 * T, 38 + PAD)
    st, o = c("#c9c4b6"), c("#6a6454")
    s.rr(2, 2, 93, 37, st, o, 4, hi=c("#e6e2d6"))
    s.rr(2, 2, 93, 12, c("#e6e2d6"), o, 4)
    t = text_image("매홀중학교", c("#fff6d0"), FONT11B, 11, outline=c("#6a5a30"))
    s.paste(t, (96 - t.width) // 2, 17)
    s.shadow(2, 93, 58)
    return ret(s, 3, 1)


def stage(w, d):
    W, H = w * T, d * T
    s = S(W, H + PAD)
    wood, o = c("#f4c47a"), c("#7a4a2a")
    s.rr(0, 0, W - 1, H - 14, wood, o, 3, hi=c("#fff0c8"))
    for y in range(8, H - 18, 8):
        s.line((2, y), (W - 3, y), c("#e0a860"))
    s.rr(0, H - 18, W - 1, H - 1, c("#b87a44"), o, 2)                         # 앞면
    for i in range(w):
        s.rr(i * T + 3, H - 15, i * T + 28, H - 4, c("#d9955a"), c("#8a5a30"), 1)
    s.r(2, H - 18, W - 3, H - 17, c("#ee6a5a"))                               # 빨간 띠
    s.shadow(1, W - 2, 58)
    return ret(s, w, d)


def nook(w, d):
    """도서관 아치형 독서 공간: 나무 아치 + 양쪽 책장 + 소파."""
    W, H = w * T, 95
    s = S(W, H + PAD)
    wood, o = c("#f4c88c"), c("#8a5a30")
    s.rr(8, 28, W - 9, 93, c("#fff1d8"), None, 0)                            # 안쪽 바닥
    # 소파
    sofa, so = c("#efe4cc"), c("#a08860")
    s.rr(36, 46, W - 37, 86, sofa, so, 5, hi=c("#fff0f4"))
    s.rr(28, 56, 44, 90, lighten(sofa, 0.1), so, 4)
    s.rr(W - 45, 56, W - 29, 90, lighten(sofa, 0.1), so, 4)
    s.rr(44, 64, W - 45, 88, lighten(sofa, 0.35), so, 3)
    s.line((W // 2, 66), (W // 2, 86), c("#d8c8a4"))
    # 아치 기둥
    for x0 in (0, W - 30):
        s.rr(x0, 14, x0 + 29, 93, wood, o, 3)
        s.r(x0 + 2, 16, x0 + 27, 18, c("#fff0d0"))
        for r in range(5):
            y0 = 22 + r * 14
            books(s, x0 + 3, y0, x0 + 26, y0 + 11, 90 + r + x0, bg=c("#e8b878"))
            s.line((x0 + 3, y0 + 12), (x0 + 26, y0 + 12), shade(wood, 0.7))
    # 윗 보
    s.rr(0, 0, W - 1, 24, wood, o, 3, hi=c("#fff0d0"))
    for i in range(w * 2):
        x = 4 + i * (W - 8) // (w * 2)
        s.rr(x + 1, 6, x + (W - 8) // (w * 2) - 2, 20, c("#e8b070"), shade(wood, 0.6), 1)
    s.shadow(0, W - 1, 60)
    return ret(s, w, d)


def ovaltable(w):
    """도서관 타원형(양 끝이 둥근) 큰 책상. 위에 종이와 휴대폰이 놓여 있어요. (가로 w칸, 세로 2칸)"""
    W, H = w * T, 2 * T
    s = S(W, H + PAD)
    top, edge, o = c("#ebe5d8"), c("#cfc7b4"), c("#9a917c")
    s.rr(T, H - 12, W - T, H - 2, shade(edge, 0.82), o, 4)                       # 받침
    s.rr(0, 6, W - 1, H - 10, edge, o, 24)                                       # 두께
    s.rr(0, 0, W - 1, H - 18, top, o, 24, hi=c("#ffffff"))                       # 윗면
    for i in range(1, w - 1):                                                     # 종이
        x = 6 + i * (W - 12) // (w - 1) - 8
        y = 8 if i % 2 else H - 36
        s.rr(x, y, x + 15, y + 11, c("#ffffff"), c("#a8a8b8"), 1)
        for k in range(3):
            s.line((x + 2, y + 3 + k * 3), (x + 13, y + 3 + k * 3), c("#c8c8d8"))
    s.rr(W // 2 - 4, H // 2 - 14, W // 2 + 4, H // 2 - 5, c("#2a2a3e"), c("#16162a"), 1)   # 휴대폰
    s.shadow(4, W - 5, 58)
    return ret(s, w, 2)


def hstool():
    """창가 바 의자: 등받이 있는 높은 의자."""
    s = S(T, 44 + PAD)
    wood, leather = c("#b87a44"), c("#d99a64")
    s.line((8, 28), (4, 43), c("#c8ccd8")); s.line((24, 28), (28, 43), c("#c8ccd8"))
    s.line((10, 28), (10, 43), c("#a8acb8")); s.line((22, 28), (22, 43), c("#a8acb8"))
    s.r(8, 36, 24, 37, c("#a8acb8"))                                              # 발 받침
    s.rr(7, 2, 24, 17, leather, ol_of(leather), 3, hi=lighten(leather, 0.4))      # 등받이
    s.rr(6, 16, 25, 28, lighten(leather, 0.15), ol_of(leather), 4)                # 방석
    s.shadow(3, 28, 54)
    return ret(s, 1, 1)


def barcounter(n):
    W = n * T
    s = S(W, 38 + PAD)
    s.rr(0, 8, W - 1, 37, c("#d9955a"), c("#6e4326"), 3)
    s.rr(0, 0, W - 1, 14, c("#fbd9a0"), c("#8a5a30"), 3, hi=c("#fff4d8"))
    s.line((2, 16), (W - 3, 16), c("#b87a44"))
    for x in range(T, W, T):
        s.line((x, 18), (x, 34), c("#b87a44"))
    s.r(2, 33, W - 3, 35, c("#b87a44"))
    s.shadow(1, W - 2, 58)
    return ret(s, n, 1)


def libcounter(n):
    W = n * T
    s = S(W, 48 + PAD)
    s.rr(0, 16, W - 1, 47, c("#e4e8f6"), c("#6b7699"), 3)
    s.rr(0, 10, W - 1, 22, c("#ffffff"), c("#6b7699"), 3, hi=c("#ffffff"))
    for i in range(n):
        s.rr(i * T + 4, 27, i * T + 27, 42, c("#c8d0ea"), c("#8a94b4"), 2)
        s.r(i * T + 12, 31, i * T + 19, 32, c("#7480a8"))
    s.rr(8, 1, 24, 10, c("#3a4260"), c("#262c44"), 1)                          # 모니터
    s.r(10, 3, 22, 8, c("#58b8ff"))
    s.rr(W - 36, 12, W - 12, 18, c("#fff0b4"), c("#c8963a"), 1)
    s.shadow(1, W - 2, 58)
    return ret(s, n, 1)



# ================================================================ 벽 장식(decor)
def window(n, scene):
    W, H = n * T, 2 * T
    s = S(W, H)
    frame, fo = c("#f0f4fc"), c("#6b76a0")
    s.rr(1, 3, W - 2, H - 7, frame, fo, 2)
    pw = (W - 6) // n
    for i in range(n):
        x0, x1 = 3 + i * pw, 3 + (i + 1) * pw - 3
        y0, y1 = 6, H - 13
        if scene == "glass":                                    # 건물 바깥 유리창
            for y in range(y0, y1 + 1):
                s.line((x0, y), (x1, y), mix(c("#7ac8ff"), c("#2f7ad0"), (y - y0) / (y1 - y0)))
            s.line((x0 + 3, y1 - 2), (x0 + 11, y0 + 3), c("#d6f0ff"))
            s.line((x0 + 6, y1 - 2), (x0 + 14, y0 + 3), c("#b0e0ff"))
            s.line((x0, (y0 + y1) // 2), (x1, (y0 + y1) // 2), frame)
        else:                                                   # 운동장이 보이는 창
            for y in range(y0, y1 + 1):
                s.line((x0, y), (x1, y), mix(c("#8fd4ff"), c("#e4f6ff"), (y - y0) / (y1 - y0)))
            s.ell(x0 + 3, y0 + 3, x0 + 14, y0 + 9, c("#ffffff"))
            s.ell(x0 + 9, y0 + 2, x0 + 20, y0 + 8, c("#ffffff"))
            gy = y1 - 9
            s.r(x0, gy, x1, y1, c("#f0d890"))
            for k in range(4):
                bx = x0 + 2 + k * 7
                if bx + 8 <= x1:
                    s.ell(bx, gy - 4, bx + 8, gy + 3, c("#58c070"), c("#3a9a52"))
            if scene == "blind":                                  # 블라인드를 반쯤 내려요
                s.r(x0, y0, x1, y0 + (y1 - y0) * 2 // 3, c("#fffaf0"))
                for yy in range(y0 + 2, y0 + (y1 - y0) * 2 // 3, 3):
                    s.line((x0, yy), (x1, yy), c("#ece4d0"))
                s.r(x0, y0 + (y1 - y0) * 2 // 3, x1, y0 + (y1 - y0) * 2 // 3 + 1, c("#c8b890"))
                s.r((x0 + x1) // 2, y0 + (y1 - y0) * 2 // 3 + 2, (x0 + x1) // 2, y0 + (y1 - y0) * 2 // 3 + 5, c("#c8b890"))
        s.d.rectangle([x0, y0, x1, y1], outline=fo)
    s.rr(0, H - 8, W - 1, H - 4, c("#fffaf0"), fo, 1)
    return decor_ret(s, n, 2)


def blackboard(n, text):
    W, H = n * T, 58
    s = S(W, H)
    fo = c("#6b76a0")
    s.rr(0, 0, W - 1, H - 12, c("#d6dcec"), fo, 3, hi=c("#ffffff"))            # 틀
    s.rr(4, 4, W - 5, H - 16, c("#2f9a66"), c("#1a6a44"), 2)
    for yy in range(5, H - 17):
        s.line((5, yy), (W - 6, yy), mix(c("#38a874"), c("#278a5a"), (yy - 5) / (H - 22)))
    s.line((12, 11), (30, 12), c("#6fcf9a"))
    s.line((W - 36, H - 24), (W - 14, H - 25), c("#6fcf9a"))
    t = text_image(text, c("#fff8e0"), FONT11B, 11)
    s.paste(t, (W - t.width) // 2, (H - 16 - t.height) // 2 + 1)
    s.px(16, 40, c("#ffd96a")); s.px(17, 41, c("#ffd96a")); s.px(15, 41, c("#ffd96a"))
    s.rr(6, H - 11, W - 7, H - 6, c("#e8c890"), c("#8a6a3a"), 1)                 # 분필 받침
    s.rr(14, H - 12, 22, H - 10, c("#ffffff"), None, 0)
    s.rr(W - 40, H - 13, W - 28, H - 9, c("#b07a4a"), c("#6e4326"), 1)
    return decor_ret(s, n, 2)


def bulletin(n):
    W, H = n * T, 44
    s = S(W, H)
    s.rr(0, 0, W - 1, H - 1, c("#c98a52"), c("#6e4326"), 2)
    s.r(2, 2, W - 3, H - 3, c("#3f9a6a"))
    notes = [("#ffffff", 4, 5), ("#ffe68a", 17, 8), ("#ffc8d8", 32, 5), ("#c8e8ff", 44, 9)]
    for (col, x, y) in notes[: max(2, n * 2)]:
        s.rr(x, y, x + 9, y + 13, c(col), ol_of(c(col), 0.8), 1)
        s.r(x + 4, y - 1, x + 5, y, c("#ee4a42"))
        s.line((x + 2, y + 4), (x + 7, y + 4), c("#b0a890"))
        s.line((x + 2, y + 7), (x + 7, y + 7), c("#b0a890"))
    return decor_ret(s, n, 1.375)


POSTERS = {"water": ("음수대", "#d8ecff", "#3a6ab8"), "gupsik": ("급식 질서", "#f1fadc", "#3f8a5a"),
           "libguide": ("도서관 이용 안내", "#fff3d0", "#b0701a")}


def poster(key):
    title, bg, fg = POSTERS[key]
    t = text_image(title, c(fg), FONT9, 9)
    W = max(36, t.width + 12)
    s = S(W, 50)
    s.rr(0, 0, W - 1, 49, c(bg), ol_of(c(fg), 0.7), 2, hi=c("#ffffff"))
    s.paste(t, (W - t.width) // 2, 5)
    for i in range(3):
        s.line((6, 19 + i * 5), (W - 7 - (i % 2) * 8, 19 + i * 5), mix(c(bg), c(fg), 0.35))
    s.ell(W // 2 - 6, 33, W // 2 + 6, 45, mix(c(bg), c(fg), 0.45), ol_of(c(fg), 0.8))
    s.ell(W // 2 - 3, 36, W // 2 + 3, 42, mix(c(bg), c("#ffffff"), 0.5))
    return decor_ret(s, W / T, 1.5625)


def clock():
    s = S(28, 28)
    s.ell(0, 0, 27, 27, c("#ffffff"), c("#6b76a0"))
    s.ell(2, 2, 25, 25, c("#fffdf6"), c("#c8cee4"))
    for (x, y) in ((13, 3), (13, 23), (3, 13), (23, 13)):
        s.r(x, y, x + 1, y + 1, c("#3a3a52"))
    s.line((14, 14), (14, 7), c("#3a3a52"))
    s.line((14, 14), (19, 16), c("#3a3a52"))
    s.line((14, 14), (9, 19), c("#ee4a42"))
    s.px(14, 14, c("#3a3a52"))
    return decor_ret(s, 0.875, 0.875)


def flagwall():
    s = S(40, 32)
    s.rr(0, 0, 39, 31, c("#d9955a"), c("#6e4326"), 2, hi=c("#f6c08a"))
    s.paste(taegukgi(32, 22), 4, 5)
    return decor_ret(s, 1.25, 1)


def door_class(label):
    s = S(2 * T, 2 * T)
    wood, fo = c("#d9955a"), c("#6e4326")
    s.rr(2, 8, 61, 63, c("#f6c08a"), fo, 2)                                    # 문틀
    for x0 in (5, 33):
        s.rr(x0, 12, x0 + 25, 63, wood, fo, 2, hi=c("#f6c08a"))
        s.rr(x0 + 4, 16, x0 + 21, 32, c("#bfe8ff"), c("#6a8aa8"), 1)           # 유리
        s.line((x0 + 6, 28), (x0 + 12, 19), c("#ffffff"))
        s.rr(x0 + 4, 37, x0 + 21, 59, shade(wood, 0.92), shade(wood, 0.65), 1)  # 아래 판넬
    s.r(31, 12, 32, 63, shade(wood, 0.6))
    s.r(28, 38, 29, 46, c("#ffd96a")); s.r(34, 38, 35, 46, c("#ffd96a"))
    t = text_image(label, c("#ffffff"), FONT9, 9)
    s.rr(20, 0, 43, 11, c("#3f8a5a"), ol_of(c("#3f8a5a")), 2, hi=c("#6fc68a"))
    s.paste(t, 32 - t.width // 2, 1)
    return decor_ret(s, 2, 2)


def sign_hang(text, col):
    base = c("#" + col)
    t = text_image(text, c("#ffffff"), FONT11B, 11, outline=shade(base, 0.5))
    W, H = t.width + 10, 19
    s = S(W, H)
    s.rr(0, 0, W - 1, H - 1, base, ol_of(base), 4, hi=lighten(base, 0.35))
    s.paste(t, 5, 2)
    return decor_ret(s, W / T, H / T)


def facade_sign(text):
    t = text_image(text, c("#fff6d0"), FONT11B, 11, outline=c("#6a4020"))
    W, H = t.width + 28, 26
    s = S(W, H)
    s.rr(0, 2, W - 1, H - 3, c("#a86a3c"), c("#4a2a14"), 6, hi=c("#e0a870"))
    s.rr(2, 4, W - 3, H - 5, c("#c98a52"), None, 5)
    s.line((5, 5), (W - 6, 5), c("#f0c088"))
    s.paste(t, (W - t.width) // 2, (H - t.height) // 2)
    return decor_ret(s, W / T, H / T)


def banner(text, n):
    W, H = n * T, 28
    s = S(W, H)
    s.rr(0, 0, W - 1, H - 1, c("#3a5fb0"), c("#1f3a70"), 3, hi=c("#6f8ff0"))
    s.r(3, 3, W - 4, 5, c("#ffd96a"))
    s.r(3, H - 6, W - 4, H - 4, c("#ffd96a"))
    s.r(3, 6, 8, H - 7, c("#4fd0b0")); s.r(W - 9, 6, W - 4, H - 7, c("#4fd0b0"))
    t = text_image(text, c("#ffffff"), FONT11B, 11, outline=c("#1f3a70"))
    s.paste(t, (W - t.width) // 2, (H - t.height) // 2)
    return decor_ret(s, n, 28 / T)


def curtain(n):
    W, H = n * T, 2 * T
    s = S(W, H)
    s.r(0, 0, W - 1, H - 1, c("#3a2a46"))
    cw = max(24, W // 4)
    red, ro = c("#d8504a"), c("#7a2024")
    for x0 in (0, W - cw):
        s.rr(x0, 0, x0 + cw - 1, H - 1, red, ro, 2)
        for k in range(x0 + 4, x0 + cw - 2, 6):
            s.line((k, 3), (k, H - 3), shade(red, 0.8))
            s.line((k + 2, 3), (k + 2, H - 3), lighten(red, 0.18))
    s.r(0, 0, W - 1, 3, c("#ffd96a"))
    for x in range(3, W - 2, 6):
        s.px(x, 1, c("#fff6c0"))
    s.paste(taegukgi(34, 23), (W - 34) // 2, 14)
    return decor_ret(s, n, 2)


def kitchen(n):
    """급식실 조리 공간: 뒤쪽 벽 + 조리사 두 분."""
    W, H = n * T, 2 * T
    s = S(W, H)
    s.rr(0, 0, W - 1, H - 1, c("#8a96b6"), c("#4a5478"), 2)
    for yy in range(2, H - 2):
        s.line((2, yy), (W - 3, yy), mix(c("#a8b4d0"), c("#7a86a8"), yy / H))
    for x in range(8, W - 30, 56):
        s.rr(x, 6, x + 26, 18, c("#c9d0e2"), c("#6b7699"), 1)                   # 환풍기
        for k in range(3):
            s.line((x + 3, 9 + k * 3), (x + 23, 9 + k * 3), c("#8a94b4"))
    for x in range(10, W - 24, 28):                                              # 선반 위 냄비들
        col = [c("#ffb43a"), c("#7ad27a"), c("#58a0f0"), c("#ee6a5a")][(x // 28) % 4]
        s.rr(x, 30, x + 18, 40, col, ol_of(col), 3, hi=lighten(col, 0.4))
        s.r(x + 7, 28, x + 11, 30, c("#4a5478"))
    s.r(2, 41, W - 3, 42, c("#6b7699"))
    for x in range(4, W - 4, 8):                                                 # 걸린 조리도구
        s.r(x, 3, x, 6, c("#4a5478"))
    for cx in (int(W * 0.27), int(W * 0.73)):                                    # 배식대 2개 = 조리사 두 분
        _cook(s, cx, 14)
    for x in range(0, W, 16):                                                    # 아래 타일 띠
        s.r(x, H - 8, x + 7, H - 1, c("#e4ecfa") if (x // 16) % 2 == 0 else c("#cfd8ee"))
    s.r(0, H - 9, W - 1, H - 9, c("#6b7699"))
    return decor_ret(s, n, 2)


def _cook(s, x, y):
    skin, hat = c("#ffd8b8"), c("#ffffff")
    s.rr(x - 9, y, x + 9, y + 7, hat, c("#aab0c8"), 3, hi=c("#ffffff"))         # 모자
    s.rr(x - 8, y + 6, x + 8, y + 17, skin, ol_of(skin, 0.6), 4)               # 얼굴
    s.r(x - 5, y + 11, x + 5, y + 16, c("#ffffff"))                            # 마스크
    s.r(x - 5, y + 9, x - 4, y + 10, c("#2a1f2d")); s.r(x + 4, y + 9, x + 5, y + 10, c("#2a1f2d"))
    s.rr(x - 10, y + 18, x + 10, y + 36, c("#ff9ab8"), ol_of(c("#ff9ab8")), 4, hi=c("#ffc8d8"))  # 앞치마
    s.rr(x - 14, y + 22, x - 9, y + 28, skin, None, 1)
    s.rr(x + 9, y + 22, x + 14, y + 28, skin, None, 1)


def fan():
    s = S(30, 35)
    s.rr(13, 26, 17, 34, c("#9aa3b8"), None, 1)
    s.ell(1, 1, 28, 28, c("#e4ecfa"), c("#6b76a0"))
    for (x0, y0, x1, y1) in ((14, 4, 18, 14), (8, 16, 14, 25), (17, 15, 25, 21)):
        s.ell(x0 + 1, y0, x1 + 1, y1, c("#8ec8ff"), c("#4a7ab8"))
    s.ell(12, 12, 17, 17, c("#4a5478"))
    return decor_ret(s, 0.9375, 1.09375)


def tv():
    s = S(60, 39)
    s.rr(0, 0, 59, 28, c("#3a3a52"), c("#16162a"), 2)
    s.rr(3, 3, 56, 25, c("#25283e"), None, 1)
    s.line((10, 22), (22, 6), c("#4a4e72"))
    s.line((13, 22), (25, 6), c("#3a3e5e"))
    s.r(26, 29, 33, 33, c("#6b7699"))
    s.rr(20, 33, 39, 36, c("#8a94b4"), c("#4a5478"), 1)
    return decor_ret(s, 1.875, 1.21875)


def truss(n):
    W = n * T
    s = S(W, 20)
    wood, o = c("#a86a3c"), c("#4a2a14")
    s.rr(0, 12, W - 1, 19, wood, o, 1)
    for x in range(0, W - 32, 32):
        s.poly([(x, 13), (x + 16, 2), (x + 32, 13)], None, o)
        s.line((x, 13), (x + 16, 3), wood)
        s.line((x + 16, 3), (x + 32, 13), wood)
    return decor_ret(s, n, 0.625)


def gate(orient, size, open_):
    if orient == "v":
        W, H = T, size * T
    else:
        W, H = size * T, T
    s = S(W, H)
    stripe_a, stripe_b = c("#ffd23a"), c("#3a3a52")
    if open_:
        # 열림: 양 끝 기둥만 남아요
        if orient == "v":
            s.rr(4, 2, 27, 11, stripe_a, ol_of(stripe_a), 2)
            s.rr(4, H - 12, 27, H - 3, stripe_a, ol_of(stripe_a), 2)
            s.r(14, 14, 17, 17, c("#5cf0a0"))
        else:
            s.rr(2, 4, 11, 27, stripe_a, ol_of(stripe_a), 2)
            s.rr(W - 12, 4, W - 3, 27, stripe_a, ol_of(stripe_a), 2)
            s.r(14, 14, 17, 17, c("#5cf0a0"))
            s.px(W - 16, 15, c("#5cf0a0"))
        return decor_ret(s, W / T, H / T)
    s.rr(1, 1, W - 2, H - 2, c("#c9d0e2"), c("#4a5478"), 3)
    inner = (4, 4, W - 5, H - 5)
    s.r(*inner, stripe_a)
    for k in range(-H, W + H, 10):
        for t in range(0, 5):
            for yy in range(inner[1], inner[3] + 1):
                xx = k + t + (yy - inner[1])
                if inner[0] <= xx <= inner[2]:
                    s.px(xx, yy, stripe_b)
    cx, cy = W // 2, H // 2
    s.rr(cx - 8, cy - 9, cx + 8, cy + 9, c("#fff6dc"), c("#8a6a2a"), 3)         # 자물쇠 판
    s.d.arc([cx - 4, cy - 8, cx + 4, cy + 1], 180, 360, fill=c("#7a5a10"), width=2)
    s.rr(cx - 5, cy - 1, cx + 5, cy + 7, c("#ffc83a"), c("#7a5a10"), 1)
    s.r(cx, cy + 2, cx, cy + 4, c("#5a3a10"))
    return decor_ret(s, W / T, H / T)


def get_decor(name):
    m = re.fullmatch(r"window_(\d+)_(\w+)", name)
    if m:
        return window(int(m[1]), m[2])
    m = re.fullmatch(r"blackboard_(\d+)_(.*)_steel", name)
    if m:
        return blackboard(int(m[1]), m[2].replace("~", " "))
    m = re.fullmatch(r"bulletin_(\d+)", name)
    if m:
        return bulletin(int(m[1]))
    m = re.fullmatch(r"poster_(\w+)", name)
    if m:
        return poster(m[1])
    if name == "clock":
        return clock()
    if name == "flagwall":
        return flagwall()
    m = re.fullmatch(r"doorclass_(.+)", name)
    if m:
        return door_class("본관" if m[1] == "본관" else m[1])
    m = re.fullmatch(r"signhang_(.+)_([0-9a-f]{6})", name)
    if m:
        return sign_hang(m[1], m[2])
    m = re.fullmatch(r"facadesign_(.+)", name)
    if m:
        return facade_sign(m[1])
    m = re.fullmatch(r"banner_(.+)_(\d+)", name)
    if m:
        return banner(m[1].replace("~", " "), int(m[2]))
    m = re.fullmatch(r"curtain_(\d+)", name)
    if m:
        return curtain(int(m[1]))
    m = re.fullmatch(r"kitchen_(\d+)", name)
    if m:
        return kitchen(int(m[1]))
    if name == "fan":
        return fan()
    if name == "tv":
        return tv()
    m = re.fullmatch(r"truss_(\d+)", name)
    if m:
        return truss(int(m[1]))
    m = re.fullmatch(r"gate_([vh])(\d+)_(open|closed)", name)
    if m:
        return gate(m[1], int(m[2]), m[3] == "open")
    raise KeyError(name)


# ---------------------------------------------------------------- 운동장: 관중석 / 계단 / 구령대 / 본관 입구
def stand(w=4, d=3):
    """햇빛 가리개(차양)가 있는 관중석. 앞에서 본 3단 좌석."""
    W, H = w * T, 38 + d * T + 4
    s = S(W, H + PAD)
    ink = c("#3a4a8a")
    # 좌석 3단 (뒤쪽 단이 위)
    seat_cols = ["#58a0f0", "#ffb43a", "#58a0f0", "#ff6a6a"]
    for t in range(3):
        y0 = 40 + t * 30
        s.rr(5, y0, W - 6, y0 + 9, c("#aeb8d8"), ol_of(c("#aeb8d8")), 1)              # 뒷 단의 앞면
        s.rr(5, y0 + 8, W - 6, y0 + 20, c("#dfe5f6"), ol_of(c("#aeb8d8")), 1)          # 바닥(앉는 층)
        for i, x in enumerate(range(8, W - 20, 16)):
            col = c(seat_cols[(i + t) % 4])
            s.rr(x, y0 + 9, x + 12, y0 + 19, col, ol_of(col), 2, hi=lighten(col, 0.45))
        s.r(6, y0 + 20, W - 7, y0 + 29, c("#c4cce4"))                                   # 단 앞 기둥면
        s.line((6, y0 + 20), (W - 7, y0 + 20), c("#e8ecfa"))
    # 양옆 난간
    for x0 in (0, W - 6):
        s.rr(x0, 36, x0 + 5, H - 8, c("#8f9bc4"), ol_of(c("#8f9bc4")), 1)
    # 차양 기둥
    for x0 in (3, W - 5):
        s.r(x0, 26, x0 + 1, H - 6, c("#6b7699"))
    # 차양 (파랑/흰 줄무늬)
    s.rr(0, 0, W - 1, 24, c("#ffffff"), ink, 4, hi=c("#ffffff"))
    for x in range(0, W, 16):
        s.r(x + 1, 2, x + 8, 22, c("#58a0f0"))
        s.r(x + 1, 2, x + 8, 3, c("#9ad0ff"))
    s.rr(0, 20, W - 1, 24, c("#3a6ac8"), ink, 1)
    for x in range(0, W, 16):                                                           # 물결 모양 끝
        s.ell(x + 1, 22, x + 14, 33, c("#ffffff") if (x // 16) % 2 else c("#58a0f0"), ink)
    s.shadow(3, W - 4, 60)
    return ret(s, w, d)


def stairs(w=2, d=3):
    """운동장에서 단상(본관 앞)으로 올라가는 계단. 걸어서 올라갈 수 있어요."""
    W, H = w * T, d * T
    s = S(W, H)
    n = 4
    sh = H // n
    for i in range(n):
        y0 = i * sh
        s.rr(5, y0, W - 6, y0 + sh - 1, c("#cfcbe0"), c("#7a76a0"), 1)                 # 계단 앞면
        s.rr(5, y0, W - 6, y0 + sh - 9, c("#f4f1fa"), None, 1, hi=c("#ffffff"))        # 밟는 면
        s.r(6, y0 + sh - 10, W - 7, y0 + sh - 9, c("#ffd23a"))                         # 노란 안전선
    for x0 in (0, W - 4):                                                               # 손잡이 난간
        s.rr(x0, 0, x0 + 3, H - 1, c("#8f9bc4"), ol_of(c("#8f9bc4")), 1)
        for yy in (6, H // 2, H - 8):
            s.r(x0, yy, x0 + 3, yy + 2, c("#6b7699"))
    return decor_ret(s, w, d)


def podium(w=4, d=3):
    """구령대: 운동장 앞 단상."""
    W, H = w * T, 112
    s = S(W, H + PAD)
    conc, o = c("#d9d4e6"), c("#6f6a96")
    # 앞 계단
    for i in range(3):
        s.rr(40 - i * 3, 92 + i * 6, W - 41 + i * 3, 97 + i * 6, c("#f4f1fa"), o, 1)
        s.r(42 - i * 3, 92 + i * 6, W - 43 + i * 3, 92 + i * 6, c("#ffffff"))
    # 단상 앞면
    s.rr(4, 62, W - 5, 92, conc, o, 2)
    for i in range(3):
        x = 12 + i * 38
        s.rr(x, 68, x + 30, 86, shade(conc, 0.93), shade(conc, 0.7), 1)
    s.r(4, 88, W - 5, 91, shade(conc, 0.78))
    # 단상 윗면
    s.rr(4, 22, W - 5, 62, c("#f4eee2"), o, 3, hi=c("#ffffff"))
    s.line((10, 28), (W - 11, 28), c("#e2d8c4"))
    # 연설대
    s.rr(54, 30, 74, 56, c("#c98a52"), ol_of(c("#c98a52")), 2, hi=c("#e8b078"))
    s.r(58, 34, 70, 36, c("#e8b078"))
    s.line((64, 29), (64, 24), c("#4a4a62")); s.ell(62, 21, 66, 25, c("#4a4a62"))
    # 양쪽 깃발
    for (x, flag) in ((16, "kr"), (W - 17, "sc")):
        s.r(x, 2, x + 1, 50, c("#c8d0e4"))
        s.ell(x - 1, 0, x + 2, 3, c("#ffd96a"))
        if flag == "kr":
            s.paste(taegukgi(22, 15), x + 2, 4)
        else:
            s.rr(x - 21, 4, x - 1, 19, c("#3f8a5a"), ol_of(c("#3f8a5a")), 1)
            s.ell(x - 15, 8, x - 7, 16, c("#ffe68a"))
    s.shadow(3, W - 4, 60)
    return ret(s, w, d)


def rtable(w, rows, top, tray=False):
    """급식실 가로 식탁 한 줄(세로 2칸): 가로로 긴 식탁의 위·아래 긴 쪽에 한 칸마다 주황색 둥근 일체형 의자가 붙어 있어요. (가로 w칸)
    rows 를 늘리면 식탁 사이에 의자 줄을 함께 쓰는 식탁 묶음이 돼요."""
    S_BAND, T_BAND = 20, 24                                                  # 의자 줄 높이, 식탁 줄 높이(픽셀)
    px = (rows + 1) * S_BAND + rows * T_BAND
    d = -(-px // T)                                                           # 세로 칸 수 (올림)
    W, H = w * T, d * T
    s = S(W, H + PAD)
    tcol = {"cream": "#f8f0dc", "mint": "#d8f6e6", "peach": "#ffe4d0"}[top]
    t, to = c(tcol), c("#8a7a5a")
    orange = c("#ff9a3c")
    arm = c("#9aa3b8")

    def stool_row(y0):                                                        # 의자 한 줄 (식탁에 팔로 붙어 있어요)
        for i in range(w):
            cx = 16 + i * T
            s.rr(cx - 2, y0 - 3, cx + 1, y0 + 20, arm, None, 0)
            s.ell(cx - 9, y0 + 6, cx + 9, y0 + 17, shade(orange, 0.78), ol_of(orange))      # 옆면
            s.ell(cx - 9, y0 + 3, cx + 9, y0 + 14, orange, ol_of(orange))                   # 윗면
            s.ell(cx - 5, y0 + 5, cx, y0 + 9, lighten(orange, 0.5))

    def table(y0, k):
        s.rr(4, y0, W - 5, y0 + 15, t, to, 4, hi=c("#ffffff"))                # 식탁 윗면
        s.rr(4, y0 + 13, W - 5, y0 + 23, shade(t, 0.82), to, 2)               # 식탁 앞쪽 두께
        s.r(6, y0 + 14, W - 7, y0 + 14, lighten(t, 0.3))
        if tray:                                                               # 식판
            for j in range(1 + k % 2, w - 1, 2):
                x0 = 8 + j * T
                s.rr(x0, y0 + 3, x0 + 16, y0 + 12, c("#fdfbf4"), c("#a79bb8"), 2)
                s.rr(x0 + 2, y0 + 4, x0 + 7, y0 + 8, c("#ffffff"), c("#c0b8d0"), 1)
                s.rr(x0 + 9, y0 + 4, x0 + 14, y0 + 7, c("#ee5a4a"), None, 1)

    y = H - px                                                            # 맨 아래에 맞춰 그려요 (그림자가 바로 아래에 깔려요)
    for r in range(rows):
        stool_row(y); y += S_BAND
        table(y, r); y += T_BAND
    stool_row(y)
    s.shadow(4, W - 5, 56)
    return ret(s, w, d)


def lintel(n):
    """본관 입구 위에 걸린 간판 보."""
    W, H = n * T, 30
    s = S(W, H + PAD)
    s.rr(0, 0, W - 1, 12, c("#a86a3c"), c("#4a2a14"), 3, hi=c("#e0a870"))
    s.rr(2, 2, W - 3, 5, c("#c98a52"), None, 1)
    for x in (W // 2 - 44, W // 2 + 44):                                              # 매다는 줄
        s.r(x, 12, x + 1, 17, c("#6b7699"))
    t = text_image("매홀중학교 본관", c("#fff6d0"), FONT11B, 11, outline=c("#5a3a20"))
    pw = t.width + 18
    s.rr((W - pw) // 2, 16, (W + pw) // 2, 29, c("#c98a52"), c("#4a2a14"), 4, hi=c("#e8b078"))
    s.paste(t, (W - t.width) // 2, 18)
    s.shadow(4, W - 5, 36)
    return ret(s, n, 1, solid=False)



def get_sprite(name):
    m = re.fullmatch(r"chair_(\w+)_([ns])", name)
    if m:
        return chair(m.group(1), m.group(2))
    simple = {"desk": lambda: desk(), "desk_book": lambda: desk("book"), "desk_pencil": lambda: desk("pencil"),
              "desk_oak": lambda: desk("oak"), "desk_oak_book": lambda: desk("oakbook"), "desk_oak_pencil": lambda: desk("oakpencil"),
              "stool": stool, "hstool": hstool, "plant": plant, "tree": tree, "tdesk": tdesk, "cubby_x": cubby, "ac": ac,
              "tabcart": tabcart, "bin": bin_, "trash": trash, "fridge": fridge, "dispenser": dispenser,
              "purifier": purifier, "glasscab": glasscab, "speaker": speaker, "ballcart": ballcart,
              "bookcart": bookcart, "extinguisher": extinguisher, "cone": cone, "ball": ball,
              "hoop": hoop, "flagpole": flagpole, "flagstand": flagstand, "posterstand": posterstand,
              "signstone": signstone, "nook": lambda: nook(5, 2), "hoop_top": lambda: hoop_end(True), "hoop_bot": lambda: hoop_end(False),
              "mat_red": lambda: mat("red"), "mat_blue": lambda: mat("blue"),
              "stand_4x3": stand, "podium_4x3": podium, "stairs_2x3": stairs}
    if name in simple:
        return simple[name]()
    pats = [(r"table_(\d+)x(\d+)_(\w+?)(_tray)?", lambda m: table(int(m[1]), int(m[2]), m[3], bool(m[4]))),
            (r"otable_(\d+)x(\d+)", lambda m: otable(int(m[1]), int(m[2]))),
            (r"wshelf_(\d+)", lambda m: wshelf(int(m[1]))),
            (r"tshelf_(\d+)", lambda m: wshelf(int(m[1]), True)),
            (r"ovaltable_(\d+)", lambda m: ovaltable(int(m[1]))),
            (r"lockerbank_(\d+)", lambda m: lockerbank(int(m[1]))),
            (r"bush_(\d+)", lambda m: bush(int(m[1]))),
            (r"backpack_(\w+)", lambda m: backpack(m[1])),
            (r"steel_(\d+)", lambda m: steel_counter(int(m[1]))),
            (r"trophy_(\d+)", lambda m: trophy(int(m[1]))),
            (r"benchv_(\d+)", lambda m: benchv(int(m[1]))),
            (r"trophyv_(\d+)", lambda m: trophyv(int(m[1]))),
            (r"goal_(\d+)", lambda m: goal(int(m[1]))),
            (r"bench_(\d+)", lambda m: bench(int(m[1]))),
            (r"benchc_(\d+)", lambda m: bench(int(m[1]), True)),
            (r"barcounter_(\d+)", lambda m: barcounter(int(m[1]))),
            (r"libcounter_(\d+)", lambda m: libcounter(int(m[1]))),
            (r"rtable_(\d+)x(\d+)_(\w+?)(_tray)?", lambda m: rtable(int(m[1]), int(m[2]), m[3], bool(m[4]))),
            (r"stage_(\d+)x(\d+)", lambda m: stage(int(m[1]), int(m[2]))),
            (r"doorroom_(.+)_([0-9a-f]{6})", lambda m: door_room(m[1], m[2])),
            (r"lintel_(\d+)", lambda m: lintel(int(m[1])))]
    for pat, fn in pats:
        m = re.fullmatch(pat, name)
        if m:
            return fn(m)
    return get_decor(name)
