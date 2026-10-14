"""픽셀아트 생성용 공용 도구 (색상, 폰트, 외곽선, 잡음)."""
import os
import random
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONT11 = os.path.join(ROOT, "tools", "fonts", "Galmuri11.ttf")
FONT11B = os.path.join(ROOT, "tools", "fonts", "Galmuri11-Bold.ttf")
FONT9 = os.path.join(ROOT, "tools", "fonts", "Galmuri9.ttf")

TILE = 32  # 한 칸의 크기(픽셀). 게임에서는 2배로 확대해서 보여줘요.


def hexc(s, a=255):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


def shade(c, f):
    return (max(0, min(255, int(c[0] * f))), max(0, min(255, int(c[1] * f))),
            max(0, min(255, int(c[2] * f))), c[3] if len(c) > 3 else 255)


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)


def lighten(c, t):
    return mix(c, (255, 255, 255, 255), t)


def darken(c, t):
    return mix(c, (0, 0, 0, 255), t)


def rgba(c, a):
    return (c[0], c[1], c[2], a)


class P:
    ink = hexc("#2a1f2d")
    white = hexc("#f4f2f8")
    paper = hexc("#fffbe8")


_font_cache = {}


def font(path, size):
    k = (path, size)
    if k not in _font_cache:
        _font_cache[k] = ImageFont.truetype(path, size)
    return _font_cache[k]


def text_image(txt, color, path=FONT11, size=11, outline=None):
    """안티앨리어싱 없는 픽셀 글씨 이미지를 만들어요."""
    f = font(path, size)
    tmp = Image.new("L", (10, 10), 0)
    d = ImageDraw.Draw(tmp)
    d.fontmode = "1"
    l, t, r, b = d.textbbox((0, 0), txt, font=f)
    w, h = r - l + 2, b - t + 2
    mask = Image.new("L", (w, h), 0)
    dm = ImageDraw.Draw(mask)
    dm.fontmode = "1"
    dm.text((1 - l, 1 - t), txt, font=f, fill=255)
    out = Image.new("RGBA", (w + 2, h + 2), (0, 0, 0, 0))
    if outline:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if dx or dy:
                    out.paste(Image.new("RGBA", (w, h), outline), (1 + dx, 1 + dy), mask)
    out.paste(Image.new("RGBA", (w, h), color), (1, 1), mask)
    return out


def add_outline(im, col=None):
    """투명 영역과 맞닿은 바깥 1px에 어두운 윤곽선을 그려요."""
    col = col or P.ink
    w, h = im.size
    src = im.load()
    out = im.copy()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] != 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] > 200:
                    dst[x, y] = col
                    break
    return out


def hash2(x, y, s=0):
    n = (x * 374761393 + y * 668265263 + s * 982451653) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65536.0


# ---------------------------------------------------------------------- 2배 그림 → 게임 크기 그림
def _lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def _pick(px):
    """2x2 점 네 개를 점 한 개로 줄여요. 가장 많은 색을 고르고, 어두운 윤곽선은 살려요."""
    op = [p for p in px if p[3] >= 200]
    if len(op) >= 2:
        cnt = {}
        for p in op:
            cnt[p] = cnt.get(p, 0) + 1
        top = max(cnt, key=lambda k: cnt[k])
        n = cnt[top]
        if n >= 3:
            d = min(op, key=_lum)
            if cnt[d] == 1 and _lum(d) < _lum(top) - 60:      # 한 점뿐인 진한 선은 남겨요
                top = d
        elif n == 2 and len(cnt) == 2:
            top = min(cnt, key=_lum)                          # 반반이면 어두운 쪽 (선이 끊기지 않게)
        elif n == 1:
            top = tuple(sum(p[i] for p in op) // len(op) for i in range(3)) + (255,)
        return top[:3] + (255,)
    if len(op) == 1 and all(p[3] == 0 for p in px if p is not op[0]) and _lum(op[0]) < 110:
        return op[0][:3] + (255,)                             # 모서리의 어두운 윤곽선 한 점
    a = sum(p[3] for p in px)
    if a < 32:
        return (0, 0, 0, 0)
    rgb = tuple(sum(p[i] * p[3] for p in px) // a for i in range(3))   # 옅은 그림자는 평균으로
    return rgb + (a // 4,)


def down2(im):
    """2배 촘촘하게 그린 그림을 절반 크기로 줄여요 (게임 칸 32px 기준 픽셀아트로 만들어요)."""
    im = im.convert("RGBA")
    if im.width % 2 or im.height % 2:      # 홀수면 오른쪽/위쪽에 투명 한 줄을 붙여요
        big = Image.new("RGBA", (im.width + im.width % 2, im.height + im.height % 2), (0, 0, 0, 0))
        big.paste(im, (0, big.height - im.height))
        im = big
    W, H = im.size
    out = Image.new("RGBA", (W // 2, H // 2))
    cache = {}
    for y0 in range(0, H, 64):             # 64줄씩 끊어서 처리해요 (메모리 절약)
        sh = min(64, H - y0)
        data = list(im.crop((0, y0, W, y0 + sh)).getdata())
        res = []
        for by in range(sh // 2):
            r0 = data[2 * by * W:(2 * by + 1) * W]
            r1 = data[(2 * by + 1) * W:(2 * by + 2) * W]
            for bx in range(W // 2):
                a, b, c, d = r0[2 * bx], r0[2 * bx + 1], r1[2 * bx], r1[2 * bx + 1]
                if a == b == c == d:
                    res.append(a if a[3] else (0, 0, 0, 0))
                    continue
                k = (a, b, c, d)
                v = cache.get(k)
                if v is None:
                    v = cache[k] = _pick(k)
                res.append(v)
        strip = Image.new("RGBA", (W // 2, sh // 2))
        strip.putdata(res)
        out.paste(strip, (0, y0 // 2))
    return out
