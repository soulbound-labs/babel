# Babel — Unit 03: World Render — Single Room + Locomotion Specification

**Version**: 1.0.0
**Status**: Draft
**Date**: 2026-07-03
**Unit**: 03 of 08 · Stage 3 · **depends on Units 01, 02**
**Brief**: [`03-world-render-brief.md`](./03-world-render-brief.md)
**Parent Spec**: none
**Child Specs (downstream consumers)**: Unit 04 (staircase/traversal), Unit 05 (book reading), Unit 06 (assets/beauty), Unit 07 (multiplayer)

---

## 1. Overview

This unit turns the green repo + pure core into **a place you are standing in**:
one correctly-proportioned Borges hexagon at `ORIGIN`, walked in first person
(WASD + mouselook), **mood-complete on placeholder geometry** — two dim bulbs,
aggressive fog, dark everywhere — with the frozen seams Stage-4/5 units plug
into: the finalized `PlayerState`, a no-op `PresencePort` adapter, the
N-emitter `AudioBus`, the mirror surface hook, the fog hook, and the
room-module convention.

Atmosphere is a **deliverable, not a decoration**: Unit 05's "does this give
chills" go/no-go is judged against this unit's lighting and fog _before_ the
Unit 06 beauty pass exists. If the gloom doesn't already land on untextured
meshes, the chills-gate throws a false negative. This spec therefore defines a
concrete **mood-gate ritual** (§7.1) so acceptance is checkable, not vibes.

No book content, no assets, no inter-room movement, no multiplayer.

### 1.1 Series context

Deterministic Library of Babel as a flat-screen 3D art piece. Content is a pure
function of a ℤ² lattice coordinate `(n, floor)` — path-independent, identical
for all users, no LLM. Dependency spine:
`01 → 02 → 03 → {04 staircase ∥ 05 books} → {06 assets ∥ 07 multiplayer} → 08 search`.
The domain core is pure and **frozen** (Unit 02); this unit consumes it through
the `@/domain` barrel and touches no core logic.

### 1.2 What this unit freezes (the parallel-safety contract)

Units 04 and 05 branch from this unit **in parallel**. Everything below is
frozen at unit close; changing any of them afterwards requires renegotiating
both branches:

| Frozen surface                                          | Consumer               |
| ------------------------------------------------------- | ---------------------- |
| `PlayerState` shape in `src/domain/ports` (§4.2)        | 04, 07                 |
| `AudioBus` / `AudioEmitter` API (§4.6)                  | 04, 05, 07             |
| Canonical dimension constants module (§4.3)             | 04, 05, 06             |
| Book-slot mapping `slot ↔ (wall, shelf, volume)` (§4.5) | 05                     |
| Locomotion `suspend()`/`resume()` camera seam (§4.7)    | 05                     |
| Mirror surface hook (§4.8)                              | 06                     |
| Fog/atmosphere hook (§4.8)                              | 06                     |
| Room-module layout convention (§4.4)                    | 04, 05, 06             |
| Mood-gate poses + reference captures (§7.1)             | 05 gate, 06 regression |

---

## 2. Scope

| In Scope                                                             | Out of Scope                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| One hexagon at `ORIGIN`: 4 book-walls, 2 free sides, shaft + railing | Book content / glyph streaming / page-turns (Unit 05)               |
| Vestibule: two closets, mirror location, **static** spiral staircase | Inter-room movement, walkable staircase, streaming (Unit 04)        |
| 640 books as one `InstancedMesh` + merged shelf boards               | PBR assets, volumetric fog, real mirror reflection, bloom (Unit 06) |
| Mood-complete lighting: two dim bulbs, fog, near-black background    | Multiplayer avatars / networked presence (Unit 07)                  |
| WASD + mouselook, pointer lock, analytic collision, entry overlay    | Search (Unit 08)                                                    |
| `PlayerState` finalized; `LocalPresencePort` no-op adapter           | Any change to the frozen `@/domain` barrel                          |
| `AudioBus` (N emitters) + procedural ambient bed + bulb hum          | Audio asset files (procedural only this unit)                       |
| Mirror + fog hooks for Unit 06                                       | Head-bob / motion polish (revisit with Unit 04 motion comfort)      |
| Mood-gate ritual: debug poses, committed captures, checklist         | Honeycomb topology (chain model is locked series-wide)              |

**Prerequisites (verified true in this repo):** frozen `src/domain/entities`
barrel + `ORIGIN` (Unit 02); `src/domain/ports/index.ts` with `PresencePort`
and `PlayerState = unknown`; `src/presentation/render/PlaceholderScene.tsx`
(replaced here); boundary lint with `presentation → {entities, ports}` allows;
gate scripts `compile` / `lint` / `test:unit:ci` / `ci:local` in `package.json`.

---

## 3. Constraints (binding)

- **C1 — Lane A.** three.js + React Three Fiber own all rendering. R3F for
  scene composition; imperative Three inside `useFrame` for the hot path
  (instancing writes, collision, audio listener pose). No WASM renderer.
- **C2 — Boundary rules (lint-enforced).** All new scene/audio code lives in
  `src/presentation/**` and imports only `domain/entities`, `domain/ports`,
  third-party, and other presentation modules. `presentation` **never imports
  `adapters`**: the `app` layer instantiates `LocalPresencePort` and injects it
  via a React context typed against the port (§4.9). Cross-layer imports inside
  `src/` are **relative**; tests may use `@/`.
- **C3 — Perf floor.** Desktop browser, worst device **mid iGPU (Apple M1 /
  Intel Iris Xe class)**, target **60 fps**, hard failure < 30 fps. Budget
  enforcers: one draw call for all 640 books, **≤ 30 draw calls** total,
  `devicePixelRatio` clamped to ≤ 1.5, no shadow maps, no post-processing.
  Darkness and fog are the budget's best friends — keep them cheap
  (`FogExp2`, two point lights).
- **C4 — Deterministic presentation.** No `Math.random()` anywhere in
  presentation: per-book jitter derives from a seeded hash of the instance slot
  (§4.5) so the same room renders identically forever — this is what makes the
  mood-gate reference captures (§7.1) reproducible, and it is the render-side
  echo of the core's determinism.
- **C5 — Zero new runtime dependencies.** `three`, `@react-three/fiber`,
  `@react-three/drei` are already installed and sufficient. Collision is
  analytic (~100 lines of pure math), audio is raw Web Audio, the perf HUD uses
  `three/addons` Stats. Adding a physics or audio library is out of scope
  (tooling-doctrine: dependencies are deliberate decisions).
- **C6 — Toolchain (tooling-doctrine).** TypeScript only; any script is
  `scripts/<name>.ts` via `tsx`; configs typecheck under their tsconfig.
