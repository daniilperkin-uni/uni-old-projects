/* shared site behaviour: theme toggle, lightbox, before/after sliders */
(function () {
  var html = document.documentElement;
  /* expose the sticky nav height so anchor jumps land below it */
  var nav = document.querySelector('.topnav');
  var syncNavH = function () {
    if (nav) { html.style.setProperty('--nav-h', nav.offsetHeight + 'px'); }
  };
  syncNavH();
  window.addEventListener('resize', syncNavH);
  /* nav jumps: land below the sticky nav, then correct for images that load mid-scroll */
  function landOn(target, href) {
    var tries = 0;
    (function correct() {
      var navH = nav ? nav.offsetHeight : 0;
      var delta = target.getBoundingClientRect().top - (navH + 14);
      if (Math.abs(delta) > 4 && tries < 10) {
        tries += 1;
        try {
          window.scrollTo({ top: window.scrollY + delta, behavior: 'instant' });
        } catch (e) {
          window.scrollTo(0, window.scrollY + delta);
        }
        setTimeout(correct, 160);
        return;
      }
      if (history.replaceState) { history.replaceState(null, '', href); }
    })();
  }
  Array.prototype.forEach.call(document.querySelectorAll('.topnav a[href^="#"]'), function (a) {
    a.addEventListener('click', function (ev) {
      var target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) { return; }
      ev.preventDefault();
      landOn(target, a.getAttribute('href'));
    });
  });
  if (location.hash) {
    var initial = document.getElementById(location.hash.slice(1));
    if (initial) { setTimeout(function () { landOn(initial, location.hash); }, 600); }
  }
  var btn = document.getElementById('theme-toggle');
  if (btn) {
    var sync = function () {
      var dark = html.dataset.theme === 'dark';
      btn.textContent = dark ? 'Light theme' : 'Dark theme';
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    };
    sync();
    btn.addEventListener('click', function () {
      var next = html.dataset.theme === 'dark' ? 'light' : 'dark';
      html.dataset.theme = next;
      try { localStorage.setItem('uop-theme', next); } catch (e) {}
      sync();
    });
  }
  var year = document.getElementById('year');
  if (year) { year.textContent = new Date().getFullYear(); }
  /* lightbox: click or Enter/Space on a figure image to zoom; Esc or the close
     button closes. Every .shot img is made a real keyboard target (role=button),
     and the dialog opens with focus on its close button, so the preview is not
     mouse-only. */
  var lastFocus = null;
  function closeLb() {
    var lb = document.querySelector('.lb');
    if (lb) { lb.remove(); }
    if (lastFocus && document.contains(lastFocus)) { lastFocus.focus(); }
    lastFocus = null;
  }
  function openLb(img) {
    var overlay = document.createElement('div');
    overlay.className = 'lb';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image preview');
    overlay.tabIndex = -1;
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'lb-close';
    close.textContent = 'Close';
    close.setAttribute('aria-label', 'Close image preview');
    close.addEventListener('click', function (ev) { ev.stopPropagation(); closeLb(); });
    var big = document.createElement('img');
    big.src = img.src; big.alt = img.alt;
    overlay.appendChild(close);
    overlay.appendChild(big);
    document.body.appendChild(overlay);
    lastFocus = img;
    close.focus();
  }
  Array.prototype.forEach.call(document.querySelectorAll('.shot img'), function (img) {
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    if (!img.getAttribute('aria-label')) {
      img.setAttribute('aria-label', 'Open image: ' + (img.getAttribute('alt') || 'capture'));
    }
    img.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        ev.preventDefault();
        openLb(img);
      }
    });
  });
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest) { return; }
    if (ev.target.closest('.lb')) { closeLb(); return; }
    var img = ev.target.closest('.shot img');
    if (!img) { return; }
    openLb(img);
  });
  document.addEventListener('keydown', function (ev) {
    var lb = document.querySelector('.lb');
    if (!lb) { return; }
    if (ev.key === 'Escape') { closeLb(); }
    else if (ev.key === 'Tab') {
      ev.preventDefault();
      var close = lb.querySelector('.lb-close');
      (close || lb).focus();
    }
  });
  /* before/after slider: <div class="ba"><img class="a" src><img class="b" src><input type="range" value="50"></div> */
  document.querySelectorAll('.ba').forEach(function (ba) {
    var b = ba.querySelector('img.b');
    var r = ba.querySelector('input[type="range"]');
    if (!b || !r) { return; }
    if (!r.getAttribute('aria-label')) { r.setAttribute('aria-label', 'Before/after comparison slider'); }
    var set = function () { b.style.clipPath = 'inset(0 0 0 ' + r.value + '%)'; };
    r.addEventListener('input', set);
    set();
  });

  // The mobile nav is a horizontal scroller with its scrollbar hidden, so a long
  // row of links ends in a hard cut mid-word and the rest look like they do not
  // exist. Fade whichever edge still has content behind it, and only that edge.
  var nl = document.querySelector('.navlinks');
  if (nl) {
    var navCue = function () {
      var more = nl.scrollWidth - nl.clientWidth;
      nl.classList.toggle('has-more-left', nl.scrollLeft > 2);
      nl.classList.toggle('has-more-right', more > 2 && nl.scrollLeft < more - 2);
    };
    navCue();
    nl.addEventListener('scroll', navCue, { passive: true });
    window.addEventListener('resize', navCue);
  }
})();
