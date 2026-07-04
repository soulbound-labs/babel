# Unit 05 chills-gate — instrument sheet & checklist

**Status:** prepared for Rei's live walkthrough (Phase 7). Draw-call counts are
derived from the render graph (deterministic, verifiable without a GPU); **fps,
captures, and the chills judgment are Rei's to record live** — this file is the
instrument sheet.

**Reference device:** Apple M3 Pro (carried from Units 03/04).
**Renderer settings:** exposure 1.3, fog 0.16 `#0b0a10`, ambient 0.05, bulbs
3.2/7 — all byte-unchanged from Unit 03. **New knob this unit (KDD-8):** the
reading glow — `READ_GLOW_COLOR #ffc78f`, `READ_GLOW_INTENSITY 1.4`,
`READ_GLOW_DISTANCE 1.3`, decay 2, no shadow (defaults in `dimensions.ts`,
module `reading/reading-light.ts`). Tune live at the gate; record finals here.

**Controls (reviewable default):** look at a book + left-click = pull & open ·
left-click = next page · right-click = previous page · E = close and walk on.

---

## 1. Perf evidence (INV-B7 — ≤ 30 draw calls, book open, EDGE room)

Derived by construction from the render graph; the working set is constant, so
only the edge blocker varies with position.

| Draw call source                                   |     Count |
| -------------------------------------------------- | --------: |
| Unit 04 world (interior / edge, per its checklist) |   20 / 21 |
| Closed travelling book (hidden once open)          |         0 |
| Open book: covers+spine merged                     |         1 |
| Left page (blank vellum) + right/turning page      |         2 |
| Troika `<Text>` glyphs (one per open page face)    |         1 |
| Glyph pre-warm text (visible=false)                |         0 |
| Reading glow (1 non-shadow PointLight, pool 12→13) |         0 |
| **Total (book open, interior / edge)**             | **24/25** |

- 25 ≤ 30 at an edge with 5 spare — the single-`<Text>`-spread fallback (§4.2)
  is NOT expected to be needed. If Rei's `?debug` counter disagrees, apply it
  and record both numbers.
- The glow light is mounted permanently at intensity 0 while closed: constant
  light count ⇒ no shader relink hitch at book-open.

| Position                    | Draw calls (measured) | fps       | Device    |
| --------------------------- | --------------------- | --------- | --------- |
| Edge room (n=64), book open | _pending Rei_ (≈25)   | _pending_ | _pending_ |
| Origin room, book open      | _pending Rei_ (≈24)   | _pending_ | _pending_ |

## 2. Poses P9–P12 (golden address `{n:0, floor:0, wall:0, shelf:0, volume:0, page:0}`)

1280×720 PNG via `?pose=N`. Phases are pinned pose params (never wall-clock):
P9 `approach 0.5` · P10 `20/40 lines` · P11 `turnProgress 0.5` · P12 resolved.
Framings PROVISIONAL until the gate. **Captures pending Rei (operator-directed:
no agent browser automation)** — commit as `docs/mood/unit-05/pose-{9..12}.png`,
then re-render each twice and confirm pixel-hash-equal (determinism smoke §5).

| Pose                                         | Frame | fps | draw calls |
| -------------------------------------------- | ----- | --- | ---------- |
| P9 P-approach — book mid-travel, closed      | ☐     | —   | —          |
| P10 P-stream — 20 of 40 lines resolved       | ☐     | —   | —          |
| P11 P-turn — half-turned, silhouette curved  | ☐     | —   | —          |
| P12 P-resolved — full page, room dark behind | ☐     | —   | —          |

## 3. Objective floor (binary — mood-blind + `?debug` verifiable)

- [ ] **Approach**: book travels shelf→reading-rest on a monotonic eased path,
      arrives centred + upright; no snap/teleport frame.
- [ ] **Stream**: glyphs resolve line-by-line top-to-bottom at 16 lines/s, BOTH
      leaves in parallel (full spread 2.5 s); no spinner/progress/loading
      artifact anywhere; clean resolved/unresolved boundary; page flips
      (left/right click) refuse until the spread finishes resolving.
- [ ] **Turn**: continuous spine-pivot bend over 0.9 s; the silhouette CURVES
      (not a flat flip); no z-fighting / backface-black; glyphs ride the curl
      (P11).
- [ ] **Legibility**: at P12 all 40 lines individually distinguishable AND the
      room region behind the book stays fog-dark (diff the room area against
      Unit 03 P1/P4 — glow falloff must not lift wall/ceiling/fog).
- [ ] **Content**: page-0/line-0 glyphs of the origin book equal `line(golden)`
      (INV-B9 node-proved; spot-check the first line against
      `pnpm tsx scripts/print-golden.ts` if desired).
- [ ] **Audio**: rustle on each turn (lift + settle) over the continuing
      ambient bed; no rustle at master-gain level.
- [ ] **Standard floor**: 60 fps, ≤ 30 draw calls at every Unit 05 pose; DPR ≤
      1.5; no shadow/post; no visible horizon/sky.
- [ ] **Determinism smoke**: each of P9–P12 rendered twice → pixel-hash-equal
      (pre-warm all 29 glyphs; wait for troika sync before capturing).

## 4. Unit 03 mood-touch (§2.1 rule — reading glow enters P1–P4 frustums)

- [ ] Re-render P1–P4 at 1280×720 and prove **zero diff** against
      `docs/mood/unit-03/pose-{1..4}.png` (the glow is intensity 0 with no book
      open, so any diff is a regression or env drift — P3 is the arbiter, see
      `docs/mood/unit-05/baseline.md`). _Or record a Rei waiver here._

## 5. Reviewable defaults (agent discretion — Rei may redirect at the gate)

- **Left page = blank vellum** (only the right face streams; the turned page
  lands face-down). Chosen for budget + no text-pop at settle; a real spread
  (left face shows the previous page) is a small change if the blankness reads
  wrong.
- **Font**: Courier Prime subset (OFL, 3.2 KB, `public/fonts/`) — typewriter
  serif on vellum; monospace guarantees the 80-col grid. Swappable.
- **Retreat re-opens pages fully revealed** (only unread pages stream).
- **Cover-opening animation**: the closed book swaps to the open spread at
  arrival (no animated board rotation) — polish candidate.
- **P9 framing** pitches down 32° to catch the mid-travel book from shelf 0.

## 6. Chills-gate (the ceiling — Rei alone, non-delegable, no waiver)

Pull a book, watch the glyphs resolve out of the dark. Does it raise the hair
on the neck — _inviting / revelation / paper_?

> Approved by: _pending — Rei, live walkthrough, <date>_

---

These captures are the mood reference. Re-render the poses and compare before
changing anything that touches light, fog, or materials.
