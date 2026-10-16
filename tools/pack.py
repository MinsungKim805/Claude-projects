"""그림을 한 장(art.png)으로 묶고, 게임이 읽는 데이터 파일(data.js)을 만들어요.   (make_assets.py 가 불러서 써요)

게임 파일은 maehol-meta/ 폴더 안에 폴더 없이 한곳에 있어요:
  index.html  sketch.js  game.js  content.js   ← 직접 쓰는 파일 (이 도구가 건드리지 않아요)
  data.js     art.png                  ← 이 도구가 만들어요
그리고 이 6개 파일을 묶은 maehol-meta.zip 도 레포 맨 위에 만들어요.

p5 웹 에디터의 업로드 규칙(한 번에 6개, 파일당 5MB, 글꼴은 ttf/otf만)에 맞추려고
  - 가구·캐릭터·아이콘·맵 배경·시작 화면 그림을 art.png 한 장에 모두 담고
  - 글꼴(Galmuri)은 data.js 안에 글자 데이터로 넣었어요.
"""
import base64
import json
import glob
import os, re
import zipfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GAME = os.path.join(ROOT, "maehol-meta")      # 게임 파일 6개가 들어 있는 폴더
GAME_FILES = ("index.html", "sketch.js", "game.js", "content.js", "data.js", "art.png")
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


PHOTO_W, PHOTO_H = 640, 360        # 장소 사진 크기 (art.png 안에 같이 담겨요)


