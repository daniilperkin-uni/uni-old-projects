#!/usr/bin/env node
/* Stamps sections/<id>/section.html fragments into index.html. Run: node build.mjs */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const conf = JSON.parse(readFileSync(join(root, 'sections', 'sections.json'), 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const nav = [], parts = [], styles = [], scripts = [];
let live = 0;

for (const p of conf.projects) {
  const dir = join(root, 'sections', p.id);
  if (existsSync(join(dir, 'section.html'))) {
    live++;
    parts.push(readFileSync(join(dir, 'section.html'), 'utf8').trim());
    nav.push(`<a href="#${p.id}">${esc(p.name)}</a>`);
    if (existsSync(join(dir, 'style.css'))) styles.push(`<link rel="stylesheet" href="sections/${p.id}/style.css">`);
    if (existsSync(join(dir, 'script.js'))) scripts.push(`<script defer src="sections/${p.id}/script.js"></script>`);
  } else {
    parts.push(placeholder(p));
    nav.push(`<a class="dim" href="#${p.id}">${esc(p.name)}</a>`);
  }
}

function placeholder(p) {
  return `<section class="project placeholder" id="${p.id}"><div class="ph-card">
  <p class="chips"><span class="chip">${esc(p.kind)}</span><span class="chip">owner ${esc(p.owner)}</span></p>
  <h2>${esc(p.name)}</h2>
  <p>${esc(p.blurb)}</p>
  <p class="ph-note">Section in progress — ${esc(p.owner)} is preparing the captures. It appears here once
  <code>sections/${p.id}/section.html</code> is contributed and <code>node build.mjs</code> is re-run.</p>
</div></section>`;
}

let html = readFileSync(join(root, 'shell', 'template.html'), 'utf8');
html = html.split('<!-- @NAV@ -->').join(nav.join('\n'));
html = html.split('<!-- @SECTIONS@ -->').join(parts.join('\n'));
html = html.split('<!-- @SECTION_STYLES@ -->').join(styles.join('\n'));
html = html.split('<!-- @SECTION_SCRIPTS@ -->').join(scripts.join('\n'));
writeFileSync(join(root, 'index.html'), html);
console.log(`built index.html - ${conf.projects.length} sections, ${live} live, ${conf.projects.length - live} placeholder`);
