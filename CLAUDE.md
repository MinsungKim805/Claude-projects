# CLAUDE.md — 메타 투어 매홀 (나와 만나는 학교)

이 파일은 Claude Code가 새 세션을 시작할 때 자동으로 읽는 프로젝트 기억 노트예요.
지금까지의 대화에서 정해진 결정·사용자 취향·주의사항을 모아 두었어요. 작업 전에 꼭 지켜 주세요.

## 1. 프로젝트 한눈에 보기
- **매홀중학교를 소개하는 교육용 메타버스 게임**. p5.js(전역 모드), ZEP 느낌의 탑다운 2.5D 픽셀아트.
- 흐름: 타이틀 → 캐릭터 선택(동훈 / 민성(안경) / 성민(모자), Teachable Machine 얼굴 인식은 선택) →
  장소 탐험하며 NPC 소개 듣기 → 소개를 다 들으면 문(게이트)이 열림 → 마지막 교실에서 퀴즈.
- 결과물: `maehol-meta/` **평평한(하위 폴더 없는) 폴더** + `maehol-meta.zip`. p5 웹 에디터에 그대로 올려서 실행하는 것이 목표.
- 캔버스 1280×720, 타일 32px, 확대 Z=2. 깊이 정렬은 발밑(footprint bottom) 기준, 충돌 그리드·게이트·NPC 타일·발 박스 충돌.

## 2. 파일 구조와 역할
| 파일 | 역할 | 손으로 고치나? |
|---|---|---|
| `maehol-meta/index.html` | 첫 줄 `<!-- noprotect -->`, p5 1.9.4(cdnjs), `#game` div, 스크립트 순서 `content.js` → `sketch.js` → `game.js`. **data.js 태그는 없음**(sketch.js가 직접 불러옴) | O |
| `maehol-meta/sketch.js` (~32KB) | 코드 ①: 파일 불러오기(대체 경로 포함)·입력/소리·UI 도구·부팅 화면·setup/draw | O |
| `maehol-meta/game.js` (~48KB) | 코드 ②: 월드·Teachable Machine·타이틀/선택/게임 장면. 마지막 줄 `window.MAEHOL_GAME = true;` | O |
| `maehol-meta/content.js` | `CONFIG`(얼굴 TM 링크 연결됨, 동작 TM 링크는 비어 있음), `MAEHOL_SCRIPT`(대사), `MAEHOL_QUIZ`(8문제) | O (선생님/학생이 고치는 파일) |
| `maehol-meta/data.js` | 맵 데이터·글꼴 등 | X — 생성됨 |
| `maehol-meta/art.png` | 그림 묶음(아틀라스+배경+타이틀+장소 사진) | X — 생성됨 |
| `tools/make_assets.py` | art.png·data.js·zip 전부 다시 만들기 + 검사(`!!` 경고 출력) | |
| `tools/mapbuild.py` | 맵 배치(AREAS, 가구, NPC, 좌석 등) | |
| `tools/art.py` | 픽셀아트 스프라이트 생성 | |
| `tools/pack.py` | 아틀라스 패킹, 장소 사진(640×360, 96색), zip(`write_zip()`), 각종 검사 | |
| `tools/reference/` | 사용자가 준 참고 사진 (아래 7절) | |
| `README.md` | 사용 설명(6개 파일, 사진 연출, 보기 섞기, 앉아서 퀴즈, 80KB 주의, 대체 로더, SHA) | |

`sketch.js`와 `game.js`는 클래식 스크립트라 전역 `let/const`를 공유해요(나눠도 서로의 변수를 그냥 씀).

## 3. p5 웹 에디터 제약 (소스로 확인한 사실 — 반드시 지킬 것)
- **텍스트 파일이 80,000바이트 이상이면 S3로 올라감** → 편집 불가, URL로만 존재, 안의 문자열 치환도 안 됨.
  그래서 sketch.js를 sketch.js + game.js로 나눴음. **각 JS 파일 79,000바이트 이하 유지** (pack.py가 경고함).
