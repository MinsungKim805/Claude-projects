"""학생 캐릭터(2.5D 픽셀아트) 생성기.

캐릭터 한 명 = 스프라이트 시트 한 장.
  가로: 프레임 3개 (0 서기, 1 왼발, 2 오른발)
  세로: 방향 4개 (0 앞, 1 왼쪽, 2 오른쪽, 3 뒤)
  칸 크기 30x46, 발 중심(앵커)은 (15, 43)
"""
from PIL import Image, ImageDraw
from pxlib import P, hexc, shade, lighten, add_outline

CW, CH = 30, 46
ANCHOR = (15, 43)
DIRS = ["down", "left", "right", "up"]

# 모든 학생이 공통으로 입는 교복 (자주색 조끼)
VEST = hexc("#6d1f40")
VEST_D = hexc("#531730")
VEST_L = hexc("#8a3558")
SHIRT = hexc("#fbfbff")
SHIRT_S = hexc("#c4c9de")
TIE = hexc("#a51c2f")
PANTS = hexc("#3a3c42")
PANTS_D = hexc("#292b30")
SKIRT = hexc("#2d3050")
SKIRT_D = hexc("#1f2238")
SHOE = hexc("#25262e")
SHOE_L = hexc("#4a4c58")
EYE = hexc("#22192a")
SKIN = hexc("#fbcfaf")
SKIN_S = hexc("#eba98f")
BLUSH = hexc("#f4a5a0")
GLASS = hexc("#5a3d3a")

STYLES = {
    # --- 플레이어 캐릭터 3명 (참고 사진 순서: 동훈, 민성, 성민)
    "donghun": dict(hair="#2a2834", hair_hi="#4c4a62", style="short"),
    "minseong": dict(hair="#4a3430", hair_hi="#6e5148", style="bowl", glasses=True, blush=True),
    "seongmin": dict(hair="#2a2834", hair_hi="#4c4a62", style="cap", glasses=True, chubby=True,
                     cap="#2c2b40"),
    # --- NPC 학생들
    "haneul": dict(hair="#5b3a2a", hair_hi="#82584a", style="long", skirt=True, blush=True),
    "doyun": dict(hair="#7a4a2c", hair_hi="#9c6a44", style="spiky"),
    "seoyeon": dict(hair="#23212e", hair_hi="#46445a", style="pony", skirt=True),
    "jiu": dict(hair="#3a2a2a", hair_hi="#5c4646", style="bob", glasses=True, skirt=True),
    "banjang": dict(hair="#2a2834", hair_hi="#4c4a62", style="short", glasses=True, badge="gold"),
    "extra_a": dict(hair="#8a5a30", hair_hi="#aa7a4c", style="short"),
    "extra_b": dict(hair="#23212e", hair_hi="#46445a", style="bob", skirt=True),
    "extra_c": dict(hair="#5b3a2a", hair_hi="#82584a", style="bowl", skirt=False),
    "extra_d": dict(hair="#3a2a2a", hair_hi="#5c4646", style="long", skirt=True),
}


def _c(s):
    return hexc(s) if isinstance(s, str) else s


class Pen:
    def __init__(self, im):
        self.im = im
        self.d = ImageDraw.Draw(im)

    def r(self, x0, y0, x1, y1, col):
        self.d.rectangle([x0, y0, x1, y1], fill=col)

    def p(self, x, y, col):
        if 0 <= x < self.im.width and 0 <= y < self.im.height:
            self.im.putpixel((x, y), col)


