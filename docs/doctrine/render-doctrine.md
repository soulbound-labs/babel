# Render Doctrine — the presentation layer, its frozen seams & budgets (DOCTRINE)

> **Preload when** you touch `src/presentation/render/**` — the room modules, locomotion,
> collision, atmosphere, or debug poses — or anything that adds geometry, lights, or a
> per-frame loop. Siblings: sound is [`audio-doctrine.md`](./audio-doctrine.md); the
> acceptance ritual for anything visual is [`mood-gate-doctrine.md`](./mood-gate-doctrine.md);
> the coordinates the scene stands on are [`coordinate-doctrine.md`](./coordinate-doctrine.md).

## 1. High-level summary

The render layer turns a pure domain coordinate into **a place you are standing in**.
It is Lane A: **three.js + React Three Fiber own all rendering** — R3F for scene
composition, imperative Three inside `useFrame` for the hot path (instancing writes,
collision, audio listener pose). No WASM renderer, no physics engine, no
post-processing stack. The room is one Borges hexagon; later units instance it
infinitely, so **proportions and seams frozen here are load-bearing for every unit
after** (04 staircase, 05 books, 06 assets, 07 multiplayer).

Layer boundary (lint-enforced): everything lives in `src/presentation/**` and imports
only `domain/entities`, `domain/ports`, third-party, and other presentation modules.
`presentation` **never imports `adapters`** — the app layer instantiates adapters
(e.g. `LocalPresencePort`) and injects them via `src/presentation/presence-context.ts`.
Cross-layer imports inside `src/` are **relative**; tests may use `@/`.

## 2. The frozen seams (change = renegotiating downstream units)

| Frozen surface                                                      | Where                                        | Consumer                    |
| ------------------------------------------------------------------- | -------------------------------------------- | --------------------------- |
| Canonical dimensions (every size in the world)                      | `src/presentation/render/room/dimensions.ts` | 04, 05, 06                  |
| Book slot mapping `instanceId === slot`                             | `src/presentation/render/room/instancing.ts` | 05 (click → book)           |
| Wall→side orientation (`wall 0→side 1, 1→2, 2→4, 3→5`, CCW)         | `room/Room.tsx` / spec §4.1                  | 05                          |
| Locomotion camera seam `suspend()/resume()/state`                   | `render/player/LocomotionController.tsx`     | 04, 05                      |
| Atmosphere module surface (`AtmosphereProfile` + `applyAtmosphere`) | `render/atmosphere/atmosphere.ts`            | 06 (volumetric swap)        |
| Mirror hook (`reflection?: Texture` prop)                           | `render/room/MirrorSurface.tsx`              | 06 (render target)          |
| Bulb positions (`BULB_POSITIONS`)                                   | `render/room/Bulbs.tsx`                      | audio hums sit exactly here |
| Room-module layout convention (one file per room feature)           | `src/presentation/render/room/`              | 04, 05, 06                  |

The slot mapping nests exactly like the domain codec:
`slot = (wall * 5 + shelf) * 32 + volume`, slots `0..639`, out-of-range throws.
Unit 05 resolves clicks as `raycast → instanceId → slotToBook(instanceId)` — renumbering
slots silently rewires which book every click opens. Since Unit 04, books ship as
**eleven per-room 640-instance meshes** (`world/RoomStream.tsx`): `instanceId === slot`
holds _per mesh_, and **room identity = which mesh the ray hit** (its parent group's
`userData` carries `roomKey`/`coordinate`) — target "the current room's book mesh"
explicitly; a doorway raycast can legally hit a neighbor's books.

**One camera, one owner.** The locomotion controller owns the only camera.
Unit 05 reads books in place through `suspend()` (camera yielded to the caller) and
`resume()`; Unit 04 extends movement underneath the same controller. Never add a
second camera or a scripted camera path outside this seam.

## 3. Deterministic presentation (the render-side echo of the core)

**No `Math.random()` anywhere under `src/presentation/**`** — enforced by grep in the
unit gate. Per-book jitter (`slotJitter`) derives from a seeded integer mix of the
slot; the audio noise buffer is seeded xorshift32. Consequences:

- The same room renders **byte-identically forever** — this is what makes the
  mood-gate reference captures ([`mood-gate-doctrine.md`](./mood-gate-doctrine.md))
  a regression tool instead of a screenshot.
- Nothing may flicker, sway, or randomize per session. The bulbs are "insufficient,
  **unceasing**" — canonically and mechanically.

## 4. Performance budget (darkness is the budget's best friend)

