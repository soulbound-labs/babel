# Brief — Unit 06: Atmosphere & Asset Pass

**Unit**: 06 of 08 · Stage 5·A · depends on 03 (min); best after 04 + 05 · **parallel with Unit 07**
**Path**: `docs/tasks/ongoing/06-atmosphere/06-atmosphere-brief.md`
**Owner**: Rei · **For**: architect agent → `06-atmosphere-spec.md`

## Context

Babel is a deterministic Library of Babel as a flat-screen 3D art piece. By the time this unit runs, the mechanics are proven: you can walk the corridor and climb the shaft (Unit 04), pull a book and watch its glyphs resolve out of the dark (Unit 05), and the chills-gate has already been passed on *placeholder geometry and mood-complete-but-basic* atmosphere. This unit is where the world stops being a convincing sketch and becomes lush — the beauty layer that turns "yes, the magic is real" into "and it's beautiful."

The sequencing is deliberate and load-bearing: **beauty comes after the gate, not before.** Polishing assets before the mechanics were proven would have been wasted work on a piece that might not have earned it. Now that it's earned, this unit invests. And because it's a pure rendering layer, it's the safest possible thing to run in parallel with multiplayer (Unit 07) — the two touch disjoint subsystems (rendering vs. netcode) with near-zero merge surface.

The one hard rule that makes this unit safe: **it is rendering-only.** An asset/lighting pass is exactly where someone "just quickly" caches a mesh in Convex or couples a material to app state — and suddenly the beauty layer can break the core. This unit consumes the room module, the mirror hook, and the fog hooks; it touches no coordinate, cipher, or Convex logic. Stated in writing so it stays a pure, reversible layer.

## Objective

Make the world **lush**: real PBR assets, upgraded volumetric fog, refined two-bulb lighting with bloom and shadows, a working real-time mirror reflection, a convincing infinite-shaft illusion, and polished ambient audio — all as a rendering layer over the existing, proven geometry and mechanics.

## What it must do

- **PBR asset pass**: real materials for the world — aged stone, worn wood shelving, brass/bronze on the bulbs and railing, better vellum and bindings for the books. Replace Unit 03's placeholder materials without changing proportions or the instancing scheme.
- **Volumetric fog upgrade**: from Unit 03's mood-complete basic fog to true volumetric/atmospheric fog — the light shafts from the bulbs catching in the haze, depth that swallows the corridor and the shaft. Fog is a shader effect, not physics.
- **Two-bulb lighting, refined**: the "insufficient, and unceasing" light as a finished lighting model — bloom on the bulbs, soft shadows from shelves and railings, the pool of light falling off into dark. Preserve the gloom; make it beautiful, not brighter.
- **Real-time mirror reflection**: replace Unit 03's placeholder mirror surface in the vestibule with an actual render-target reflection — the mirror that "faithfully duplicates appearances," the one Borges uses to argue about the Library's infinity. Iconic; worth the cost.
- **Infinite-shaft illusion**: the central railed shaft with floors "endlessly" above and below — faked convincingly with repeating geometry, parallax, and fog so looking down the shaft reads as bottomless and agrees with where the staircase actually goes.
- **Ambient audio polish**: refine the Unit 03 audio bed — the hush, the hum of the bulbs, room tone, the acoustics of an endless stone space — into a finished soundscape.

## Decisions already locked (do not re-litigate)

- **Rendering-only.** This unit consumes the Unit 03 room module and the mirror/fog hooks; it touches **no** coordinate, cipher, or Convex logic. Enforced by the Unit 01 boundary lint and stated as a hard constraint.
- **Beauty comes after the chills-gate** — this unit runs *after* Units 04 and 05 have proven the mechanics, not before.
- **Fog is a shader, not physics.** Volumetric fog is a rendering effect; no simulation.
- **Lean into darkness.** The two dim bulbs remain the entire lighting model. Polish deepens the gloom's beauty; it does not flood the room with light.
- **Mirror = real-time render-target reflection**, restored into the placeholder hook Unit 03 left in the vestibule.
- **Infinite shaft = faked** (repeating geometry + parallax + fog), consistent with Unit 04's finite streaming working set — not actually infinite geometry.
- **Proportions and instancing are frozen** — this unit reskins; it must not alter the Borges dimensions or the 640-book instancing budget the earlier units established.
- **Lane A** (three.js + R3F) throughout.

## Explicitly out of scope