- 한 번에 업로드 6개, 파일당 5MB. 같은 이름은 `-1`이 붙음. 미리보기는 첫 `.html` 사용.
- JS 안의 **따옴표로 감싼 파일 이름**(js/png 등)은 에디터가 자산 URL로 바꿔치기함 →
  sketch.js 안에서 `"art.png"`, `"data.js"`, `"content.js"`, `"game.js"`는 **각각 정확히 한 번만** 등장해야 함.
  다른 곳에서 이름이 필요하면 `["data", "js"].join(".")`처럼 조립.
- 에디터 루프 보호(`_LPn` 변수 삽입)가 중첩·블록 없는 루프를 깨뜨림(`_LP1 is not defined` 사건).
  → index.html의 `<!-- noprotect -->` 유지 + **`for(;;)` / `while` / `do` 절대 쓰지 말 것**.
  대신 `times(n)`, `for...of`, `.forEach`, `.some`, `.map` 사용. (pack.py가 검사함)
- 라이브 에디터는 자산 URL에 `?v=timestamp`를 붙임.
- 사용자의 에디터에서 S3에 올라간 data.js/art.png가 안 불러와진 적이 있음(원인 미확정). 그래서 대체 로더가 있음.

## 4. 파일 불러오기(대체 로더) 설계
- `firstOk`: 내 파일 → raw.githubusercontent(고정 SHA) → jsDelivr 순으로 3초 간격 경주, 각 40초 타임아웃.
- 파일별 진행 표시, 실패 화면에 이유 + [다시 시도] + [내 컴퓨터에서 파일 고르기].
- `tagScript`는 http(s)/file: 일 때만(HTML 404를 스크립트로 실행하는 사고 방지).
- 인터넷에서 받아 실행 중이면 타이틀에 "내 파일 대신 인터넷(GitHub)의 … 로 실행 중이에요" 안내.
- `boot.state`가 ok가 되는 조건: `MAP && LIST && SCRIPT && QUIZ && window.CONFIG && window.MAEHOL_GAME && IMG.bg && IMG.title`.

## 5. 작업 절차 (중요)
### 그림/맵을 바꿨을 때
`python tools/make_assets.py` → art.png, data.js, zip 재생성. `!!` 경고가 없어야 함.

### art.png / data.js / content.js / game.js 중 하나라도 바꿨을 때 — SHA 2단계 갱신
1. 바뀐 파일 커밋 & 푸시.
2. 새 커밋의 raw URL 파일이 로컬과 같은지 확인(`cmp`).
3. `sketch.js`의 `const SHA = "..."`를 그 커밋 SHA로 변경.
4. `pack.write_zip()`으로 zip 다시 만들기.
5. 테스트.
6. 커밋 & `main`에 푸시 (작업 브랜치·`claude/main`도 같이).

### 브랜치
- **GitHub 푸시 대상은 `main`** (사용자 지정: "깃헙 푸시는 Claude-project/main 으로"). fast-forward만.
- 작업 브랜치 `claude/hopeful-thompson-c4ruz5`, GitHub 기본 브랜치 `claude/main`도 같은 커밋으로 맞춰 둠.
- PR은 요청할 때만.

### 테스트
- Playwright + Chromium(`/opt/pw-browsers/chromium`, `playwright install` 금지), 로컬 node 정적 서버.
- 확인해 온 시나리오: 정상 로드, S3 실패/멈춤, GitHub 차단→jsDelivr, 전부 차단→수동 선택, 기본 index.html, game.js 누락, file://,
  끝까지 플레이해 퀴즈 8/8, 앉기/시작/일어나기, 잠김 상태, 사진 연출 규칙, 체육관·도서관 이동 경로, 보기 섞기 분포(Q5 고정).
