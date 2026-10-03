# uni-old-projects

Showcase site for my uni projects — one page, one section per project.
Live at **https://daniilperkin-uni.github.io/uni-old-projects/** (GitHub Pages, deployed from this repo by Actions).

## Build & run

    node build.mjs      # stamps sections/<id>/section.html into index.html
    node serve.mjs      # serves this folder on http://localhost:8123

## Layout

- `shell/template.html` — page shell with `@NAV@` / `@SECTIONS@` / `@SECTION_STYLES@` / `@SECTION_SCRIPTS@` slots
- `assets/` — shared tokens, base styles, components, site.js (theme toggle, lightbox, before/after)
- `sections/<id>/` — one folder per project: `section.html` (required), optional `style.css` / `script.js`, `assets/` for images
- `sections/sections.json` — section order + placeholder metadata
- `index.html` — generated; never edit by hand

See FORMAT.md for the section contract.
