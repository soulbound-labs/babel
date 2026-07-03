# Unit 04 — Staircase & Inter-Room Traversal: Technical Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: Architect Agent (composed from coordinate / render / audio / mood-gate doctrine architects)
**Date**: 2026-07-03
**Brief**: `docs/tasks/ongoing/04-staircase/04-staircase-brief.md`
**Doctrines bound**: `coordinate`, `render`, `audio`, `mood-gate` (see `docs/doctrine/doctrine-manifest.yaml`)

---

## 1. Overview

### 1.1 Objective

Make the world traversable: walk the corridor of hexagons room to room (`n` axis), climb the spiral staircase floor to floor (`floor` axis), with rooms streaming deterministically around the player, coordinates staying exact `bigint`, no float jitter however far you travel, and loops provably closing in the running world. The traversable spiral over the fogged shaft is Hero Moment #1: descending it must feel bottomless.

### 1.2 Constraints (inherited from brief + Q&A)

- MUST: topology is a linear chain — each hexagon connects to exactly 2 horizontal neighbors; walkable space is the 2D grid `(n, floor)`.
- MUST: the staircase is continuously walkable — no teleport-with-transition.
- MUST: coordinates are exact `bigint` `(n, floor)`; render works in a local float frame (floating origin); render never mutates coordinates.
- MUST: loops close in the walkable world, inherited from the frozen ℤ² algebra — never re-implemented.
- MUST: walkable region bounded at **n ∈ [−64, 64], floor ∈ [−64, 64]** (Q&A resolution); edge presented as thickening fog + soft invisible stop. `WALKABLE_BOUND = 64n` is exported for Unit 07 (co-location radius is the same number).
- MUST: locomotion extends WASD + mouselook — you walk up stairs; no "go up" button.
- MUST: consume only the frozen `@/domain` barrel (`src/domain/entities/index.ts`) and `src/domain/ports`; **zero changes** under `src/domain/entities/**`.
- MUST: perf budget per render doctrine §4 — ≤ 30 draw calls total, DPR clamp ≤ 1.5, no shadow maps, no post-processing, 60 fps target on mid-iGPU (M1 / Iris Xe class).
- MUST: deterministic presentation — no `Math.random()` under `src/presentation/**`; streaming is a pure function of the player coordinate.
- MUST NOT: add runtime dependencies. Everything ships on three + R3F primitives already installed (Q&A #8).
- MUST NOT: soften the vertigo (Q&A: **vertigo is the feature**). Railing + fog are the only occlusion.
- MUST NOT: reshape the spiral cross-section — `STAIR_RADIUS` 0.78, rise per turn = `CEILING_HEIGHT`, `TREADS_PER_TURN` 12 are frozen (Unit 03 spec §7.3). World _placement_ of the stair axis is not frozen (see §3, KDD-1).
- SHOULD: keep code WebGPU-swap-friendly — no `WebGLRenderer`-specific calls outside `atmosphere.ts` (Q&A #7; already the case).

### 1.3 Success Criteria (binary)

- Scripted loop-closure test green: climb one floor, walk forward, descend, walk back ⇒ final `coordinate` strictly equals `ORIGIN` (bigint equality) and `hash(final) === hash(ORIGIN)`.
- Standing invariant holds under fast-check: at every step, `coordinate === reduce(moveLog)`.
- `?debug` HUD shows **≤ 30 draw calls** with the full 11-room working set live.
- Moves whose destination leaves ±64 are refused and never appear in the move log (property-tested).
- Unit 03 pose P3 re-render is byte-identical after all changes (knob canary).
- Rei's recorded verdict on the descent walkthrough in `docs/mood/unit-04/checklist.md` (human gate — see §8 Phase 7).
- Full gate green: `pnpm compile` · `pnpm test:unit:ci` · `pnpm lint`.

---

## 2. Scope

| In Scope                                                       | Out of Scope                                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Walkable spiral staircase (collision, climb, vertical commits) | Book content, glyph streaming, page-turns (Unit 05)                                       |
| Inter-room movement + threshold-crossing `applyMove` semantics | PBR assets, volumetric fog, real mirror reflection (Unit 06)                              |
| 11-room deterministic streaming working set                    | Multiplayer avatars (Unit 07) — but `PlayerState` compatibility preserved                 |
| Floating-origin re-basing (exact bigint deltas only)           | Search / out-of-box coordinates (Unit 08)                                                 |
| ±64 bound: move gating + edge fog ramp + edge blockers         | 6-way honeycomb topology                                                                  |
| Shaft parallax illusion (repeating slices + fog)               | Post-processing of any kind                                                               |
| R1 vestibule stair alcove (geometry relocation)                | Unfreezing `dimensions.ts` constants or the spiral cross-section                          |
| Per-room bulb-hum emitters, footsteps, shaft drone             | Asset-based audio (Unit 06)                                                               |
| Poses P5–P8, Unit 04 mood gate, Unit 03 re-baseline protocol   | New reference _devices_ (M1-class run required only if marginal; record caveat otherwise) |

**External dependencies**: none new. Uses `three ^0.185.1`, `@react-three/fiber ^9.6.1`, `@noble/hashes` (indirectly via frozen `hash`). `@react-three/drei` present but not required by this unit.

**Auth**: n/a — fully client-side unit; no Convex surface touched.

---

## 3. Key Design Decisions

### KDD-1: R1 stair alcove (USER-APPROVED)

> **Insight**: The shipped Unit 03 vestibule places the stairwell hole (r = 0.84 m) on the door-to-door walk line, leaving 0.16 m floor strips vs the 0.56 m a 0.28 m-radius player needs — and crossing on the helix itself imposes a ±1.0 m height change (rise/turn = 2.0). Corridor traversal and a walkable stair cannot coexist with the current placement. This is arithmetic, not taste.

**Decision (user-approved in Q&A)**: move the stair **axis** laterally into an alcove bulge on the vestibule's −x flank (axis ≈ x = −0.55, z = `STAIR_CENTER_Z`); the flank wall bulges from x = −1.0 to ≈ −1.45 over z ∈ [−4.15, −2.3]. A straight walk lane x ∈ [+0.30, +1.00] (0.70 m clear) runs past the mirror to a far-cap door centered at x ≈ +0.55.

| Approach                | Behavior                                          | Problem                                                              |
| ----------------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| Widen `VESTIBULE_WIDTH` | Lane + stairwell side by side                     | Unfreezes a dimension seam consumed by Units 05/06 mid-parallel      |
| Route through the helix | Cross at constant floor                           | Geometrically impossible (pitch-invariant ±1.0 m / headroom ≈ 1.0 m) |
| **R1 alcove**           | Spiral byte-identical; only world placement moves | Vestibule look changes → mood re-gate (handled, §8 Phase 7)          |

Consequences: `Vestibule.tsx` slab/flank geometry changes; −x closet doorway nudges ~0.5 m toward the hexagon; successive room centers drift laterally +0.55 m per horizontal hop (invisible under floating origin; the corridor reads straight from inside). A happy corollary of rise/turn = `CEILING_HEIGHT`: the helix crosses each floor level at the same azimuth every floor, so "climb one full turn → same vestibule, one floor up" is a property of the frozen geometry — the deterministic up/down rule is free.

### KDD-2: One threshold crossing ⇒ exactly one `applyMove`; the move log IS the coordinate

> **Insight**: Loop closure (INV-1) and inverse-undo (INV-3) are properties of the frozen algebra. The traversal layer inherits them for free **iff** it emits moves faithfully — one symmetric plane per portal, one `Move` per crossing, no debouncing, no coalescing.

Traversal is a pure state machine `{ coordinate, moveLog }`. Standing invariant, checkable at any frame: `coordinate === reduce(moveLog, start)`. The ±64 bound **gates move emission** (refused move never enters the log); it never clamps a coordinate after `applyMove` — clamping desynchronizes log from coordinate and breaks the invariant. This mirrors the coordinate doctrine's `ROOM_MAX` precedent: walkability policy lives outside the lattice.

### KDD-3: Constant 11-room working set, adjacent floors unconditionally live

> **Insight**: A mid-climb "load trigger" is a pop waiting to happen while you look down the stairwell. If floors ±1 are always live, no trigger exists and nothing can pop.

`liveRooms(coordinate)` returns a constant-shape set: current floor n ∈ [p−2, p+2] (5 rooms); floors ±1 with n ∈ [p−1, p+1] (3 each); **11 rooms, always**. Trigger = coordinate change only. Fog (density 0.16 ⇒ ~95 % occlusion at ~11 m; room pitch ≈ 5.86 m) guarantees the set edge is never visible. Unload is instance-matrix rewrite over fixed-capacity pools — zero allocation in `useFrame`. (Chebyshev R=2 [25 rooms] was considered and rejected: diagonals beyond ±1 floor are never visible; the 11-set is smaller and satisfies the correctness floor — the destination room is always resident before its threshold plane is reachable.)

### KDD-4: Per-room book meshes; per-material mega-instancing for everything else

> **Insight**: The `instanceId === slot` book mapping is frozen and Unit 05 builds on it in parallel. One 7040-instance mega-mesh would rewrite that seam mid-flight; eleven 640-instance meshes preserve it — room identity comes from _which mesh_ the ray hit.

Draw-call ledger (target ≈ 23 ≤ 30): stone shell ×11 instanced = 1 · wood (shelves+spiral) = 1 · metal railing = 1 · void volumes (edge blockers only) = 1 · bulb spheres = 1 · books = 11 · mirrors (current + 2 horizontal neighbors) = 3 · shaft impostor = 1 · edge veil ≤ 2. Fallback if M1-class measurement disagrees: books current-floor-only (−5 calls), with HUD evidence recorded.

**Lights**: fixed pool of 12 `PointLight`s (3 × {current, n−1, n+1} + 3 nearest-shaft vestibule bulbs on floors ±1), repositioned on transition, never added/removed — constant light count means the shader program never relinks. All other live rooms get emissive spheres only.

### KDD-5: Per-room audio emitters, not a pool

> **Insight**: Audio doctrine §3 couples bulb ↔ hum intentionally ("light and its sound never desynchronize"). A repositioned pool reintroduces exactly that desync risk; the node budget (~20–40 hums ≈ 120–240 nodes) makes pooling unnecessary.

Hums follow room streaming lifecycle 1:1. The hush stays app-lifetime and global. Emitters and the listener share the **render-local float frame**; on re-base, emitter repositions and the listener pose update land **in the same frame** (render-side obligation).

---

## 4. Architecture

### 4.1 Domain layer (coordinate doctrine)

**No changes to `src/domain/entities/**`. None.** Unit 04 consumes the frozen barrel only: `Coordinate`, `Move` (`'forward' | 'back' | 'up' | 'down'` — exactly 4, never extended), `ORIGIN`, `applyMove`, `invertMove`, `reduce`, `hash`.

Binding rules carried verbatim from `docs/doctrine/coordinate-doctrine.md`:

1. "**Coordinates are `bigint`.** Never `number`."
2. "The render layer never does global float math — it works in a **local float frame around a bigint origin**… Do not 'simplify' coordinates to `number`; it silently corrupts everything past ~9×10¹⁵."
3. "MVP ships **exactly 4 moves**… do not add moves to `Move` without a spec."
4. "`floor` is the _vertical world axis_ (stairs), an unbounded signed `bigint`. It is not a Y pixel, not a screen row, not non-negative."
5. "`moveVector` and the pairing are **private** to the domain — downstream units never import them."

Spec-level invariants (numbered; each has a test in §7):

- **T-1** `PlayerState.coordinate` is the sole spatial source of truth; render derives everything per frame. Only the traversal machine calls `applyMove`; render/input code never constructs or mutates a `Coordinate`.
- **T-2** One physical threshold crossing emits exactly one `Move`; re-crossing the same plane emits `invertMove(m)`. The plane is single and symmetric per portal. Crossing chatter is _correct_ (nets to identity via INV-3), never debounced.
- **T-3** `coordinate === reduce(moveLog, start)` at every step (the standing invariant).
- **T-4** Mid-climb has **no coordinate**: between commit planes, `coordinate.floor` is the departure (or already the destination) floor; climb progress lives entirely in `localPosition.y`. No fractional coordinates, no 5th pseudo-move. **`floor` goes negative in this unit** — no `floor >= 0` assumption anywhere (streaming keys, working-set math, re-basing).
- **T-5** The ±64 bound gates emission via `canMove` **before** `applyMove`; refused moves never enter `moveLog` (KDD-2).
- **T-6** `Number()` conversion only for bounded relative deltas (`Number(roomN − playerN)`, |Δ| ≤ 2). Never convert absolute coordinates — Unit 08 ships out-of-bounds addresses; the habit must not form.
- **T-7** Streaming map keys use the frozen serialization `` `${n}:${floor}` `` (the hash preimage format). No `JSON.stringify` on coordinates (bigint throws), no `Number` keys, no third format. `hash(c)` is reserved for the Unit 06/07 seams.
- **T-8** No deep imports of `moveVector` or `pairing`. The traversal module defines its own `Move → world-frame delta` table (meters + axis orientation are presentation concepts). Policed by `boundaries/dependencies` lint + `pnpm script:verify-boundaries`.

**New pure modules** (framework-free; import only the frozen barrel; lint-legal under the presentation layer):

| Path                                        | Exports                                                                                                         | Purpose                                                                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/presentation/traversal/bounds.ts`      | `WALKABLE_BOUND = 64n`, `isWithinBounds(c)`, `canMove(c, m)`                                                    | Walkability policy. Unit 07 imports `WALKABLE_BOUND` from here — never re-declares 64. All comparisons bigint.                         |
| `src/presentation/traversal/traversal.ts`   | `TraversalState { coordinate, moveLog }`, `createTraversal(start?)`, `crossThreshold(state, m): TraversalState` | Pure state machine; gates via `canMove`; refused move returns state unchanged. No react/three imports.                                 |
| `src/presentation/traversal/working-set.ts` | `RoomSlot { coordinate, key, dn, dfloor }`, `liveRooms(c): RoomSlot[]`, `roomKey(c): string`                    | The 11-slot set (KDD-3); keys `` `${n}:${floor}` ``; deltas as small `number` per T-6; clamps at ±64 (absent rooms at the bound edge). |

### 4.2 Render layer (render doctrine)

Binding rules carried from `docs/doctrine/render-doctrine.md`: layer boundary (presentation imports only `domain/entities`, `domain/ports`, third-party, presentation); "No `Math.random()` anywhere under `src/presentation/**`"; §4 budget (≤ 30 draw calls, DPR ≤ 1.5, no shadows, no post-processing); §5 "Collision is analytic and pure — keep it that way"; §6 "Unit 04 owns inter-room streaming, stair walkability, and the shaft parallax fake" — the Unit 03 blockers (side-0 invisible collider + void volume, vestibule far cap) exist precisely for this unit to replace correctly.

**Frozen seams honored** (no shape changes): `dimensions.ts` constants; `instancing.ts` (`BOOK_COUNT`, `bookToSlot`/`slotToBook`/`slotTransform`, `instanceId === slot`); `LocomotionHandle { suspend, resume, state }` (one camera, one owner — this unit extends movement _underneath_; Unit 03's `coordinate: ORIGIN` pin retires); `AtmosphereProfile`/`applyAtmosphere` seam; `MirrorSurface` `reflection` prop; `BULB_POSITIONS` (replicated per room at identical local offsets).

#### 4.2.1 Floating origin & commit rules

Local frame is anchored to the current room (current room at local origin). On commit, in one frame:

1. `state = crossThreshold(state, m)` (traversal machine → `applyMove`).
2. `localPosition` shifts by the exact negation of the world shift — horizontal: Δx = ∓0.55, Δz = ±`ROOM_PITCH` (= 2·`HEX_APOTHEM` + `VESTIBULE_DEPTH`); vertical: Δy = ∓`CEILING_HEIGHT`.
3. All 11 instance matrices + light pool + emitter positions + listener pose recompute from the new coordinate **in the same frame**. Camera and world shift by the identical float delta: screen-space no-op, no pop.

Commit planes (deterministic, symmetric per T-2):

- **Horizontal**: the door threshold plane of the shared wall between vestibule far door and the next room's entrance.
- **Vertical**: stair height crossing ±`CEILING_HEIGHT`/2 relative to the departure floor, with a **±0.2 m hysteresis band** so hovering on the mid-turn tread cannot flap the coordinate. Hysteresis is legal per the coordinate architect: each _logical_ crossing still emits exactly one move and the band is symmetric.

This convention is **fixed once shipped** — Unit 07 presence interprets `coordinate.floor` by it.

#### 4.2.2 Stair collision & climb (analytic — no mesh collision, no physics engine)

New pure module `src/presentation/render/player/stair.ts`: cylindrical parameterization around the (alcove-relocated) stair axis. `stairSurfaceY(θ)` = ramp `(θ/2π)·CEILING_HEIGHT` snapped to tread tops; tread rise = 2.0/12 ≈ 0.167 < `MAX_STEP` 0.25, so tread-quantized steps always resolve. Player-center annulus r ∈ [0.36, 0.60] (slight capsule overhang allowed — vertigo per Q&A; `RAILING_KEEPOUT` still prevents crossing the room railing). A landing sector cell joins the walk lane to the helix at each floor's repeat azimuth.

`locomotion.ts` gains a surface mode (`'floor' | 'stair'`): y = `surfaceY + EYE_HEIGHT` instead of the flat lock; `stepLocomotion(state, input, dt)` stays pure. `collision.ts` cells become room-relative (generated per live-room offset, still pure): `STAIR_ZONE_DEPTH` blocker and `ENTRANCE_BLOCK_DEPTH` blocker + far cap are **removed for connected rooms** and **kept only on the outward side of edge rooms** (|n| = 64; stair cell caps θ at floor ±64). Rejection semantics unchanged: slide ≤ 3 iterations, reject-don't-tunnel, `MAX_FRAME_DELTA` clamp.

#### 4.2.3 Streaming components

| Path                                                    | Purpose                                                                                                                                                                                                                                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/presentation/render/world/streaming.ts` (new)      | Pure: `RoomSlot[]` → local transforms; consumes `traversal/working-set.ts`; bigint deltas only (T-6)                                                                                                                                                |
| `src/presentation/render/world/origin.ts` (new)         | Pure re-base math: commit-plane detection, hysteresis, exact local-position shift                                                                                                                                                                   |
| `src/presentation/render/world/RoomStream.tsx` (new)    | Maps live set → instance matrices for per-material mega-meshes + 11-book-mesh pool + 12-light pool (KDD-4). Each book mesh carries its room offset in `userData` (Unit 05 seam: room identity = which mesh was hit; `instanceId === slot` per mesh) |
| `src/presentation/render/world/ShaftImpostor.tsx` (new) | §4.2.4                                                                                                                                                                                                                                              |
| `src/presentation/render/world/EdgeVeil.tsx` (new)      | §4.2.5                                                                                                                                                                                                                                              |

`WorldScene.tsx` composes `RoomStream`/`ShaftImpostor`/`EdgeVeil` in place of the single-room children; `dpr={[1, 1.5]}` and camera untouched. `Shaft.tsx` drops its placeholder tubes (impostor supersedes; railing kept). `Staircase.tsx` renders one inter-floor turn per room (impostor continues beyond); cross-section constants byte-identical.

#### 4.2.4 Shaft illusion (Hero Moment support)

One `InstancedMesh` of a low-poly floor-slice impostor (hex rim + railing ring + stair-turn silhouette) at y = d·`CEILING_HEIGHT` for d ∈ {±2, ±3, ±4} — floors ±1 are real rooms, so slices render only beyond the live set. Fog swallows them by ~11 m; the point where repetition ends is not identifiable. **Consistency rule (binding)**: the slice at Δfloor = d sits exactly where `liveRooms` would place the real room — what you see down the shaft is literally where the stairs take you. Slice positions are a pure function of the coordinate and shift on re-base like everything else. Near |floor| → 64, slices beyond the bound are absent: the shaft ends in fog, matching the walkable stop. Geometry + `FogExp2` only — no post-processing.

#### 4.2.5 The ±64 edge

- **Soft stop**: `canMove` refuses the move (no log entry); the boundary room keeps the Unit 03-style invisible blocker + void volume on its outward side. No "wall" ever renders.
- **Thickening fog**: through the atmosphere seam only — see §4.4 (mood-gate). `EdgeVeil.tsx` computes bigint distance-to-edge from the exact coordinate (converted to small `number` only inside the ramp zone) and calls `applyAtmosphere(scene, gl, atmosphereAt(...))`. No component constructs `FogExp2` or touches `scene.fog` directly.

### 4.3 Audio layer (audio doctrine)

Binding rules carried from `docs/doctrine/audio-doctrine.md`: the `AudioBus`/`AudioEmitter` API is **frozen** — this unit requires zero changes to `audio-bus.ts` (if any seem needed, that is a spec bug: escalate, don't edit); "bus disposal closes the `AudioContext` — a disposed bus is dead, not dormant"; whole-stack creation stays inside the single `useEffect` in `src/app/App.tsx` (StrictMode fix — do not restructure); "Footsteps (Unit 04)… are just more emitters on this same bus — that is the frozen contract."

| Path                                           | Purpose                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/presentation/audio/room-hums.ts` (new)    | `startRoomHums(bus, ctx, bulbLocalPositions): RoomHumsHandle { reposition(positions), dispose() }` — per-streamed-room bulb hums (KDD-5), `distanceModel 'inverse'`, `refDistance 0.8`, `rolloff 1.4`, `HUM_GAIN 0.035`                                                                                                                                      |
| `src/presentation/audio/footsteps.ts` (new)    | `createFootsteps(bus, ctx): FootstepsHandle { step(surface: 'stone' \| 'stair'), dispose() }` — ONE `ambient`-kind emitter (feet are head-locked; a panner is wrong); seeded xorshift32 noise bursts through a bandpass (stone: lower/duller, longer decay; stair: brighter, shorter); buffers precomputed once; per-step variation deterministically seeded |
| `src/presentation/audio/shaft-drone.ts` (new)  | USER-APPROVED: procedural low drone (seeded filtered noise, lowpass ~80–120 Hz), near-threshold gain, one positional emitter at the current vestibule's shaft axis, re-based like any emitter. Cut-able at the mood gate: if it doesn't land, it is **deleted, not tuned up**                                                                                |
| `src/presentation/audio/ambient.ts` (refactor) | Hush stays app-lifetime; the hum block (currently lines ~76–109) moves to `room-hums.ts`. The **origin room's hums arrive via the streaming path like every other room's** — one code path. This touches Unit 03's shipped `ambient.ts` + `App.tsx` wiring (explicit change, recorded here)                                                                  |

Lifecycle MUSTs (spec-binding):

1. MUST NOT create any new `AudioContext`; all Unit 04 sound reuses the app-lifetime bus.
2. MUST NOT call `bus.dispose()` in streaming/traversal code — room unload disposes _emitters_ only.
3. Per-room hum create/dispose lives in one effect (create in body, dispose in cleanup) — StrictMode-safe; emitter `dispose()` is idempotent by contract.
4. Streaming while the context is suspended (pre-entry-gesture) is fine; MUST NOT add per-room `resume()` calls.
5. Loudness tuning at per-module gain constants only — never `setMasterGain`.
6. Rooms streaming back in build **fresh** source graphs — one-shot nodes (`OscillatorNode`/`BufferSource`) cannot restart after `stop()`.
7. Emitter positions and listener pose share the render-local float frame; re-base of both lands in the same frame (render-side obligation, §4.2.1 step 3). Discontinuous `positionX.value` jumps at near-threshold gain are acceptable — noted, not engineered around.

Footstep _triggers_ (stride cadence, stone-vs-stair classification) are locomotion/collision state — render calls `step(surface)`; audio only exposes it.

### 4.4 Mood-gate (cross-cutting; woven into Phases 1, 4, 7)

Binding rules carried from `docs/doctrine/mood-gate-doctrine.md`: §4 re-render-and-compare before changing anything touching light/fog/materials; tuning only within knob modules (`atmosphere.ts` + `Bulbs.tsx`); "Geometry and seams are not mood knobs"; failed checklist items need an explicit recorded waiver from Rei; unexplained capture diffs are never re-blessed until the source is found.

**Mood-touch rule (spec-binding, from the mood-gate architect)**: _a change touches mood iff it can alter any pixel of any committed pose — new geometry entering a committed pose's frustum touches mood whether or not any knob changed._ Knob-untouched is necessary but not sufficient. Unit 04 therefore triggers §4 by design (streamed rooms replace void in P1/P2/P4 sightlines); this is correct behavior, not a loophole to engineer around.

**Edge-fog knob**: new pure function in `src/presentation/render/atmosphere/atmosphere.ts` (the module's header already earmarks it for positional curves):

- `atmosphereAt(distanceToEdgeRooms: number, distanceToEdgeFloors: number): AtmosphereProfile` + a `RAMP` constant block (starting values: ramp width **4** rooms/floors; max density live-tunable at the gate).
- **Identity clause (MUST)**: outside the ramp zone, `atmosphereAt` returns `DEFAULT_ATMOSPHERE` — byte-identical interior experience; all Unit 03 poses unaffected. Only `fogDensity` (at most `fogColor`) ramps; `toneMappingExposure`, `ambientIntensity`, `background` never modulate. Pure and position-deterministic: at rest at coordinate X, density is exactly `f(X)` every session.
- `FogExp2` is scene-global, so "edge fog" = whole-scene density as a function of player coordinate, not spatially local fog. Stated so nobody reaches for volumetrics (Unit 06) or post-processing (forbidden).
- `DEFAULT_ATMOSPHERE`'s Unit 03 values (exposure 1.3, fog 0.16, fogColor `#0b0a10`, ambient 0.05, bulb 3.2/7) are frozen; the ramp is the only new knob, locked in the Unit 04 checklist after the gate.

**New poses** (append to `POSES` in `debug/poses.ts`; P1–P4 definitions untouched — they are load-bearing references):

- **P5** — mid-spiral, half a floor below a vestibule, pitched down the shaft axis (descent hero framing).
- **P6** — in a doorway on the corridor axis, yaw 0 down the chain (receding doorframes).
- **P7** — near the n = 64 edge, facing outward past the last room (exact coordinate chosen after the ramp width is confirmed at the gate).
- **P8** — on the stair at the first point the destination floor's room is visible through the opening.

P5–P8 need a **logical coordinate** in addition to local pose: extend `CameraPose` with an optional `(n, floor)` that `?pose=N` teleports to (streaming settles deterministically before capture — identical coordinate ⇒ identical loaded set ⇒ identical frame; if two renders of one pose ever differ, that is the §5 nondeterminism gotcha: fix the source, never re-bless).

**Objective floor** (binary; defaults recorded in Change Log): P5 shaft reads bottomless — no terminator geometry resolves, ≥ 2 repeated tiers visible before fog; P6 ≥ 3 receding doorframes, no black void through any visible doorway; P7 fog visibly denser than interior reference, no wall/clip/horizon terminator; P8 destination floor reads as a complete room — no missing walls, no pop-in void; all poses ≥ 60 fps on the reference device at ≤ 30 draw calls; device recorded (M1-class run required if marginal, else carry the M3 Pro caveat forward).

**Unit 03 regression protocol** (encoded as execution steps in §8): baseline re-render **before any change** (Phase 1, Step 1.1); re-render at each phase gate; classify — _expected_ diffs: streamed geometry replacing void in P1/P2/P4; _forbidden_ diffs: **P3 (book-wall close-up) must be byte-identical** (knob canary — verify its frustum contains no doorway/shaft once, then rely on it), and any lighting/fog character change on already-visible surfaces. Re-baseline honestly: Rei views before/after side by side; on approval, new captures replace old in `docs/mood/unit-03/` **with an amendment appended to `docs/mood/unit-03/checklist.md`** (date, cause, quoted unchanged knob values, Rei's re-blessing). Mechanical companion: `git diff` of `DEFAULT_ATMOSPHERE` + `Bulbs.tsx` values is empty. Old captures live in git history only.

The shaft impostor, stair mesh, and railing are **not mood knobs**: if P5 needs a different repeat count or tier spacing, that goes back through the implementation loop and re-triggers §4 — never a live tweak during the walkthrough.

### 4.5 Unit 05 coordination (parallel branch)

- With 11 book meshes live, Unit 05's raycast can hit a _neighbor_ room's books through a doorway. Room identity = the hit mesh's `userData` room offset; `instanceId === slot` preserved per mesh. Unit 05's spec should target "the current room's book mesh" explicitly.
- Both units touch `WorldScene.tsx`: merge-order note for the integration branch — Unit 04's `RoomStream` restructure should land first; Unit 05 rebases its scene additions onto it (smaller diff in that direction).

---

## 5. Error Handling

| Error                         | Cause                          | Handling                                                                                                                            |
| ----------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Move refused at bound         | Destination outside ±64        | Soft stop: state unchanged, move never logged; collision blocker prevents walking into void; no UI message (the fog is the message) |
| Unresolvable collision delta  | Slide iterations exhausted     | Reject — player stays put (Unit 03 semantics unchanged)                                                                             |
| Frame delta > 100 ms          | Tab switch / hitch             | `MAX_FRAME_DELTA` clamp (existing); no teleport, no double-commit (hysteresis band absorbs)                                         |
| Commit-plane flap             | Player idles on threshold      | Vertical: ±0.2 m hysteresis. Horizontal: chatter emits move pairs that net to identity (INV-3) — correct, not debounced (T-2)       |
| Pose param out of range       | `?pose=9` etc.                 | `parsePoseParam` returns null → spawn pose (existing behavior, extended range)                                                      |
| Audio context still suspended | Streaming before entry gesture | Emitters silently pending; entry click's `bus.resume()` activates (no per-room resume)                                              |
| Room re-entry silent          | Reused stopped one-shot node   | Forbidden by construction: fresh source graph per stream-in (§4.3 rule 6)                                                           |

---

## 6. Testing Strategy

All tests are pure/node vitest (jsdom has no WebGL; visual truth is the mood gate's job). fast-check available.

| Layer            | Test Focus                                                                            | Command                                               |
| ---------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Traversal (pure) | Bounds gating, move-log invariant, loop closure, working set                          | `pnpm test:unit:ci tests/unit/presentation/traversal` |
| Render (pure)    | Stair math, streaming set/transforms, re-base, collision walks, scripted loop closure | `pnpm test:unit:ci tests/unit/presentation/render`    |
| Audio            | Hum lifecycle/leaks, footstep determinism via fake `BusContext`                       | `pnpm test:unit:ci tests/unit/presentation/audio`     |
| Atmosphere/poses | `atmosphereAt` identity clause, frozen-pose regression                                | `pnpm test:unit:ci tests/unit/presentation/render`    |
| Full gate        | Everything                                                                            | `pnpm compile` · `pnpm test:unit:ci` · `pnpm lint`    |

Key test files (contents specified in §8 steps): `tests/unit/presentation/traversal/{bounds,traversal,loop-closure,working-set}.spec.ts`; `tests/unit/presentation/render/{stair,streaming,origin,loop-closure,collision,poses,atmosphere}.spec.*` (collision/world-scene extend existing files); `tests/unit/presentation/audio/{room-hums,footsteps}.spec.ts`. Existing `tests/unit/domain/coordinates/*.spec.ts` untouched (explicit non-goal). `tests/unit/presentation/audio/audio-bus.spec.ts` untouched and green (frozen-API sentinel).

Perf evidence is manual: `?debug` HUD draw-call count + fps with the full working set, recorded in `docs/mood/unit-04/checklist.md` (the evidence trail render doctrine §4/§5 demands).

---

## 7. Failure Modes (FMEA)

| #   | Failure Mode                                                     | Severity | Mitigation                                                                                                                                       |
| --- | ---------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Move log desyncs from coordinate (clamp-after-apply bug)         | Critical | T-5 gating (never clamp), T-3 standing invariant fast-check property; loop-closure test                                                          |
| 2   | Float jitter far from origin (absolute bigint→Number conversion) | Critical | T-6 delta-only rule; local coords bounded ±~9 m by construction; lint-able pattern (`Number(` near coordinate fields) checked in review phase    |
| 3   | Visible pop during re-base                                       | High     | Camera + world shift by identical delta in one frame (§4.2.1); matrices/lights/emitters/listener updated same frame                              |
| 4   | Streaming nondeterminism (async load-order leak)                 | High     | Streaming is a pure synchronous function of coordinate; no timers/promises in the set computation; double-render pose identity check at the gate |
| 5   | Draw calls exceed 30 with working set                            | High     | KDD-4 ledger ≈ 23; HUD evidence at Phase 3 gate; fallback: books current-floor-only (−5) with recorded evidence                                  |
| 6   | Shader relink hitches when light count changes                   | High     | Fixed 12-light pool, repositioned never added/removed                                                                                            |
| 7   | Coordinate flap mid-stair (commit chatter)                       | Medium   | ±0.2 m hysteresis; INV-3 nets horizontal chatter to identity                                                                                     |
| 8   | Web Audio node leak across a ±64-room walk                       | Medium   | Per-room `dispose()` on unload (never `setGain(0)` parking); leak test: N spawn/dispose cycles ⇒ zero live emitters on fake context              |
| 9   | StrictMode double-mount kills or doubles room audio              | Medium   | Create+cleanup in one effect per room; idempotent `dispose()`; app-lifetime stack untouched                                                      |
| 10  | Mood regression sneaks in via "unrelated" change                 | Medium   | P3 byte-identity canary at every phase gate; knob `git diff` empty check; §4 protocol steps in Phase 7                                           |
| 11  | Unit 05 branch conflict on `WorldScene.tsx` / book meshes        | Medium   | §4.5 seam notes; `instanceId === slot` per mesh preserved; merge-order note                                                                      |
| 12  | Stair unwalkable on some tread (step > MAX_STEP)                 | Low      | Tread rise 0.167 < 0.25 by frozen geometry; stair.spec asserts it                                                                                |

**Idempotency / rollback**: every step is a pure-code change gated by compile/test/lint — rollback is `git revert` of the step's commit. Capture re-baselining is append-only (amendment protocol); old captures recoverable from git history. No persistent state, no migrations, no external services.

---

## 8. Prompt Execution Strategy

<!-- PROTOCOL: docs/protocol/sdd/execution-format.md · COMPLETENESS: _SPEC-STANDARD.md §5 -->

### Phase 1: Baseline & Pure Traversal Modules

#### Step 1.1: Mood baseline zero (before ANY code change)

On the Unit 04 branch, before touching any file: run `pnpm dev`, open the app, and re-render Unit 03's committed poses P1–P4 via `?pose=1..4` at 1280×720. Compare each against `docs/mood/unit-03/pose-{1..4}.png` — they must be byte-identical (this proves the baseline reproduces, so later diffs are attributable to Unit 04, not env/DPR drift). Record the result (date, device, "P1–P4 byte-identical: yes/no") in a new file `docs/mood/unit-04/baseline.md`. If NOT identical: STOP — find the drift source before proceeding (mood-gate doctrine §5: never proceed on an unexplained diff).

Tools to use: Bash (dev server), Write (baseline.md)

##### Verify

- `test -f docs/mood/unit-04/baseline.md`

##### Timeout

600000

#### Step 1.2: Bounds module

Create `src/presentation/traversal/bounds.ts` per §4.1: `WALKABLE_BOUND = 64n` (bigint, exported), `isWithinBounds(c: Coordinate): boolean`, `canMove(c: Coordinate, m: Move): boolean` (= `isWithinBounds(applyMove(c, m))`). Import ONLY from the frozen barrel `@/domain` path used by existing presentation code (check `src/presentation/render/player/locomotion.ts` for the exact import convention). Bigint comparisons only — no `Number()` anywhere in this file.

Create `tests/unit/presentation/traversal/bounds.spec.ts`: forward refused at `n = 64n`, accepted at `n = 63n`; back accepted at `n = 64n`; same for `floor = ±64n` with up/down; `isWithinBounds(ORIGIN)` true; all assertions strict bigint equality.

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/traversal/bounds.spec.ts`

#### Step 1.3: Traversal state machine

Create `src/presentation/traversal/traversal.ts` per §4.1 and KDD-2: `TraversalState { coordinate: Coordinate; moveLog: readonly Move[] }`, `createTraversal(start = ORIGIN)`, `crossThreshold(state, m)` — if `canMove` fails, return state unchanged (refused move NEVER enters the log); else `{ coordinate: applyMove(state.coordinate, m), moveLog: [...state.moveLog, m] }`. Pure; no react/three imports.

Create `tests/unit/presentation/traversal/traversal.spec.ts` with fast-check properties: (1) path independence — arbitrary `Move[]` through the gated machine ⇒ `coordinate` deep-equals `reduce(acceptedLog)`; (2) bound safety — under arbitrary sequences `isWithinBounds(coordinate)` never false AND refused moves absent from log; (3) inverse-retrace — for any accepted sequence from ORIGIN, applying `ms.slice().reverse().map(invertMove)` returns exactly to ORIGIN with no refusals (retraced path revisits only proven-in-bounds rooms — assert zero refusals too).

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/traversal/traversal.spec.ts`

#### Step 1.4: Working set

Create `src/presentation/traversal/working-set.ts` per §4.1/KDD-3: `roomKey(c)` = `` `${c.n}:${c.floor}` ``; `liveRooms(c): RoomSlot[]` — current floor n ∈ [p−2, p+2], floors ±1 with n ∈ [p−1, p+1], 11 slots, minus any slot outside ±64 (edge rooms simply absent); each slot carries `dn`/`dfloor` as small `number` via `Number(roomN − playerN)` (T-6).

Create `tests/unit/presentation/traversal/working-set.spec.ts`: size 11 everywhere in the interior; contains `(n±1, floor)` and `(n, floor±1)`; clamps at n = 64 (outward rooms absent) and floor = ±64; keys correct for negative floors (e.g. `"-3:-64"`); fast-check: same coordinate ⇒ identical set (purity).

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/traversal/working-set.spec.ts`

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`

### Phase 2: Stair Walkability

#### Step 2.1: R1 vestibule alcove

Modify `src/presentation/render/room/Vestibule.tsx` per KDD-1: stair axis moves to (x = −0.55, z = `STAIR_CENTER_Z`); flank wall bulges x −1.0 → ≈ −1.45 over z ∈ [−4.15, −2.3]; slab stairwell hole recenters on the new axis; walk lane x ∈ [+0.30, +1.00] clear; far-cap door centered x ≈ +0.55 (far cap becomes conditional: rendered only when the outward neighbor is absent — edge rooms — but keep it unconditional this step; Phase 3 makes it conditional). −x closet doorway nudges ~0.5 m toward the hexagon. Update `Staircase.tsx` placement to the new axis; cross-section constants (`TREADS_PER_TURN`, `TREAD_WIDTH`, `STAIR_RADIUS` usage, rise per turn) byte-identical. `dimensions.ts` untouched.

Tools to use: Edit

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci`

#### Step 2.2: Helicoid stair math

Create `src/presentation/render/player/stair.ts` per §4.2.2: pure cylindrical parameterization around the alcove axis; `stairSurfaceY(θ)` ramp snapped to tread tops; annulus r ∈ [0.36, 0.60]; landing sector cell at each floor's repeat azimuth; exports consumed by collision + locomotion.

Create `tests/unit/presentation/render/stair.spec.ts`: rise per turn === `CEILING_HEIGHT` exactly; tread rise ≈ 0.167 < `MAX_STEP`; mouth azimuth repeats every floor (the deterministic up/down rule as geometry); surface monotone in θ; annulus bounds respected.

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/stair.spec.ts`

#### Step 2.3: Collision — room-relative cells + stair cells

Modify `src/presentation/render/player/collision.ts` per §4.2.2: cells generated per live-room offset (room-relative, still pure — signature grows a room-offset context); add stair annulus + landing cells wired to `stair.ts`; remove `STAIR_ZONE_DEPTH` and `ENTRANCE_BLOCK_DEPTH`/far-cap blockers for connected rooms; keep both ONLY on the outward side of edge rooms (|n| = 64) and cap stair θ at floor ±64. `isWalkable`/`resolveMovement` semantics otherwise unchanged (slide ≤ 3, reject-don't-tunnel).

Extend `tests/unit/presentation/render/collision.spec.ts`: existing cases still green; stair region walkable; 10⁴-step random walks (seeded) over stair + open doorways: never tunnels, never NaN, y bounded, edge rooms never exited outward.

Tools to use: Edit, Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/collision.spec.ts`

#### Step 2.4: Locomotion surface mode

Modify `src/presentation/render/player/locomotion.ts` per §4.2.2: surface mode `'floor' | 'stair'`; y = `surfaceY + EYE_HEIGHT` on stair (flat `EYE_HEIGHT` lock on floor); `stepLocomotion` stays pure `(state, input, dt) → state`. Do NOT wire coordinate commits yet (Phase 3); the ORIGIN pin remains this step. Update `tests/unit/presentation/render/locomotion.spec.*` for the surface mode.

Tools to use: Edit

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render`

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`

### Phase 3: Streaming & Floating Origin

#### Step 3.1: Re-base math

Create `src/presentation/render/world/origin.ts` per §4.2.1: commit-plane detection (horizontal: door threshold plane; vertical: ±`CEILING_HEIGHT`/2 with ±0.2 m hysteresis); exact local-position shift table (Δx = ∓0.55, Δz = ±`ROOM_PITCH`, Δy = ∓`CEILING_HEIGHT`) — this is the presentation-side `Move → world delta` table (T-8: no `moveVector` import).

Create `tests/unit/presentation/render/origin.spec.ts`: re-base shifts localPosition by the exact negation of the world shift (camera-relative no-op); hysteresis cannot double-commit (drive a position oscillating ±0.15 m around the plane: exactly one commit); fast-check: scripted move sequences ⇒ final coordinate === `reduce(moves)`.

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/origin.spec.ts`

#### Step 3.2: Streaming transforms

Create `src/presentation/render/world/streaming.ts` per §4.2.3: `RoomSlot[]` (from `traversal/working-set.ts`) → local-frame transforms including the +0.55 m/hop lateral drift (KDD-1); pure; deltas only.

Create `tests/unit/presentation/render/streaming.spec.ts`: transforms derived from deltas |Δn| ≤ 2, |Δfloor| ≤ 1; edge clamping honored; fast-check purity (same coordinate ⇒ identical transforms); no `Math.random` (grep stays green).

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/streaming.spec.ts`

#### Step 3.3: RoomStream + WorldScene composition

Create `src/presentation/render/world/RoomStream.tsx` per KDD-4: per-material mega-`InstancedMesh`es (stone/wood/metal/void/bulb-spheres) spanning all live rooms; pool of 11 book meshes (640 instances each, `userData` room offset, `instanceId === slot` per mesh untouched); mirrors current + 2 horizontal neighbors via existing `MirrorSurface` seam; fixed 12-`PointLight` pool per KDD-4 (repositioned, never added/removed); all matrix writes imperative in `useFrame`-adjacent code, zero allocation per frame. Modify `WorldScene.tsx` to compose `RoomStream` in place of single-room children (`dpr`, camera, `ListenerPoseDriver` untouched). Modify `Room.tsx` (`entranceVoid` conditional on edge), `Vestibule.tsx` (far cap conditional on neighbor absence), `Shaft.tsx` (drop placeholder tubes, keep railing), `Staircase.tsx` (one inter-floor turn per room). Extend `tests/unit/presentation/render/world-scene.spec.*` mount smoke (jsdom DOM-level).

Tools to use: Write, Edit

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render`

##### Timeout

300000

#### Step 3.4: Wire traversal — the coordinate starts moving

Modify `src/presentation/render/player/LocomotionController.tsx`: hold `TraversalState`; on commit-plane crossing (from `origin.ts` detection) call `crossThreshold` → re-base `localPosition` → recompute matrices/lights **same frame** (§4.2.1). `LocomotionHandle { suspend, resume, state }` shape unchanged; `PlayerState.coordinate` now reflects the traversal coordinate (Unit 03's `coordinate: ORIGIN` pin retires in `locomotion.ts`). Presence publisher continues to receive `PlayerState` unchanged (Unit 07 compatibility).

Tools to use: Edit

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci`

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`
- `pnpm script:verify-boundaries`

### Phase 4: Shaft Illusion, Edge & Poses

#### Step 4.1: Shaft impostor

Create `src/presentation/render/world/ShaftImpostor.tsx` per §4.2.4: one `InstancedMesh`, slices at d ∈ {±2, ±3, ±4}, positions a pure function of the coordinate (phase-locked to `liveRooms` — consistency rule binding), absent beyond floor ±64, 1 draw call. Add a pure helper module if needed for slice math; test the phase-lock: slice position for Δfloor = d equals where `streaming.ts` would place the real room at that delta — `tests/unit/presentation/render/streaming.spec.ts` gains this assertion.

Tools to use: Write, Edit

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/streaming.spec.ts`

#### Step 4.2: Edge fog knob + veil

Modify `src/presentation/render/atmosphere/atmosphere.ts` per §4.4: add pure `atmosphereAt(distanceToEdgeRooms, distanceToEdgeFloors): AtmosphereProfile` + `RAMP` constants (width 4, live-tunable); `DEFAULT_ATMOSPHERE` values byte-untouched. Create `src/presentation/render/world/EdgeVeil.tsx`: bigint distance-to-edge from the exact coordinate (small-number conversion only inside the ramp zone), calls `applyAtmosphere` — no direct `scene.fog` access anywhere.

Create `tests/unit/presentation/render/atmosphere.spec.ts`: identity clause — for all inputs outside the ramp zone, result strictly equals `DEFAULT_ATMOSPHERE`; ramp monotonic toward the edge; only `fogDensity`/`fogColor` ever differ; purity.

Tools to use: Edit, Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/atmosphere.spec.ts`

#### Step 4.3: Poses P5–P8

Modify `src/presentation/render/debug/poses.ts`: extend `CameraPose` with optional logical `(n, floor)`; `?pose=N` teleports (traversal state + streaming settle synchronously before first frame); append P5–P8 per §4.4 (P7's exact coordinate = edge minus ramp-width/2, provisional until the gate); P1–P4 definitions byte-untouched.

Create `tests/unit/presentation/render/poses.spec.ts`: P1–P4 values deep-equal their Unit 03 definitions (frozen-pose regression); `parsePoseParam` handles 1–8 and rejects 0/9/garbage; P5–P8 carry logical coordinates.

Tools to use: Edit, Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/poses.spec.ts`

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`

### Phase 5: Audio

#### Step 5.1: Room hums under streaming

Create `src/presentation/audio/room-hums.ts` per §4.3 (`startRoomHums` / `RoomHumsHandle { reposition, dispose }`, structure lifecycle bookkeeping for testability with the fake `BusContext` + injected source-graph factory stub). Refactor `src/presentation/audio/ambient.ts`: hush stays; hum block removed (origin room's hums now arrive via streaming like every room's). Wire per-room hum lifecycle into `RoomStream`'s room mount/unmount (one effect: create in body, dispose in cleanup); re-base calls `reposition` in the same frame as the listener pose (§4.2.1 step 3). Update `src/app/App.tsx` wiring accordingly (app-lifetime stack structure preserved — single `useEffect`).

Create `tests/unit/presentation/audio/room-hums.spec.ts` per §6: one positional emitter per bulb position with `refDistance`/`rolloff` set; `reposition` → `setPosition` with re-based coords; `dispose` stops sources, disconnects, disposes emitters, idempotent; N spawn/dispose cycles ⇒ zero live emitters/orphaned nodes on the fake context.

Tools to use: Write, Edit

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/audio`

#### Step 5.2: Footsteps

Create `src/presentation/audio/footsteps.ts` per §4.3: one `ambient`-kind emitter; seeded xorshift32 noise buffers (stone/stair bands per §4.3), precomputed once; `step(surface)` fires a fresh one-shot source; deterministic variation. Wire the trigger render-side: stride-distance cadence + surface classification (`'stair'` when locomotion surface mode is stair) in `LocomotionController.tsx` calling `step(surface)`.

Create `tests/unit/presentation/audio/footsteps.spec.ts`: emitter is `ambient` kind; stone vs stair select distinct buffers/params; two instances under the fixed seed produce identical sequences; `dispose` idempotent.

Tools to use: Write, Edit

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/audio`

#### Step 5.3: Shaft drone (user-approved; cut-able at gate)

Create `src/presentation/audio/shaft-drone.ts` per §4.3: seeded filtered-noise drone, lowpass ~80–120 Hz, near-threshold gain constant, one positional emitter at the current vestibule's shaft axis; re-based like any emitter; lifecycle follows the current room (not all 11). Wire in `RoomStream`/`App` alongside hums. If Rei's Phase 7 verdict is "doesn't land": delete the module and its wiring (do not tune up).

Tools to use: Write, Edit

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci`

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`

### Phase 6: Integration — Loop Closure & Perf Evidence

#### Step 6.1: Scripted in-world loop-closure proof

Create `tests/unit/presentation/render/loop-closure.spec.ts` — the brief's required in-world proof, driving the REAL pipeline purely (no three/WebGL): scripted `LocomotionInput` sequences through `stepLocomotion` + `origin.ts` commit detection + `crossThreshold`: climb one full turn (→ floor +1), walk forward one room, descend, walk back. Assert: final `coordinate.n === 0n && coordinate.floor === 0n` (strict bigint, equals `ORIGIN`); `hash(final) === hash(ORIGIN)`; `coordinate` deep-equals `reduce(moveLog)` after EVERY commit; final `localPosition` within float epsilon of start (`toBeCloseTo`; never epsilon on bigints).

Also create `tests/unit/presentation/traversal/loop-closure.spec.ts` for the pure-machine variant: scripted `up, forward, down, back` via `crossThreshold` with the same assertions (fast-check versions live in `traversal.spec.ts` from Step 1.3).

Tools to use: Write

##### Verify

- `pnpm compile`
- `pnpm test:unit:ci tests/unit/presentation/render/loop-closure.spec.ts tests/unit/presentation/traversal/loop-closure.spec.ts`

#### Step 6.2: Perf evidence

Run `pnpm dev`, open `?debug` at spawn and at a mid-climb position with the full 11-room set live. Record in `docs/mood/unit-04/checklist.md` (create the file, perf section first): draw-call count (must be ≤ 30), fps, device. If draw calls exceed 30: apply the KDD-4 fallback (books current-floor-only) and re-measure; record both numbers and the decision. If the 12-light pool causes fragment-cost issues on M1-class, first cut = the floor±1 vestibule lights (record evidence).

Tools to use: Bash, Write

##### Verify

- `test -f docs/mood/unit-04/checklist.md`

##### Timeout

600000

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`
- `pnpm script:verify-boundaries`

### Phase 7: Mood Gate (human — Rei is the instrument)

#### Step 7.1: Unit 03 regression pass

Re-render P1–P4 at 1280×720. Classify per §4.4: **P3 must be byte-identical** (knob canary — if it diffs, STOP: find the regression; do not proceed or re-bless). P1/P2/P4 diffs expected (streamed geometry replacing void); prepare before/after side-by-sides for Rei. Mechanical companion: `git diff` on `atmosphere.ts` `DEFAULT_ATMOSPHERE` and `Bulbs.tsx` values must be empty. On Rei's approval: replace P1/P2/P4 captures in `docs/mood/unit-03/` and append the amendment to `docs/mood/unit-03/checklist.md` (date, cause: "Unit 04 streaming made neighbor geometry visible through doorways/shaft; shaft illusion replaced the void", quoted unchanged knob values, Rei's re-blessing).

Tools to use: Bash, Edit, Write

##### Verify

- `git diff --exit-code src/presentation/render/atmosphere/atmosphere.ts -- ':(exclude)' || echo "REVIEW: atmosphere diff must be atmosphereAt/RAMP additions only, DEFAULT_ATMOSPHERE untouched"`
- `test -f docs/mood/unit-03/checklist.md`

##### Timeout

600000

#### Step 7.2: Unit 04 hero-moment gate

Capture P5–P8 (double-render each pose; the two frames must be identical — nondeterminism tripwire). Walk the objective floor (§4.4 binary items). Then the human gate, blocking:

> Rei walks the descent live — a continuous descent of at least 5 floors from spawn, a look down the shaft mid-spiral, the return climb, plus a corridor walk to the ±64 edge and into the fog stop. Acceptance question: **"does the descent feel bottomless — is the vertigo there?"** Vertigo is the feature; softening it is a gate _failure_, not a fix. Shaft-drone verdict: keep or delete (never tune up). Live tuning confined to `atmosphere.ts` (including the RAMP knob) + `Bulbs.tsx`; anything outside the knob modules is a recorded deviation + seam renegotiation, not a quiet edit.

Record in `docs/mood/unit-04/checklist.md`: objective floor results, `Approved by: Rei, live walkthrough, <date>`, reference device (+ M1-class run if perf was marginal, else the recorded caveat), knob values at capture (including final RAMP values, now locked), any waivers in Rei's words under "Deviations recorded". Commit captures to `docs/mood/unit-04/pose-{5..8}.png`.

Tools to use: Bash, Write, Edit

##### Verify

- `test -f docs/mood/unit-04/pose-5.png && test -f docs/mood/unit-04/pose-6.png && test -f docs/mood/unit-04/pose-7.png && test -f docs/mood/unit-04/pose-8.png`
- `grep -q "Approved by: Rei" docs/mood/unit-04/checklist.md`

##### Timeout

600000

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`

### Phase 8: Doctrine Review

#### Step 8.1: Review Implementation Against Doctrines

Review all code written in this spec against the doctrines that were loaded: `coordinate`, `render`, `audio`, `mood-gate` (check `docs/doctrine/doctrine-manifest.yaml` triggers to confirm the set).

For each relevant doctrine:

1. **Compliance**: Did we follow all MUST/MUST NOT rules? If NO: document the violation and why it was necessary. Pay specific attention to: T-1…T-8 (§4.1), the frozen seams list (§4.2), the audio lifecycle MUSTs (§4.3), and the mood-touch rule (§4.4).
2. **New Patterns**: Did we discover patterns that should become doctrine? (Candidates this unit will likely surface: the commit-plane/hysteresis convention; the per-room-mesh identity pattern for Unit 05; the `atmosphereAt` positional-knob pattern; the traversal-layer home `src/presentation/traversal/`.)
3. **Outdated Rules**: Did we find doctrine that is wrong or outdated? (Candidate: render doctrine §6's blocker description now needs updating — Unit 04 replaced the blockers; collision doctrine text describing the 2D-only model.)
4. **Missing Coverage**: Scenarios doctrine doesn't address?

If ANY amendments are needed, create `docs/tasks/ongoing/04-staircase/doctrine-amendments.md`:

```markdown
# Doctrine Amendments: 04-staircase

## Compliance Violations

- [doctrine]: [rule violated] - [justification]

## New Patterns to Add

- [doctrine]: [pattern] - [rationale]

## Outdated Rules to Update

- [doctrine]: [current rule] → [proposed update]

## Missing Coverage

- [doctrine]: [scenario not covered]
```

If no amendments needed, this step passes automatically.

##### Verify

- `test -f docs/tasks/ongoing/04-staircase/doctrine-amendments.md && echo "Amendments documented" || echo "No amendments needed"`

#### Step 8.2: Commit Doctrine Amendments (if any)

If `doctrine-amendments.md` exists:

```bash
mkdir -p docs/tasks/ongoing/doctrine-updates
cp docs/tasks/ongoing/04-staircase/doctrine-amendments.md \
   docs/tasks/ongoing/doctrine-updates/04-staircase-amendments.md
```

##### Verify

- `ls docs/tasks/ongoing/doctrine-updates/ 2>/dev/null || echo "No doctrine updates pending"`

#### Gate

- `pnpm compile`
- `pnpm test:unit:ci`
- `pnpm lint`

---

## 9. Operational Queries

No database in this unit. The runtime equivalents:

### Status check (dev)

- `?debug` — fps + draw-call HUD (`DebugStats.tsx`); assert ≤ 30 calls with the working set live.
- `?pose=N` (1–8) — deterministic camera + coordinate teleport for capture/inspection.

### Invariant audits (executable)

- `pnpm test:unit:ci tests/unit/presentation/traversal` — T-3/T-5 standing invariants (expected: green).
- `pnpm test:unit:ci tests/unit/presentation/render/loop-closure.spec.ts` — in-world loop closure (expected: green).
- `pnpm script:verify-boundaries` — no deep domain imports (T-8) (expected: exit 0).
- `git diff --stat src/domain/entities/` on the unit branch — expected: **empty** (frozen core untouched).

---

## 10. Spec Completeness Checklist

### Semantic Completeness

- [x] All data structures fully defined (`TraversalState`, `RoomSlot`, handles — §4.1/§4.3)
- [x] All terms defined or linked (doctrines quoted verbatim §4.1–4.4)
- [x] State machines exhaustive (commit planes, hysteresis, refusal — §4.2.1, §5)
- [x] Enums closed (`Move` 4-valued frozen; surface `'floor' | 'stair'`; step surface `'stone' | 'stair'`)
- [x] Defaults stated (working set 11, ramp width 4, light pool 12, drone gain near-threshold)

### Verification Completeness

- [x] Each phase has executable verification + gate
- [x] Invariants have audit commands (§9)
- [x] Success criteria binary (§1.3)

### Recovery Completeness

- [x] FMEA table (§7)
- [x] Idempotency/rollback: pure-code steps, `git revert`; append-only capture amendments (§7)
- [x] Stuck-state: baseline drift and P3-canary STOP rules (Steps 1.1, 7.1)

### Context Completeness

- [x] Brief linked (header)
- [x] Decision rationale captured (KDD-1…KDD-5)
- [x] Change log present (§11)

### Boundary Completeness

- [x] Scope table (§2)
- [x] Auth: n/a, stated (§2)
- [x] External dependencies: none new, stated (§2)
- [x] Interface contracts (module export tables §4.1–4.3; Unit 05/07 seams §4.5, §4.1 T-5)
- [x] Performance constraints (≤ 30 draw calls, 60 fps mid-iGPU, DPR ≤ 1.5)

---

## 11. Change Log

| Version | Date       | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-07-03 | Initial specification. **User-decided in Q&A**: walkable bound ±64/±64 (also Unit 07 co-location radius); vertigo is the feature (no softening); R1 stair alcove accepted; shaft drone included (cut-able at gate). **Architect defaults (reviewable)**: 11-room always-live working set (KDD-3); full 11 book meshes with current-floor-only fallback (KDD-4); 12-light fixed pool; commit planes = door threshold / ±CEILING_HEIGHT/2 with ±0.2 m hysteresis; loop-closure proof as pure vitest (no e2e infra in gate); shaft impostor slices d ∈ {±2,±3,±4}; edge-fog ramp width 4 rooms/floors (live-tunable at gate); mood floor numbers (≥2 tiers P5, ≥3 doorframes P6, 5-floor walkthrough); M1-class verification required only if perf marginal, else recorded caveat; traversal module home `src/presentation/traversal/`; footsteps in scope per audio doctrine forward-reference; origin-room hums moved to the streaming path (touches Unit 03's `ambient.ts`/`App.tsx`, recorded §4.3). |
