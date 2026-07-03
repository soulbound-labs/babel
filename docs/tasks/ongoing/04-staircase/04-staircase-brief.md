# Brief — Unit 04: Staircase & Inter-Room Traversal (Hero Moment #1)

**Unit**: 04 of 08 · Stage 4·A · depends on 01, 02, 03 · **parallel with Unit 05**
**Path**: `docs/tasks/ongoing/04-staircase/04-staircase-brief.md`
**Owner**: Rei · **For**: architect agent → `04-staircase-spec.md`

## Context

Babel is a deterministic Library of Babel as a flat-screen 3D art piece. Unit 03 gave us one hexagon you can stand in, dark and fogged and mood-complete. This unit is where the Library becomes *endless* — where "one room" becomes "rooms without number, in every direction, forever," and where you first feel the vertigo of the shaft winding up and down into the dark.

This is one of the two hero moments of the MVP (the other is Unit 05, books). It is not set-dressing. The spiral staircase is something you physically walk, winding "upward and downward into the remotest distance." That decision — traversable, not decorative — is what makes this unit hard: the moment a player can move between rooms and floors, the whole infinite-world machinery has to come alive underneath them (streaming rooms in and out, keeping coordinates exact, keeping the world from jittering as you travel).

Unit 04 and Unit 05 run in parallel on separate branches. They share nothing but the frozen core and the Unit 03 room module, so they can't collide. This is the natural two-person split; whoever needs the earliest go/no-go signal should take **Unit 05 (books)**, since that's the chills-gate.

## Objective

Make the world **traversable**: walk forward and back along the corridor of hexagons, and climb the spiral staircase up and down between floors — with rooms streaming in and out around you, coordinates updating exactly, and loops provably closing (walk a route and its reverse, end up home). Still no book content.

## What it must do

- Build the **traversable spiral staircase** — a continuous, walkable spiral through the vestibule that winds up and down, disappearing into fog in both directions. Climbing it is the hero moment; it must feel like descending into something without bottom.
- Implement **inter-room movement**: step through the vestibule to the next/previous hexagon in the corridor; climb/descend to the same vestibule one floor up/down. Every move updates the ℤ² lattice coordinate `(n, floor)` from Unit 02.
- **Stream rooms in and out** around the player — load the neighborhood you're entering, unload what's far behind, so the world is effectively infinite without rendering infinitely. This includes streaming the *adjacent floor* while you're mid-climb, since the staircase is walkable.
- Handle **floating-origin / local-frame** rendering: track logical position as an exact `bigint` coordinate, but render in a small local float frame around the player so geometry never jitters however far you travel.
- Enforce the **deterministic `up`/`down` rule**: climbing from a vestibule lands you at the *same* vestibule one floor up, so vertical loops close exactly (climb, walk, descend, walk back = home). Same for horizontal moves.

## Decisions already locked (do not re-litigate)

- **Topology**: linear chain for MVP — each hexagon connects to exactly 2 horizontal neighbors (the 2 free sides), so a floor is a corridor, not a honeycomb. Vertical movement via the staircase makes the walkable space a 2D grid `(corridor position, floor)`. Honeycomb is a later toggle, not this unit.
- **Staircase is traversable and a hero moment** — continuous walk, not a discrete teleport-with-transition. (You explicitly chose two hero moments; this is one of them.)
- **Coordinates are exact `bigint` `(n, floor)`**; the render layer works in a **local float frame** (floating origin). The core stays the source of truth; rendering never mutates coordinates.
- **Loops close** — this is the ℤ² lattice property from Unit 02; this unit must make it true *in the walkable world*, not just in the algebra.
- **Finite body, infinite library**: the walkable region is bounded (fog/invisible walls at the edge) even though the address space is infinite. Where exactly the wall sits is an open question below, but the principle is locked.
- **Locomotion is WASD + mouselook** (from Unit 03); staircase controls extend that scheme — you walk up stairs, you don't press a "go up" button.
- Consumes the frozen `@/domain` core (`applyMove`, `reduce`, coordinate types) and the Unit 03 room module; touches no core logic.

## Explicitly out of scope

