"""매홀중학교 큰 맵 빌더 (ZEP식 탑다운, 32px 칸, 알록달록 귀여운 도트).

운동장 → 복도 → 급식실 ↓ 복도 ↓ 체육관 ← 복도 ← 도서관 ↓ 복도 ↓ 교실(퀴즈 존)
방에서 방으로 가는 통로(문)는 소개를 끝내야 열려요.

  build() -> dict(bg=Image, data=dict, sprites=dict, ...)
"""
import math
from collections import deque
from PIL import Image, ImageDraw
from pxlib import hexc, shade, lighten, mix, hash2, text_image, ol_of, FONT11B, FONT9

T = 32                   # 한 칸(픽셀)
MAP_W, MAP_H = 70, 82    # 맵 크기(칸)

# (id, 한글 이름, 바닥 테마, x, y, w, h)  칸 단위, 걸어다닐 수 있는 바닥
#
#   왼쪽 줄 :  급식실(위)  ← 본관 복도 c1 ←  본관 입구  ← 운동장(아래)
#   오른쪽 줄: 급식실 → 복도 c2 → 체육관 ↓ 복도 c3 ↓ 도서관 ↓ 복도 c4 ↓ 교실
AREAS = [
    ("playground", "운동장", "sand", 2, 35, 28, 17),
    ("entrance", None, "plaza", 13, 32, 6, 3),            # 본관 입구 (운동장 → 복도로 들어가는 문)
    ("c1", "복도", "corridor", 12, 18, 8, 14),            # 본관 복도: 운동장에서 급식실로 올라가는 세로 복도
    ("cafeteria", "급식실", "beige", 2, 3, 32, 15),
    ("c2", "복도", "corridor", 34, 9, 12, 6),             # 급식실 → 체육관 (가로)
    ("gym", "체육관", "wood", 46, 3, 22, 16),
    ("c3", "복도", "corridor", 58, 19, 8, 14),            # 체육관 → 도서관 (세로)
    ("library", "도서관", "carpet", 46, 33, 20, 16),
    ("c4", "복도", "corridor", 47, 49, 8, 14),            # 도서관 → 교실 (세로)
    ("classroom", "교실", "plank", 46, 63, 20, 16),
]
PLAZA = (2, 35, 28, 5)      # 운동장 위쪽 단상 바닥 (x, y, w, h): 관중석·계단·구령대가 있는 줄
ROOM_OFFSET = {"library": (39, -1), "classroom": (39, -2)}   # 옛 방 그림을 새 자리로 옮기는 이동량(칸)
# 체육관 무대 양옆의 작은 방(준비실 등): 바닥에서 빼서 벽 덩어리로 만들어요 (x, y, 가로, 세로)
GYM_ROOMS = [(46, 3, 6, 4), (62, 3, 6, 4)]
# 체육관 세로 코트 2개 (x, 가로) — 위아래 y 8~17. 두 코트 사이(54~59)는 빈 공간이에요
GYM_COURTS = [(48, 6), (60, 6)]
COURT_Y0, COURT_H = 8, 10

# 잠긴 문: (id, 방향 v=세로 문/h=가로 문, x, y, 크기, 열리는 조건, 안내 문구)
GATES = [
    ("A", "h", 13, 33, 6, ["playground"], "운동장 소개를 끝내면 본관 입구가 열려요"),
    ("C", "v", 34, 9, 6, ["cafeteria"], "급식실 소개를 끝내면 열려요"),
    ("E", "h", 58, 19, 8, ["gym"], "체육관 소개를 끝내면 열려요"),
    ("G", "h", 47, 49, 8, ["library"], "도서관 소개를 끝내면 열려요"),
    ("H", "h", 47, 62, 8, ["playground", "cafeteria", "gym", "library"], "소개를 모두 끝내야 퀴즈 존에 들어가요"),
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
        for (rx, ry, rw, rh) in GYM_ROOMS:                 # 체육관 옆 작은 방은 벽이에요
            for yy in range(ry, ry + rh):
                for xx in range(rx, rx + rw):
                    self.floor[yy][xx] = False
                    self.theme[yy][xx] = None
                    self.area[yy][xx] = None
        px_, py_, pw_, ph_ = PLAZA
        for yy in range(py_, py_ + ph_):                  # 운동장 위쪽은 광장(돌바닥)
            for xx in range(px_, px_ + pw_):
                self.theme[yy][xx] = "plaza"
        self.ox = self.oy = 0  # 방 하나를 통째로 옮겨 놓을 때 쓰는 이동량(칸)
        self.objects = []      # (name, tx, ty)
        self.decor = []        # (name, px, py)  (그림 픽셀 좌표)
        self.npcs = []
        self.sprite_info = {}

    # ---- 배치 도우미
    def obj(self, name, tx, ty):
        self.objects.append((name, tx + self.ox, ty + self.oy))

    def dec(self, name, tx, ty, dx=0, dy=0):
        """벽 장식 배치. (tx, ty)는 칸, dx/dy 는 픽셀 단위 조정이에요."""
        self.decor.append((name, (tx + self.ox) * T + dx, (ty + self.oy) * T + dy))

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


# ====================================================================== 바닥 그리기 (깔끔한 무늬 + 방마다 다른 색)
def c(h):
    return hexc(h)


def fill(d, X, Y, col):
    d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=col)


