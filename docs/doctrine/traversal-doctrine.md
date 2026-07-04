# Traversal Doctrine — the coordinate-driven world (DOCTRINE)

> **Load this before touching `src/presentation/traversal/**` or
> `src/presentation/render/world/{origin,streaming,RoomStream,ShaftImpostor,EdgeVeil}.ts(x)`**,
> or the `useFrame` reconciliation in `render/player/LocomotionController.tsx`. This is the
> bridge between the pure ℤ² algebra ([[coordinate]]) and the static scene ([[render]]): how the
> player's coordinate _changes_ as they walk, and how the whole world _re-bases and streams_
> around a floating origin so an unbounded lattice renders in a bounded float frame.

## 1. High-level summary

The world is a constant-shape **working set of 11 rooms** rendered in a **local float frame
anchored to the current room**. Walking never loads: streaming is a _pure synchronous function of
the coordinate_. Crossing a doorway/stair threshold emits **exactly one `Move`**, which advances a
pure traversal machine whose **move log IS the coordinate**. On an accepted move the local frame
**re-bases in the same frame** — camera, instanced geometry, lights, mirrors, audio emitters, and
the listener all shift by the identical float delta, a screen-space no-op. The ±64 walkable bound
is a **soft stop**: no wall ever renders; fog does the visible work.

Three layers, one pipeline:

| Layer                                              | Files                                                               | Purity                      |
| -------------------------------------------------- | ------------------------------------------------------------------- | --------------------------- |
| **Machine** (walkability + state + working set)    | `presentation/traversal/{bounds,traversal,working-set}.ts`          | pure; no three/react        |
| **Floating origin + streaming**                    | `render/world/{origin,streaming,RoomStream,ShaftImpostor,EdgeVeil}` | pure math + one R3F binding |
| **Reconciliation** (the frame loop that ties them) | `render/player/LocomotionController.tsx`                            | R3F `useFrame`              |

## 2. Binding invariants (the hard-won rules)

1. **One crossing ⇒ one `Move`; the move log IS the coordinate (KDD-2 / T-3).** `crossThreshold`
   (`traversal.ts`) appends the accepted move and `coordinate === reduce(moveLog)` holds after
   _every_ commit. Nothing constructs a `Coordinate` by hand (T-1) — the machine is the only writer.
   A **refused** move (±64) returns state unchanged and **never enters the log** (T-5).

2. **Walkability gates emission; it never clamps a committed coordinate.** `canMove` /
   `isWithinBounds` (`bounds.ts`) are checked _before_ the move is applied. `WALKABLE_BOUND = 64n`
   lives here once; downstream units (Unit 07 co-location radius) import it — never re-declare 64.
   The frozen lattice algebra stays unbounded; the _policy_ is here, outside the lattice.

3. **Constant 11-room working set, adjacent floors unconditionally live (KDD-3).** `liveRooms(c)`
   (`working-set.ts`) = current floor `n ∈ [p−2, p+2]` (5) + floors ±1 with `n ∈ [p−1, p+1]`
   (3 each). Adjacent floors are _always_ live so **no mid-climb load trigger exists**. Edge rooms
   (outside ±64) are simply _absent_ from the set — this absence is what blocks an edge far-door
   (no neighbor to walk into), not a rendered wall. Keys use the frozen `${n}:${floor}`
   serialization (T-7), never `JSON.stringify`, never `Number` keys.

4. **Only small deltas touch float; absolute coordinates stay bigint (T-6).** `roomPosition(dn,
dfloor)` and every transform derive from `|Δ| ≤ 2` deltas. Converting an absolute coordinate to
   a `number` is the bug that floating origin exists to prevent — don't.

5. **Re-base is SYNCHRONOUS, same-frame, via a callback ref — NOT React state.** The controller's
   `useFrame` detects a commit, then calls the function registered in `rebaseRef`
   (`RoomStream.applyCoordinate`) _inside the same frame_, before render. Camera shift (by
   `commitShift(m)`, the exact negation of `worldShift(m)`) and world shift happen together ⇒
   screen-space no-op, no pop, no React round-trip, **zero allocation per frame** (a commit
   allocates a handful of transforms; idle frames allocate nothing). Any consumer that must move on
   commit (audio emitters/listener, shaft impostor, edge veil) is fanned out from this one call —
   **preserve this; a React-state re-base would pop.**

6. **The refusal latch prevents phantom inverse moves.** `OriginTracker` (`origin.ts`): a refused
   edge move leaves the player physically _past_ a commit plane (e.g. the entrance dead-end at
   n = −64). The tracker latches; the homeward re-crossing clears it **without emitting** —
   otherwise the return would log a spurious inverse move. Hysteresis (`COMMIT_HYSTERESIS`) around
   the vertical plane stops a hover on the mid-turn tread from flapping the coordinate.

