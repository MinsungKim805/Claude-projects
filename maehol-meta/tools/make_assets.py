"""모든 픽셀아트 이미지와 맵 데이터를 한 번에 다시 만들어요.

    python3 tools/make_assets.py

만들어지는 것
  assets/sprites/<캐릭터>.png                    캐릭터/NPC 시트 (가로 3프레임 x 세로 4방향: 앞,왼쪽,오른쪽,뒤)
  assets/objects/<이름>.png                      가구, 소품, 벽 장식, 문 (오브젝트 하나당 PNG 하나)
  assets/backgrounds/map.png, title.png          맵 배경(바닥+벽), 시작 화면
  assets/ui/*.png                                아이콘
  map_data.js                                    게임이 읽는 맵/이미지 목록
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
from pxlib import ROOT, hexc, shade, lighten, text_image, down2, FONT11B, FONT9

A = os.path.join(ROOT, "assets")
DATA = os.path.join(ROOT, "data")

KO = {"운동장": "playground", "급식실": "cafeteria", "체육관": "gym", "도서관": "library", "교실~(퀴즈)": "classroom"}
ALIASES = {
    "facadesign_매홀중학교": "sign_school_name",
    "doorclass_본관": "door_main_entrance",
    "banner_매홀중학교~체육관_8": "banner_gym_name",
    "banner_환영합니다_6": "banner_welcome",
    "blackboard_6_퀴즈~시간!_steel": "blackboard_quiz",
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
    """캐릭터 한 명 = 시트 한 장 (가로 3프레임 x 세로 4방향: 앞, 왼쪽, 오른쪽, 뒤). 칸 하나는 30x46."""
    clean(os.path.join(A, "sprites"))
    for key in chars.STYLES:
        chars.make_sheet(key).save(os.path.join(A, "sprites", f"{key}.png"))
    return {key: {} for key in chars.STYLES}


def make_objects(res):
    """오브젝트 하나 = PNG 하나. 2배로 그린 그림을 게임 크기(칸 32px)로 줄여서 저장해요."""
    clean(os.path.join(A, "objects"))
    info = {}
    for n, sp in sorted(res["sprites"].items()):
        f = slug(n) + ".png"
        im, pad = sp["img"], sp["pad"]
        if im.width % 2 or im.height % 2:      # 홀수 크기면 오른쪽/아래쪽에 투명 한 줄을 붙여요
            big = Image.new("RGBA", (im.width + im.width % 2, im.height + im.height % 2), (0, 0, 0, 0))
            big.paste(im, (0, 0))
            pad += im.height % 2
            im = big
        small = down2(im)
        small.save(os.path.join(A, "objects", f))
        info[n] = dict(file=f, w=sp["w"], d=sp["d"], pad=(pad + 1) // 2, solid=bool(sp["solid"]),
                       decor=bool(sp.get("decor", False)), pw=small.width, ph=small.height)
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
    small = down2(res["bg"])
    # 하얀 라인(운동장·체육관)은 따로 줄여서 얹어요. 반 칸이라도 걸치면 켜져서 선이 끊기지 않아요.
    a = res["lines"].getchannel("A").resize((small.width, small.height), Image.BOX).point(lambda v: 255 if v >= 127 else 0)
    line = Image.new("RGBA", small.size, hexc("#fbf6e8"))
    line.putalpha(a)
    small.alpha_composite(line)
    small.convert("RGB").save(os.path.join(A, "backgrounds", "map.png"), optimize=True)
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


def main():
    res = mapbuild.build()
    sprites = make_sprites()
    objs = make_objects(res)
    make_ui()
    has_title = make_backgrounds(res)
    out = os.path.join(ROOT, "map_data.js")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    assets = dict(sprites=sprites, objects=objs, title=has_title,
                  ui=["bubble_exclaim", "bubble_talk", "check", "lock", "star", "ring", "arrow_down"])
    with open(out, "w", encoding="utf-8") as f:
        f.write("// 자동으로 만들어진 파일이에요. 직접 고치지 말고 tools/make_assets.py 를 다시 실행하세요.\n")
        f.write("// MAEHOL_MAP    = 맵 크기, 충돌 지도, 가구 위치, NPC 위치, 잠긴 문 정보\n")
        f.write("// MAEHOL_ASSETS = 어떤 이미지 파일이 있는지 목록\n")
        f.write("window.MAEHOL_MAP = ")
        json.dump(res["data"], f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\nwindow.MAEHOL_ASSETS = ")
        json.dump(assets, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print("스프라이트:", len(sprites), "오브젝트:", len(objs), "제목 화면:", has_title)


if __name__ == "__main__":
    main()