Any core / coordinate / cipher / Convex logic (hard boundary). Illuminated-manuscript *text* styling — ornamented drop caps, gold-leaf glyphs on the page — is a possible later pass; this unit does the *world and book object* beauty, and should confirm with the architect whether on-page glyph ornamentation is in or explicitly deferred (see open questions). Mechanics changes of any kind (movement, streaming, page-turn behavior, selection). Multiplayer (Unit 07). Search (Unit 08). New geometry that changes room proportions.

## References (read before writing the spec)

- `docs/doctrine/00-architecture.md` — the layer boundary this unit must respect; `render/` only.
- `docs/doctrine/01-frozen-contracts.md` — confirmation that this unit consumes render hooks and touches no frozen core surface.
- Unit 03 spec — the room module, placeholder materials, the mirror hook, the fog hooks, the two-bulb lighting rig, the instancing scheme, the audio bus — everything this unit reskins.
- Unit 04 spec — the shaft/streaming model, so the infinite-shaft illusion agrees with actual traversal.
- Unit 05 spec — the book object and vellum, so material upgrades to the book don't break the glyph-streaming or page-turn.
- Asset sourcing: CC0 libraries (Poly Haven, ambientCG) for stone/wood/brass PBR; note licensing posture up front — this is a Soulbound Labs commercial studio piece, so CC0 is preferred and any CC-BY attribution obligations must be tracked.
- The Borges source passages — the mirror argument, the crosswise bulbs, the railed shaft, the vestibule.

## Open questions for the architect

- **Asset licensing posture**: CC0-only (cleanest for a commercial art piece), or is tracked CC-BY acceptable? This constrains sourcing and needs an answer before assets are pulled.
- **Aesthetic direction**: earlier we noted Borges reads closer to Piranesi/Escher austerity than cathedral-gothic, and you were open to an Escher aesthetic. Lock the visual target (austere endless stone vs. gothic ornament) so the asset pass has a coherent direction rather than a kitbash.
- **Performance budget after reskin**: PBR + volumetric fog + a render-target mirror + bloom/shadows is a large jump from placeholder materials. What's the frame-rate floor and target device, and what's the LOD/quality strategy so the 640-book instanced room + streaming neighbors stays within budget? The mirror render-target in particular roughly doubles draw cost for whatever it reflects — is it always-on, or only active in the vestibule?
- **On-page glyph ornamentation**: is illuminated-manuscript *text* styling (ornamented capitals, gold leaf on the glyphs) in this unit, a separate later pass, or out entirely? Unit 05 shipped plain glyphs deliberately; confirm whether this unit touches the page text or only the book *object* and the world.
- **Mirror fidelity vs. cost**: full real-time reflection every frame, or a cheaper approximation (lower-res render target, reflection only when the player faces it)? The iconic value is high but so is the cost.
- **Fog and the shaft agreement**: the volumetric fog must hide the shaft's finite bottom *and* be consistent with Unit 04's streaming — how deep does the shaft illusion render before fog fully occludes, and does it match the floors Unit 04 actually streams?
- **Reversibility check**: since this is a reskin, is there value in keeping Unit 03's placeholder materials behind a flag (a "greybox mode") so regressions in the beauty pass can be bisected against the proven-magic baseline?

## Deliverable

The lush world: real PBR stone/wood/brass, volumetric fog catching the bulb-light, refined dim lighting with bloom and soft shadows, a working real-time vestibule mirror, a convincingly bottomless shaft, and a finished ambient soundscape — all layered over the proven geometry and mechanics without touching a line of core, coordinate, or Convex logic. On green, the piece looks the way it deserves to, and composes with Unit 07 (multiplayer) into the full experience.

---

Two flags before this goes to the architect.

**Lock the aesthetic direction before this unit starts, not inside it.** "Make it lush" without a settled visual target (austere Piranesi/Escher stone vs. gothic-cathedral ornament) is the one place this otherwise-safe unit can go sideways — you'd get a beautiful-but-incoherent kitbash, and reskin work is expensive to redo. This is the decision I'd most want *you* to make explicitly rather than delegate to the architect; the brief flags it as an open question, but it's really a you-question. Given the piece's soul, my lean is austere Escher/Piranesi over gothic — endless identical stone reads more Borges than a cathedral does — but it's yours to call.

**The "greybox mode" open question is worth taking seriously as cheap insurance.** Because this unit reskins a *proven* baseline, keeping Unit 03's placeholder materials behind a flag means any regression in the beauty pass can be bisected against the exact build that passed the chills-gate. It's a small amount of work that protects the most valuable thing the project has produced — the confirmed magic. I'd default it to *in* unless you want the unit leaner. Want Unit 07 (multiplayer) next?
