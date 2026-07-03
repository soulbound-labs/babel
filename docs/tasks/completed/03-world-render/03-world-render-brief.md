# Brief — Unit 03: World Render — Single Room + Locomotion

**Unit**: 03 of 08 · Stage 3 · depends on 01, 02
**Path**: `docs/tasks/ongoing/03-render/03-render-brief.md`
**Owner**: Rei · **For**: architect agent → `03-render-spec.md`

## Context

Babel is a deterministic Library of Babel as a flat-screen 3D art piece. Units 01–02 gave us a green repo and the pure core that turns a location into a book. This unit is where it first becomes _a place you're standing in_. It builds one hexagon, correctly proportioned, that you can walk around in first person — and it builds the atmosphere (dark, two dim bulbs, fog) that the entire piece lives or dies on.

The unit that comes right after this one on the critical path is the **book hero moment (Unit 05)**, whose go/no-go "does this give chills" test is evaluated _before_ the asset/beauty pass (Unit 06) exists. So this unit carries a heavier burden than "draw a room": it must be **mood-complete on placeholder geometry**. If the dark, the pool of dim light, and the fog don't already feel right on untextured meshes, the chills-gate is being judged unfairly and will throw a false negative. Atmosphere is a Unit 03 deliverable, deliberately — not something deferred to the asset pass.

## Objective

Deliver a **navigable single hexagon in the browser**: correct Borges proportions, first-person WASD + mouselook locomotion, mood-complete lighting and fog on basic materials, and the subsystem seams (presence interface, audio bus, mirror hook) that Stage-4 and Stage-5 units plug into. No book content, no assets, no multiplayer.

## What it must do

- Render **one correctly-proportioned hexagon**: 6 sides, 4 of them bearing bookshelves (5 shelves each), 2 free sides — one opening to the vestibule, one the entrance. Include the low-railed central ventilation shaft, the two spherical bulbs, and the vestibule with its two tiny closets and the mirror's location.
- Instance the shelves and books as **geometry only** — no ciphered content on them yet (the asset/spine detail and any per-book text is later). This exercises `InstancedMesh` at the 640-book scale so the render budget is real from day one.
- **Locomotion: WASD + mouselook**, first-person, flat-screen — a walking body, not a flying camera. This control scheme also defines how the staircase is climbed in Unit 04, so it must feel like a person moving through a dim, cramped, endless room.
- Be **mood-complete**: two dim bulbs as the whole lighting model ("insufficient, and unceasing"), aggressive fog that eats the horizon and hides the infinite shaft, dark everywhere. Cheap by design — darkness is the performance budget's best friend.
- Wire the **positional-audio bus** sized for N emitters (ambient bed only for now — the hush, the hum of the bulbs; footsteps and remote players come later).
- Consume Unit 02's coordinate types to know _which_ room this is (the fixed spawn/origin), even though only one room renders.

## Decisions already locked (do not re-litigate)

- **Lane A**: three.js + React Three Fiber own all rendering. R3F for scene composition; imperative Three inside the frame loop for the hot path (instancing, later streaming). No compiled-engine renderer; WASM is never a renderer here.
- **Faithful geometry**: 4 book-walls, 2 free sides, vestibule + mirror + two closets, central shaft with low railing, two crosswise bulbs. The linear/chain topology (2 doors) is the model; this unit only renders one room, so topology isn't exercised yet — but proportions must be exact because the room is instanced infinitely later.
- **WASD + mouselook**, first-person.
- **Atmosphere is in-scope and must feel finished** on placeholder geometry (see Context).
- The **presence interface + `PlayerState`** ship here as a **no-op/local implementation**, so Unit 07 (multiplayer) is an adapter swap, not a refactor.
- The **audio bus** is built for N emitters from day one.
- A **placeholder mirror surface** and the fog hooks are exposed so Unit 06's real render-target reflection and volumetric upgrade drop in without touching this unit.
- The core stays pure: `render/` may import from `@/domain` and `@/application` (ports), never the reverse; the Unit 01 boundary lint enforces it.

## Explicitly out of scope

Book content / streaming glyphs / page-turns (Unit 05). Inter-room movement, the traversable staircase, vertical streaming (Unit 04). PBR assets, volumetric fog, real mirror reflection, bloom/shadows polish (Unit 06 — this unit ships _basic_ materials and _mood-complete_ fog, which is a lower bar than the beauty pass). Multiplayer avatars and networked presence (Unit 07). Search (Unit 08).

## References (read before writing the spec)

- `docs/doctrine/00-architecture.md` — hexagonal layers; where `render/`, `audio/`, and port consumers sit.
- `docs/doctrine/01-frozen-contracts.md` — the frozen `@/domain` barrel and `application/ports` (`PresencePort`, `PlayerState`) this unit implements a no-op against.
- Unit 01 spec — the `render/` placeholder scene, the audio directory, the presence interface stub.
- Unit 02 spec — coordinate types + the spawn/origin coordinate.
- The two Borges source passages (the hexagon description: shelves, vestibule, mirror, shaft, staircase, bulbs) — the proportions to build against.

## Open questions for the architect

- **Spawn framing**: fixed origin coordinate `(0,0)` rendered as the sole room — confirm, and confirm the camera's start position/orientation (facing the vestibule? a book-wall?).
- **"Mood-complete" acceptance**: this is subjective and gate-critical. How do we make it _checkable_ — a reference screenshot committed to the repo? A short reviewer checklist (light falloff, fog distance, contrast, no visible horizon)? The architect should define a concrete acceptance ritual so Unit 05's gate isn't hostage to vibes.
- **Instancing budget**: target frame rate and the worst device in scope (desktop-only? mid laptop iGPU?) — this sets the LOD and draw-call ceiling for 640 instanced books now, before streaming multiplies it.
- **Book-wall geometry detail**: are shelves + book spines distinct instanced meshes, or a single instanced "book" mesh repeated 640×? Affects both look and the later asset pass.
- **Audio bus shape**: confirm N-emitter positional-audio abstraction is defined here even though only the ambient bed plays, so Unit 04/05/07 emitters slot in.

## Deliverable

A single, correctly-proportioned hexagon you can walk through in first person (WASD + mouselook), dark and fogged and lit by two dim bulbs so it already _feels_ like the Library — on basic materials, no assets, no book content. Ships the presence interface (no-op), the N-emitter audio bus (ambient only), and the mirror/fog hooks. On green, Unit 04 (staircase) and Unit 05 (books) branch from here in parallel.
