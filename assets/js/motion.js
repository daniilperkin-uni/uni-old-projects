/* motion.js — blueprint scroll choreography for the uni showcase.
   Adds: progress spine with ruler ticks + section counter, staggered reveals,
   sticky dossier titles with section-progress underline, scrub parallax on
   captures, hero grid + scroll cue, odometer KPI count-ups.
   Vanilla, no deps, transform/opacity/clip-path only. Opt-in: bails out (leaving
   the page fully static) under prefers-reduced-motion or without IntersectionObserver. */
(function () {
  var html = document.documentElement;
  var reduce = false;
  try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduce || !('IntersectionObserver' in window)) { return; }
  html.classList.add('uop-anim');

  var main = document.querySelector('main');
  if (!main) { return; }
  var sections = [].slice.call(main.querySelectorAll('.project'));

  /* ---- tag targets: reveals, sticky titles, parallax imgs, KPIs ---- */
  var shots = [], stickyHeads = [], kpis = [], revealTargets = [];
  sections.forEach(function (sec) {
    /* the title becomes the section's own sticky tab: moved out of .p-head so its
       sticky containing block is the whole section, not just the header block;
       it is excluded from the staggered .rv fade (it gets the wipe instead). */
    var h2 = sec.querySelector('h2');
    if (h2) {
      sec.insertBefore(h2, sec.firstChild);
      h2.classList.add('stick');
      stickyHeads.push(h2);
    }
    var kids = [].slice.call(sec.children).filter(function (el) { return el.tagName !== 'SCRIPT' && el.tagName !== 'H2'; });
    kids.forEach(function (el, i) {
      el.classList.add('rv');
      el.style.setProperty('--rvd', Math.min(i * 60, 360) + 'ms');
      revealTargets.push(el);
    });
    sec.classList.add('rvw');
    revealTargets.push(sec);
    [].slice.call(sec.querySelectorAll('.shot img')).forEach(function (img) {
      img.classList.add('px'); shots.push(img);
    });
    [].slice.call(sec.querySelectorAll('.kpi b')).forEach(function (b) { kpis.push(b); });
  });

  /* ---- hero decorations (grid backdrop + scroll cue) ---- */
  var hero = document.querySelector('body > .hero');
  if (hero) {
    var grid = document.createElement('div');
    grid.className = 'bggrid'; grid.setAttribute('aria-hidden', 'true');
    hero.appendChild(grid);
    var cue = document.createElement('div');
    cue.className = 'cue'; cue.setAttribute('aria-hidden', 'true');
    cue.innerHTML = '<span>scroll</span><i></i>';
    hero.appendChild(cue);
  }

  /* ---- progress spine ---- */
  var spine = document.createElement('div');
  spine.className = 'spine'; spine.setAttribute('aria-hidden', 'true');
  spine.innerHTML = '<span class="line"></span><span class="fill"></span><span class="node"></span><span class="cnt"></span>';
  document.body.appendChild(spine);
  var fill = spine.querySelector('.fill');
  var node = spine.querySelector('.node');
  var cnt = spine.querySelector('.cnt');
  var ticks = sections.map(function () {
    var t = document.createElement('span'); t.className = 'tick';
    spine.appendChild(t); return t;
  });

  /* ---- reveals ---- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px 12% 0px', threshold: 0.01 });
  revealTargets.forEach(function (t) { io.observe(t); });
  /* escape hatch for scripted captures */
  window.__uopRevealAll = function () { revealTargets.forEach(function (t) { t.classList.add('in'); }); };

  /* ---- scroll loop ---- */
  var vh = window.innerHeight;
  var ticking = false;
  function frame() {
    ticking = false;
    var doc = document.documentElement;
    var y = window.scrollY || doc.scrollTop || 0;
    var max = Math.max(1, doc.scrollHeight - vh);
    var p = Math.min(1, y / max);
    var railTop = vh * 0.12, railH = vh * 0.76;

    /* ---- read phase: every layout query first ----
       A write between two getBoundingClientRect calls forces a synchronous
       re-layout for the next one (~46 per frame here). Nothing below depends
       on another element's new position, so all reads can happen up front. */
    var tops = [];
    for (var i = 0; i < sections.length; i++) { tops.push(sections[i].getBoundingClientRect().top); }
    var heads = [];
    for (var j = 0; j < stickyHeads.length; j++) {
      var sec = stickyHeads[j].closest('.project');
      var rr = sec ? sec.getBoundingClientRect() : null;
      heads.push(rr ? { top: rr.top, span: Math.max(1, rr.height - vh * 0.35) } : null);
    }
    var pxs = [];
    for (var k = 0; k < shots.length; k++) {
      var fr = shots[k].parentNode.getBoundingClientRect();
      pxs.push(fr.bottom < -120 || fr.top > vh + 120
        ? null
        : (((fr.top + fr.height / 2 - vh / 2) / vh) * -14).toFixed(2) + 'px');
    }

    /* ---- write phase ---- */
    fill.style.transform = 'scaleY(' + p + ')';
    node.style.transform = 'translateY(' + (railTop + railH * p - 6) + 'px)';

    var current = 0;
    for (i = 0; i < tops.length; i++) {
      var f = Math.min(1, Math.max(0, (tops[i] + y) / max));
      ticks[i].style.top = (railTop + railH * f) + 'px';
      if (tops[i] <= vh * 0.35) { current = i; ticks[i].classList.add('on'); }
      else { ticks[i].classList.remove('on'); }
    }
    cnt.style.top = (railTop + railH * p) + 'px';
    cnt.textContent = ('0' + (current + 1)).slice(-2) + '/' + ('0' + sections.length).slice(-2);

    for (j = 0; j < heads.length; j++) {
      if (!heads[j]) { continue; }
      var sp = Math.min(1, Math.max(0, (vh * 0.35 - heads[j].top) / heads[j].span));
      stickyHeads[j].style.setProperty('--sp', sp.toFixed(4));
    }

    for (k = 0; k < pxs.length; k++) {
      if (pxs[k] === null) { continue; }
      shots[k].style.setProperty('--px', pxs[k]);
    }

    if (hero) {
      var hw = hero.querySelector('.wrap');
      if (hw) {
        hw.style.transform = 'translate3d(0,' + (y * 0.22).toFixed(1) + 'px,0)';
        hw.style.opacity = Math.max(0, 1 - y / (vh * 0.9)).toFixed(3);
      }
      var g = hero.querySelector('.bggrid');
      if (g) { g.style.transform = 'translate3d(0,' + (y * 0.12).toFixed(1) + 'px,0)'; }
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { vh = window.innerHeight; onScroll(); });
  frame();

  /* ---- odometer KPI count-ups (final text stays byte-identical) ---- */
  kpis.forEach(function (b) {
    var txt = b.textContent;
    if (b.hasAttribute('data-static') || txt.indexOf('\u2192') !== -1) { return; }
    /* Only a single leading number with a non-numeric tail is a counter. Anything
       with a second number in the tail is a compound value — "3840×2160",
       "32 · 16 · 5", "97–100%", "8/8", "2,409" — and must not count up from zero. */
    var m = /^(\d+)(\D*)$/.exec(txt);
    if (!m) { return; }
    var n = parseInt(m[1], 10);
    if (!(n > 1) || n > 99999) { return; }
    var suffix = txt.slice(m[1].length);
    var done = false;
    function finish() { if (!done) { done = true; b.textContent = txt; } }
    var t0 = null;
    function step(ts) {
      if (done) { return; }
      if (t0 === null) { t0 = ts; }
      var pp = Math.min(1, (ts - t0) / 750);
      var e = 1 - Math.pow(1 - pp, 4);
      if (pp < 1) { b.textContent = Math.round(n * e) + suffix; requestAnimationFrame(step); }
      else { finish(); }
    }
    var io2 = new IntersectionObserver(function (en) {
      if (en.isIntersecting) { io2.disconnect(); b.textContent = '0' + suffix; requestAnimationFrame(step); }
    }, { threshold: 0.4 });
    io2.observe(b);
    setTimeout(finish, 30000); /* safety: never leave a stale intermediate value */
  });
})();
