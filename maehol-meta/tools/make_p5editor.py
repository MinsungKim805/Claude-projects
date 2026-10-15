"""p5.js 웹 에디터(editor.p5js.org)에 "한 번에" 올릴 수 있는 꾸러미를 만들어요.

    python3 tools/make_p5editor.py        (make_assets.py 를 실행하면 자동으로 같이 만들어져요)

p5 웹 에디터의 업로드 규칙 때문에 이렇게 만들었어요.
  - 한 번에 올릴 수 있는 파일은 최대 6개, 파일 하나는 5MB 까지  → 파일을 딱 5개로 줄여요
  - 80KB 가 안 되는 js/html/css 는 에디터 안에서 고칠 수 있게 올라가요 → 고칠 파일은 작게 나눠요
  - 글꼴은 ttf/otf 만 올릴 수 있어요 → 글꼴은 data.js 안에 넣어요
  - 같은 이름 파일은 덮어쓰지 않고 이름만 바뀌어요 → 에디터의 기본 파일을 먼저 지워요

만들어지는 것: p5editor/ 폴더 (폴더 구분 없이 파일 5개)
  index.html   화면 틀 (p5.js 를 인터넷에서 불러와요)
  sketch.js    게임 코드
  content.js   ★ 직접 고치는 곳: 설정 + 소개 대사 + 퀴즈
  data.js      맵 데이터 + 글꼴 + 티처블 머신 주소 (자동으로 만들어져요)
  art.png      맵 배경 + 시작 화면 + 가구·캐릭터·아이콘 그림을 한 장으로 묶은 것
"""
import base64
import json
import os
import re
import shutil
import zipfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "p5editor")

P5_URL = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"
# 티처블 머신 공식 안내와 같은 주소예요 (웹 에디터에서는 인터넷 주소로 불러와요)
LIBS = {
    "tf": "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js",
    "posenet": None,
    "pose": "https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js",
    "image": "https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js",
}
FONTS = [("Galmuri11", 400, "Galmuri11.woff2"), ("Galmuri11", 700, "Galmuri11-Bold.woff2"), ("Galmuri9", 400, "Galmuri9.woff2")]
EDIT_LIMIT = 78000     # 에디터는 80,000바이트가 넘는 js 를 '고칠 수 없는 파일'로 올려요. 그 아래로 유지해요.


