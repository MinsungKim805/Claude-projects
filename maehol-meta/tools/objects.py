"""ZEP식 탑다운 가구/소품 스프라이트 (고해상도: 타일 64px).

get_sprite(name) -> dict(img, w, d, pad, solid, ...)
  w, d  : 바닥에서 차지하는 칸 수(가로, 세로)
  pad   : 아래쪽 그림자 여백(픽셀)
  그림의 맨 아래(pad 제외)가 바닥 차지 영역의 아랫변이에요.
벽 장식은 decor.py 에 있어요.
"""
from pxlib import hexc, shade, lighten, darken, mix, text_image, FONT11, FONT11B, FONT9
from sp import S, ret, rnd, TILE, PAD

T = TILE
OUT = hexc("#2c2230")

# ------------------------------------------------------------------ 공통 색
WOOD = hexc("#d9a46d")          # 교실 책상 윗면
WOOD_D = hexc("#a9743f")
WOOD_E = hexc("#3b2b25")        # 책상 가장자리(검정에 가까운 갈색)
TIMBER = hexc("#c98d4e")
TIMBER_L = hexc("#e3ad6a")
TIMBER_D = hexc("#8a5530")
STEEL = hexc("#b9bfcc")
STEEL_D = hexc("#7d8396")
METAL = hexc("#8d92a2")
METAL_D = hexc("#5a6070")
CREAM = hexc("#e7dcc6")
CHAIR = {"grn": hexc("#8cc63f"), "red": hexc("#c4604f"), "yel": hexc("#e0b848"), "blu": hexc("#5f90c0"),
         "pur": hexc("#9272c0"), "gry": hexc("#9a9aa6"), "org": hexc("#e8902f"), "blk": hexc("#3a3a42"), "wht": hexc("#e8e6ea")}
SPINES = [hexc(c) for c in ("#7a3a2a", "#2f5a7a", "#3a6a4a", "#a07a3a", "#5a4a7a", "#c4b090", "#2a2a30", "#8a2a2a",
                            "#4a7a8a", "#6a8a3a", "#b0604a", "#d8c8a0", "#3a4a6a", "#8a6a4a")]


def books(s, x0, y0, x1, y1, seed, rows, board, back, tall=False):
    """서가 칸마다 책을 꽂아요. 칸(rows) 수만큼 가로 줄이 생겨요."""
    s.r(x0, y0, x1, y1, back)
    rh = (y1 - y0 + 1) // rows
    for r in range(rows):
        top = y0 + r * rh
        yb = top + rh - 1
        x = x0 + 2
        k = 0
        while x < x1 - 3:
            if rnd(seed, r * 53 + k, 4) > 0.94:      # 빈틈
                x += 5
                k += 1
                continue
            bw = 3 + int(rnd(seed, r * 53 + k, 1) * 4)
            bh = rh - 7 - int(rnd(seed, r * 53 + k, 2) * 9)
            col = SPINES[int(rnd(seed, r * 53 + k, 3) * len(SPINES))]
            xe = min(x1 - 2, x + bw - 1)
            s.r(x, yb - bh, xe, yb - 2, col)
            s.line((x, yb - bh), (x, yb - 2), lighten(col, 0.32))
            s.line((xe, yb - bh), (xe, yb - 2), shade(col, 0.7))
            if bw >= 5 and rnd(seed, r * 53 + k, 5) > 0.4:      # 책등 띠
                s.line((x + 1, yb - bh + 4), (xe - 1, yb - bh + 4), lighten(col, 0.5))
            x += bw
            k += 1
        s.r(x0, yb - 1, x1, yb, board)
        s.line((x0, yb - 1), (x1, yb - 1), lighten(board, 0.3))
    s.line((x0, y0), (x1, y0), shade(back, 0.6))


def wood_top(s, x0, y0, x1, y1, base, seed):
    s.r(x0, y0, x1, y1, base)
    s.grain(x0, y0, x1, y1, base, seed, 0.07, (12, 30))
    s.line((x0, y0), (x1, y0), lighten(base, 0.3))
    s.line((x0, y0), (x0, y1), lighten(base, 0.18))


# ====================================================================== 책걸상
def desk(variant=""):
    s = S(T, 64 + PAD)
    # 철제 다리와 아래 책 선반
    for lx in (11, 50):
        s.r(lx, 40, lx + 2, 59, METAL)
        s.line((lx + 2, 40), (lx + 2, 59), METAL_D)
        s.r(lx - 4, 58, lx + 6, 61, METAL_D)
    s.r(11, 51, 52, 53, METAL)
    s.line((11, 53), (52, 53), METAL_D)
    # 책상 윗면 (나무)
    s.rr(4, 6, 59, 36, WOOD_E, None, 4)
    wood_top(s, 6, 8, 57, 31, WOOD, 7)
    s.rr(4, 30, 59, 39, WOOD_E, None, 3)           # 앞쪽 검정 가장자리
    s.line((8, 32), (55, 32), hexc("#5a463c"))
    s.line((6, 8), (57, 8), lighten(WOOD, 0.5))
    # 윗면 사선 반짝임
    for k in range(3):
        s.line((14 + k * 5, 27), (22 + k * 5, 11), lighten(WOOD, 0.22))
    if variant == "book":
        s.rr(14, 12, 40, 26, hexc("#fff8e0"), hexc("#a09070"), 2)
        s.line((27, 13), (27, 25), hexc("#b0a070"))
        for k in range(3):
            s.line((17, 16 + k * 3), (25, 16 + k * 3), hexc("#a8a088"))
            s.line((30, 16 + k * 3), (38, 16 + k * 3), hexc("#a8a088"))
    elif variant == "pencil":
        s.rr(40, 13, 54, 20, hexc("#3a6aa8"), hexc("#1f3a64"), 2)
        s.line((43, 15), (51, 15), hexc("#8ab4e8"))
        s.line((20, 24), (34, 24), hexc("#e8c040"), 2)
    s.shadow(4, 60)
    return ret(s, 1, 1)


def chair(col, facing):
    c = CHAIR[col]
    hi, lo, ol = lighten(c, 0.36), shade(c, 0.7), shade(c, 0.36)
    s = S(T, 64 + PAD)
    if facing == "n":     # 북쪽을 보고 앉음 → 등받이 뒷면이 화면 쪽
        for lx in (16, 44):
            s.r(lx, 52, lx + 3, 63, METAL)
            s.line((lx + 3, 52), (lx + 3, 63), METAL_D)
            s.r(lx - 2, 61, lx + 5, 63, METAL_D)
        s.rr(11, 22, 52, 45, hi, ol, 6)                              # 방석 윗면
        s.rr(10, 34, 53, 60, c, ol, 7)                               # 등받이 바깥면
        s.line((14, 36), (49, 36), hi)
        s.line((12, 38), (12, 56), lighten(c, 0.2))
        s.line((51, 38), (51, 56), lo)
        s.rr(25, 43, 38, 50, hexc("#241e18"), None, 3)               # 손잡이 구멍
        s.line((27, 51), (36, 51), lighten(c, 0.3))
        s.line((14, 57), (49, 57), lo)
    else:                 # 남쪽(화면)을 보고 앉음 → 등받이 안쪽이 위
        s.rr(10, 3, 53, 28, c, ol, 7)
        s.rr(13, 6, 50, 24, lighten(c, 0.12), None, 5)
        s.line((16, 8), (47, 8), hi)
        s.rr(25, 11, 38, 17, shade(c, 0.5), None, 3)                  # 손잡이 구멍(안쪽)
        s.rr(11, 26, 52, 48, lighten(c, 0.14), ol, 6)                 # 방석 윗면
        s.line((15, 29), (48, 29), hi)
        s.rr(11, 44, 52, 52, c, ol, 4)                                # 방석 앞 가장자리
        for lx in (17, 43):
            s.r(lx, 52, lx + 3, 63, METAL)
            s.line((lx + 3, 52), (lx + 3, 63), METAL_D)
            s.r(lx - 2, 61, lx + 5, 63, METAL_D)
    s.shadow(10, 53, 44)
    return ret(s, 1, 1)


