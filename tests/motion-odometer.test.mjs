/* Regression test for the odometer count-ups in assets/js/motion.js (QA-003).

   A KPI is only animated when its text is a single number plus an optional unit
   suffix. Compound values ("3840×2160", "32 · 16 · 5", "97–100%") used to match as
   "number + suffix", so they counted up from a fake zero and the middle numbers sat
   still. This drives the real script through a minimal DOM stub.

   Run: node --test tests/ */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(here, '..', 'assets', 'js', 'motion.js'), 'utf8');

function makeEl(tag) {
  const node = {
    tagName: tag,
    children: [],
    textContent: '',
    innerHTML: '',
    style: { setProperty() {} },
    classList: { add() {}, remove() {} },
    setAttribute() {},
    hasAttribute() { return false; },
    appendChild(child) { node.children.push(child); return child; },
    insertBefore() {},
    closest() { return null; },
    getBoundingClientRect() { return { top: 0, height: 0, bottom: 0 }; },
    querySelector(sel) { return sel === 'h2' ? null : makeEl('span'); },
    querySelectorAll() { return []; }
  };
  return node;
}

function kpi(text) {
  const b = makeEl('b');
  b.textContent = text;
  return b;
}

test('compound KPIs are not counters, single numbers still are', () => {
  const compound = kpi('3840×2160');
  const range = kpi('97–100%');
  const count = kpi('32 · 16 · 5');
  const plain = kpi('216');

  const section = makeEl('section');
  section.querySelectorAll = (sel) => (sel === '.kpi b' ? [compound, range, count, plain] : []);

  const main = makeEl('main');
  main.querySelectorAll = (sel) => (sel === '.project' ? [section] : []);

  const observers = [];
  class FakeObserver {
    constructor(cb) { this.cb = cb; this.targets = []; observers.push(this); }
    observe(target) { this.targets.push(target); }
    unobserve(target) { this.targets = this.targets.filter((t) => t !== target); }
    disconnect() { this.disconnected = true; }
  }

  const frames = [];
  const requestFrame = (cb) => { frames.push(cb); return frames.length; };

  const doc = {
    documentElement: { classList: { add() {} }, scrollHeight: 5000 },
    body: { appendChild() {} },
    createElement: (tag) => makeEl(tag),
    querySelector: (sel) => (sel === 'main' ? main : null)
  };
  const win = {
    innerHeight: 800,
    scrollY: 0,
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    IntersectionObserver: FakeObserver,
    requestAnimationFrame: requestFrame
  };

  /* the 30 s safety net would keep the runner alive for half a minute */
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = () => 0;
  try {
    new Function('window', 'document', 'IntersectionObserver', 'requestAnimationFrame', code)(
      win, doc, FakeObserver, requestFrame
    );
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }

  const observed = (el) => observers.some((o) => o.targets.includes(el));
  assert.equal(observed(compound), false, '3840×2160 must not be animated');
  assert.equal(observed(range), false, '97–100% must not be animated');
  assert.equal(observed(count), false, '32 · 16 · 5 must not be animated');
  assert.equal(observed(plain), true, 'a plain number must still be animated');

  /* The count-up itself never starts today: motion.js tests `en.isIntersecting` on the
     entries array instead of its first entry, so the callback is a no-op. Enabling it
     is a visible design change and is tracked as an open decision (QA-X4), so this
     test only pins the parsing rule — which is what decides whether a KPI is a
     counter at all. */
  for (const o of observers) {
    for (const target of o.targets.slice()) o.cb([{ isIntersecting: true, target }]);
  }
  assert.equal(compound.textContent, '3840×2160');
  assert.equal(range.textContent, '97–100%');
  assert.equal(count.textContent, '32 · 16 · 5');
  assert.equal(plain.textContent, '216');
});