- **C7 — The core stays pure.** This unit adds **nothing** under
  `src/domain/entities/**` and changes `src/domain/ports/index.ts` only as
  specified in §4.2 (finalizing `PlayerState`, fixing one stale comment).
  Interface bodies of `ContentProvider`/`PresencePort` are unchanged.
- **C8 — Faithful proportions.** Geometry follows the Borges passages via the
  canonical constants module (§4.3). Cramped is correct: the ceiling barely
  clears a person. Comfort-biased inflation is explicitly rejected.

---

## 4. Architecture & Data Model

### 4.1 The room, oriented

Plan view (not to scale). The hexagon is **flat-side-forward** along the door
axis; sides are numbered CCW. Sides **0** and **3** (opposite — the chain
topology) are free; the other four bear shelves.

```
              side 2 (books, wall 1)   side 1 (books, wall 0)
                        \                 /
   side 3 (vestibule) ──|    shaft ○    |── side 0 (entrance)
                        /   + railing   \
              side 4 (books, wall 2)   side 5 (books, wall 3)
```

- **Side 0 — entrance.** A doorway into darkness. For this unit it is blocked
  by an invisible collider just past the threshold; fog + a black volume beyond
  sell "the corridor continues." Unit 04 removes the block when the next room
  streams in.
- **Side 3 — vestibule.** Doorway into the vestibule module: two tiny closets
  (one per flank), the mirror surface on a wall, and the **static** spiral
  staircase winding through a stairwell opening, disappearing into fog above
  and below. Non-walkable this unit (railed/blocked at the stair mouth);
  Unit 04 adds collision + climb. The vestibule's far end (where the next
  hexagon would be) is fog-black and collider-blocked.
- **Shaft.** Hexagonal opening in the floor center with a matching opening in
  the ceiling, enclosed by a low railing (collider — you cannot fall in).
  Above and below: darkness + fog only. Unit 04 builds the repeating-parallax
  fake; this unit just makes the depth unreadable.
- **Wall indexing (frozen).** Domain `wall: 0..3` maps to hexagon sides CCW:
  `wall 0 → side 1`, `wall 1 → side 2`, `wall 2 → side 4`, `wall 3 → side 5`.
  Unit 05's click-to-address resolution assumes exactly this.

### 4.2 `PlayerState` finalized (`src/domain/ports/index.ts`)

Replaces Unit 01's `PlayerState = unknown`. Interface bodies of
`ContentProvider`/`PresencePort` unchanged.

```ts
import type { Coordinate, Glyph, LineAddress } from '../entities';

/** A player's presence/pose. Exact room + float local pose (floating-origin model). */
export type PlayerState = {
  coordinate: Coordinate; // exact bigint room (n, floor) — source of truth
  localPosition: { x: number; y: number; z: number }; // meters, room-local frame, y-up
  yaw: number; // radians, CCW about +y, 0 = facing -z (three.js convention)
  pitch: number; // radians, clamped ±POSE_PITCH_MAX
};
```

Splitting exact `Coordinate` from float local pose is Unit 04's floating-origin
design verbatim; Unit 07 serializes `bigint` as strings **at the adapter
boundary**, never in this type. Also fixed here: the stale header comment
claiming the Convex presence impl lands in "Unit 05·B" — it lands in
**Unit 07**.

### 4.3 Canonical dimensions (frozen constants module)

`src/presentation/render/room/dimensions.ts` — the single source every later
unit (staircase, book pick, asset pass) builds against. Derivation is from the
Borges passages; the load-bearing choice is **faithful-cramped**.

```ts
// Frozen after the mood gate — Units 04/05/06 consume these. Do not retune casually.
export const CEILING_HEIGHT = 2.0; // "scarcely exceeds the height of a normal librarian"
export const HEX_SIDE = 2.0; // fits 32 uniform spines + shelf frame per wall
export const HEX_APOTHEM = (HEX_SIDE * Math.sqrt(3)) / 2; // ≈ 1.732 — wall distance from center

export const SHELVES_PER_WALL = 5; // floor to ceiling
export const SHELF_PITCH = CEILING_HEIGHT / SHELVES_PER_WALL; // 0.4 — shelf-to-shelf
export const SHELF_DEPTH = 0.32;
export const BOOKS_PER_SHELF = 32;
export const BOOK_HEIGHT = 0.31; // uniform format
export const BOOK_SLOT_WIDTH = 0.052; // 32 × 0.052 = 1.664, framed within the 2.0 wall

export const SHAFT_RADIUS = 0.72; // circumradius of the hexagonal floor/ceiling opening
export const RAILING_RADIUS = 0.8;
export const RAILING_HEIGHT = 0.62; // "low railing"

export const DOOR_WIDTH = 0.9;
export const DOOR_HEIGHT = 1.9;

export const VESTIBULE_WIDTH = 2.0; // matches the free side
export const VESTIBULE_DEPTH = 2.4;
export const CLOSET_SIDE = 0.8; // two, flanking the vestibule
export const MIRROR_WIDTH = 0.7;
export const MIRROR_HEIGHT = 1.4;
export const STAIR_RADIUS = 0.78; // static spiral, this unit

export const EYE_HEIGHT = 1.62;
export const PLAYER_RADIUS = 0.28;
export const WALK_SPEED = 1.4; // m/s — a person, not a strafe-jumper
export const POSE_PITCH_MAX = (80 * Math.PI) / 180;
```

Notes: shelf/book counts must agree with the domain constants (4 walls × 5
shelves × 32 volumes = 640); a unit test asserts this against `@/domain`
values indirectly via the slot-mapping bijectivity (§5 INV-R2). The walkway
between railing (r = 0.8) and shelf faces (apothem − shelf depth ≈ 1.41) is
~0.6–0.9 m — cramped and intended; the capsule (r = 0.28) passes with margin.

### 4.4 Module layout (room-module convention — frozen)

```
src/presentation/
  render/
    WorldScene.tsx          Canvas + atmosphere + Room + player rig (replaces PlaceholderScene)
    room/
      dimensions.ts         §4.3 constants (frozen)
      Room.tsx              composition: walls/floor/ceiling/doorways + children below
      BookWalls.tsx         ONE InstancedMesh, 640 instances, transforms from instancing.ts
      Shelves.tsx           merged shelf boards + wall frames (static, few draw calls)
      Shaft.tsx             floor/ceiling openings + railing geometry
      Vestibule.tsx         closets, mirror placement, static Staircase
      Staircase.tsx         static spiral shape (Unit 04 makes it walkable)
      Bulbs.tsx             two emissive spheres + point lights (§4.8)
      MirrorSurface.tsx     placeholder mirror + Unit 06 swap seam (§4.8)
    atmosphere/
      atmosphere.ts         fog profile + background + tone mapping (§4.8 hook)
    player/
      collision.ts          PURE analytic colliders + capsule slide (§4.7)
      LocomotionController.tsx  pointer lock + WASD + suspend/resume (§4.7)
    debug/
      poses.ts              mood-gate camera poses (§7.1)
      DebugStats.tsx        three/addons Stats behind ?debug
    presence-context.ts     React context typed `PresencePort` (app provides the adapter)
  audio/
    audio-bus.ts            AudioBus + AudioEmitter (§4.6)
    ambient.ts              procedural hush bed + bulb hum graphs (§4.6)
```