7. **The ±64 edge is a soft stop — no wall, ever.** `canMove` refuses the move; the boundary room
   keeps the Unit 03-style invisible blocker + void volume on its outward side; the **edge-fog
   ramp** ([[mood-gate]], `atmosphere.ts` `RAMP`) thickens + lightens the fog so the world
   dissolves into murk. `EdgeVeil.tsx` computes bigint distance-to-edge and converts to a small
   `number` _only inside the ramp zone_; it applies fog via `applyAtmosphere` — no component
   constructs `FogExp2` or touches `scene.fog` directly. Stair caps at floor ±64 live in
   `StairSite.min/maxFeetY` (set by `liveCollisionSpecs`), so a capped tread is rejected below the
   commit band — a soft stop on the helix.

8. **The shaft impostor is phase-locked to the real rooms (consistency rule).** `shaftSlices(c)`
   (`streaming.ts`) places each slice at Δfloor `d` exactly where `roomPosition(0, d)` would put the
   real room — _what you see down the shaft is literally where the stairs take you._ Slices beyond
   ±64 are absent; the shaft ends in fog at the walkable stop. This is a pure function of the
   coordinate and re-bases like everything else. The impostor mesh, stair mesh, and railing are
   **not mood knobs** — changing a repeat count re-triggers the [[mood-gate]] §4 loop.

## 3. The commit-plane model (deterministic, symmetric per portal — T-2)

`origin.ts` owns the presentation-side `Move → world delta` table (T-8 — meters and axis
orientation are presentation concepts; the domain's `moveVector` stays private). Planes:

- **horizontal** — the shared door threshold: `z = FAR_PLANE_Z` outbound (`forward`),
  `z = ENTRANCE_PLANE_Z` inbound (`back`). The corridor **drifts `ROOM_DRIFT_X` (0.55 m) sideways
  per hop** (the far door sits at x = +0.55), so a straight-down-`−z` sightline hits a jamb — the
  door chain is diagonal. (This is why the P7 edge pose must thread the lane, not stare down `−z`.)
- **vertical** — feet crossing `±CEILING_HEIGHT/2` relative to the departure floor, inside a
  `±COMMIT_HYSTERESIS` band. The helix repeats every floor at θ = 0, so "climb one full turn → same
  vestibule, one floor up" is a _property of the geometry_ — the up/down rule is free.

`detectCommit(tracker, prevFeet, nextFeet, accepts)` returns at most one commit per frame
(`MAX_STEP ≪ plane spacing`). Feet space = `localPosition.y − EYE_HEIGHT`.

## 4. Streaming → collision → audio, all off the same coordinate

- `streamTransforms(liveRooms(c))` → per-room local transforms; `RoomStream` renders them as
  **per-material mega-instancing** (stone/wood/metal/void = 1 draw call each, bulbs 1, books 11
  per-room meshes — the frozen Unit 05 room-identity seam, mirrors 3, shaft 1). See [[render]] §4
  for the draw-call budget.
- `liveCollisionSpecs(c)` → the current floor's 5 rooms as `RoomCollisionSpec[]`; the controller
  rebuilds the `CollisionContext` on each commit. Collision/locomotion/stair depth lives in
  [[render]] §5 — this doctrine only owns _when_ the context is rebuilt (on set change).
- **Per-room audio hums** follow the streaming lifecycle 1:1 ([[audio]] KDD-5): `RoomStream` keeps a
  `Map<roomKey, RoomHumsHandle>`, create/dispose per room on set change, `reposition` on re-base —
  in the _same frame_ as the geometry and listener (invariant #5).

## 5. Gotchas (symptom → cause → fix)

- **Pop / jitter on doorway crossing** → re-base went through React state or a frame late → route
  it through the synchronous `rebaseRef` callback in the controller's `useFrame` (invariant #5).
- **A phantom `forward`/`back` logged when bouncing off the ±64 dead-end** → the refusal latch was
  bypassed → feed crossings through `detectCommit`, which owns `OriginTracker` (invariant #6).
- **`coordinate` and `reduce(moveLog)` disagree** → something applied a move outside
  `crossThreshold`, or a refused move was logged → the machine is the only writer; refusals never
  log (invariant #1). The loop-closure specs
  (`tests/unit/presentation/{traversal,render}/loop-closure.spec.ts`) pin this.
- **Mid-climb "load pop" / a room missing above or below** → someone made the working set
  conditional → it is constant 11, adjacent floors always live (invariant #3).
- **The edge looks like a black wall** → dense _near-black_ fog reads as a void → the edge ramp
  lightens `fogColor` toward the edge, not just density ([[mood-gate]]); geometry never caps the
  corridor.
- **NaN / drift after a long walk** → an absolute bigint coordinate leaked into float math → only
  `|Δ| ≤ 2` deltas cross into `number` (invariant #4).

## 6. Pointers

- [[coordinate]] — the pure ℤ² algebra upstream (`reduce`, `applyMove`, `hash`, `WALKABLE_BOUND`
  co-location).
- [[render]] — the static scene, mega-instancing, the draw-call/DPR budget, and analytic
  collision/locomotion/stair (§5) this pipeline feeds.
- [[audio]] — the per-room hum lifecycle (KDD-5) that rides the streaming path.
- [[mood-gate]] — the edge-fog `RAMP` knob and the "geometry is not a mood knob" rule the shaft
  impostor obeys.
- `docs/tasks/completed/04-staircase/` — the spec + KDDs this doctrine distills.
