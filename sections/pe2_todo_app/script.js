/* PE2 Todo App - in-browser classifier widget.
   The 38-token TF-IDF linear model from api/src/main/resources/model.pmml
   (Nyoka / sklearn LinearSVC, logit-normalized), ported to exact JS math.
   The widget itemizes the decision: tokenize -> idf x coef per matched
   token -> signed sum -> logit -> work/private. */
(function () {
  'use strict';
  var FEATURES = [["annual",3.901671313150098,0.5907660269009555],["appointment",4.220125044268633,-0.6714365514947505],["birthday",4.159500422452197,-0.6434050986789457],["book",3.8791984572980396,-0.9255281324993264],["budget",4.102342008612249,0.5684952509279042],["car",3.60832350316264,-1.2393928291518324],["cleaning",4.130512885578946,-0.6723691284141751],["client",4.048274787341974,0.7221939049840121],["club",3.8791984572980396,-0.9255281324993264],["deadline",4.353656436893155,0.7186460062063964],["dentist",4.220125044268633,-0.6714365514947505],["dinner",4.189353385601879,-0.6717644183001951],["family",4.189353385601879,-0.6717644183001951],["gardening",3.996981492954423,-0.9526528067809987],["getaway",3.7346172284869317,-0.6528115829096754],["grocery",3.948191328784991,-0.674046600301649],["gym",4.048274787341974,-0.6731604964565833],["house",4.130512885578946,-0.6723691284141751],["launch",4.048274787341974,0.9111263938548995],["maintenance",3.0037297199441397,0.0024848635300877],["marketing",4.130512885578946,0.6454595036169487],["meeting",2.8736765916959417,0.4555623806844179],["network",3.7738379416402132,1.2993659406086966],["party",4.159500422452197,-0.6434050986789457],["performance",3.8357133453583008,0.5563189538724808],["planning",2.881839902335103,-0.3009160794795793],["preparation",3.901671313150098,0.5907660269009555],["presentation",4.048274787341974,0.7221939049840121],["product",4.048274787341974,0.9111263938548995],["project",4.353656436893155,0.7186460062063964],["report",3.901671313150098,0.5907660269009555],["review",3.279141699804106,0.9300132935595897],["sales",3.7940406489577327,1.0244668348517967],["session",4.048274787341974,-0.6731604964565833],["shopping",3.948191328784991,-0.674046600301649],["strategy",4.130512885578946,0.6454595036169487],["team",3.8791984572980396,0.9343077895038296],["weekend",3.7346172284869317,-0.6528115829096754]]; /* [token, idf, coef] x38 */
  var INTERCEPT = -0.035138702109821;
  var WEIGHTS = {};
  FEATURES.forEach(function (f) { WEIGHTS[f[0]] = [f[1], f[2]]; });

  function tokenize(title) {
    return String(title).toLowerCase().split(/\s+/)
      .map(function (w) { return w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''); })
      .filter(function (w) { return w.length > 0; });
  }

  function classify(title) {
    var tokens = tokenize(title);
    var matched = [], z = INTERCEPT;
    tokens.forEach(function (t) {
      var f = WEIGHTS[t];
      if (f) { var w = f[0] * f[1]; matched.push([t, w]); z += w; }
    });
    return {
      tokens: tokens,
      matched: matched,
      z: z,
      p: 1 / (1 + Math.exp(-z)),
      cls: z > 0 ? 'work' : 'private'
    };
  }

  window.PE2Classifier = { classify: classify, tokenize: tokenize, size: FEATURES.length };

  var mount = document.getElementById('cls-mount');
  if (!mount) { return; }

  mount.innerHTML =
    '<div class="cls">' +
      '<input id="cls-input" type="text" autocomplete="off" spellcheck="false" ' +
        'placeholder="type a todo title \u2014 e.g. annual budget planning" value="annual budget planning">' +
      '<div class="cls-examples">' +
        '<button type="button" data-t="annual budget planning">annual budget planning</button>' +
        '<button type="button" data-t="team car">team car</button>' +
        '<button type="button" data-t="network car">network car</button>' +
        '<button type="button" data-t="fix the bug">fix the bug</button>' +
        '<button type="button" data-t="birthday party">birthday party</button>' +
        '<button type="button" data-t="buy oat milk">buy oat milk</button>' +
      '</div>' +
      '<div class="cls-out" id="cls-out"></div>' +
    '</div>';

  var input = document.getElementById('cls-input');
  var out = document.getElementById('cls-out');

  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function fmt(x) { return (x >= 0 ? '+' : '\u2212') + Math.abs(x).toFixed(2); }

  /* The deterministic keyword fallback from TodoClassifier#deterministicFallback -
     used by the backend only when the PMML evaluator cannot run at all. */
  var KW = ['deadline', 'meeting', 'task', 'work', 'bug', 'fix', 'urgent', 'report'];
  function kwFallback(title) {
    var s = String(title).toLowerCase();
    for (var i = 0; i < KW.length; i++) { if (s.indexOf(KW[i]) !== -1) { return 'work'; } }
    return 'private';
  }

  function render() {
    var r = classify(input.value);
    var h = '<div class="cls-verdict">' +
      '<span class="cls-pill cls-' + r.cls + '">' + r.cls + '</span>' +
      '<span class="cls-score">decision score z = ' + fmt(r.z) + '</span>' +
      '<span class="cls-prob">PMML logit \u2192 p(work) = ' + (r.p * 100).toFixed(1) + '%</span>' +
      '</div>';
    if (r.matched.length) {
      h += '<div class="cls-tokens">';
      r.matched.forEach(function (m) {
        h += '<span class="cls-tok ' + (m[1] >= 0 ? 'pos' : 'neg') + '">' +
             esc(m[0]) + ' <b>' + fmt(m[1]) + '</b></span>';
      });
      h += '</div><p class="cls-explain">Matched the vocabulary: each chip is one token\u2019s idf \u00d7 coefficient. ' +
           'The class is the sign of the intercept (' + fmt(INTERCEPT) + ') plus these contributions.</p>';
    } else {
      h += '<p class="cls-explain">No token of the 38-word vocabulary occurs in this title \u2014 the model scores the intercept alone (' +
           fmt(INTERCEPT) + ') \u2192 private.</p>';
    }
    var fb = kwFallback(input.value);
    if (fb !== r.cls) {
      h += '<p class="cls-divergence">Side note: the keyword fallback in the code would say <b>' + fb +
           '</b> here \u2014 the model disagrees. Exactly this kind of disagreement is what the ' +
           'PriorityCorrection feedback loop records for the next training round.</p>';
    }
    out.innerHTML = h;
  }

  input.addEventListener('input', render);
  Array.prototype.forEach.call(mount.querySelectorAll('.cls-examples button'), function (b) {
    b.addEventListener('click', function () { input.value = b.getAttribute('data-t'); render(); });
  });
  render();
})();
