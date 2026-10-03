/* shared site behaviour: theme toggle, lightbox, before/after sliders */
(function () {
  var html = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  if (btn) {
    var sync = function () { btn.textContent = html.dataset.theme === 'dark' ? 'Light theme' : 'Dark theme'; };
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
  /* lightbox: click a figure image to zoom; click or Esc closes. Dialog semantics + focus handling. */
  var lastFocus = null;
  function closeLb() {
    var lb = document.querySelector('.lb');
    if (lb) { lb.remove(); }
    if (lastFocus && document.contains(lastFocus)) { lastFocus.focus(); }
    lastFocus = null;
  }
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest) { return; }
    if (ev.target.closest('.lb')) { closeLb(); return; }
    var img = ev.target.closest('.shot img');
    if (!img) { return; }
    var overlay = document.createElement('div');
    overlay.className = 'lb';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image preview');
    overlay.tabIndex = -1;
    var big = document.createElement('img');
    big.src = img.src; big.alt = img.alt;
    overlay.appendChild(big);
    document.body.appendChild(overlay);
    lastFocus = img;
    if (!img.hasAttribute('tabindex')) { img.setAttribute('tabindex', '-1'); }
    overlay.focus();
  });
  document.addEventListener('keydown', function (ev) {
    var lb = document.querySelector('.lb');
    if (!lb) { return; }
    if (ev.key === 'Escape') { closeLb(); }
    else if (ev.key === 'Tab') { ev.preventDefault(); lb.focus(); }
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
})();
