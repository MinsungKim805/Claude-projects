// =====================================================================
//  sketch.js  —  메타 투어 매홀  (p5.js 웹 에디터용: 코드를 한 파일에 모았어요)
//
//  ★ 직접 고치는 곳은 두 군데뿐이에요
//     [1] 설정(티처블 머신 링크 등)   [2] 소개 대사와 퀴즈
//  나머지(게임 코드, 맵 데이터)는 건드리지 않아도 돼요.
//  글자를 찾을 때는 Ctrl+F 를 쓰세요.
// =====================================================================

// =====================================================================
//  [1] 설정  (티처블 머신 링크, 인식 이름, 속도 ...)
// =====================================================================
// =====================================================================
//  config.js  —  설정 파일  (★ 여러분이 직접 고치는 파일!)
//
//  게임의 "스위치"들을 모아 둔 파일이에요.
//  숫자나 따옴표 " " 안의 글자만 바꾸세요. 고친 뒤 실행(▶) 버튼을 다시 누르면 적용돼요.
//  // 로 시작하는 줄은 설명(메모)이라서 게임에는 영향이 없어요.
// =====================================================================
window.CONFIG = {

  // -------------------------------------------------------------------
  // 1. 티처블 머신 링크  (비워 두면 키보드/마우스로 플레이해요)
  //    티처블 머신에서 모델을 [내보내기] 한 뒤 나오는 링크를 따옴표 안에 붙여 넣으세요.
  //    예)  "https://teachablemachine.withgoogle.com/models/AbCdEfGhI/"
  // -------------------------------------------------------------------
  TM_FACE_MODEL_URL: "",     // 얼굴 인식 모델 링크  → 캐릭터를 골라요
  TM_MOTION_MODEL_URL: "",   // 동작 인식 모델 링크  → 캐릭터를 움직여요
  TM_MOTION_TYPE: "pose",    // 동작 모델 종류: "pose"(포즈 프로젝트) 또는 "image"(이미지 프로젝트)


  // -------------------------------------------------------------------
  // 2. 얼굴 인식: 클래스 이름 → 캐릭터
  //    티처블 머신에서 만든 "클래스 이름"을 그대로 적어요.
  //    (대문자/소문자, 띄어쓰기는 달라도 괜찮아요)
  //    왼쪽의 donghun / minseong / seongmin 은 캐릭터 그림 파일 이름이에요.
  // -------------------------------------------------------------------
  FACE_CLASSES: {
    donghun: ["동훈"],
    minseong: ["민성"],
    seongmin: ["성민"],
  },
  // 사람이 없을 때 쓰는 클래스 이름. 이 이름으로 인식되면 아무 캐릭터도 고르지 않아요.
  FACE_NONE_CLASSES: ["No one", "Noone", "아무도 없음", "없음"],
  FACE_MIN_PROB: 0.8,        // 확률이 이 값(0.8 = 80%) 이상일 때만 "인식됐다"고 해요
  FACE_HOLD_MS: 1800,        // 같은 얼굴이 이 시간(1800 = 1.8초) 동안 보이면 자동으로 시작해요


  // -------------------------------------------------------------------
  // 3. 동작 인식: 클래스 이름 → 움직이는 방향
  //    예를 들어 티처블 머신에서 "오른쪽" 클래스를 만들었다면,
  //    그 동작을 할 때 캐릭터가 오른쪽으로 걸어요.
  // -------------------------------------------------------------------
  MOTION_CLASSES: {
    up: ["위", "위쪽", "up", "앞"],
    down: ["아래", "아래쪽", "down", "뒤"],
    left: ["왼쪽", "left", "좌"],
    right: ["오른쪽", "right", "우"],
    action: ["확인", "선택", "action", "ok"],     // 대화 넘기기 / 선택하기
  },
  MOTION_IDLE_CLASSES: ["정지", "idle", "stop", "No one", "Noone", "없음"],   // 가만히 있는 동작 = 멈춤
  MOTION_MIN_PROB: 0.75,


  // -------------------------------------------------------------------
  // 4. 게임 설정
  // -------------------------------------------------------------------
  PLAYER_SPEED: 112,         // 걷는 속도. 숫자가 클수록 빨라요
  TEXT_SPEED: 42,            // 대화 글자가 나오는 속도. 숫자가 클수록 빨라요
};

// =====================================================================
//  [2] 소개 대사와 퀴즈  (NPC가 하는 말, 객관식 문제)
// =====================================================================
// =====================================================================
//  content.js  —  학교 소개 대사 + 퀴즈  (★ 여러분이 직접 고치는 파일!)
//
//  이 파일 하나만 고치면 NPC가 하는 말과 퀴즈 문제가 바뀌어요.
//  자바스크립트를 몰라도 괜찮아요. 따옴표 " " 안의 글자만 바꾸세요.
//
//  주의!
//   - 따옴표 " " 와 쉼표 , 는 지우지 마세요.  (한 줄이 끝나면 쉼표가 있어야 해요)
//   - // 로 시작하는 줄은 설명(메모)이에요. 게임에는 영향이 없어요.
//   - 고친 뒤 실행(▶) 버튼을 다시 누르면 적용돼요.
//
//  ★ 지금 들어 있는 대사와 퀴즈는 동작을 확인하려고 넣은 "임시 내용"이에요.
//    실제 매홀중학교 소개 내용으로 바꿔 주세요.
// =====================================================================


// =====================================================================
//  1. NPC 소개 대사
//     areas.playground = 운동장 / cafeteria = 급식실 / gym = 체육관 / library = 도서관
//       npc   : 말하는 NPC (하늘=haneul, 도윤=doyun, 서연=seoyeon, 지우=jiu)
//       lines : 대사 목록. 한 줄이 한 번에 하나씩 나와요. 줄을 더하거나 빼도 돼요.
//       done  : 소개를 다 들었을 때 화면에 뜨는 알림 글
//     이 대사를 끝까지 들어야 다음 문이 열려요!
// =====================================================================
window.MAEHOL_SCRIPT = {
  // 구역별 소개 (guide NPC가 말해요). 끝까지 들으면 다음 문이 열려요.
  areas: {
    playground: {
      npc: "haneul",
      lines: [
        "안녕! 나는 매홀중학교 안내를 맡은 하늘이야. 우리 학교 투어에 온 걸 환영해!",
        "여기는 운동장이야. 체육 시간이나 쉬는 시간에 친구들과 축구도 하고 마음껏 뛰어노는 곳이지.",
        "운동장 위쪽을 봐! 관중석과 계단이 번갈아 있고, 가운데에는 구령대가 있어. 관중석에는 햇빛 가리개도 달려 있지.",
        "그 위에 있는 큰 건물이 본관이야. 저기 본관 입구로 들어가면 복도가 나와.",   // ★ 확인 필요
        "참, 우리 교복은 자주색 조끼가 포인트야. 너도 잘 어울린다!",
        "이제 본관 입구가 열렸어! 복도를 따라 위로 올라가면 급식실이 나와. 거기서 도윤이가 기다리고 있을 거야.",
      ],
      done: "소개를 잘 들었어요! 본관 입구가 열렸어요.",
    },
    cafeteria: {
      npc: "doyun",
      lines: [
        "어서 와! 나는 급식실 안내를 맡은 도윤이야.",
        "4교시가 끝난 직후, 하루 중 가장 즐거운 시간이 뭔지 알아? 바로 점심시간이지!",
        "너도 급식실에서 한 번쯤은 먹어 봤지?",
        "우리 급식실에는 배식대가 2개나 있어서, 맛있는 급식이 항상 나와.",
        "맛있는 국과 덮밥은 물론이고, 케이크랑 쿠키 같은 디저트도 나온다고!",
        "맛있겠지? 이제 오른쪽 복도로 가 보자. 문이 열렸어! 다음은 체육관이야.",
      ],
      done: "급식실 소개 완료! 오른쪽 문이 열렸어요.",
    },
    gym: {
      npc: "seoyeon",
      lines: [
        "안녕! 나는 서연이야. 여기가 우리 학교 체육관이야!",
        "체육 시간에 농구, 배구 같은 실내 운동을 하는 곳이야. 바닥에 그어진 하얀 선이 농구 코트 라인이지.",
        "오른쪽 위에는 무대가 있어. 행사나 모임이 있을 때 학생들이 모이는 곳이기도 해.",   // ★ 확인 필요
        "운동할 때는 체육복과 운동화를 꼭 챙기고, 준비 운동도 해야 다치지 않아!",
        "자, 다음은 도서관이야. 아래쪽 복도로 내려가면 돼. 문이 열렸어! 조용히 걸어가 보자~",
      ],
      done: "체육관 소개 완료! 아래쪽 문이 열렸어요.",
    },
    library: {
      npc: "jiu",
      lines: [
        "쉿! 나는 도서관을 돕는 지우야. 도서관에 온 걸 환영해.",
        "여기서는 책을 읽고, 빌리고, 친구들과 조용히 공부도 할 수 있어.",   // ★ 확인 필요
        "책을 빌릴 때는 대출 카운터에서 대출 처리를 하면 돼. 반납 날짜도 꼭 지켜야 해.",
        "도서관의 약속! 조용히 하기, 책은 읽은 뒤 제자리에 꽂기. 어렵지 않지?",
        "이제 소개는 모두 끝났어! 아래쪽 복도 끝 교실에서 학교 퀴즈가 기다리고 있어.",
        "교실에 가면 반장이 퀴즈를 내 줄 거야. 열심히 들었다면 다 맞출 수 있을걸?",
      ],
      done: "모든 소개를 마쳤어요! 퀴즈 존으로 가는 문이 열렸어요.",
    },
  },

  // 퀴즈 진행자(반장)
  quiz: {
    npc: "banjang",
    locked: ["아직 소개를 다 못 들었네? 운동장, 급식실, 체육관, 도서관을 모두 돌고 와!"],
    intro: [
      "왔구나! 나는 반장이야. 오늘 투어의 마지막, 학교 퀴즈 시간이야!",
      "지금까지 들은 이야기에서 나오니까 걱정하지 마. 총 5문제야. 준비됐지?",
    ],
    again: ["퀴즈를 또 풀어 볼래? 좋아, 다시 시작하자!"],
    after: ["퀴즈 클리어를 축하해! 우리 학교 정말 멋지지? 또 놀러 와!"],
  },

  // 복도에서 만나는 학생들 (필수 아님, 말을 걸면 학교 이야기를 들려줘요)
  //   복도마다 한 명씩 있어요. 줄이 여러 개면 차례대로 모두 말해요.
  chat: {
    walker1: [   // 본관 복도 (운동장 → 급식실)
      "여기는 본관 복도야. 복도에서는 천천히 걸어 다니자!",
      "우리 학교는 1955년에 오산여자중학교로 개학했어.",
      "그리고 2005년에 우리가 아는 지금의 매홀중학교가 됐지!",
    ],
    walker2: [   // 급식실 → 체육관 복도
      "우리 교훈은 '참되고 슬기롭고 건강하게'야. 멋지지?",
      "학교의 상징은 향나무, 장미, 그리고 까치란다.",
    ],
    walker3: [   // 체육관 → 도서관 복도
      "1학년은 10반이고, 교실은 2층과 3층에 있어.",
      "2학년은 12반으로 4층, 5층에 있고!",
    ],
    walker4: [   // 도서관 → 교실 복도
      "3학년도 12반인데, 2층과 3층에 있는 신관을 써.",
      "본교무실, 학년 교무실, 행정실처럼 선생님들이 계신 교무실도 정말 많아!",
      "자, 이제 교실에서 퀴즈가 기다리고 있어. 힘내!",
    ],
  },

  // 목표 문구 (화면 왼쪽 위)
  objective: {
    playground: "운동장에서 하늘에게 말을 걸어 보세요",
    cafeteria: "급식실로 가서 도윤이에게 말을 걸어 보세요",
    gym: "체육관으로 가서 서연이에게 말을 걸어 보세요",
    library: "도서관으로 가서 지우에게 말을 걸어 보세요",
    quiz: "교실 퀴즈 존에서 반장에게 말을 걸어 보세요",
    done: "퀴즈를 모두 마쳤어요! 자유롭게 둘러보세요",
  },
};



// =====================================================================
//  2. 퀴즈 (객관식)
//     q       : 문제
//     choices : 보기들 (2~4개를 추천해요)
//     answer  : 정답 번호. 0 이 첫 번째 보기, 1 이 두 번째 보기, ...
//     explain : 문제를 풀고 나서 보여주는 해설
//     문제는 몇 개든 늘리거나 줄여도 돼요. 소개 대사에서 나온 내용으로 만들면 좋아요.
// =====================================================================
window.MAEHOL_QUIZ = [
  {
    q: "매홀중학교 교복의 포인트 색은 무엇일까요?",
    choices: ["자주색 조끼", "초록색 조끼", "파란색 조끼", "노란색 조끼"],
    answer: 0,
    explain: "하늘이가 말한 것처럼 자주색 조끼가 우리 교복의 포인트예요!",
  },
  {
    q: "매홀중학교는 처음에 어떤 이름의 학교로 개학했을까요?",
    choices: ["오산여자중학교", "매홀초등학교", "오산중학교", "매홀여자중학교"],
    answer: 0,
    explain: "1955년에 오산여자중학교로 개학했고, 2005년에 지금의 매홀중학교가 됐어요.",
  },
  {
    q: "매홀중학교의 교훈은 무엇일까요?",
    choices: ["참되고 슬기롭고 건강하게", "열심히 놀고 맛있게 먹자", "밝고 맑고 아름답게", "높이 멀리 빠르게"],
    answer: 0,
    explain: "우리 교훈은 '참되고 슬기롭고 건강하게'예요.",
  },
  {
    q: "다음 중 우리 학교의 상징이 아닌 것은?",
    choices: ["향나무", "장미", "까치", "소나무"],
    answer: 3,
    explain: "학교의 상징은 향나무, 장미, 까치예요.",
  },
  {
    q: "우리 급식실에는 배식대가 몇 개 있을까요?",
    choices: ["1개", "2개", "3개", "4개"],
    answer: 1,
    explain: "배식대가 2개 있어요. 국, 덮밥은 물론 케이크와 쿠키 같은 디저트도 나와요!",
  },
  {
    q: "2학년 교실은 몇 층에 있을까요?",
    choices: ["2층과 3층", "3층과 4층", "4층과 5층", "1층"],
    answer: 2,
    explain: "2학년은 12반이고 4층과 5층에 있어요. (1학년은 10반, 2·3층)",
  },
  {
    q: "체육관에서 볼 수 없는 것은 무엇일까요?",
    choices: ["농구 골대", "무대", "공 보관함", "수영장"],
    answer: 3,
    explain: "체육관에는 농구 골대, 무대, 공 보관함이 있어요. 수영장은 없어요!",
  },
  {
    q: "도서관에서 지켜야 할 약속으로 알맞은 것은?",
    choices: ["큰 소리로 이야기하기", "책을 던지며 놀기", "조용히 하고 책은 제자리에 꽂기", "간식을 먹으며 책 읽기"],
    answer: 2,
    explain: "도서관에서는 조용히 하고, 읽은 책은 제자리에 꽂아야 해요.",
  },
];

// =====================================================================
//  연결 부분  (고치지 마세요)
//  티처블 머신 라이브러리 주소와 맵 데이터를 게임에 연결해요.
// =====================================================================
window.MAEHOL_LIBS = {"tf": "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js", "posenet": null, "pose": "https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js", "image": "https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js"};
const _DATA = MAEHOL_DATA();                       // 맨 아래에 있는 맵 데이터를 가져와요
window.MAEHOL_MAP = _DATA.map;
window.MAEHOL_ASSETS = _DATA.assets;

