"""벽에 붙는 장식(창문, 칠판, 문, 현수막...)과 잠긴 문 (고해상도: 타일 64px).

get_decor(name) -> dict(img, w, d, pad=0, solid=False, decor=True)
"""
from PIL import Image, ImageDraw
from pxlib import hexc, shade, lighten, mix, text_image, FONT11, FONT11B, FONT9
from sp import S, decor_ret, rnd, TILE

T = TILE


def paint_taegukgi(w, h):
    """태극기 그림(RGBA)."""
    s = S(w, h)
    s.rr(0, 0, w - 1, h - 1, hexc("#f8f6f2"), hexc("#8a8a90"), 2)
    cx, cy, r = w // 2, h // 2, max(6, min(w, h) // 5)
    s.ell(cx - r, cy - r, cx + r, cy + r, hexc("#3a5fb0"))
    s.d.pieslice([cx - r, cy - r, cx + r, cy + r], 180, 360, fill=hexc("#d0383a"))
    bar = max(2, h // 14)
    for (ax, ay, broken_set) in ((5, 5, (0, 0, 0)), (w - 5 - w // 5, 5, (0, 1, 0)), (5, h - 5 - 4 * bar, (1, 0, 1)), (w - 5 - w // 5, h - 5 - 4 * bar, (1, 1, 1))):
        for i in range(3):
            y = ay + i * (bar + 1)
            if broken_set[i]:
                s.r(ax, y, ax + w // 12, y + bar - 1, hexc("#22202a"))
                s.r(ax + w // 12 + 3, y, ax + w // 5, y + bar - 1, hexc("#22202a"))
            else:
                s.r(ax, y, ax + w // 5, y + bar - 1, hexc("#22202a"))
    return s.im


def window(n, scene="field", blind=False):
    W, H = n * T, 2 * T
    s = S(W, H)
    fr = hexc("#8d89a3")
    s.rr(0, 0, W - 1, H - 1, shade(fr, 0.45), None, 3)
    s.rr(1, 1, W - 2, H - 2, fr, None, 3)
    s.line((2, 2), (W - 3, 2), lighten(fr, 0.55))
    pw = (W - 12) // n
    for i in range(n):
        x0 = 6 + i * pw
        x1 = x0 + pw - 4
        y0, y1 = 9, H - 17
        for y in range(y0, y1 + 1):
            t = (y - y0) / (y1 - y0)
            if scene == "field":
                if t < 0.42:
                    c = mix(hexc("#b8e0f2"), hexc("#eef8fc"), t / 0.42)
                elif t < 0.62:
                    c = mix(hexc("#5a9a50"), hexc("#7ab868"), (t - 0.42) / 0.2)
                else:
                    c = mix(hexc("#ecd2a0"), hexc("#d8b878"), (t - 0.62) / 0.38)
            else:
                c = mix(hexc("#b8e0f2"), hexc("#f2f9fc"), t)
            s.r(x0, y, x1, y, c)
        if scene == "field":
            for k in range(7):                                         # 먼 나무들
                cx = x0 + 8 + k * (pw // 6)
                cy = y0 + 28 + (k % 3) * 4
                s.ell(cx - 9, cy - 10, cx + 9, cy + 10, hexc("#3f8a3f"), hexc("#2f6a30"))
                s.ell(cx - 5, cy - 8, cx + 1, cy - 2, hexc("#68b858"))
            s.line((x0 + 3, y1 - 10), (x1 - 3, y1 - 10), hexc("#faf6ea"))       # 운동장 선
            s.line((x0 + pw // 3, y1 - 24), (x0 + pw // 3 - 10, y1 - 4), hexc("#faf6ea"))
        # 가운데 창살
        mx, my = (x0 + x1) // 2, (y0 + y1) // 2
        s.line((mx, y0), (mx, y1), fr, 2)
        s.line((x0, my), (x1, my), fr, 2)
        s.line((x0 + 3, y0 + 3), (x0 + 14, y0 + 3), hexc("#ffffff"))
        s.line((x0 + 3, y0 + 3), (x0 + 3, y0 + 12), hexc("#ffffff"))
        s.line((x0 + 8, y0 + 8), (x0 + 20, y0 + 22), (255, 255, 255, 120))
        s.ro(x0, y0, x1, y1, None, shade(fr, 0.55))
        if blind:                                                       # 롤 블라인드(반쯤 내림)
            by = y0 + (y1 - y0) // 2 - 4
            s.r(x0, y0, x1, by, hexc("#f2f0ea"))
            for k in range(y0 + 4, by, 6):
                s.line((x0, k), (x1, k), hexc("#dcd8cc"))
            s.r(x0, by - 3, x1, by + 1, hexc("#c8c4b8"))
            s.line((x0, by - 3), (x1, by - 3), hexc("#fbfaf6"))
            s.line((mx, by + 1), (mx, by + 16), hexc("#a8a49a"))
            s.ell(mx - 2, by + 15, mx + 2, by + 19, hexc("#c8c4b8"))
    s.rr(0, H - 11, W - 1, H - 6, lighten(fr, 0.32), shade(fr, 0.5), 2)
    s.r(0, H - 5, W - 1, H - 1, shade(fr, 0.55))
    return decor_ret(s, n, 2)


def blackboard(n, text="", frame="wood"):
    W, H = n * T, 112
    s = S(W, H)
    if frame == "steel":
        fr, fd = hexc("#9aa0a8"), hexc("#4a4e56")
    else:
        fr, fd = hexc("#b57a44"), hexc("#5a3a20")
    s.rr(0, 0, W - 1, H - 1, fd, None, 5)
    s.rr(2, 2, W - 3, H - 3, fr, None, 5)
    s.line((5, 4), (W - 6, 4), lighten(fr, 0.4))
    s.rr(10, 10, W - 11, H - 30, hexc("#1f7a50"), hexc("#10432c"), 3)
    s.vgrad(12, 12, W - 13, H - 32, hexc("#2a8c5e"), hexc("#1b6c46"))
    for i in range(9):                                      # 지운 분필 자국
        x = 22 + i * (W - 60) // 8
        s.line((x, 22 + (i % 3) * 7), (x + 26, 24 + (i % 3) * 7), hexc("#4aa27a"))
        s.line((x + 4, 40 + (i % 2) * 9), (x + 34, 42 + (i % 2) * 9), hexc("#3a9468"))
    if text:
        t = text_image(text, hexc("#f4f4e8"), FONT11B, 11)
        t = t.resize((t.width * 2, t.height * 2), 0)
        s.paste(t, (W - t.width) // 2, (H - 30 - t.height) // 2 + 4, even=True)
    s.rr(8, H - 26, W - 9, H - 16, hexc("#d8c090"), hexc("#7a6030"), 2)               # 분필 받침
    s.rr(18, H - 31, 34, H - 26, hexc("#f4f4f4"), None, 1)
    s.rr(W - 52, H - 34, W - 26, H - 26, hexc("#8a6a4a"), hexc("#3a2a1a"), 2)
    s.line((W - 50, H - 32), (W - 28, H - 32), hexc("#c8a67a"))
    return decor_ret(s, n, 2)


def bulletin(n):
    W, H = n * T, 88
    s = S(W, H)
    s.rr(0, 0, W - 1, H - 1, hexc("#6a4426"), None, 3)
    s.rr(3, 3, W - 4, H - 4, hexc("#3f7a5a"), None, 2)
    s.speckle(4, 4, W - 5, H - 5, [hexc("#4a8a68"), hexc("#356a4c")], 0.08, 7)
    paper = [hexc("#f8f4e4"), hexc("#f6e08a"), hexc("#d4e8f0"), hexc("#f4c8c0")]
    for i in range(n * 2):
        x = 10 + i * 30
        y = 12 + (i % 2) * 6
        s.rr(x, y, x + 20, y + 32, paper[i % 4], shade(paper[i % 4], 0.6), 1)
        for k in range(4):
            s.line((x + 3, y + 8 + k * 5), (x + 17, y + 8 + k * 5), hexc("#a09070"))
        s.ell(x + 8, y + 1, x + 12, y + 5, hexc("#d04a4a"))
    s.rr(16, 52, 56, 76, hexc("#f4e8b0"), hexc("#a09040"), 1)
    for k in range(3):
        s.line((20, 58 + k * 5), (52, 58 + k * 5), hexc("#a09040"))
    return decor_ret(s, n, 1.375)


POSTERS = {
    "gupsik": ("급식 질서", "#f0f6e0", "#4f8a4a"), "menu": ("오늘의 급식", "#fff4d8", "#c46a3a"),
    "water": ("음수대", "#d8ecfa", "#3a6aa8"), "libguide": ("도서관 이용 안내", "#f8f4dc", "#4f8a4a"),
    "recommend": ("이달의 추천 도서", "#fdf0e0", "#a8453d"), "sports": ("체육 대회", "#e8f0fc", "#3a5fb0"),
    "safety": ("안전 수칙", "#fff0d0", "#d9602a"), "quiet": ("조용히 읽어요", "#f4f0fa", "#6a4ab0"),
    "welcome": ("환영합니다", "#fff4e0", "#c46a3a"),
}


def poster(key):
    title, bg, fg = POSTERS[key]
    t = text_image(title, hexc(fg), FONT9, 9)
    t = t.resize((t.width * 2, t.height * 2), 0)
    W = max(72, t.width + 16)
    H = 100
    s = S(W, H)
    s.rr(0, 0, W - 1, H - 1, hexc(bg), shade(hexc(fg), 0.55), 2)
    s.line((2, 2), (W - 3, 2), lighten(hexc(bg), 0.5))
    s.paste(t, (W - t.width) // 2, 8, even=True)
    for i in range(4):
        s.line((10, 38 + i * 7), (W - 12 - (i % 2) * 12, 38 + i * 7), shade(hexc(bg), 0.78))
    s.rr(W // 2 - 14, 64, W // 2 + 13, 92, mix(hexc(bg), hexc(fg), 0.4), shade(hexc(fg), 0.6), 2)
    s.ell(W // 2 - 8, 70, W // 2 + 7, 85, mix(hexc(bg), hexc(fg), 0.2))
    return decor_ret(s, W / T, H / T)


def flag_wall():
    s = S(80, 64)
    s.rr(0, 0, 79, 63, hexc("#b57a44"), hexc("#5a3a20"), 3)
    s.line((3, 3), (76, 3), hexc("#dca868"))
    s.paste(paint_taegukgi(68, 46), 6, 9)
    return decor_ret(s, 80 / T, 1)


def clock():
    s = S(56, 56)
    s.ell(0, 0, 55, 55, hexc("#3a3a46"))
    s.ell(3, 3, 52, 52, hexc("#f8f6f0"))
    for k in range(12):
        import math
        a = k * math.pi / 6
        x0, y0 = 28 + 21 * math.sin(a), 28 - 21 * math.cos(a)
        x1, y1 = 28 + 17 * math.sin(a), 28 - 17 * math.cos(a)
        s.line((x0, y0), (x1, y1), hexc("#3a3a46"), 2 if k % 3 == 0 else 1)
    s.line((28, 28), (28, 11), hexc("#3a3a46"), 2)
    s.line((28, 28), (40, 34), hexc("#3a3a46"), 2)
    s.line((28, 28), (22, 44), hexc("#d04a4a"))
    s.ell(25, 25, 31, 31, hexc("#3a3a46"))
    return decor_ret(s, 56 / T, 56 / T)


def door_class(label):
    W, H = 2 * T, 2 * T
    s = S(W, H)
    wood = hexc("#b87a44")
    s.rr(0, 0, W - 1, H - 1, shade(wood, 0.45), None, 3)
    s.r(4, 4, W - 5, H - 1, wood)
    s.grain(4, 4, W - 5, H - 1, wood, 13, 0.08, (14, 40), horizontal=False)
    for i in range(2):
        x0 = 8 + i * 58
        s.rr(x0, 24, x0 + 52, H - 2, shade(wood, 1.06), shade(wood, 0.5), 3)
        s.rr(x0 + 6, 30, x0 + 46, 62, hexc("#9cc0cf"), shade(wood, 0.45), 3)      # 위쪽 유리창
        s.vgrad(x0 + 8, 32, x0 + 44, 60, hexc("#b8d8e4"), hexc("#8ab4c4"))
        s.line((x0 + 10, 34), (x0 + 22, 48), hexc("#eaf6fa"))
        s.line((x0 + 14, 34), (x0 + 26, 48), (255, 255, 255, 120))
        s.rr(x0 + 6, 72, x0 + 46, H - 12, shade(wood, 0.96), shade(wood, 0.55), 3)   # 아래 나무 판
        s.line((x0 + 9, 76), (x0 + 43, 76), lighten(wood, 0.25))
    s.rr(60, 88, 64, 108, hexc("#e8d9a0"), hexc("#8a7a40"), 1)
    s.rr(67, 88, 71, 108, hexc("#e8d9a0"), hexc("#8a7a40"), 1)
    t = text_image(label, hexc("#ffffff"), FONT9, 9)
    t = t.resize((t.width * 2, t.height * 2), 0)
    s.rr(34, 2, 94, 22, hexc("#3f8a5a"), hexc("#1f5030"), 3)
    s.paste(t, 64 - t.width // 2, 2, even=True)
    return decor_ret(s, 2, 2)


def banner(text, n):
    W, H = n * T, 56
    s = S(W, H)
    s.rr(0, 0, W - 1, H - 1, hexc("#1f3a70"), None, 4)
    s.rr(2, 2, W - 3, H - 3, hexc("#3a5fb0"), None, 4)
    s.r(4, 4, W - 5, 8, hexc("#e8c24a"))
    s.r(4, H - 9, W - 5, H - 5, hexc("#e8c24a"))
    s.r(4, 9, 12, H - 10, hexc("#3fae8a"))
    s.r(W - 13, 9, W - 5, H - 10, hexc("#3fae8a"))
    t = text_image(text, hexc("#ffffff"), FONT11B, 11, outline=hexc("#1f3a70"))
    t = t.resize((t.width * 2, t.height * 2), 0)
    s.paste(t, (W - t.width) // 2, (H - t.height) // 2, even=True)
    return decor_ret(s, n, 56 / T)


def curtain(n):
    W, H = n * T, 2 * T
    s = S(W, H)
    red = hexc("#a8403c")
    s.r(0, 0, W - 1, H - 1, hexc("#2a1a22"))
    cw = max(48, W // 4)
    for side in (0, 1):
        x0 = 0 if side == 0 else W - cw
        s.r(x0, 0, x0 + cw - 1, H - 1, red)
        for k in range(0, cw, 10):
            s.r(x0 + k, 0, x0 + k + 4, H - 1, shade(red, 0.74))
            s.line((x0 + k + 5, 0), (x0 + k + 5, H - 1), lighten(red, 0.2))
        s.line((x0, 0), (x0 + cw - 1, 0), lighten(red, 0.3))
    s.r(0, 0, W - 1, 11, hexc("#d8b040"))
    s.line((0, 12), (W - 1, 12), hexc("#8a6a20"))
    for x in range(6, W, 18):
        s.ell(x, 4, x + 8, 12, hexc("#f0cc60"))
    fl = paint_taegukgi(68, 46)
    s.paste(fl, W // 2 - 34, 40)
    return decor_ret(s, n, 2)


def kitchen(n):
    W, H = n * T, 2 * T
    s = S(W, H)
    s.rr(0, 0, W - 1, H - 1, hexc("#8b93a8"), None, 3)
    s.rr(5, 5, W - 6, H - 6, hexc("#4a5062"), None, 2)
    s.vgrad(8, 8, W - 9, H - 9, hexc("#7a8298"), hexc("#5a6278"))
    for x in range(8, W - 8, 24):                                  # 벽 타일
        s.line((x, 8), (x, 60), hexc("#6a7288"))
    for y in (24, 42, 60):
        s.line((8, y), (W - 9, y), hexc("#6a7288"))
    # 후드와 선반
    s.rr(8, 8, W - 9, 22, hexc("#aab2c6"), hexc("#5a6278"), 2)
    for x in range(14, W - 14, 20):
        s.line((x, 12), (x, 20), hexc("#7a8298"))
    for x in range(14, W - 70, 100):
        s.rr(x, 28, x + 34, 44, hexc("#aab2c6"), hexc("#5a6278"), 2)
        s.rr(x + 40, 32, x + 58, 44, hexc("#8a92a8"), hexc("#4a5062"), 2)
    # 조리사 두 분
    for cx in (W // 3, 2 * W // 3 + 14):
        s.ell(cx - 22, 52, cx + 22, 96, hexc("#e88aa0"), hexc("#8a3a52"))          # 앞치마
        s.ell(cx - 12, 62, cx + 12, 86, hexc("#f4a8bc"))
        s.rr(cx - 12, 24, cx + 12, 54, hexc("#fbcfaf"), hexc("#b08a6a"), 6)         # 얼굴
        s.rr(cx - 12, 40, cx + 12, 54, hexc("#f4f4f8"), hexc("#a8a8b8"), 3)         # 마스크
        s.line((cx - 12, 44), (cx - 16, 48), hexc("#a8a8b8"))
        s.line((cx + 12, 44), (cx + 16, 48), hexc("#a8a8b8"))
        for ex in (cx - 7, cx + 3):                                                  # 눈
            s.rr(ex, 32, ex + 4, 38, hexc("#22192a"), None, 1)
            s.px(ex, 32, hexc("#ffffff"))
        s.line((cx - 9, 29), (cx - 3, 28), hexc("#4a3a2a"), 2)
        s.line((cx + 3, 28), (cx + 9, 29), hexc("#4a3a2a"), 2)
        s.rr(cx - 17, 8, cx + 17, 28, hexc("#fafafe"), hexc("#a0a0b0"), 6)           # 조리모
        s.rr(cx - 12, 2, cx + 12, 14, hexc("#fafafe"), hexc("#a0a0b0"), 6)
        s.line((cx - 12, 22), (cx + 12, 22), hexc("#d8d8e4"))
        s.rr(cx - 28, 62, cx - 12, 74, hexc("#fbcfaf"), None, 4)                    # 손
        s.rr(cx + 12, 62, cx + 28, 74, hexc("#fbcfaf"), None, 4)
    s.rr(0, H - 10, W - 1, H - 1, hexc("#b9bfcc"), hexc("#5a6278"), 2)
    s.line((2, H - 9), (W - 3, H - 9), hexc("#e8ecf6"))
    return decor_ret(s, n, 2)


def sign_hang(text, col="#3f8a5a"):
    t = text_image(text, hexc("#ffffff"), FONT11B, 11, outline=shade(hexc(col), 0.5))
    t = t.resize((t.width * 2, t.height * 2), 0)
    W, H = t.width + 24, 38
    s = S(W, H)
    s.rr(0, 0, W - 1, H - 1, hexc(col), shade(hexc(col), 0.45), 4)
    s.line((3, 3), (W - 4, 3), lighten(hexc(col), 0.45))
    s.paste(t, 12, 4, even=True)
    return decor_ret(s, W / T, H / T)


def facade_sign(text):
    t = text_image(text, hexc("#fff3d0"), FONT11B, 11, outline=hexc("#5a3a20"))
    t = t.resize((t.width * 2, t.height * 2), 0)
    W, H = t.width + 56, 52
    s = S(W, H)
    c = hexc("#b87a44")
    s.rr(0, 4, W - 1, H - 5, hexc("#5a3a20"), None, 8)
    s.rr(2, 6, W - 3, H - 7, c, None, 7)
    s.line((6, 8), (W - 7, 8), lighten(c, 0.45))
    s.line((6, H - 9), (W - 7, H - 9), shade(c, 0.7))
    s.paste(t, (W - t.width) // 2, (H - t.height) // 2, even=True)
    return decor_ret(s, W / T, H / T)


def speaker_wall():
    s = S(44, 60)
    s.rr(0, 0, 43, 59, hexc("#14141c"), None, 3)
    s.rr(2, 2, 41, 57, hexc("#34343f"), None, 3)
    s.ell(8, 8, 35, 32, hexc("#1c1c24"), hexc("#6a6a7c"))
    s.ell(15, 15, 28, 25, hexc("#4a4a5c"))
    s.ell(12, 36, 31, 53, hexc("#1c1c24"), hexc("#6a6a7c"))
    return decor_ret(s, 44 / T, 60 / T)


def tv():
    """벽에 걸린 TV (교실)."""
    s = S(120, 78)
    s.rr(0, 0, 119, 65, hexc("#14141a"), None, 3)
    s.rr(3, 3, 116, 62, hexc("#2a2c36"), None, 2)
    s.vgrad(5, 5, 114, 60, hexc("#32343e"), hexc("#1a1c24"))
    s.line((8, 8), (50, 8), hexc("#5a5c6a"))
    s.line((8, 8), (8, 30), hexc("#4a4c5a"))
    s.line((10, 50), (40, 12), (255, 255, 255, 40))
    s.rr(52, 66, 68, 74, hexc("#8a90a2"), hexc("#3a3f50"), 1)
    s.rr(40, 74, 80, 77, hexc("#6a7088"), None, 1)
    return decor_ret(s, 120 / T, 78 / T)


def fan():
    """벽걸이 선풍기."""
    import math
    s = S(60, 70)
    s.rr(26, 52, 34, 68, hexc("#8a90a2"), hexc("#3a3f50"), 2)
    s.ell(2, 2, 57, 57, hexc("#c8d4e4"), hexc("#5a6278"))
    s.ell(5, 5, 54, 54, hexc("#e4ecf6"))
    for k in range(3):
        a = k * 2 * math.pi / 3 + 0.4
        s.poly([(29, 29), (29 + 22 * math.cos(a - 0.5), 29 + 22 * math.sin(a - 0.5)), (29 + 22 * math.cos(a + 0.5), 29 + 22 * math.sin(a + 0.5))], hexc("#9ab8d8"), hexc("#5a78a0"))
    s.ell(23, 23, 35, 35, hexc("#5a6278"), hexc("#2a2f40"))
    for k in range(1, 4):
        s.ell(29 - k * 7, 29 - k * 7, 29 + k * 7, 29 + k * 7, None, hexc("#8a96ac"))
    return decor_ret(s, 60 / T, 70 / T)


def truss(n):
    """체육관 지붕 아래 나무 들보."""
    W, H = n * T, 40
    s = S(W, H)
    wd, wl = hexc("#6a3a22"), hexc("#8a5030")
    s.r(0, 0, W - 1, H - 1, hexc("#3a2418"))
    for i in range(0, W, 128):
        s.line((i, H - 2), (i + 64, 6), wd, 7)
        s.line((i + 128, H - 2), (i + 64, 6), wd, 7)
        s.line((i, H - 4), (i + 64, 4), wl, 2)
    s.r(0, H - 9, W - 1, H - 1, wd)
    s.line((0, H - 9), (W - 1, H - 9), wl)
    return decor_ret(s, n, H / T)


def gate(orient, open_):
    """잠긴 문. v는 세로로 서 있는 문(1x4칸), h는 가로로 놓인 문(6x1칸)."""
    W, H = (T, 4 * T) if orient == "v" else (6 * T, T)
    s = S(W, H)
    dark, mid = hexc("#4a4f60"), hexc("#8a90a8")
    if not open_:
        s.rr(0, 0, W - 1, H - 1, dark, None, 4)
        s.rr(3, 3, W - 4, H - 4, mid, None, 3)
        for y in range(8, H - 8):                 # 위험 줄무늬(노랑/검정)
            for x in range(8, W - 8):
                s.px(x, y, hexc("#f0c030") if ((x + y) // 9) % 2 == 0 else hexc("#2a2a34"))
        s.rr(6, 6, W - 7, 9, hexc("#6a7088"), None, 1)
        s.rr(6, H - 10, W - 7, H - 7, hexc("#6a7088"), None, 1)
        cx, cy = W // 2, H // 2
        s.rr(cx - 26, cy - 24, cx + 26, cy + 24, hexc("#fff4d0"), hexc("#3a3f50"), 5)
        s.rr(cx - 12, cy - 5, cx + 11, cy + 17, hexc("#e8b830"), hexc("#7a5a10"), 3)
        s.d.arc([cx - 10, cy - 22, cx + 9, cy - 1], 180, 360, fill=hexc("#7a5a10"), width=4)
        s.r(cx - 2, cy + 3, cx + 1, cy + 9, hexc("#5a3a10"))
        s.line((cx - 9, cy - 2), (cx + 8, cy - 2), hexc("#f8e078"))
    else:
        if orient == "v":
            for y in (0, H - 16):
                s.rr(0, y, W - 1, y + 15, hexc("#6a7088"), None, 3)
                s.rr(3, y + 3, W - 4, y + 12, mid, None, 2)
            s.rr(0, 16, 6, H - 17, mid, None, 2)
        else:
            for x in (0, W - 16):
                s.rr(x, 0, x + 15, H - 1, hexc("#6a7088"), None, 3)
                s.rr(x + 3, 3, x + 12, H - 4, mid, None, 2)
            s.rr(16, 0, W - 17, 6, mid, None, 2)
    return decor_ret(s, W // T, H // T)


def get_decor(name):
    p = name.split("_")
    k = p[0]
    if k == "window":
        return window(int(p[1]), p[2] if len(p) > 2 and p[2] != "blind" else "field", blind=("blind" in p))
    if k == "blackboard":
        return blackboard(int(p[1]), p[2].replace("~", " ") if len(p) > 2 and p[2] != "steel" else "", frame="steel" if "steel" in p else "wood")
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
    if k == "tv":
        return tv()
    if k == "fan":
        return fan()
    if k == "truss":
        return truss(int(p[1]))
    if k == "gate":
        return gate(p[1], p[2] == "open")
    raise KeyError(name)