def draw_floor(d, th, tx, ty, X, Y, b=None):
    _draw_floor(d, th, tx, ty, X, Y)
    if th == "corridor" and b is not None:                 # 복도 가장자리: 민트색 안내 띠
        for dx in (-1, 1):
            if not b.is_floor(tx + dx, ty):
                x0 = X + 1 if dx < 0 else X + T - 5
                d.rectangle([x0, Y, x0 + 3, Y + T - 1], fill=c("#8adcc8"))
                d.line([(x0 + (0 if dx < 0 else 3), Y), (x0 + (0 if dx < 0 else 3), Y + T - 1)], fill=c("#5cbca4"))
                d.line([(x0 + (3 if dx < 0 else 0), Y), (x0 + (3 if dx < 0 else 0), Y + T - 1)], fill=c("#b8f0e0"))


def _draw_floor(d, th, tx, ty, X, Y):
    if th == "sand":                                       # 운동장: 연한 모래색 체크 + 작은 돌멩이
        fill(d, X, Y, c("#f6dc98") if (tx + ty) % 2 == 0 else c("#f2d48c"))
        if rnd(tx, ty, 1) > 0.72:
            px, py = X + 4 + int(rnd(tx, ty, 2) * 22), Y + 4 + int(rnd(tx, ty, 3) * 22)
            d.rectangle([px, py, px + 2, py + 1], fill=c("#dcb86a"))
            d.point((px, py), fill=c("#ecd08a"))
        if rnd(tx, ty, 4) > 0.9:                           # 풀 한 포기
            px, py = X + 6 + int(rnd(tx, ty, 5) * 18), Y + 8 + int(rnd(tx, ty, 6) * 16)
            d.line([(px, py), (px, py - 2)], fill=c("#6cc060"))
            d.line([(px + 2, py), (px + 3, py - 3)], fill=c("#6cc060"))
            d.line([(px - 2, py), (px - 3, py - 2)], fill=c("#4aa048"))
    elif th == "plaza":                                    # 본관 앞 광장: 연한 돌바닥
        base = c("#ece6dc") if (tx + ty) % 2 == 0 else c("#e3dcd0")
        fill(d, X, Y, base)
        d.line([(X, Y + T - 1), (X + T - 1, Y + T - 1)], fill=c("#cfc6b8"))
        d.line([(X + T - 1, Y), (X + T - 1, Y + T - 1)], fill=c("#cfc6b8"))
        d.line([(X + 2, Y + 2), (X + 9, Y + 2)], fill=c("#f8f4ec"))
        if rnd(tx, ty, 8) > 0.8:
            d.point((X + 8 + int(rnd(tx, ty, 9) * 16), Y + 10 + int(rnd(tx, ty, 10) * 14)), fill=c("#c4bcae"))
    elif th == "corridor":                                 # 복도: 크림색 타일 + 군데군데 회색 타일
        dark = rnd(tx // 2, ty, 3) > 0.74
        if dark:
            base = c("#a2a9c4")
            fill(d, X, Y, base)
            for k in range(7):
                d.point((X + 3 + int(rnd(tx, ty, k) * 26), Y + 3 + int(rnd(tx, ty, k + 9) * 26)), fill=c("#c4cae0") if k % 2 else c("#8890ac"))
            d.line([(X, Y + T - 1), (X + T - 1, Y + T - 1)], fill=c("#858ca8"))
            d.line([(X + T - 1, Y), (X + T - 1, Y + T - 1)], fill=c("#858ca8"))
        else:
            base = c("#fbf3e2") if (tx + ty) % 2 == 0 else c("#f3e9d4")
            fill(d, X, Y, base)
            d.line([(X, Y + T - 1), (X + T - 1, Y + T - 1)], fill=c("#e2d6bc"))
            d.line([(X + T - 1, Y), (X + T - 1, Y + T - 1)], fill=c("#e2d6bc"))
    elif th == "beige":                                    # 급식실: 따뜻한 노란 체크 타일
        base = c("#ffe9a8") if (tx + ty) % 2 == 0 else c("#ffdf94")
        fill(d, X, Y, base)
        d.line([(X, Y + T - 1), (X + T - 1, Y + T - 1)], fill=c("#f0c26e"))
        d.line([(X + T - 1, Y), (X + T - 1, Y + T - 1)], fill=c("#f0c26e"))
    elif th == "carpet":                                   # 도서관: 보랏빛 카펫
        base = c("#bca6e0") if (tx + ty) % 2 == 0 else c("#b49ddb")
        fill(d, X, Y, base)
        for (ox, oy) in ((8, 8), (24, 8), (8, 24), (24, 24)):
            d.point((X + ox, Y + oy), fill=c("#cdbcee"))
            d.point((X + ox - 1, Y + oy), fill=c("#a58cd0"))
        d.line([(X, Y), (X + T - 1, Y)], fill=c("#c6b2e8"))
        d.line([(X, Y), (X, Y + T - 1)], fill=c("#c6b2e8"))
    elif th in ("wood", "plank"):                          # 체육관/교실: 시원한 마루
        if th == "wood":
            cols = [c("#f9cd78"), c("#f4c46c"), c("#fcd685")]
            seam = c("#dc9a44")
        else:
            cols = [c("#f8dca4"), c("#f2d198"), c("#fbe4b4")]
            seam = c("#dcac70")
        for r in range(4):
            R = ty * 4 + r
            y0 = Y + r * 8
            base = cols[int(rnd(R, 7, 1) * 3)]
            d.rectangle([X, y0, X + T - 1, y0 + 7], fill=base)
            d.line([(X, y0), (X + T - 1, y0)], fill=lighten(base, 0.35))
            d.line([(X, y0 + 7), (X + T - 1, y0 + 7)], fill=seam)
            for jx in range(-64, MAP_W * T, 64):             # 판자 끝 이음새
                gx = jx + int(rnd(R, 9, 2) * 64)
                if X <= gx < X + T:
                    d.line([(gx, y0 + 1), (gx, y0 + 6)], fill=seam)
    else:
        fill(d, X, Y, c("#cccccc"))


# ====================================================================== 벽 그리기 (방마다 다른 색)
def draw_brick(d, X, Y, base, mortar, gx, gy, bw=16, bh=8, var=0.07):
    d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=mortar)
    for ry in range(0, T, bh):
        row = (gy + ry) // bh
        off = (bw // 2) if row % 2 else 0
        x = -off
        while x < T:
            col = (gx + x + off) // bw
            v = 1 + (rnd(col, row, 4) - 0.5) * 2 * var
            cc = shade(base, v)
            x0, x1 = max(0, x + 1), min(T - 1, x + bw - 1)
            if x1 >= x0:
                d.rectangle([X + x0, Y + ry + 1, X + x1, Y + ry + bh - 1], fill=cc)
                d.line([(X + x0, Y + ry + 1), (X + x1, Y + ry + 1)], fill=lighten(cc, 0.22))
                d.line([(X + x0, Y + ry + bh - 1), (X + x1, Y + ry + bh - 1)], fill=shade(cc, 0.86))
            x += bw


# kind: 벽 종류 / up: 윗벽 색 / lo: 아랫벽(허리 아래) 색 / style: 아랫벽 무늬
THEMES = {
    "playground": dict(kind="facade"),
    "cafeteria": dict(kind="paint", up="#fff1c4", lo="#ffa85a", style="tile"),
    "gym": dict(kind="paint", up="#fff0cc", lo="#e39a5a", style="wood"),
    "library": dict(kind="paint", up="#f2e8ff", lo="#c8b0ec", style="panel"),
    "classroom": dict(kind="paint", up="#e2f8e8", lo="#f0b878", style="wood"),
    "corridor": dict(kind="brick"),
}
CAP = "#4a4478"


def theme_of(room):
    return THEMES.get(room, THEMES["corridor"])


def draw_cap(d, b, x, y, X, Y, facade):
    if facade and not b.is_floor(x, y + 3):                       # 운동장 둘레: 동글동글 생울타리
        d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=c("#3f9a52"))
        for i in range(9):
            cx = X + 3 + int(rnd(x, y, i) * 26)
            cy = Y + 3 + int(rnd(x, y, i + 20) * 26)
            r = 5 + int(rnd(x, y, i + 40) * 3)
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=[c("#4cb860"), c("#5cc870"), c("#46ae5a")][i % 3], outline=c("#2f8a46"))
        for i in range(6):
            cx = X + 2 + int(rnd(x, y, i + 60) * 27)
            cy = Y + 2 + int(rnd(x, y, i + 80) * 27)
            d.rectangle([cx, cy, cx + 1, cy], fill=c("#9ae88a"))
        if rnd(x, y, 99) > 0.8:                                    # 꽃
            fx, fy = X + 6 + int(rnd(x, y, 98) * 20), Y + 6 + int(rnd(x, y, 97) * 20)
            d.rectangle([fx, fy, fx + 1, fy + 1], fill=c("#ff9ac0"))
        return
    d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=c(CAP))
    if facade and b.is_floor(x, y + 3):                           # 본관 지붕
        d.rectangle([X, Y, X + T - 1, Y + T - 1], fill=c("#7d8ac0"))
        for ix in range(0, T, 8):
            d.line([(X + ix, Y + 2), (X + ix, Y + T - 9)], fill=c("#6c78b0"))
        d.rectangle([X, Y + T - 8, X + T - 1, Y + T - 1], fill=c("#5a66a0"))
        d.line([(X, Y), (X + T - 1, Y)], fill=c("#a6b2e4"))
        d.line([(X, Y + T - 9), (X + T - 1, Y + T - 9)], fill=c("#98a4d8"))
        return
    d.line([(X, Y), (X + T - 1, Y)], fill=c("#6a64a0"))
    d.line([(X, Y + 1), (X + T - 1, Y + 1)], fill=c("#5a5490"))
    for (dx, dy, rect) in ((1, 0, [X + T - 3, Y, X + T - 1, Y + T - 1]), (-1, 0, [X, Y, X + 2, Y + T - 1]),
                           (0, 1, [X, Y + T - 3, X + T - 1, Y + T - 1]), (0, -1, [X, Y, X + T - 1, Y + 2])):
        nx, ny = x + dx, y + dy
        if b.is_floor(nx, ny):
            d.rectangle(rect, fill=c("#33305a"))
        elif b.kind(nx, ny) == "void":
            d.rectangle(rect, fill=c("#3a3668"))


