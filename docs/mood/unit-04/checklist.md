# Unit 04 mood gate — perf evidence & hero-moment checklist

**Status:** prepared for Rei's live walkthrough (Phase 7). Draw-call counts are
derived from the render graph (deterministic, verifiable without a GPU); **fps
and device are Rei's to record live** — this file is the instrument sheet.

**Reference device:** _pending_ (M3 Pro carried from Unit 03; re-verify on
M1-class if any number looks marginal — spec §4.4).
**Renderer settings at capture:** exposure 1.3, fog density 0.16 (interior),
fog color `#0b0a10`, ambient 0.05, bulb intensity 3.2 / distance 7 — all
byte-unchanged from Unit 03. **New knob this unit:** the edge-fog `RAMP` (width
4 rooms/floors, max density 0.32) in `atmosphere.ts`; identity outside the ramp,
so every Unit 03 interior pose is unaffected.

---

## 1. Perf evidence (spec §6.2 — draw calls ≤ 30)

Draw-call count is a pure function of the render graph (`RoomStream` +
`ShaftImpostor` + `EdgeVeil`), so it is derived here by construction and holds
at every coordinate. The 11-room working set is constant (KDD-3), so spawn and
mid-climb render the **same** graph — the count does not vary with position.

| Draw call source                                                |  Count |
| --------------------------------------------------------------- | -----: |
| Stone / wood / metal / void mega-instances                      |      4 |
| Bulb spheres (1 instanced mesh, 3 × 11)                         |      1 |
| Per-room book meshes (KDD-4 seam: 11 × 1)                       |     11 |
| Mirrors (current + horizontal neighbors)                        |      3 |
| Shaft impostor (§4.2.4, 1 instanced mesh)                       |      1 |
| Edge void plug / entrance void (only when an edge room is live) |    0–1 |
| **Total (interior)**                                            | **20** |
| **Total (worst case, at a ±64 edge)**                           | **21** |

- Lights are a **fixed pool of 12 `PointLight`s** repositioned on commit — never
  added/removed, zero shadow maps (C3), so they add **no** draw calls.
- `EdgeVeil` is one `ambientLight` + scene fog (`FogExp2`) — no draw call.
- **20 ≤ 30 with margin; the KDD-4 fallback (books current-floor-only → 5, total 14) is NOT needed.** If Rei's live counter disagrees, apply the fallback and
  record both numbers here.

| Position         | Live rooms | Draw calls (measured)        | fps       | Device    |
| ---------------- | ---------- | ---------------------------- | --------- | --------- |
| Spawn (`?debug`) | 11         | _pending Rei_ (≈20 analytic) | _pending_ | _pending_ |
| Mid-climb        | 11         | _pending Rei_ (≈20 analytic) | _pending_ | _pending_ |

> Open `?debug` at spawn and at a mid-climb position with the full 11-room set
> live; read the on-screen draw-call + fps counter and fill the table above.

---

## 2. Hero-moment poses (spec §4.4 — captures pending Rei)

1280×720 PNG via `?pose=N` after entry (deterministic — identical coordinate ⇒
identical loaded set ⇒ identical frame). Local framings for P5–P8 are
**provisional** until Rei tunes them at the gate; P7's coordinate (n=62 = edge −
ramp/2) is provisional until the ramp width is confirmed.

| Pose                                                            | Coordinate | Frame | fps | draw calls |
| --------------------------------------------------------------- | ---------- | ----- | --- | ---------- |
| P5 — mid-spiral, half a floor below a vestibule, down the shaft | (0, 0)     | ☐     | —   | —          |
| P6 — far doorway on the corridor axis, receding doorframes      | (0, 0)     | ☐     | —   | —          |
| P7 — near the n=64 edge, facing outward past the last room      | (62, 0)    | ☐     | —   | —          |
| P8 — on the stair where the destination floor first shows       | (0, 0)     | ☐     | —   | —          |

## 3. Objective floor (spec §4.4 — binary, Rei confirms live)

- [ ] **P5** — shaft reads bottomless: no terminator geometry resolves, ≥ 2
      repeated tiers visible before fog swallows the repetition.
- [ ] **P6** — ≥ 3 receding doorframes; no black void through any visible doorway.
- [ ] **P7** — fog visibly denser than the interior reference; no wall / clip /
      horizon terminator at the edge.
- [ ] **P8** — destination floor reads as a complete room: no missing walls, no
      pop-in void.
- [ ] All poses ≥ 60 fps on the reference device at ≤ 30 draw calls (device
      recorded; M1-class run if marginal, else carry the M3 Pro caveat).

## 4. Unit 03 regression (spec §4.4 — must hold)

- [ ] **P3 (book-wall close-up) byte-identical** — the knob canary; its frustum
      contains no doorway/shaft, so any diff means a lighting/fog/material change
      leaked. Verify once, then rely on it.
- [ ] P1/P2/P4 diffs are ONLY streamed geometry replacing void (expected); no
      lighting/fog character change on already-visible surfaces (forbidden).
- [x] Mechanical companion: `git diff` of `DEFAULT_ATMOSPHERE` + `Bulbs.tsx`
      values is empty (the ramp is additive; the frozen knobs are untouched).

> On re-baseline: Rei views before/after side by side; on approval, new captures
> replace old in `docs/mood/unit-03/` **with an amendment appended to
> `docs/mood/unit-03/checklist.md`** (date, cause, quoted unchanged knob values,
> re-blessing). Old captures live in git history only.

## 5. Deviations recorded (gate owner's direction)

- **Stair walk-band widened (Rei, Phase-7 walkthrough).** The helix felt like
  "squeezing to fit a perfect cutout": the player-center band `[STAIR_INNER_R
0.36, STAIR_OUTER_R 0.60]` was 0.24 m, narrower than the 0.56 m capsule, so
  collision pinned the body against the newel and the outer edge at once. Rei
  chose the collision-only fix (over re-modeling the stair): **`STAIR_OUTER_R`
  0.60 → 0.72** (`stair.ts`), a 0.36 m corridor with 0.22 m vertigo overhang
  past the tread; inner unchanged (clears the 0.055 newel). Treads visually
  untouched. **Pending Rei's re-walk to confirm the squeeze is gone.**
- **Edge traversal:** the ±64 walk is by design (a vast library). Evaluate the
  edge fog via `?pose=7` (n=62, in the ramp; room 64 + void plug live ahead).
  `WALKABLE_BOUND` (64) is frozen — coordinate doctrine; not changed.
