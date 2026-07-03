# Brief — Unit 08: Search

**Unit**: 08 of 08 · Stage 6 · depends on 01, 02, 03 (benefits from 04) · **final unit**
**Path**: `docs/tasks/ongoing/08-search/08-search-brief.md`
**Owner**: Rei · **For**: architect agent → `08-search-spec.md`

## Context

Babel is a deterministic Library of Babel as a flat-screen 3D art piece. The world is now walkable, readable, lush, and shared. This final unit adds the single most Borgesian act the piece can offer: **you type a line of text, and the Library shows you the exact page, in the exact book, in the exact hexagon, where that text has always lived.** Not generated for you on demand — _found_. It was already there, at a fixed address, waiting, among the ocean of noise. That is the whole philosophical payload of Borges' story made interactive: everything writable already exists, and the miracle is locating it.

This is deferred to last for good reasons — it needs nothing from the beauty or multiplayer passes, and its hard part is a piece of the core (Unit 02) that was deliberately built but left un-surfaced. Unit 02 shipped an **invertible** cipher (`inverse(line) → address`) specifically so this unit would be a plug-in, not a rewrite. This unit surfaces that inverse through a UI and reconciles the one remaining tension the math left open.

That tension is the reason this is its own unit rather than a Unit 05 afterthought. The spatial world is an _infinite_ ℤ² lattice; the content space of a single line is _finite_ (large, but finite). Search — going from text back to a location — is where those two facts meet, and where the mapping between "an address in space" and "an index in content" has to be pinned down and made total. Unit 02 forward-declared the seam for exactly this bridge; this unit builds it.

## Objective

Let a visitor **search for any text and be taken to the page that contains it**: a search input, the inverse mapping from text to a full address, and a way to view (and, where possible, walk to) the found page — including the case where the page lives outside the walkable region. Surface the invertible core Unit 02 already built, and complete the coordinate↔content-index bridge.

## What it must do