def draw_wall(d, b, x, y, kind, X, Y):
    room = b.wall_room(x, y)
    th = theme_of(room)
    k = th["kind"]
    if kind == "cap":
        draw_cap(d, b, x, y, X, Y, k == "facade")
        return
    low = kind == "face_low"
    if k == "facade":
        draw_brick(d, X, Y, c("#e88a62"), c("#f8c8a8"), x * T, y * T)
        if low:
            d.rectangle([X, Y + T - 4, X + T - 1, Y + T - 1], fill=c("#b8685a"))
            d.line([(X, Y + T - 4), (X + T - 1, Y + T - 4)], fill=c("#d8907a"))
    elif k == "brick":
        draw_brick(d, X, Y, c("#e8946a"), c("#fcd2b0"), x * T, y * T)
        if low:
            d.rectangle([X, Y + T - 5, X + T - 1, Y + T - 1], fill=c("#6a5070"))          # 걸레받이
            d.line([(X, Y + T - 5), (X + T - 1, Y + T - 5)], fill=c("#8a7090"))
    else:
        up, lo = c(th["up"]), c(th["lo"])
        for i in range(T):                                          # 윗벽: 위쪽이 살짝 밝은 색
            d.line([(X, Y + i), (X + T - 1, Y + i)], fill=mix(lighten(up, 0.12), up, i / T) if not low else up)
        if not low:
            d.line([(X, Y), (X + T - 1, Y)], fill=shade(up, 0.82))
        if x % 4 == 0:                                              # 벽 패널 이음
            d.line([(X, Y), (X, Y + T - 1)], fill=shade(up, 0.93))
        if low:
            rail = 12
            d.line([(X, Y + rail), (X + T - 1, Y + rail)], fill=lighten(lo, 0.55))
            d.line([(X, Y + rail + 1), (X + T - 1, Y + rail + 1)], fill=shade(lo, 0.7))
            d.rectangle([X, Y + rail + 2, X + T - 1, Y + T - 1], fill=lo)
            st = th["style"]
            if st == "tile":                                        # 주황 타일
                for gx in range(0, T, 8):
                    d.line([(X + gx, Y + rail + 2), (X + gx, Y + T - 1)], fill=shade(lo, 0.86))
                for gy in range(rail + 2, T, 8):
                    d.line([(X, Y + gy), (X + T - 1, Y + gy)], fill=shade(lo, 0.86))
                    d.line([(X + 1, Y + gy + 1), (X + 3, Y + gy + 1)], fill=lighten(lo, 0.4))
            elif st == "wood":                                      # 세로 판자
                for gx in range(0, T, 8):
                    d.line([(X + gx, Y + rail + 2), (X + gx, Y + T - 1)], fill=shade(lo, 0.78))
                    d.line([(X + gx + 1, Y + rail + 2), (X + gx + 1, Y + T - 1)], fill=lighten(lo, 0.22))
            else:                                                   # 패널
                for gx in range(0, T, 16):
                    d.rectangle([X + gx + 2, Y + rail + 4, X + gx + 13, Y + T - 7], outline=shade(lo, 0.84))
                    d.line([(X + gx + 3, Y + rail + 5), (X + gx + 12, Y + rail + 5)], fill=lighten(lo, 0.3))
            d.rectangle([X, Y + T - 4, X + T - 1, Y + T - 1], fill=shade(lo, 0.62))          # 걸레받이
            d.line([(X, Y + T - 4), (X + T - 1, Y + T - 4)], fill=lighten(lo, 0.1))