`src/adapters/presence/local-presence-port.ts` — the no-op `PresencePort`.
`src/app/EntryOverlay.tsx` + wiring in `App.tsx` — the entry gesture (§4.7).

### 4.5 Book instancing (frozen mapping)

One `THREE.InstancedMesh` — a single generic book geometry (box with a subtle
spine bevel), 640 instances, one draw call. **The instance id IS the slot**:

```ts
// src/presentation/render/room/instancing.ts — pure, node-testable
export const BOOK_COUNT = 640; // 4 walls × 5 shelves × 32 volumes

export function bookToSlot(wall: number, shelf: number, volume: number): number {
  return (wall * 5 + shelf) * 32 + volume; // same nesting order as the domain codec
}
export function slotToBook(slot: number): { wall: number; shelf: number; volume: number } {
  const volume = slot % 32;
  const shelf = ((slot - volume) / 32) % 5;
  const wall = (slot - volume - shelf * 32) / 160;
  return { wall, shelf, volume };
}
export function slotTransform(slot: number): BookTransform; // position+rotation+scale in room frame
export function slotJitter(slot: number): BookJitter; // deterministic — seeded hash of slot (C4)
```

`slotTransform` composes: wall side placement (§4.1 mapping) → shelf row →
volume position along the shelf → jitter. Jitter is bounded (height scale
0.92–1.0, lean ≤ 2.5°, depth push ≤ 6 mm, slight per-instance color variation
via `setColorAt`) and derives from a tiny integer hash of `slot` — never
`Math.random` (C4). **Unit 05 resolves clicks via
`raycast → instanceId → slotToBook(instanceId)` and combines with the room's
`Coordinate` to form a `LineAddress`; this mapping is frozen.**

### 4.6 `AudioBus` (frozen API) + procedural ambient

`src/presentation/audio/audio-bus.ts`. Handle-based, N emitters from day one,
consumers never touch Web Audio directly:

```ts
export type Vec3 = { x: number; y: number; z: number };
export type ListenerPose = { position: Vec3; forward: Vec3; up: Vec3 };
export type EmitterSpec =
  | { kind: 'ambient' } // non-positional, straight to master
  | { kind: 'positional'; position: Vec3; refDistance?: number; rolloff?: number };

export interface AudioEmitter {
  readonly input: AudioNode; // consumers connect their source graph here
  setPosition(p: Vec3): void; // positional only; no-op for ambient
  setGain(g: number): void;
  dispose(): void; // disconnects + releases nodes; idempotent
}

export interface AudioBus {
  createEmitter(spec: EmitterSpec): AudioEmitter;
  setListenerPose(pose: ListenerPose): void; // camera drives this each frame
  setMasterGain(g: number): void;
  resume(): Promise<void>; // called from the entry gesture (§4.7)
  dispose(): void;
}

export function createAudioBus(ctx?: BusContext): AudioBus; // BusContext = narrow AudioContext-shaped
```

Implementation: one `AudioContext`; per-emitter `GainNode`
(+ `PannerNode`, `panningModel: 'equalpower'`, `distanceModel: 'inverse'` for
positional) → master `GainNode` → destination. The constructor takes a narrow
`BusContext` interface (only the factory methods it uses) so unit tests inject
a hand-rolled fake and assert graph wiring/disposal without a browser (C5, §8).

**Ambient content (procedural — zero asset files):**
`src/presentation/audio/ambient.ts` builds (a) the **hush** — looped filtered
brown-ish noise (noise buffer → lowpass ~220 Hz → slow LFO on gain) on an
`ambient` emitter at very low gain; (b) **two bulb hums** — 120 Hz sine + a
faint harmonic, each on a `positional` emitter at its bulb's position, so the
positional path is genuinely exercised this unit. Footsteps (04), page rustle
(05), and remote players (07) are additional emitters on the same bus.

### 4.7 Locomotion, collision, entry

**Controller** (`LocomotionController.tsx`): pointer-lock mouselook (yaw
unbounded, pitch clamped ±`POSE_PITCH_MAX`), WASD walking at `WALK_SPEED` in
the camera's ground plane, y locked to `EYE_HEIGHT` (flat floor; stairs are
Unit 04). A walking body, not a flying camera: velocity is damped
(accel/decel ≈ 10 s⁻¹ time-constant style smoothing), no sprint, no jump, no
head-bob this unit.

**Frozen camera seam** — the controller owns the single camera and exposes:

```ts
export interface LocomotionHandle {
  suspend(): void; // stops input→movement; camera control yielded to the caller (Unit 05 reading)
  resume(): void; // restores walking from wherever the camera was returned
  readonly state: PlayerState; // current pose (coordinate = ORIGIN this unit)
}
```

Unit 05 reads in-place through this seam (ease camera to the book under
`suspend()`, `resume()` on close); Unit 04 extends movement underneath it.
One camera, one owner — the branches cannot conflict.

**Collision** (`collision.ts`, pure): capsule (radius `PLAYER_RADIUS`) vs
analytic colliders — 6 wall planes (with door gaps on sides 0/3), shelf-face
planes, the railing ring (circle constraint about the center), vestibule
interior planes, and the two doorway blockers (entrance threshold + vestibule
far end + stair mouth). Response is slide: project the movement vector onto
the violated constraint's tangent, iterate ≤ 3 times. Pure functions of
`(position, delta) → position`, node-tested by property (§8: random-walk
containment).

**Presence publishing**: the controller publishes `PlayerState` through the
injected `PresencePort` at ≤ 10 Hz when the pose changed — a no-op today, but
the seam Unit 07 swaps an adapter into is exercised from day one.

**Entry gesture** (`EntryOverlay.tsx`, app layer): near-black full-screen
overlay ("BABEL" + faint "click to enter"); the click requests pointer lock
**and** `bus.resume()` (one gesture satisfies both browser policies), then the
overlay fades out over ~1.5 s — a curtain into the dark. `Esc` (pointer-lock
loss) brings back a minimal "click to return" state. Pointer-lock denial or
loss never crashes the scene (E1).

