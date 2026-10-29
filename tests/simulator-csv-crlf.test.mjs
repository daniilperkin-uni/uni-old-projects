/* Regression test for the simulator validator on a CRLF checkout (QA-006).

   core.autocrlf=true (the default on this machine) hands the CSV back with \r\n, so a
   plain split('\n') left a trailing \r on the last column and turned the "NaN" marker
   into "NaN\r" — 96 of 307 cases failed on a fresh clone. Runs the real validator
   against a CRLF copy of the data.

   Run: node --test tests/ */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.join(here, '..', 'sections', 'oop_student_organizer', 'tools');

test('validator passes on a CRLF copy of simulator-cases.csv', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uop-crlf-'));
  try {
    fs.mkdirSync(path.join(tmp, 'tools'));
    fs.copyFileSync(path.join(toolsDir, 'validate-simulator.mjs'), path.join(tmp, 'tools', 'validate-simulator.mjs'));
    fs.copyFileSync(path.join(toolsDir, '..', 'sim.js'), path.join(tmp, 'sim.js'));

    const lf = fs.readFileSync(path.join(toolsDir, 'simulator-cases.csv'), 'utf8');
    const crlf = lf.replace(/\r?\n/g, '\r\n');
    assert.ok(crlf.includes('\r\n'), 'fixture must actually be CRLF');
    fs.writeFileSync(path.join(tmp, 'tools', 'simulator-cases.csv'), crlf);

    const out = execFileSync(process.execPath, [path.join(tmp, 'tools', 'validate-simulator.mjs')], { encoding: 'utf8' });
    assert.match(out, /identical cases: 307\/307/);
    assert.match(out, /value cells: 3070\/3070/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