Book content, streaming glyphs, page-turns (Unit 05). PBR assets, volumetric fog, real mirror reflection, beauty polish (Unit 06). Multiplayer / other players moving through the world (Unit 07) — but movement state must stay compatible with the `PlayerState` struct from Unit 03 so networked avatars later move the same way you do. Search and out-of-box coordinates (Unit 08). The 6-way honeycomb.

## References (read before writing the spec)

- `docs/doctrine/00-architecture.md` — layers; where streaming/traversal logic sits relative to `render/` and the ports.
- `docs/doctrine/01-frozen-contracts.md` — the frozen `@/domain` barrel (`applyMove`, `invertMove`, `reduce`, coordinate types) and `PlayerState`.
- Unit 02 spec — the lattice algebra, `up`/`down`/`forward`/`back` moves, loop-closure guarantees, coordinate hashing.
- Unit 03 spec — the room module, the vestibule + staircase *geometry* placeholder, WASD + mouselook locomotion, the fog that hides the shaft, the audio bus.
- The Borges source passages — the spiral staircase "into the remotest distance," the vestibule, the endless floors above and below through the central shaft.

## Open questions for the architect

- **Where is the wall?** The walkable region is bounded — but at what radius in `n` and range in `floor`, and how is the edge presented (invisible wall, thickening fog, a subtle "you can't go further")? This sets the streaming working-set size and the multiplayer-co-location radius later.
- **Streaming working set**: how many rooms ahead/behind and floors up/down are kept live at once? What's the load/unload trigger — distance-based, or crossing a vestibule threshold? This is the core perf and correctness knob.
- **Continuous vertical streaming**: mid-climb, when does the destination floor's room become real? The staircase being walkable means there's a moment you can see *into* the next floor — how much of it must render, and at what fidelity, before you arrive?
- **The shaft illusion**: floors "endlessly" above and below through the central railed shaft — is this faked with repeating geometry + parallax + fog (cheap, and consistent with the finite working set), and does looking down the shaft need to agree with where the staircase actually takes you?
- **Loop-closure verification in-world**: beyond Unit 02's algebra tests, how do we *prove* in the running world that "climb-walk-descend-walk-back = home" — an automated integration check that drives movement and asserts the final coordinate equals origin? (Unit tests only for MVP, but this specific invariant may justify one scripted movement assertion.)
- **Staircase geometry ownership**: does the walkable spiral mesh + its collision belong to this unit, or was a placeholder shipped in Unit 03 that this unit makes walkable? Confirm the seam so the two units don't both build it.
- **Motion comfort**: even on flat screen, a walkable spiral over an infinite drop can induce unease — is that a feature (the intended vertigo) or something to soften (railing occlusion, fog depth, camera bob limits)?

## Deliverable

A world you can traverse: walk the corridor room to room, climb the spiral staircase floor to floor, with rooms streaming around you, coordinates staying exact, no jitter however far you go, and loops closing verifiably. The staircase is a hero moment — descending it into the fogged shaft should feel bottomless. No book content, no assets. On green, this composes with Unit 05 (books) into the walkable-and-readable MVP world.

---

Two flags before this goes to the architect.

**The staircase geometry seam (last-ish open question) is a real Unit 03 ↔ Unit 04 boundary you should settle now, not later** — because these two units run in parallel with Unit 05, but Unit 04 *depends on* Unit 03, and "who builds the walkable spiral mesh vs. who builds the placeholder" is exactly the kind of thing that, left ambiguous, gets built twice or not at all. My default: Unit 03 ships a static staircase *shape* as part of the mood-complete room; Unit 04 makes it walkable (collision, the climb, the vertical streaming it triggers). Worth confirming that split explicitly in the Unit 03 spec's deliverables if it isn't already, so the branches don't overlap.

**I kept "where is the wall" as an open question rather than defaulting it**, because it's genuinely coupled to a decision you haven't made yet: the multiplayer co-location radius (Unit 07). The walkable bound and "where players can actually meet" are the same number. You can answer it here in isolation, but if you'd rather I thread that Unit 07 consideration into this brief so the architect sizes the walkable region *with multiplayer in mind*, say so and I'll add it — otherwise the architect will pick a bound that Unit 07 might have to renegotiate.