def read(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as f:
        return f.read()


def parse_map_data():
    txt = read("map_data.js")
    m = re.search(r"window\.MAEHOL_MAP = (.*?);\nwindow\.MAEHOL_ASSETS = (.*?);\n?$", txt, re.S)
    return json.loads(m.group(1)), json.loads(m.group(2))


# ---------------------------------------------------------------- 그림 묶기
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


def build_art(ASSETS):
    """맵 배경 + 시작 화면 + 작은 그림 묶음 → 한 장 (art.png)."""
    items = []
    for n, info in ASSETS["objects"].items():
        items.append((n, Image.open(os.path.join(ROOT, "assets", "objects", info["file"]))))
    for k in ASSETS["sprites"]:
        items.append((f"spr:{k}", Image.open(os.path.join(ROOT, "assets", "sprites", f"{k}.png"))))
    for u in ASSETS["ui"]:
        items.append((f"ui:{u}", Image.open(os.path.join(ROOT, "assets", "ui", f"{u}.png"))))
    atlas, rects = pack(items)
    bg = Image.open(os.path.join(ROOT, "assets", "backgrounds", "map.png")).convert("RGBA")
    title = Image.open(os.path.join(ROOT, "assets", "backgrounds", "title.png")).convert("RGBA") if ASSETS["title"] else None
    tw, th = title.size if title else (0, 0)
    W = max(bg.width, tw + atlas.width)
    H = bg.height + max(th, atlas.height)
    art = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    art.alpha_composite(bg, (0, 0))
    out = {"img:bg": [0, 0, bg.width, bg.height]}
    if title:
        art.alpha_composite(title, (0, bg.height))
        out["img:title"] = [0, bg.height, tw, th]
    art.alpha_composite(atlas, (tw, bg.height))
    for name, (x, y, w, h) in rects.items():
        out[name] = [x + tw, y + bg.height, w, h]
    return art, out


# ---------------------------------------------------------------- 글자 파일 만들기
def dumps(v):
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


def editor_words(text):
    """웹 에디터에서는 새로고침 대신 ▶ 버튼을 다시 눌러요."""
    return re.sub(r"브라우저를 새로고침\(F5\)하면( 바로)? 적용돼요", "실행(▶) 버튼을 다시 누르면 적용돼요", text)


def build_content():
    head = ("// noprotect\n"
            "// =====================================================================\n"
            "//  content.js  —  ★ 여러분이 직접 고치는 파일: 설정 + 소개 대사 + 퀴즈\n"
            "//  (p5 웹 에디터 버전) 고친 뒤 실행(▶) 버튼을 다시 누르면 적용돼요.\n"
            "// =====================================================================\n\n")
    return head + editor_words(read("config.js").strip()) + "\n\n\n" + editor_words(read("content.js").strip()) + "\n"


def build_data(MAP, ASSETS, rects):
    objects = {n: {k: v for k, v in i.items() if k != "file"} for n, i in ASSETS["objects"].items()}
    assets = dict(atlas=dict(rects=rects), sprites=ASSETS["sprites"], title=ASSETS["title"], ui=ASSETS["ui"], objects=objects)
    out = ["// data.js — 자동으로 만들어진 파일이에요. 고치지 마세요. (맵 데이터 + 글꼴 + 티처블 머신 주소)",
           "window.MAEHOL_LIBS = " + dumps(LIBS) + ";",
           "window.MAEHOL_MAP = " + dumps(MAP) + ";",
           "window.MAEHOL_ASSETS = " + dumps(assets) + ";",
           "// 도트 글꼴(Galmuri)을 글자 데이터로 넣었어요. 별도의 글꼴 파일 없이도 쓸 수 있어요.",
           "(function () {"]
    for family, weight, fn in FONTS:
        b64 = base64.b64encode(open(os.path.join(ROOT, "fonts", fn), "rb").read()).decode()
        out.append(f'  document.fonts.add(new FontFace("{family}", "url(data:font/woff2;base64,{b64})", {{ weight: "{weight}" }}));')
    out.append("})();")
    return "\n".join(out) + "\n"


def build_sketch():
    engine = read("sketch.js")
    assert engine.count("art.png") == 1, "sketch.js 안에 art.png 라는 글자가 딱 한 번만 있어야 해요 (웹 에디터가 이름을 주소로 바꿔요)"
    return "// noprotect\n" + engine     # noprotect: 웹 에디터의 '무한 반복 보호'가 게임을 멈추지 않게 해요


INDEX_HTML = f"""<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>메타 투어 매홀 - 나와 만나는 학교</title>
    <script src="{P5_URL}"></script>
    <style>
      html, body {{ margin: 0; height: 100%; background: #120d1a; overflow: hidden; }}
      #game {{ width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }}
      /* 화면 크기에 맞춰 키우되, 도트가 번지지 않게 해요 */
      canvas {{ image-rendering: pixelated; width: min(100vw, 177.78vh) !important; height: auto !important; display: block; outline: none; }}
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script src="content.js"></script>   <!-- 설정 + 대사 + 퀴즈 (직접 고쳐요) -->
    <script src="data.js"></script>      <!-- 맵 데이터 + 글꼴 (자동) -->
    <script src="sketch.js"></script>    <!-- 게임 코드 -->
  </body>
</html>
"""

GUIDE = """메타 투어 매홀 - p5.js 웹 에디터에 올리기
=========================================

p5editor 폴더 안의 파일 5개를 한 번에 올리면 돼요. (폴더가 따로 나뉘어 있지 않아요)
    index.html  sketch.js  content.js  data.js  art.png

1. https://editor.p5js.org 에 들어가서 로그인해요. (파일을 올리려면 로그인이 꼭 필요해요)
2. 파일(File) ▶ 새로 만들기(New)
3. 왼쪽 'Sketch Files' 목록에 있는 기본 파일 index.html, sketch.js 를 지워요.
   (파일 이름 오른쪽 화살표 ▸ → Delete.  style.css 는 그냥 두어도 돼요.)
   ※ 같은 이름 파일은 덮어써지지 않고 'sketch-1.js' 처럼 이름만 바뀌어서 올라가요. 그래서 먼저 지워요.
4. 'Sketch Files' 옆 화살표 ▸ → Upload file(파일 올리기) 을 눌러요.
   p5editor 폴더 안의 5개 파일을 모두 선택(Ctrl+A)해서 올려요. (한 번에 6개까지 올라가요)
5. 위쪽 ▶(Play) 버튼을 눌러요.

[대사와 퀴즈 고치기]
  content.js 를 열어서 고치고 ▶ 를 다시 누르면 돼요.
  (티처블 머신 링크도 content.js 맨 위에 넣어요.)

[안 될 때]
  - 화면이 까맣다 → art.png 가 올라갔는지 확인해요. 이름이 'art-1.png' 처럼 바뀌었다면 지우고 다시 올려요.
  - 'sketch-1.js' 같은 파일이 생겼다 → 이름이 겹쳐서 그래요. 예전 sketch.js 를 지우고 sketch-1.js 의 이름을 sketch.js 로 바꿔요.
  - 카메라가 안 켜져요 → 브라우저가 카메라 권한을 물으면 '허용'을 눌러요. (얼굴·동작 인식은 선택이에요.)
    카메라 없이도 숫자 1·2·3 키로 캐릭터를 고르고, W A S D 로 걸을 수 있어요.
"""


def main():
    MAP, ASSETS = parse_map_data()
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(OUT)
    art, rects = build_art(ASSETS)
    art.save(os.path.join(OUT, "art.png"), optimize=True)
    files = {"index.html": INDEX_HTML, "sketch.js": build_sketch(), "content.js": build_content(), "data.js": build_data(MAP, ASSETS, rects)}
    for name, text in files.items():
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
            f.write(text)
    for name in ("sketch.js", "content.js", "index.html"):    # 에디터에서 고칠 수 있으려면 80KB 미만이어야 해요
        size = os.path.getsize(os.path.join(OUT, name))
        if size > EDIT_LIMIT:
            print(f"!! {name} 가 {size}바이트예요. 웹 에디터에서 고칠 수 없는 파일로 올라갈 수 있어요. (기준 {EDIT_LIMIT})")
    # 한 번에 받을 수 있게 zip 도 만들어요 (안내문은 폴더 밖에 둬요: 폴더 안 파일을 전부 올리면 되도록)
    zpath = os.path.join(ROOT, "p5editor.zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("읽어보세요.txt", GUIDE)
        for fn in sorted(os.listdir(OUT)):
            z.write(os.path.join(OUT, fn), f"p5editor/{fn}")
    sizes = ", ".join(f"{fn} {os.path.getsize(os.path.join(OUT, fn)) // 1024}KB" for fn in sorted(os.listdir(OUT)))
    print(f"p5 웹 에디터 꾸러미 (파일 {len(os.listdir(OUT))}개): {sizes}")


if __name__ == "__main__":
    main()
