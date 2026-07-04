# reading-glyphs.woff

Courier Prime Regular, subset to the 29-character Babel alphabet
(` abcdefghijklmnopqrstuvwxyz,.` — space + a–z + `,` + `.`), 3.2 KB.

- **Source:** https://github.com/quoteunquoteapps/CourierPrime (via
  https://github.com/google/fonts/tree/main/ofl/courierprime)
- **License:** SIL Open Font License 1.1. Copyright 2015 The Courier Prime
  Project Authors.
- **Why vendored:** troika-three-text falls back to a CDN-fetched default font;
  a committed local subset keeps glyph rendering offline-capable and capture
  deterministic (mood-gate §4.6 determinism preconditions). Monospace metrics
  guarantee the 80-column grid.
- **Regenerate:** `pyftsubset CourierPrime-Regular.ttf --text=" abcdefghijklmnopqrstuvwxyz,." --output-file=reading-glyphs.woff --flavor=woff --layout-features='' --no-hinting --desubroutinize`