// =====================================================================
//  게임 코드  (고치지 마세요)
//  p5.js 가 setup() 과 draw() 를 불러서 게임을 돌려요.
// =====================================================================
// =====================================================================
//  sketch.js  —  메타 투어 매홀 게임 코드 전부 (p5.js)
//
//  p5.js 는 setup() 을 한 번, draw() 를 1초에 약 60번 자동으로 불러줘요.
//  이 파일의 차례:
//    1. 준비      : 크기, 진행 상황, 그림 불러오기
//    2. 입력·소리 : 키보드, 마우스, 효과음
//    3. 꾸미기 도구: 글씨, 상자, 버튼, 대화창, 알림
//    4. 월드      : 맵, 충돌(벽에 막히기), 잠긴 문, 카메라, 그리기
//    5. 티처블 머신: 얼굴 인식(캐릭터 선택), 동작 인식(이동)
//    6. 화면들    : 시작 → 캐릭터 선택 → 게임(대화, 퀴즈)
//    7. p5 시작점 : setup(), draw()
//
//  직접 고치는 파일은 config.js(설정)와 content.js(대사·퀴즈)예요.
//  ※ p5.js 이름(text, rect, select, dist 등)과 겹치지 않게 이름을 지었어요.
// =====================================================================


// =====================================================================
//  1. 준비
// =====================================================================
const [W, H, Z, T] = [1280, 720, 2, 32];   // 화면 가로·세로, 맵 확대 배율, 타일(한 칸) 크기(픽셀)
const VW = W / Z, VH = H / Z;                // 화면에 보이는 맵의 크기(확대 전)
const MAP = window.MAEHOL_MAP, LIST = window.MAEHOL_ASSETS;   // 맵 데이터, 그림 목록 (map_data.js)
const SCRIPT = window.MAEHOL_SCRIPT, QUIZ = window.MAEHOL_QUIZ;   // 대사, 퀴즈 (content.js)
const FONT = "Galmuri11";

const AREAS = ["playground", "cafeteria", "gym", "library"];   // 소개를 들어야 하는 구역 (이 순서대로)
const STOPS = [["playground", "운동장"], ["cafeteria", "급식실"], ["gym", "체육관"], ["library", "도서관"], ["classroom", "교실"]];
const CHARS = [   // 내가 고를 수 있는 캐릭터 (key = assets/sprites 의 파일 이름)
  { key: "donghun", name: "동훈", desc: "까만 머리의 씩씩한 친구" },
  { key: "minseong", name: "민성", desc: "동그란 안경이 잘 어울려요" },
  { key: "seongmin", name: "성민", desc: "모자가 멋진 유쾌한 친구" },
];
const charName = (key) => (CHARS.find((c) => c.key === key) || { name: "나" }).name;

let scene = "boot", clock = 0;                    // 지금 화면, 화면이 켜진 뒤 흐른 시간(초)
let charKey = "donghun";                          // 내가 고른 캐릭터
let done = {}, quizDone = false, best = null;     // 소개를 끝낸 구역, 퀴즈를 풀었는지, 최고 점수
try { best = parseInt(localStorage.getItem("maehol_best")) || null; } catch (e) {}

// ---- 그림 불러오기: IMG.obj["desk"] = 책상 그림, IMG.spr["donghun"] = 동훈 시트 ...
const IMG = { obj: {}, spr: {}, ui: {}, bg: null, title: null };
let loaded = 0, total = 0, failed = 0;
function loadImages() {
  const jobs = [];
  const load = (url, save) => {
    total++;
    jobs.push(new Promise((ok) => {
      const im = new Image();
      im.onload = () => { loaded++; save(im); ok(); };
      im.onerror = () => { loaded++; failed++; ok(); };
      im.src = url;
    }));
  };
  const FILES = LIST.files;   // 큰 그림 파일의 위치 (map_data.js 에 적혀 있어요)
  if (LIST.atlas) {   // 묶음 방식(p5 웹 에디터용): 묶음 그림 한 장을 불러와서 조각조각 잘라 써요
    load(LIST.atlas.file, (im) => {
      for (const name in LIST.atlas.rects) {
        const [x, y, w, h] = LIST.atlas.rects[name], cut = Object.assign(document.createElement("canvas"), { width: w, height: h });
        cut.getContext("2d").drawImage(im, x, y, w, h, 0, 0, w, h);
        const [kind, key] = name.split(":");
        (kind === "spr" ? IMG.spr : kind === "ui" ? IMG.ui : IMG.obj)[key || name] = cut;
      }
    });
  } else {            // 낱개 방식: 그림마다 PNG 한 장 (assets 폴더)
    for (const n in LIST.objects) load("assets/objects/" + LIST.objects[n].file, (im) => (IMG.obj[n] = im));
    for (const k in LIST.sprites) load(`assets/sprites/${k}.png`, (im) => (IMG.spr[k] = im));
    for (const u of LIST.ui) load(`assets/ui/${u}.png`, (im) => (IMG.ui[u] = im));
  }
  load(FILES.map, (im) => (IMG.bg = im));
  if (LIST.title) load(FILES.title, (im) => (IMG.title = im));
  return Promise.all(jobs);
}

// 캐릭터 시트에서 한 장면을 오려서 그려요. 시트는 가로 3프레임(서기, 왼발, 오른발) x 세로 4방향이고,
// 칸 하나는 30x46 픽셀이에요. s = 확대 배율, crop = 일부만 오릴 때 [x, y, 가로, 세로]
const ROW = { down: 0, left: 1, right: 2, up: 3 };
function sprite(key, dir, frame, x, y, s = 1, crop = [0, 0, 30, 46]) {
  const im = IMG.spr[key];
  if (im) drawingContext.drawImage(im, frame * 30 + crop[0], ROW[dir] * 46 + crop[1], crop[2], crop[3], Math.round(x), Math.round(y), crop[2] * s, crop[3] * s);
}


// =====================================================================
//  2. 입력과 소리
// =====================================================================
let keys = {}, pressed = {}, click = null;        // 누르는 중인 키, 이번 프레임에 눌린 키, 이번 프레임의 클릭 위치
let motion = { dir: null, action: false, nav: 0 };   // 티처블 머신 동작 인식 결과
// 키는 "KeyW" 같은 코드로 확인해서, 한글 입력 상태여도 WASD가 잘 먹어요.
addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();   // 페이지가 스크롤되지 않게
  if (!e.repeat) pressed[e.code] = true;
  keys[e.code] = true;
  startAudio();
});
addEventListener("keyup", (e) => (keys[e.code] = false));
addEventListener("blur", () => (keys = {}));
const down = (code) => keys[code];      // 지금 누르고 있나?
const was = (code) => pressed[code];    // 이번 프레임에 막 눌렀나?
const action = () => was("Space") || was("Enter") || was("KeyE") || motion.action;   // "확인" 키
// 이동 방향 {x, y} (각각 -1, 0, 1). WASD/방향키가 우선이고, 아무것도 안 누르면 동작 인식을 써요.
function moveVec() {
  let x = (down("KeyD") || down("ArrowRight") ? 1 : 0) - (down("KeyA") || down("ArrowLeft") ? 1 : 0);
  let y = (down("KeyS") || down("ArrowDown") ? 1 : 0) - (down("KeyW") || down("ArrowUp") ? 1 : 0);
  if (!x && !y && motion.dir) { x = { left: -1, right: 1 }[motion.dir] || 0; y = { up: -1, down: 1 }[motion.dir] || 0; }
  return { x, y };
}
const numberKey = () => { for (let i = 0; i < 9; i++) if (was("Digit" + (i + 1)) || was("Numpad" + (i + 1))) return i; return -1; };   // 1~9 키 → 0~8
const navKey = () => (was("ArrowUp") || was("KeyW") ? -1 : was("ArrowDown") || was("KeyS") ? 1 : motion.nav);                    // 메뉴 위/아래

// ---- 효과음: [높이(Hz), 길이(초), 파형, 크기] 를 순서대로 "삑삑" 내요. 숫자를 바꾸면 소리가 달라져요.
let audio = null, muted = false;
function startAudio() {   // 브라우저는 첫 입력 뒤에야 소리를 허락해요
  if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  else if (audio.state === "suspended") audio.resume();
}
const SOUNDS = {
  blip: [[700, 0.04, "square", 0.025]], click: [[440, 0.05]], select: [[520, 0.07], [780, 0.09]], wrong: [[220, 0.25, "sawtooth"]],
  open: [[523, 0.12, "triangle"], [659, 0.12, "triangle"], [784, 0.12, "triangle"], [1047, 0.12, "triangle"]],
  correct: [[659, 0.14, "triangle"], [880, 0.14, "triangle"]],
  finish: [[523, 0.16, "triangle"], [659, 0.16, "triangle"], [784, 0.16, "triangle"], [1047, 0.16, "triangle"], [1319, 0.16, "triangle"]],
};
function sfx(name) {
  if (muted || !audio) return;
  SOUNDS[name].forEach(([freq, len, type = "square", vol = 0.05], i) => {
    const t0 = audio.currentTime + i * 0.09, osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + len + 0.02);
  });
}


// =====================================================================
//  3. 화면 꾸미기 도구 (p5.js 로 그려요)
// =====================================================================
// 글씨 쓰기. o = { align, valign, bold, color, outline } 옵션
function txt(s, x, y, size, o = {}) {
  push();
  textFont(FONT); textSize(size); textStyle(o.bold ? BOLD : NORMAL); textAlign(o.align || LEFT, o.valign || TOP);
  if (o.outline) { stroke(o.outline); strokeWeight(o.outlineW || 3); strokeJoin(ROUND); } else noStroke();
  fill(o.color || "#fff");
  text(String(s), Math.round(x), Math.round(y));
  pop();
}
function textW(s, size, bold) { push(); textFont(FONT); textSize(size); textStyle(bold ? BOLD : NORMAL); const w = textWidth(s); pop(); return w; }
// 긴 글을 maxW 너비에 맞게 여러 줄로 나눠요 (글자 단위로 자르기)
function wrapText(s, maxW, size, bold) {
  const lines = [];
  for (const para of String(s).split("\n")) {
    let cur = "";
    for (const ch of para) { if (textW(cur + ch, size, bold) > maxW) { lines.push(cur); cur = ""; } cur += ch; }
    lines.push(cur);
  }
  return lines;
}
// 둥근 상자. o = { fill, border, r(둥글기), bw(테두리 굵기), shadow }
function panel(x, y, w, h, o = {}) {
  push();
  if (o.shadow !== false) { noStroke(); fill(0, 0, 0, 70); rect(x + 4, y + 6, w, h, o.r ?? 10); }
  fill(o.fill || "rgba(22,24,52,0.94)"); stroke(o.border || "#8f94ff"); strokeWeight(o.bw ?? 4);
  rect(x, y, w, h, o.r ?? 10);
  pop();
}
const dim = (a) => { push(); noStroke(); fill(8, 6, 20, 255 * a); rect(0, 0, W, H); pop(); };   // 화면 어둡게
const hover = (x, y, w, h) => mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
// 이번 프레임의 클릭이 사각형 안이면 true (클릭은 "써 버려서" 한 번만 처리돼요)
function clicked(x, y, w, h) {
  if (click && click.x >= x && click.x <= x + w && click.y >= y && click.y <= y + h) { click = null; return true; }
  return false;
}
// 버튼을 그리고 눌렸으면 true.   사용 예)  if (button("시작", 100, 100, 200, 60)) { ... }
const BLUE = { fill: "#9ad0ff", hoverFill: "#c6e6ff", border: "#1f4a7a", color: "#12304f" };
const PINK = { fill: "#ff9aa8", hoverFill: "#ffc4cc", border: "#7a1f2f", color: "#4f1220" };
const GRAY = { fill: "#c9c6ff", hoverFill: "#e4e2ff", border: "#3a3670", color: "#26225a" };
function button(label, x, y, w, h, o = {}) {
  const on = hover(x, y, w, h), lift = on ? -2 : 0;
  push();
  noStroke(); fill(0, 0, 0, 80); rect(x + 3, y + 5, w, h, 10);
  fill(on ? o.hoverFill || "#ffe680" : o.fill || "#ffd34a"); stroke(o.border || "#7a4a10"); strokeWeight(4);
  rect(x, y + lift, w, h, 10);
  pop();
  txt(label, x + w / 2, y + h / 2 + lift + 1, o.size || 22, { align: CENTER, valign: CENTER, bold: true, color: o.color || "#5a2a08" });
  if (on) cursor("pointer");
  if (on && click) { click = null; sfx("click"); return true; }
  return false;
}
// 캐릭터 머리 위 이름표 (ZEP처럼)
function nameTag(name, sx, sy, color, bg) {
  const w = Math.ceil(textW(name, 11, true)) + 14;
  push(); noStroke(); fill(bg); rect(Math.round(sx - w / 2), Math.round(sy - 18), w, 18, 9); pop();
  txt(name, sx, sy - 8, 11, { align: CENTER, valign: CENTER, bold: true, color });
}
function keycap(label, x, y) {   // [Space] 같은 키 모양. 가로 길이를 돌려줘요
  const w = Math.max(26, textW(label, 11, true) + 14);
  panel(x, y, w, 22, { fill: "#f4f1ff", border: "#5a56a0", bw: 2, r: 5, shadow: false });
  txt(label, x + w / 2, y + 12, 11, { align: CENTER, valign: CENTER, bold: true, color: "#3a3670" });
  return w;
}
// 위쪽에 잠깐 떴다 사라지는 알림.  toast("문이 열렸어요!", "check")  (두 번째는 아이콘 이름)
let toasts = [];
const toast = (msg, icon) => { toasts.push({ msg, icon, age: 0 }); if (toasts.length > 3) toasts.shift(); };
function drawToasts(dt) {
  toasts.forEach((t) => (t.age += dt));
  toasts = toasts.filter((t) => t.age < 3.6);
  toasts.forEach((t, i) => {
    const w = Math.max(260, textW(t.msg, 22, true) + 70), x = W / 2 - w / 2, y = 96 + i * 62;
    push();
    drawingContext.globalAlpha = Math.max(0, Math.min(1, t.age / 0.2, (3.6 - t.age) / 0.4));   // 서서히 나타나고 사라져요
    panel(x, y, w, 52, { fill: "rgba(30,28,70,0.95)", border: "#ffd34a", r: 14 });
    const im = IMG.ui[t.icon];
    if (im) drawingContext.drawImage(im, x + 16, y + 26 - im.height, im.width * 2, im.height * 2);
    txt(t.msg, x + (im ? 50 : 0) + (w - (im ? 50 : 0)) / 2, y + 27, 22, { align: CENTER, valign: CENTER, bold: true });
    pop();
  });
}
// 대화창 (NPC가 말할 때 아래쪽에 나와요). d = { npc, lines, idx, shown(보여준 글자 수), done }
function drawDialogue(d) {
  const [x, y, w, h] = [90, 500, 1100, 196], name = d.npc.name, nameW = Math.max(120, textW(name, 22, true) + 44);
  panel(x, y, w, h, { fill: "rgba(20,22,50,0.95)", border: "#ffe27a", r: 14 });
  panel(x + 28, y - 22, nameW, 40, { fill: "#ffd34a", border: "#7a4a10", shadow: false });
  txt(name, x + 28 + nameW / 2, y - 2, 22, { align: CENTER, valign: CENTER, bold: true, color: "#5a2a08" });
  panel(x + 28, y + 30, 132, 132, { fill: "#e8e4ff", r: 12, shadow: false });
  drawingContext.imageSmoothingEnabled = false;
  sprite(d.npc.key, "down", 0, x + 28 + 14, y + 30 + 6, 4, [2, 0, 26, 30]);       // 얼굴: 캐릭터 시트의 머리 부분을 4배 확대
  let left = Math.floor(d.shown), ly = y + 36;                                       // 글씨는 한 글자씩 나타나요
  for (const line of wrapText(d.lines[d.idx], w - 230, 22)) {
    if (left <= 0) break;
    txt(line.slice(0, left), x + 190, ly, 22);
    left -= line.length;
    ly += 36;
  }
  if (d.done) {   // 다 나왔으면 깜빡이는 ▼
    push(); noStroke(); fill(255, 226, 122, 255 * (0.5 + 0.5 * Math.sin(clock * 6))); triangle(x + w - 60, y + h - 44, x + w - 36, y + h - 44, x + w - 48, y + h - 28); pop();
    txt("Space / 클릭", x + w - 40, y + h - 28, 11, { align: RIGHT, color: "rgba(255,255,255,0.6)" });
  }
}
// 설정 창: 조작 방법과 티처블 머신 연결 상태
let settingsOpen = false, settingsInGame = false, settingsFrame = 0;
const showSettings = (inGame) => { settingsOpen = true; settingsInGame = inGame; settingsFrame = frameCount; };
function drawSettings() {
  if (!settingsOpen) return;
  if (was("Escape") && frameCount !== settingsFrame) { settingsOpen = false; return; }   // Esc 로 닫기 (연 바로 그 프레임은 제외)
  dim(0.6);
  const [x, y, w, h] = [240, 70, 800, 580];
  panel(x, y, w, h, { fill: "rgba(24,26,58,0.98)", border: "#ffe27a", r: 16 });
  txt("설정 / 조작 방법", x + w / 2, y + 22, 30, { align: CENTER, bold: true, color: "#ffe27a" });
  const rows = [["이동", "W A S D  또는  방향키"], ["대화 / 선택", "Space · Enter · E  또는  마우스 클릭"], ["퀴즈 답 고르기", "1 2 3 4  또는  ↑ ↓ + Space  또는  클릭"], ["소리 켜기/끄기", "M"], ["이 창 열기/닫기", "Esc"]];
  rows.forEach(([a, b], i) => { txt(a, x + 50, y + 82 + i * 42, 22, { bold: true, color: "#9ad0ff" }); txt(b, x + 290, y + 82 + i * 42, 22); });
  txt("티처블 머신", x + 50, y + 312, 24, { bold: true, color: "#ffe27a" });
  [["얼굴 인식 (캐릭터 선택)", tmFaceUrl(), tm.face], ["동작 인식 (캐릭터 이동)", tmMotionUrl(), tm.motion]].forEach(([name, url, r], i) => {
    const [text, color] = !url ? ["링크가 비어 있어요 (키보드/마우스 사용)", "#b8b8d8"] : tm.error ? ["카메라 오류: " + tm.error, "#ff9a9a"] : r.status.startsWith("준비됨") ? ["연결됨", "#8affb0"] : [r.status === "off" ? "아직 시작하지 않았어요" : r.status, "#ffe27a"];
    txt(name, x + 50, y + 352 + i * 38, 22);
    txt(text, x + 400, y + 352 + i * 38, 22, { color });
  });
  txt("링크는 config.js 에 붙여 넣어요.", x + 50, y + 432, 11, { color: "rgba(255,255,255,0.65)" });
  const by = y + h - 84;
  if (button("닫기", x + 60, by, 200, 56, { size: 24 })) settingsOpen = false;
  if (button(muted ? "소리 켜기" : "소리 끄기", x + 290, by, 200, 56, BLUE)) muted = !muted;
  if (settingsInGame && button("처음으로", x + 520, by, 220, 56, PINK)) { settingsOpen = false; goTo("title"); }
}