def load_photos():
    """tools/reference/places/*.webp 를 작게 줄이고 색 수를 줄여서 [(이름, 이미지)] 로 돌려줘요."""
    out = []
    for f in sorted(glob.glob(os.path.join(HERE, "reference", "places", "*.webp"))):
        im = Image.open(f).convert("RGB").resize((PHOTO_W, PHOTO_H), Image.LANCZOS)
        im = im.quantize(96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")
        out.append((os.path.splitext(os.path.basename(f))[0], im))
    return out


def build_art(assets_dir, objects, sprites, ui, has_title):
    """맵 배경 + 시작 화면 + 가구·캐릭터·아이콘 → 한 장 (art.png). 반환: (이미지, {이름: [x, y, w, h]})"""
    items = [(n, Image.open(os.path.join(assets_dir, "objects", info["file"]))) for n, info in objects.items()]
    items += [(f"spr:{k}", Image.open(os.path.join(assets_dir, "sprites", f"{k}.png"))) for k in sprites]
    items += [(f"ui:{u}", Image.open(os.path.join(assets_dir, "ui", f"{u}.png"))) for u in ui]
    atlas, rects = pack(items)
    bg = Image.open(os.path.join(assets_dir, "backgrounds", "map.png")).convert("RGBA")
    title = Image.open(os.path.join(assets_dir, "backgrounds", "title.png")).convert("RGBA") if has_title else None
    tw, th = title.size if title else (0, 0)
    photos = load_photos()                                       # 장소 사진(처음 들어갈 때 보여줘요)
    top_h = bg.height + max(th, atlas.height)
    width = max(bg.width, tw + atlas.width)
    cols = max(1, width // PHOTO_W)
    art = Image.new("RGBA", (width, top_h + -(-len(photos) // cols) * PHOTO_H), (0, 0, 0, 0))
    art.alpha_composite(bg, (0, 0))
    out = {"img:bg": [0, 0, bg.width, bg.height]}
    if title:
        art.alpha_composite(title, (0, bg.height))
        out["img:title"] = [0, bg.height, tw, th]
    art.alpha_composite(atlas, (tw, bg.height))
    for name, (x, y, w, h) in rects.items():
        out[name] = [x + tw, y + bg.height, w, h]
    for i, (name, im) in enumerate(photos):
        x, y = (i % cols) * PHOTO_W, top_h + (i // cols) * PHOTO_H
        art.alpha_composite(im, (x, y))
        out[f"img:photo_{name}"] = [x, y, PHOTO_W, PHOTO_H]
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


GUIDE = """메타 투어 매홀 - p5.js 웹 에디터에 올리기
=========================================
maehol-meta 폴더 안의 파일 6개(index.html, sketch.js, game.js, content.js, data.js, art.png)를 한 번에 올리면 돼요. (한 번에 6개까지 올릴 수 있어요)

1. https://editor.p5js.org 에서 로그인 -> 파일(File) > 새로 만들기(New)
2. 왼쪽 Sketch Files 의 기본 파일 index.html, sketch.js 를 먼저 삭제해요. (이름 옆 화살표 > Delete)
   (같은 이름은 덮어쓰기가 안 되고 sketch-1.js 처럼 이름만 바뀌어 올라가기 때문이에요. style.css 는 그냥 둬도 돼요.)
3. Sketch Files 옆 화살표 > Upload file 에서 6개 파일을 모두 선택해서 올려요.
4. 위쪽 재생(Play) 버튼을 눌러요.

- 대사/퀴즈는 에디터에서 content.js 를 열어 고치고 재생을 다시 눌러요.
- 키보드가 안 먹으면 게임 화면을 한 번 클릭하세요. (화면을 누른 채로도 걸을 수 있어요)
- 내 컴퓨터에서 하려면 6개 파일을 한 폴더에 두고 index.html 을 더블클릭해요. (인터넷 필요)

[안 될 때]
- data.js, art.png, game.js 가 안 불러와지거나 이름이 data-1.js 처럼 바뀌어 있어도, 게임이 같은 파일을 인터넷(GitHub)에서 대신 가져와서 시작해요.
  (내가 그림이나 맵을 고쳤다면 내 파일이 제대로 불러와져야 반영돼요.)
- 모두 실패하면 화면에 어떤 파일이 왜 안 불러와졌는지 나와요. [내 컴퓨터에서 파일 고르기] 버튼으로 이 폴더의 content.js, game.js, data.js, art.png 를 직접 골라도 돼요.
"""


def write_zip():
    """게임 파일 6개를 maehol-meta.zip 으로 묶어요 (폴더 안에는 파일 6개뿐이에요)."""
    zpath = os.path.join(ROOT, "maehol-meta.zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("읽어보세요.txt", GUIDE)
        for f in GAME_FILES:
            z.write(os.path.join(GAME, f), f"maehol-meta/{f}")
    return zpath


def write_game(assets_dir, MAP, objects, sprites, ui, has_title):
    """art.png 와 data.js 를 게임 폴더(루트)에 만들어요."""
    art, rects = build_art(assets_dir, objects, sprites, ui, has_title)
    art.save(os.path.join(GAME, "art.png"), optimize=True)
    with open(os.path.join(GAME, "data.js"), "w", encoding="utf-8") as f:
        f.write(build_data(MAP, objects, rects))
    # 웹 에디터는 sketch.js 안에서 따옴표로 감싼 파일 이름("art.png" 처럼)을 올린 파일의 주소로 바꿔요 → 따옴표 친 이름이 각각 딱 한 번만 있어야 해요
    with open(os.path.join(GAME, "sketch.js"), encoding="utf-8") as f:
        code = f.read()
    for name in ("art.png", "data.js", "content.js", "game.js"):
        n = len(re.findall(r"""["']""" + re.escape(name) + r"""["']""", code))
        if n != 1:
            print(f"!! sketch.js 안에 따옴표 친 {name} 이 {n}번 있어요. 딱 한 번만 쓰세요. (주석·안내 글에는 따옴표 없이 써요)")
    # p5 웹 에디터는 for(;;) · while 반복문에 '반복문 보호' 코드를 끼워 넣는데, 중첩된 반복문에서는 변수 선언이 빠져 ReferenceError(_LP1 is not defined)가 나요
    # → 반복은 for...of / times(n) / forEach 로만 써요. (index.html 맨 위의 noprotect 표시는 에디터 기본 index.html 로 실행하면 소용없어요)
    for name in ("sketch.js", "game.js", "content.js"):
        with open(os.path.join(GAME, name), encoding="utf-8") as f:
            for no, line in enumerate(f.read().splitlines(), 1):
                code = re.sub(r"//.*", "", line)
                if re.search(r"\bwhile\s*\(|\bdo\s*\{", code) or (re.search(r"\bfor\s*\(", code) and not re.search(r"\bfor\s*\(\s*(const|let|var)\s+(\[[^\]]*\]|\{[^}]*\}|\w+)\s+(of|in)\b", code)):
                    print(f"!! {name} {no}번째 줄에 for(;;) / while 반복문이 있어요. for...of, times(n), forEach 로 바꿔 주세요: {line.strip()[:60]}")
    for name in ("sketch.js", "game.js", "content.js", "index.html"):     # 80KB 가 넘는 js 는 웹 에디터에서 고칠 수 없는 파일로 올라가요
        size = os.path.getsize(os.path.join(GAME, name))
        if size > 79000:
            print(f"!! {name} 가 {size}바이트예요. 웹 에디터에서 고칠 수 없는 파일로 올라갈 수 있어요. (기준 79000, 에디터 한도 80000)")
    write_zip()
    print(f"art.png {art.width}x{art.height} ({len(rects)}장 묶음), data.js {os.path.getsize(os.path.join(GAME, 'data.js')) // 1024}KB, maehol-meta.zip 만들었어요")
