/* EInf Student Organizer — interactive grade-simulator widget.
   Starts from the exact demo data of the screenshots; every number is
   recomputed with OopSim (the port of LeistungsRechner.java). */
(() => {
  const root = document.getElementById('oop-sim');
  if (!root || typeof OopSim === 'undefined') return;

  const DEMO = [
    { name: 'Einführung in die Informatik', ects: 5, kind: 's' },
    { name: 'Programmieren I', ects: 5, kind: 'n', note: 1.7 },
    { name: 'Mathematik für Informatiker I', ects: 6, kind: 'n', note: 2.3 },
    { name: 'Programmieren II', ects: 5, kind: 'n', note: 1.3 },
    { name: 'Datenstrukturen und Algorithmen', ects: 8, kind: 'n', note: 2.0 },
    { name: 'Lineare Algebra', ects: 6, kind: 'n', note: 3.0 },
    { name: 'Rechnernetze', ects: 5, kind: 'n', note: 1.0 },
    { name: 'Softwaretechnik', ects: 6, kind: 'n', note: 2.7 },
    { name: 'Betriebssysteme', ects: 5, kind: 'o' },
    { name: 'Theoretische Informatik', ects: 8, kind: 'o' },
    { name: 'Computergrafik', ects: 5, kind: 'o' },
    { name: 'Studienprojekt', ects: 5, kind: 's' },
  ];
  const NOTE_OPTIONS = [
    ['o', '– offen –'], ['1.0', '1,0'], ['1.3', '1,3'], ['1.7', '1,7'], ['2.0', '2,0'], ['2.3', '2,3'],
    ['2.7', '2,7'], ['3.0', '3,0'], ['3.3', '3,3'], ['3.7', '3,7'], ['4.0', '4,0'], ['5.0', '5,0'],
    ['s', 'Studienleistung'],
  ];
  let state = DEMO.map(r => ({ ...r }));

  const rowsEl = document.getElementById('sim-rows');
  const gpaEl = document.getElementById('sim-gpa');
  const projEl = document.getElementById('sim-proj');
  const needEl = document.getElementById('sim-need');
  const footEl = document.getElementById('sim-foot');
  const wishEl = document.getElementById('sim-wish');
  const wishValEl = document.getElementById('sim-wish-val');

  function fmt2(x) { return (Math.round(x * 100) / 100).toFixed(2).replace('.', ','); }

  function asModules() {
    return state.map(r => ({ ects: r.ects, istBenotet: r.kind !== 's', hatNote: r.kind === 'n', note: r.note || 0 }));
  }

  function noteKeyOf(r) { return r.kind === 'n' ? String(r.note) : r.kind; }

  function buildRows() {
    rowsEl.innerHTML = '';
    state.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'sim-row';
      const name = document.createElement('input');
      name.type = 'text'; name.value = r.name; name.className = 'sim-name'; name.setAttribute('aria-label', 'Modulname');
      name.addEventListener('input', () => { r.name = name.value; });
      const ects = document.createElement('input');
      ects.type = 'number'; ects.min = '1'; ects.max = '30'; ects.value = r.ects; ects.className = 'sim-ects'; ects.setAttribute('aria-label', 'ECTS');
      ects.addEventListener('input', () => { const v = parseInt(ects.value, 10); r.ects = Number.isFinite(v) && v > 0 ? v : 1; compute(); });
      const note = document.createElement('select');
      note.className = 'sim-note'; note.setAttribute('aria-label', 'Note');
      for (const [val, label] of NOTE_OPTIONS) {
        const o = document.createElement('option'); o.value = val; o.textContent = label; note.appendChild(o);
      }
      note.value = noteKeyOf(r);
      note.addEventListener('change', () => {
        if (note.value === 's') { r.kind = 's'; delete r.note; }
        else if (note.value === 'o') { r.kind = 'o'; delete r.note; }
        else { r.kind = 'n'; r.note = parseFloat(note.value); }
        compute();
      });
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'sim-del'; del.textContent = '×'; del.setAttribute('aria-label', 'Modul entfernen');
      del.addEventListener('click', () => { state.splice(i, 1); buildRows(); compute(); });
      row.append(name, ects, note, del);
      rowsEl.appendChild(row);
    });
  }

  function compute() {
    const mods = asModules();
    gpaEl.textContent = fmt2(OopSim.berechneNotendurchschnitt(mods));
    const wish = parseFloat(wishEl.value);
    wishValEl.textContent = wish.toFixed(1).replace('.', ',');
    const proj = OopSim.simuliereNotendurchschnitt(mods, wish);
    projEl.textContent = proj === null ? '–' : fmt2(proj);
    let html = '';
    for (let z = 1.0; z <= 3.0; z += 0.5) {
      const n = OopSim.benoetigteNoteFuerZiel(mods, z);
      const label = z.toFixed(1).replace('.', ',');
      html += '<div class="sim-need-row"><span>Für Endnote ' + label + '</span><b class="' + (n === null ? 'na' : 'ok') + '">'
        + (n === null ? 'nicht erreichbar' : 'Ø ' + fmt2(n) + ' nötig') + '</b></div>';
    }
    needEl.innerHTML = html;
    const fix = mods.filter(m => m.istBenotet && m.hatNote).reduce((s, m) => s + m.ects, 0);
    const offen = mods.filter(m => m.istBenotet && !m.hatNote).reduce((s, m) => s + m.ects, 0);
    const sl = mods.filter(m => !m.istBenotet).reduce((s, m) => s + m.ects, 0);
    footEl.textContent = fix + ' benotete ECTS · ' + offen + ' ECTS offen · ' + sl + ' ECTS Studienleistungen (ignoriert)';
  }

  document.getElementById('sim-add').addEventListener('click', () => {
    state.push({ name: 'Neues Modul', ects: 5, kind: 'o' });
    buildRows(); compute();
  });
  document.getElementById('sim-reset').addEventListener('click', () => {
    state = DEMO.map(r => ({ ...r }));
    wishEl.value = '2';
    buildRows(); compute();
  });
  wishEl.addEventListener('input', compute);

  buildRows();
  compute();
})();