# ====================================================================== 전체 배경 그리기
def render_bg(b):
    bg = Image.new("RGBA", (MAP_W * T, MAP_H * T), c("#1f1c3e"))
    d = ImageDraw.Draw(bg)
    for y in range(MAP_H):
        for x in range(MAP_W):
            X, Y = x * T, y * T
            kd = b.kind(x, y)
            if kd == "void":
                continue
            if kd == "floor":
                draw_floor(d, b.theme[y][x], x, y, X, Y, b)
            else:
                draw_wall(d, b, x, y, kd, X, Y)
    paint_rugs(bg, d, b)
    # 벽 아래 부드러운 그림자
    sh = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    ds = ImageDraw.Draw(sh)
    for y in range(MAP_H):
        for x in range(MAP_W):
            if b.is_floor(x, y) and not b.is_floor(x, y - 1):
                for i in range(7):
                    ds.rectangle([x * T, y * T + i, x * T + T - 1, y * T + i], fill=(50, 30, 90, int(58 - i * 8)))
            if b.is_floor(x, y) and not b.is_floor(x - 1, y):
                for i in range(4):
                    ds.rectangle([x * T + i, y * T, x * T + i, y * T + T - 1], fill=(50, 30, 90, int(34 - i * 8)))
    bg.alpha_composite(sh)
    # 창문에서 들어오는 햇빛 (바닥 위에만)
    light = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    dl = ImageDraw.Draw(light)
    for (name, px, py) in b.decor:
        if name.startswith("window_") and "glass" not in name:
            n = int(name.split("_")[1])
            wx0, wx1 = px + 5, px + n * T - 5
            fy = (py // T + 3) * T
            dl.polygon([(wx0, fy), (wx1, fy), (wx1 + 40, fy + 110), (wx0 + 40, fy + 110)], fill=(255, 252, 214, 40))
            dl.polygon([(wx0 + 8, fy), (wx1 - 8, fy), (wx1 + 28, fy + 100), (wx0 + 48, fy + 100)], fill=(255, 255, 230, 26))
    fmask = Image.new("L", bg.size, 0)
    dm = ImageDraw.Draw(fmask)
    for y in range(MAP_H):
        for x in range(MAP_W):
            if b.is_floor(x, y):
                dm.rectangle([x * T, y * T, x * T + T - 1, y * T + T - 1], fill=255)
    light.putalpha(Image.composite(light.getchannel("A"), Image.new("L", bg.size, 0), fmask))
    bg.alpha_composite(light)
    d = ImageDraw.Draw(bg)
    paint_markings(bg, d, b)
    return bg


def rug(bg, tx, ty, w, h, base, edge, dot):
    """바닥에 깔린 동글동글한 러그."""
    d = ImageDraw.Draw(bg)
    x0, y0, x1, y1 = tx * T + 2, ty * T + 2, (tx + w) * T - 3, (ty + h) * T - 3
    d.rounded_rectangle([x0, y0, x1, y1], 8, fill=ol_of(c(edge), 0.9))
    d.rounded_rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], 7, fill=c(edge))
    d.rounded_rectangle([x0 + 5, y0 + 5, x1 - 5, y1 - 5], 5, fill=c(base))
    for xx in range(x0 + 12, x1 - 8, 12):
        for yy in (y0 + 8, y1 - 9):
            d.rectangle([xx, yy, xx + 2, yy + 1], fill=c(dot))


