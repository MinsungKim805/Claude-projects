tools 폴더 안내 (선택 사항)
===========================
게임을 "하는 데"는 필요 없어요. 그림과 맵을 코드로 만들어 내는 파이썬 도구예요.
방 모양이나 가구 위치를 바꾸고 싶을 때만 쓰세요.

준비:  파이썬 3 설치,  터미널에서  pip install pillow
실행:  python tools/make_assets.py      (게임 폴더의 맨 위에서 실행)
       → assets/ 의 그림들과 game/map_data.js 가 새로 만들어져요.

파일 설명
  make_assets.py   모든 그림과 맵 데이터를 한 번에 만드는 "대장" 파일
  mapbuild.py      ★ 방의 위치/크기, 가구 배치, NPC 위치, 잠긴 문 조건을 정해요
  objects.py       가구, 소품, 벽 장식 그림을 그리는 코드
  chars.py         캐릭터와 NPC를 그리는 코드 (머리 모양, 안경, 모자, 색)
  pxlib.py         색 섞기, 글씨 그리기 같은 공용 도구
  fonts/           그림에 글씨를 넣을 때 쓰는 글꼴
  reference/       시작 화면 원본 그림

예) NPC 위치를 바꾸고 싶다면  mapbuild.py 의  NPCS = [ ... ]  를 고친 뒤 다시 실행하세요.
