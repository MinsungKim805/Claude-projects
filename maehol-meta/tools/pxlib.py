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
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0