// =====================================================================
//  4. 월드: 맵, 충돌, 잠긴 문, 카메라, 그리기
//     좌표는 모두 "픽셀"이에요. 캐릭터의 x, y 는 발 위치예요.
// =====================================================================
let grid, gates, npcs, objs, decor, player, cam, sparks = [];

function initWorld() {
  grid = MAP.collision.map((row) => [...row].map((c) => c === "1"));      // 칸마다 true(벽) / false(걸을 수 있음)
  gates = MAP.gates.map((g) => ({ ...g, open: false, tiles: Array.from({ length: g.size }, (_, i) => (g.o === "v" ? [g.x, g.y + i] : [g.x + i, g.y])) }));
  npcs = MAP.npcs.map((n) => ({ key: n.spr, name: n.name, id: n.id, area: n.area, role: n.role, tx: n.x, ty: n.y, x: (n.x + 0.5) * T, y: n.y * T + 27, dir: n.dir, home: n.dir }));
  // 가구: 그릴 위치와 "앞뒤 순서(sort)"를 미리 계산해 둬요. 아래쪽에 있는 것일수록 나중에(앞에) 그려요.
  objs = MAP.objects.map((o) => {
    const i = LIST.objects[o.n];
    return { n: o.n, x: o.x * T, y: (o.y + i.d) * T - i.ph + i.pad, sort: (o.y + i.d) * T, w: i.pw, h: i.ph };
  }).sort((a, b) => a.sort - b.sort);
  decor = MAP.decor.map((d) => ({ n: d.n, x: d.x, y: d.y, w: LIST.objects[d.n].pw, h: LIST.objects[d.n].ph }));   // 벽 장식
  player = { key: charKey, x: 0, y: 0, dir: "down", moving: false, anim: 0 };
  resetWorld();
}
function resetWorld() {   // 새 게임: 처음 상태로
  gates.forEach((g) => (g.open = false));
  Object.assign(player, { key: charKey, x: (MAP.spawn.x + 0.5) * T, y: MAP.spawn.y * T + 27, dir: "down", moving: false });
  npcs.forEach((n) => (n.dir = n.home));
  sparks = [];
  openGates(false);
  moveCamera(0, true);
}

// (tx, ty) 칸이 막혔는지: 맵 밖, 벽, 닫힌 문, NPC가 서 있는 칸
function isBlocked(tx, ty) {
  if (grid[ty]?.[tx] !== false) return true;
  return gates.some((g) => !g.open && g.tiles.some(([x, y]) => x === tx && y === ty)) || npcs.some((n) => n.tx === tx && n.ty === ty);
}
// 발 위치(x, y)에 서면 막히는지 (발 주변 가로 16, 세로 6 크기의 상자를 검사해요)
function footBlocked(x, y) {
  for (let ty = Math.floor((y - 6) / T); ty <= Math.floor(y / T); ty++) for (let tx = Math.floor((x - 8) / T); tx <= Math.floor((x + 8) / T); tx++) if (isBlocked(tx, ty)) return true;
  return false;
}
// 조건(requires)을 채운 문을 열어요. 새로 열린 문 목록을 돌려줘요.
function openGates(effects) {
  const opened = gates.filter((g) => !g.open && g.requires.every((id) => done[id]));
  for (const g of opened) {
    g.open = true;
    if (!effects) continue;
    const [cx, cy] = g.o === "v" ? [(g.x + 0.5) * T, (g.y + g.size / 2) * T] : [(g.x + g.size / 2) * T, (g.y + 0.5) * T];
    for (let i = 0; i < 36; i++) {   // 반짝이는 불꽃 36개
      const a = Math.random() * 6.28, s = 20 + Math.random() * 70;
      sparks.push({ x: cx + Math.random() * 28 - 14, y: cy + Math.random() * 28 - 14, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.7 + Math.random() * 0.6, age: 0, col: ["#ffe14a", "#fff", "#9ae8ff", "#ffb0d0"][i % 4] });
    }
  }
  return opened;
}
const gateCenter = (g) => { const [x, y] = g.tiles[g.tiles.length >> 1]; return { x: (x + 0.5) * T, y: (y + 0.5) * T }; };
// 플레이어 바로 앞에 닫힌 문이 있으면 알려 줘요
const closedGateNear = (r) => gates.find((g) => !g.open && g.tiles.some(([x, y]) => Math.abs(player.x - (x + 0.5) * T) < T / 2 + r && Math.abs(player.y - 8 - (y + 0.5) * T) < T / 2 + r));
const zoneAt = (tx, ty) => MAP.zones.find((z) => tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h);   // (tx,ty) 칸이 어느 구역인지
const nearestNpc = (maxDist) => npcs.filter((n) => dist(player.x, player.y - 6, n.x, n.y - 6) < maxDist).sort((a, b) => dist(player.x, player.y, a.x, a.y) - dist(player.x, player.y, b.x, b.y))[0];

// 매 프레임 움직이기 (dt = 지난 프레임 이후 흐른 시간(초), move = 이동 방향)
function updateWorld(dt, move) {
  let { x, y } = move;
  const len = Math.hypot(x, y);
  player.moving = len > 0;
  if (len > 0) {
    x /= len; y /= len;                          // 대각선으로 가도 빨라지지 않게 길이를 1로
    player.dir = move.x && Math.abs(move.x) >= Math.abs(move.y) ? (move.x < 0 ? "left" : "right") : move.y < 0 ? "up" : "down";
    const nx = player.x + x * CONFIG.PLAYER_SPEED * dt;        // 가로, 세로를 따로 움직여서 벽에 미끄러지게 해요
    if (!footBlocked(nx, player.y)) player.x = nx;
    const ny = player.y + y * CONFIG.PLAYER_SPEED * dt;
    if (!footBlocked(player.x, ny)) player.y = ny;
    player.anim += dt;
  } else player.anim = 0;
  for (const n of npcs) {   // NPC는 가까이 오면 나를 바라봐요
    const dx = player.x - n.x, dy = player.y - n.y;
    n.dir = Math.hypot(dx, dy) > 96 ? n.home : Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
  }
  sparks.forEach((q) => { q.age += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 60 * dt; });
  sparks = sparks.filter((q) => q.age < q.life);
  moveCamera(dt, false);
}
function moveCamera(dt, snap) {   // 카메라가 내 캐릭터를 따라가요 (맵 밖은 안 보이게)
  const tx = constrain(player.x - VW / 2, 0, MAP.w * T - VW), ty = constrain(player.y - 22 - VH / 2, 0, MAP.h * T - VH);
  const k = snap ? 1 : Math.min(1, 9 * dt);     // 9 = 따라가는 빠르기 (클수록 빨라요)
  cam = snap || !cam ? { x: tx, y: ty } : { x: cam.x + (tx - cam.x) * k, y: cam.y + (ty - cam.y) * k };
}
const toScreen = (x, y) => ({ x: (x - Math.round(cam.x)) * Z, y: (y - Math.round(cam.y)) * Z });   // 맵 좌표 → 화면 좌표

// 맵 그리기.  순서: 배경(바닥+벽) → 벽 장식 → [가구, 문, 캐릭터]를 "아래쪽 줄" 순서로 → 말풍선 → 불꽃
// 아래쪽에 있는 것을 나중에 그려서, 캐릭터가 책상 "뒤로" 걸어가는 것처럼 보여요.
function drawWorld(hintGate) {
  const c = drawingContext, cx = Math.round(cam.x), cy = Math.round(cam.y);
  const visible = (x, y, w, h) => x + w > cx && x < cx + VW && y + h > cy && y < cy + VH;   // 안 보이는 건 그리지 않아요
  c.save(); c.scale(Z, Z); c.imageSmoothingEnabled = false;
  if (IMG.bg) c.drawImage(IMG.bg, cx, cy, VW, VH, 0, 0, VW, VH);                              // 배경: 큰 맵 그림에서 보이는 부분만
  for (const d of decor) if (visible(d.x, d.y, d.w, d.h)) c.drawImage(IMG.obj[d.n], d.x - cx, d.y - cy);
  const list = [];   // 앞뒤 순서를 맞춰서 그릴 것들
  for (const o of objs) if (visible(o.x, o.y, o.w, o.h)) list.push({ sort: o.sort, draw: () => c.drawImage(IMG.obj[o.n], o.x - cx, o.y - cy) });
  for (const g of gates) {
    const [gw, gh] = g.o === "v" ? [T, g.size * T] : [g.size * T, T];
    if (visible(g.x * T, g.y * T, gw, gh)) list.push({ sort: (g.y + gh / T) * T, draw: () => c.drawImage(IMG.obj[`gate_${g.o}${g.size}_${g.open ? "open" : "closed"}`], g.x * T - cx, g.y * T - cy) });
  }
  for (const e of [...npcs, player]) {
    const isNpc = e !== player, frame = e.moving ? [1, 0, 2, 0][Math.floor(e.anim * 8) % 4] : 0;   // 걸을 때 1→0→2→0 반복
    if (!visible(e.x - 20, e.y - 50, 40, 60)) continue;
    list.push({ sort: e.y, draw: () => sprite(e.key, e.dir, frame, e.x - 15 - cx, e.y - 43 - cy + (isNpc ? Math.round(Math.sin(clock * 2.2 + e.tx) * 0.6) : 0)) });
  }
  list.push({ sort: player.y - 1, draw: () => { c.globalAlpha = 0.75 + 0.25 * Math.sin(clock * 4); c.drawImage(IMG.ui.ring, Math.round(player.x - 18 - cx), Math.round(player.y - 12 - cy)); c.globalAlpha = 1; } });   // 내 발밑 하이라이트 원
  list.sort((a, b) => a.sort - b.sort).forEach((it) => it.draw());
  for (const n of npcs) {   // NPC 머리 위 말풍선 아이콘
    const icon = scene === "game" && mode === "explore" ? npcIcon(n) : null;
    if (icon && visible(n.x - 20, n.y - 90, 40, 70)) c.drawImage(IMG.ui[icon], Math.round(n.x - 9 - cx), Math.round(n.y - 86 - cy + Math.sin(clock * 4 + n.tx) * 2));
  }
  if (hintGate) { const g = gateCenter(hintGate); c.drawImage(IMG.ui.arrow_down, Math.round(g.x - 8 - cx), Math.round(g.y - 34 - cy + Math.sin(clock * 5) * 3)); }   // 방금 열린 문 위 화살표
  for (const q of sparks) { c.globalAlpha = Math.max(0, 1 - q.age / q.life); c.fillStyle = q.col; c.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), 3, 3); }
  c.restore();
}


// =====================================================================
//  5. 티처블 머신
//     얼굴 인식: 동훈 / 민성 / 성민 / No one  →  캐릭터 선택
//     동작 인식: 위 / 아래 / 왼쪽 / 오른쪽 / 확인 →  캐릭터 이동
//     config.js 의 링크가 비어 있으면 카메라도 모델도 켜지 않아요.
//     흐름: 카메라 켜기 → 0.07초마다 카메라 그림을 모델에 넣기 → 결과(클래스 이름, 확률) → 캐릭터/방향으로 바꾸기
// =====================================================================
const tm = {
  running: false, cameraOn: false, error: null, video: null, canvas: null,
  face: { status: "off", model: null, label: "", prob: 0, probs: [], key: null, none: false },   // key = 인식된 캐릭터, none = "No one"
  motion: { status: "off", model: null, label: "", dir: null },
};
const tmFaceUrl = () => (CONFIG.TM_FACE_MODEL_URL || "").trim(), tmMotionUrl = () => (CONFIG.TM_MOTION_MODEL_URL || "").trim();
const tmWanted = () => tmFaceUrl() || tmMotionUrl();
const simple = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");           // 비교할 때 대소문자·띄어쓰기 무시: "No one" → "noone"
const sameName = (label, list) => (list || []).some((n) => simple(n) === simple(label));