- **Search input**: a way to enter up to a line of text (or a shorter fragment placed within an otherwise-noise line) and submit it.
- **Inverse resolution**: run the entered text through the core's `inverse()` to recover the full address — `(n, floor, wall, shelf, volume, page, line)` — where that exact line exists. This is a single computation, not a scan of the library.
- **Complete the coordinate↔content-index bridge**: reconcile the infinite ℤ² spatial lattice with the finite line-content space so that search returns a stable, real coordinate for essentially any input, and the same text always resolves to the same address. This is the forward-declared seam from Unit 02; it is the substance of this unit.
- **Render the found page**: show the resolved page with its glyphs — reusing Unit 05's book/glyph rendering — so the searched text is visibly _there_, embedded in the surrounding noise at its fixed location.
- **Handle out-of-box results**: because the library is infinite but the _walkable_ region is bounded (Unit 04), many search results will resolve to coordinates you cannot physically walk to. These must be **viewable even when not walkable** — rendered in a focused view the visitor can _see but not travel to_ — preserving "the library is infinite; your legs are not."
- **Handle the unaddressable remainder**: the tiny fraction of inputs that resolve to no coordinate (the sub-room remainder from Unit 02's `inverse` returning `null`) must be handled gracefully — the text exists in principle, at no walkable-or-viewable address — rather than erroring.

## Decisions already locked (do not re-litigate)

- **Search is find, not generate.** No LLM, no fabrication. The page is computed from the deterministic core; the text was always at that address. This is the core promise — do not weaken it into "generate a page containing your text."
- **Invertible cipher already exists** (Unit 02). This unit consumes `inverse()`; it does not redesign the cipher.
- **The coordinate↔content-index bridge is this unit's real work** — the space-filling/keyed-bijection mapping that makes the infinite lattice and finite content space agree, seeded at the seam Unit 02 left. Reuse Unit 02's pairing/bridge design; do not invent a second scheme.
- **Iconic "any text is found somewhere" behavior is the target** — Unit 02's design (origin-centered spiral pairing filling nearly all of the content space) was chosen specifically so search resolves to a real coordinate for ~all inputs. Preserve it.
- **Out-of-box results are viewable, not walkable** — see, don't travel to. This was the agreed reconciliation of "infinite library, finite body."
- **Reuse Unit 05's page/glyph rendering** for displaying the found page — do not build a second glyph renderer.
- **Behold, not read**: even the found page is beheld — the searched fragment sits in surrounding noise; there's no translation or decoding affordance beyond _showing_ where the text lives.
- Consumes the frozen `@/domain` core (`inverse`, coordinate types, hashing); touches no cipher internals.

## Explicitly out of scope

Any change to the cipher or the core's determinism (Unit 02 owns it). A second glyph/page renderer (reuse Unit 05). Full-text indexing or a database of pages — search is a pure inverse computation, not a lookup; do not store or index pages in Convex. Semantic/fuzzy search, autocomplete, or "did you mean" — this is exact-content inverse resolution, not a search engine. The v2 semantic-entropy behavior at the bridge (the round-key-by-depth seam) — leave it a documented extension point, do not build it. Bookmarking/sharing coordinates is _adjacent_ and may belong here — flagged as an open question rather than assumed in.

## References (read before writing the spec)

- `docs/doctrine/00-architecture.md` — layers; where search UI (`app`/`render`) and the bridge (consumed from `domain`) sit.
- `docs/doctrine/01-frozen-contracts.md` — the `@/domain` barrel: `inverse()`, `LineAddress`, coordinate types, `hash()`.
- Unit 02 spec — the invertible cipher, the spiral pairing, the coordinate↔content-index bridge seam and its `null`/unaddressable-remainder semantics, the `ROOM_MAX` boundary, and the "any text found somewhere" design rationale. **This is the primary reference.**
- Unit 04 spec — the walkable-region bound (so the unit knows which results are walkable vs. view-only) and how walking-to a coordinate works, for results that _are_ in range.
- Unit 05 spec — the page/glyph rendering and reading view this unit reuses to display a found page.
- The Borges source — the search for meaning in the noise; the "Man of the Book"; the vindications and the crimson hexagon legend, as the conceptual frame for what search _is_ in this world.

## Open questions for the architect

- **Input granularity**: exactly one 80-char line, or a shorter fragment that the unit embeds within an otherwise-noise line before inverting? (Basile's site lets you search a fragment and fills the rest.) The choice affects the inverse pipeline and what "found" means — a whole line vs. a fragment-in-context.
- **Walkable vs. view-only presentation**: when a result _is_ inside the walkable region, do you offer to _walk there_ (spawn/route the player to that hexagon) as well as view it? When it's out of range, it's view-only — but is there a teleport/"visit" affordance that respects "your legs are finite," or is even in-range viewing done in the focused view? This is the main UX fork.
- **The bridge's exact construction**: Unit 02 left the seam; this unit realizes it. Confirm the space-filling/pairing bijection is reused verbatim from Unit 02 (it should be — a second, inconsistent bridge would break determinism), and that inverse resolution round-trips against Unit 02's forward `line()` for the same address.
- **Unaddressable-remainder UX**: what does the visitor see when `inverse()` returns `null` — "this text exists in the Library, but at no reachable location," rendered somehow, or a quiet non-result? Small case, but it's the philosophically pointed one.
- **Bookmarks/sharing**: since search resolves to a `hash(coordinate)` (Unit 02 gave us stable coordinate hashing, and multiplayer/URLs already lean on it), is shareable "here is the exact hexagon" a part of this unit or explicitly deferred? It's cheap given the hash already exists.
- **Search entry point in the world**: is search a UI overlay available anywhere (a HUD input), or is it diegetic — a specific place/object in the Library you search from? For an art piece, a diegetic entry may matter more than convenience.
- **Result determinism verification**: how do we prove `inverse(searchText)` → address → `line(address)` reproduces the search text (round-trip), as an automated check — reusing Unit 02's golden-vector discipline for search specifically?

## Deliverable

A visitor types text and the Library reveals exactly where it has always lived: the search input, the inverse resolution surfacing Unit 02's already-built invertible core, the completed coordinate↔content-index bridge that makes infinite space and finite content agree, the found page rendered via Unit 05's glyphs with the searched text embedded in its surrounding noise, out-of-range results viewable-but-not-walkable, and the unaddressable remainder handled with grace. On green, the MVP is whole — an infinite, deterministic, shared, beautiful Library where everything writable already exists and can be _found_.

---

Two flags before this goes to the architect, and then a note on the series.

**The bridge is the whole ballgame, and it must be Unit 02's bridge — not a new one.** The single biggest failure mode in this unit is the executor "helpfully" designing a fresh coordinate↔content mapping to make search work, inconsistent with the one Unit 02 used for forward generation. If those two mappings disagree by even one detail, determinism breaks silently: `inverse(line(address))` no longer returns `address`, the golden vector's promise is void, and search sends people to the wrong hexagons. The spec must state, in the strongest terms, that the bridge is _the same object_ Unit 02 built at the forward-declared seam — search reuses it, verified by an automated round-trip (`inverse ∘ line = identity`) that reuses Unit 02's golden discipline. That round-trip test is to this unit what the golden vector was to Unit 02: the tripwire that makes the promise real.

**Bookmarks are nearly free here and worth grabbing.** You already have stable `hash(coordinate)` from Unit 02, and multiplayer/URLs already depend on it. "Share this exact hexagon" falls out of search almost for nothing, and for an art piece the ability to send someone the coordinate where their name appears is a genuinely moving capability — very in the spirit of the piece. I left it an open question rather than assuming it in, but my lean is _include it_ if the schedule allows; it's the smallest possible feature with the largest sentimental payoff.

That's all eight briefs — the full dependency spine from bootstrap to search, every unit buildable from its predecessors, three parallel splits, and one frozen core underneath. When you're ready to turn any of them into specs, the four that most reward the architect's Socratic pass (because they carry the most genuinely-open decisions) are **04** (where's the wall), **06** (aesthetic direction), **07** (frame-independent position format), and **08** (the bridge round-trip) — the other four are constrained enough to near-write themselves. Want to start feeding them to the architect, or pressure-test anything across the set before you commit the series?
