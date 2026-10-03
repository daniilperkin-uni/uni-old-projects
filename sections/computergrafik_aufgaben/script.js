/* Computergrafik — live raytracer widget for the uni-old-projects site.
   Scene + renderer ported from Aufgabenblatt04 (scene.h + main.cpp); the same
   code was validated byte-identical to the native C++ render at 600x600. */
(function () {
  'use strict';
var SPHERES = [[[2.79691,-3.16565,-14.9654],0.59685,[0.680215,0.3897,0.0832257]],[[-0.407511,-4.00025,-11.4583],0.333709,[0.231187,0.899334,0.132472]],[[-4.43588,1.50888,-8.42867],0.721999,[0.327648,0.336679,0.533702]],[[4.92212,-4.99221,-16.3855],0.617482,[0.0900409,0.545919,0.940942]],[[-4.76938,-4.92934,-13.1165],0.524775,[0.889082,0.818827,0.376314]],[[4.73756,-4.53334,-10.9986],0.232771,[0.69184,0.131286,0.933796]],[[-1.17538,1.18386,-7.90606],0.983231,[0.224297,0.147904,0.61634]],[[1.80308,3.5994,-11.6676],0.450499,[0.471878,0.436242,0.30572]],[[0.632882,4.42202,-7.13265],0.385417,[0.0638121,0.538282,0.832521]],[[-2.58975,-2.69106,-7.15966],0.683264,[0.340974,0.597084,0.282512]],[[-3.26635,3.33195,-13.1],0.391061,[0.8033,0.364325,0.509903]],[[-0.748441,2.55361,-8.82236],0.207942,[0.629547,0.482853,0.0628588]],[[3.42285,-4.68687,-12.677],0.449754,[0.16608,0.851683,0.916801]],[[2.27272,4.26659,-10.9515],0.326541,[0.2159,0.950424,0.299693]],[[4.61172,0.208343,-12.7044],0.844534,[0.235393,0.68133,0.814113]],[[0.867512,0.396921,-14.4732],0.965255,[0.657187,0.699725,0.713496]],[[-2.03726,-2.24001,-13.0703],0.165267,[0.937254,0.918642,0.338299]],[[-1.05118,-0.765985,-7.15636],0.293488,[0.698401,0.0248872,0.832002]],[[2.11342,-3.01158,-7.1408],0.790176,[0.14572,0.903395,0.800197]],[[1.51077,4.26301,-13.0596],0.91496,[0.844889,0.495297,0.660831]],[[-4.0459,-0.505493,-15.5004],0.370818,[0.565382,0.340108,0.676196]],[[0.912978,1.65922,-13.6884],0.274722,[0.605955,0.560501,0.874004]],[[4.71712,-1.17073,-12.6124],0.848914,[0.495297,0.452428,0.253168]],[[-2.43932,-2.64015,-14.2173],0.0404336,[0.562847,0.231306,0.420837]],[[-0.606635,-3.89109,-14.1066],0.201719,[0.497781,0.196731,0.467383]],[[0.632756,-0.246298,-15.9576],0.695516,[0.0286482,0.0439981,0.0260184]],[[0.398411,1.04417,-8.39331],0.203061,[0.782078,0.920722,0.0483436]],[[1.94785,0.988655,-16.4285],0.880468,[0.118627,0.316963,0.0509399]],[[-3.94506,-2.04366,-13.2435],0.456535,[0.821713,0.296983,0.443441]],[[3.8328,-0.834901,-9.1844],0.324345,[0.177003,0.100103,0.0759562]],[[4.06828,-1.43702,-8.22088],0.272132,[0.535684,0.992047,0.599507]],[[-1.47431,-4.9948,-13.4769],0.304781,[0.8382,0.174815,0.621885]]];
var LIGHTS = [[[-8.39073,3.668696,-18.89629],2.124839,[0.763399,0.913718,0.953702]],[[12.000752,8.916655,-12.905505],3.349001,[0.132472,0.680215,0.3897]],[[10.713996,6.674172,-8.777467],2.491471,[0.336679,0.533702,0.231187]],[[-6.659963,1.128232,-14.526654],2.564471,[0.090041,0.545919,0.940942]],[[-14.766347,0.015575,-23.156581],2.196929,[0.933796,0.889082,0.818827]],[[14.788011,12.233063,-13.524445],2.336445,[0.147904,0.61634,0.69184]],[[3.004171,10.495493,4.308127],3.248782,[0.471878,0.436242,0.30572]],[[8.01686,19.47511,3.60003],2.895625,[0.282512,0.063812,0.538282]],[[3.52614,12.36772,2.281807],3.20495,[0.364325,0.509903,0.340974]],[[-10.798212,9.335258,-24.496927],3.375201,[0.629547,0.482853,0.062859]],[[14.602051,9.009985,-15.409226],3.425637,[0.299693,0.16608,0.851683]],[[3.437505,11.265764,-23.266053],2.353089,[0.68133,0.814113,0.2159]],[[7.769236,4.617876,4.521012],2.507449,[0.657187,0.699725,0.713496]],[[-9.995847,12.199933,-15.497906],2.037331,[0.832002,0.937254,0.918642]],[[9.532917,7.821212,-0.200939],2.218581,[0.903395,0.800197,0.698401]],[[8.76175,8.503118,-17.660842],3.014294,[0.844889,0.495297,0.660831]]];
/* Vector helpers + intersection tests — same math as the validated native port. */
var PI = Math.acos(-1);
var MAX_DEPTH = 5;
var REFL = true, SHADOWS = true;
var planeP = [0, -1, 5], planeN = [0, 1, 0];
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function mul(a, b) { return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]; }
function smul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function len(a) { return Math.sqrt(dot(a, a)); }
function norm(a) { var l = len(a); return l ? smul(a, 1 / l) : a; }
function hitSphere(ro, rd, s) {
  var L = sub(ro, s[0]), r = s[1];
  var a = dot(rd, rd), b = 2 * dot(rd, L), c = dot(L, L) - r * r;
  var discr = b * b - 4 * a * c;
  if (discr < 0) return -1;
  var t0, t1;
  if (discr === 0) { t0 = -0.5 * b / a; t1 = t0; }
  else {
    var q = b > 0 ? -0.5 * (b + Math.sqrt(discr)) : -0.5 * (b - Math.sqrt(discr));
    t0 = q / a; t1 = c / q;
  }
  if (t0 > t1) { var t = t0; t0 = t1; t1 = t; }
  if (t0 < 0) { t0 = t1; if (t0 < 0) return -1; }
  return t0;
}
function hitPlane(ro, rd) {
  var denom = dot(planeN, rd);
  if (denom < -1e-6) { var t = dot(sub(ro, planeP), planeN) / -denom; return t >= 0 ? t : -1; }
  return -1;
}
function trace(ro, rd) {
  var best = Infinity, hit = null;
  for (var i = 0; i < SPHERES.length; i++) {
    var t = hitSphere(ro, rd, SPHERES[i]);
    if (t >= 0 && t < best) { best = t; hit = SPHERES[i]; }
  }
  var tp = hitPlane(ro, rd);
  if (tp >= 0 && tp < best) { best = tp; hit = 'plane'; }
  return hit ? { t: best, o: hit } : null;
}
/* Surfaces, shadow tests, Phong lighting, recursive reflections — as in the C++. */
function planeColor(p) {
  var f = 0.125;
  var s = Math.cos(p[0] * 2 * PI * f) * Math.cos(p[2] * 2 * PI * f);
  var g = s > 0 ? 0.4 : 0;
  return [0.2 + g, 0.2 + g, 0.2 + g];
}
function surf(o, p) {
  if (o === 'plane') { var c = planeColor(p); return { n: planeN, ka: c, kd: c, ks: [1, 1, 1], shin: 42 }; }
  return { n: norm(sub(p, o[0])), ka: o[2], kd: o[2], ks: [1, 1, 1], shin: 42 };
}
function inShadow(p, n, L) {
  var toL = sub(L[0], p), d = len(toL), ld = smul(toL, 1 / d);
  var h = trace(add(p, smul(n, 1e-4)), ld);
  return h !== null && h.t < d;
}
function direct(origin, p, n, ph) {
  var view = norm(sub(origin, p));
  var res = [ph.ka[0], ph.ka[1], ph.ka[2]];
  for (var li = 0; li < LIGHTS.length; li++) {
    var L = LIGHTS[li];
    if (SHADOWS && inShadow(p, n, L)) continue;
    var toL = sub(L[0], p), dist = len(toL), ld = smul(toL, 1 / dist);
    var diffuse = smul(mul(ph.kd, L[2]), Math.max(0, dot(n, ld)));
    var refl = sub(smul(n, 2 * dot(n, ld)), ld);
    var spec = Math.pow(Math.max(0, dot(refl, view)), ph.shin);
    var specular = smul(mul(ph.ks, L[2]), spec);
    var k = L[1] / (dist * dist);
    res = add(res, smul(add(diffuse, specular), k));
  }
  return res;
}
function castRay(ro, rd, depth) {
  var bg = [0, 0, 0.2];
  if (depth > MAX_DEPTH) return bg;
  var h = trace(ro, rd);
  if (!h) return bg;
  var p = add(ro, smul(rd, h.t));
  var ph = surf(h.o, p);
  var color = direct(ro, p, ph.n, ph);
  if (REFL && len(ph.ks) > 0) {
    var dir = norm(add(smul(ph.n, 2 * dot(ph.n, smul(rd, -1))), rd));
    color = add(color, mul(ph.ks, castRay(add(p, smul(ph.n, 1e-4)), dir, depth + 1)));
  }
  return color;
}
/* Widget UI inside the mount. */
var mount = document.getElementById('rt-mount');
if (!mount) { return; }
var SIZE = 240;
mount.innerHTML =
  '<div class="rt">' +
    '<div class="rt-view">' +
      '<canvas id="rt-canvas" width="' + SIZE + '" height="' + SIZE + '"></canvas>' +
      '<div class="rt-status" id="rt-status">warming up…</div>' +
    '</div>' +
    '<div class="rt-side">' +
      '<label class="rt-opt"><input type="checkbox" id="rt-shadows" checked> Shadows <small>16 colored point lights</small></label>' +
      '<label class="rt-opt"><input type="checkbox" id="rt-refl" checked> Reflections <small>mirror rays to depth 5</small></label>' +
      '<button type="button" class="rt-btn" id="rt-render">Render again</button>' +
      '<p class="rt-note">A 1:1 port of the exercise’s C++ renderer — validated byte-identical to the native build at 600×600. This live render runs at ' + SIZE + '×' + SIZE + ' on your CPU; switch the effects off to feel what they cost.</p>' +
    '</div>' +
  '</div>';
var canvas = document.getElementById('rt-canvas');
var ctx = canvas.getContext('2d');
var img = ctx.createImageData(SIZE, SIZE);
var data = img.data;
var statusEl = document.getElementById('rt-status');
var btn = document.getElementById('rt-render');
var cbS = document.getElementById('rt-shadows');
var cbR = document.getElementById('rt-refl');
/* Progressive render loop (a few rows per animation frame). */
var row = 0, token = 0, t0 = 0;
function shootRow(j) {
  for (var i = 0; i < SIZE; i++) {
    var u = -1 + 2 * (i + 0.5) / SIZE;
    var v = 1 - 2 * (j + 0.5) / SIZE;
    var c = castRay([0, 0, 0], norm([u, v, -2]), 0);
    var k = (j * SIZE + i) * 4;
    for (var ch = 0; ch < 3; ch++) {
      var x = c[ch] < 0 ? 0 : c[ch] > 1 ? 1 : c[ch];
      data[k + ch] = (255 * x) | 0;
    }
    data[k + 3] = 255;
  }
}
function render() {
  REFL = cbR.checked; SHADOWS = cbS.checked;
  var my = ++token;
  row = 0; t0 = performance.now();
  btn.disabled = true;
  var step = function () {
    if (my !== token) return;
    var budget = performance.now() + 24;
    while (row < SIZE && performance.now() < budget) { shootRow(row++); }
    ctx.putImageData(img, 0, 0);
    var el = ((performance.now() - t0) / 1000).toFixed(2);
    if (row < SIZE) {
      statusEl.textContent = 'rendering… row ' + row + ' / ' + SIZE + ' · ' + el + ' s';
      requestAnimationFrame(step);
    } else {
      btn.disabled = false;
      statusEl.textContent = SIZE + '×' + SIZE + ' · ' + el + ' s · ' + (SIZE * SIZE).toLocaleString('en-US') + ' primary rays';
    }
  };
  step();
}
btn.addEventListener('click', render);
cbS.addEventListener('change', render);
cbR.addEventListener('change', render);
render();
})();
