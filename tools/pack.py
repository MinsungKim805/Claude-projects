"""그림을 한 장(art.png)으로 묶고, 게임이 읽는 데이터 파일(data.js)을 만들어요.   (make_assets.py 가 불러서 써요)

게임 파일은 폴더 없이 한곳에 있어요:
  index.html  sketch.js  content.js   ← 직접 쓰는 파일 (이 도구가 건드리지 않아요)
  data.js     art.png                  ← 이 도구가 만들어요

p5 웹 에디터의 업로드 규칙(한 번에 6개, 파일당 5MB, 글꼴은 ttf/otf만)에 맞추려고
  - 가구·캐릭터·아이콘·맵 배경·시작 화면 그림을 art.png 한 장에 모두 담고
  - 글꼴(Galmuri)은 data.js 안에 글자 데이터로 넣었어요.
"""
import base64
import json
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONTS = [("Galmuri11", 400, "Galmuri11.woff2"), ("Galmuri11", 700, "Galmuri11-Bold.woff2"), ("Galmuri9", 400, "Galmuri9.woff2")]


def pack(items, width=1024, gap=1):
    """items = [(이름, 이미지)] → (묶음 이미지, {이름: [x, y, w, h]}) . 높은 것부터 줄을 맞춰 채워요."""
    order = sorted(items, key=lambda it: -it[1].height)
    x = y = row_h = 0
    rects = {}
    for name, im in order:
        if x + im.width > width:
            x, y, row_h = 0, y + row_h + gap, 0
        rects[name] = [x, y, im.width, im.height]
        x += im.width + gap
        row_h = max(row_h, im.height)
    atlas = Image.new("RGBA", (width, y + row_h), (0, 0, 0, 0))
    for name, im in order:
        atlas.alpha_composite(im.convert("RGBA"), tuple(rects[name][:2]))
    return atlas, rects


def build_art(assets_dir, objects, sprites, ui, has_title):
    """맵 배경 + 시작 화면 + 가구·캐릭터·아이콘 → 한 장 (art.png). 반환: (이미지, {이름: [x, y, w, h]})"""
    items = [(n, Image.open(os.path.join(assets_dir, "objects", info["file"]))) for n, info in objects.items()]
    items += [(f"spr:{k}", Image.open(os.path.join(assets_dir, "sprites", f"{k}.png"))) for k in sprites]
    items += [(f"ui:{u}", Image.open(os.path.join(assets_dir, "ui", f"{u}.png"))) for u in ui]
    atlas, rects = pack(items)
    bg = Image.open(os.path.join(assets_dir, "backgrounds", "map.png")).convert("RGBA")
    title = Image.open(os.path.join(assets_dir, "backgrounds", "title.png")).convert("RGBA") if has_title else None
    tw, th = title.size if title else (0, 0)
    art = Image.new("RGBA", (max(bg.width, tw + atlas.width), bg.height + max(th, atlas.height)), (0, 0, 0, 0))
    art.alpha_composite(bg, (0, 0))
    out = {"img:bg": [0, 0, bg.width, bg.height]}
    if title:
        art.alpha_composite(title, (0, bg.height))
        out["img:title"] = [0, bg.height, tw, th]
    art.alpha_composite(atlas, (tw, bg.height))
    for name, (x, y, w, h) in rects.items():
        out[name] = [x + tw, y + bg.height, w, h]
    return art, out


def dumps(v):
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


def build_data(MAP, objects, rects):
    """data.js: 맵 데이터 + 그림 위치 + 글꼴."""
    info = {n: {k: v for k, v in i.items() if k != "file"} for n, i in objects.items()}
    out = ["// data.js — 자동으로 만들어진 파일이에요. 직접 고치지 마세요. (tools/make_assets.py 가 만들어요)",
           "// MAEHOL_MAP = 맵 크기, 충돌 지도, 가구 위치, NPC 위치, 잠긴 문 정보",
           "// MAEHOL_ASSETS = art.png 안에서 그림이 있는 위치(rects)와 가구 크기(objects)",
           "window.MAEHOL_MAP = " + dumps(MAP) + ";",
           "window.MAEHOL_ASSETS = " + dumps({"rects": rects, "objects": info}) + ";",
           "// 도트 글꼴(Galmuri)을 글자 데이터로 넣었어요. 별도의 글꼴 파일이 필요 없어요.",
           "(function () {"]
    for family, weight, fn in FONTS:
        b64 = base64.b64encode(open(os.path.join(HERE, "fonts", fn), "rb").read()).decode()
        out.append(f'  document.fonts.add(new FontFace("{family}", "url(data:font/woff2;base64,{b64})", {{ weight: "{weight}" }}));')
    out.append("})();")
    return "\n".join(out) + "\n"


def write_game(assets_dir, MAP, objects, sprites, ui, has_title):
    """art.png 와 data.js 를 게임 폴더(루트)에 만들어요."""
    art, rects = build_art(assets_dir, objects, sprites, ui, has_title)
    art.save(os.path.join(ROOT, "art.png"), optimize=True)
    with open(os.path.join(ROOT, "data.js"), "w", encoding="utf-8") as f:
        f.write(build_data(MAP, objects, rects))
    # 웹 에디터는 파일 이름을 '처음 나온 곳' 한 군데만 올린 파일 주소로 바꿔요 → sketch.js 안에 art.png 가 딱 한 번만 있어야 해요
    with open(os.path.join(ROOT, "sketch.js"), encoding="utf-8") as f:
        n = f.read().count("art.png")
    if n != 1:
        print(f"!! sketch.js 안에 art.png 라는 글자가 {n}번 있어요. 주석에도 쓰지 말고 딱 한 번만 쓰세요.")
    for name in ("sketch.js", "content.js", "index.html"):     # 80KB 가 넘는 js 는 웹 에디터에서 고칠 수 없는 파일로 올라가요
        size = os.path.getsize(os.path.join(ROOT, name))
        if size > 78000:
            print(f"!! {name} 가 {size}바이트예요. 웹 에디터에서 고칠 수 없는 파일로 올라갈 수 있어요. (기준 78000)")
    print(f"art.png {art.width}x{art.height} ({len(rects)}장 묶음), data.js {os.path.getsize(os.path.join(ROOT, 'data.js')) // 1024}KB")