// 클래스 이름 → 캐릭터.  ("민성", 0.97) → face.key = "minseong" /  ("No one", 0.99) → face.none = true
function readFace(label, prob, probs = []) {
  const f = tm.face;
  Object.assign(f, { label, prob, probs, none: sameName(label, CONFIG.FACE_NONE_CLASSES), key: null });
  if (!f.none) f.key = Object.keys(CONFIG.FACE_CLASSES).find((k) => sameName(label, CONFIG.FACE_CLASSES[k])) || null;
  if (prob < CONFIG.FACE_MIN_PROB) f.key = null;      // 확률이 낮으면 아직 모르는 걸로 둬요
}
// 클래스 이름 → 방향.  ("오른쪽", 0.95) → motion.dir = "right"
let lastMotionAction = 0;
function readMotion(label, prob) {
  const m = tm.motion, old = m.dir, M = CONFIG.MOTION_CLASSES;
  m.label = label;
  m.dir = null;
  motion.action = false;
  if (prob >= CONFIG.MOTION_MIN_PROB && !sameName(label, CONFIG.MOTION_IDLE_CLASSES)) {
    m.dir = ["up", "down", "left", "right"].find((d) => sameName(label, M[d])) || null;
    if (sameName(label, M.action) && performance.now() - lastMotionAction > 900) { motion.action = true; lastMotionAction = performance.now(); }
  }
  if (m.dir !== old) motion.nav = m.dir === "up" ? -1 : m.dir === "down" ? 1 : 0;
  motion.dir = m.dir;
}
// 시험용: 카메라 없이 결과를 흉내 내요.  F12 콘솔에서  debugFace("민성", 0.95)  /  debugFace("No one")  /  debugMotion("오른쪽")
const debugFace = (label, prob = 0.95) => { tm.face.status = "준비됨(테스트)"; readFace(label, prob, [{ name: label, p: prob }]); };
const debugMotion = (label, prob = 0.95) => { tm.motion.status = "준비됨(테스트)"; readMotion(label, prob); };

// 필요한 라이브러리를 그때그때 불러와요 (링크가 없으면 불러오지 않아서 게임이 가벼워요)
const scriptCache = {};
const loadScript = (src) => (scriptCache[src] ||= new Promise((ok, fail) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => fail(new Error("불러오기 실패: " + src)); document.head.appendChild(s); }));
// 티처블 머신 라이브러리 위치. 이 컴퓨터의 lib 폴더를 쓰고, p5 웹 에디터 버전에서는 인터넷 주소(window.MAEHOL_LIBS)를 써요.
const LIB = window.MAEHOL_LIBS || { tf: "lib/tf.min.js", posenet: "lib/posenet.min.js", pose: "lib/teachablemachine-pose.min.js", image: "lib/teachablemachine-image.min.js" };
const modelUrls = (base) => { base = base.replace(/[^/]*\.json$/i, ""); base += base.endsWith("/") ? "" : "/"; return [base + "model.json", base + "metadata.json"]; };

async function startTeachable() {
  if (tm.running || !tmWanted()) return;
  tm.running = true;
  try {   // 1) 카메라 켜기 (https 또는 localhost 에서만 돼요)
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("이 브라우저에서는 카메라를 쓸 수 없어요 (https 또는 localhost 에서 열어 주세요)");
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
    tm.video = Object.assign(document.createElement("video"), { srcObject: stream, muted: true, autoplay: true });
    tm.video.style.cssText = "position:fixed;left:-9999px;width:2px;height:2px;opacity:0";
    tm.video.setAttribute("playsinline", "");
    document.body.appendChild(tm.video);
    await tm.video.play();
    tm.canvas = Object.assign(document.createElement("canvas"), { width: 224, height: 224 });   // 모델에 넣을 224x224 그림
    tm.cameraOn = true;
    tm.error = null;
  } catch (e) { tm.error = e.message; tm.running = false; return; }
  // 2) 링크가 있는 모델만 불러오기
  await loadScript(LIB.tf);
  const poseMode = CONFIG.TM_MOTION_TYPE !== "image" && tmMotionUrl();
  if (poseMode) { if (LIB.posenet) await loadScript(LIB.posenet); await loadScript(LIB.pose); }
  if (tmFaceUrl() || (tmMotionUrl() && !poseMode)) await loadScript(LIB.image);
  const load = async (key, url, lib) => { tm[key].status = "불러오는 중..."; try { tm[key].model = await lib.load(...modelUrls(url)); tm[key].status = "준비됨"; } catch (e) { tm[key].status = "오류: 모델을 불러오지 못했어요"; console.warn(e); } };
  await Promise.all([tmFaceUrl() && load("face", tmFaceUrl(), window.tmImage), tmMotionUrl() && load("motion", tmMotionUrl(), poseMode ? window.tmPose : window.tmImage)]);
  tick();
}
// 0.07초마다: 카메라 그림을 만들어 모델에 넣고 결과를 받아요
async function tick() {
  if (!tm.running) return;
  try {
    const v = tm.video;
    if (v.readyState >= 2 && v.videoWidth) {
      const s = Math.min(v.videoWidth, v.videoHeight), c = tm.canvas.getContext("2d");
      c.save(); c.translate(224, 0); c.scale(-1, 1);                             // 거울처럼 좌우를 뒤집고
      c.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, 224, 224);   // 가운데 정사각형만 잘라요 (티처블 머신 웹캠과 같아요)
      c.restore();
      const best = (preds) => preds.reduce((a, b) => (b.probability > a.probability ? b : a));
      if (tm.face.model) { const p = await tm.face.model.predict(tm.canvas), b = best(p); readFace(b.className, b.probability, p.map((q) => ({ name: q.className, p: q.probability }))); }
      if (tm.motion.model) {
        const m = tm.motion.model, p = CONFIG.TM_MOTION_TYPE === "image" ? await m.predict(tm.canvas) : await m.predict((await m.estimatePose(tm.canvas)).posenetOutput), b = best(p);   // 포즈 모델은 몸의 관절을 먼저 찾아요
        readMotion(b.className, b.probability);
      }
    }
  } catch (e) { console.warn("티처블 머신 오류", e); }
  setTimeout(tick, 70);
}
function stopTeachable() {
  tm.running = tm.cameraOn = false;
  tm.video?.srcObject?.getTracks().forEach((t) => t.stop());
  tm.video?.remove();
  motion.dir = null;
}


// =====================================================================
//  6. 화면들
//     boot(불러오기) → title(시작 화면) → select(캐릭터 선택) → game(게임)
//     화면마다 enter(들어올 때 한 번) / update(움직이기) / draw(그리기) 가 있어요.
// =====================================================================
const scenes = {};
function goTo(name, arg) { scene = name; clock = 0; scenes[name].enter?.(arg); }

// ---------------------------------------------------------------------
//  불러오기 화면
// ---------------------------------------------------------------------
let fontsReady = false, assetsReady = false;
scenes.boot = {
  enter() {
    Promise.all(["22px Galmuri11", "bold 22px Galmuri11", "11px Galmuri11"].map((f) => document.fonts.load(f, "매홀중학교 ABC"))).finally(() => (fontsReady = true));   // 글꼴 먼저
    loadImages().then(() => (assetsReady = true));
  },
  update() { if (fontsReady && assetsReady && clock > 0.4) { initWorld(); goTo("title"); } },
  draw() {
    background("#14101f");
    const p = total ? loaded / total : 0;
    txt("메타 투어 매홀", W / 2, H / 2 - 80, 44, { align: CENTER, bold: true, color: "#ffe27a" });
    push(); noStroke(); fill("rgba(255,255,255,0.15)"); rect(W / 2 - 220, H / 2 + 10, 440, 18, 9); fill("#4fd17a"); rect(W / 2 - 220, H / 2 + 10, 440 * p, 18, 9); pop();   // 진행 막대
    txt(`불러오는 중... ${Math.round(p * 100)}%` + (failed ? `  (이미지 ${failed}개 실패: 폴더 구조를 확인해 주세요)` : ""), W / 2, H / 2 + 50, 22, { align: CENTER, color: failed ? "#ff9a9a" : "#d8d4ff" });
  },
};

// ---------------------------------------------------------------------
//  시작 화면: '메타 투어 매홀' 그림 위에 [시작하기]와 톱니바퀴 클릭 영역을 얹었어요.
// ---------------------------------------------------------------------
const START_BTN = [543, 620, 194, 62], GEAR_BTN = [1180, 626, 76, 80];   // [x, y, 가로, 세로]
scenes.title = {
  enter() { if (tm.running) stopTeachable(); },
  update() { if (!settingsOpen && (was("Enter") || was("Space"))) { sfx("select"); goTo("select"); } },
  draw() {
    drawingContext.imageSmoothingEnabled = false;
    if (IMG.title) drawingContext.drawImage(IMG.title, 0, 0, W, H);
    else { background("#27315c"); txt("메타 투어 매홀", W / 2, 220, 72, { align: CENTER, bold: true, color: "#ffd34a" }); }
    if (!settingsOpen) {
      const [overStart, overGear] = [hover(...START_BTN), hover(...GEAR_BTN)];
      push(); noFill(); stroke(255, 255, 255, overStart ? 255 : 90 + 90 * Math.sin(clock * 4) ** 2); strokeWeight(overStart ? 5 : 3);
      rect(START_BTN[0] - 4, START_BTN[1] - 4, START_BTN[2] + 8, START_BTN[3] + 8, 14);       // 깜빡이는 테두리
      if (overGear) { stroke(255); rect(GEAR_BTN[0] - 2, GEAR_BTN[1] - 2, GEAR_BTN[2] + 4, GEAR_BTN[3] + 4, 12); }
      pop();
      if (overStart || overGear) cursor("pointer");
      txt("Enter 키 또는 [시작하기]", 20, 696, 11, { outline: "rgba(0,0,0,0.8)" });
      if (best != null) { panel(24, 24, 250, 44, { fill: "rgba(20,22,50,0.8)", border: "#ffe27a", shadow: false }); txt(`최고 퀴즈 점수  ${best} / ${QUIZ.length}`, 149, 46, 16, { align: CENTER, valign: CENTER, bold: true, color: "#ffe27a" }); }
      if (clicked(...START_BTN)) { sfx("select"); goTo("select"); }
      if (clicked(...GEAR_BTN)) { sfx("click"); showSettings(false); }
    }
  },
};

// ---------------------------------------------------------------------
//  캐릭터 선택 화면
//    얼굴 인식: 동훈/민성/성민 → 그 캐릭터가 골라져요.  "No one" → 아무도 고르지 않아요.
//    링크가 비어 있으면 1·2·3 키나 클릭으로 골라요.
// ---------------------------------------------------------------------
let sel = 0, holdMs = 0, lastFace = null;    // 골라진 카드 번호, 같은 얼굴이 유지된 시간(ms), 직전에 인식된 얼굴
const cardX = (i) => 360 + i * 274;          // i번째 카드의 x 위치 (카드 크기 252 x 360, y 150)
scenes.select = {
  enter() { sel = Math.max(0, CHARS.findIndex((c) => c.key === charKey)); holdMs = 0; lastFace = null; startTeachable(); },
  choose(i) { if (i !== sel) { sel = i; sfx("select"); } },
  confirm() { charKey = CHARS[sel].key; sfx("finish"); goTo("game", { fresh: true }); },
  update(dt) {
    if (settingsOpen) return;
    const n = numberKey();
    if (n >= 0 && n < CHARS.length) this.choose(n);
    if (was("ArrowLeft") || was("KeyA")) this.choose((sel + 2) % 3);
    if (was("ArrowRight") || was("KeyD")) this.choose((sel + 1) % 3);
    if (was("Escape")) return goTo("title");
    if (action()) return this.confirm();
    const f = tm.face;   // ---- 얼굴 인식으로 고르기 ----
    if (tmFaceUrl() && f.key) {                                // 동훈/민성/성민 중 하나로 확실히 인식됨
      this.choose(CHARS.findIndex((c) => c.key === f.key));
      holdMs = f.key === lastFace ? holdMs + dt * 1000 : 0;    // 같은 얼굴이면 시간이 쌓여요
      lastFace = f.key;
      if (holdMs >= CONFIG.FACE_HOLD_MS) this.confirm();       // 충분히 유지되면 자동 시작!
    } else { holdMs = 0; lastFace = null; }                    // key 가 비면 "No one"이거나 확률이 낮은 경우: 아무것도 안 골라요
  },
  draw() {
    const g = drawingContext.createLinearGradient(0, 0, 0, H);   // 배경: 위에서 아래로 어두워지는 보라색 + 반짝이는 별
    g.addColorStop(0, "#3a2f73"); g.addColorStop(1, "#1b1740");
    drawingContext.fillStyle = g; drawingContext.fillRect(0, 0, W, H);
    noStroke();
    for (let i = 0; i < 46; i++) { fill(255, 255, 255, 80 + 120 * Math.abs(Math.sin(clock * 1.4 + i))); rect((i * 197) % W, (i * 83) % 420, 3, 3); }
    txt("캐릭터를 골라 주세요", W / 2, 40, 40, { align: CENTER, bold: true, color: "#ffe27a", outline: "#2a1a50", outlineW: 6 });
    txt(tmFaceUrl() ? "카메라에 얼굴을 보여 주면 내 캐릭터가 자동으로 골라져요!" : "숫자 1 · 2 · 3 을 누르거나 카드를 클릭해서 골라요", W / 2, 96, 22, { align: CENTER, color: "#d8d4ff" });
    this.drawCamera();
    CHARS.forEach((c, i) => this.drawCard(c, i));
    if (button("이 캐릭터로 시작하기", W / 2 + 70 - 190, 556, 380, 70, { size: 26 })) this.confirm();
    txt("Space / Enter 로도 시작해요", W / 2 + 70, 640, 11, { align: CENTER, color: "rgba(255,255,255,0.6)" });
    if (button("← 처음 화면", 30, 650, 190, 46, { size: 20, ...GRAY })) goTo("title");
    if (button("설정", 1110, 650, 80, 46, { size: 20, ...GRAY })) showSettings(false);
  },
  drawCard(c, i) {
    const [x, y, w, h] = [cardX(i), 150, 252, 360], on = sel === i, hov = hover(x, y, w, h) && !settingsOpen;
    const ly = y + (on ? -10 : hov ? -4 : 0);        // 골라진 카드는 위로 떠올라요
    panel(x, ly, w, h, { fill: on ? "rgba(255,244,200,0.98)" : "rgba(238,234,255,0.94)", border: on ? "#ffb21f" : "#8f94ff", bw: on ? 6 : 4, r: 16 });
    push(); noStroke(); fill(on ? "rgba(255,190,60,0.35)" : "rgba(120,110,200,0.25)"); ellipse(x + w / 2, ly + 270, 150, 38); pop();
    drawingContext.imageSmoothingEnabled = false;
    sprite(c.key, "down", 0, x + w / 2 - 75, ly + 28 + (on ? Math.round(Math.sin(clock * 5) * 4) : 0), 5);   // 캐릭터를 5배로 크게
    txt(c.name, x + w / 2, ly + 292, 30, { align: CENTER, bold: true, color: "#3a2a70" });
    txt(c.desc, x + w / 2, ly + 330, 11, { align: CENTER, color: "#6a5ea0" });
    keycap(String(i + 1), x + 14, ly + 14);
    if (on) txt("선택!", x + w - 16, ly + 18, 22, { align: RIGHT, bold: true, color: "#e0701a" });
    if (tmFaceUrl() && tm.face.key === c.key) {      // 얼굴이 이 캐릭터로 인식되면 시간 막대가 차올라요
      txt("얼굴 인식!", x + w / 2, ly - 30, 22, { align: CENTER, bold: true, color: "#8affb0", outline: "#103a20", outlineW: 5 });
      push(); noStroke(); fill("rgba(0,0,0,0.35)"); rect(x + 20, ly + h - 16, w - 40, 8, 4); fill("#4fd17a"); rect(x + 20, ly + h - 16, (w - 40) * constrain(holdMs / CONFIG.FACE_HOLD_MS, 0, 1), 8, 4); pop();
    }
    if (hov) { cursor("pointer"); if (clicked(x, y, w, h)) (sel === i ? this.confirm() : this.choose(i)); }   // 처음 클릭하면 고르기, 또 클릭하면 시작
  },
  drawCamera() {   // 왼쪽 패널: 카메라 화면과 인식 결과 (링크가 비어 있으면 안내 문구)
    const [x, y, w, h] = [34, 150, 300, 360], f = tm.face;
    panel(x, y, w, h, { fill: "rgba(14,12,40,0.85)", border: "#6a66c0", r: 14 });
    if (!tmFaceUrl()) {
      txt("얼굴 인식", x + w / 2, y + 22, 22, { align: CENTER, bold: true, color: "#ffe27a" });
      wrapText("티처블 머신 얼굴 인식 링크가 비어 있어요.\n\nconfig.js 의 TM_FACE_MODEL_URL 에 링크를 붙여 넣으면 카메라로 캐릭터를 고를 수 있어요.", w - 40, 11).forEach((l, i) => txt(l, x + 20, y + 78 + i * 20, 11, { color: "#d8d4ff" }));
      return txt("지금은 키보드/마우스로\n골라 주세요", x + w / 2, y + h - 80, 22, { align: CENTER, bold: true, color: "#9ad0ff" });
    }
    txt("얼굴 인식 카메라", x + w / 2, y + 16, 22, { align: CENTER, bold: true, color: "#ffe27a" });
    panel(x + 28, y + 54, 244, 244, { fill: "#0a0818", border: "#6a66c0", bw: 3, r: 8, shadow: false });
    if (tm.cameraOn) drawingContext.drawImage(tm.canvas, x + 30, y + 56, 240, 240);
    else txt(tm.error || "카메라를 켜는 중...", x + 40, y + 160, 11, { color: "#ffb0b0" });
    // 인식 결과 한 줄 (No one 이면 "얼굴이 보이지 않아요")
    const [label, color] = f.status.startsWith("오류") ? [f.status, "#ff9a9a"] : !f.model && !f.label ? [f.status === "off" ? "얼굴을 비춰 주세요" : f.status, "#d8d4ff"]
      : f.none ? ["얼굴이 보이지 않아요 (No one)", "#ffd27a"] : f.key ? [`${charName(f.key)}  ${Math.round(f.prob * 100)}%`, "#8affb0"] : [`${f.label}?  ${Math.round(f.prob * 100)}%`, "#ffe27a"];
    txt(label, x + w / 2, y + 314, 22, { align: CENTER, bold: true, color });
  },
};

