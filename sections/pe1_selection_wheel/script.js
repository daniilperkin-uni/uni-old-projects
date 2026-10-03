/* PE1 Selection Wheel - the desktop app's spin physics, live in the browser.
   The pure math below is a 1:1 port of selectionwheel.WheelMath / SpinStep; the canvas
   renderer mirrors WheelRenderer (same 15 items, same default 12-color palette, same
   right-aligned radial labels, same black section borders, same pointer). Validated
   against the Java classes on generated test vectors - see capture/README.md. */
(function () {
  'use strict';

  var ITEMS = ['Cat', 'Dog', 'Rabbit', 'Hamster', 'Parrot', 'Guinea Pig', 'Goldfish', 'Turtle',
    'Rat', 'Crab', 'Fish', 'Frog', 'Dragon', 'Chinchilla', 'Hedgehog'];     /* itemlist.txt */
  var PALETTE = ['#0000ff', '#00ffff', '#404040', '#808080', '#00ff00', '#c0c0c0',
    '#ff00ff', '#ffc800', '#ffafaf', '#ff0000', '#ffffff', '#ffff00'];      /* Wheel.getDefaultColorList */
  var REFRESH_RATE = 100;               /* Wheel.REFRESH_RATE */
  var STEP_SECONDS = 1 / REFRESH_RATE;  /* 10 ms per physics step - the app's timer */
  var MAX_SPIN_SPEED = 360;             /* WheelModel default maxSpinSpeedDegPerSec */
  var SPIN_DECELERATION = -20;          /* WheelModel default spinDeceleration */
  var MIN_RANDOM_SPEED = 180;           /* MainWheel.MIN_SPIN_SPEED */
  var MAX_RANDOM_SPEED = 360;           /* MainWheel.MAX_SPIN_SPEED (exclusive) */
  var RAD = Math.PI / 180;

  /* ---- pure math: 1:1 port of WheelMath / SpinStep ---------------------------------- */

  function sectionAngleDeg(numSections) {              /* WheelMath.sectionAngleDeg */
    if (numSections <= 0) { throw new Error('numSections must be > 0'); }
    return 360 / numSections;
  }

  function normalizeAngleDeg(angleDeg) {               /* WheelMath.normalizeAngleDeg */
    return angleDeg % 360;                             /* Java % - sign is preserved */
  }

  function selectionIndex(rotationAngleDeg, numSections) {   /* WheelMath.selectionIndex */
    var d = sectionAngleDeg(numSections);
    return Math.floor(numSections + (rotationAngleDeg % 360) / d) % numSections;
  }

  function clampSpeed(speed, maxSpeed) {               /* WheelMath.clampSpeed */
    return Math.max(0, Math.min(speed, maxSpeed));
  }

  function computeInitialSpeedDegPerSec(angleStartDeg, angleEndDeg, timeStartMs, timeEndMs, maxSpeedDegPerSec) {
    var elapsed = timeEndMs - timeStartMs;
    if (elapsed === 0) { return 0; }
    var raw = 1000 * (angleEndDeg - angleStartDeg) / elapsed;
    if (!isFinite(raw)) { return 0; }                  /* Java: NaN || Infinite -> 0 */
    var sign = Math.sign(raw);
    return sign * clampSpeed(Math.abs(raw), maxSpeedDegPerSec);
  }

  function dragDeltaDeg(prev, curr, center) {          /* WheelMath.dragDeltaDeg */
    var dxPrev = prev.x - center.x, dxCurr = curr.x - center.x;
    if (dxPrev === 0 || dxCurr === 0) { return 0; }
    var k1 = (prev.y - center.y) / dxPrev, k2 = (curr.y - center.y) / dxCurr;
    var delta = Math.atan((k2 - k1) / (1 + k2 * k1)) / RAD;
    return isNaN(delta) ? 0 : delta;
  }

  function spinStep(currentSpeed, direction, deceleration, dtSeconds) {   /* SpinStep.compute */
    if (currentSpeed <= 0 || direction === 0) { return { deltaDeg: 0, newSpeed: 0, shouldStop: true }; }
    var delta = direction * (currentSpeed * dtSeconds);
    var nextSpeed = currentSpeed + deceleration * dtSeconds;
    if (nextSpeed <= 0) { return { deltaDeg: delta, newSpeed: 0, shouldStop: true }; }
    return { deltaDeg: delta, newSpeed: nextSpeed, shouldStop: false };
  }

  window.SWMath = { sectionAngleDeg: sectionAngleDeg, normalizeAngleDeg: normalizeAngleDeg,
    selectionIndex: selectionIndex, clampSpeed: clampSpeed,
    computeInitialSpeedDegPerSec: computeInitialSpeedDegPerSec,
    dragDeltaDeg: dragDeltaDeg, spinStep: spinStep };

  var mount = document.getElementById('wheel-mount');
  if (!mount) { return; }

  /* ---- widget ---------------------------------------------------------------------- */

  mount.innerHTML =
    '<div class="sw-widget">' +
      '<div class="sw-main">' +
        '<div class="sw-stage" id="sw-stage">' +
          '<canvas id="sw-canvas" tabindex="0" aria-label="Selection wheel - drag it and release to spin, or press Space for a random spin"></canvas>' +
        '</div>' +
        '<aside class="sw-side">' +
          '<div class="sw-readout"><span class="sw-k">Selection</span><b class="sw-v" id="sw-sel">Cat</b></div>' +
          '<div class="sw-readout"><span class="sw-k">Angle</span><b class="sw-v" id="sw-ang">0.0\u00b0</b></div>' +
          '<div class="sw-readout"><span class="sw-k">Speed</span><b class="sw-v" id="sw-spd">0.0\u00b0/s</b></div>' +
          '<button id="sw-spin" type="button" class="sw-btn">Spin</button>' +
          '<p class="sw-hint">Drag the wheel and release to flick it \u00b7 click it mid-spin to stop it dead \u00b7 <b>Space</b> / <b>Enter</b> spins randomly (click the wheel first)</p>' +
        '</aside>' +
      '</div>' +
      '<div class="sw-result" id="sw-result">Spin the wheel!</div>' +
    '</div>';

  var stage = document.getElementById('sw-stage');
  var canvas = document.getElementById('sw-canvas');
  var ctx = canvas.getContext('2d');
  var selEl = document.getElementById('sw-sel');
  var angEl = document.getElementById('sw-ang');
  var spdEl = document.getElementById('sw-spd');
  var resEl = document.getElementById('sw-result');
  var spinBtn = document.getElementById('sw-spin');

  var n = ITEMS.length;
  var delta = sectionAngleDeg(n);
  var dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  var geom = { size: 0, tickW: 0, cx: 0, cy: 0, radius: 0 };
  var state = { angle: 0, spinning: false, speed: 0, dir: 1 };
  var lastSel = null;
  var acc = 0, lastTs = 0;

  function sectionColor(i) { return PALETTE[(n - 1 - i) % PALETTE.length]; }   /* renderer loop order */

  function fitFontSize(radius) {
    /* Port of WheelRenderer.calcFontSize: binary search for the largest font where the
       longest string fits the wedge (width + arc height constraints), capped at 80. */
    var sde = 0.05 * radius, maxW = radius - 2 * sde;
    var longest = '';
    for (var i = 0; i < n; i++) { if (ITEMS[i].length > longest.length) { longest = ITEMS[i]; } }
    var lo = 1, hi = 80, mid, m, w, h, inner, avail;
    while (lo < hi) {
      mid = lo + ((hi - lo + 1) >> 1);
      ctx.font = mid + 'px "Times New Roman", Times, serif';
      m = ctx.measureText(longest);
      w = m.width;
      h = (m.fontBoundingBoxAscent || 0.89 * mid) + (m.fontBoundingBoxDescent || 0.22 * mid);
      inner = maxW + sde - w;
      avail = inner >= sde ? 2 * inner * Math.sin(delta / 2 * RAD) : 0;
      if (w <= maxW && h <= avail) { lo = mid; } else { hi = mid - 1; }
    }
    return Math.min(lo, 80);
  }

  function draw() {
    var S = geom.size, cy = geom.cy, cx = geom.cx, r = geom.radius;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S, S);

    /* sections - same order, same fill-arc geometry as WheelRenderer (up-positive angle
       u = i*24 - rotation, drawn counter-clockwise in canvas terms) */
    for (var i = n - 1; i >= 0; i--) {
      var u0 = i * delta - state.angle;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, -u0 * RAD, -(u0 + delta) * RAD, true);
      ctx.closePath();
      ctx.fillStyle = sectionColor(i);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = Math.max(1, S / 560);
      ctx.stroke();
    }

    /* labels - right-aligned near the rim, rotated to their wedge, exactly like the renderer */
    var fontPx = fitFontSize(r);
    ctx.font = fontPx + 'px "Times New Roman", Times, serif';
    var fm = ctx.measureText('Mg');
    var asc = fm.fontBoundingBoxAscent || 0.89 * fontPx;
    var desc = fm.fontBoundingBoxDescent || 0.22 * fontPx;
    var sde = 0.05 * r, maxW = r - 2 * sde;
    ctx.fillStyle = '#000';
    for (i = 0; i < n; i++) {
      var mid = (i + 0.5) * delta - state.angle;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-mid * RAD);
      var tw = ctx.measureText(ITEMS[i]).width;
      ctx.fillText(ITEMS[i], maxW + sde - tw, (asc - desc) / 2);
      ctx.restore();
    }

    /* pointer - TickMath.computeDefaultTriangle: apex pointing left, base at the right edge */
    var TW = geom.tickW;
    var half = TW * Math.tan(30 * RAD);
    ctx.beginPath();
    ctx.moveTo(S - TW, cy);
    ctx.lineTo(S, cy - half);
    ctx.lineTo(S, cy + half);
    ctx.closePath();
    ctx.fillStyle = '#000';
    ctx.fill();
  }

  function currentSelection() { return ITEMS[selectionIndex(state.angle, n)]; }

  function updateReadouts() {
    var sel = currentSelection();
    if (sel !== lastSel) { lastSel = sel; selEl.textContent = sel; }
    angEl.textContent = state.angle.toFixed(1) + '\u00b0';
    spdEl.textContent = (state.spinning ? state.speed : 0).toFixed(1) + '\u00b0/s';
  }

  function onSpinStopped() {
    spinBtn.disabled = false;
    resEl.textContent = 'Selection: ' + currentSelection();
    resEl.classList.remove('spinning');
  }

  function startSpin(speed, dir) {
    if (state.spinning) { return; }
    state.spinning = true;
    state.speed = speed;
    state.dir = dir;
    resEl.textContent = 'Spinning\u2026';
    resEl.classList.add('spinning');
    spinBtn.disabled = true;
    lastTs = 0;
    acc = 0;
    requestAnimationFrame(loop);
  }

  function stopSpin() {
    if (!state.spinning) { return; }
    state.spinning = false;
    state.speed = 0;
    onSpinStopped();
    draw();
    updateReadouts();
  }

  function loop(ts) {
    if (!state.spinning) { draw(); updateReadouts(); return; }
    if (!lastTs) { lastTs = ts; }
    var wall = Math.min((ts - lastTs) / 1000, 0.25);
    lastTs = ts;
    acc += wall;
    while (acc >= STEP_SECONDS) {
      var st = spinStep(state.speed, state.dir, SPIN_DECELERATION, STEP_SECONDS);
      state.angle = normalizeAngleDeg(state.angle + st.deltaDeg);
      state.speed = st.newSpeed;
      acc -= STEP_SECONDS;
      if (st.shouldStop) { state.spinning = false; state.speed = 0; onSpinStopped(); break; }
    }
    draw();
    updateReadouts();
    if (state.spinning) { requestAnimationFrame(loop); }
  }

  function randomSpin() {
    if (state.spinning) { return; }
    startSpin(MIN_RANDOM_SPEED + Math.random() * (MAX_RANDOM_SPEED - MIN_RANDOM_SPEED),
      Math.random() < 0.5 ? -1 : 1);
  }

  /* drag / flick / click-to-stop - the Wheel mouse listeners, ported */
  var drag = null;
  function pos(e) {
    var rct = canvas.getBoundingClientRect();
    return { x: e.clientX - rct.left, y: e.clientY - rct.top };
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) { return; }
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers etc. */ }
    var p = pos(e);
    var d = Math.sqrt(Math.pow(p.x - geom.cx, 2) + Math.pow(p.y - geom.cy, 2));
    if (d <= geom.radius) { stopSpin(); }        /* click inside the wheel stops the spin */
    drag = { t0: Date.now(), angle0: state.angle, last: p };
    canvas.classList.add('dragging');
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!drag) { return; }
    var p = pos(e);
    var dlt = dragDeltaDeg(drag.last, p, { x: geom.cx, y: geom.cy });
    if (dlt !== 0) {
      state.angle = normalizeAngleDeg(state.angle + dlt);
      draw();
      updateReadouts();
    }
    drag.last = p;
  });

  function endDrag(e) {
    if (!drag) { return; }
    var p = pos(e);
    var speed = computeInitialSpeedDegPerSec(drag.angle0, state.angle, drag.t0, Date.now(), MAX_SPIN_SPEED);
    drag = null;
    canvas.classList.remove('dragging');
    if (Math.abs(speed) > 0) { startSpin(Math.abs(speed), Math.sign(speed)); }
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', function () { drag = null; canvas.classList.remove('dragging'); });

  canvas.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); randomSpin(); }
  });
  spinBtn.addEventListener('click', randomSpin);

  /* ---- sizing ---------------------------------------------------------------------- */

  function resize() {
    var w = Math.max(280, Math.min(560, (stage.clientWidth || 560)));
    var S = Math.round(w);
    canvas.width = Math.round(S * dpr);
    canvas.height = Math.round(S * dpr);
    canvas.style.width = S + 'px';
    canvas.style.height = S + 'px';
    geom.size = S;
    geom.tickW = Math.max(12, Math.round(S * 0.036));
    var gap = Math.max(6, Math.round(S * 0.018));
    geom.radius = Math.min(S - geom.tickW, S) / 2 - gap;
    geom.cx = (S - geom.tickW) / 2;
    geom.cy = S / 2;
    draw();
    updateReadouts();
  }

  if (typeof ResizeObserver !== 'undefined') {
    var ro = new ResizeObserver(function () {
      if (Math.abs((stage.clientWidth || 0) - geom.size) > 0) { resize(); }
    });
    ro.observe(stage);
  } else {
    window.addEventListener('resize', resize);
  }

  resize();

  /* Verification hook - used to validate this port against the Java render at the same
     rotation (reads back pixels at a given radius factor / screen angle, up-positive). */
  window.SWWheelDebug = {
    geom: function () {
      return { size: geom.size, tickW: geom.tickW, cx: geom.cx, cy: geom.cy, radius: geom.radius,
        dpr: dpr, angle: state.angle, spinning: state.spinning, speed: state.speed };
    },
    setRotation: function (a) { state.angle = normalizeAngleDeg(a); draw(); updateReadouts(); },
    probe: function (factor, screenAngleDeg) {
      var a = screenAngleDeg * RAD;
      var x = Math.round((geom.cx + geom.radius * factor * Math.cos(a)) * dpr);
      var y = Math.round((geom.cy - geom.radius * factor * Math.sin(a)) * dpr);
      var d = ctx.getImageData(x, y, 1, 1).data;
      return [d[0], d[1], d[2]];
    }
  };
})();