def stool():
    s = S(T, 64 + PAD)
    for lx in (18, 44):
        s.line((lx, 36), (lx - 4, 62), METAL, 2)
        s.line((lx + 3, 36), (lx + 5, 62), METAL_D, 2)
    s.line((16, 52), (49, 52), METAL, 2)
    s.ell(12, 20, 51, 42, hexc("#9a6a4a"), shade(hexc("#9a6a4a"), 0.45))
    s.ell(14, 20, 49, 36, hexc("#c4906a"))
    s.line((20, 24), (30, 22), hexc("#e4b896"))
    s.shadow(12, 52, 40)
    return ret(s, 1, 1)


def teacher_desk():
    s = S(2 * T, 76 + PAD)
    s.rr(3, 8, 124, 40, WOOD_E, None, 4)
    wood_top(s, 5, 10, 122, 34, hexc("#e2ad78"), 11)
    s.blk(3, 36, 124, 74, 6, hexc("#b57a44"), ol=hexc("#4a3020"), top=hexc("#b57a44"), front=hexc("#b88048"), hi=False)
    s.grain(5, 44, 122, 72, hexc("#b88048"), 12, 0.08)
    for i in range(2):                                           # 서랍 두 개
        x0 = 8 + i * 58
        s.rr(x0, 46, x0 + 52, 70, hexc("#c58e56"), hexc("#6a4426"), 3)
        s.rr(x0 + 18, 52, x0 + 34, 56, hexc("#e8d8a0"), hexc("#8a7a40"), 2)
        s.line((x0 + 4, 48), (x0 + 48, 48), lighten(hexc("#c58e56"), 0.3))
    # 책상 위 물건: 노트북, 종이, 연필꽂이
    s.rr(12, 12, 46, 27, hexc("#c8ccd8"), hexc("#5c6274"), 2)
    s.rr(15, 14, 43, 24, hexc("#3a5a8a"), None, 1)
    s.line((17, 16), (30, 16), hexc("#8ab4e8"))
    s.rr(54, 14, 78, 28, hexc("#fffbe8"), hexc("#a59a78"), 1)
    for k in range(3):
        s.line((57, 18 + k * 3), (74, 18 + k * 3), hexc("#b8b090"))
    s.rr(92, 12, 102, 26, hexc("#d9604f"), hexc("#7a2a22"), 2)
    s.line((95, 8), (95, 13), hexc("#3a6aa8"), 2)
    s.line((99, 7), (99, 13), hexc("#e8c040"), 2)
    s.rr(108, 16, 118, 27, hexc("#5f86aa"), hexc("#2e4a66"), 2)
    s.shadow(3, 124)
    return ret(s, 2, 1)


def table(w, d, style, tray=False):
    W, H = w * T, d * T
    s = S(W, H + PAD)
    if style == "white":
        top, front, ol = hexc("#f4f4fa"), hexc("#cdcce2"), hexc("#7d7b98")
    elif style == "brown":
        top, front, ol = hexc("#b06c3c"), hexc("#7d4a2a"), hexc("#3a2010")
    else:
        top, front, ol = TIMBER_L, TIMBER, TIMBER_D
    th = 13                                      # 상판 두께(앞면 높이)
    s.rr(2, 4, W - 3, H - 4, ol, None, 5)
    s.r(4, 6, W - 5, H - 6 - th, top)
    s.r(4, H - 6 - th + 1, W - 5, H - 6, front)
    if style == "brown":
        s.grain(4, 6, W - 5, H - 6 - th, top, 3, 0.07, (16, 50))
        s.line((4, 6), (W - 5, 6), lighten(top, 0.35))
        for k in range(0, W - 80, 96):
            s.line((20 + k, 12), (60 + k, 12), lighten(top, 0.5))
    elif style == "white":
        s.line((4, 6), (W - 5, 6), hexc("#ffffff"))
        for k in range(0, W - 60, 90):
            s.line((18 + k, 14), (40 + k, 14), hexc("#ffffff"))
            s.line((22 + k, 16), (34 + k, 16), hexc("#e8e8f8"))
    else:
        s.grain(4, 6, W - 5, H - 6 - th, top, 5, 0.07)
    s.line((4, H - 6 - th), (W - 5, H - 6 - th), shade(front, 0.6))
    s.line((4, H - 7), (W - 5, H - 7), shade(front, 0.7))
    s.line((5, H - 6 - th + 1), (5, H - 7), lighten(front, 0.2))
    if tray:                                       # 급식 식판과 음식
        for k in range(8, W - 52, 74):
            ty = 12 if d == 1 else 14
            s.rr(k, ty, k + 49, ty + 30, hexc("#d8d3c4"), hexc("#8a8470"), 3)
            s.rr(k + 2, ty + 2, k + 47, ty + 28, hexc("#ece6d4"), None, 2)
            s.line((k + 25, ty + 3), (k + 25, ty + 27), hexc("#c8c2ae"))
            s.line((k + 3, ty + 15), (k + 46, ty + 15), hexc("#c8c2ae"))
            s.ell(k + 5, ty + 5, k + 22, ty + 13, hexc("#f6f2e8"), hexc("#b8b29c"))     # 밥
            s.ell(k + 28, ty + 5, k + 44, ty + 13, hexc("#c84a3a"), hexc("#7a2218"))   # 국/김치
            s.rr(k + 5, ty + 18, k + 22, ty + 26, hexc("#7aaa5a"), hexc("#3a6a2a"), 2)  # 나물
            s.rr(k + 28, ty + 18, k + 44, ty + 26, hexc("#e8a64a"), hexc("#8a5a18"), 2)  # 반찬
            s.line((k + 8, ty + 7), (k + 14, ty + 7), hexc("#ffffff"))
    s.shadow(2, W - 3)
    return ret(s, w, d)


