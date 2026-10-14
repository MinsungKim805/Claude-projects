"""고해상도(타일 64px) 픽셀아트용 그리기 도구.

게임 안의 "논리 칸"은 32px이고, 그림은 그 2배(ART=2)인 64px 타일로 그려요.
그래서 같은 화면 크기에서 픽셀이 2배 촘촘해져요.  S 는 그림 한 장을 그리는 캔버스예요.
"""
import math
from PIL import Image, ImageDraw
from pxlib import hexc, shade, lighten, darken, mix, hash2

TILE = 64        # 그림 한 칸의 크기(픽셀)
ART = 2          # 게임 안 칸(32)보다 몇 배 촘촘한지
PAD = 6          # 물건 아래 그림자 여백


def rnd(*k):
    return hash2(*[int(v) & 0xFFFF for v in k])


class S:
    def __init__(self, w, h):
        self.w, self.h = int(w), int(h)
        self.im = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    # ---------------------------------------------------------------- 기본 도형
    def r(self, x0, y0, x1, y1, c):
        self.d.rectangle([x0, y0, x1, y1], fill=c)

    def ro(self, x0, y0, x1, y1, c, ol):
        self.d.rectangle([x0, y0, x1, y1], fill=c, outline=ol)

    def rr(self, x0, y0, x1, y1, c, ol=None, r=3):
        """모서리가 둥근 사각형. ol 을 주면 1px 테두리를 그려요."""
        if ol:
            self.rr(x0, y0, x1, y1, ol, None, r)
            x0, y0, x1, y1, r = x0 + 1, y0 + 1, x1 - 1, y1 - 1, max(0, r - 1)
        for i in range(r):
            inset = r - int(math.sqrt(max(0, r * r - (r - i - 0.5) ** 2)) + 0.5)
            self.d.line([(x0 + inset, y0 + i), (x1 - inset, y0 + i)], fill=c)
            self.d.line([(x0 + inset, y1 - i), (x1 - inset, y1 - i)], fill=c)
        self.d.rectangle([x0, y0 + r, x1, y1 - r], fill=c)

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((int(x), int(y)), c)

    def line(self, a, b, c, w=1):
        self.d.line([a, b], fill=c, width=w)

    def ell(self, x0, y0, x1, y1, c, ol=None):
        self.d.ellipse([x0, y0, x1, y1], fill=c, outline=ol)

    def poly(self, pts, c, ol=None):
        self.d.polygon(pts, fill=c, outline=ol)

    def paste(self, im, x, y, even=False):
        """그림 붙이기. 글씨는 even=True 로 짝수 위치에 붙여야 줄였을 때 글자가 깨지지 않아요."""
        x, y = int(x), int(y)
        if even:
            x, y = x & ~1, y & ~1
        self.im.alpha_composite(im, (x, y))

    # ---------------------------------------------------------------- 색칠 도구
    def vgrad(self, x0, y0, x1, y1, c1, c2):
        h = max(1, y1 - y0)
        for y in range(y0, y1 + 1):
            self.d.line([(x0, y), (x1, y)], fill=mix(c1, c2, (y - y0) / h))

    def hgrad(self, x0, y0, x1, y1, c1, c2):
        w = max(1, x1 - x0)
        for x in range(x0, x1 + 1):
            self.d.line([(x, y0), (x, y1)], fill=mix(c1, c2, (x - x0) / w))

    def grain(self, x0, y0, x1, y1, base, seed=0, amt=0.09, seg=(10, 34), horizontal=True):
        """나무결: 짧은 줄들을 살짝 다른 밝기로 깔아요."""
        n = (y1 - y0 + 1) if horizontal else (x1 - x0 + 1)
        for i in range(n):
            pos = (y0 if horizontal else x0) + i
            x = (x0 if horizontal else y0) - int(rnd(seed, i, 1) * seg[1])
            end = x1 if horizontal else y1
            k = 0
            while x < end:
                ln = seg[0] + int(rnd(seed, i, k + 2) * (seg[1] - seg[0]))
                f = 1 + (rnd(seed, i, k + 90) - 0.5) * 2 * amt
                c = shade(base, f)
                a, b = max(x, x0 if horizontal else y0), min(x + ln, end)
                if b >= a:
                    self.d.line([(a, pos), (b, pos)] if horizontal else [(pos, a), (pos, b)], fill=c)
                x += ln + int(rnd(seed, i, k + 40) * 6)
                k += 1

    def speckle(self, x0, y0, x1, y1, cols, density=0.05, seed=0, size=1):
        n = int((x1 - x0 + 1) * (y1 - y0 + 1) * density)
        for i in range(n):
            x = x0 + int(rnd(seed, i, 11) * (x1 - x0 + 1))
            y = y0 + int(rnd(seed, i, 12) * (y1 - y0 + 1))
            c = cols[int(rnd(seed, i, 13) * len(cols))]
            self.d.rectangle([x, y, x + size - 1, y + size - 1], fill=c)

    def shadow(self, x0, x1, a=58, soft=True):
        """물건 아래 바닥에 깔리는 그림자(위쪽은 진하고 끝은 옅게)."""
        sh = Image.new("RGBA", self.im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(sh)
        for i in range(PAD):
            d.line([(x0 + 3 + i // 2, self.h - PAD + i), (x1 - 3 - i // 2, self.h - PAD + i)], fill=(30, 20, 40, int(a * (1 - i / (PAD + 1)))))
        self.im.alpha_composite(sh)
        self.d = ImageDraw.Draw(self.im)

    # ---------------------------------------------------------------- 입체 상자(위에서 비스듬히)
    def blk(self, x0, y0, x1, y1, top_h, col, ol=None, top=None, front=None, hi=True):
        """윗면(top_h 높이)과 앞면이 함께 보이는 상자. 왼쪽 위에서 빛이 와요."""
        ol = ol or shade(col, 0.42)
        top = top or lighten(col, 0.2)
        front = front or col
        self.d.rectangle([x0, y0, x1, y1], fill=front, outline=ol)
        self.d.rectangle([x0 + 1, y0 + 1, x1 - 1, y0 + top_h - 1], fill=top)
        self.d.line([(x0 + 1, y0 + top_h), (x1 - 1, y0 + top_h)], fill=shade(col, 0.62))
        if hi:
            self.d.line([(x0 + 1, y0 + 1), (x1 - 1, y0 + 1)], fill=lighten(top, 0.45))
            self.d.line([(x0 + 1, y0 + 1), (x0 + 1, y1 - 1)], fill=lighten(front, 0.22))
            self.d.line([(x1 - 1, y0 + top_h + 1), (x1 - 1, y1 - 1)], fill=shade(front, 0.8))
            self.d.line([(x0 + 1, y1 - 1), (x1 - 1, y1 - 1)], fill=shade(front, 0.78))


def ret(s, w, d, solid=True, **kw):
    return dict(img=s.im, w=w, d=d, pad=PAD, solid=solid, **kw)


def decor_ret(s, w, d, **kw):
    return dict(img=s.im, w=w, d=d, pad=0, solid=False, decor=True, **kw)
