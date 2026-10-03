# Section format v1

Every project contributes exactly one folder: `sections/<id>/`.
Use the repo folder name as `<id>` (e.g. `pe2_todo_app`). Edit only your own folder — the build stamps everything into `index.html`, so nobody ever touches a shared file.

## Files

    sections/<id>/
      section.html   required — the whole section markup, starting with <section class="project" id="<id>">
      style.css      optional — auto-linked, section-scoped styles
      script.js      optional — auto-loaded (deferred) after the shared site.js
      assets/        your images (png/jpg/webp); reference as sections/<id>/assets/....png

`sections.json` already lists all six projects for the nav and placeholder cards — no edit needed: drop your `section.html` in, run `node build.mjs`, done.

## Look & feel

- Use the shared tokens (`var(--surface)`, `var(--text)`, `var(--accent)`, `var(--border)`, ...) from `assets/css/tokens.css`; light and dark themes are handled automatically.
- Light-theme tokens are WCAG-AA contrast-tuned (>=4.5:1); keep section colors on tokens instead of hardcoded hexes.
- `pe2_library_cli` is the reference implementation — copy its section structure when in doubt.

## Components (shared CSS + JS)

- Image slot with caption + lightbox — any `.shot img` opens a click-to-zoom lightbox automatically:
      <figure class="shot"><img src="sections/<id>/assets/x.png" alt=""><figcaption>Caption</figcaption></figure>
- Image strip: wrap several `.shot`s in `<div class="strip">` (auto-fit grid).
- Two-column layout: `<div class="grid-2">` (stacks on mobile).
- Full-bleed media: add `class="bleed"` to a wrapper.
- Before/after slider (capture pairs):
      <div class="ba"><img class="a" src="before.png"><img class="b" src="after.png"><input type="range" value="50"></div>
      Give the range input an aria-label ("Original vs filtered"); a generic default is applied when missing.
- Stats row: `<div class="kpis"><div class="kpi"><b>123</b><span>label</span></div></div>`
- Code/console block: `<div class="card code"><h3>Title</h3><pre>...</pre></div>` — long lines scroll inside the card (grid children are `min-width:0`, so wide content never blows out the page).
- Interactive widget mount: `<div class="mount" id="..."></div>` — put markup + JS in your own files.

## Rules

- UTF-8, no BOM; self-contained; no external requests (works offline on localhost).
- Rebuild after changing `section.html`: `node build.mjs`. Server: `node serve.mjs` → http://localhost:8123 (all other files are served live, no rebuild needed).