def draw_char(st, dirn, frame):
    """한 칸(30x46)을 그려서 돌려줘요."""
    im = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    pen = Pen(im)
    cx = 15
    chubby = st.get("chubby", False)
    skirt = st.get("skirt", False)
    hair, hair_hi = _c(st["hair"]), _c(st["hair_hi"])
    hair_d = shade(hair, 0.7)
    style = st["style"]
    glasses = st.get("glasses", False)
    bw = 7 if chubby else 6           # 몸통 반너비
    hw = 9 if chubby else 8           # 머리 반너비
    bob = -1 if frame in (1, 2) else 0

    # 그림자
    sh = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    ds = ImageDraw.Draw(sh)
    ds.ellipse([cx - 10, 40, cx + 10, 45], fill=(30, 20, 40, 60))
    im.alpha_composite(sh)

    side = dirn in ("left", "right")
    if dirn == "left":
        # 오른쪽 그림을 뒤집어서 쓸 거라 오른쪽으로 그려요.
        pass

    # ------------------------------------------------------------ 다리
    if not side:
        lyoff = -1 if frame == 1 else 0
        ryoff = -1 if frame == 2 else 0
        for (x0, off) in ((cx - 5, lyoff), (cx + 1, ryoff)):
            if skirt:
                # 맨다리 + 흰 양말
                pen.r(x0 + 1, 40 + off, x0 + 3, 41 + off, SKIN)
                pen.r(x0 + 1, 41 + off, x0 + 3, 42 + off, SHIRT)
                pen.r(x0, 42 + off, x0 + 4, 43 + off, SHOE)
            else:
                pen.r(x0, 35, x0 + 4, 40 + off, PANTS)
                pen.r(x0 + 3, 35, x0 + 4, 40 + off, PANTS_D)
                pen.r(x0 - (0 if x0 > cx else 1), 41 + off, x0 + 4 + (1 if x0 > cx else 0), 43 + off, SHOE)
                pen.p(x0 + 1, 41 + off, SHOE_L)
    else:
        # 옆모습: 앞다리/뒤다리가 벌어져요
        sw = {0: (0, 0), 1: (3, -3), 2: (-3, 3)}[frame]
        for off, col, dcol in ((sw[1], PANTS_D, PANTS_D), (sw[0], PANTS, PANTS)):
            x0 = cx - 2 + off
            if skirt:
                pen.r(x0, 40, x0 + 3, 41, SKIN)
                pen.r(x0, 41, x0 + 3, 42, SHIRT)
                pen.r(x0, 42, x0 + 4, 43, SHOE)
            else:
                pen.r(x0, 35, x0 + 3, 40, col)
                pen.r(x0, 41, x0 + 5, 43, SHOE)
                pen.p(x0 + 3, 41, SHOE_L)

    # ------------------------------------------------------------ 치마 / 바지 허리
    if skirt:
        if not side:
            pen.r(cx - bw - 1, 34 + bob, cx + bw, 36 + bob, SKIRT)
            pen.r(cx - bw - 2, 37 + bob, cx + bw + 1, 39 + bob, SKIRT)
            pen.r(cx - bw - 2, 39 + bob, cx + bw + 1, 39 + bob, SKIRT_D)
            for k in range(-bw, bw, 3):
                pen.r(cx + k, 36 + bob, cx + k, 39 + bob, SKIRT_D)
        else:
            pen.r(cx - 6, 34 + bob, cx + 5, 36 + bob, SKIRT)
            pen.r(cx - 7, 37 + bob, cx + 6, 39 + bob, SKIRT)
            pen.r(cx - 7, 39 + bob, cx + 6, 39 + bob, SKIRT_D)
    else:
        if not side:
            pen.r(cx - bw, 34 + bob, cx + bw - 1, 36, PANTS)
        else:
            pen.r(cx - 5, 34 + bob, cx + 4, 36, PANTS)

    # ------------------------------------------------------------ 긴 머리(뒤쪽 층)
    if style in ("long",) and dirn in ("down", "up"):
        pen.r(cx - hw - 1, 12 + bob, cx + hw, 28 + bob, hair)
        pen.r(cx - hw - 1, 12 + bob, cx - hw, 28 + bob, hair_d)
    if style == "pony" and dirn == "up":
        pen.r(cx - 2, 18 + bob, cx + 1, 31 + bob, hair)
        pen.r(cx - 2, 18 + bob, cx - 2, 31 + bob, hair_d)

    # ------------------------------------------------------------ 몸통(조끼)
    if not side:
        tx0, tx1 = cx - bw, cx + bw - 1
        pen.r(tx0, 23 + bob, tx1, 34 + bob, VEST)
        pen.r(tx1 - 1, 24 + bob, tx1, 34 + bob, VEST_D)
        pen.r(tx0 + 1, 24 + bob, tx0 + 1, 33 + bob, VEST_L)
        pen.r(tx0, 34 + bob, tx1, 34 + bob, VEST_D)
        # 팔(흰 와이셔츠 소매)
        aoff = {0: (0, 0), 1: (1, -1), 2: (-1, 1)}[frame]
        for sx, ao in ((tx0 - 2, aoff[0]), (tx1 + 1, aoff[1])):
            pen.r(sx, 24 + bob + ao, sx + 1, 32 + bob + ao, SHIRT)
            pen.r(sx + (0 if sx > cx else 1), 24 + bob + ao, sx + (0 if sx > cx else 1), 32 + bob + ao, SHIRT_S)
            pen.r(sx, 33 + bob + ao, sx + 1, 34 + bob + ao, SKIN)
        if dirn == "down":
            # 브이넥 + 와이셔츠 칼라 + 넥타이
            pen.r(cx - 3, 23 + bob, cx + 2, 23 + bob, SHIRT)
            pen.r(cx - 2, 24 + bob, cx + 1, 24 + bob, SHIRT)
            pen.r(cx - 1, 25 + bob, cx, 25 + bob, SHIRT)
            pen.p(cx - 3, 24 + bob, SHIRT_S)
            pen.p(cx + 2, 24 + bob, SHIRT_S)
            pen.r(cx - 1, 24 + bob, cx, 29 + bob, TIE)
            pen.p(cx, 25 + bob, shade(TIE, 0.75))
            pen.p(cx - 1, 30 + bob, TIE)
            # 배지
            bc = hexc("#e8c24a") if st.get("badge") == "gold" else hexc("#ffffff")
            pen.r(cx + 2, 28 + bob, cx + 3, 29 + bob, bc)
            pen.p(cx + 3, 29 + bob, hexc("#3b56a8"))
        else:
            pen.r(cx - 3, 23 + bob, cx + 2, 23 + bob, SHIRT)
        # 목
        if dirn == "down":
            pen.r(cx - 1, 22 + bob, cx, 22 + bob, SKIN_S)
        else:
            pen.r(cx - 1, 21 + bob, cx, 22 + bob, SKIN_S)
    else:
        tx0, tx1 = cx - 5, cx + 4
        pen.r(tx0, 23 + bob, tx1, 34 + bob, VEST)
        pen.r(tx0, 23 + bob, tx0, 34 + bob, VEST_D)
        pen.r(tx0, 34 + bob, tx1, 34 + bob, VEST_D)
        pen.r(cx + 1, 23 + bob, cx + 4, 24 + bob, SHIRT)  # 칼라
        # 팔
        ao = {0: 0, 1: -2, 2: 2}[frame]
        pen.r(cx - 2 + ao, 24 + bob, cx + ao, 32 + bob, SHIRT)
        pen.r(cx - 2 + ao, 24 + bob, cx - 2 + ao, 32 + bob, SHIRT_S)
        pen.r(cx - 2 + ao, 33 + bob, cx + ao, 34 + bob, SKIN)
        pen.r(cx, 21 + bob, cx + 1, 22 + bob, SKIN_S)

    # ------------------------------------------------------------ 머리
    hy = bob  # 머리 상하 흔들림
    if not side:
        fx0, fx1 = cx - hw + 1, cx + hw - 2
        # 얼굴
        pen.r(fx0, 9 + hy, fx1, 21 + hy, SKIN)
        pen.p(fx0, 21 + hy, (0, 0, 0, 0))
        pen.p(fx1, 21 + hy, (0, 0, 0, 0))
        pen.r(fx0 + 1, 21 + hy, fx1 - 1, 21 + hy, SKIN_S)
        # 귀
        pen.r(fx0 - 1, 14 + hy, fx0 - 1, 17 + hy, SKIN_S)
        pen.r(fx1 + 1, 14 + hy, fx1 + 1, 17 + hy, SKIN_S)
    else:
        fx0, fx1 = cx - hw + 1, cx + hw - 3
        pen.r(fx0, 9 + hy, fx1, 21 + hy, SKIN)
        pen.p(fx0, 21 + hy, (0, 0, 0, 0))
        pen.p(fx1, 21 + hy, (0, 0, 0, 0))
        pen.r(fx0 + 1, 21 + hy, fx1 - 1, 21 + hy, SKIN_S)
        pen.p(fx1 + 1, 16 + hy, SKIN)  # 코

    # ------------------------------------------------------------ 얼굴 표정
    if dirn == "down":
        ex = (cx - 5, cx + 3)
        for e in ex:
            pen.r(e, 14 + hy, e + 1, 16 + hy, EYE)
            pen.p(e, 14 + hy, hexc("#ffffff"))
        if st.get("blush"):
            for e in (cx - 7, cx + 5):
                pen.r(e, 17 + hy, e + 1, 18 + hy, BLUSH)
        pen.r(cx - 1, 19 + hy, cx, 19 + hy, hexc("#c9706e"))
        pen.p(cx - 2, 18 + hy, hexc("#c9706e"))
        pen.p(cx + 1, 18 + hy, hexc("#c9706e"))
        if glasses:
            for e in ex:
                pen.r(e - 1, 13 + hy, e + 2, 13 + hy, GLASS)
                pen.r(e - 1, 17 + hy, e + 2, 17 + hy, GLASS)
                pen.r(e - 2, 14 + hy, e - 2, 16 + hy, GLASS)
                pen.r(e + 3, 14 + hy, e + 3, 16 + hy, GLASS)
            pen.r(cx - 1, 14 + hy, cx, 14 + hy, GLASS)
            pen.p(fx0 - 0, 14 + hy, GLASS)
            pen.p(fx1 + 0, 14 + hy, GLASS)
    elif dirn == "right" or dirn == "left":
        ex = cx + 3
        pen.r(ex, 14 + hy, ex + 1, 16 + hy, EYE)
        pen.p(ex, 14 + hy, hexc("#ffffff"))
        if st.get("blush"):
            pen.r(ex - 2, 17 + hy, ex - 1, 18 + hy, BLUSH)
        pen.r(ex + 1, 19 + hy, ex + 2, 19 + hy, hexc("#c9706e"))
        if glasses:
            pen.r(ex - 1, 13 + hy, ex + 2, 13 + hy, GLASS)
            pen.r(ex - 1, 17 + hy, ex + 2, 17 + hy, GLASS)
            pen.r(ex - 2, 14 + hy, ex - 2, 16 + hy, GLASS)
            pen.r(ex + 3, 14 + hy, ex + 3, 16 + hy, GLASS)
            pen.r(cx - 3, 14 + hy, ex - 3, 14 + hy, GLASS)
        # 귀
        pen.r(cx - 2, 15 + hy, cx - 1, 17 + hy, SKIN_S)

    # ------------------------------------------------------------ 머리카락 / 모자
    _hair(pen, st, dirn, cx, hw, hy, hair, hair_hi, hair_d, fx0, fx1)

    out = im
    if dirn == "left":
        out = im.transpose(Image.FLIP_LEFT_RIGHT)
    return add_outline(out)


