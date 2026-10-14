"""모든 픽셀아트 이미지와 맵 데이터를 한 번에 다시 만들어요.

    python3 tools/make_assets.py

만들어지는 것
  assets/sprites/<캐릭터>/<방향>_<프레임>.png   캐릭터/NPC (방향: down,left,right,up / 프레임: 0,1,2)
  assets/portraits/<캐릭터>.png                  선택 카드와 대화창용 얼굴 그림
  assets/objects/<이름>.png                      가구, 소품, 벽 장식, 문 (오브젝트 하나당 PNG 하나)
  assets/backgrounds/map.png, title.png          맵 배경(바닥+벽), 시작 화면
  assets/ui/*.png                                아이콘
  js/data/map.js, js/data/assets.js              게임이 읽는 맵/에셋 목록
"""
import hashlib
import json
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw

import chars
import mapbuild
import objects
from pxlib import ROOT, hexc, shade, lighten, text_image, FONT11B, FONT9

A = os.path.join(ROOT, "assets")
DATA = os.path.join(ROOT, "data")

# 맵에 쓰이진 않지만 나중에 쓰기 좋게 함께 만들어 두는 오브젝트
EXTRA_OBJECTS = ["locker_2", "lowshelf_2", "cabinet_3", "bookcart", "posterstand", "trophy_3", "ballcart",
                 "poster_quiet", "poster_sports", "poster_water", "speakerwall", "flagstand", "bush_4", "tree",
                 "desk_pencil", "table_3x1_white", "table_4x1_wood", "chair_pur_s", "chair_grn_n", "chair_blu_n",
                 "chair_red_s", "bulletin_3", "window_2_field", "blackboard_6", "banner_환영합니다_6"]


KO = {"운동장": "playground", "급식실": "cafeteria", "체육관": "gym", "도서관": "library", "교실~(퀴즈)": "classroom"}
ALIASES = {
    "facadesign_매홀중학교": "sign_school_name",
    "doorclass_본관": "door_main_entrance",
    "banner_매홀중학교~체육관_8": "banner_gym_name",
    "banner_환영합니다_6": "banner_welcome",
    "blackboard_6_퀴즈~시간!": "blackboard_quiz",
}


def slug(name):
    if name in ALIASES:
        return ALIASES[name]
    if name.startswith("signhang_"):
        parts = name.split("_")
        txt = parts[1]
        kind = "back" if (len(parts) > 2 and parts[2] == "7a6ac0") else "next"
        if txt in KO:
            return f"sign_{kind}_{KO[txt]}"
    if re.fullmatch(r"[A-Za-z0-9_\-]+", name):
        return name
    ascii_part = re.sub(r"[^A-Za-z0-9_\-]+", "", name.replace("~", "_"))
    h = hashlib.md5(name.encode("utf-8")).hexdigest()[:6]
    return (ascii_part[:24].strip("_-") or "obj") + "_" + h


def clean(path):
    if os.path.isdir(path):
        shutil.rmtree(path)
    os.makedirs(path, exist_ok=True)


def make_sprites():
    clean(os.path.join(A, "sprites"))
    clean(os.path.join(A, "portraits"))
    out = {}
    for key in chars.STYLES:
        d = os.path.join(A, "sprites", key)
        os.makedirs(d, exist_ok=True)
        st = chars.STYLES[key]
        for dn in chars.DIRS:
            for f in range(3):
                chars.draw_char(st, dn, f).save(os.path.join(d, f"{dn}_{f}.png"))
        # 얼굴 그림: 머리~가슴 부분을 4배로 확대
        face = chars.draw_char(st, "down", 0).crop((2, 0, 28, 30))
        face.resize((face.width * 4, face.height * 4), Image.NEAREST).save(os.path.join(A, "portraits", f"{key}.png"))
        # 선택 카드용 전신 그림(5배)
        body = chars.draw_char(st, "down", 0)
        body.resize((body.width * 5, body.height * 5), Image.NEAREST).save(os.path.join(A, "portraits", f"{key}_full.png"))
        out[key] = dict(w=chars.CW, h=chars.CH, ax=chars.ANCHOR[0], ay=chars.ANCHOR[1])
    return out


def make_objects(res):
    clean(os.path.join(A, "objects"))
    info = {}
    sprites = dict(res["sprites"])
    for n in EXTRA_OBJECTS:
        if n not in sprites:
            sprites[n] = objects.get_sprite(n)
    for n, sp in sorted(sprites.items()):
        f = slug(n) + ".png"
        sp["img"].save(os.path.join(A, "objects", f))
        info[n] = dict(file=f, w=sp["w"], d=sp["d"], pad=sp["pad"], solid=bool(sp["solid"]),
                       decor=bool(sp.get("decor", False)), pw=sp["img"].width, ph=sp["img"].height)
    return info


