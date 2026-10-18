/* SprintStart section — click-through demo + sprint chart.
   Vanilla, no dependencies; data in data.js (window.SS_DEMO); theme-aware via tokens. */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ demo */
  var DEMO = window.SS_DEMO;
  var dm = document.getElementById("ss-demo");
  if (dm && DEMO) {
    var BASE = "sections/sprintstart/assets/";
    var reduce = false;
    try { reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

    dm.innerHTML =
      '<div class="demo" role="region" tabindex="0" aria-label="SprintStart click-through — every screen is a real capture. Click the highlighted areas, or press the right arrow key to take the suggested step.">' +
      '<div class="demo-frame">' +
      '<div class="demo-chrome"><span class="d"></span><span class="d"></span><span class="d"></span><span class="demo-url" id="ss-demo-url"></span></div>' +
      '<div class="demo-stage"><img id="ss-demo-img" src="" alt="">' +
      '<div class="demo-spots" id="ss-demo-spots"></div>' +
      '<svg class="demo-cursor" id="ss-demo-cursor" viewBox="0 0 20 24" aria-hidden="true"><path d="M3 2 L3 20 L8 15 L11 22 L14 21 L11 14 L18 14 Z"/></svg>' +
      "</div></div>" +
      '<div class="demo-bar">' +
      '<button type="button" class="demo-nav" id="ss-demo-back" aria-label="Go back">‹</button>' +
      '<button type="button" class="demo-nav" id="ss-demo-reset" aria-label="Start over">⟲</button>' +
      '<span class="demo-hintline" id="ss-demo-hintline"></span>' +
      '<button type="button" class="demo-hints" id="ss-demo-hints" aria-pressed="false">Hints off</button>' +
      "</div>" +
      '<p class="demo-cap" id="ss-demo-cap" aria-live="polite"></p>' +
      "</div>";

    var img = dm.querySelector("#ss-demo-img");
    var spots = dm.querySelector("#ss-demo-spots");
    var capEl = dm.querySelector("#ss-demo-cap");
    var urlEl = dm.querySelector("#ss-demo-url");
    var backBtn = dm.querySelector("#ss-demo-back");
    var resetBtn = dm.querySelector("#ss-demo-reset");
    var hintsBtn = dm.querySelector("#ss-demo-hints");
    var hintline = dm.querySelector("#ss-demo-hintline");
    var cursor = dm.querySelector("#ss-demo-cursor");

    var cur = DEMO.start;
    var hist = [];
    var hints = false;

    var placeCursor = function (s) {
      if (!s.clicks.length) { cursor.style.opacity = "0"; return; }
      var c = s.clicks[s.suggest];
      cursor.style.left = (c.x + c.w / 2) + "%";
      cursor.style.top = (c.y + c.h / 2) + "%";
      cursor.style.opacity = hints && !reduce ? "1" : "0";
    };

    var show = function (id, push) {
      var s = DEMO.states[id];
      if (!s) { return; }
      if (push && id !== cur) { hist.push(cur); }
      cur = id;
      img.src = BASE + s.img;
      img.alt = "Screenshot: " + s.title;
      urlEl.textContent = "demo · sprintstart" + s.url;
      capEl.innerHTML = "<b>" + s.title + "</b> — " + s.cap;
      backBtn.disabled = hist.length === 0;
      hintline.textContent = "";
      spots.innerHTML = "";
      s.clicks.forEach(function (c, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "demo-spot" + (i === s.suggest && hints ? " sug" : "");
        b.style.left = c.x + "%";
        b.style.top = c.y + "%";
        b.style.width = c.w + "%";
        b.style.height = c.h + "%";
        b.setAttribute("aria-label", c.label);
        b.addEventListener("click", function () { show(c.to, true); });
        b.addEventListener("mouseenter", function () { hintline.textContent = c.label; });
        b.addEventListener("mouseleave", function () { hintline.textContent = ""; });
        b.addEventListener("focus", function () { hintline.textContent = c.label; });
        b.addEventListener("blur", function () { hintline.textContent = ""; });
        spots.appendChild(b);
      });
      placeCursor(s);
    };

    backBtn.addEventListener("click", function () {
      if (hist.length) { var p = hist.pop(); show(p, false); }
    });
    resetBtn.addEventListener("click", function () { hist = []; show(DEMO.start, false); });
    hintsBtn.addEventListener("click", function () {
      hints = !hints;
      hintsBtn.setAttribute("aria-pressed", String(hints));
      hintsBtn.textContent = hints ? "Hints on" : "Hints off";
      var s = DEMO.states[cur];
      var spotEls = spots.querySelectorAll(".demo-spot");
      spotEls.forEach(function (el, i) { el.classList.toggle("sug", hints && i === s.suggest); });
      placeCursor(s);
    });
    dm.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowLeft" && hist.length) {
        ev.preventDefault();
        var p = hist.pop(); show(p, false);
      } else if (ev.key === "ArrowRight") {
        var s = DEMO.states[cur];
        if (s && s.clicks.length) { ev.preventDefault(); show(s.clicks[s.suggest].to, true); }
      }
    });
    show(DEMO.start, false);
  }

  /* ----------------------------------------------------------------- chart */
  var cmount = document.getElementById("ss-chart");
  if (cmount) {
    /* sprint, velocity (M3, story points), available (% of the team) — team's own export */
    var D = [
      [1, 102, 97.2], [2, 176, 100], [3, 260, 95], [4, 436, 86.7], [5, 298, 37.5],
      [6, 207, 37.5], [7, 100, 50], [8, 190, 55], [9, 381, 85.8], [10, 259, 100]
    ];
    var ITEMS = [44, 36, 35, 52, 17, 16, 26, 14, 55, 20];
    var W = 920, H = 322, L = 64, R = 872, T = 18, B2 = 262, SP_MAX = 450;
    var x = function (idx) { return L + (R - L) * (idx + 0.5) / D.length; };
    var ysp = function (v) { return B2 - (v / SP_MAX) * (B2 - T); };
    var ycap = function (v) { return B2 - (v / 100) * (B2 - T); };
    var p = ['<div class="chart">'];
    p.push('<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Sprint chart: velocity in story points per sprint (102 to 436) with team availability between 37.5 and 100 percent. Full table below.">');
    [0, 100, 200, 300, 400].forEach(function (v) {
      var y = ysp(v);
      p.push('<line class="grid-line" x1="' + L + '" y1="' + y + '" x2="' + R + '" y2="' + y + '"/>');
      p.push('<text class="axis" x="' + (L - 10) + '" y="' + (y + 4) + '" text-anchor="end">' + v + "</text>");
    });
    [0, 25, 50, 75, 100].forEach(function (v) {
      p.push('<text class="axis" x="' + (R + 10) + '" y="' + (ycap(v) + 4) + '">' + v + "%</text>");
    });
    D.forEach(function (d, idx) {
      var cx = x(idx);
      var y = ysp(d[1]);
      p.push("<g><title>Sprint " + d[0] + " — " + d[1] + " story points · " + d[2] + '% available</title><rect class="bar" x="' + (cx - 22) + '" y="' + y + '" width="44" height="' + (B2 - y) + '" rx="3"/></g>');
      p.push('<text class="barlabel" x="' + cx + '" y="' + (y + 15) + '" text-anchor="middle">' + d[1] + "</text>");
      p.push('<text class="axis" x="' + cx + '" y="' + (B2 + 20) + '" text-anchor="middle">S' + d[0] + "</text>");
    });
    p.push('<polyline class="cap-line" points="' + D.map(function (d, idx) { return x(idx) + "," + ycap(d[2]); }).join(" ") + '"/>');
    D.forEach(function (d, idx) {
      p.push("<g><title>Sprint " + d[0] + " — " + d[2] + '% available</title><circle class="cap-dot" cx="' + x(idx) + '" cy="' + ycap(d[2]) + '" r="4"/></g>');
    });
    p.push('<text class="note" x="' + ((x(4) + x(5)) / 2) + '" y="304" text-anchor="middle">semester break</text>');
    p.push("</svg>");
    p.push('<div class="legend"><span class="sw sw-bar"></span>story points (velocity, unsized items imputed)<span class="sw sw-line"></span>team availability (absence calendar)</div>');
    var rows = "";
    var sumIT = 0, sumSP = 0;
    D.forEach(function (d, idx) {
      sumIT += ITEMS[idx];
      sumSP += d[1];
      rows += "<tr><td>S" + d[0] + "</td><td>" + ITEMS[idx] + "</td><td>" + d[1] + "</td><td>" + d[2] + "%</td></tr>";
    });
    rows += '<tr class="sum"><td>total</td><td>' + sumIT + "</td><td>" + sumSP + "</td><td>74%</td></tr>";
    p.push('<details><summary>Sprint data — table</summary><table class="data"><thead><tr><th>Sprint</th><th>Items done</th><th>Story points</th><th>Available</th></tr></thead><tbody>' + rows + "</tbody></table></details>");
    p.push("</div>");
    cmount.innerHTML = p.join("");
  }
})();