**Spawn**: `localPosition` just inside the side-0 entrance threshold
(≈ `(0, EYE_HEIGHT, HEX_APOTHEM − 0.55)` with side 0 at +z), yaw ≈ **+40° off
the door axis** so the first frame composes the railed shaft, a book-wall's
640 spines, and one bulb receding into fog. Exact values live in
`debug/poses.ts` as pose 1 and are locked by the mood-gate captures, not by
this paragraph.

### 4.8 Atmosphere: lighting, fog hook, mirror hook

**Lighting model — two bulbs are the whole story**: two emissive spheres
(r = 0.09) at y ≈ 1.85, placed **transversally** (Borges) on the axis
perpendicular to the door axis at ≈ ±1.15 from center. Each: warm
`#ffd9a0`-ish `PointLight`, low intensity, `decay = 2`, `distance ≈ 5` —
insufficient by design, **unceasing** (no flicker — also keeps captures
deterministic, C4). Plus a floor ambient of ≈ 0.02 so blacks roll off instead
of clipping. No shadow maps (C3): darkness does the occlusion.
Renderer: ACES tone mapping, exposure tuned once in `atmosphere.ts`.

**Fog hook** (`atmosphere/atmosphere.ts`): one module owns background color
(near-black `#050507`), `THREE.FogExp2` (initial density ≈ 0.18, tuned during
the mood pass then locked), and tone-mapping setup, exported as an
`AtmosphereProfile` + an `applyAtmosphere(scene, renderer, profile)` entry
point. **Unit 06's volumetric upgrade replaces this module's implementation
behind the same exported surface** — no other file changes.

**Mirror hook** (`MirrorSurface.tsx`): a plane (`MIRROR_WIDTH × MIRROR_HEIGHT`)
in the vestibule with a dark, glossy placeholder material, accepting an
optional `reflection?: THREE.Texture` prop it maps when present. Unit 06
supplies the render-target texture; nothing else about this unit changes.

### 4.9 Presence wiring (boundary-safe)

`presentation/presence-context.ts` exports
`PresenceContext = createContext<PresencePort>(...)` typed against the port
only. `App.tsx` (app layer — may import everything) instantiates
`LocalPresencePort` from `adapters/presence/local-presence-port.ts` and
provides it. `presentation` therefore never imports `adapters` (C2), and
Unit 07's swap is one line in `App.tsx`.

```ts
// src/adapters/presence/local-presence-port.ts
export class LocalPresencePort implements PresencePort {
  publish(_state: PlayerState): void {} // no-op — Unit 07 replaces with Convex
  subscribe(_cb: (states: PlayerState[]) => void): () => void {
    return () => {}; // never emits; there is no one else here (yet)
  }
}
```

---

## 5. Invariants

| #       | Invariant                                                                                                                                                                                      | Check                            |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| INV-R1  | **Slot bijectivity.** `slotToBook(bookToSlot(w,s,v)) === {w,s,v}` for all 640 tuples; slots are exactly `0..639`, no collisions.                                                               | node test                        |
| INV-R2  | **Domain agreement.** `BOOK_COUNT === WALLS·SHELVES·VOLUMES` semantics: every `(wall∈0..3, shelf∈0..4, volume∈0..31)` round-trips; out-of-range throws.                                        | node test                        |
| INV-R3  | **Deterministic presentation.** `slotTransform`/`slotJitter` are pure: repeated calls byte-identical; jitter within documented bounds; no `Math.random` under `src/presentation/**`.           | node test + grep gate            |
| INV-R4  | **Containment.** From spawn, no sequence of movement deltas escapes the walkable region: never beyond walls/doorway blockers, never inside the railing ring (property test, 10⁴ random walks). | node property test               |
| INV-R5  | **Seam integrity.** `suspend()` stops input→movement; `resume()` restores it; `state` is a valid `PlayerState` with `coordinate === ORIGIN`.                                                   | node test (logic extracted pure) |
| INV-R6  | **Publish throttle.** Presence publishes at ≤ 10 Hz and only on pose change (fake port records calls).                                                                                         | node test                        |
| INV-R7  | **Emitter lifecycle.** `createEmitter`→`dispose` leaves zero orphaned nodes on the fake context; disposal is idempotent; N emitters mix through one master gain.                               | node test (fake BusContext)      |
| INV-R8  | **Boundary purity.** No `adapters` or `convex` import under `src/presentation/**`; no change under `src/domain/entities/**`.                                                                   | lint + `git diff` gate           |
| INV-R9  | **Budget.** ≤ 30 draw calls; books are ONE `InstancedMesh`; DPR ≤ 1.5.                                                                                                                         | ?debug HUD, §7.1 ritual          |
| INV-R10 | **Mood lock.** The four §7.1 poses match the committed reference captures (post-approval).                                                                                                     | §7.1 ritual                      |

---

## 6. Error Handling & Edge Cases

| #   | Case                                             | Behaviour                                                                                                                          |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Pointer-lock denied / lost (`Esc`, alt-tab)      | Overlay returns in "click to return" state; scene keeps rendering; no crash, no input while unlocked.                              |
| E2  | `AudioContext` still suspended after entry click | `resume()` retried on the next gesture; scene never blocks on audio. Ambient starts silently when resumed.                         |
| E3  | WebGL context loss                               | Listen for `webglcontextlost`/`restored` on the canvas; show the overlay's "click to return"; R3F re-init on restore.              |
| E4  | Very high-DPI display                            | DPR clamped ≤ 1.5 (C3) — resolution never silently eats the frame budget.                                                          |
| E5  | jsdom / CI has no WebGL or Web Audio             | Pure logic (collision, instancing, bus graph) is node-tested with fakes; component smoke tests assert mount/overlay DOM only (§8). |
| E6  | Player wedged between colliders (slide livelock) | Slide iteration caps at 3; residual violation resolves by rejecting the delta (stay put) — never tunnels, never NaNs.              |
| E7  | `?pose=N` out of range / `?debug` in production  | Invalid pose param ignored (normal spawn). Debug flags are query-param-gated only — no build-time fork, harmless if discovered.    |
| E8  | Tab hidden / `useFrame` stalls                   | Movement integrates with clamped `delta` (≤ 100 ms) so returning to the tab doesn't teleport the player through a wall.            |

---

## 7. Key Design Decisions

### 7.1 The mood gate: reference captures + checklist, Rei is the instrument

"Mood-complete" cannot be mechanized, but it can be **pinned**. The ritual:

