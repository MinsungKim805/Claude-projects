assets 폴더 안내 (게임에 쓰이는 모든 픽셀아트 그림)
=================================================

sprites/       캐릭터와 NPC. 한 명당 PNG 한 장이에요. (예: donghun.png)
               그림 한 장 안에 여러 모습이 들어 있어요.
                  가로 3칸 = 걷기 모습 (0:서 있기, 1:왼발, 2:오른발)
                  세로 4줄 = 방향 (1줄 앞, 2줄 왼쪽, 3줄 오른쪽, 4줄 뒤)
               칸 하나의 크기는 30 x 46 픽셀이에요.
               donghun / minseong / seongmin = 내가 고르는 캐릭터 (동훈, 민성, 성민)
               haneul, doyun, seoyeon, jiu, banjang = 소개해 주는 NPC
               extra_a ~ extra_d = 복도에서 만나는 학생들

objects/       가구, 소품, 벽 장식, 문. 하나당 PNG 한 장이에요.
               desk.png (책상)  chair_red_n.png (빨간 의자)  table_6x2_brown_tray.png (급식실 식탁)
               window_3_field.png (창문)  blackboard_quiz.png (칠판)  gate_v_closed.png (잠긴 문) ...
               이름 규칙:  종류_모양_색  (예: chair_blu_s = 파란 의자, 남쪽을 보고 앉음)

portraits/     대화창에 나오는 얼굴 그림 (캐릭터이름.png)과
               캐릭터 선택 카드에 나오는 전신 그림 (캐릭터이름_full.png)

backgrounds/   map.png   = 맵 전체 배경(바닥 + 벽). 아주 큰 그림이에요.
               title.png = 시작 화면

ui/            말풍선(bubble_*.png), 자물쇠(lock.png), 별(star.png) 같은 작은 아이콘

그림을 직접 그려서 바꿔 끼우고 싶다면: 같은 파일 이름, 같은 크기로 저장해서 덮어쓰세요.
(배경이 투명한 PNG로 저장해야 해요.)
