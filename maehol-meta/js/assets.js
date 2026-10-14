// 이미지 불러오기 (p5의 preload 대신 직접 불러와서 진행률을 보여줘요)
(function () {
  const A = (MH.A = { obj: {}, spr: {}, portrait: {}, ui: {}, bg: null, title: null, loaded: 0, total: 0, ready: false, errors: [] });

  MH.loadAssets = function () {
    const AS = window.MAEHOL_ASSETS;
    const jobs = [];
    const load = (url, set) => {
      A.total++;
      jobs.push(
        new Promise((res) => {
          const im = new Image();
          im.onload = () => { A.loaded++; set(im); res(); };
          im.onerror = () => { A.loaded++; A.errors.push(url); res(); };
          im.src = url;
        })
      );
    };
    for (const [name, info] of Object.entries(AS.objects)) load("assets/objects/" + info.file, (im) => (A.obj[name] = im));
    for (const key of Object.keys(AS.sprites)) {
      A.spr[key] = {};
      for (const dir of AS.dirs) {
        A.spr[key][dir] = [null, null, null];
        for (let f = 0; f < 3; f++) load(`assets/sprites/${key}/${dir}_${f}.png`, (im) => (A.spr[key][dir][f] = im));
      }
      A.portrait[key] = {};
      load(`assets/portraits/${key}.png`, (im) => (A.portrait[key].face = im));
      load(`assets/portraits/${key}_full.png`, (im) => (A.portrait[key].full = im));
    }
    for (const u of AS.ui) load(`assets/ui/${u}.png`, (im) => (A.ui[u] = im));
    load("assets/backgrounds/map.png", (im) => (A.bg = im));
    if (AS.title) load("assets/backgrounds/title.png", (im) => (A.title = im));
    return Promise.all(jobs).then(() => { A.ready = true; });
  };
})();
