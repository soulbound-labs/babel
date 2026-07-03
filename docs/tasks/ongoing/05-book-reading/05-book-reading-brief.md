# Brief — Unit 05: Book Reading (Hero Moment #2)

**Unit**: 05 of 08 · Stage 4·B · depends on 01, 02, 03 · **parallel with Unit 04**
**Path**: `docs/tasks/ongoing/05-books/05-books-brief.md`
**Owner**: Rei · **For**: architect agent → `05-books-spec.md`

## Context

Babel is a deterministic Library of Babel as a flat-screen 3D art piece. Unit 03 gave us one dark, fogged hexagon you can stand in. This unit is the payoff: you reach out, take a book off the shelf, open it, and watch its pages fill — 80 characters a line, 40 lines a page — with the authentic ciphered noise the core generates. You don't read it. You behold it. That act, in the dim light, is the whole reason the piece exists.

This is the **chills-gate**. Of all eight units, this is the one whose deliverable answers the only question that matters: *does the magic land?* If pulling a book and watching glyphs resolve out of the dark doesn't raise the hair on your neck, no amount of infinity, staircase, or asset polish will save the project — and you'll have learned that cheaply, four units in, before building the rest. If it does land, everything after is additive.

Because the beauty pass (Unit 06) doesn't exist yet, this gate is judged on Unit 03's mood-complete atmosphere plus plain vellum and plain glyphs. The brief must hold that bar honestly: the *staging, motion, and streaming* have to carry the moment, not textures.

Unit 05 runs parallel to Unit 04 (staircase) on a separate branch; they share only the frozen core and the Unit 03 room, so they can't collide. Whoever needs the earliest signal takes this one.

## Objective

Deliver the full **book hero moment**: click a book on the shelf → it comes to you → it opens → pages fill with real ciphered glyphs **streaming in** in real time → pages **turn** in deterministic 3D → you can close it and set it back. Plain vellum, plain glyphs, sourced entirely from Unit 02's core.

## What it must do

- **Select**: click a book on the instanced shelf; the specific book's address (`n, floor, wall, shelf, volume`) is resolved from what you clicked, so the content is exactly the book at that location.
- **Approach**: the book animates from the shelf to a comfortable reading position in front of the camera — the "it comes to you" moment. A hard-coded, deterministic animation, not physics.
- **Open & turn**: the book opens and pages turn in **deterministic 3D animation** — a click (or key) advances/retreats a page, the page visibly turns. No cloth simulation, no physics — a rigged/animated turn that reads as paper without simulating it.
- **Stream glyphs**: as a page comes into view, its characters **stream in** in real time — resolving line by line onto the vellum, evoking the text being written/revealed rather than snapping in fully-formed. Content comes from the core's `line(address)`; a page is its 40 lines.
- **Render glyphs as shaded 3D text**, not flat ASCII — via an **SDF glyph atlas** so the characters sit on the page as lit type in the dim light. Plain glyphs; no illuminated-manuscript ornamentation yet.
- **Close & return**: dismiss the book, return to walking. The world (Unit 03 room) persists behind the reading view.
- **Sound**: the reading moment uses the Unit 03 audio bus — page rustle on turn, the room's ambient bed continuing underneath.

## Decisions already locked (do not re-litigate)

- **Behold, don't read**: content is authentic ciphered noise from the deterministic core. No LLM, no readable prose, no illumination. The beauty is the *rendering* of the noise, not its meaning.
- **No physics**: the approach animation and the page-turn are **hard-coded deterministic animations** (rigged mesh + shader bend / baked motion). Cloth/soft-body simulation is explicitly rejected.
- **Streaming, not instant**: glyphs resolve onto the page over time (typed-in feel), not all-at-once. The streaming is a rendering/animation effect over locally-computed content — not a network stream.
- **SDF glyph atlas** for the text — shaded, lit type on vellum, never flat ASCII.
- **Plain glyphs, plain book** for the MVP. Ornamented capitals, gold leaf, richer vellum, better bindings are a later asset pass — do not build them here.
- **29-character alphabet**, 80 chars/line, 40 lines/page, 410 pages/book — the Borges dimensions from Unit 02.
- Content is a **pure function of the book's address** via the frozen `@/domain` core; this unit renders it and touches no core logic.
- **Lane A** (three.js + R3F). The book, its animation, and the glyph atlas are rendering concerns in `render/`.

## Explicitly out of scope