// ---------------------------------------------------------------------
//  게임 화면: 돌아다니기 → NPC 소개 듣기 → 문 열기 → 교실에서 퀴즈
//    mode:  "explore"(돌아다니는 중) / "dialogue"(대화 중) / "quiz"(퀴즈 푸는 중)
// ---------------------------------------------------------------------
let mode = "explore", dlg = null, quiz = null;             // 지금 모드, 진행 중인 대화, 진행 중인 퀴즈
let zone = null, zoneT = 0, hintGate = null, nearNpc = null;   // 지금 장소, 장소 이름을 보여준 시간, 방금 열린 문, 가까이 있는 NPC
let cooldown = {}, gateCool = 0, mini = null;    // NPC별 쉬는 시간, 문 알림 간격, 미니맵 그림
const allDone = () => AREAS.every((a) => done[a]);        // 4곳 소개를 모두 끝냈는지
// NPC 머리 위에 어떤 말풍선을 보일지 (없으면 null)
function npcIcon(n) {
  if ((n.role === "guide" && !done[n.area]) || (n.role === "quiz" && allDone() && !quizDone)) return "bubble_exclaim";   // 아직 안 들은 소개 / 퀴즈 준비됨
  return n === nearNpc ? "bubble_talk" : null;
}

scenes.game = {
  enter(arg) {
    if (arg?.fresh) {   // 새 게임: 진행 상황을 모두 처음으로
      done = {}; quizDone = false; mode = "explore"; dlg = quiz = hintGate = zone = null; cooldown = {}; toasts = [];
      resetWorld();
      toast("W A S D 로 걸어 다녀요!", "star");
      if (/[?&]unlock/.test(location.search)) { AREAS.forEach((a) => (done[a] = true)); openGates(false); toast("시험 모드: 모든 문이 열려 있어요", "check"); }   // 주소 뒤에 ?unlock → 모든 문이 열려요
    }
    player.key = charKey;
    if (!mini) {   // 미니맵: 맵 큰 그림을 작게 줄여서 한 번만 만들어 둬요
      mini = Object.assign(document.createElement("canvas"), { width: 150, height: Math.round((150 * MAP.h) / MAP.w) });
      mini.getContext("2d").drawImage(IMG.bg, 0, 0, mini.width, mini.height);
    }
    startTeachable();
  },

  // ---- 매 프레임 움직이기 ----
  update(dt) {
    if (settingsOpen) return;
    if (was("Escape") && mode === "explore") return showSettings(true);
    for (const k in cooldown) cooldown[k] = Math.max(0, cooldown[k] - dt);
    gateCool = Math.max(0, gateCool - dt);
    if (mode === "explore") this.explore(dt);
    else if (mode === "dialogue") this.dialogue(dt);
    else this.quizUpdate(dt);
  },

  // 모드 1: 돌아다니기
  explore(dt) {
    const move = moveVec();
    updateWorld(dt, move);
    const z = zoneAt(Math.floor(player.x / T), Math.floor((player.y - 4) / T));   // 지금 있는 장소
    if (z && z !== zone) { zone = z; zoneT = 0; }
    zoneT += dt;
    if (hintGate && dist(player.x, player.y, gateCenter(hintGate).x, gateCenter(hintGate).y) < 56) hintGate = null;   // 문 가까이 가면 화살표 사라짐
    nearNpc = nearestNpc(46);
    for (const n of npcs) {   // 아직 안 들은 소개 NPC에게 가까이 가면 자동으로 대화가 시작돼요
      if (n.role === "guide" && !done[n.area] && !cooldown[n.id] && dist(player.x, player.y, n.x, n.y) < 62) return this.talk(n);
    }
    if (nearNpc && action()) return this.talk(nearNpc);      // 가까이 가서 Space / Enter / E
    if ((move.x || move.y) && gateCool <= 0) {   // 닫힌 문에 부딪히면 이유를 알려줘요
      const g = closedGateNear(10);
      if (g) { toast(g.label, "lock"); sfx("wrong"); gateCool = 3; }
    }
  },

  // NPC와 대화 시작. NPC의 역할(role)에 따라 하는 말이 달라요.
  talk(n) {
    const S = SCRIPT;
    if (n.role === "guide") this.say(n, S.areas[n.area].lines, () => this.finishArea(n.area));       // 대사를 다 들으면 이 구역이 "완료"
    else if (n.role === "quiz") {                                                                      // 반장: 소개를 다 듣기 전엔 돌려보내요
      if (!allDone()) this.say(n, S.quiz.locked);
      else this.say(n, quizDone ? S.quiz.again : S.quiz.intro, () => { mode = "quiz"; quiz = { i: 0, score: 0, state: "ask", sel: 0, picked: -1, results: [], t: 0 }; });
    } else this.say(n, S.chat[n.id] || ["안녕!"]);   // 복도 NPC: 학교 이야기를 들려줘요 (필수는 아니에요)
  },
  say(npc, lines, onDone) {   // 대화창 열기. lines = 대사 목록, onDone = 끝난 뒤 할 일
    mode = "dialogue"; dlg = { npc, lines, idx: 0, shown: 0, done: false, onDone }; sfx("click");
  },
  finishArea(area) {   // 소개를 끝냈을 때: 완료로 기록하고, 조건이 맞는 문을 열어요
    if (done[area]) return;
    done[area] = true;
    sfx("finish");
    toast(SCRIPT.areas[area].done || "소개를 잘 들었어요!", "star");
    const opened = openGates(true);
    if (opened.length) { hintGate = opened[opened.length - 1]; setTimeout(() => { sfx("open"); toast("문이 열렸어요! 화살표를 따라가 보세요", "check"); }, 900); }
  },

  // 모드 2: 대화하는 중
  dialogue(dt) {
    updateWorld(dt, { x: 0, y: 0 });
    const d = dlg, text = d.lines[d.idx];
    if (!d.done) {   // 글자가 한 글자씩 나타나요
      d.shown += dt * CONFIG.TEXT_SPEED;
      if (Math.floor(d.shown) % 3 === 0) sfx("blip");
      if (d.shown >= text.length) { d.shown = text.length; d.done = true; }
    }
    if (action() || click) {   // Space / Enter / E / 클릭
      click = null;
      if (!d.done) { d.shown = text.length; d.done = true; return; }   // 아직 나오는 중이면 한 번에 다 보여주기
      d.idx++; d.shown = 0; d.done = false; sfx("click");
      if (d.idx >= d.lines.length) { mode = "explore"; cooldown[d.npc.id] = 2.5; dlg = null; d.onDone?.(); }   // 대사가 끝났어요!
    }
  },

  // 모드 3: 퀴즈 푸는 중.  state: "ask"(문제) → "feedback"(정답 확인) → ... → "result"(결과)
  pick(i) {
    const q = QUIZ[quiz.i];
    if (quiz.state !== "ask" || i < 0 || i >= q.choices.length) return;
    quiz.picked = quiz.sel = i;
    const ok = i === q.answer;   // 정답인지 비교!
    if (ok) quiz.score++;
    sfx(ok ? "correct" : "wrong");
    quiz.results.push(ok);
    quiz.state = "feedback"; quiz.t = 0;
  },
  next() {   // 다음 문제 (마지막이면 결과 화면)
    quiz.i++; quiz.picked = -1; quiz.sel = 0; quiz.t = 0;
    if (quiz.i < QUIZ.length) return (quiz.state = "ask");
    quiz.state = "result"; quizDone = true; sfx("finish");
    if (best == null || quiz.score > best) { best = quiz.score; try { localStorage.setItem("maehol_best", best); } catch (e) {} }   // 최고 점수 저장
  },
  quizUpdate(dt) {
    quiz.t += dt;
    updateWorld(dt, { x: 0, y: 0 });
    if (quiz.state === "ask") {
      if (numberKey() >= 0) this.pick(numberKey());                                              // 1~4 키
      if (navKey()) { quiz.sel = (quiz.sel + navKey() + QUIZ[quiz.i].choices.length) % QUIZ[quiz.i].choices.length; sfx("click"); }   // ↑ ↓ 키
      if (action()) this.pick(quiz.sel);                                                          // Space 로 확정
    } else if (quiz.state === "feedback" && quiz.t > 0.3 && (action() || click)) { click = null; this.next(); }
  },
  closeQuiz() { mode = "explore"; quiz = null; cooldown.banjang = 1.5; },   // 닫자마자 반장이 다시 퀴즈를 시작하지 않게

  // ---- 매 프레임 그리기 ----
  draw() {
    background("#14101f");
    drawWorld(hintGate);
    // 이름표: NPC는 초록, 나는 노랑
    for (const n of npcs) {
      const s = toScreen(n.x, n.y - 48);
      if (s.x < -60 || s.x > W + 60 || s.y < -20 || s.y > H + 20) continue;
      nameTag(n.name, s.x, s.y - 4, "#b8ffd8", "rgba(10,40,30,0.75)");
      if (n === nearNpc && mode === "explore") { const tw = textW(n.name, 11, true) / 2 + 18; txt("대화", s.x + tw + keycap("Space", s.x + tw, s.y - 24) + 6, s.y - 20, 11, { bold: true, outline: "rgba(0,0,0,0.85)" }); }   // 가까이 가면 [Space] 대화 안내
    }
    const ps = toScreen(player.x, player.y - 48);
    nameTag(charName(player.key), ps.x, ps.y - 4, "#ffe27a", "rgba(60,40,10,0.78)");
    this.hud();
    if (mode === "dialogue" && dlg) drawDialogue(dlg);
    if (mode === "quiz") this.quizDraw();
  },
  // HUD = 게임 화면 위에 항상 떠 있는 정보
  hud() {
    const zname = zone ? (zone.id === "classroom" ? "교실 (퀴즈 존)" : zone.name) : "운동장";
    panel(16, 16, textW(zname, 22, true) + 56, 42, { fill: "rgba(20,22,50,0.86)", shadow: false });          // 왼쪽 위: 지금 있는 장소
    push(); noStroke(); fill("#ff6a6a"); ellipse(36, 34, 14); fill("#fff"); ellipse(36, 34, 5); pop();
    txt(zname, 52, 38, 22, { valign: CENTER, bold: true });
    const goal = AREAS.map((a) => !done[a] && SCRIPT.objective[a]).find(Boolean) || (quizDone ? SCRIPT.objective.done : SCRIPT.objective.quiz);   // 그 아래: 목표
    panel(16, 82, Math.min(640, textW(goal, 22) + 40), 42, { fill: "rgba(60,40,10,0.86)", border: "#ffd34a", shadow: false });
    txt(goal, 36, 104, 22, { valign: CENTER, color: "#ffe9a8" });
    // 위쪽 가운데: 진행 바 (1~5번 정거장, 끝낸 곳은 초록 체크)
    const [rx, ry, rw] = [W / 2 - 350, 16, 540], xs = STOPS.map((_, i) => rx + 50 + (i * (rw - 100)) / 4);
    panel(rx, ry, rw, 56, { fill: "rgba(20,22,50,0.86)", border: "#6a66c0", r: 12, shadow: false });
    STOPS.forEach(([id, label], i) => {
      const ok = id === "classroom" ? quizDone : done[id], here = zone?.id === id;
      push();
      if (i < 4) { stroke(done[id] ? "#4fd17a" : "#4a4a78"); strokeWeight(5); line(xs[i] + 14, ry + 22, xs[i + 1] - 14, ry + 22); }
      stroke(here ? "#ffe27a" : "#2a2a50"); strokeWeight(here ? 4 : 3); fill(ok ? "#4fd17a" : "#3a3a68"); ellipse(xs[i], ry + 22, 24);
      pop();
      if (ok) drawingContext.drawImage(IMG.ui.check, xs[i] - 8, ry + 14, 16, 16); else txt(i + 1, xs[i], ry + 23, 11, { align: CENTER, valign: CENTER, bold: true, color: "#c9c6ff" });
      txt(label, xs[i], ry + 40, 11, { align: CENTER, bold: here, color: here ? "#ffe27a" : "#d8d4ff" });
    });
    // 오른쪽 위: 미니맵 (흰 네모 = 지금 화면, 노란 점 = 나, 빨강/초록 점 = NPC)
    const [mx, my, k] = [W - mini.width - 22, 18, mini.width / (MAP.w * T)];
    panel(mx - 6, my - 6, mini.width + 12, mini.height + 12, { fill: "rgba(20,22,50,0.9)", border: "#6a66c0", bw: 3, r: 8, shadow: false });
    drawingContext.imageSmoothingEnabled = true; drawingContext.drawImage(mini, mx, my); drawingContext.imageSmoothingEnabled = false;
    push(); noFill(); stroke(255, 255, 255, 140); strokeWeight(1); rect(mx + cam.x * k, my + cam.y * k, VW * k, VH * k); noStroke();
    npcs.filter((n) => n.role !== "chat").forEach((n) => { fill(n.role === "quiz" ? "#ffb21f" : done[n.area] ? "#4fd17a" : "#ff6a6a"); rect(mx + n.x * k - 2, my + n.y * k - 2, 4, 4); });
    fill("#ffe27a"); stroke("#2a1a50"); ellipse(mx + player.x * k, my + player.y * k, 7);
    pop();
    if (button("설정", 1110, 212, 150, 36, { size: 22, ...GRAY }) && mode === "explore") showSettings(true);
    if (tm.cameraOn && tm.motion.model) txt(tm.motion.dir ? `동작: ${tm.motion.label}` : "동작: 정지", 20, 134, 11, { bold: true, color: "#9ad0ff" });   // 동작 인식 상태
    // 목표 NPC가 화면 밖이면 화면 가장자리에 방향 화살표
    const target = AREAS.map((a) => !done[a] && npcs.find((n) => n.id === SCRIPT.areas[a].npc)).find(Boolean) || (!quizDone && npcs.find((n) => n.id === SCRIPT.quiz.npc));
    const s = target && toScreen(target.x, target.y - 20);
    if (mode === "explore" && target && !(s.x > 60 && s.x < W - 60 && s.y > 130 && s.y < H - 60)) {
      const a = Math.atan2(s.y - H / 2, s.x - W / 2), ex = constrain(W / 2 + Math.cos(a) * 900, 60, W - 60), ey = constrain(H / 2 + Math.sin(a) * 900, 140, H - 60);
      push(); translate(ex, ey); rotate(a); stroke("#7a4a10"); strokeWeight(4); fill("#ffe14a"); triangle(24, 0, -14, -18, -14, 18); pop();
      txt(target.name, ex, ey + 30, 11, { align: CENTER, bold: true, color: "#ffe14a", outline: "rgba(0,0,0,0.85)", outlineW: 4 });
    }
    if (mode === "explore" && clock < 14) txt("WASD 이동  ·  Space 대화  ·  Esc 설정", W / 2, 690, 11, { align: CENTER, outline: "rgba(0,0,0,0.9)", outlineW: 4 });   // 처음 14초 동안 조작 힌트
    if (zoneT < 2.4 && mode === "explore") { push(); drawingContext.globalAlpha = Math.max(0, Math.min(1, zoneT / 0.3, (2.4 - zoneT) / 0.5)); txt(zname, W / 2, 170, 40, { align: CENTER, bold: true, outline: "#2a1a50", outlineW: 8 }); pop(); }   // 새 장소에 들어서면 큰 글씨로
  },

  // 퀴즈 창 (정답은 초록, 내가 고른 오답은 빨강)
  quizDraw() {
    dim(0.55);
    const [x, y, w, h] = [110, 36, 1060, 648], Q = quiz, q = QUIZ[Q.i];
    panel(x, y, w, h, { fill: "rgba(24,26,58,0.98)", border: "#ffe27a", r: 18 });
    if (Q.state === "result") return this.resultDraw(x, y, w, h);
    txt(`퀴즈 ${Q.i + 1} / ${QUIZ.length}`, x + 40, y + 28, 22, { bold: true, color: "#ffe27a" });
    QUIZ.forEach((_, i) => { push(); stroke("#2a2a50"); strokeWeight(3); fill(i < Q.results.length ? (Q.results[i] ? "#4fd17a" : "#ff6a6a") : i === Q.i ? "#ffe27a" : "#3a3a68"); ellipse(x + w - 60 - (QUIZ.length - 1 - i) * 30, y + 40, 20); pop(); });   // 진행 점
    const qLines = wrapText(q.q, w - 100, 30, true);
    qLines.forEach((l, i) => txt(l, x + 50, y + 76 + i * 42, 30, { bold: true }));
    q.choices.forEach((choice, i) => {
      const by = y + 76 + qLines.length * 42 + 20 + i * 74, on = hover(x + 50, by, w - 100, 62) && Q.state === "ask";
      let fillC = "rgba(60,62,120,0.9)", border = "#6a66c0";
      if (Q.state === "ask" && (on || Q.sel === i)) [fillC, border] = ["rgba(110,100,190,0.95)", "#ffe27a"];
      if (Q.state === "feedback") [fillC, border] = i === q.answer ? ["rgba(40,120,70,0.95)", "#8affb0"] : i === Q.picked ? ["rgba(150,50,60,0.95)", "#ff9aa8"] : ["rgba(40,42,80,0.7)", "#3a3a68"];
      panel(x + 50, by, w - 100, 62, { fill: fillC, border, r: 12, bw: 3, shadow: false });
      push(); noStroke(); fill(Q.state === "feedback" && i === q.answer ? "#4fd17a" : "#ffe27a"); ellipse(x + 92, by + 31, 40); pop();
      txt(i + 1, x + 92, by + 32, 22, { align: CENTER, valign: CENTER, bold: true, color: "#3a2a08" });
      txt(choice, x + 130, by + 32, 22, { valign: CENTER });
      if (Q.state === "feedback" && i === q.answer) txt("정답!", x + w - 80, by + 32, 22, { align: RIGHT, valign: CENTER, bold: true, color: "#b8ffd0" });
      if (on) { cursor("pointer"); if (clicked(x + 50, by, w - 100, 62)) this.pick(i); }   // 클릭해서 고르기
    });
    if (Q.state === "ask") txt("1~4 번호 · ↑↓ + Space · 클릭으로 골라요", x + w / 2, y + h - 34, 11, { align: CENTER, color: "rgba(255,255,255,0.6)" });
    else {   // 정답 확인 단계: 해설과 [다음 문제] 버튼
      const ok = Q.results[Q.results.length - 1], fy = y + h - 108;
      txt(ok ? "정답이에요!" : "아쉬워요! 다시 기억해 봐요", x + 50, fy, 30, { bold: true, color: ok ? "#8affb0" : "#ffb0b8" });
      wrapText(q.explain || "", w - 360, 22).slice(0, 2).forEach((l, i) => txt(l, x + 50, fy + 44 + i * 30, 22, { color: "#e8e4ff" }));
      if (button(Q.i === QUIZ.length - 1 ? "결과 보기" : "다음 문제", x + w - 250, fy + 6, 200, 60, { size: 24 }) && Q.t > 0.3) this.next();
    }
  },
  // 결과 화면: 점수, 별, 응원 문구, 버튼 3개
  resultDraw(x, y, w, h) {
    const ratio = quiz.score / QUIZ.length, stars = ratio >= 1 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;   // 만점이면 별 3개, 60% 이상 2개, 하나라도 맞히면 1개
    txt("퀴즈 결과", x + w / 2, y + 36, 36, { align: CENTER, bold: true, color: "#ffe27a" });
    txt(`${quiz.score} / ${QUIZ.length}`, x + w / 2, y + 120, 96, { align: CENTER, bold: true, outline: "#2a1a50", outlineW: 10 });
    for (let i = 0; i < 3; i++) { drawingContext.globalAlpha = i < stars ? 1 : 0.25; drawingContext.drawImage(IMG.ui.star, x + w / 2 - 152 + i * 80, y + 238 + (i < stars ? Math.sin(clock * 4 + i) * 4 : 0), 64, 64); }
    drawingContext.globalAlpha = 1;
    txt(ratio >= 1 ? "만점이에요! 우리 학교 박사님이네요!" : ratio >= 0.6 ? "잘했어요! 우리 학교를 잘 알고 있어요." : "소개를 다시 한 번 들어 보고 도전해 봐요!", x + w / 2, y + 340, 30, { align: CENTER, bold: true });   // 응원 문구 (바꿔도 돼요)
    if (best != null) txt(`내 최고 점수  ${best} / ${QUIZ.length}`, x + w / 2, y + 400, 22, { align: CENTER, color: "#ffe27a" });
    const by = y + h - 130;
    if (button("다시 풀기", x + 90, by, 270, 70, { size: 26 })) { quiz = { i: 0, score: 0, state: "ask", sel: 0, picked: -1, results: [], t: 0 }; sfx("select"); }
    if (button("계속 둘러보기", x + 395, by, 270, 70, { size: 26, ...BLUE })) this.closeQuiz();
    if (button("처음으로", x + 700, by, 270, 70, { size: 26, ...PINK })) goTo("title");
  },
};