- 테스트할 때 사진 연출이 끼어들지 않게 `seen`을 미리 채워 둘 것.
- 시험 모드: URL에 `?unlock` → 새 게임 시작 시 모든 소개 완료 처리 + 문 전부 열림 + 토스트.
  시험 모드(`TEST_MODE`)에서 Ctrl 또는 Shift를 누르고 걸으면 3배 속도(`fastWalk()`). Ctrl+W는 탭을 닫으므로 Ctrl은 방향키와, WASD는 Shift와 쓰라고 안내함.

## 6. 현재 게임 내용 (확정 사항)
### 맵 (mapbuild.py, 타일 좌표 x,y,w,h)
- 운동장(모래) → 복도 c1 → **급식실**(베이지, 2,3,32,15) → c2 → **체육관**(나무, 46,3,22,16) → c3 →
  **도서관**(모브 mauve, 46,33,20,16) → c4 → **교실**(오크 oak, 46,63,20,16).
- **급식실**: 가로 식탁 **4줄 × 3열**, 식탁당 6자리, 긴 양쪽에 **주황색 원형 일체형 의자**, 사람이 지나갈 1칸 통로, 전체적으로 왼쪽 배치.
  `rtable_6x1_{cream|mint|peach}_tray` x=13,20,27 / y=5,8,11,14. 배식 줄 x 4..12. 배식대 2개.
- **체육관**: 위쪽에 길고 넓은 무대 `stage_10x4`(52,3) + 커튼, 무대 양옆 작은 방 준비실/탈의실/기구실/창고
  (`GYM_ROOMS=[(46,3,6,4),(62,3,6,4)]`), 무대 아래 **세로 코트 2개** (`GYM_COURTS=[(48,6),(60,6)]`, y0=8, h=10), 골대·벤치·매트·트로피.
- **세로 복도**: 벤치·트로피장은 세로 버전(`benchv_3`, `trophyv_3`) — 세로 복도에 가로 물건 두지 말 것.
- **도서관**(참고사진 ② 기준): 창가 바 테이블 + 높은 의자, 아치형 독서 공간(크림 소파), 타원 테이블(흰/검 의자), 책장 줄, 북카트.
- **교실**(참고사진 ② 기준): 앞쪽 왼쪽 TV(55,61) · 가운데 칠판(57,61) · 오른쪽 게시판(63,61), 교탁(59,64)에 **반장 NPC(60,63)**,
  **교탁 바로 앞 퀴즈 책상** `desk_oak_quiz`(60,66) + 의자(60,67) = `SEAT=(60,67)`, 학생 책상 3줄(y=68,71,74), **뒤쪽 사물함** `lockerbank_10`(51,78).
  "퀴즈 존"·바닥 매트·러그 없음.
- NPC: haneul(16,36), doyun(9,7), seoyeon(56,12), jiu(62,35 — 1칸 복도 막지 않게 옮김), banjang(60,63), walker1~4.

### 퀴즈 흐름
- 퀴즈 책상 근처에서 Space → 앉기(앉은 자세 스프라이트: 'up' 프레임 [0,0,30,34]를 9px 내려 그림).
- 앉은 상태: [퀴즈 시작하기!] 버튼(소개 미완료면 회색 + "소개를 모두 끝내야…" 토스트), [일어나기](Esc/↓/S).
- **일어날 때는 의자 왼쪽**으로(막히면 아래, 오른쪽 순).
- 모두 소개 완료 & 퀴즈 전이면 책상 위에 느낌표 말풍선.
- 반장 대화는 잠김/소개/다시 대사만 — 반장이 퀴즈를 시작하지 않음.
- 퀴즈 8문제. **문제 순서는 그대로, 보기(정답) 순서만 섞음**. `fixed: true`인 문제(Q5 배식대 개수)는 섞지 않음.
  `answer`는 섞기 전 인덱스.
- 퀴즈 끝나면 일어나서 반장 `quiz.after` 대사.