def paint_rugs(bg, d, b):
    ox, oy = ROOM_OFFSET["library"]
    rug(bg, 8 + ox, 37 + oy, 7, 6, "#f4b6d0", "#e888b0", "#ffe0ee")          # 도서관: 탁자마다 다른 색 러그
    rug(bg, 15 + ox, 40 + oy, 5, 5, "#a8e4d0", "#5cc0a0", "#e0fff4")
    rug(bg, 21 + ox, 40 + oy, 5, 5, "#ffe08a", "#f0b83a", "#fff4c8")


def paint_markings(bg, d, b):
    """바닥 표시(운동장 라인, 농구 코트, 퀴즈 존 매트, 복도 화살표)."""
    white = c("#fffdf2")
    ov = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    do = ImageDraw.Draw(ov)

    def rect_line(x0, y0, x1, y1, w=2):
        for o in range(w):
            d.rectangle([x0 + o, y0 + o, x1 - o, y1 - o], outline=white)

    # ---- 운동장: 축구장 라인 (운동장 아래쪽 모래밭)
    x0, y0, x1, y1 = 5 * T, 42 * T, 26 * T, 51 * T
    rect_line(x0, y0, x1, y1)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    d.line([(cx, y0), (cx, y1)], fill=white, width=2)
    d.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], outline=white, width=2)
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=white)
    rect_line(x0, cy - 50, x0 + 66, cy + 50)
    rect_line(x1 - 66, cy - 50, x1, cy + 50)
    rect_line(x0, cy - 26, x0 + 26, cy + 26)
    rect_line(x1 - 26, cy - 26, x1, cy + 26)
    # ---- 체육관: 세로 농구 코트 2개 (무대 아래쪽). 페인트 구역은 색칠
    courts = []
    for (cx0, cw) in GYM_COURTS:
        x0, y0, x1, y1 = cx0 * T, COURT_Y0 * T, (cx0 + cw) * T, (COURT_Y0 + COURT_H) * T
        courts.append((x0, y0, x1, y1, (x0 + x1) // 2, (y0 + y1) // 2))
    for (x0, y0, x1, y1, ccx, ccy) in courts:
        do.rectangle([ccx - T, y0, ccx + T, y0 + 3 * T], fill=(70, 168, 255, 175))
        do.rectangle([ccx - T, y1 - 3 * T, ccx + T, y1], fill=(255, 96, 110, 150))
        do.ellipse([ccx - 28, ccy - 28, ccx + 28, ccy + 28], fill=(255, 236, 110, 140))
    bg.alpha_composite(ov)
    d = ImageDraw.Draw(bg)
    for (x0, y0, x1, y1, ccx, ccy) in courts:
        rect_line(x0, y0, x1, y1)
        d.line([(x0, ccy), (x1, ccy)], fill=white, width=2)
        d.ellipse([ccx - 28, ccy - 28, ccx + 28, ccy + 28], outline=white, width=2)
        for (ya, yb, up) in ((y0, y0 + 3 * T, True), (y1 - 3 * T, y1, False)):
            d.rectangle([ccx - T, ya, ccx + T, yb], outline=white, width=2)
            ry = yb if up else ya
            d.arc([ccx - 40, ry - 40, ccx + 40, ry + 40], 0 if up else 180, 180 if up else 360, fill=white, width=2)
    # ---- 교실: 퀴즈 존 매트
    ox, oy = ROOM_OFFSET["classroom"]
    qx0, qy0, qx1, qy1 = (12 + ox) * T, (72 + oy) * T, (22 + ox) * T, (76 + oy) * T
    d.rounded_rectangle([qx0, qy0, qx1 - 1, qy1 - 1], 10, fill=c("#ee9a2a"))
    d.rounded_rectangle([qx0 + 1, qy0 + 1, qx1 - 2, qy1 - 2], 9, fill=c("#ffc83a"))
    d.rounded_rectangle([qx0 + 6, qy0 + 6, qx1 - 7, qy1 - 7], 6, fill=c("#fff3c0"), outline=c("#ee9a2a"))
    for xx in range(qx0 + 14, qx1 - 16, 12):
        d.rectangle([xx, qy0 + 10, xx + 5, qy0 + 11], fill=c("#ffc83a"))
        d.rectangle([xx + 6, qy1 - 12, xx + 11, qy1 - 11], fill=c("#ffc83a"))
    for (cxx, cyy) in ((qx0 + 14, qy0 + 14), (qx1 - 15, qy0 + 14), (qx0 + 14, qy1 - 15), (qx1 - 15, qy1 - 15)):
        d.polygon([(cxx, cyy - 4), (cxx + 1, cyy - 1), (cxx + 4, cyy - 1), (cxx + 2, cyy + 1), (cxx + 3, cyy + 4), (cxx, cyy + 2),
                   (cxx - 3, cyy + 4), (cxx - 2, cyy + 1), (cxx - 4, cyy - 1), (cxx - 1, cyy - 1)], fill=c("#ff7a2a"))
    t = text_image("QUIZ ZONE", c("#e8602a"), FONT11B, 11)
    t = t.resize((t.width * 2, t.height * 2), Image.NEAREST)
    bg.alpha_composite(t, ((qx0 + qx1) // 2 - t.width // 2, qy0 + 14))
    t2 = text_image("퀴즈 존", c("#b8451a"), FONT11B, 11)
    bg.alpha_composite(t2, ((qx0 + qx1) // 2 - t2.width // 2, qy1 - 28))
    # ---- 급식실: 배식 대기선 (배식대 앞)
    for xx in range(4 * T, 18 * T, 16):
        d.rectangle([xx, 5 * T + 6, xx + 9, 5 * T + 8], fill=c("#ffc83a"))
    # ---- 세로 복도: 위쪽(다음 장소)을 가리키는 노란 화살표
    for (cxp, y_a, y_b, up) in ((16 * T, 20, 31, True), (62 * T, 21, 32, False), (51 * T, 51, 62, False)):
        for yy in range(y_a, y_b, 3):
            py = yy * T + 8
            for k in range(2):
                if up:
                    d.polygon([(cxp - 20, py + 16 - k * 6), (cxp, py - k * 6), (cxp + 20, py + 16 - k * 6),
                               (cxp + 20, py + 21 - k * 6), (cxp, py + 5 - k * 6), (cxp - 20, py + 21 - k * 6)],
                              fill=c(["#ffc83a", "#ffe07a"][k]))
                else:
                    d.polygon([(cxp - 20, py + k * 6), (cxp, py + 16 + k * 6), (cxp + 20, py + k * 6),
                               (cxp + 20, py + 5 + k * 6), (cxp, py + 21 + k * 6), (cxp - 20, py + 5 + k * 6)],
                              fill=c(["#ffc83a", "#ffe07a"][k]))


# ====================================================================== 방 꾸미기
def furnish(b):
    # ============================================================ 운동장 (x 2..29, y 35..51)
    #   위쪽(y 35~39)은 돌바닥 단상: 관중석 · 계단 · 구령대가 한 줄로 서 있고, 그 위쪽(y 32~34)에 본관 입구가 있어요.
    for x in (3, 6, 9, 21, 24, 27):                         # 본관 유리창
        b.dec("window_2_glass", x, 33)
    b.obj("lintel_6", 13, 32)                               # 입구 위 간판
    b.dec("flagwall", 11, 33, dx=-2, dy=14)
    for x in (2, 8, 20, 26):                                # 관중석 (햇빛 가리개 달린 4칸짜리)
        b.obj("stand_4x3", x, 37)
    for x in (6, 12, 18, 24):                               # 계단 (걸어 올라갈 수 있어요)
        b.dec("stairs_2x3", x, 37)
    b.obj("podium_4x3", 14, 37)                             # 가운데 구령대
    b.obj("plant", 12, 35)
    b.obj("plant", 19, 35)
    b.obj("flagpole", 9, 36)
    b.obj("extinguisher", 22, 35)
    b.obj("signstone", 4, 42)
    for (tx, ty) in ((2, 44), (27, 44), (2, 49), (27, 49)):
        b.obj("tree", tx, ty)
    b.obj("goal_4", 14, 41)
    b.obj("goal_4", 14, 50)
    b.obj("bench_3", 6, 51)
    b.obj("bench_3", 20, 51)
    b.obj("bush_3", 9, 51)
    b.obj("bush_3", 23, 51)
    for (cx, cy) in ((10, 45), (10, 49), (21, 45), (21, 49)):
        b.obj("cone", cx, cy)
    for (bx, by) in ((13, 46), (17, 48), (8, 47)):
        b.obj("ball", bx, by)

    # ============================================================ 급식실 (x 2..33, y 3..17)
    #   위쪽 왼쪽: 배식대(가로의 3/7쯤) / 오른쪽: 가로 식탁 8줄 x 3열 (양끝에 붙은 주황색 원형 일체형 의자)
    for x in (20, 24, 28):
        b.dec("window_3_field", x, 1)
    b.dec("poster_water", 2, 1, dx=2, dy=7)
    b.dec("poster_gupsik", 31, 1, dx=1, dy=8)
    b.dec("kitchen_14", 4, 1)
    b.obj("steel_14", 4, 3)
    b.obj("dispenser", 2, 3)
    b.obj("glasscab", 3, 3)
    b.obj("fridge", 18, 3)
    for row in range(8):                                    # 가로로 8줄, 한 줄에 식탁 3칸(3열). 열 사이는 지나다닐 수 있는 통로
        for col, (x, top) in enumerate(((19, "cream"), (24, "mint"), (29, "peach"))):
            b.obj(f"rtable_4_{top}" + ("_tray" if (row + col) % 2 == 0 else ""), x, 5 + row)
    b.obj("plant", 2, 17)
    b.obj("trash", 33, 17)
    b.obj("bin", 9, 17)
    b.obj("trash", 10, 17)
    b.obj("plant", 21, 17)

    # ============================================================ 복도
    # 본관 복도 c1 (x 12..19, y 18..31) : 세로 / c3 (x 58..65, y 19..32) / c4 (x 47..54, y 49..62)
    for (cx, y0, kind) in ((12, 18, 1), (58, 19, 2), (47, 49, 3)):
        b.obj("extinguisher", cx, y0 + 1)
        b.obj("plant", cx + 7, y0 + 1)
        b.obj("posterstand", cx, y0 + 6)
        b.obj("bench_3", cx + 5, y0 + 9)
        b.obj("purifier", cx + 7, y0 + 6) if kind != 2 else b.obj("trophy_2", cx + 6, y0 + 6)
        b.obj("plant", cx, y0 + 12)
        b.obj("bin", cx + 7, y0 + 12)
    # 가로 복도 c2 (x 34..45, y 9..14) : 벽 쪽 장식
    cx, cy = 34, 9
    b.dec("doorclass_1-1", cx + 1, cy - 2)
    b.dec("bulletin_2", cx + 4, cy - 2, dy=12)
    b.dec("clock", cx + 6, cy - 2, dx=2, dy=9)
    b.dec("doorclass_2-1", cx + 7, cy - 2)
    b.dec("doorclass_3-1", cx + 10, cy - 2)
    b.dec("signhang_급식실_7a6ac0", cx, cy - 1, dx=2, dy=-7)
    b.dec("signhang_체육관_3f8a5a", cx + 9, cy - 1, dx=2, dy=-7)
    b.obj("purifier", cx + 3, cy)
    b.obj("plant", cx + 6, cy)
    b.obj("extinguisher", cx + 11, cy)
    b.obj("bench_3", cx + 2, cy + 5)
    b.obj("bench_3", cx + 8, cy + 5)
    b.obj("plant", cx + 11, cy + 5)

    # ============================================================ 체육관 (x 46..67, y 3..18)
    #   위쪽: 길고 넓은 무대(가운데) + 양옆 작은 방들 / 아래쪽: 세로 코트 2개 (x 48..53, 60..65, y 8..17)
    b.dec("banner_매홀중학교~체육관_8", 53, 0, dy=5)
    b.dec("curtain_10", 52, 1)
    b.obj("stage_10x4", 52, 3)
    for (x, label, col) in ((47, "준비실", "3f8a5a"), (50, "탈의실", "7a6ac0"), (62, "기구실", "d9783a"), (65, "창고", "3a6ac8")):
        b.dec(f"doorroom_{label}_{col}", x, 5)
    b.obj("speaker", 52, 7)
    b.obj("speaker", 61, 7)
    for cx in (50, 62):                                     # 코트마다 위·아래 골대
        b.obj("hoop_top", cx, COURT_Y0)
        b.obj("hoop_bot", cx, COURT_Y0 + COURT_H - 1)
    b.obj("bench_3", 55, 10)
    b.obj("bench_3", 55, 15)
    b.obj("mat_red", 54, 12)
    b.obj("mat_blue", 58, 12)
    b.obj("mat_blue", 58, 14)
    b.obj("trophy_2", 57, 17)
    b.obj("ballcart", 46, 16)
    b.obj("ballcart", 46, 17)
    b.obj("flagstand", 67, 8)
    b.obj("ball", 51, 12)
    b.obj("ball", 63, 14)
    b.obj("ball", 65, 10)
    b.obj("plant", 46, 18)
    b.obj("plant", 67, 18)

    # ============================================================ 도서관 (북쪽/남쪽 출입구)
    b.ox, b.oy = ROOM_OFFSET["library"]
    b.dec("window_3_blind", 8, 32)
    b.dec("window_3_blind", 11, 32)
    b.dec("poster_libguide", 14, 32, dx=0, dy=11)
    b.obj("wshelf_2", 17, 34)
    b.obj("barcounter_6", 8, 34)
    for sx in (8, 10, 12):
        b.obj("stool", sx, 35)
    b.obj("nook", 14, 36)
    b.obj("libcounter_4", 21, 40)
    b.obj("otable_6x2", 9, 39)
    wc = ["wht", "blk"]
    for i in range(6):
        b.obj(f"chair_{wc[i % 2]}_s", 9 + i, 38)
        b.obj(f"chair_{wc[(i + 1) % 2]}_n", 9 + i, 41)
    for sx in (20, 23):
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

    # ============================================================ 교실 (북쪽 출입구는 왼쪽 8칸)
    b.ox, b.oy = ROOM_OFFSET["classroom"]
    b.dec("flagwall", 16, 63, dx=2, dy=12)
    b.dec("blackboard_6_퀴즈~시간!_steel", 18, 63, dy=-10)
    b.dec("window_2_blind", 25, 63)
    b.obj("cubby_x", 16, 65)
    b.obj("lockerbank_6", 18, 65)
    b.obj("tabcart", 24, 65)
    b.obj("ac", 25, 65)
    b.obj("bin", 26, 65)
    b.obj("tdesk", 18, 67)
    cols = [15, 16, 18, 19, 21, 22, 24, 25]
    for ry in (68, 70, 77, 79):
        for x in cols:
            b.obj("desk_book" if (x + ry) % 3 == 0 else ("desk_pencil" if (x + ry) % 5 == 0 else "desk"), x, ry)
            b.obj(["chair_grn_n", "chair_yel_n", "chair_blu_n", "chair_pnk_n", "chair_mnt_n"][(x + ry // 2) % 5], x, ry + 1)
    b.obj("backpack_gr", 17, 70)
    b.obj("backpack_bl", 20, 71)
    b.obj("backpack_pk", 23, 69)
    b.obj("backpack_gy", 26, 78)
    b.obj("trash", 7, 80)
    b.ox = b.oy = 0


SPAWN = (8, 46)      # 게임을 시작할 때 서 있는 칸 (운동장)

NPCS = [
    # id, 이름, 스프라이트, 칸 x, y, 방향, 구역, 역할
    ("haneul", "하늘", "haneul", 16, 36, "down", "playground", "guide"),
    ("doyun", "도윤", "doyun", 9, 7, "down", "cafeteria", "guide"),
    ("seoyeon", "서연", "seoyeon", 56, 12, "down", "gym", "guide"),
    ("jiu", "지우", "jiu", 61, 38, "down", "library", "guide"),
    ("banjang", "반장", "banjang", 56, 72, "down", "classroom", "quiz"),
    ("walker1", "민준", "extra_a", 15, 24, "down", "c1", "chat"),
    ("walker2", "채원", "extra_b", 40, 11, "left", "c2", "chat"),
    ("walker3", "서진", "extra_c", 61, 25, "down", "c3", "chat"),
    ("walker4", "다은", "extra_d", 50, 55, "down", "c4", "chat"),
]


def build():
    b = Builder()
    furnish(b)
    bg = render_bg(b)

    from art import get_sprite
    names = set(n for (n, _, _) in b.objects) | set(n for (n, _, _) in b.decor)
    for (_, ori, _, _, size, _, _) in GATES:
        names |= {f"gate_{ori}{size}_closed", f"gate_{ori}{size}_open"}
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
    r = reach(SPAWN)
    for (nid, nm, sp, tx, ty, dr, area, role) in NPCS:
        if not any((tx + dx, ty + dy) in r for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            print("!! NPC 도달 불가:", nid, tx, ty)
    stuck = [(xx, yy) for yy in range(MAP_H) for xx in range(MAP_W) if b.floor[yy][xx] and not blocked[yy][xx] and (xx, yy) not in r]
    if stuck:
        print("!! 갇힌 칸 수:", len(stuck), stuck[:6])
    print("교실 도달:", (56, 74) in r, " / 도달 가능한 칸:", len(r))
    for (xx, yy) in npc_cells:
        blocked[yy][xx] = False

    zones = [dict(id=aid, name=name, x=x, y=y, w=w, h=h) for (aid, name, theme, x, y, w, h) in AREAS if name]
    data = dict(
        tile=32, w=MAP_W, h=MAP_H,
        collision=["".join("1" if blocked[y][x] else "0" for x in range(MAP_W)) for y in range(MAP_H)],
        objects=[dict(n=n, x=tx, y=ty) for (n, tx, ty) in b.objects],
        decor=[dict(n=n, x=px, y=py) for (n, px, py) in b.decor],
        npcs=[dict(id=i, name=nm, spr=sp, x=tx, y=ty, dir=dr, area=area, role=role) for (i, nm, sp, tx, ty, dr, area, role) in NPCS],
        gates=gates, zones=zones, spawn=dict(x=SPAWN[0], y=SPAWN[1]),
        order=["playground", "cafeteria", "gym", "library"],
    )
    return dict(bg=bg, data=data, sprites=b.sprite_info, builder=b, blocked=blocked)
