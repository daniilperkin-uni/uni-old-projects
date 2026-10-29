/* Regression test for zielStatus(): a target is only "achieved" when nothing the
   open modules can do would push the average past it. The widget used to answer
   "bereits erreicht" whenever the fixed average was already good enough, even
   though 18 ECTS were still open (QA-001).

   Run: node --test tests/ */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const simCode = fs.readFileSync(path.join(here, '..', 'sections', 'oop_student_organizer', 'sim.js'), 'utf8');
const mod = { exports: {} };
new Function('module', 'exports', simCode)(mod, mod.exports);
const OopSim = mod.exports;

const note = (ects, n) => ({ ects, istBenotet: true, hatNote: true, note: n });
const open = (ects) => ({ ects, istBenotet: true, hatNote: false, note: 0 });
const sl = (ects) => ({ ects, istBenotet: false, hatNote: false, note: 0 });

/* The widget's demo semester: 41 graded ECTS at 2.0488, 18 graded ECTS still open,
   10 ECTS Studienleistungen (ignored). */
const DEMO = [
  sl(5), note(5, 1.7), note(6, 2.3), note(5, 1.3), note(8, 2.0), note(6, 3.0),
  note(5, 1.0), note(6, 2.7), open(5), open(8), open(5), sl(5)
];

const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-12, `expected ${expected}, got ${actual}`);

test('demo semester: fixed average is 2.0488', () => {
  near(OopSim.berechneNotendurchschnitt(DEMO), 84.0 / 41);
});

test('demo semester: 2,0 needs a 1,89 average in the open modules', () => {
  const st = OopSim.zielStatus(DEMO, 2.0);
  assert.equal(st.status, 'needed');
  near(st.note, 34 / 18);
});

test('demo semester: 2,5 needs 3,53 — it is not already achieved', () => {
  const st = OopSim.zielStatus(DEMO, 2.5);
  assert.equal(st.status, 'needed');
  near(st.note, 63.5 / 18);
});

test('demo semester: 3,0 is secured — even 5,0 everywhere lands at 2,95', () => {
  const st = OopSim.zielStatus(DEMO, 3.0);
  assert.equal(st.status, 'achieved');
});

test('demo semester: 1,0 is impossible even with 1,0 in every open module', () => {
  assert.equal(OopSim.zielStatus(DEMO, 1.0).status, 'impossible');
});

test('nothing open and the average meets the target: achieved', () => {
  assert.equal(OopSim.zielStatus([note(10, 2.0)], 2.5).status, 'achieved');
});

test('nothing open and the average misses the target: no-headroom', () => {
  assert.equal(OopSim.zielStatus([note(10, 3.0)], 2.5).status, 'no-headroom');
});

test('out-of-range target is rejected', () => {
  assert.equal(OopSim.zielStatus(DEMO, 0.5).status, 'invalid');
  assert.equal(OopSim.zielStatus(DEMO, 4.5).status, 'invalid');
});