def make_ui():
    clean(os.path.join(A, "ui"))
    ink = hexc("#2a1f2d")

    def save(im, name):
        im.save(os.path.join(A, "ui", name))

    # 느낌표 말풍선 (NPC 위)
    s = Image.new("RGBA", (18, 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    d.rounded_rectangle([0, 0, 17, 14], 4, fill=hexc("#fff5c4"), outline=ink)
    d.polygon([(6, 14), (11, 14), (8, 19)], fill=hexc("#fff5c4"), outline=ink)
    d.line([(7, 14), (10, 14)], fill=hexc("#fff5c4"))
    d.rectangle([8, 3, 9, 8], fill=hexc("#e8603a"))
    d.rectangle([8, 10, 9, 11], fill=hexc("#e8603a"))
    save(s, "bubble_exclaim.png")
    # 말풍선 (...)
    s = Image.new("RGBA", (18, 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    d.rounded_rectangle([0, 0, 17, 14], 4, fill=hexc("#ffffff"), outline=ink)
    d.polygon([(6, 14), (11, 14), (8, 19)], fill=hexc("#ffffff"), outline=ink)
    d.line([(7, 14), (10, 14)], fill=hexc("#ffffff"))
    for x in (4, 8, 12):
        d.rectangle([x, 6, x + 1, 7], fill=hexc("#6a6a7c"))
    save(s, "bubble_talk.png")
    # 체크
    s = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    d.ellipse([0, 0, 15, 15], fill=hexc("#4fb46a"), outline=hexc("#1f6a3a"))
    d.line([(4, 8), (7, 11), (12, 5)], fill=hexc("#ffffff"), width=2)
    save(s, "check.png")
    # 자물쇠
    s = Image.new("RGBA", (16, 18), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    d.arc([3, 0, 12, 10], 180, 360, fill=hexc("#7a5a10"), width=2)
    d.rectangle([2, 7, 13, 16], fill=hexc("#e8b830"), outline=hexc("#7a5a10"))
    d.rectangle([7, 10, 8, 13], fill=hexc("#5a3a10"))
    save(s, "lock.png")
    # 별
    s = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    d.polygon([(8, 0), (10, 6), (16, 6), (11, 10), (13, 16), (8, 12), (3, 16), (5, 10), (0, 6), (6, 6)],
              fill=hexc("#f6c93a"), outline=hexc("#9a6a10"))
    save(s, "star.png")
    # 하트
    s = Image.new("RGBA", (16, 14), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    d.polygon([(8, 13), (0, 5), (2, 1), (5, 0), (8, 3), (11, 0), (14, 1), (16, 5)], fill=hexc("#e8506a"), outline=hexc("#7a1a2a"))
    save(s, "heart.png")
    # 발밑 하이라이트 링(ZEP처럼 내 캐릭터 아래에 깔려요)
    s = Image.new("RGBA", (36, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    d.ellipse([0, 0, 35, 15], fill=(255, 255, 255, 70), outline=(255, 255, 255, 230), width=1)
    d.ellipse([5, 3, 30, 12], outline=(255, 255, 255, 140), width=1)
    save(s, "ring.png")
    # 위쪽 화살표(목표 표시)
    s = Image.new("RGBA", (16, 14), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    d.polygon([(8, 13), (0, 3), (5, 3), (5, 0), (11, 0), (11, 3), (16, 3)], fill=hexc("#ffe14a"), outline=hexc("#8a5a10"))
    save(s, "arrow_down.png")


def make_backgrounds(res):
    os.makedirs(os.path.join(A, "backgrounds"), exist_ok=True)
    res["bg"].convert("RGB").save(os.path.join(A, "backgrounds", "map.png"))
    # 시작 화면: '메타 투어 매홀' 그림(tools/reference/title_ref.webp)을 1280x720으로 맞춰요.
    src = os.environ.get("TITLE_SRC") or os.path.join(ROOT, "tools", "reference", "title_ref.webp")
    if os.path.exists(src):
        im = Image.open(src).convert("RGB")
        # 우하단 반짝이 워터마크를 주변 모래로 덮어요
        w, h = im.size
        box = (int(w * 0.885), int(h * 0.80), int(w * 0.955), int(h * 0.885))
        patch = im.crop((box[0] - (box[2] - box[0]) - 40, box[1], box[0] - 40, box[3]))
        im.paste(patch, (box[0], box[1]))
        sc = 720 / h
        im = im.resize((round(w * sc), 720), Image.LANCZOS)
        left = (im.width - 1280) // 2
        im = im.crop((left, 0, left + 1280, 720))
        im.save(os.path.join(A, "backgrounds", "title.png"))
        return True
    return False


def js_write(path, var, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("// 자동 생성 파일입니다. (tools/make_assets.py)\n")
        f.write(f"window.{var} = ")
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")


def main():
    res = mapbuild.build()
    sprites = make_sprites()
    objs = make_objects(res)
    make_ui()
    has_title = make_backgrounds(res)
    js_write(os.path.join(ROOT, "js", "data", "map.js"), "MAEHOL_MAP", res["data"])
    js_write(os.path.join(ROOT, "js", "data", "assets.js"), "MAEHOL_ASSETS",
             dict(sprites=sprites, objects=objs, title=has_title,
                  ui=["bubble_exclaim", "bubble_talk", "check", "lock", "star", "heart", "ring", "arrow_down"],
                  dirs=chars.DIRS))
    print("스프라이트:", len(sprites), "오브젝트:", len(objs), "제목 화면:", has_title)


if __name__ == "__main__":
    main()
