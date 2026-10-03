/* SoPra Office Dashboard — kiosk replay widget for the uni-old-projects site.
   Replays the real 3840x2160 captures of the running kiosk (5 views + game)
   and of the admin area. Faithful detail: the app's rotation cuts between
   views with no crossfade and runs on a configurable interval — this replay
   just runs faster for the web. */
(function () {
  'use strict';
  var mount = document.getElementById('kiosk-mount');
  if (!mount) { return; }

  var A = 'sections/sopra_office_dashboard/assets/';
  var GROUPS = {
    kiosk: [
      { file: 'display-calendar.png', label: 'Kalender', desc: 'Three-week grid fed from Odoo — birthdays, work anniversaries, probation ends and community-lunch chips (demo names).' },
      { file: 'display-parking.png', label: 'Parking', desc: 'The coming working days with occupancy bars (0/5 … 5/5), green to red as the office fills up.' },
      { file: 'display-highscore.png', label: 'Highscore', desc: 'Darts leaderboard with ELO and kicker standings, plus the latest match results.' },
      { file: 'display-dashboard.png', label: 'OneDisplay', desc: 'The combined view — calendar, parking and top ranks on one screen.' },
      { file: 'display-weather.png', label: 'Wetter', desc: 'Live from Open-Meteo, no API key. Captured as-is — this view has a known contrast bug (white on light), on the repo backlog.' },
      { file: 'display-game.jpg', label: 'Games', desc: 'Easter egg — office cats fall, a flappy cat flies, a Subway Surfers video runs. Bootable via interval -1.' }
    ],
    admin: [
      { file: 'admin-login.png', label: 'Login', desc: 'Everything under /admin requires a session.' },
      { file: 'admin-parking.png', label: 'Parken', desc: 'Bookings per day — create, edit, delete; the kiosk reads the same rows.' },
      { file: 'admin-highscores.png', label: 'Highscores', desc: 'Record and correct darts and kicker matches; standings and ELO follow.' },
      { file: 'admin-lunch.png', label: 'Lunch', desc: 'Community lunches with food catalog, options and votes — DRAFT → OPEN → CLOSED gates the voting.' },
      { file: 'admin-config.png', label: 'Konfiguration', desc: 'Rotation on/off, interval (min 5 s), skip OneDisplay, pinned view — re-read by the display every 30 s.' }
    ]
  };
  var INTERVAL = 4000;

  var wrap = document.createElement('div');
  wrap.className = 'kiosk';
  wrap.innerHTML =
    '<div class="k-top"><i></i><i></i><i></i><span class="k-title">Office Dashboard — kiosk replay</span>' +
    '<span class="k-4k">3840×2160</span><button type="button" class="k-play" id="k-play">Pause</button></div>' +
    '<div class="k-stage" id="k-stage" role="button" tabindex="0" aria-label="Kiosk replay — press Enter to zoom the current frame" title="Click or press Enter to zoom"><span class="k-hint">click / Enter to zoom</span></div>' +
    '<div class="k-ctrl"><span class="k-group" id="k-group"></span><div class="k-tabs" id="k-tabs"></div><span class="k-count" id="k-count"></span></div>' +
    '<p class="k-cap" id="k-cap"></p>';
  mount.appendChild(wrap);

  var stage = document.getElementById('k-stage');
  var tabsEl = document.getElementById('k-tabs');
  var groupEl = document.getElementById('k-group');
  var capEl = document.getElementById('k-cap');
  var countEl = document.getElementById('k-count');
  var playBtn = document.getElementById('k-play');

  var imgs = {};
  var group = 'kiosk';
  var idx = 0;
  var userPaused = false;
  var hoverPaused = false;
  var lbOpen = false;
  var timer = null;
  var lbEl = null;

  /* Groups load on first use: the kiosk group eagerly (above-the-fold hero),
     the admin group only when Admin is first switched to — its 5 extra 4K
     captures stay off the initial page load. */
  function ensureGroup(g) {
    if (imgs[g + ':0']) { return; }
    GROUPS[g].forEach(function (v, i) {
      var im = document.createElement('img');
      im.src = A + v.file;
      im.alt = 'Office Dashboard — ' + v.label + ' (' + g + ')';
      im.decoding = 'async';
      stage.appendChild(im);
      imgs[g + ':' + i] = im;
    });
  }

  [['kiosk', 'Kiosk'], ['admin', 'Admin']].forEach(function (gp) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = gp[1];
    b.addEventListener('click', function () { setGroup(gp[0]); });
    groupEl.appendChild(b);
  });

  function buildTabs() {
    tabsEl.innerHTML = '';
    GROUPS[group].forEach(function (v, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = v.label;
      b.addEventListener('click', function () { show(i, true); });
      tabsEl.appendChild(b);
    });
  }

  function show(i, manual) {
    var list = GROUPS[group];
    idx = ((i % list.length) + list.length) % list.length;
    Object.keys(imgs).forEach(function (k) { imgs[k].classList.remove('on'); });
    imgs[group + ':' + idx].classList.add('on');
    var v = list[idx];
    capEl.innerHTML = '<b>' + v.label + '</b> — ' + v.desc;
    countEl.textContent = (idx + 1) + ' / ' + list.length;
    var buttons = tabsEl.querySelectorAll('button');
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].classList.toggle('on', j === idx);
    }
    if (manual) { sync(); }
  }

  function shouldRun() { return !userPaused && !hoverPaused && !lbOpen; }

  function sync() {
    if (timer) { clearInterval(timer); timer = null; }
    if (shouldRun()) {
      timer = setInterval(function () { show(idx + 1, false); }, INTERVAL);
    }
    playBtn.textContent = userPaused ? 'Play' : 'Pause';
  }

  function setGroup(g) {
    group = g;
    ensureGroup(g);
    var gb = groupEl.querySelectorAll('button');
    gb[0].classList.toggle('on', g === 'kiosk');
    gb[1].classList.toggle('on', g === 'admin');
    buildTabs();
    show(0, false);
    sync();
  }

  function closeLb() {
    if (lbEl) { lbEl.remove(); }
    lbEl = null;
    lbOpen = false;
    sync();
    stage.focus();
  }

  playBtn.addEventListener('click', function () {
    userPaused = !userPaused;
    sync();
  });

  stage.addEventListener('mouseenter', function () { hoverPaused = true; sync(); });
  stage.addEventListener('mouseleave', function () { hoverPaused = false; sync(); });

  function openLb() {
    if (lbEl) { return; }
    var im = imgs[group + ':' + idx];
    var v = GROUPS[group][idx];
    lbEl = document.createElement('div');
    lbEl.className = 'lb';
    lbEl.setAttribute('role', 'dialog');
    lbEl.setAttribute('aria-modal', 'true');
    lbEl.setAttribute('aria-label', 'Preview — ' + v.label);
    lbEl.tabIndex = -1;
    var big = document.createElement('img');
    big.src = im.src;
    big.alt = im.alt;
    lbEl.appendChild(big);
    document.body.appendChild(lbEl);
    lbOpen = true;
    sync();
    lbEl.focus();
    lbEl.addEventListener('click', closeLb);
  }

  stage.addEventListener('click', openLb);
  stage.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openLb(); }
  });

  document.addEventListener('keydown', function (ev) {
    if (lbEl && ev.key === 'Escape') { closeLb(); }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (timer) { clearInterval(timer); timer = null; }
    } else {
      sync();
    }
  });

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    userPaused = true;
  }

  setGroup('kiosk');
})();
