"""픽셀아트 생성용 공용 도구 (색상, 폰트, 외곽선, 잡음)."""
import math
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


# ---------------------------------------------------------------------- 귀여운 도트 그리기 도구
PAD = 3                                   # 물건 아래 그림자가 깔리는 줄 수
_OUT = (58, 44, 96, 255)                  # 윤곽선에 섞는 보랏빛


def ol_of(c, k=0.55):
    """같은 색의 진한 윤곽선 색 (검정 대신 보랏빛이 도는 진한 색이라 귀여워요)."""
    return mix(shade(c, k), _OUT, 0.3)


_CORNER = {0: [], 1: [1], 2: [2, 1], 3: [3, 1, 1], 4: [4, 2, 1, 1]}   # 둥근 모서리: 줄마다 깎는 칸 수


def _corner(r):
    if r not in _CORNER:                  # 큰 반지름은 원 공식으로 계산해요
        _CORNER[r] = [r - int(math.sqrt(max(0, r * r - (r - i - 0.5) ** 2)) + 0.5) for i in range(r)]
    return _CORNER[r]


class S:
    """그림 한 장을 그리는 캔버스. (x0,y0,x1,y1) 는 양 끝 칸을 포함해요."""

    def __init__(self, w, h):
        self.w, self.h = int(w), int(h)
        self.im = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def r(self, x0, y0, x1, y1, c):
        self.d.rectangle([x0, y0, x1, y1], fill=c)

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((int(x), int(y)), c)

    def line(self, a, b, c):
        self.d.line([a, b], fill=c)

    def ell(self, x0, y0, x1, y1, c, ol=None):
        self.d.ellipse([x0, y0, x1, y1], fill=c, outline=ol)

    def poly(self, pts, c, ol=None):
        self.d.polygon(pts, fill=c, outline=ol)

    def paste(self, im, x, y, even=False):
        self.im.alpha_composite(im, (int(x), int(y)))

    def _fill_rr(self, x0, y0, x1, y1, c, r):
        r = max(0, min(r, (x1 - x0) // 2, (y1 - y0) // 2))
        cut = _corner(r)
        for i, k in enumerate(cut):
            self.d.line([(x0 + k, y0 + i), (x1 - k, y0 + i)], fill=c)
            self.d.line([(x0 + k, y1 - i), (x1 - k, y1 - i)], fill=c)
        self.d.rectangle([x0, y0 + len(cut), x1, y1 - len(cut)], fill=c)

    def rr(self, x0, y0, x1, y1, c, ol=None, r=1, hi=None, lo=None):
        """둥근 사각형. ol=윤곽선, hi=위쪽 밝은 줄, lo=아래쪽 어두운 줄 (입체감)."""
        if ol:
            self._fill_rr(x0, y0, x1, y1, ol, r)
            x0, y0, x1, y1, r = x0 + 1, y0 + 1, x1 - 1, y1 - 1, max(0, r - 1)
        self._fill_rr(x0, y0, x1, y1, c, r)
        if hi and y1 - y0 >= 3:
            self.d.line([(x0 + max(1, r), y0), (x1 - max(1, r), y0)], fill=hi)
        if lo and y1 - y0 >= 3:
            self.d.line([(x0 + max(1, r), y1), (x1 - max(1, r), y1)], fill=lo)

    def box(self, x0, y0, x1, y1, top_h, col, r=1, top=None, ol=None):
        """윗면(top_h 줄)과 앞면이 보이는 입체 상자. 윗면은 밝고, 앞면 아래쪽은 살짝 어두워요."""
        ol = ol or ol_of(col)
        top = top or lighten(col, 0.3)
        self.rr(x0, y0, x1, y1, col, ol, r)
        self.d.rectangle([x0 + 1, y0 + 1, x1 - 1, y0 + top_h], fill=top)
        self.d.line([(x0 + 1, y0 + top_h + 1), (x1 - 1, y0 + top_h + 1)], fill=shade(col, 0.82))
        self.d.line([(x0 + 2, y0 + 1), (x1 - 2, y0 + 1)], fill=lighten(top, 0.5))
        self.d.line([(x0 + 1, y1 - 1), (x1 - 1, y1 - 1)], fill=shade(col, 0.82))

    def shadow(self, x0, x1, a=64):
        """바닥 그림자: 아래 PAD 줄에 옅게 깔려요."""
        sh = Image.new("RGBA", self.im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(sh)
        for i in range(PAD):
            k = i // 2 + (1 if i else 0)
            d.line([(x0 + 1 + k, self.h - PAD + i), (x1 - 1 - k, self.h - PAD + i)], fill=(52, 36, 96, int(a * (1 - i / (PAD + 0.6)))))
        self.im.alpha_composite(sh)
        self.d = ImageDraw.Draw(self.im)


def ret(s, w, d, solid=True):
    return dict(img=s.im, w=w, d=d, pad=PAD, solid=solid)


def decor_ret(s, w, d):
    return dict(img=s.im, w=w, d=d, pad=0, solid=False, decor=True)
