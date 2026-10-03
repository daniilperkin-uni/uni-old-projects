/* Validates the JS port (../sim.js) against the real Java LeistungsRechner.
   Reads tools/simulator-cases.csv produced by tools/MathProbe.java (id;spec;values)
   and replays every case through the port, comparing each double with strict
   equality (bit-identical). Run: node tools/validate-simulator.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const simCode = fs.readFileSync(path.join(here, '..', 'sim.js'), 'utf8');
const mod = { exports: {} };
new Function('module', 'exports', simCode)(mod, mod.exports);
const OopSim = mod.exports;

const cases = fs.readFileSync(path.join(here, 'simulator-cases.csv'), 'utf8').trim().split('\n');
const SIMW = [1.0, 2.0, 2.5, 3.0];
const NEEDZ = [1.0, 1.5, 2.0, 2.5, 3.0];

let cells = 0, ok = 0, casesOk = 0;
const fails = [];
for (const line of cases) {
  const [id, specStr, ...vals] = line.split(';');
  const modules = specStr.length ? specStr.split(',').map(part => {
    const [ectsS, kind, noteS] = part.split(':');
    const ects = Number(ectsS);
    if (kind === 's') return { ects, istBenotet: false, hatNote: false, note: 0 };
    if (kind === 'o') return { ects, istBenotet: true, hatNote: false, note: 0 };
    return { ects, istBenotet: true, hatNote: true, note: Number(noteS) };
  }) : [];
  const got = [OopSim.berechneNotendurchschnitt(modules),
    ...SIMW.map(w => OopSim.simuliereNotendurchschnitt(modules, w)),
    ...NEEDZ.map(z => OopSim.benoetigteNoteFuerZiel(modules, z))];
  let caseOk = true;
  for (let i = 0; i < got.length; i++) {
    cells++;
    const expectNaN = vals[i] === 'NaN';
    const pass = expectNaN ? got[i] === null : got[i] !== null && got[i] === Number(vals[i]);
    if (pass) ok++;
    else { caseOk = false; fails.push(id + ' col' + i + ': java=' + vals[i] + ' js=' + got[i]); }
  }
  if (caseOk) casesOk++;
}
console.log('cases: ' + cases.length + '  identical cases: ' + casesOk + '/' + cases.length);
console.log('value cells: ' + ok + '/' + cells + ' bit-identical (strict double equality)');
if (fails.length) {
  console.log('MISMATCHES:');
  fails.slice(0, 20).forEach(f => console.log('  ' + f));
  process.exit(1);
}