1. `debug/poses.ts` defines four exact camera poses, reachable via `?pose=N`:
   **P1** spawn framing (§4.7); **P2** at the railing, looking down the shaft;
   **P3** close to a book-wall, spines filling the frame; **P4** in the
   vestibule, mirror + staircase in frame. Rendering is deterministic (C4), so
   a pose always produces the same image.
2. During Phase 6, Rei walks the build and tunes with the executor (fog
   density, exposure, bulb intensity — all in `atmosphere.ts`/`Bulbs.tsx`).
   **The gate is Rei's chills, full stop.**
3. On approval, the four captures (1280×720 PNG) are committed to
   `docs/mood/unit-03/pose-{1..4}.png` with `checklist.md`. They become the
   regression reference: Units 04/05/06 re-render the poses and compare.
4. The checklist holds the _objective_ floor so review isn't hostage to vibes:
   - No visible horizon or sky — every sightline terminates in fog or geometry.
   - Shaft top and bottom unreadable at P2 — depth is swallowed within ~2 room-heights.
   - Both bulbs read as insufficient: far book-wall visible but dim at P1; most of every frame in deep shadow.
   - Vestibule far end fully fog-eaten at P4.
   - 60 fps on the reference device at all poses; draw calls ≤ 30 on the ?debug HUD (INV-R9).

This same ritual is the template Unit 05's chills-gate reuses (its brief asks
for one shared mechanism).

### 7.2 One camera, one owner

The locomotion controller owns the only camera and exposes
`suspend()/resume()` (§4.7). Unit 05 confirmed **in-place reading** (no
separate view mode); Unit 04 extends movement below the same controller. This
was the one real 04↔05 coupling — resolved here, in the unit both depend on,
so the parallel branches compose at merge instead of colliding.

### 7.3 The staircase seam: 03 ships the shape, 04 makes it walkable

Locked per the Unit 04 brief's flag. This unit ships `Staircase.tsx` as
**static geometry** — a spiral that visibly winds up and down out of sight in
the vestibule (it is part of mood-completeness; Borges puts it there) — with
its mouth collider-blocked. Unit 04 owns collision, the climb, and vertical
streaming, and **must not need to reshape the spiral** (radius/pitch come from
`dimensions.ts`, sized for a walkable tread from day one: `STAIR_RADIUS`
0.78 m, rise per turn = `CEILING_HEIGHT`).

### 7.4 Analytic collision beats a physics engine here

The walkable region is a hexagonal annulus with two door gaps — a handful of
half-plane and circle constraints. A physics dependency (rapier: WASM, ~1 MB,
its own frame loop) buys nothing this room needs and would be adopted _before_
the unit that walks curved geometry (04) can weigh in. Pure functions also make
INV-R4 property-testable in node, which no physics engine offers cheaply.
If Unit 04's stair math outgrows this, _that_ unit renegotiates with evidence.

### 7.5 Procedural ambient: the audio bus carries real signal, zero assets

Asset files are Unit 06's business, but shipping the bus silent would leave
the N-emitter path untested until Unit 05 needs it under gate pressure.
Filtered-noise hush + two positional bulb hums exercise ambient **and**
positional paths now, cost nothing to license or store, and are tunable in
code. "The hum of the bulbs" is also canonically right: the light is unceasing.

### 7.6 Depth aesthetics seam (inherited from Unit 02 §7.1)

The core's cipher cannot vary with depth, but the render layer stands in a
known room and has `ring(room)` in the clear. Nothing in this unit uses it
(one room at `ORIGIN`), but the atmosphere profile (§4.8) is the natural
place a depth-driven tint/fog curve lands later — noted so nobody reinvents
the impossible cipher seam.

---

## 8. Testing Strategy

Unit tests only (series-wide C5), two vitest projects. **This unit migrates
the stale globs**: the jsdom project still matches `tests/unit/{app,render}/**`
from before the layer consolidation. New globs:

- **node**: adds `tests/unit/presentation/**/*.{test,spec}.ts` (pure logic —
  no DOM). Existing `{domain,ports}` globs unchanged.
- **jsdom**: `tests/unit/{app,presentation}/**/*.{test,spec}.tsx` (components;
  `.tsx` vs `.ts` cleanly splits the projects). Existing `tests/unit/render/**`
  files migrate to `tests/unit/presentation/render/**`.

**What is tested where** (honestly: jsdom has no WebGL/Web Audio — E5):

- _node_: instancing bijectivity + determinism + jitter bounds (INV-R1..R3);
  collision containment property — 10⁴ random walks from spawn never escape
  (INV-R4); locomotion step logic extracted pure — suspend/resume + throttle
  with a fake port (INV-R5, R6); `AudioBus` graph wiring/disposal against a
  hand-rolled fake `BusContext` (INV-R7); `LocalPresencePort` satisfies the
  port and unsubscribe is callable (under `tests/unit/ports/`).
- _jsdom_: `App` mounts; `EntryOverlay` renders and its click handler fires
  enter callbacks (pointer lock itself is stubbed).
- _Visual truth_ lives in the §7.1 ritual — poses, captures, checklist, and
  the ?debug HUD for fps/draw calls. We do not pretend jsdom sees the room.

Coverage: no new threshold gate (the existing `src/domain/**` gate is
untouched); presentation pure-logic modules (`instancing.ts`, `collision.ts`,
`audio-bus.ts`) are expected near-full by construction.

---

## 9. Failure Modes & Mitigations (FMEA)

| #   | Failure Mode                                                                   | Severity     | Mitigation                                                                                                  |
| --- | ------------------------------------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | Mood judged "complete" but regresses silently while 04/05 build on it          | **Critical** | Committed reference captures + deterministic rendering (C4, INV-R10); poses re-renderable by any branch.    |
| 2   | Instance mapping drifts from what Unit 05 assumes → clicks open the wrong book | **High**     | Mapping frozen in §4.5 with INV-R1/R2 tests; nesting order mirrors the domain codec; documented in-file.    |
| 3   | Player falls into the shaft / escapes the room                                 | **High**     | Railing + blocker colliders; INV-R4 random-walk property; slide cap (E6); delta clamp (E8).                 |
| 4   | Frame budget quietly blown (draw calls creep, DPR unclamped)                   | **High**     | C3 budget + ?debug HUD; INV-R9 in the acceptance checklist; one-InstancedMesh rule.                         |
| 5   | `PlayerState` shape proves wrong for Unit 04's floating origin or 07's wire    | **High**     | Shape is exactly the coordinate/local-frame split 04 specifies; bigint kept out of serialization (§4.2).    |
| 6   | Audio unlock fails → silent piece, or bus API can't host later emitters        | Medium       | Entry gesture resumes context (E2); N-emitter handles exercised by 3 real emitters now (§7.5, INV-R7).      |
| 7   | Presentation accidentally imports adapters/convex → boundary break             | Medium       | Context-injection pattern (§4.9); boundary lint fails CI (INV-R8).                                          |
| 8   | Staircase built twice (03 and 04) or not at all                                | Medium       | §7.3 seam: shape here, walkability there; stair dimensions frozen in `dimensions.ts`.                       |
| 9   | Suspend/resume seam insufficient for Unit 05's reading ease-in                 | Medium       | Seam yields full camera control to the caller (not a scripted path), so any ease Unit 05 wants fits.        |
| 10  | Fog/mirror hooks too narrow for Unit 06's volumetric/render-target upgrade     | Low          | Hooks are whole-module (`atmosphere.ts`) / prop (`reflection`) seams — implementation swaps, surface stays. |

