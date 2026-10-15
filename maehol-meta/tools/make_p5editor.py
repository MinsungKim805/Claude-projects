"""p5.js 웹 에디터(editor.p5js.org)에 쉽게 올릴 수 있는 꾸러미를 만들어요.

    python3 tools/make_p5editor.py        (make_assets.py 를 실행하면 자동으로 같이 만들어져요)

웹 에디터는 폴더가 여러 개 있고 파일이 많으면 올리기 힘들어요. 그래서
  - 코드(설정 + 대사/퀴즈 + 맵 데이터 + 게임 코드)를 sketch.js 하나로 합치고
  - 낱개 오브젝트·캐릭터·아이콘 그림 PNG 백여 장을 atlas.png 한 장으로 묶어요.
(게임 안에서는 atlas.png 를 다시 조각내서 쓰기 때문에 모습은 똑같아요.)

만들어지는 것: p5editor/ 폴더
  1_코드_붙여넣기/   index.html, style.css, sketch.js   → 에디터의 같은 이름 파일에 내용을 붙여 넣어요
  2_파일_업로드/     atlas.png, map.png, title.png, 글꼴 3개 → '파일 업로드'로 한꺼번에 올려요
"""
import json
import os
import re
import shutil
import zipfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "p5editor")
CODE_DIR = os.path.join(OUT, "1_코드_붙여넣기")
UP_DIR = os.path.join(OUT, "2_파일_업로드")

P5_URL = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"
# 티처블 머신 공식 안내와 같은 주소예요 (웹 에디터에서는 인터넷 주소로 불러와요)
LIBS = {
    "tf": "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js",
    "posenet": None,
    "pose": "https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js",
    "image": "https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js",
}