def _hair(pen, st, dirn, cx, hw, hy, hair, hair_hi, hair_d, fx0, fx1):
    style = st["style"]
    x0, x1 = cx - hw, cx + hw - 1
    top = 3 + hy
    if style == "cap":
        capc = _c(st.get("cap", "#2c2b40"))
        capd = shade(capc, 0.7)
        capl = lighten(capc, 0.25)
        if dirn == "down":
            pen.r(x0, top + 1, x1, 9 + hy, capc)
            pen.r(x0 + 2, top, x1 - 2, top, capc)
            pen.r(x0 + 1, top + 1, x0 + 3, top + 1, capl)
            pen.r(cx + 2, top + 2, cx + 5, top + 2, capl)
            pen.r(x0 - 1, 10 + hy, x1 + 1, 11 + hy, capd)
            pen.r(x0, 12 + hy, x0, 14 + hy, hair)
            pen.r(x1, 12 + hy, x1, 14 + hy, hair)
            pen.r(cx - 2, 6 + hy, cx + 1, 7 + hy, hexc("#d7d9ee"))  # 로고 점
        elif dirn == "up":
            pen.r(x0, top + 1, x1, 12 + hy, capc)
            pen.r(x0 + 2, top, x1 - 2, top, capc)
            pen.r(x0 + 1, top + 1, x0 + 3, top + 1, capl)
            pen.r(x0, 13 + hy, x1, 17 + hy, hair)
            pen.r(cx - 3, 12 + hy, cx + 2, 12 + hy, capd)
        else:
            pen.r(x0, top + 1, x1 - 1, 10 + hy, capc)
            pen.r(x0 + 2, top, x1 - 3, top, capc)
            pen.r(x0 + 1, top + 1, x0 + 3, top + 1, capl)
            pen.r(cx + 2, 10 + hy, cx + 11, 11 + hy, capd)   # 챙
            pen.r(x0, 11 + hy, cx - 1, 16 + hy, hair)
        return
    if dirn == "down":
        if style == "short":
            pen.r(x0, top + 1, x1, 10 + hy, hair)
            pen.r(x0 + 2, top, x1 - 2, top, hair)
            pen.r(x0, 11 + hy, x0 + 1, 15 + hy, hair)
            pen.r(x1 - 1, 11 + hy, x1, 15 + hy, hair)
            pen.r(fx0 + 1, 11 + hy, fx0 + 5, 11 + hy, hair)
            pen.r(fx1 - 4, 11 + hy, fx1 - 1, 11 + hy, hair)
            pen.p(cx - 1, 11 + hy, hair)
            pen.p(cx - 2, 12 + hy, hair)
            pen.r(x0 + 3, top + 1, x0 + 5, top + 2, hair_hi)
            pen.r(cx + 1, top + 2, cx + 4, top + 2, hair_hi)
        elif style == "bowl":
            pen.r(x0, top + 1, x1, 12 + hy, hair)
            pen.r(x0 + 2, top, x1 - 2, top, hair)
            pen.r(x0, 13 + hy, x0 + 1, 16 + hy, hair)
            pen.r(x1 - 1, 13 + hy, x1, 16 + hy, hair)
            pen.r(x0 + 3, top + 1, x0 + 6, top + 2, hair_hi)
            for k in range(fx0 + 1, fx1, 3):
                pen.p(k, 12 + hy, hair_d)
        elif style == "spiky":
            pen.r(x0, top + 2, x1, 10 + hy, hair)
            for k in range(x0 + 1, x1, 3):
                pen.r(k, top, k + 1, top + 1, hair)
            pen.r(x0, 11 + hy, x0 + 1, 14 + hy, hair)
            pen.r(x1 - 1, 11 + hy, x1, 14 + hy, hair)
            for k in range(fx0 + 1, fx1, 3):
                pen.r(k, 11 + hy, k + 1, 12 + hy, hair)
            pen.r(x0 + 2, top + 3, x0 + 5, top + 3, hair_hi)
        elif style in ("long", "bob", "pony"):
            pen.r(x0, top + 1, x1, 11 + hy, hair)
            pen.r(x0 + 2, top, x1 - 2, top, hair)
            pen.r(x0, 12 + hy, x0 + 2, (22 if style == "bob" else 20) + hy, hair)
            pen.r(x1 - 2, 12 + hy, x1, (22 if style == "bob" else 20) + hy, hair)
            pen.r(fx0 + 2, 11 + hy, fx1 - 2, 12 + hy, hair)
            pen.p(cx - 1, 12 + hy, SKIN)
            pen.r(x0 + 3, top + 1, x0 + 6, top + 2, hair_hi)
            if style == "pony":
                pen.r(x1 + 1, 6 + hy, x1 + 2, 9 + hy, hair)
    elif dirn == "up":
        pen.r(x0, top + 1, x1, 18 + hy, hair)
        pen.r(x0 + 2, top, x1 - 2, top, hair)
        pen.r(x0 + 3, top + 1, x0 + 6, top + 2, hair_hi)
        pen.r(cx - 1, 7 + hy, cx + 2, 8 + hy, hair_d)
        if style in ("long", "bob", "pony"):
            pen.r(x0, 18 + hy, x1, (24 if style == "long" else 21) + hy, hair)
            pen.r(x0, 18 + hy, x0 + 1, (24 if style == "long" else 21) + hy, hair_d)
        elif style in ("short", "bowl", "spiky"):
            pen.r(x0 + 1, 19 + hy, x1 - 1, 19 + hy, hair)
        if style == "pony":
            pen.r(cx - 1, 15 + hy, cx + 1, 17 + hy, hexc("#a51c2f"))
    else:  # right (left는 뒤집어서)
        if style in ("short", "spiky"):
            pen.r(x0, top + 1, x1 - 1, 10 + hy, hair)
            pen.r(x0 + 2, top, x1 - 3, top, hair)
            pen.r(x0, 11 + hy, cx - 2, 17 + hy, hair)
            pen.r(cx + 1, 11 + hy, x1 - 1, 11 + hy, hair)
            pen.r(cx + 4, 12 + hy, cx + 6, 12 + hy, hair)
            pen.r(x0 + 3, top + 1, x0 + 6, top + 2, hair_hi)
            if style == "spiky":
                for k in range(x0 + 1, x1 - 2, 3):
                    pen.r(k, top - 0, k + 1, top, hair_hi)
        elif style == "bowl":
            pen.r(x0, top + 1, x1 - 1, 12 + hy, hair)
            pen.r(x0 + 2, top, x1 - 3, top, hair)
            pen.r(x0, 13 + hy, cx - 2, 17 + hy, hair)
            pen.r(x0 + 3, top + 1, x0 + 6, top + 2, hair_hi)
        else:
            pen.r(x0, top + 1, x1 - 1, 11 + hy, hair)
            pen.r(x0 + 2, top, x1 - 3, top, hair)
            pen.r(x0, 12 + hy, cx - 2, (23 if style == "bob" else 27) + hy, hair)
            pen.r(cx + 1, 11 + hy, x1 - 1, 12 + hy, hair)
            pen.r(x0 + 3, top + 1, x0 + 6, top + 2, hair_hi)
            if style == "pony":
                pen.r(x0 - 2, 8 + hy, x0 - 1, 20 + hy, hair)


def make_sheet(key):
    st = STYLES[key]
    sheet = Image.new("RGBA", (CW * 3, CH * 4), (0, 0, 0, 0))
    for r, dn in enumerate(DIRS):
        for f in range(3):
            sheet.alpha_composite(draw_char(st, dn, f), (f * CW, r * CH))
    return sheet


if __name__ == "__main__":
    import sys
    keys = list(STYLES.keys())
    S = 5
    sheet = Image.new("RGBA", (CW * 3 * len(keys[:6]), CH * 4), (214, 200, 180, 255))
    for i, k in enumerate(keys[:6]):
        sheet.alpha_composite(make_sheet(k), (i * CW * 3, 0))
    sheet = sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST)
    sheet.save(sys.argv[1] if len(sys.argv) > 1 else "chars_preview.png")