// =====================================================================
//  7. p5.js 시작점
// =====================================================================
function setup() {
  createCanvas(W, H).parent("game");   // 1280 x 720 그림판을 index.html 의 <div id="game"> 안에 만들어요
  pixelDensity(1);
  noSmooth();                          // 그림을 확대해도 흐려지지 않게 (픽셀아트!)
  frameRate(60);
  goTo("boot");                        // 불러오기 화면부터 시작
}

function draw() {
  const dt = Math.min(deltaTime / 1000, 0.05);   // 지난 프레임 이후 흐른 시간(초). 컴퓨터가 느려도 속도가 같도록 곱해 줘요
  clock += dt;
  cursor("default");
  drawingContext.imageSmoothingEnabled = false;
  if (was("KeyM")) muted = !muted;
  if (!settingsOpen) scenes[scene].update(dt);   // 1) 움직이기  (설정 창이 열려 있으면 멈춰요)
  scenes[scene].draw();                          // 2) 그리기
  if (scene === "game") drawToasts(dt);
  drawSettings();
  pressed = {}; click = null; motion.nav = 0; motion.action = false;   // 3) 이번 프레임에만 유효한 입력 지우기
}

function mousePressed() { click = { x: mouseX, y: mouseY }; startAudio(); return false; }   // 마우스를 누르면 p5.js 가 자동으로 불러줘요
function keyPressed() { if ([32, 37, 38, 39, 40].includes(keyCode)) return false; }          // 스페이스/방향키로 페이지가 움직이지 않게