**Recovery / idempotency.** All phases are re-runnable (pure code + tests + a
static scene; no data store). The one human-gated step is the Phase 6 mood
approval; if captures are lost pre-commit, re-render — rendering is
deterministic (C4), so they reproduce exactly.

---

## 10. Verification (whole-unit acceptance)

- [ ] `pnpm ci:local` green (compile → lint → format:check → boundaries → unit tests → build).
- [ ] `pnpm dev`: click-to-enter overlay → pointer locks, ambient fades in, WASD + mouselook walk the hexagon; `Esc` and re-entry work (E1).
- [ ] The room is faithful: 4 book-walls × 5 shelves × 32 books (one `InstancedMesh`, 640 instances), 2 free sides, railed shaft, vestibule with two closets + mirror placeholder + static spiral staircase.
- [ ] Collision: cannot cross the railing, exit the doorways, or clip shelves/walls (INV-R4 test + manual).
- [ ] `PlayerState` finalized per §4.2; stale "Unit 05·B" comment fixed; `ContentProvider`/`PresencePort` bodies unchanged.
- [ ] `LocalPresencePort` wired via context from `app`; controller publishes ≤ 10 Hz (INV-R6); no `adapters` import under `presentation` (INV-R8).
- [ ] `AudioBus` per §4.6; hush bed + two positional bulb hums audible after entry.
- [ ] Mirror + fog hooks exist per §4.8; `PlaceholderScene.tsx` deleted; vitest globs migrated (§8).
- [ ] `?pose=1..4` and `?debug` work; draw calls ≤ 30 at every pose (INV-R9).
- [ ] **Mood gate passed**: Rei approved in a live walkthrough; `docs/mood/unit-03/pose-{1..4}.png` + `checklist.md` committed (INV-R10).
- [ ] 60 fps at all poses on the reference device (mid iGPU), recorded in `checklist.md`.

---

## 11. Prompt Execution Strategy

Executor has no context beyond this spec. Cross-layer `src/` imports are
**relative**; test imports use `@/`. No new runtime dependencies (C5). No
`Math.random` in `src/presentation/**` (C4). **Do not proceed past a red gate.**

> **Gate command reference (verified against `package.json`):**
> `pnpm compile` · `pnpm lint` · `pnpm test:unit:ci [path]` ·
> `pnpm script:verify-boundaries` · `pnpm ci:local` · `pnpm dev`.

### Phase 1: Contracts & pure foundations

#### Step 1.1: Finalize `PlayerState` + no-op presence adapter

In `src/domain/ports/index.ts`: replace `PlayerState = unknown` with the §4.2
shape (`import type { Coordinate } from '../entities'` — ports→entities is
lint-allowed); fix the header comment "Unit 05·B" → "Unit 07"; leave
`ContentProvider`/`PresencePort` bodies untouched. Create
`src/adapters/presence/local-presence-port.ts` per §4.9. Create
`src/presentation/presence-context.ts` exporting a React context typed
`PresencePort` (presentation imports the port type only). Add
`tests/unit/ports/local-presence-port.spec.ts`: adapter satisfies the
interface; `subscribe` returns a callable unsubscribe; `publish` accepts a
valid `PlayerState` with `coordinate: ORIGIN`.

##### Verify

- `pnpm compile`
- `pnpm lint`
- `pnpm test:unit:ci tests/unit/ports`

##### Timeout

120000

#### Step 1.2: Dimensions + instancing (pure)

Create `src/presentation/render/room/dimensions.ts` exactly per §4.3 and
`src/presentation/render/room/instancing.ts` per §4.5: `bookToSlot`,
`slotToBook` (throw `RangeError` out of range), `slotTransform`, `slotJitter`
(seeded integer hash of slot — e.g. a 32-bit mix — never `Math.random`).
Update vitest globs per §8 (node adds `tests/unit/presentation/**/*.{test,spec}.ts`;
jsdom becomes `tests/unit/{app,presentation}/**/*.{test,spec}.tsx`; migrate any
existing `tests/unit/render/**` file to `tests/unit/presentation/render/**`).
Add `tests/unit/presentation/render/instancing.spec.ts` asserting INV-R1
(all-640 bijectivity + out-of-range throws), INV-R2, INV-R3 (determinism +
jitter bounds), with `fast-check` where natural.

##### Verify

- `pnpm test:unit:ci tests/unit/presentation`
- `pnpm compile`

##### Timeout

150000

#### Step 1.3: Analytic collision (pure)

Create `src/presentation/render/player/collision.ts` per §4.7: collider
definitions built from `dimensions.ts` (6 wall planes with door gaps on sides
0/3 per the §4.1 orientation, shelf-face planes, railing circle, vestibule
interior, doorway/stair blockers), and
`resolveMovement(position, delta): position` implementing capsule slide with
≤ 3 iterations and delta clamp (E6, E8). Add
`tests/unit/presentation/render/collision.spec.ts` asserting INV-R4: 10⁴
`fast-check` random walks from spawn stay inside the walkable region (never
past walls/blockers, never inside `RAILING_RADIUS − PLAYER_RADIUS` of center),
plus directed cases (doorway pass-through into vestibule works; railing stops
a straight run at the shaft).

##### Verify

- `pnpm test:unit:ci tests/unit/presentation/render/collision.spec.ts`

##### Timeout

180000

#### Gate

- `pnpm compile`
- `pnpm lint`
- `pnpm test:unit:ci`

### Phase 2: Room geometry

#### Step 2.1: Hexagon shell + shaft + vestibule

