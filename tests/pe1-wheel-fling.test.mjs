/* Regression test for the wheel's release velocity (QA-002).

   state.angle is normalized to (-360, 360), so a flick that crosses 0/360 used to be
   measured as a 340-degree drag in the opposite direction and launched the wheel at
   full speed backwards. The port now measures along the shorter arc, like
   WheelMath.shortestAngleDeltaDeg in the Java app it mirrors.

   Run: node --test tests/ */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(here, '..', 'sections', 'pe1_selection_wheel', 'script.js'), 'utf8');

/* The script exposes its math on window.SWMath before it looks for the canvas, so a
   bare window/document stub is enough to load it outside a browser. */
const win = {};
new Function('window', 'document', code)(win, { getElementById: () => null });
const SW = win.SWMath;

const speed = (a0, a1, t0, t1, max) => SW.computeInitialSpeedDegPerSec(a0, a1, t0, t1, max);

test('forward drag across 0/360 keeps its direction and speed', () => {
  assert.equal(speed(350, 10, 1000, 1100, 360), 200);
});

test('backward drag across 0/360 keeps its direction and speed', () => {
  assert.equal(speed(10, 350, 1000, 1100, 360), -200);
});

test('a displacement of exactly half a turn is no drag', () => {
  assert.equal(speed(-180, 180, 5, 1005, 720), 0);
});

test('a displacement of a whole turn is no drag', () => {
  assert.equal(speed(0, 360, 1000, 1100, 360), 0);
});

test('multi-turn angles reduce to the shorter arc', () => {
  assert.equal(speed(0, 100000, 0, 1, 360), -360);
});

test('plain drags are unchanged', () => {
  assert.equal(speed(0, 20, 1000, 1100, 360), 200);
  assert.equal(speed(0, -20, 1000, 1100, 360), -200);
});

test('speed is clamped to the maximum and zero elapsed is a no-op', () => {
  assert.equal(speed(0, 90, 1000, 1100, 360), 360);
  assert.equal(speed(0, 90, 1000, 1000, 360), 0);
});

test('a negative elapsed time is not a fling', () => {
  /* Java treats any non-positive span as no drag; the port only guarded === 0. */
  assert.equal(speed(0, 90, 1000, 500, 360), 0);
});

test('a drag step that touches the vertical diameter is not dropped', () => {
  /* prev sits exactly on the vertical line through the centre (dx === 0), curr is
     due right of it: a quarter turn. The slope form divided by the zero dx and
     returned 0, so the wheel ignored the step. */
  const delta = SW.dragDeltaDeg({ x: 100, y: 50 }, { x: 150, y: 100 }, { x: 100, y: 100 });
  assert.ok(Math.abs(delta - 90) < 1e-9, 'expected 90, got ' + delta);
});

test('a drag delta across the 180 degree boundary stays short', () => {
  const delta = SW.dragDeltaDeg({ x: -10, y: 1 }, { x: -10, y: -1 }, { x: 0, y: 0 });
  assert.ok(Math.abs(delta) < 180, 'expected a short arc, got ' + delta);
});