### 장소 사진 연출
- 장소에 **처음** 들어갈 때 사진을 흰 번쩍임·기울며 확대·반짝이 스윕·별·이름 띠와 함께 3.4초 보여주고 사라짐. Space/클릭으로 넘김.
- 대상: c1(첫 복도만), cafeteria, gym, library, classroom. 다른 복도는 사진 없음.

## 7. 실제 학교 정보 (content.js 대사 근거)
- 1955년 오산여자중학교로 개교 → 2005년 매홀중학교.
- 교훈: '참되고 슬기롭고 건강하게'. 상징: 향나무·장미·까치.
- 1학년 10반(2·3층), 2학년 12반(4·5층), 3학년 12반(신관 2·3층). 본교무실·학년 교무실·행정실 등.
- 급식: 4교시 직후, 배식대 2개, 국·덮밥·케이크·쿠키 등.
- 원본 이미지: `tools/reference/school_info/`.

### 참고 이미지 위치
- `tools/reference/places/` — 게임에 쓰는 장소 사진(cafeteria, gym, library②, classroom②, corr1).
- `tools/reference/places_alt/` — 안 쓰는 대안(교실①, 도서관①, 복도②, 예전 급식실 사진 `cafeteria_old`) + 급식실 식탁 배치 스케치.
  (급식실·체육관 사진은 사용자가 준 그림으로 교체됨. 예전 사진은 `cafeteria_old`·`gym_old`. 체육관 배치는 사진과 달리 예전 그대로 두기로 함)
- `tools/reference/characters/` — 동훈, 민성(안경), 성민(모자).
- `tools/reference/style/zep_style.webp` — 목표 그림체(ZEP).
- `tools/reference/title_ref.webp` — 타이틀 학교 외관.

## 8. 사용자 취향 / 소통 방식
- 한국어로 소통. 짧고 쉽게(학생/교사 눈높이) 설명.
- 요청이 애매하면 사용자가 바로잡아 줌 — 바로잡은 내용(위 6절)을 그대로 따를 것.
- 이미 대화로 알고 있는 내용은 파일을 다시 읽지 말 것("대화 내용 기억하면 읽지 말고").
- 변경 후엔 직접 실행 테스트로 확인하고, 결과를 솔직하게 보고.
- 커밋 메시지는 한국어로 무엇을 바꿨는지 구체적으로.

## 9. 열린 항목
- 사용자 에디터에서 S3 자산 로드 실패의 근본 원인은 미확정(대체 로더로 우회 중).
- 얼굴 인식 TM 모델: `https://teachablemachine.withgoogle.com/models/IsJukufkt/` (이미지 프로젝트, 클래스 `동훈`·`민성`·`성민`·`no face`, 224px).
  테스트 환경에서는 teachablemachine.withgoogle.com·jsDelivr가 막혀 있어서 모델은 `https://storage.googleapis.com/tm-model/IsJukufkt/` 에서 받고,
  라이브러리는 scratchpad npm(tfjs 1.3.1, @teachablemachine/image 0.8.5)으로 Playwright route 해서 테스트함. 가짜 카메라는 getUserMedia를 canvas.captureStream으로 바꿔치기.
  (참고 캐릭터 그림은 일러스트라 실제 얼굴 인식 정확도 테스트에는 못 씀 — 실제 얼굴은 사용자가 웹캠으로 확인)
- 동작 인식 TM 링크(`TM_MOTION_MODEL_URL`)는 비어 있음.
- 공개 주소: **GitHub Pages `https://minsungkim805.github.io/Claude-projects/maehol-meta/`** — 현재 `claude/main` 브랜치에서 배포됨(푸시 후 약 1분, 브라우저 캐시 최대 10분).
  TM 라이브러리는 jsDelivr → unpkg 순서로 받고, 카메라/라이브러리 오류는 선택 화면 카메라 패널에 한국어로 표시됨.