Create `room/Room.tsx` (walls/floor/ceiling with door gaps on sides 0 and 3,
`side` material basic/standard dark), `room/Shaft.tsx` (hexagonal floor +
ceiling openings at `SHAFT_RADIUS`, railing ring at `RAILING_RADIUS`/`RAILING_HEIGHT`),
`room/Vestibule.tsx` (hallway per §4.3 dimensions, two `CLOSET_SIDE` closets,
far end closed), `room/Staircase.tsx` (static spiral: helical treads around a
center column at `STAIR_RADIUS`, rise `CEILING_HEIGHT` per turn, extending ~1.5
turns above and below floor level so it visibly winds out of sight — §7.3),
`room/MirrorSurface.tsx` per §4.8 (placeholder material + optional
`reflection` texture prop). All meshes reuse a small set of shared dark
`MeshStandardMaterial`s; geometry merged/grouped so the shell stays within a
handful of draw calls.

##### Verify

- `pnpm compile`
- `pnpm lint`

##### Timeout

180000

#### Step 2.2: Shelves + 640 instanced books

Create `room/Shelves.tsx` (shelf boards + frames for the four book-walls,
merged geometry) and `room/BookWalls.tsx`: ONE `THREE.InstancedMesh` (simple
beveled-box book geometry) with 640 instances, transforms + per-instance color
from `instancing.ts` (`setColorAt`), `instanceId === slot`. Static after
mount; no per-frame instance writes this unit.

##### Verify

- `pnpm compile`
- `pnpm lint`

##### Timeout

150000

#### Step 2.3: `WorldScene` replaces the placeholder

Create `render/WorldScene.tsx`: R3F `Canvas` (DPR clamped ≤ 1.5), composing
`Room` + `Shaft` + `Vestibule` + `Shelves` + `BookWalls` + a temporary static
camera at the §4.7 spawn pose. Render it from `App.tsx`; **delete
`PlaceholderScene.tsx`** and its test; add/adjust the jsdom smoke test at
`tests/unit/presentation/render/world-scene.spec.tsx` (mounts `App` without
throwing — no WebGL assertions, E5).

##### Verify

- `pnpm test:unit:ci`
- `pnpm build`

##### Timeout

150000

#### Gate

- `pnpm compile`
- `pnpm lint`
- `pnpm test:unit:ci`
- `pnpm build`

### Phase 3: Atmosphere

#### Step 3.1: Bulbs + lighting + fog

Create `room/Bulbs.tsx` (two emissive spheres + warm `PointLight`s per §4.8 —
transversal placement, no flicker) and `atmosphere/atmosphere.ts` (background
`#050507`, `FogExp2` initial density 0.18, ACES tone mapping + exposure,
ambient 0.02, exported as `AtmosphereProfile` + `applyAtmosphere` — the Unit 06
seam). Wire into `WorldScene`. Remove any leftover bright default lighting.

##### Verify

- `pnpm compile`
- `pnpm lint`

##### Timeout

120000

#### Step 3.2: Debug poses + stats

Create `debug/poses.ts` (the four §7.1 poses as exact position/yaw/pitch
records; pose 1 IS the spawn pose — single source) and `debug/DebugStats.tsx`
(three/addons `Stats` + `renderer.info.render.calls` readout). Gate both
behind URL params: `?pose=N` places the camera exactly (invalid N ignored —
E7), `?debug` shows the HUD.

##### Verify

- `pnpm compile`
- `pnpm lint`
- `pnpm build`

##### Timeout

120000

#### Gate

- `pnpm compile`
- `pnpm lint`
- `pnpm test:unit:ci`
- `pnpm build`

### Phase 4: Locomotion & entry

#### Step 4.1: Locomotion controller

Create `player/LocomotionController.tsx` per §4.7: pointer-lock mouselook
(pitch clamp), WASD ground-plane movement at `WALK_SPEED` with smoothing,
movement resolved through `collision.ts`, y locked to `EYE_HEIGHT`, delta
clamp (E8). Expose the `LocomotionHandle` seam (`suspend`/`resume`/`state`)
via ref/context. Extract the per-frame step as a pure function
`stepLocomotion(state, input, delta) → state` in a `.ts` module so INV-R5 is
node-testable; add `tests/unit/presentation/render/locomotion.spec.ts`
(suspend gates movement; resume restores; pose valid, `coordinate === ORIGIN`).
Replace the Phase-2 static camera with the controller (spawn = pose 1).

##### Verify

- `pnpm test:unit:ci tests/unit/presentation`
- `pnpm compile`

##### Timeout

180000

#### Step 4.2: Entry overlay + presence publishing

Create `src/app/EntryOverlay.tsx` per §4.7 (near-black curtain; click →
pointer lock + `bus.resume()` (bus arrives Phase 5 — accept an
`onEnter: () => Promise<void>` prop now) → ~1.5 s fade; pointer-lock loss →
"click to return"; E1/E3 handling). Wire `LocalPresencePort` in `App.tsx` via
`PresenceContext` (§4.9). In the controller, publish `PlayerState` through the
context port at ≤ 10 Hz on pose change; add
`tests/unit/presentation/render/presence-publish.spec.ts` with a fake port
asserting INV-R6.

##### Verify

- `pnpm test:unit:ci`
- `pnpm lint`

##### Timeout

150000

#### Gate

- `pnpm compile`
- `pnpm lint`
- `pnpm test:unit:ci`
- `pnpm build`

### Phase 5: Audio

#### Step 5.1: `AudioBus` (+ fake-context tests)

Create `src/presentation/audio/audio-bus.ts` per §4.6: `createAudioBus`
accepting a narrow `BusContext` (defaulting to a real `AudioContext` in the
browser), per-emitter gain (+ equal-power panner for positional) → master
gain → destination, `setListenerPose`, `resume`, idempotent `dispose`. Add
`tests/unit/presentation/audio/audio-bus.spec.ts` with a hand-rolled fake
`BusContext` asserting INV-R7 (wiring, N-emitter mix through master, disposal
leaves no orphans, double-dispose safe).

##### Verify

- `pnpm test:unit:ci tests/unit/presentation/audio`

##### Timeout

180000

#### Step 5.2: Procedural ambient wired to entry

Create `src/presentation/audio/ambient.ts` per §7.5: hush bed (looped noise
buffer → lowpass ≈ 220 Hz → slow gain LFO) on an `ambient` emitter; two 120 Hz
hum graphs on `positional` emitters at the two bulb positions from
`dimensions.ts`/`Bulbs`. Instantiate the bus in `App.tsx`/`WorldScene`, drive
`setListenerPose` from the camera each frame, connect `EntryOverlay.onEnter`
to `bus.resume()` (E2). Gains conservative: the hush is felt, not heard.

##### Verify

- `pnpm compile`
- `pnpm lint`
- `pnpm build`

##### Timeout

150000

#### Gate

- `pnpm ci:local`

### Phase 6: Mood gate & acceptance ⚠ human-in-the-loop

#### Step 6.1: Tune with Rei, then lock

