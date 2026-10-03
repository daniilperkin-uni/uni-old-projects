/* PE2 Library CLI — terminal replay widget. Scenario data: sessions.js (window.UOP_SESSIONS). */
(function () {
  var mount = document.getElementById('term-mount');
  if (!mount || !window.UOP_SESSIONS) { return; }
  var S = window.UOP_SESSIONS;
  var order = Object.keys(S);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  mount.innerHTML = '<div class="term">' +
    '<div class="term-bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>' +
    '<span class="term-title">pe2_library_cli \u2014 LibraryCLI (Java 21)</span></div>' +
    '<div class="term-body" id="term-body"></div>' +
    '<div class="term-foot"><div class="term-tabs" id="term-tabs"></div>' +
    '<button class="tb" id="tb-speed" type="button">1\u00D7</button>' +
    '<button class="tb" id="tb-play" type="button">Replay</button></div></div>';
  var body = document.getElementById('term-body');
  var tabs = document.getElementById('term-tabs');
  var btnPlay = document.getElementById('tb-play');
  var btnSpeed = document.getElementById('tb-speed');

  var steps = [], idx = 0, timer = null, playing = false, speed = 1, current = order[0];
  var SPEEDS = [1, 2, 5];

  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function clsOf(kind, text) {
    if (kind === 'i') { return 'tl-i'; }
    if (/^\d+\./.test(text)) { return 'tl-menu'; }
    if (/Geb\u00FChr|angelegt|erfolgreich/.test(text)) { return 'tl-hl'; }
    return 'tl-o';
  }
  function renderAll() {
    var out = '';
    for (var i = 0; i < idx && i < steps.length; i++) {
      var s = steps[i];
      out += '<div class="tl ' + clsOf(s[0], s[1]) + '">' + esc(s[1]) + '</div>';
    }
    body.innerHTML = out;
    body.scrollTop = body.scrollHeight;
  }
  function step() {
    if (!playing) { return; }
    if (idx >= steps.length) { playing = false; btnPlay.textContent = 'Replay'; return; }
    var s = steps[idx++];
    renderAll();
    var d = s[2] || (s[0] === 'i' ? 320 : 110);
    timer = setTimeout(step, d / speed);
  }
  function start(fromZero) {
    clearTimeout(timer);
    if (fromZero || idx >= steps.length) { idx = 0; }
    renderAll();
    if (reduce) { idx = steps.length; renderAll(); playing = false; btnPlay.textContent = 'Replay'; return; }
    playing = true;
    btnPlay.textContent = 'Pause';
    step();
  }
  function select(id, autoplay) {
    current = id; steps = S[id].steps; idx = 0; playing = false;
    clearTimeout(timer);
    Array.prototype.forEach.call(tabs.children, function (b) {
      b.classList.toggle('active', b.dataset.id === id);
    });
    if (autoplay) { start(false); } else { renderAll(); btnPlay.textContent = 'Replay'; }
  }
  order.forEach(function (id) {
    var b = document.createElement('button');
    b.className = 'tb'; b.type = 'button'; b.textContent = S[id].title; b.dataset.id = id;
    b.addEventListener('click', function () { select(id, true); });
    tabs.appendChild(b);
  });
  btnPlay.addEventListener('click', function () {
    if (playing) { playing = false; clearTimeout(timer); btnPlay.textContent = 'Replay'; return; }
    start(false);
  });
  btnSpeed.addEventListener('click', function () {
    speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    btnSpeed.textContent = speed + '\u00D7';
  });
  select(current, false);
  if ('IntersectionObserver' in window) {
    var seen = false;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && !seen) { seen = true; start(false); } });
    }, { threshold: 0.3 }).observe(mount);
  } else { start(false); }
})();