def read(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as f:
        return f.read()


def parse_map_data():
    txt = read("map_data.js")
    m = re.search(r"window\.MAEHOL_MAP = (.*?);\nwindow\.MAEHOL_ASSETS = (.*?);\n?$", txt, re.S)
    return json.loads(m.group(1)), json.loads(m.group(2))


# ---------------------------------------------------------------- 그림 묶기 (atlas)
def pack(items, width=1024, gap=1):
    """items = [(이름, 이미지)] → (atlas 이미지, {이름: [x, y, w, h]}) . 높은 것부터 줄을 맞춰 채워요."""
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


# ---------------------------------------------------------------- 보기 좋은 데이터 글자 만들기
def dumps(v):
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


def block(key, items, indent="    "):
    """리스트/사전을 '한 줄에 하나씩' 보기 좋게 써요."""
    if isinstance(items, dict):
        lines = [f"{indent}  {dumps(k)}: {dumps(v)}" for k, v in items.items()]
    else:
        lines = [f"{indent}  {dumps(v)}" for v in items]
    o, c = ("{", "}") if isinstance(items, dict) else ("[", "]")
    return f"{indent}{key}: {o}\n" + ",\n".join(lines) + f"\n{indent}{c}"


def data_function(MAP, ASSETS, rects):
    objects = {n: {k: v for k, v in i.items() if k != "file"} for n, i in ASSETS["objects"].items()}
    assets = dict(files=dict(map="map.png", title="title.png"),
                  sprites=ASSETS["sprites"], title=ASSETS["title"], ui=ASSETS["ui"])
    mp = {k: MAP[k] for k in ("tile", "w", "h", "spawn", "order")}
    out = ["function MAEHOL_DATA() {", "  return {", "    map: {"]
    out += [f"      {k}: {dumps(v)}," for k, v in mp.items()]
    for k in ("collision", "objects", "decor", "npcs", "gates", "zones"):
        out.append(block(k, MAP[k], "      ") + ",")
    out[-1] = out[-1].rstrip(",")
    out += ["    },", "    assets: {"]
    out += [f"      {k}: {dumps(v)}," for k, v in assets.items() if k != "atlas"]
    out.append("      atlas: {")
    out.append('        file: "atlas.png",')
    out.append(block("rects", rects, "        "))
    out.append("      },")
    out.append(block("objects", objects, "      "))
    out += ["    },", "  };", "}"]
    return "\n".join(out)


def banner(title, note=""):
    bar = "=" * 69
    return f"\n\n// {bar}\n//  {title}\n" + (f"//  {note}\n" if note else "") + f"// {bar}\n"


HEADER = """// =====================================================================
//  sketch.js  —  메타 투어 매홀  (p5.js 웹 에디터용: 코드를 한 파일에 모았어요)
//
//  ★ 직접 고치는 곳은 두 군데뿐이에요
//     [1] 설정(티처블 머신 링크 등)   [2] 소개 대사와 퀴즈
//  나머지(게임 코드, 맵 데이터)는 건드리지 않아도 돼요.
//  글자를 찾을 때는 Ctrl+F 를 쓰세요.
// ====================================================================="""


def editor_words(text):
    """웹 에디터에서는 새로고침 대신 ▶ 버튼을 다시 눌러요."""
    return re.sub(r"브라우저를 새로고침\(F5\)하면( 바로)? 적용돼요", "실행(▶) 버튼을 다시 누르면 적용돼요", text)


def build_sketch(MAP, ASSETS, rects):
    config = editor_words(read("config.js").strip())
    content = editor_words(read("content.js").strip())
    engine = read("sketch.js").strip()
    libs = "window.MAEHOL_LIBS = " + json.dumps(LIBS, ensure_ascii=False) + ";"
    glue = (libs + "\n"
            "const _DATA = MAEHOL_DATA();                       // 맨 아래에 있는 맵 데이터를 가져와요\n"
            "window.MAEHOL_MAP = _DATA.map;\n"
            "window.MAEHOL_ASSETS = _DATA.assets;")
    return (HEADER + banner("[1] 설정  (티처블 머신 링크, 인식 이름, 속도 ...)") + config
            + banner("[2] 소개 대사와 퀴즈  (NPC가 하는 말, 객관식 문제)") + content
            + banner("연결 부분  (고치지 마세요)", "티처블 머신 라이브러리 주소와 맵 데이터를 게임에 연결해요.") + glue
            + banner("게임 코드  (고치지 마세요)", "p5.js 가 setup() 과 draw() 를 불러서 게임을 돌려요.") + engine
            + banner("맵 데이터  (자동으로 만들어진 부분이에요. 고치지 마세요)",
                     "방 모양, 가구·NPC 위치, 문, 그리고 묶음 그림 안의 그림 위치가 들어 있어요.")
            + data_function(MAP, ASSETS, rects) + "\n")


INDEX_HTML = f"""<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>메타 투어 매홀 - 나와 만나는 학교</title>
    <script src="{P5_URL}"></script>
    <link rel="stylesheet" type="text/css" href="style.css" />
  </head>
  <body>
    <div id="game"></div>
    <script src="sketch.js"></script>
  </body>
</html>
"""

STYLE_CSS = """/* 도트 글꼴. 글꼴 파일을 올리지 않아도 게임은 돌아가요. (그때는 컴퓨터에 있는 한글 글꼴로 보여요) */
@font-face { font-family: "Galmuri11"; src: url("Galmuri11.woff2") format("woff2"), local("Malgun Gothic"), local("Apple SD Gothic Neo"), local("Noto Sans KR"), local("NanumGothic"); font-weight: 400; }
@font-face { font-family: "Galmuri11"; src: url("Galmuri11Bold.woff2") format("woff2"), local("Malgun Gothic"), local("Apple SD Gothic Neo"), local("Noto Sans KR"), local("NanumGothic"); font-weight: 700; }
@font-face { font-family: "Galmuri9"; src: url("Galmuri9.woff2") format("woff2"), local("Malgun Gothic"), local("Apple SD Gothic Neo"), local("Noto Sans KR"), local("NanumGothic"); font-weight: 400; }

html, body { margin: 0; height: 100%; background: #120d1a; overflow: hidden; }
#game { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
/* 화면 크기에 맞춰 키우되, 도트가 번지지 않게 해요 */
canvas { image-rendering: pixelated; width: min(100vw, 177.78vh) !important; height: auto !important; display: block; outline: none; }
"""

GUIDE = """메타 투어 매홀 - p5.js 웹 에디터에 올리기
=========================================

파일은 모두 9개예요.  (코드 3개 + 그림 3개 + 글꼴 3개)

[준비]
  1. https://editor.p5js.org 에 들어가서 로그인해요. (저장하려면 로그인이 필요해요)
  2. 왼쪽 위  파일(File) ▶ 새로 만들기(New)  를 눌러요.

[1단계] 코드 붙여넣기 - "1_코드_붙여넣기" 폴더의 파일 3개
  왼쪽 'Sketch Files' 목록에 index.html, style.css, sketch.js 가 이미 있어요.
  파일 이름을 눌러서 열고 → 안의 글자를 전부 지우고(Ctrl+A, Delete)
  → 내 컴퓨터의 같은 이름 파일을 메모장으로 열어 전체 복사(Ctrl+A, Ctrl+C) → 붙여넣기(Ctrl+V).
  index.html, style.css, sketch.js  세 개를 똑같이 해요.

[2단계] 그림·글꼴 올리기 - "2_파일_업로드" 폴더의 파일 6개
  'Sketch Files' 옆의 화살표(▸)를 눌러 'Upload file'(파일 업로드)을 골라요.
  창이 뜨면 6개 파일을 모두 선택해서(Ctrl+A) 끌어다 놓거나 선택해요.
    atlas.png   ... 가구·소품·캐릭터·아이콘 그림 모음
    map.png     ... 학교 맵 바닥과 벽
    title.png   ... 시작 화면
    Galmuri11.woff2, Galmuri11Bold.woff2, Galmuri9.woff2 ... 도트 글꼴 (안 올려도 실행은 돼요)
  ※ 반드시 폴더 안이 아니라 '맨 바깥(루트)'에 올라가야 해요. (폴더를 만들지 마세요)

[3단계] 실행
  위쪽 ▶(Play) 버튼을 눌러요. 화면이 작으면 미리보기 창을 넓히거나 새 탭에서 열어 보세요.

[고치고 싶을 때]
  - 대사·퀴즈: sketch.js 안의 "[2] 소개 대사와 퀴즈" 부분 (Ctrl+F 로 '소개 대사' 검색)
  - 티처블 머신 링크: sketch.js 안의 "[1] 설정" 부분 (TM_FACE_MODEL_URL, TM_MOTION_MODEL_URL)

[안 될 때]
  - 화면이 까맣다 → 2단계의 그림 3개(atlas.png, map.png, title.png)가 올라갔는지, 이름이 같은지 확인해요.
  - 글씨가 도트체가 아니다 → 글꼴 3개를 올리면 도트체로 바뀌어요. (안 올려도 게임은 돼요)
  - 카메라가 안 켜져요 → 브라우저가 카메라 권한을 물으면 '허용'을 눌러요. 얼굴·동작 인식은 선택이에요.
    (카메라 없이도 숫자 1·2·3 키로 캐릭터를 고르고, W A S D 로 걸을 수 있어요.)
"""


def main():
    MAP, ASSETS = parse_map_data()
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(CODE_DIR)
    os.makedirs(UP_DIR)

    # 1) 그림 묶기
    items = []
    for n, info in ASSETS["objects"].items():
        items.append((n, Image.open(os.path.join(ROOT, "assets", "objects", info["file"]))))
    for k in ASSETS["sprites"]:
        items.append((f"spr:{k}", Image.open(os.path.join(ROOT, "assets", "sprites", f"{k}.png"))))
    for u in ASSETS["ui"]:
        items.append((f"ui:{u}", Image.open(os.path.join(ROOT, "assets", "ui", f"{u}.png"))))
    atlas, rects = pack(items)
    atlas.save(os.path.join(UP_DIR, "atlas.png"), optimize=True)

    # 2) 코드
    sketch = build_sketch(MAP, ASSETS, rects)
    for fn in ("atlas.png", "map.png", "title.png"):      # 웹 에디터는 이름을 "처음 나온 곳" 한 군데만 주소로 바꿔요 → 한 번만 있어야 해요
        assert sketch.count(fn) == 1, f"{fn} 이(가) 코드 안에 {sketch.count(fn)}번 나와요. 주석에도 쓰지 말고 딱 한 번만 쓰세요."
    with open(os.path.join(CODE_DIR, "sketch.js"), "w", encoding="utf-8") as f:
        f.write(sketch)
    with open(os.path.join(CODE_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(INDEX_HTML)
    with open(os.path.join(CODE_DIR, "style.css"), "w", encoding="utf-8") as f:
        f.write(STYLE_CSS)

    # 3) 큰 그림과 글꼴
    shutil.copy(os.path.join(ROOT, "assets", "backgrounds", "map.png"), UP_DIR)
    if ASSETS["title"]:
        shutil.copy(os.path.join(ROOT, "assets", "backgrounds", "title.png"), UP_DIR)
    for src, dst in (("Galmuri11.woff2", "Galmuri11.woff2"), ("Galmuri11-Bold.woff2", "Galmuri11Bold.woff2"), ("Galmuri9.woff2", "Galmuri9.woff2")):
        shutil.copy(os.path.join(ROOT, "fonts", src), os.path.join(UP_DIR, dst))   # 이름에 - 가 없게 해요 (웹 에디터가 이름을 찾기 쉬워요)
    with open(os.path.join(OUT, "0_먼저_읽어요.txt"), "w", encoding="utf-8") as f:
        f.write(GUIDE)

    # 4) 한 번에 받을 수 있게 zip 도 만들어요
    zpath = os.path.join(ROOT, "p5editor.zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for d, _, files in os.walk(OUT):
            for fn in files:
                p = os.path.join(d, fn)
                z.write(p, os.path.relpath(p, ROOT))
    print(f"p5 웹 에디터 꾸러미: atlas.png {atlas.width}x{atlas.height} ({len(items)}장 묶음), 파일 {sum(len(f) for _, _, f in os.walk(OUT))}개")


if __name__ == "__main__":
    main()