Run `pnpm dev`. **With Rei present**, walk the room and tune only within
`atmosphere.ts` / `Bulbs.tsx` (fog density, exposure, bulb intensity/color,
ambient floor) until the §7.1 checklist passes and Rei approves the mood.
Then capture the four poses (`?pose=1..4`, 1280×720) and commit them to
`docs/mood/unit-03/pose-{1..4}.png` with `docs/mood/unit-03/checklist.md`
containing the checklist, the checked results, the reference-device fps and
draw-call numbers (from `?debug`), and the sentence: **"These captures are the
mood reference. Re-render the poses and compare before changing anything that
touches light, fog, or materials."** Do not proceed on a failed checklist item
without an explicit recorded waiver from Rei.

##### Verify

- `test -f docs/mood/unit-03/pose-1.png && test -f docs/mood/unit-03/checklist.md`
- `pnpm ci:local`

##### Timeout

600000

#### Step 6.2: Final sweep

Confirm: `grep -rn "Math.random" src/presentation` returns nothing (C4);
`grep -rn "from '.*adapters" src/presentation` returns nothing (INV-R8);
`git diff --stat` shows no change under `src/domain/entities/`;
`PlaceholderScene` fully gone. Walk §10's checklist and check every box.

##### Verify

- `! grep -rn "Math.random" src/presentation`
- `! grep -rn "adapters" src/presentation --include="*.ts*" -l`
- `pnpm ci:local`

##### Timeout

180000

#### Gate

- `pnpm ci:local`
- §10 checklist fully checked, mood captures committed

### Phase 7: Doctrine Review

#### Step 7.1: Review Implementation Against Doctrines

Review all code written in this spec against the doctrines registered in
`docs/doctrine/doctrine-manifest.yaml` whose trigger keywords apply (expected:
tooling-doctrine — scripts/configs/deps; the architecture boundary rules — C2/
INV-R8; coordinate-doctrine — `Coordinate`/`ORIGIN` usage in `PlayerState`;
agents-doctrine — only if doctrine files themselves change).

For each relevant doctrine, answer:

1. **Compliance**: Did we follow all MUST/MUST NOT rules? If NO, document the
   violation and why it was necessary.
2. **New Patterns**: Did we discover patterns that should become doctrine
   (e.g. the frozen-seam convention, deterministic-presentation rule C4)?
3. **Outdated Rules**: Did we find doctrine that is wrong or outdated?
4. **Missing Coverage**: Did we encounter scenarios doctrine doesn't address
   (e.g. no render/presentation doctrine exists yet)?

If ANY amendments are needed, create
`docs/tasks/ongoing/03-world-render/doctrine-amendments.md` using the standard
format (Compliance Violations / New Patterns to Add / Outdated Rules to Update /
Missing Coverage). If no amendments are needed, this step passes automatically.

##### Verify

- `test -f docs/tasks/ongoing/03-world-render/doctrine-amendments.md && echo "Amendments documented" || echo "No amendments needed"`

##### Timeout

120000

#### Step 7.2: Queue Doctrine Amendments (if any)

If `doctrine-amendments.md` exists, queue it for human review:

```bash
mkdir -p docs/tasks/ongoing/doctrine-updates
cp docs/tasks/ongoing/03-world-render/doctrine-amendments.md \
   docs/tasks/ongoing/doctrine-updates/03-world-render-amendments.md
```

##### Verify

- `ls docs/tasks/ongoing/doctrine-updates/ 2>/dev/null || echo "No doctrine updates pending"`

##### Timeout

60000

#### Gate

- `pnpm ci:local`

---

## 12. Change Log

| Version | Date       | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.1   | 2026-07-03 | Appended mandatory Phase 7: Doctrine Review (per `spec-template.md`), omitted from 1.0.0.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 1.0.0   | 2026-07-03 | Initial spec from the brief + Socratic session with Rei. Locks: mood-gate ritual (captures + checklist, Rei judges); desktop mid-iGPU 60 fps floor; spawn framing; single 640-instance book mesh + frozen slot mapping; handle-based N-emitter AudioBus; `PlayerState` = coordinate + local pose; staircase shape-here/walkable-in-04; analytic collision (no physics dep); click-to-enter overlay; in-place reading camera seam; faithful-cramped canonical dimensions. Fixes stale doctrine paths and the ports "Unit 05·B" comment. |

---

### Post-execution notes

Deviations between this spec and what shipped (Phase-6 mood pass with Rei,
2026-07-03; commits `b5f65b7`, `a616595`):

1. **Third bulb (departs from §4.8 "two bulbs are the whole story").** The
   two-bulb model left the vestibule, mirror, and staircase unreadable. Rei
   (gate owner) directed a third bulb in the vestibule hallway, recorded as an
   explicit deviation in `docs/mood/unit-03/checklist.md`. `BULB_POSITIONS`
   now has three entries; the ambient module gives each a positional hum
   automatically.
2. **Mirror relocated + material brightened (vs §4.8 "dark, glossy
   placeholder").** As specced, the mirror rendered invisible: fully-metallic
   near-black with no environment map, placed 1 cm in front of the right
   closet's void recess. Moved ~1.8 m down the right flank against lit stone;
   material now lighter with a faint emissive sheen. The `reflection` prop
   seam is unchanged.
3. **`AtmosphereProfile` gained a `fogColor` field (vs §4.8 fog = background
   color).** Fog tinted to the background read as darkness, not murk; the
   profile now separates a slightly-lighter `fogColor`. Seam surface changed
   pre-freeze; Unit 06 consumes the current shape in
   `src/presentation/render/atmosphere/atmosphere.ts`.
4. **Tuned atmosphere values** (Phase-6 knobs, as the spec intended): fog
   density 0.18 → 0.16, exposure 1.0 → 1.3, ambient 0.02 → 0.05, bulb
   intensity 1.6 → 3.2, light distance 5 → 7.
5. **Audio lifecycle fix beyond spec.** React StrictMode's dev double-mount
   disposed the app-lifetime `AudioContext` (bus disposal closes it), leaving
   dev permanently silent. The whole audio stack now lives inside one
   `useEffect` in `src/app/App.tsx`. Cookbook entry in
   `docs/doctrine/audio-doctrine.md` §4.
6. **Perf floor measured on Apple M3 Pro, not the M1-class reference device**
   (119–121 fps, ≤ 14 draw calls, headless captures). Parked question filed to
   re-verify on a genuine mid-iGPU machine before Unit 06's gate.
7. **Phase 7 fulfilled by writing doctrines directly** (`render`, `audio`,
   `mood-gate` — commit `b5f65b7`) instead of a `doctrine-amendments.md`; the
   missing-coverage finding became the doctrines themselves.