def oval_table(w, d):
    """도서관의 타원 큰 테이블. 위에 노트와 휴대폰이 놓여 있어요."""
    W, H = w * T, d * T
    s = S(W, H + PAD)
    base, ol = hexc("#e4dbce"), hexc("#7a6c58")
    r = (H - 24) // 2
    th = 14
    # 받침(기둥)
    s.rr(W // 2 - 70, H - 28, W // 2 + 70, H - 2, hexc("#c8bca8"), hexc("#6a5c48"), 8)
    s.line((W // 2 - 66, H - 22), (W // 2 + 66, H - 22), hexc("#e8ddc8"))
    # 앞면(두께)
    s.ell(2, 8 + th, 2 + 2 * r + 4, 8 + th + 2 * r, shade(base, 0.78), ol)
    s.ell(W - 3 - 2 * r - 4, 8 + th, W - 3, 8 + th + 2 * r, shade(base, 0.78), ol)
    s.r(r + 2, 8 + th, W - r - 3, 8 + th + 2 * r, shade(base, 0.78))
    s.line((r + 2, 8 + th + 2 * r), (W - r - 3, 8 + th + 2 * r), ol)
    # 윗면
    s.ell(2, 8, 2 + 2 * r + 4, 8 + 2 * r, base, ol)
    s.ell(W - 3 - 2 * r - 4, 8, W - 3, 8 + 2 * r, base, ol)
    s.r(r + 2, 8, W - r - 3, 8 + 2 * r, base)
    s.line((r + 2, 8), (W - r - 3, 8), ol)
    s.line((r + 2, 8 + 2 * r), (W - r - 3, 8 + 2 * r), ol)
    s.line((r + 6, 12), (W - r - 8, 12), hexc("#fbf6ea"), 2)
    for k in range(5):
        s.line((30 + k * 56, 26), (46 + k * 56, 22), lighten(base, 0.5))
    # 노트(종이) 와 휴대폰
    for i in range(6):
        px = 40 + i * (W - 110) // 5
        py = 14 + (i % 2) * (2 * r - 40)
        s.rr(px, py, px + 30, py + 22, hexc("#fcfcff"), hexc("#a8a8b8"), 1)
        for rr_ in range(4):
            s.line((px + 3, py + 4 + rr_ * 4), (px + 27, py + 4 + rr_ * 4), hexc("#c0c0d0"))
    for px, py in ((W // 2 - 90, 10 + r // 2), (W // 2 + 60, 14 + r)):
        s.rr(px, py, px + 12, py + 22, hexc("#34343c"), hexc("#14141a"), 2)
        s.line((px + 2, py + 3), (px + 2, py + 14), hexc("#6a6a78"))
    s.shadow(2, W - 3)
    return ret(s, w, d)


# ====================================================================== 책장 · 수납
def shelf(w, kind="wood", tall=True):
    W = w * T
    H = 136 if tall else 92
    s = S(W, H + PAD)
    if kind == "white":
        frame, board, back, edge = hexc("#eceae9"), hexc("#d8d6d4"), hexc("#c9c4be"), hexc("#8a8480")
        s.rr(0, 0, W - 1, H - 1, edge, None, 3)
        s.r(2, 2, W - 3, H - 3, frame)
        rows = 5 if tall else 3
        books(s, 8, 12, W - 9, H - 8, w * 11 + H, rows, board, back)
        # 양 끝 기둥과 위 덮개, 칸 번호표
        s.r(2, 2, 7, H - 3, frame)
        s.r(W - 8, 2, W - 3, H - 3, frame)
        s.line((7, 2), (7, H - 3), shade(frame, 0.8))
        s.line((W - 8, 2), (W - 8, H - 3), shade(frame, 0.8))
        s.r(2, 2, W - 3, 9, lighten(frame, 0.2))
        s.line((2, 10), (W - 3, 10), shade(frame, 0.72))
        s.line((2, 2), (W - 3, 2), hexc("#ffffff"))
        for i in range(w):
            x = 12 + i * T
            for k, col in enumerate(("#d9604f", "#3a6aa8", "#e8b840")):
                s.r(x + k * 6, 2, x + k * 6 + 4, 8, hexc(col))
        s.line((2, H - 3), (W - 3, H - 3), shade(frame, 0.7))
        s.r(2, H - 8, W - 3, H - 4, shade(frame, 0.9))
    else:
        s.rr(0, 0, W - 1, H - 1, TIMBER_D, None, 3)
        s.r(2, 2, W - 3, H - 3, TIMBER)
        s.grain(2, 2, W - 3, H - 3, TIMBER, 21, 0.06)
        s.r(2, 2, W - 3, 12, TIMBER_L)
        s.line((2, 13), (W - 3, 13), TIMBER_D)
        books(s, 8, 18, W - 9, H - 8, w * 7 + H, 3 if tall else 2, TIMBER_D, hexc("#4a2c1a"))
    s.shadow(0, W - 1)
    return ret(s, w, 1)


def cabinet(w, glass=True, col=None):
    W = w * T
    H = 96
    c = col or hexc("#b8854c")
    s = S(W, H + PAD)
    s.blk(0, 0, W - 1, H - 1, 14, c, ol=shade(c, 0.4), top=lighten(c, 0.28))
    s.grain(2, 16, W - 3, H - 3, c, 31, 0.06)
    n = max(2, w * 2)
    seg = (W - 8) / n
    for i in range(n):
        x0, x1 = 4 + int(i * seg), 4 + int((i + 1) * seg) - 4
        s.rr(x0, 20, x1, H - 6, shade(c, 0.86), shade(c, 0.5), 3)
        if glass:
            s.rr(x0 + 5, 25, x1 - 5, H - 34, hexc("#bcdce8"), shade(c, 0.45), 2)
            s.line((x0 + 8, 30), (x0 + 14, 40), hexc("#eaf6fa"))
            s.line((x0 + 5, H - 44), (x1 - 5, H - 44), shade(c, 0.45))
        hx = x1 - 6 if i % 2 == 0 else x0 + 5
        s.r(hx, H - 46, hx + 1, H - 34, hexc("#f0e0a0"))
    s.shadow(0, W - 1)
    return ret(s, w, 1)


def lockerbank(w):
    """교실 칠판 아래 사물함 벽: 연두/흰색이 체크무늬로 번갈아 나와요."""
    W = w * T
    H = 118
    s = S(W, H + PAD)
    s.rr(0, 8, W - 1, H - 1, hexc("#8a8f96"), None, 2)
    s.r(1, 20, W - 2, H - 2, hexc("#dcdcde"))
    # 윗면(흰 상판)
    s.r(0, 0, W - 1, 18, hexc("#f4f4f6"))
    s.line((0, 18), (W - 1, 18), hexc("#9a9aa2"))
    s.line((0, 0), (W - 1, 0), hexc("#ffffff"))
    s.line((0, 0), (0, 18), hexc("#c8c8cc"))
    cols = w * 3
    dw = (W - 4) / cols
    for r in range(3):
        for c in range(cols):
            x0 = 2 + int(c * dw)
            x1 = 2 + int((c + 1) * dw) - 2
            y0 = 24 + r * 31
            y1 = y0 + 28
            lime = (c + r) % 2 == 0
            col = hexc("#a1c64a") if lime else hexc("#ececee")
            s.rr(x0, y0, x1, y1, col, shade(col, 0.55), 2)
            s.line((x0 + 2, y0 + 2), (x1 - 2, y0 + 2), lighten(col, 0.4))
            s.line((x1 - 1, y0 + 3), (x1 - 1, y1 - 2), shade(col, 0.82))
            hx = x1 - 6
            s.rr(hx, y0 + 9, hx + 3, y0 + 18, hexc("#4a4e58"), None, 1)       # 손잡이 홈
            s.line((hx + 1, y0 + 10), (hx + 1, y0 + 16), hexc("#8a8e98"))
    s.shadow(0, W - 1)
    return ret(s, w, 1)


def locker(w):
    """복도의 파란 사물함."""
    W = w * T
    H = 118
    c = hexc("#7d92b8")
    s = S(W, H + PAD)
    s.blk(0, 0, W - 1, H - 1, 12, c, ol=shade(c, 0.4))
    n = w * 2
    seg = (W - 6) / n
    for i in range(n):
        x0, x1 = 3 + int(i * seg), 3 + int((i + 1) * seg) - 3
        s.rr(x0, 16, x1, H - 6, shade(c, 0.95), shade(c, 0.5), 3)
        for k in range(5):
            s.line((x0 + 6, 24 + k * 3), (x1 - 6, 24 + k * 3), shade(c, 0.6))
        s.rr(x1 - 9, 62, x1 - 5, 76, hexc("#f0e8b0"), hexc("#8a7a30"), 1)
        s.rr(x0 + 6, 92, x1 - 6, 102, hexc("#e8eef8"), shade(c, 0.5), 1)
    s.shadow(0, W - 1)
    return ret(s, w, 1)


def ac_tower():
    s = S(T, 120 + PAD)
    s.rr(8, 0, 55, 118, hexc("#9a9ca2"), None, 4)
    s.rr(9, 1, 54, 117, hexc("#e2e3e6"), None, 4)
    s.hgrad(10, 2, 53, 116, hexc("#eeeef0"), hexc("#cfd0d6"))
    s.rr(13, 6, 50, 46, hexc("#7d8088"), hexc("#4a4c54"), 2)
    for k in range(9):                                            # 위쪽 송풍구 가로 살
        s.line((15, 10 + k * 4), (48, 10 + k * 4), hexc("#3a3c44"))
        s.line((15, 11 + k * 4), (48, 11 + k * 4), hexc("#9a9ca6"))
    s.rr(14, 54, 49, 66, hexc("#2a2c32"), hexc("#14161a"), 2)     # 표시창
    s.r(18, 58, 25, 62, hexc("#6af0a0"))
    s.r(30, 58, 33, 62, hexc("#f06a6a"))
    for k in range(3):
        s.rr(15 + k * 12, 72, 24 + k * 12, 80, hexc("#c8c9ce"), hexc("#7a7c84"), 1)
    for k in range(7):                                            # 아래 흡입구
        s.line((14, 90 + k * 3), (49, 90 + k * 3), hexc("#9a9ca4"))
    s.line((9, 117), (54, 117), hexc("#7a7c84"))
    s.shadow(8, 55, 52)
    return ret(s, 1, 1)


def cubby():
    W = 2 * T
    s = S(W, 100 + PAD)
    s.blk(0, 0, W - 1, 99, 10, hexc("#c08a52"), ol=hexc("#5a3a20"), top=hexc("#d8a470"))
    s.grain(2, 12, W - 3, 97, hexc("#c08a52"), 41, 0.07)
    s.rr(6, 16, W - 7, 54, hexc("#8a5a34"), hexc("#4a2c18"), 2)         # 옷걸이 칸
    for k in range(5):
        x = 16 + k * 22
        s.r(x, 24, x + 3, 28, hexc("#1a1612"))
        s.line((x - 2, 22), (x + 5, 22), hexc("#1a1612"))
    s.rr(6, 58, W - 7, 94, hexc("#b07a44"), hexc("#4a2c18"), 2)
    s.line((W // 2, 60), (W // 2, 92), hexc("#6a4426"))
    s.rr(W // 2 - 16, 70, W // 2 - 10, 82, hexc("#f0e0a0"), None, 1)
    s.rr(W // 2 + 10, 70, W // 2 + 16, 82, hexc("#f0e0a0"), None, 1)
    s.rr(10, 20, 30, 40, hexc("#f4f0e4"), hexc("#a09070"), 1)           # 이름표 종이
    s.shadow(0, W - 1)
    return ret(s, 2, 1)


def tabcart():
    s = S(T, 100 + PAD)
    s.rr(4, 8, 59, 90, hexc("#2a3a6a"), hexc("#141c38"), 3)             # 남색 몸통
    s.rr(8, 12, 55, 48, hexc("#e8eaee"), hexc("#8a8e9a"), 2)            # 흰 환기 패널
    for k in range(8):
        s.line((12, 16 + k * 4), (51, 16 + k * 4), hexc("#9a9ea8"))
    s.rr(8, 52, 55, 86, hexc("#34447a"), hexc("#141c38"), 2)
    s.line((12, 56), (51, 56), hexc("#6a7ab0"))
    s.rr(44, 64, 48, 76, hexc("#c8ccd8"), None, 1)
    s.rr(0, 4, 63, 14, hexc("#d4d8e2"), hexc("#7a8090"), 2)             # 윗판
    s.line((2, 6), (61, 6), hexc("#ffffff"))
    for lx in (8, 49):                                                  # 바퀴
        s.ell(lx, 90, lx + 8, 98, hexc("#2a2c34"), hexc("#0a0a10"))
    s.shadow(4, 59, 52)
    return ret(s, 1, 1)


def bin_blue():
    s = S(T, 52 + PAD)
    s.rr(18, 8, 45, 12, hexc("#4a8ad0"), hexc("#1f3f6a"), 1)
    s.rr(16, 12, 47, 50, hexc("#3a78c0"), hexc("#1a3a64"), 3)
    s.rr(19, 15, 44, 47, hexc("#5a9ae0"), None, 2)
    s.line((22, 16), (22, 44), hexc("#9ac8f8"))
    s.line((44, 15), (44, 46), hexc("#2a5a9a"))
    s.line((24, 30), (40, 30), hexc("#cfe6ff"))
    s.shadow(16, 47, 44)
    return ret(s, 1, 1)


# ====================================================================== 카운터 · 주방
def steel_counter(w):
    W = w * T
    s = S(W, 92 + PAD)
    s.blk(0, 16, W - 1, 91, 28, STEEL, ol=hexc("#4a5062"), top=hexc("#e6eaf4"), front=hexc("#aab2c6"))
    s.hgrad(2, 46, W - 3, 90, hexc("#b8c0d2"), hexc("#98a0b6"))
    n = w * 2
    seg = (W - 6) / n
    for i in range(n):
        x0 = 4 + int(i * seg)
        s.rr(x0 + 2, 52, x0 + int(seg) - 4, 84, hexc("#bcc3d4"), hexc("#6a7288"), 2)
        s.line((x0 + 6, 56), (x0 + int(seg) - 8, 56), hexc("#e6ecf8"))
        s.rr(x0 + int(seg) // 2 - 6, 64, x0 + int(seg) // 2 + 4, 68, hexc("#6e7488"), None, 1)
    foods = [hexc("#e8a64a"), hexc("#8a4a2c"), hexc("#f2e4a2"), hexc("#7aaa5a"), hexc("#dc6450"), hexc("#f0c040")]
    k, x = 0, 6
    while x + 56 < W:
        s.rr(x, 6, x + 53, 38, hexc("#d4dae8"), hexc("#4a5062"), 3)
        s.rr(x + 3, 9, x + 50, 30, hexc("#8a92a8"), None, 2)
        f = foods[k % len(foods)]
        s.ell(x + 6, 10, x + 47, 28, f, shade(f, 0.55))
        s.ell(x + 12, 12, x + 30, 18, lighten(f, 0.35))
        s.line((x + 53, 14), (x + 60, 4), hexc("#9aa2b6"), 2)      # 국자
        s.ell(x + 56, 1, x + 63, 7, hexc("#9aa2b6"), hexc("#5c6274"))
        k += 1
        x += 64
    s.shadow(0, W - 1)
    return ret(s, w, 1)


def tray_counter(w):
    W = w * T
    c = hexc("#7a4e38")
    s = S(W, 76 + PAD)
    s.blk(0, 8, W - 1, 75, 26, c, ol=shade(c, 0.4), top=hexc("#c3c9d8"), front=c)
    s.grain(2, 36, W - 3, 74, c, 51, 0.07)
    for i in range(w * 2):
        s.rr(5 + i * 30, 42, 29 + i * 30, 70, shade(c, 0.86), shade(c, 0.5), 2)
        s.rr(13 + i * 30, 52, 20 + i * 30, 54, hexc("#e8d8a0"), None, 1)
    for i in range(w):
        for z in range(3):                                          # 식판 쌓기
            s.rr(10 + i * 64, 10 - z * 3, 52 + i * 64, 28 - z * 3, hexc("#dfe3ee"), hexc("#6a7288"), 2)
            s.line((12 + i * 64, 12 - z * 3), (50 + i * 64, 12 - z * 3), hexc("#ffffff"))
    s.shadow(0, W - 1)
    return ret(s, w, 1)


def lib_counter(w):
    W = w * T
    s = S(W, 90 + PAD)
    s.blk(0, 20, W - 1, 89, 26, hexc("#d9dce8"), ol=hexc("#6a7088"), top=hexc("#f4f5fb"), front=hexc("#c0c5d6"))
    for i in range(w):
        s.rr(8 + i * 64, 54, 56 + i * 64, 82, hexc("#cdd2e0"), hexc("#6a7088"), 2)
        s.line((12 + i * 64, 58), (52 + i * 64, 58), hexc("#f0f2fa"))
    # 모니터와 명패
    s.rr(10, 0, 50, 22, hexc("#34384a"), hexc("#14161e"), 2)
    s.r(13, 3, 47, 18, hexc("#6ab0e0"))
    for k in range(3):
        s.line((16, 6 + k * 4), (38 - k * 3, 6 + k * 4), hexc("#e8f4fc"))
    s.rr(24, 22, 36, 24, hexc("#6e7488"), None, 1)
    if w >= 3:
        s.rr(W - 60, 24, W - 22, 38, hexc("#fffbe8"), hexc("#a08a50"), 2)
        for k in range(2):
            s.line((W - 55, 29 + k * 4), (W - 27, 29 + k * 4), hexc("#a08a50"))
    s.shadow(0, W - 1)
    return ret(s, w, 1)


def barcounter(w):
    """창가 긴 나무 카운터(높은 의자와 함께)."""
    W = w * T
    s = S(W, 70 + PAD)
    s.blk(0, 4, W - 1, 69, 30, hexc("#d6a87f"), ol=hexc("#6a4a30"), top=hexc("#ecc8a0"), front=hexc("#c8946a"))
    s.grain(2, 6, W - 3, 32, hexc("#ecc8a0"), 61, 0.05, (20, 60))
    s.grain(2, 36, W - 3, 68, hexc("#c8946a"), 62, 0.06)
    s.line((2, 6), (W - 3, 6), hexc("#fbe4c8"))
    s.shadow(0, W - 1)
    return ret(s, w, 1)


def nook():
    """도서관 아치형 서재: 양옆은 책장, 가운데에 소파가 있어요."""
    W, H = 5 * T, 190
    s = S(W, H + PAD)
    wd, wl, wdk = hexc("#e6b888"), hexc("#f4cfa4"), hexc("#a8744a")
    # 안쪽 벽과 바닥
    s.r(60, 40, W - 61, 150, hexc("#d8ceb8"))
    s.r(60, 40, W - 61, 46, hexc("#c4baa4"))
    # 소파
    sx0, sx1 = 82, W - 83
    s.rr(sx0, 78, sx1, 138, hexc("#cfc1a8"), hexc("#7a6c58"), 6)
    s.rr(sx0 + 6, 84, sx1 - 6, 112, hexc("#ddd0b8"), None, 5)
    for k in range(2):
        cx0 = sx0 + 12 + k * ((sx1 - sx0 - 30) // 2)
        s.rr(cx0, 88, cx0 + (sx1 - sx0 - 30) // 2 - 4, 112, hexc("#e8dcc6"), hexc("#a8987c"), 4)
        s.line((cx0 + 4, 92), (cx0 + (sx1 - sx0 - 30) // 2 - 8, 92), hexc("#fff8e8"))
    s.rr(sx0, 108, sx1, 140, hexc("#d4c6ae"), hexc("#7a6c58"), 5)
    s.rr(sx0 - 6, 90, sx0 + 8, 142, hexc("#c4b496"), hexc("#7a6c58"), 4)       # 팔걸이
    s.rr(sx1 - 8, 90, sx1 + 6, 142, hexc("#c4b496"), hexc("#7a6c58"), 4)
    # 양옆 기둥(책장)
    for x0 in (0, W - 62):
        s.rr(x0, 8, x0 + 61, H - 2, wdk, None, 3)
        s.r(x0 + 2, 10, x0 + 59, H - 4, wd)
        s.grain(x0 + 2, 10, x0 + 59, H - 4, wd, 71 + x0, 0.05, (20, 50))
        books(s, x0 + 8, 18, x0 + 53, H - 12, 90 + x0, 5, wdk, hexc("#5a3a26"))
    # 위 가로대(칸칸이 비어 있는 선반)
    s.rr(0, 0, W - 1, 44, wdk, None, 3)
    s.r(2, 2, W - 3, 42, wl)
    s.grain(2, 2, W - 3, 42, wl, 77, 0.05, (30, 80))
    n = 11
    cw = (W - 12) / n
    for i in range(n):
        x0 = 6 + int(i * cw)
        s.rr(x0, 8, x0 + int(cw) - 3, 36, hexc("#c8946a"), wdk, 2)
        s.r(x0 + 2, 10, x0 + int(cw) - 5, 34, hexc("#b8805a"))
    s.line((2, 43), (W - 3, 43), wdk)
    # 앞 발받침(낮은 상자 의자)
    s.shadow(0, W - 1)
    return ret(s, 5, 2)


def sofa(w=3):
    W = w * T
    s = S(W, 76 + PAD)
    s.rr(0, 10, W - 1, 70, hexc("#cfc1a8"), hexc("#7a6c58"), 7)
    s.rr(8, 14, W - 9, 40, hexc("#ddd0b8"), None, 6)
    for k in range(w):
        s.rr(10 + k * 64, 34, 58 + k * 64, 62, hexc("#e8dcc6"), hexc("#a8987c"), 5)
        s.line((16 + k * 64, 38), (52 + k * 64, 38), hexc("#fff8e8"))
    s.shadow(0, W - 1)
    return ret(s, w, 1)


# ====================================================================== 생활 소품
def fridge():
    s = S(T, 120 + PAD)
    s.rr(6, 2, 57, 118, hexc("#7a8298"), None, 4)
    s.rr(7, 3, 56, 117, hexc("#dfe3ee"), None, 4)
    s.hgrad(8, 4, 55, 116, hexc("#eef0f8"), hexc("#c4c9d8"))
    s.line((8, 54), (55, 54), hexc("#8b93a8"), 2)
    s.rr(46, 24, 49, 44, hexc("#6e7488"), None, 1)
    s.rr(46, 64, 49, 100, hexc("#6e7488"), None, 1)
    s.shadow(6, 57, 52)
    return ret(s, 1, 1)


def dispenser():
    s = S(T, 100 + PAD)
    s.blk(10, 36, 53, 99, 10, hexc("#d8dbe6"), ol=hexc("#5a6278"), top=hexc("#f0f2f8"))
    s.rr(18, 56, 45, 72, hexc("#4a7ab0"), hexc("#2e4a66"), 2)
    s.rr(21, 59, 28, 66, hexc("#9ad0f0"), None, 1)
    s.rr(34, 59, 41, 66, hexc("#e07a6a"), None, 1)
    s.rr(26, 76, 37, 80, hexc("#7d8396"), None, 1)
    s.line((14, 84), (49, 84), hexc("#a8aec0"))
    s.rr(18, 4, 45, 36, hexc("#8cc8f0"), hexc("#3d6d8c"), 5)              # 물통
    s.rr(22, 8, 28, 28, hexc("#d4f0fc"), None, 2)
    s.line((20, 30), (43, 30), hexc("#5aa0d0"))
    s.shadow(10, 53, 50)
    return ret(s, 1, 1)


def purifier():
    """복도의 정수기(키 큰 은색)."""
    s = S(T, 110 + PAD)
    s.rr(12, 8, 51, 106, hexc("#6a7288"), None, 3)
    s.rr(13, 9, 50, 105, hexc("#c3c9d6"), None, 3)
    s.hgrad(14, 10, 49, 104, hexc("#dde1ea"), hexc("#a9b0c2"))
    s.rr(17, 26, 46, 40, hexc("#3a4a64"), hexc("#1a2234"), 2)
    s.r(20, 30, 25, 35, hexc("#6af0a0"))
    s.rr(26, 50, 37, 54, hexc("#5a6278"), None, 1)
    s.rr(18, 60, 45, 82, hexc("#9aa2b6"), hexc("#5a6278"), 2)
    s.rr(22, 64, 41, 78, hexc("#e8eef8"), None, 1)
    for k in range(5):
        s.line((18, 90 + k * 3), (45, 90 + k * 3), hexc("#7a8298"))
    s.shadow(12, 51, 50)
    return ret(s, 1, 1)


def glasscab():
    """식기 보관 유리장."""
    s = S(T, 120 + PAD)
    s.rr(6, 6, 57, 118, hexc("#8a90a2"), None, 3)
    s.rr(8, 8, 55, 116, hexc("#cfe6ee"), None, 2)
    for z in (40, 72, 100):
        s.line((8, z), (55, z), hexc("#8a90a2"), 2)
    for z in (36, 68, 96):
        for k in range(3):
            s.ell(12 + k * 14, z - 12, 24 + k * 14, z, hexc("#f4f6fa"), hexc("#a8aec0"))
    s.line((12, 12), (20, 24), hexc("#ffffff"))
    s.line((10, 8), (53, 8), hexc("#f0f4fa"))
    s.shadow(6, 57, 50)
    return ret(s, 1, 1)


def sink():
    W = 2 * T
    s = S(W, 100 + PAD)
    s.blk(0, 16, W - 1, 99, 34, STEEL, ol=hexc("#4a5062"), top=hexc("#e6eaf4"), front=hexc("#aab2c6"))
    s.rr(8, 22, 58, 42, hexc("#8a92a8"), hexc("#4a5062"), 3)
    s.rr(70, 22, 120, 42, hexc("#8a92a8"), hexc("#4a5062"), 3)
    s.rr(26, 26, 40, 34, hexc("#a8b0c4"), None, 1)
    s.rr(60, 6, 68, 22, hexc("#6e7488"), None, 2)
    s.rr(56, 2, 72, 8, hexc("#6e7488"), None, 2)
    for k in range(3):                                           # 접시 쌓기
        s.ell(88, 6 - k * 0 + k * 2, 116, 18 + k * 2, hexc("#f4f4f8"), hexc("#8a90a2"))
    s.rr(10, 56, W - 11, 92, hexc("#bcc3d4"), hexc("#6a7288"), 2)
    s.shadow(0, W - 1)
    return ret(s, 2, 1)


def plant():
    s = S(T, 92 + PAD)
    s.rr(18, 62, 46, 90, hexc("#b8683a"), hexc("#5a3018"), 4)
    s.r(20, 62, 44, 69, hexc("#8a4a2c"))
    s.line((22, 72), (42, 72), hexc("#d8884e"))
    g1, g2, g3 = hexc("#3f8a3f"), hexc("#68b858"), hexc("#a6e07c")
    for (x, y, rx, ry) in ((32, 48, 20, 17), (18, 50, 12, 14), (46, 50, 12, 14), (32, 30, 15, 18), (22, 36, 11, 13), (42, 36, 11, 13), (32, 16, 10, 12)):
        s.ell(x - rx, y - ry, x + rx, y + ry, g1, shade(g1, 0.5))
    for (x, y) in ((26, 24), (40, 30), (20, 44), (46, 46), (34, 10), (30, 54)):
        s.ell(x - 4, y - 3, x + 5, y + 3, g2)
        s.px(x - 2, y - 1, g3)
        s.px(x - 1, y - 1, g3)
    s.shadow(16, 48)
    return ret(s, 1, 1)


def trash():
    s = S(T, 56 + PAD)
    s.rr(15, 12, 48, 54, hexc("#8f98ad"), hexc("#3f465a"), 3)
    s.rr(18, 15, 45, 51, hexc("#a9b1c5"), None, 2)
    for k in range(5):
        s.line((22 + k * 5, 18), (22 + k * 5, 48), hexc("#8a92a8"))
    s.rr(12, 8, 51, 15, hexc("#b8c0d4"), hexc("#4a5062"), 2)
    s.line((14, 10), (49, 10), hexc("#e8eef8"))
    s.shadow(14, 50, 44)
    return ret(s, 1, 1)


def bench(w, cushion=False):
    W = w * T
    s = S(W, 52 + PAD)
    c = hexc("#b87a44")
    for lx in (8, W - 12):
        s.r(lx, 26, lx + 3, 50, METAL_D)
        s.r(lx + 4, 26, lx + 5, 50, METAL)
    s.blk(2, 6, W - 3, 34, 20, c, ol=shade(c, 0.4), top=lighten(c, 0.2), front=c)
    s.grain(4, 8, W - 5, 24, lighten(c, 0.2), 81, 0.06, (20, 60))
    if cushion:
        s.rr(6, 2, W - 7, 22, hexc("#eadfc8"), hexc("#8a7c64"), 6)
        s.line((12, 6), (W - 13, 6), hexc("#fff8e8"))
        for k in range(1, w):
            s.line((k * 64, 4), (k * 64, 20), hexc("#b8a888"))
    s.shadow(2, W - 3)
    return ret(s, w, 1)


def backpack(col):
    c = {"gr": hexc("#6b9a56"), "bl": hexc("#4a74aa"), "pk": hexc("#d06a82"), "gy": hexc("#7a7a8c")}[col]
    s = S(T, 50 + PAD)
    s.rr(16, 6, 47, 46, c, shade(c, 0.4), 6)
    s.rr(20, 28, 43, 42, shade(c, 0.85), shade(c, 0.4), 3)
    s.line((24, 34), (39, 34), lighten(c, 0.3))
    s.rr(24, 2, 39, 10, shade(c, 0.8), shade(c, 0.4), 3)
    s.line((20, 10), (20, 30), lighten(c, 0.3))
    s.shadow(16, 47, 44)
    return ret(s, 1, 1, solid=False)


def speaker():
    s = S(T, 104 + PAD)
    s.blk(12, 0, 51, 103, 12, hexc("#3a3a46"), ol=hexc("#101018"), top=hexc("#5a5a6a"))
    s.ell(18, 22, 45, 49, hexc("#1c1c24"), hexc("#6a6a7c"))
    s.ell(21, 25, 42, 46, hexc("#2c2c36"), hexc("#4a4a58"))
    s.ell(28, 32, 35, 39, hexc("#4a4a5c"))
    s.ell(16, 56, 47, 87, hexc("#1c1c24"), hexc("#6a6a7c"))
    s.ell(20, 60, 43, 83, hexc("#2c2c36"), hexc("#4a4a58"))
    s.ell(27, 67, 36, 76, hexc("#5a5a6e"))
    s.line((14, 14), (14, 100), hexc("#5a5a6a"))
    s.shadow(12, 51)
    return ret(s, 1, 1)


def ball_cart():
    s = S(T, 90 + PAD)
    st = hexc("#9aa2b6")
    s.rr(5, 26, 58, 74, hexc("#22283a"), hexc("#5c6274"), 3)
    for (x, y) in ((16, 44), (32, 40), (47, 44), (22, 60), (40, 60), (32, 52), (14, 60), (49, 60)):
        s.ell(x - 8, y - 8, x + 8, y + 8, hexc("#e0902f"), hexc("#7a3a10"))
        s.line((x - 8, y), (x + 8, y), hexc("#7a3a10"))
        s.line((x, y - 8), (x, y + 8), hexc("#7a3a10"))
        s.ell(x - 5, y - 6, x - 2, y - 3, hexc("#f8c880"))
    for x in range(6, 60, 7):
        s.line((x, 26), (x, 74), st)
    for y in (26, 50, 74):
        s.line((5, y), (58, y), hexc("#d0d6e4"), 2)
    for lx in (8, 50):
        s.r(lx, 74, lx + 3, 84, hexc("#4a4f60"))
        s.ell(lx - 2, 82, lx + 6, 88, hexc("#2a2c34"))
    s.shadow(5, 58)
    return ret(s, 1, 1)


def mat(col):
    c = {"red": hexc("#c4504a"), "blue": hexc("#4a6ec0")}[col]
    s = S(2 * T, T)
    s.rr(2, 10, 125, 56, shade(c, 0.5), None, 5)
    s.rr(4, 10, 123, 48, c, None, 5)
    s.rr(4, 46, 123, 56, hexc("#e0c060"), shade(hexc("#e0c060"), 0.6), 3)
    s.line((10, 14), (116, 14), lighten(c, 0.45))
    for x in range(18, 120, 24):
        s.line((x, 20), (x, 42), shade(c, 0.8))
    s.line((4, 30), (123, 30), shade(c, 0.85))
    return ret(s, 2, 1, solid=False)


def hoop():
    s = S(2 * T, 220 + PAD)
    blue, st = hexc("#4a68a8"), hexc("#9aa2b6")
    s.rr(34, 190, 92, 216, blue, shade(blue, 0.4), 5)
    s.rr(40, 194, 86, 206, lighten(blue, 0.2), None, 3)
    s.r(60, 100, 67, 192, st)
    s.line((60, 100), (60, 192), lighten(st, 0.4))
    s.line((67, 100), (67, 192), shade(st, 0.6))
    s.rr(28, 4, 99, 68, hexc("#f4f6fc"), hexc("#5a6278"), 4)           # 백보드
    s.rr(48, 28, 79, 56, hexc("#f4f6fc"), hexc("#d0584a"), 2)
    s.line((32, 7), (95, 7), hexc("#ffffff"))
    s.line((30, 64), (97, 64), hexc("#bcc2d4"))
    s.line((62, 68), (64, 100), st, 3)                                  # 받침대 팔
    s.ell(46, 70, 81, 82, None, hexc("#e8702a"))
    s.d.ellipse([46, 70, 81, 82], outline=hexc("#e8702a"), width=2)
    for x in range(48, 80, 5):                                          # 그물
        s.line((x, 80), (x + (63 - x) // 3 + 1, 104), hexc("#f2f2f2"))
    for y in (86, 94, 102):
        s.line((50 + (y - 86) // 4, y), (77 - (y - 86) // 4, y), hexc("#f2f2f2"))
    s.shadow(34, 92)
    return ret(s, 2, 1)


def stage(w, d):
    W, H = w * T, d * T
    s = S(W, H + PAD)
    s.rr(0, 0, W - 1, H - 1, hexc("#5c3a1c"), None, 4)
    s.r(2, 2, W - 3, H - 34, hexc("#e8b36e"))
    s.grain(2, 2, W - 3, H - 34, hexc("#e8b36e"), 91, 0.06, (30, 90))
    for k in range(8, H - 34, 14):
        s.line((2, k), (W - 3, k), hexc("#d89c58"))
    s.r(2, H - 33, W - 3, H - 3, hexc("#b88040"))
    s.line((2, H - 33), (W - 3, H - 33), hexc("#8a5e30"), 2)
    s.line((2, 2), (W - 3, 2), hexc("#f8d8a0"))
    for i in range(w):
        s.rr(i * T + 6, H - 28, i * T + 57, H - 7, hexc("#c48c4a"), hexc("#8a5e30"), 3)
        s.line((i * T + 10, H - 24), (i * T + 52, H - 24), hexc("#dca868"))
    s.shadow(0, W - 1)
    return ret(s, w, d)


def flag_stand():
    s = S(T, 132 + PAD)
    s.rr(16, 116, 47, 130, hexc("#6e7488"), hexc("#2e3242"), 3)
    s.rr(20, 118, 43, 124, hexc("#9aa2b6"), None, 2)
    s.r(30, 24, 33, 118, hexc("#d8c070"))
    s.line((30, 24), (30, 118), hexc("#f4e8a0"))
    s.rr(14, 28, 49, 70, hexc("#2f7a52"), hexc("#143424"), 3)
    s.ell(23, 38, 40, 58, hexc("#e8d27a"), hexc("#8a6a20"))
    s.ell(27, 42, 36, 54, hexc("#2f7a52"))
    s.line((17, 32), (46, 32), hexc("#5ab080"))
    s.rr(26, 6, 36, 24, hexc("#e8c24a"), hexc("#8a6a20"), 3)
    s.shadow(16, 47)
    return ret(s, 1, 1)


def book_cart():
    s = S(T, 82 + PAD)
    s.rr(6, 8, 57, 72, hexc("#22283a"), hexc("#5a6278"), 3)
    for r, y in enumerate((12, 38)):
        for k in range(8):
            col = SPINES[(k + r * 4) % len(SPINES)]
            s.r(10 + k * 6, y, 14 + k * 6, y + 22, col)
            s.line((10 + k * 6, y), (10 + k * 6, y + 22), lighten(col, 0.3))
        s.r(6, y + 24, 57, y + 27, hexc("#d8dce8"))
    s.rr(6, 64, 57, 72, hexc("#eceef4"), hexc("#7a8090"), 2)
    s.rr(2, 4, 61, 12, hexc("#f0f2f8"), hexc("#7a8090"), 2)
    for lx in (10, 48):
        s.ell(lx, 72, lx + 8, 80, hexc("#2a2c34"), hexc("#0a0a10"))
    s.shadow(6, 57, 50)
    return ret(s, 1, 1)


# ====================================================================== 바깥 · 복도 소품
def tree():
    s = S(2 * T, 200 + PAD)
    # 줄기
    s.rr(54, 128, 74, 196, hexc("#7a4a2c"), hexc("#3a2010"), 3)
    s.grain(56, 130, 72, 194, hexc("#7a4a2c"), 5, 0.12, (6, 16), horizontal=False)
    s.line((56, 132), (56, 194), hexc("#a8744a"))
    s.line((72, 132), (72, 194), hexc("#4a2a14"))
    s.poly([(54, 190), (46, 198), (60, 198)], hexc("#7a4a2c"))
    s.poly([(74, 190), (82, 198), (68, 198)], hexc("#7a4a2c"))
    g = [hexc("#2f7038"), hexc("#3d8044"), hexc("#53984f"), hexc("#72b85c"), hexc("#98d878")]
    blobs = [(36, 106, 30, 0), (92, 106, 30, 0), (64, 84, 40, 1), (44, 60, 28, 1), (84, 60, 28, 1), (64, 38, 28, 2), (46, 86, 18, 2), (82, 86, 18, 2), (64, 62, 22, 3)]
    for (x, y, r, c) in blobs:
        s.ell(x - r, y - r, x + r, y + r, g[c], shade(g[c], 0.5))
    for i in range(70):          # 나뭇잎 하이라이트
        x = 24 + int(rnd(3, i, 1) * 80)
        y = 18 + int(rnd(3, i, 2) * 100)
        s.r(x, y, x + 3, y + 1, g[3 + (i % 2)])
    for i in range(30):
        x = 28 + int(rnd(4, i, 1) * 74)
        y = 30 + int(rnd(4, i, 2) * 90)
        s.r(x, y, x + 2, y + 2, g[0])
    s.shadow(40, 90, 62)
    return ret(s, 2, 1)


def bush(w):
    W = w * T
    s = S(W, 60 + PAD)
    g = [hexc("#3d8044"), hexc("#53984f"), hexc("#72b85c")]
    for i in range(w * 2):
        x = 16 + i * 32
        s.ell(x - 18, 8, x + 18, 54, g[i % 2], shade(g[0], 0.5))
        s.ell(x - 10, 14, x + 6, 30, g[2])
    for i in range(w * 6):
        x, y = 8 + int(rnd(6, i, 1) * (W - 16)), 14 + int(rnd(6, i, 2) * 36)
        s.r(x, y, x + 3, y + 1, hexc("#a6e07c"))
    s.shadow(0, W - 1)
    return ret(s, w, 1)


def goal(w):
    W = w * T
    s = S(W, 116 + PAD)
    wc, net = hexc("#f6f6fa"), hexc("#c4cade")
    for x in range(8, W - 8, 8):
        s.line((x, 14), (x, 108), net)
    for y in range(14, 108, 8):
        s.line((6, y), (W - 7, y), net)
    s.r(2, 6, 7, 112, wc)
    s.r(W - 8, 6, W - 3, 112, wc)
    s.r(2, 6, W - 3, 12, wc)
    s.line((2, 6), (W - 3, 6), hexc("#ffffff"))
    s.line((7, 12), (7, 112), hexc("#b8bece"))
    s.line((W - 8, 12), (W - 8, 112), hexc("#b8bece"))
    s.shadow(2, W - 3)
    return ret(s, w, 1)


def flagpole():
    from decor import paint_taegukgi
    s = S(T, 260 + PAD)
    s.rr(16, 240, 47, 258, hexc("#8a90a2"), hexc("#2e3242"), 3)
    s.r(30, 12, 34, 242, hexc("#d8dbe6"))
    s.line((30, 12), (30, 242), hexc("#ffffff"))
    s.line((34, 12), (34, 242), hexc("#8a90a2"))
    s.ell(28, 4, 36, 12, hexc("#e8c24a"), hexc("#8a6a20"))
    fl = paint_taegukgi(60, 40)
    s.paste(fl, 34, 16)
    s.shadow(16, 47)
    return ret(s, 1, 1)


def sign_stone():
    W = 3 * T
    s = S(W, 76 + PAD)
    s.blk(4, 4, W - 5, 75, 16, hexc("#a9a496"), ol=hexc("#4a463a"), top=hexc("#d0cbbb"))
    s.speckle(6, 20, W - 7, 72, [hexc("#8f8a7c"), hexc("#bcb7a8")], 0.05, 5)
    t = text_image("매홀중학교", hexc("#fff6d0"), FONT11B, 11, outline=hexc("#3a3830"))
    t = t.resize((t.width * 2, t.height * 2), 0)
    s.paste(t, (W - t.width) // 2, 30, even=True)
    s.shadow(4, W - 5)
    return ret(s, 3, 1)


def ball():
    s = S(T, 30 + PAD)
    s.ell(22, 4, 40, 22, hexc("#f6f6f6"), hexc("#3a3a46"))
    s.poly([(31, 8), (36, 12), (34, 18), (28, 18), (26, 12)], hexc("#3a3a46"))
    s.ell(25, 6, 28, 9, hexc("#ffffff"))
    s.shadow(20, 44, 38)
    return ret(s, 1, 1, solid=False)


def cone():
    s = S(T, 50 + PAD)
    s.rr(18, 42, 45, 48, hexc("#e0e0e8"), hexc("#6a6a7a"), 2)
    s.poly([(24, 42), (39, 42), (35, 6), (28, 6)], hexc("#e8803a"), hexc("#7a3a10"))
    s.poly([(26, 28), (37, 28), (36, 22), (27, 22)], hexc("#f6f6f6"))
    s.line((29, 8), (26, 40), hexc("#f8a860"))
    s.shadow(18, 45, 40)
    return ret(s, 1, 1)


def trophy(w):
    W = w * T
    s = S(W, 108 + PAD)
    col = hexc("#8a5a38")
    s.blk(0, 0, W - 1, 107, 12, col, ol=shade(col, 0.4), top=lighten(col, 0.25))
    s.rr(6, 18, W - 7, 98, hexc("#cfe8f0"), hexc("#3a2616"), 3)
    for z in (50, 76):
        s.line((6, z), (W - 7, z), hexc("#3a2616"), 2)
    for i in range(w * 2):
        x = 14 + i * 28
        for z, c in ((48, "#e8c24a"), (74, "#dcdce8"), (96, "#e8c24a")):
            s.rr(x, z - 18, x + 12, z - 4, hexc(c), hexc("#7a6a30"), 2)
            s.r(x + 4, z - 22, x + 8, z - 18, hexc(c))
            s.rr(x + 1, z - 4, x + 11, z, shade(hexc(c), 0.7), None, 1)
    s.line((10, 22), (22, 42), hexc("#ffffff"))
    s.shadow(0, W - 1)
    return ret(s, w, 1)


def poster_stand():
    s = S(T, 118 + PAD)
    s.r(12, 78, 16, 116, METAL_D)
    s.r(47, 78, 51, 116, METAL_D)
    s.r(8, 112, 20, 117, METAL)
    s.r(43, 112, 55, 117, METAL)
    s.rr(4, 4, 59, 82, hexc("#c8a070"), hexc("#4a3018"), 3)
    s.rr(8, 10, 28, 40, hexc("#f4f0e0"), hexc("#a09070"), 1)
    s.rr(33, 12, 54, 32, hexc("#f0e08a"), hexc("#a09040"), 1)
    s.rr(14, 46, 50, 74, hexc("#d8e8f0"), hexc("#7090a0"), 1)
    for k in range(3):
        s.line((11, 18 + k * 5), (25, 18 + k * 5), hexc("#a89878"))
    s.ell(30, 8, 34, 12, hexc("#d04a4a"))
    s.shadow(8, 55)
    return ret(s, 1, 1)


def extinguisher():
    s = S(T, 62 + PAD)
    s.rr(21, 16, 41, 58, hexc("#d03a3a"), hexc("#6a1414"), 4)
    s.line((24, 20), (24, 54), hexc("#f07a6a"))
    s.line((40, 20), (40, 54), hexc("#a02828"))
    s.rr(25, 6, 37, 16, hexc("#2a2a30"), None, 2)
    s.line((34, 4), (46, 8), hexc("#2a2a30"), 3)
    s.rr(24, 32, 38, 44, hexc("#f4f0e4"), hexc("#a09070"), 1)
    s.rr(18, 54, 44, 60, hexc("#4a4a54"), None, 2)
    s.shadow(20, 42, 44)
    return ret(s, 1, 1)


# ====================================================================== 이름으로 만들기
def get_sprite(name):
    p = name.split("_")
    k = p[0]
    from decor import get_decor
    if k == "desk":
        return desk(p[1] if len(p) > 1 else "")
    if k == "chair":
        return chair(p[1], p[2])
    if k == "stool":
        return stool()
    if k == "table":
        w, d = [int(v) for v in p[1].split("x")]
        return table(w, d, p[2], tray=(len(p) > 3 and p[3] == "tray"))
    if k == "otable":
        w, d = [int(v) for v in p[1].split("x")]
        return oval_table(w, d)
    if k == "tdesk":
        return teacher_desk()
    if k == "shelf":
        return shelf(int(p[1]), "wood")
    if k == "wshelf":
        return shelf(int(p[1]), "white")
    if k == "lowshelf":
        return shelf(int(p[1]), "wood", tall=False)
    if k == "cabinet":
        return cabinet(int(p[1]))
    if k == "lockerbank":
        return lockerbank(int(p[1]))
    if k == "locker":
        return locker(int(p[1]))
    if k == "ac":
        return ac_tower()
    if k == "cubby":
        return cubby()
    if k == "tabcart":
        return tabcart()
    if k == "bin":
        return bin_blue()
    if k == "steel":
        return steel_counter(int(p[1]))
    if k == "traycounter":
        return tray_counter(int(p[1]))
    if k == "libcounter":
        return lib_counter(int(p[1]))
    if k == "barcounter":
        return barcounter(int(p[1]))
    if k == "nook":
        return nook()
    if k == "sofa":
        return sofa(int(p[1]) if len(p) > 1 else 3)
    if k == "sink":
        return sink()
    if k == "fridge":
        return fridge()
    if k == "dispenser":
        return dispenser()
    if k == "purifier":
        return purifier()
    if k == "glasscab":
        return glasscab()
    if k == "plant":
        return plant()
    if k == "trash":
        return trash()
    if k == "bench":
        return bench(int(p[1]))
    if k == "benchc":
        return bench(int(p[1]), cushion=True)
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
    return get_decor(name)