Inter-room movement, staircase, streaming rooms (Unit 04). Asset/beauty pass — illuminated manuscript styling, ornamented drop caps, gold leaf, high-fidelity vellum/bindings, volumetric fog, real mirror (Unit 06). Multiplayer / others watching you read (Unit 07). Search / jumping to a book by its text (Unit 08). Any actual reading affordances (translation, decoding, highlighting) — you behold.

## References (read before writing the spec)

- `docs/doctrine/00-architecture.md` — layers; the book/glyph rendering lives in `render/`, consuming the core through the frozen barrel.
- `docs/doctrine/01-frozen-contracts.md` — the `@/domain` barrel: `line(address)` and the `LineAddress` shape this unit feeds.
- Unit 02 spec — `line(address) → Glyph[80]`, the address components (`wall, shelf, volume, page, line`), the 29-glyph alphabet ordering, page = 40 lines.
- Unit 03 spec — the instanced shelf/book geometry (so a click can resolve to a specific book), the reading-view seam, the audio bus, the mood-complete lighting the glyphs are lit by.
- The Borges source passages — the physical book (410 pages, 40 lines, ~80 letters), and the dim, insufficient light the reading happens in.

## Open questions for the architect

- **Chills-gate acceptance**: like Unit 03's "mood-complete," this is subjective and gate-critical. How is it made checkable — a committed reference capture / short reviewer checklist (does the approach feel inviting, does the glyph-stream feel like revelation not loading, does the turn read as paper)? The architect should define the acceptance ritual so the go/no-go isn't pure vibes.
- **Click → address resolution**: how does a clicked instanced book map back to `(wall, shelf, volume)`? Instance ID → address lookup — confirm the mechanism and that it round-trips against the Unit 03 instancing scheme.
- **Streaming cadence**: characters-per-second / lines-per-frame of the glyph reveal — fast enough to not bore, slow enough to feel like revelation. And does turning a page mid-stream interrupt, queue, or finish instantly?
- **Lazy generation granularity**: generate a page's 40 lines on open, or a line at a time as it streams? (Unit 02's analysis says a full page is ~1ms worst-case, so either works — but the architect should pick and state it, and confirm no per-frame core calls in the hot path.)
- **Page-turn model**: rigged mesh with a bend shader, vs. a small set of baked turn animations, vs. a shader-only curl? All are "no physics" — pick the one that reads as paper most reliably on plain vellum.
- **Reading view vs. world**: is the book read in-place in the 3D world (camera moves to it), or does opening it transition to a focused reading view with the room behind? Affects how Unit 04's movement and this unit's camera coexist when both land.
- **Vellum legibility in the dark**: Unit 03's light is deliberately "insufficient." Does the open book get a subtle lift (a candle-like local light, a gentle self-illumination) so glyphs are legible without breaking the gloom — and is that a locked part of the hero staging?

## Deliverable

The full book hero moment on real ciphered content: click a book, it comes to you, opens, its pages fill with glyphs streaming in as shaded SDF type on plain vellum, pages turn in deterministic 3D, you close it and walk on — lit only by Unit 03's two dim bulbs, scored by the ambient bed and a page rustle. This is the chills-gate. On green, it composes with Unit 04 into the walkable-and-readable MVP, and the go/no-go on the whole piece is answerable.

---

Two flags before this goes to the architect.

**The two subjective gates (Unit 03 "mood-complete" and this one) should share one acceptance ritual, and you should decide now who holds the judgment.** I've now pushed "define a checkable ritual" to the architect in both briefs, but they're really the same question asked twice, and the honest answer is that *you* are the instrument — the gate is "does Rei get chills." The cleanest version: you commit a reference capture from an early build as the target, and the reviewer matches against it. Worth deciding whether that judgment is yours alone (it probably is, for an art piece) so the architect stops trying to mechanize something that shouldn't be.

**The "reading view vs. in-world" open question is the one real coupling between this unit and Unit 04**, and they're being built in parallel. If Unit 05 opens the book by transitioning to a focused view and Unit 04 assumes continuous in-world camera control, the two camera models can quietly conflict at merge. My default to avoid that: the book is read **in-place in the world** (camera eases to the book, movement is suspended, the room stays visible behind) — no separate view mode, so Unit 04's locomotion and this unit's reading share one camera and compose cleanly. If you'd rather a dedicated reading view, say so and I'll write the camera-ownership seam explicitly into both briefs so the parallel branches don't collide.