// =====================================================================
//  맵 데이터  (자동으로 만들어진 부분이에요. 고치지 마세요)
//  방 모양, 가구·NPC 위치, 문, 그리고 묶음 그림 안의 그림 위치가 들어 있어요.
// =====================================================================
function MAEHOL_DATA() {
  return {
    map: {
      tile: 32,
      w: 70,
      h: 82,
      spawn: {"x":8,"y":46},
      order: ["playground","cafeteria","gym","library"],
      collision: [
        "1111111111111111111111111111111111111111111111111111111111111111111111",
        "1111111111111111111111111111111111111111111111111111111111111111111111",
        "1111111111111111111111111111111111111111111111111111111111111111111111",
        "1111111111111111111000000000000000111111111111000110000000000111111111",
        "1100000000000000000000000000000000111111111111000000011000000011111111",
        "1100000000000000000111101111011110111111111111011100000000000011111111",
        "1100000000000000000111101111011110111111111111000000000000000100001011",
        "1100000000000000000111101111011110111111111111000000000000000000000011",
        "1100000000000000000111101111011110111111111111011100000000000000000011",
        "1100000000000000000111101111011110000100100001000000000000000000000011",
        "1100000000000000000111101111011110000000000000000000000000000000000011",
        "1100000000000000000111101111011110000000000000000000000000000000000011",
        "1100000000000000000111101111011110000000000000000000000000000000000011",
        "1100000000000000000000000000000000000000000000000000000000000000000011",
        "1100000000000000000000000000000000001110001111000000000000000000000011",
        "1100000000000000000000000000000000111111111111010000000000000000000011",
        "1100000000000000000000000000000000111111111111000000000000000000000011",
        "1110000001100000000001000000000001111111111111010000000000000000000011",
        "1111111111110000000011111111111111111111111111000000000000000000001011",
        "1111111111111000000111111111111111111111111111111111111111000000001111",
        "1111111111110000000011111111111111111111111111111111111111100000011111",
        "1111111111110000000011111111111111111111111111111111111111000000001111",
        "1111111111110000000011111111111111111111111111111111111111000000001111",
        "1111111111110000000011111111111111111111111111111111111111000000001111",
        "1111111111111000000111111111111111111111111111111111111111000000001111",
        "1111111111110000000011111111111111111111111111111111111111100000111111",
        "1111111111110000000011111111111111111111111111111111111111000000001111",
        "1111111111110000011111111111111111111111111111111111111111000000001111",
        "1111111111110000000011111111111111111111111111111111111111000001111111",
        "1111111111110000000011111111111111111111111111111111111111000000001111",
        "1111111111111000000111111111111111111111111111111111111111000000001111",
        "1111111111110000000011111111111111111111111111111111111111100000011111",
        "1111111111111000000111111111111111111111111111111111111111000000001111",
        "1111111111111000000111111111111111111111111111011111100011000000001111",
        "1111111111111000000111111111111111111111111111010101000000000000001111",
        "1100000000001000000100100000001111111111111111000000011111000000001111",
        "1100000001000000000000000000001111111111111111000000011111000000001111",
        "1111110011110011110011110011111111111111111111001111110000000000011111",
        "1111110011110011110011110011111111111111111111001111110000000000001111",
        "1111110011110011110011110011111111111111111111001111110000001111001111",
        "1100000000000000000000000000001111111111111111001111111111001111001111",
        "1100000000000011110000000000001111111111111111000000001111001111001111",
        "1100111000000000000000000000001111111111111111000000001111001111001111",
        "1100000000000000000000000000001111111111111111000000001111001111001111",
        "1111000000000000000000000001101111111111111111000000000000000000001111",
        "1100000000100000000001000000001111111111111111011100001000000000001111",
        "1100000000000000000000000000001111111111111111000000000000011111101111",
        "1100000000000000000000000000001111111111111111000000000000000000001111",
        "1100000000000000000000000000001111111111111111100000000000000000001111",
        "1111000000100000000001000001101111111111111111100000000111111111111111",
        "1100000000000011110000000000001111111111111111110000001111111111111111",
        "1100001111110000000011111100001111111111111111100000000111111111111111",
        "1111111111111111111111111111111111111111111111100000000111111111111111",
        "1111111111111111111111111111111111111111111111100000000111111111111111",
        "1111111111111111111111111111111111111111111111100000000111111111111111",
        "1111111111111111111111111111111111111111111111110000001111111111111111",
        "1111111111111111111111111111111111111111111111100000000111111111111111",
        "1111111111111111111111111111111111111111111111100000000111111111111111",
        "1111111111111111111111111111111111111111111111100000111111111111111111",
        "1111111111111111111111111111111111111111111111100000000111111111111111",
        "1111111111111111111111111111111111111111111111100000000111111111111111",
        "1111111111111111111111111111111111111111111111110000001111111111111111",
        "1111111111111111111111111111111111111111111111100000000111111111111111",
        "1111111111111111111111111111111111111111111111000000000111111111111111",
        "1111111111111111111111111111111111111111111111000000000000000000001111",
        "1111111111111111111111111111111111111111111111000000000001100000001111",
        "1111111111111111111111111111111111111111111111000000001101101101101111",
        "1111111111111111111111111111111111111111111111000000001101101101101111",
        "1111111111111111111111111111111111111111111111000000001101101101101111",
        "1111111111111111111111111111111111111111111111000000001101101101101111",
        "1111111111111111111111111111111111111111111111000000000000000000001111",
        "1111111111111111111111111111111111111111111111000000000000000000001111",
        "1111111111111111111111111111111111111111111111000000000000000000001111",
        "1111111111111111111111111111111111111111111111000000000000000000001111",
        "1111111111111111111111111111111111111111111111000000000000000000001111",
        "1111111111111111111111111111111111111111111111000000001101101101101111",
        "1111111111111111111111111111111111111111111111000000001101101101101111",
        "1111111111111111111111111111111111111111111111000000001101101101101111",
        "1111111111111111111111111111111111111111111111100000001101101101101111",
        "1111111111111111111111111111111111111111111111111111111111111111111111",
        "1111111111111111111111111111111111111111111111111111111111111111111111",
        "1111111111111111111111111111111111111111111111111111111111111111111111"
      ],
      objects: [
        {"n":"lintel_6","x":13,"y":32},
        {"n":"stand_4x3","x":2,"y":37},
        {"n":"stand_4x3","x":8,"y":37},
        {"n":"stand_4x3","x":20,"y":37},
        {"n":"stand_4x3","x":26,"y":37},
        {"n":"podium_4x3","x":14,"y":37},
        {"n":"plant","x":12,"y":35},
        {"n":"plant","x":19,"y":35},
        {"n":"flagpole","x":9,"y":36},
        {"n":"extinguisher","x":22,"y":35},
        {"n":"signstone","x":4,"y":42},
        {"n":"tree","x":2,"y":44},
        {"n":"tree","x":27,"y":44},
        {"n":"tree","x":2,"y":49},
        {"n":"tree","x":27,"y":49},
        {"n":"goal_4","x":14,"y":41},
        {"n":"goal_4","x":14,"y":50},
        {"n":"bench_3","x":6,"y":51},
        {"n":"bench_3","x":20,"y":51},
        {"n":"bush_3","x":9,"y":51},
        {"n":"bush_3","x":23,"y":51},
        {"n":"cone","x":10,"y":45},
        {"n":"cone","x":10,"y":49},
        {"n":"cone","x":21,"y":45},
        {"n":"cone","x":21,"y":49},
        {"n":"ball","x":13,"y":46},
        {"n":"ball","x":17,"y":48},
        {"n":"ball","x":8,"y":47},
        {"n":"steel_14","x":4,"y":3},
        {"n":"dispenser","x":2,"y":3},
        {"n":"glasscab","x":3,"y":3},
        {"n":"fridge","x":18,"y":3},
        {"n":"ctable_8_cream","x":19,"y":5},
        {"n":"ctable_8_mint","x":24,"y":5},
        {"n":"ctable_8_peach","x":29,"y":5},
        {"n":"plant","x":2,"y":17},
        {"n":"trash","x":33,"y":17},
        {"n":"bin","x":9,"y":17},
        {"n":"trash","x":10,"y":17},
        {"n":"plant","x":21,"y":17},
        {"n":"extinguisher","x":12,"y":19},
        {"n":"plant","x":19,"y":19},
        {"n":"posterstand","x":12,"y":24},
        {"n":"bench_3","x":17,"y":27},
        {"n":"purifier","x":19,"y":24},
        {"n":"plant","x":12,"y":30},
        {"n":"bin","x":19,"y":30},
        {"n":"extinguisher","x":58,"y":20},
        {"n":"plant","x":65,"y":20},
        {"n":"posterstand","x":58,"y":25},
        {"n":"bench_3","x":63,"y":28},
        {"n":"trophy_2","x":64,"y":25},
        {"n":"plant","x":58,"y":31},
        {"n":"bin","x":65,"y":31},
        {"n":"extinguisher","x":47,"y":50},
        {"n":"plant","x":54,"y":50},
        {"n":"posterstand","x":47,"y":55},
        {"n":"bench_3","x":52,"y":58},
        {"n":"purifier","x":54,"y":55},
        {"n":"plant","x":47,"y":61},
        {"n":"bin","x":54,"y":61},
        {"n":"purifier","x":37,"y":9},
        {"n":"plant","x":40,"y":9},
        {"n":"extinguisher","x":45,"y":9},
        {"n":"bench_3","x":36,"y":14},
        {"n":"bench_3","x":42,"y":14},
        {"n":"plant","x":45,"y":14},
        {"n":"stage_6x3","x":62,"y":3},
        {"n":"hoop","x":53,"y":4},
        {"n":"speaker","x":61,"y":3},
        {"n":"speaker","x":61,"y":6},
        {"n":"flagstand","x":66,"y":6},
        {"n":"bench_3","x":47,"y":5},
        {"n":"bench_3","x":47,"y":8},
        {"n":"ballcart","x":47,"y":15},
        {"n":"ballcart","x":47,"y":17},
        {"n":"mat_red","x":63,"y":10},
        {"n":"mat_blue","x":65,"y":10},
        {"n":"mat_blue","x":63,"y":12},
        {"n":"trophy_2","x":49,"y":3},
        {"n":"ball","x":56,"y":8},
        {"n":"ball","x":51,"y":14},
        {"n":"plant","x":66,"y":18},
        {"n":"wshelf_2","x":56,"y":33},
        {"n":"barcounter_6","x":47,"y":33},
        {"n":"stool","x":47,"y":34},
        {"n":"stool","x":49,"y":34},
        {"n":"stool","x":51,"y":34},
        {"n":"nook","x":53,"y":35},
        {"n":"libcounter_4","x":60,"y":39},
        {"n":"otable_6x2","x":48,"y":38},
        {"n":"chair_wht_s","x":48,"y":37},
        {"n":"chair_blk_n","x":48,"y":40},
        {"n":"chair_blk_s","x":49,"y":37},
        {"n":"chair_wht_n","x":49,"y":40},
        {"n":"chair_wht_s","x":50,"y":37},
        {"n":"chair_blk_n","x":50,"y":40},
        {"n":"chair_blk_s","x":51,"y":37},
        {"n":"chair_wht_n","x":51,"y":40},
        {"n":"chair_wht_s","x":52,"y":37},
        {"n":"chair_blk_n","x":52,"y":40},
        {"n":"chair_blk_s","x":53,"y":37},
        {"n":"chair_wht_n","x":53,"y":40},
        {"n":"wshelf_3","x":59,"y":46},
        {"n":"wshelf_3","x":62,"y":46},
        {"n":"benchc_3","x":47,"y":45},
        {"n":"bookcart","x":54,"y":45},
        {"n":"otable_4x2","x":54,"y":41},
        {"n":"chair_wht_s","x":54,"y":40},
        {"n":"chair_blk_n","x":54,"y":43},
        {"n":"chair_blk_s","x":55,"y":40},
        {"n":"chair_wht_n","x":55,"y":43},
        {"n":"chair_wht_s","x":56,"y":40},
        {"n":"chair_blk_n","x":56,"y":43},
        {"n":"chair_blk_s","x":57,"y":40},
        {"n":"chair_wht_n","x":57,"y":43},
        {"n":"otable_4x2","x":60,"y":41},
        {"n":"chair_blk_s","x":60,"y":40},
        {"n":"chair_wht_n","x":60,"y":43},
        {"n":"chair_wht_s","x":61,"y":40},
        {"n":"chair_blk_n","x":61,"y":43},
        {"n":"chair_blk_s","x":62,"y":40},
        {"n":"chair_wht_n","x":62,"y":43},
        {"n":"chair_wht_s","x":63,"y":40},
        {"n":"chair_blk_n","x":63,"y":43},
        {"n":"plant","x":46,"y":48},
        {"n":"plant","x":65,"y":37},
        {"n":"cubby_x","x":55,"y":63},
        {"n":"lockerbank_6","x":57,"y":63},
        {"n":"tabcart","x":63,"y":63},
        {"n":"ac","x":64,"y":63},
        {"n":"bin","x":65,"y":63},
        {"n":"tdesk","x":57,"y":65},
        {"n":"desk","x":54,"y":66},
        {"n":"chair_mnt_n","x":54,"y":67},
        {"n":"desk_book","x":55,"y":66},
        {"n":"chair_grn_n","x":55,"y":67},
        {"n":"desk","x":57,"y":66},
        {"n":"chair_blu_n","x":57,"y":67},
        {"n":"desk_book","x":58,"y":66},
        {"n":"chair_pnk_n","x":58,"y":67},
        {"n":"desk","x":60,"y":66},
        {"n":"chair_grn_n","x":60,"y":67},
        {"n":"desk_book","x":61,"y":66},
        {"n":"chair_yel_n","x":61,"y":67},
        {"n":"desk","x":63,"y":66},
        {"n":"chair_pnk_n","x":63,"y":67},
        {"n":"desk_book","x":64,"y":66},
        {"n":"chair_mnt_n","x":64,"y":67},
        {"n":"desk_pencil","x":54,"y":68},
        {"n":"chair_grn_n","x":54,"y":69},
        {"n":"desk","x":55,"y":68},
        {"n":"chair_yel_n","x":55,"y":69},
        {"n":"desk","x":57,"y":68},
        {"n":"chair_pnk_n","x":57,"y":69},
        {"n":"desk","x":58,"y":68},
        {"n":"chair_mnt_n","x":58,"y":69},
        {"n":"desk","x":60,"y":68},
        {"n":"chair_yel_n","x":60,"y":69},
        {"n":"desk","x":61,"y":68},
        {"n":"chair_blu_n","x":61,"y":69},
        {"n":"desk","x":63,"y":68},
        {"n":"chair_mnt_n","x":63,"y":69},
        {"n":"desk_pencil","x":64,"y":68},
        {"n":"chair_grn_n","x":64,"y":69},
        {"n":"desk","x":54,"y":75},
        {"n":"chair_pnk_n","x":54,"y":76},
        {"n":"desk_book","x":55,"y":75},
        {"n":"chair_mnt_n","x":55,"y":76},
        {"n":"desk_pencil","x":57,"y":75},
        {"n":"chair_yel_n","x":57,"y":76},
        {"n":"desk_book","x":58,"y":75},
        {"n":"chair_blu_n","x":58,"y":76},
        {"n":"desk","x":60,"y":75},
        {"n":"chair_mnt_n","x":60,"y":76},
        {"n":"desk_book","x":61,"y":75},
        {"n":"chair_grn_n","x":61,"y":76},
        {"n":"desk","x":63,"y":75},
        {"n":"chair_blu_n","x":63,"y":76},
        {"n":"desk_book","x":64,"y":75},
        {"n":"chair_pnk_n","x":64,"y":76},
        {"n":"desk","x":54,"y":77},
        {"n":"chair_mnt_n","x":54,"y":78},
        {"n":"desk_pencil","x":55,"y":77},
        {"n":"chair_grn_n","x":55,"y":78},
        {"n":"desk","x":57,"y":77},
        {"n":"chair_blu_n","x":57,"y":78},
        {"n":"desk","x":58,"y":77},
        {"n":"chair_pnk_n","x":58,"y":78},
        {"n":"desk_pencil","x":60,"y":77},
        {"n":"chair_grn_n","x":60,"y":78},
        {"n":"desk","x":61,"y":77},
        {"n":"chair_yel_n","x":61,"y":78},
        {"n":"desk","x":63,"y":77},
        {"n":"chair_pnk_n","x":63,"y":78},
        {"n":"desk","x":64,"y":77},
        {"n":"chair_mnt_n","x":64,"y":78},
        {"n":"backpack_gr","x":56,"y":68},
        {"n":"backpack_bl","x":59,"y":69},
        {"n":"backpack_pk","x":62,"y":67},
        {"n":"backpack_gy","x":65,"y":76},
        {"n":"trash","x":46,"y":78}
      ],
      decor: [
        {"n":"window_2_glass","x":96,"y":1056},
        {"n":"window_2_glass","x":192,"y":1056},
        {"n":"window_2_glass","x":288,"y":1056},
        {"n":"window_2_glass","x":672,"y":1056},
        {"n":"window_2_glass","x":768,"y":1056},
        {"n":"window_2_glass","x":864,"y":1056},
        {"n":"flagwall","x":350,"y":1070},
        {"n":"stairs_2x3","x":192,"y":1184},
        {"n":"stairs_2x3","x":384,"y":1184},
        {"n":"stairs_2x3","x":576,"y":1184},
        {"n":"stairs_2x3","x":768,"y":1184},
        {"n":"window_3_field","x":640,"y":32},
        {"n":"window_3_field","x":768,"y":32},
        {"n":"window_3_field","x":896,"y":32},
        {"n":"poster_water","x":66,"y":39},
        {"n":"poster_gupsik","x":993,"y":40},
        {"n":"kitchen_14","x":128,"y":32},
        {"n":"doorclass_1-1","x":1120,"y":224},
        {"n":"bulletin_2","x":1216,"y":236},
        {"n":"clock","x":1282,"y":233},
        {"n":"doorclass_2-1","x":1312,"y":224},
        {"n":"doorclass_3-1","x":1408,"y":224},
        {"n":"signhang_급식실_7a6ac0","x":1090,"y":249},
        {"n":"signhang_체육관_3f8a5a","x":1378,"y":249},
        {"n":"banner_매홀중학교~체육관_8","x":1472,"y":5},
        {"n":"truss_8","x":1920,"y":6},
        {"n":"window_3_field","x":1472,"y":32},
        {"n":"window_3_field","x":1600,"y":32},
        {"n":"window_2_field","x":1920,"y":32},
        {"n":"curtain_6","x":1984,"y":32},
        {"n":"window_3_blind","x":1504,"y":992},
        {"n":"window_3_blind","x":1600,"y":992},
        {"n":"poster_libguide","x":1696,"y":1003},
        {"n":"flagwall","x":1762,"y":1964},
        {"n":"blackboard_6_퀴즈~시간!_steel","x":1824,"y":1942},
        {"n":"window_2_blind","x":2048,"y":1952}
      ],
      npcs: [
        {"id":"haneul","name":"하늘","spr":"haneul","x":16,"y":36,"dir":"down","area":"playground","role":"guide"},
        {"id":"doyun","name":"도윤","spr":"doyun","x":9,"y":7,"dir":"down","area":"cafeteria","role":"guide"},
        {"id":"seoyeon","name":"서연","spr":"seoyeon","x":55,"y":11,"dir":"down","area":"gym","role":"guide"},
        {"id":"jiu","name":"지우","spr":"jiu","x":61,"y":38,"dir":"down","area":"library","role":"guide"},
        {"id":"banjang","name":"반장","spr":"banjang","x":56,"y":72,"dir":"down","area":"classroom","role":"quiz"},
        {"id":"walker1","name":"민준","spr":"extra_a","x":15,"y":24,"dir":"down","area":"c1","role":"chat"},
        {"id":"walker2","name":"채원","spr":"extra_b","x":40,"y":11,"dir":"left","area":"c2","role":"chat"},
        {"id":"walker3","name":"서진","spr":"extra_c","x":61,"y":25,"dir":"down","area":"c3","role":"chat"},
        {"id":"walker4","name":"다은","spr":"extra_d","x":50,"y":55,"dir":"down","area":"c4","role":"chat"}
      ],
      gates: [
        {"id":"A","o":"h","x":13,"y":33,"size":6,"requires":["playground"],"label":"운동장 소개를 끝내면 본관 입구가 열려요"},
        {"id":"C","o":"v","x":34,"y":9,"size":6,"requires":["cafeteria"],"label":"급식실 소개를 끝내면 열려요"},
        {"id":"E","o":"h","x":58,"y":19,"size":8,"requires":["gym"],"label":"체육관 소개를 끝내면 열려요"},
        {"id":"G","o":"h","x":47,"y":49,"size":8,"requires":["library"],"label":"도서관 소개를 끝내면 열려요"},
        {"id":"H","o":"h","x":47,"y":62,"size":8,"requires":["playground","cafeteria","gym","library"],"label":"소개를 모두 끝내야 퀴즈 존에 들어가요"}
      ],
      zones: [
        {"id":"playground","name":"운동장","x":2,"y":35,"w":28,"h":17},
        {"id":"c1","name":"복도","x":12,"y":18,"w":8,"h":14},
        {"id":"cafeteria","name":"급식실","x":2,"y":3,"w":32,"h":15},
        {"id":"c2","name":"복도","x":34,"y":9,"w":12,"h":6},
        {"id":"gym","name":"체육관","x":46,"y":3,"w":22,"h":16},
        {"id":"c3","name":"복도","x":58,"y":19,"w":8,"h":14},
        {"id":"library","name":"도서관","x":46,"y":33,"w":20,"h":16},
        {"id":"c4","name":"복도","x":47,"y":49,"w":8,"h":14},
        {"id":"classroom","name":"교실","x":46,"y":63,"w":20,"h":16}
      ]
    },
    assets: {
      files: {"map":"map.png","title":"title.png"},
      sprites: {"donghun":{},"minseong":{},"seongmin":{},"haneul":{},"doyun":{},"seoyeon":{},"jiu":{},"banjang":{},"extra_a":{},"extra_b":{},"extra_c":{},"extra_d":{}},
      title: true,
      ui: ["bubble_exclaim","bubble_talk","check","lock","star","ring","arrow_down"],
      atlas: {
        file: "atlas.png",
        rects: {
          "ctable_8_cream": [0,0,128,265],
          "ctable_8_mint": [129,0,128,265],
          "ctable_8_peach": [258,0,128,265],
          "gate_v6_closed": [387,0,32,192],
          "gate_v6_open": [420,0,32,192],
          "spr:donghun": [453,0,90,184],
          "spr:minseong": [544,0,90,184],
          "spr:seongmin": [635,0,90,184],
          "spr:haneul": [726,0,90,184],
          "spr:doyun": [817,0,90,184],
          "spr:seoyeon": [908,0,90,184],
          "spr:jiu": [0,266,90,184],
          "spr:banjang": [91,266,90,184],
          "spr:extra_a": [182,266,90,184],
          "spr:extra_b": [273,266,90,184],
          "spr:extra_c": [364,266,90,184],
          "spr:extra_d": [455,266,90,184],
          "stand_4x3": [546,266,128,141],
          "flagpole": [675,266,32,133],
          "podium_4x3": [708,266,128,115],
          "hoop": [837,266,64,113],
          "tree": [902,266,64,103],
          "stage_6x3": [0,451,192,99],
          "nook": [193,451,160,98],
          "stairs_2x3": [354,451,64,96],
          "wshelf_2": [419,451,64,71],
          "wshelf_3": [484,451,96,71],
          "flagstand": [581,451,32,69],
          "otable_4x2": [614,451,128,67],
          "otable_6x2": [743,451,192,67],
          "curtain_6": [0,551,192,64],
          "doorclass_1-1": [193,551,64,64],
          "doorclass_2-1": [258,551,64,64],
          "doorclass_3-1": [323,551,64,64],
          "kitchen_14": [388,551,448,64],
          "window_2_blind": [837,551,64,64],
          "window_2_field": [902,551,64,64],
          "window_2_glass": [0,616,64,64],
          "window_3_blind": [65,616,96,64],
          "window_3_field": [162,616,96,64],
          "ac": [259,616,32,63],
          "fridge": [292,616,32,63],
          "glasscab": [325,616,32,63],
          "lockerbank_6": [358,616,192,63],
          "posterstand": [551,616,32,62],
          "goal_4": [584,616,128,61],
          "purifier": [713,616,32,59],
          "blackboard_6_퀴즈~시간!_steel": [746,616,192,58],
          "trophy_2": [939,616,64,57],
          "speaker": [0,681,32,55],
          "cubby_x": [33,681,64,53],
          "dispenser": [98,681,32,53],
          "tabcart": [131,681,32,53],
          "plant": [164,681,32,52],
          "libcounter_4": [197,681,128,51],
          "poster_gupsik": [326,681,56,50],
          "poster_libguide": [383,681,86,50],
          "poster_water": [470,681,43,50],
          "steel_14": [514,681,448,49],
          "ballcart": [963,681,32,48],
          "bookcart": [0,737,32,44],
          "bulletin_2": [33,737,64,44],
          "barcounter_6": [98,737,192,41],
          "signstone": [291,737,96,41],
          "tdesk": [388,737,64,41],
          "chair_blk_n": [453,737,32,35],
          "chair_blk_s": [486,737,32,35],
          "chair_blu_n": [519,737,32,35],
          "chair_grn_n": [552,737,32,35],
          "chair_mnt_n": [585,737,32,35],
          "chair_pnk_n": [618,737,32,35],
          "chair_wht_n": [651,737,32,35],
          "chair_wht_s": [684,737,32,35],
          "chair_yel_n": [717,737,32,35],
          "desk": [750,737,32,35],
          "desk_book": [783,737,32,35],
          "desk_pencil": [816,737,32,35],
          "stool": [849,737,32,35],
          "extinguisher": [882,737,32,34],
          "bush_3": [915,737,96,33],
          "lintel_6": [0,782,192,33],
          "flagwall": [193,782,40,32],
          "gate_h6_closed": [234,782,192,32],
          "gate_h6_open": [427,782,192,32],
          "gate_h8_closed": [620,782,256,32],
          "gate_h8_open": [0,816,256,32],
          "mat_blue": [257,816,64,32],
          "mat_red": [322,816,64,32],
          "trash": [387,816,32,31],
          "bench_3": [420,816,96,29],
          "benchc_3": [517,816,96,29],
          "bin": [614,816,32,29],
          "backpack_bl": [647,816,32,28],
          "backpack_gr": [680,816,32,28],
          "backpack_gy": [713,816,32,28],
          "backpack_pk": [746,816,32,28],
          "banner_매홀중학교~체육관_8": [0,849,256,28],
          "clock": [257,849,28,28],
          "cone": [286,849,32,28],
          "truss_8": [319,849,256,20],
          "ui:bubble_exclaim": [576,849,18,20],
          "ui:bubble_talk": [595,849,18,20],
          "signhang_급식실_7a6ac0": [614,849,47,19],
          "signhang_체육관_3f8a5a": [662,849,47,19],
          "ball": [710,849,32,18],
          "ui:lock": [743,849,16,18],
          "ui:check": [760,849,16,16],
          "ui:star": [777,849,16,16],
          "ui:ring": [794,849,36,16],
          "ui:arrow_down": [831,849,16,14]
        }
      },
      objects: {
        "ac": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":63},
        "backpack_bl": {"w":1,"d":1,"pad":3,"solid":false,"decor":false,"pw":32,"ph":28},
        "backpack_gr": {"w":1,"d":1,"pad":3,"solid":false,"decor":false,"pw":32,"ph":28},
        "backpack_gy": {"w":1,"d":1,"pad":3,"solid":false,"decor":false,"pw":32,"ph":28},
        "backpack_pk": {"w":1,"d":1,"pad":3,"solid":false,"decor":false,"pw":32,"ph":28},
        "ball": {"w":1,"d":1,"pad":3,"solid":false,"decor":false,"pw":32,"ph":18},
        "ballcart": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":48},
        "banner_매홀중학교~체육관_8": {"w":8,"d":0.875,"pad":0,"solid":false,"decor":true,"pw":256,"ph":28},
        "barcounter_6": {"w":6,"d":1,"pad":3,"solid":true,"decor":false,"pw":192,"ph":41},
        "bench_3": {"w":3,"d":1,"pad":3,"solid":true,"decor":false,"pw":96,"ph":29},
        "benchc_3": {"w":3,"d":1,"pad":3,"solid":true,"decor":false,"pw":96,"ph":29},
        "bin": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":29},
        "blackboard_6_퀴즈~시간!_steel": {"w":6,"d":2,"pad":0,"solid":false,"decor":true,"pw":192,"ph":58},
        "bookcart": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":44},
        "bulletin_2": {"w":2,"d":1.375,"pad":0,"solid":false,"decor":true,"pw":64,"ph":44},
        "bush_3": {"w":3,"d":1,"pad":3,"solid":true,"decor":false,"pw":96,"ph":33},
        "chair_blk_n": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":35},
        "chair_blk_s": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":35},
        "chair_blu_n": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":35},
        "chair_grn_n": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":35},
        "chair_mnt_n": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":35},
        "chair_pnk_n": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":35},
        "chair_wht_n": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":35},
        "chair_wht_s": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":35},
        "chair_yel_n": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":35},
        "clock": {"w":0.875,"d":0.875,"pad":0,"solid":false,"decor":true,"pw":28,"ph":28},
        "cone": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":28},
        "ctable_8_cream": {"w":4,"d":8,"pad":3,"solid":true,"decor":false,"pw":128,"ph":265},
        "ctable_8_mint": {"w":4,"d":8,"pad":3,"solid":true,"decor":false,"pw":128,"ph":265},
        "ctable_8_peach": {"w":4,"d":8,"pad":3,"solid":true,"decor":false,"pw":128,"ph":265},
        "cubby_x": {"w":2,"d":1,"pad":3,"solid":true,"decor":false,"pw":64,"ph":53},
        "curtain_6": {"w":6,"d":2,"pad":0,"solid":false,"decor":true,"pw":192,"ph":64},
        "desk": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":35},
        "desk_book": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":35},
        "desk_pencil": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":35},
        "dispenser": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":53},
        "doorclass_1-1": {"w":2,"d":2,"pad":0,"solid":false,"decor":true,"pw":64,"ph":64},
        "doorclass_2-1": {"w":2,"d":2,"pad":0,"solid":false,"decor":true,"pw":64,"ph":64},
        "doorclass_3-1": {"w":2,"d":2,"pad":0,"solid":false,"decor":true,"pw":64,"ph":64},
        "extinguisher": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":34},
        "flagpole": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":133},
        "flagstand": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":69},
        "flagwall": {"w":1.25,"d":1,"pad":0,"solid":false,"decor":true,"pw":40,"ph":32},
        "fridge": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":63},
        "gate_h6_closed": {"w":6.0,"d":1.0,"pad":0,"solid":false,"decor":true,"pw":192,"ph":32},
        "gate_h6_open": {"w":6.0,"d":1.0,"pad":0,"solid":false,"decor":true,"pw":192,"ph":32},
        "gate_h8_closed": {"w":8.0,"d":1.0,"pad":0,"solid":false,"decor":true,"pw":256,"ph":32},
        "gate_h8_open": {"w":8.0,"d":1.0,"pad":0,"solid":false,"decor":true,"pw":256,"ph":32},
        "gate_v6_closed": {"w":1.0,"d":6.0,"pad":0,"solid":false,"decor":true,"pw":32,"ph":192},
        "gate_v6_open": {"w":1.0,"d":6.0,"pad":0,"solid":false,"decor":true,"pw":32,"ph":192},
        "glasscab": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":63},
        "goal_4": {"w":4,"d":1,"pad":3,"solid":true,"decor":false,"pw":128,"ph":61},
        "hoop": {"w":2,"d":1,"pad":3,"solid":true,"decor":false,"pw":64,"ph":113},
        "kitchen_14": {"w":14,"d":2,"pad":0,"solid":false,"decor":true,"pw":448,"ph":64},
        "libcounter_4": {"w":4,"d":1,"pad":3,"solid":true,"decor":false,"pw":128,"ph":51},
        "lintel_6": {"w":6,"d":1,"pad":3,"solid":false,"decor":false,"pw":192,"ph":33},
        "lockerbank_6": {"w":6,"d":1,"pad":3,"solid":true,"decor":false,"pw":192,"ph":63},
        "mat_blue": {"w":2,"d":1,"pad":3,"solid":false,"decor":false,"pw":64,"ph":32},
        "mat_red": {"w":2,"d":1,"pad":3,"solid":false,"decor":false,"pw":64,"ph":32},
        "nook": {"w":5,"d":2,"pad":3,"solid":true,"decor":false,"pw":160,"ph":98},
        "otable_4x2": {"w":4,"d":2,"pad":3,"solid":true,"decor":false,"pw":128,"ph":67},
        "otable_6x2": {"w":6,"d":2,"pad":3,"solid":true,"decor":false,"pw":192,"ph":67},
        "plant": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":52},
        "podium_4x3": {"w":4,"d":3,"pad":3,"solid":true,"decor":false,"pw":128,"ph":115},
        "poster_gupsik": {"w":1.75,"d":1.5625,"pad":0,"solid":false,"decor":true,"pw":56,"ph":50},
        "poster_libguide": {"w":2.6875,"d":1.5625,"pad":0,"solid":false,"decor":true,"pw":86,"ph":50},
        "poster_water": {"w":1.34375,"d":1.5625,"pad":0,"solid":false,"decor":true,"pw":43,"ph":50},
        "posterstand": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":62},
        "purifier": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":59},
        "signhang_급식실_7a6ac0": {"w":1.46875,"d":0.59375,"pad":0,"solid":false,"decor":true,"pw":47,"ph":19},
        "signhang_체육관_3f8a5a": {"w":1.46875,"d":0.59375,"pad":0,"solid":false,"decor":true,"pw":47,"ph":19},
        "signstone": {"w":3,"d":1,"pad":3,"solid":true,"decor":false,"pw":96,"ph":41},
        "speaker": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":55},
        "stage_6x3": {"w":6,"d":3,"pad":3,"solid":true,"decor":false,"pw":192,"ph":99},
        "stairs_2x3": {"w":2,"d":3,"pad":0,"solid":false,"decor":true,"pw":64,"ph":96},
        "stand_4x3": {"w":4,"d":3,"pad":3,"solid":true,"decor":false,"pw":128,"ph":141},
        "steel_14": {"w":14,"d":1,"pad":3,"solid":true,"decor":false,"pw":448,"ph":49},
        "stool": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":35},
        "tabcart": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":53},
        "tdesk": {"w":2,"d":1,"pad":3,"solid":true,"decor":false,"pw":64,"ph":41},
        "trash": {"w":1,"d":1,"pad":3,"solid":true,"decor":false,"pw":32,"ph":31},
        "tree": {"w":2,"d":1,"pad":3,"solid":true,"decor":false,"pw":64,"ph":103},
        "trophy_2": {"w":2,"d":1,"pad":3,"solid":true,"decor":false,"pw":64,"ph":57},
        "truss_8": {"w":8,"d":0.625,"pad":0,"solid":false,"decor":true,"pw":256,"ph":20},
        "window_2_blind": {"w":2,"d":2,"pad":0,"solid":false,"decor":true,"pw":64,"ph":64},
        "window_2_field": {"w":2,"d":2,"pad":0,"solid":false,"decor":true,"pw":64,"ph":64},
        "window_2_glass": {"w":2,"d":2,"pad":0,"solid":false,"decor":true,"pw":64,"ph":64},
        "window_3_blind": {"w":3,"d":2,"pad":0,"solid":false,"decor":true,"pw":96,"ph":64},
        "window_3_field": {"w":3,"d":2,"pad":0,"solid":false,"decor":true,"pw":96,"ph":64},
        "wshelf_2": {"w":2,"d":1,"pad":3,"solid":true,"decor":false,"pw":64,"ph":71},
        "wshelf_3": {"w":3,"d":1,"pad":3,"solid":true,"decor":false,"pw":96,"ph":71}
      }
    },
  };
}
