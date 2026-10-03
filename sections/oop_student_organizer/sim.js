/* OOP Student Organizer — grade-simulator math.
   Exact port of com.example.einf.LeistungsRechner (Java 21): same operations,
   same order, so the double arithmetic is bit-identical. Used by script.js in
   the browser and by tools/validate-simulator.mjs in Node.
   null == Java Optional.empty() */
const OopSim = (() => {
  // LeistungsRechner.berechneNotendurchschnitt — ECTS-weighted average
  function berechneNotendurchschnitt(module) {
    let summeNoteEcts = 0.0;
    let summeBenoteteEcts = 0;
    for (const m of module) {
      if (m.istBenotet && m.hatNote) {
        summeNoteEcts += m.note * m.ects;
        summeBenoteteEcts += m.ects;
      }
    }
    if (summeBenoteteEcts === 0) return 0.0;
    return summeNoteEcts / summeBenoteteEcts;
  }

  // LeistungsRechner.simuliereNotendurchschnitt — "what would be if...?"
  function simuliereNotendurchschnitt(module, wunschnote) {
    if (wunschnote < 1.0 || wunschnote > 4.0) return null;
    let summeNoteEcts = 0.0;
    let summeBenoteteEcts = 0;
    for (const m of module) {
      if (!m.istBenotet) continue;
      const note = m.hatNote ? m.note : wunschnote;
      summeNoteEcts += note * m.ects;
      summeBenoteteEcts += m.ects;
    }
    if (summeBenoteteEcts === 0) return null;
    return summeNoteEcts / summeBenoteteEcts;
  }

  // LeistungsRechner.benoetigteNoteFuerZiel — "what do I need for X?"
  function benoetigteNoteFuerZiel(module, zielnote) {
    if (zielnote < 1.0 || zielnote > 4.0) return null;
    let fixNoteEcts = 0.0;
    let fixEcts = 0;
    let offenEcts = 0;
    for (const m of module) {
      if (!m.istBenotet) continue;
      if (m.hatNote) {
        fixNoteEcts += m.note * m.ects;
        fixEcts += m.ects;
      } else {
        offenEcts += m.ects;
      }
    }
    if (offenEcts === 0) return null;
    const rest = zielnote * (fixEcts + offenEcts) - fixNoteEcts;
    const noetig = rest / offenEcts;
    if (noetig < 1.0 || noetig > 5.0) return null;
    return noetig;
  }

  return { berechneNotendurchschnitt, simuliereNotendurchschnitt, benoetigteNoteFuerZiel };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = OopSim;