Worst device in scope: **mid iGPU (Apple M1 / Iris Xe class), 60 fps target, < 30 fps
is failure**. Enforcers, checked at the `?debug` HUD (`render/debug/DebugStats.tsx`):

- **≤ 30 draw calls total**; each room's 640 books are **ONE `InstancedMesh`** (eleven
  per-room meshes across the working set — the Unit 05 room-identity seam; ~20 calls
  interior, 21 at an edge, ledger in `docs/mood/unit-04/checklist.md`); shelf boards
  merged; shared material singletons in `room/materials.ts` keep the program count tiny.
- `devicePixelRatio` clamped **≤ 1.5** in `WorldScene.tsx`.
- **No shadow maps, no post-processing** — darkness does the occlusion; `FogExp2` +
  a handful of `PointLight`s do the atmosphere. Cheap is the design, not a compromise.

## 5. Collision is analytic and pure — keep it that way

`render/player/collision.ts` is pure math: capsule (`PLAYER_RADIUS`) vs half-plane and
circle constraints (walls with door gaps, shelf faces, railing ring, vestibule,
doorway/stair blockers). Slide response iterates ≤ 3 times; residual violation rejects
the delta (stay put — never tunnel, never NaN); frame delta clamps at 100 ms so a
hidden tab can't teleport the player through a wall. This purity is what makes
containment property-testable in node (10⁴ random walks, `collision.spec.ts`).
A physics engine (rapier et al.) buys nothing this geometry needs. Unit 04's helicoid
stair landed _inside_ this analytic model — `render/player/stair.ts` is a pure cylindrical
surface function (tread-top snap, `MAX_STEP` cliff-reject); the player-center walk-band
`[STAIR_INNER_R, STAIR_OUTER_R]` was widened to `0.72` at the Phase-7 mood gate (the 0.24 m
band pinned the 0.56 m capsule against both the newel and the edge — "squeezing through a
cutout"). The _coordinate-driven_ half — which rooms are live, when the `CollisionContext`
is rebuilt, how the frame re-bases — is [`traversal-doctrine.md`](./traversal-doctrine.md).

## 6. Gotchas (symptom → cause → fix)

- **A dark/glossy object is invisible in the scene** → placed in front of a
  `voidMaterial` (pure-black) surface, or it's a high-`metalness` material with no
  environment map (metals reflect _something_; with nothing to reflect they render
  near-black). **Fix:** place placeholder glass/metal against lit stone, keep
  `metalness` moderate, add a faint `emissive` sheen. (The vestibule mirror shipped
  invisible this way — 1 cm in front of the closet's black recess.)
- **"There's no fog"** → fog color equals the background near-black, so FogExp2 reads
  as darkness, not murk. **Fix:** `AtmosphereProfile.fogColor` is deliberately a few
  steps lighter than `background` so distance haze is perceptible. Keep the split.
- **Scene renders bright/flat in tests or fails in CI** → jsdom has no WebGL. Visual
  truth is _not_ testable there (E5): node tests cover pure logic (instancing,
  collision, locomotion step), jsdom covers mount/overlay DOM only, and everything
  visual is judged by the mood-gate ritual.
- **The doorway to "the next room" leads nowhere** → only true at the ±64 EDGE now.
  Unit 04 shipped inter-room streaming, stair walkability, and the shaft parallax fake:
  interior doorways connect for real (the passage is the neighbor's entrance throat in
  the `CollisionContext`), and the Unit 03 invisible blocker + void volume survive ONLY
  on edge rooms' outward sides (n = −64 entrance, n = +64 far door). If an interior
  doorway dead-ends, the neighbor is missing from the collision context — see
  [`traversal-doctrine.md`](./traversal-doctrine.md), not a blocker to remove.

## 7. Pointers

- `docs/tasks/completed/03-world-render/03-world-render-spec.md` — the spec that froze
  these seams (§4 architecture, §5 invariants INV-R1..R10).
- [`traversal-doctrine.md`](./traversal-doctrine.md) — the coordinate-driven world that
  streams these rooms, rebuilds the collision context, and re-bases the frame on commit.
- [`audio-doctrine.md`](./audio-doctrine.md) — the bus the camera's listener pose drives.
- [`mood-gate-doctrine.md`](./mood-gate-doctrine.md) — the acceptance ritual + regression
  protocol for anything that touches light, fog, or materials.
- [`tooling-doctrine.md`](./tooling-doctrine.md) — dependency discipline (a renderer or
  physics dep is a deliberate decision, not an import).
