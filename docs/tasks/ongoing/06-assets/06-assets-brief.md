# Brief — Unit 06: Atmosphere & Asset Pass

**Unit**: 06 of 08 · Stage 5·A · depends on 03 (min); best after 04 + 05 · **parallel with Unit 07**
**Path**: `docs/tasks/ongoing/06-atmosphere/06-atmosphere-brief.md`
**Owner**: Rei · **For**: architect agent → `06-atmosphere-spec.md`

## Context

Babel is a deterministic Library of Babel as a flat-screen 3D art piece. By the time this unit runs, the mechanics are proven: you can walk the corridor and climb the shaft (Unit 04), pull a book and watch its glyphs resolve out of the dark (Unit 05), and the chills-gate has already been passed on _placeholder geometry and mood-complete-but-basic_ atmosphere. This unit is where the world stops being a convincing sketch and becomes lush — the beauty layer that turns "yes, the magic is real" into "and it's beautiful."

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
- **Beauty comes after the chills-gate** — this unit runs _after_ Units 04 and 05 have proven the mechanics, not before.
- **Fog is a shader, not physics.** Volumetric fog is a rendering effect; no simulation.
- **Lean into darkness.** The two dim bulbs remain the entire lighting model. Polish deepens the gloom's beauty; it does not flood the room with light.
- **Mirror = real-time render-target reflection**, restored into the placeholder hook Unit 03 left in the vestibule.
- **Infinite shaft = faked** (repeating geometry + parallax + fog), consistent with Unit 04's finite streaming working set — not actually infinite geometry.
- **Proportions and instancing are frozen** — this unit reskins; it must not alter the Borges dimensions or the 640-book instancing budget the earlier units established.
- **Lane A** (three.js + R3F) throughout.

## Explicitly out of scope

Any core / coordinate / cipher / Convex logic (hard boundary). Illuminated-manuscript _text_ styling — ornamented drop caps, gold-leaf glyphs on the page — is a possible later pass; this unit does the _world and book object_ beauty, and should confirm with the architect whether on-page glyph ornamentation is in or explicitly deferred (see open questions). Mechanics changes of any kind (movement, streaming, page-turn behavior, selection). Multiplayer (Unit 07). Search (Unit 08). New geometry that changes room proportions.

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
- **On-page glyph ornamentation**: is illuminated-manuscript _text_ styling (ornamented capitals, gold leaf on the glyphs) in this unit, a separate later pass, or out entirely? Unit 05 shipped plain glyphs deliberately; confirm whether this unit touches the page text or only the book _object_ and the world.
- **Mirror fidelity vs. cost**: full real-time reflection every frame, or a cheaper approximation (lower-res render target, reflection only when the player faces it)? The iconic value is high but so is the cost.
- **Fog and the shaft agreement**: the volumetric fog must hide the shaft's finite bottom _and_ be consistent with Unit 04's streaming — how deep does the shaft illusion render before fog fully occludes, and does it match the floors Unit 04 actually streams?
- **Reversibility check**: since this is a reskin, is there value in keeping Unit 03's placeholder materials behind a flag (a "greybox mode") so regressions in the beauty pass can be bisected against the proven-magic baseline?

## Deliverable

The lush world: real PBR stone/wood/brass, volumetric fog catching the bulb-light, refined dim lighting with bloom and soft shadows, a working real-time vestibule mirror, a convincingly bottomless shaft, and a finished ambient soundscape — all layered over the proven geometry and mechanics without touching a line of core, coordinate, or Convex logic. On green, the piece looks the way it deserves to, and composes with Unit 07 (multiplayer) into the full experience.

---

Two flags before this goes to the architect.

**Lock the aesthetic direction before this unit starts, not inside it.** "Make it lush" without a settled visual target (austere Piranesi/Escher stone vs. gothic-cathedral ornament) is the one place this otherwise-safe unit can go sideways — you'd get a beautiful-but-incoherent kitbash, and reskin work is expensive to redo. This is the decision I'd most want _you_ to make explicitly rather than delegate to the architect; the brief flags it as an open question, but it's really a you-question. Given the piece's soul, my lean is austere Escher/Piranesi over gothic — endless identical stone reads more Borges than a cathedral does — but it's yours to call.

**The "greybox mode" open question is worth taking seriously as cheap insurance.** Because this unit reskins a _proven_ baseline, keeping Unit 03's placeholder materials behind a flag means any regression in the beauty pass can be bisected against the exact build that passed the chills-gate. It's a small amount of work that protects the most valuable thing the project has produced — the confirmed magic. I'd default it to _in_ unless you want the unit leaner. Want Unit 07 (multiplayer) next?

---

# Addendum — Asset Scouting Report (2026-07-05)

Six parallel research scouts (PBR materials, typography, audio, reference art, wildcards, and a
mid-scout addition: **presence** — Kairo/Pulse ghosts, Backrooms-adjacent entities, quiet-Lovecraft
skulkers) surveyed the web against the current doctrine set. Every license below was verified at
its source page unless marked otherwise. Total mandatory spend for the full recommended kit:
**$24.99**.

## A0. Doctrine drift note (read first)

This brief predates the render doctrine. Its calls for **bloom, volumetric fog, and soft shadows
are now forbidden** — `render-doctrine.md` §4 mandates no post-processing, no shadow maps,
`FogExp2` + a few PointLights, ≤ 30 draw calls, DPR ≤ 1.5 ("cheap is the design"). Every
recommendation below is no-post-compliant; scouts explicitly rejected god-rays, lens grain,
bloom-dependent effects. The spec author should reconcile the brief's "What it must do" list
against the doctrine before writing steps. The brief's open licensing question is answered de
facto below: **CC0-first, one tracked CC-BY block (OpenAIR, one credits line), OFL fonts, two
royalty-free paid items** — no untracked obligations.

Practical consequence baked into everything below: **audio is free of mood-gate cost; every visual
adoption costs a capture pass** — so the plan batches visuals into three passes and front-loads
audio.

## A1. Tileable PBR materials

Current state: `materials.ts` holds 4 untextured singletons (stone #17151a, wood #1d1410, metal
#26242a, void). Strategy: near-dark + fog means **normal + roughness maps carry everything;
albedo is nearly irrelevant** — desaturate on import.

| #   | Asset                                                                    | Source / license      | Slot            | Verdict                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------ | --------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [Plastered Stone Wall](https://polyhaven.com/a/plastered_stone_wall)     | Poly Haven, CC0, free | `stoneMaterial` | Plaster failing to conceal older stone = geological wrongness; mid-frequency chips/scuffs are exactly what dim PointLights resolve. 2.5 m physical scale keeps tile counts low.                                              |
| 2   | [Black Leather 01](https://www.cgbookcase.com/textures/black-leather-01) | cgbookcase, CC0, free | book base       | **Use normal+roughness ONLY, keep the white procedural base** — grain becomes pure light response and per-instance tint stays clean. Uniform grain = no feature repetition across thousands of spines.                       |
| 3   | [Metal 063](https://ambientcg.com/view?id=Metal063)                      | ambientCG, CC0, free  | `metalMaterial` | Oxidized-but-handled steel — glossy worn streaks against matte oxide: a railing polished by hands never seen. Procedural, featureless tiling. Inspect roughness-streak direction vs. the vertical stair column.              |
| 4   | [Dark Wooden Planks](https://polyhaven.com/a/dark_wooden_planks)         | Poly Haven, CC0, free | `woodMaterial`  | Worn dusty sheen = brutalist stacks at 3am. **Moderate risk**: knot/crack features are distinctive — crop to a knot-light region or a signature knot on every shelf becomes wallpaper; align plank direction with shelf UVs. |
| 5   | [Paper 006](https://ambientcg.com/view?id=Paper006)                      | ambientCG, CC0, free  | vellum page     | Fiber normal under the reading glow gives the page material presence at hero distance. Desaturate the beige ~50%. Single quad — 1K, nil seam risk. True parchment-PBR-CC0 is a market gap; this is the closest.              |

**Paid verdict — do not buy.** Poliigon's license treats embedded assets accessible to third
parties as redistribution (mods clause); a web game serves raw textures over HTTP — legal gray
zone, and its edge (albedo fidelity) is erased by darkness anyway. Same kills Textures.com.

**Rejected:** Poly Haven Green Metal Rust / Rust Coarse 01 (saturated albedo, sparkly
high-frequency rust), freepbr.com Old Paper (commercial grant unclear), ShareTextures ("custom
CC0" with anti-embedding clauses; its paper category is literally paper towels — and printed
English text on any paper texture would break the 29-glyph cipher fiction).

**Perf note (binding for the spec):** ship **KTX2/BasisU** (three has `KTX2Loader` built in) —
raw 2K PNG stack ≈ 300+ MB VRAM, compressed ≈ 50–60 MB. Leather/metal/paper drop to 1K.
Repetition-risk ranking, worst first: wood > stone > paper > metal ≈ leather.

## A2. Typography (reading layer + UI)

Hard filter: the 80-column grid derives glyph size from the font's **uniform advance**
(`atlas.ts:46`, `GLYPH_FONT_SIZE = READ_CELL_WIDTH / 0.6` — note: constant lives in `atlas.ts`,
not `dimensions.ts` as I guessed in the prompt). All advances below were **measured from the font
binaries with fontTools**, not estimated. All SIL OFL 1.1 (vendor/subset/SDF all permitted), all free.

1. **[Compagnon Roman](https://velvetyne.fr/fonts/compagnon/)** (Velvetyne) — **exactly 0.600 em
   uniform: a zero-constant-change drop-in.** Digitized from scanned typewriter-specimen archives;
   an 80-column wall reads as a found document typed by no one. Caveat: only the **Roman** style
   has uniform metrics (Medium is broken: k = 0.568, e = 0.627). Top pick.
2. **[TT2020 Base](https://github.com/ctrlcctrlv/TT2020)** — 0.547 em uniform. ~10 rotating
   `calt` alternates per glyph: **the same letter never renders the same way twice** — thematically
   perfect for 29⁸⁰ unique books. Two real risks: troika's Typr shaping may not execute `calt`
   (magic silently dies), and distress detail may SDF-blur at small sizes. Prototype before adopting.
3. **[Xanh Mono](https://fonts.google.com/specimen/Xanh+Mono)** — 0.500 em uniform. A book serif
   forced into monospace: fine letterpress regularized by something inhuman. Thinnest strokes of
   the four (SDF erosion risk, partly offset by the larger glyph at 0.5 advance).
4. **[Cutive Mono](https://fonts.google.com/specimen/Cutive+Mono)** — 0.6055 em uniform.
   Smith-Premier revival; the safe one-step upgrade from Courier Prime. Thin monoline — test at
   distance-min.

**UI faces:** [EB Garamond](https://fonts.google.com/specimen/EB+Garamond) (OFL) if the HUD stays
DOM — menus become a colophon; [Alegreya](https://fonts.google.com/specimen/Alegreya) (OFL) if HUD
text ever renders through troika (sturdier at small sizes).

**Rejected:** Special Elite (most atmospheric typewriter face alive — **proportional**, 24
distinct advances, no rescue), IM Fell English (canonical occult-book face — proportional AND
SDF-hostile hairlines; steal its mood for 2D title cards only), Klim Pitch (license prohibits
modification → kills subsetting; app-embedding license extra), Fontshare ecosystem (ITF license
prohibits modification), Sligoil Micro (0.600 em drop-in but terminal-funk aesthetic — parked at
https://velvetyne.fr/fonts/sligoil/ for any future "machine voice" layer).

Scout left downloaded binaries in `/tmp/fontscout/` ready for `pyftsubset` (fontTools is on this
machine).

## A3. Audio — IRs, beds, foley

Zero mood-gate cost; the whole category can land before any visual work. All Freesound items
verified CC0 via license facet; OpenAIR is **per-IR licensed** — the five below were individually
checked (all CC BY 4.0; one credits line: _"Impulse responses: OpenAIR, Audiolab, University of
York (CC BY 4.0)"_). Ship everything as opus; curated payload ≈ 10–15 MB.

**Convolution IRs (OpenAIR, all free, CC BY 4.0):**

1. [Gill Heads Mine](https://www.openair.hosted.york.ac.uk/?page_id=494) — worked-stone interior;
   convolver on the master send makes the procedural hums sit **in** the rock. Best single audio
   pickup.
2. [Innocent Railway Tunnel](https://www.openair.hosted.york.ac.uk/?page_id=525) — 517 m straight
   stone tunnel measured at 7 positions: a ready-made **distance ladder** for far/positional sends;
   keep 2 positions.
3. [Stairway, University of York](https://www.openair.hosted.york.ac.uk/?page_id=678) —
   institutional stairwell flutter for shaft-adjacent zones; breaks acoustic homogeneity.
4. [Falkland Palace Bottle Dungeon](https://www.openair.hosted.york.ac.uk/?page_id=468) —
   cistern-like stone pit; swap onto the bus during reading-mode `suspend()`: the stone leans in.
   (Re-verify its page footer at download — the one of the five confirmed second-hand.)
5. [Hamilton Mausoleum](https://www.openair.hosted.york.ac.uk/?page_id=502) — ~15 s stone decay;
   **shaft emitter only, never master** (mud). Consider truncating to 8 s. One-shots dropped in
   come back as something vast below.

**Beds/drones:** [Sonniss #GameAudioGDC archives](https://sonniss.com/gameaudiogdc/) (royalty-free,
no attribution, games explicitly allowed — cleanest license in the category; curation time is the
cost) · [bassimat "Quasi Drone"](https://freesound.org/people/bassimat/sounds/840934/) (CC0,
10:07 — no seam at bed length; transcode the 222 MB WAV to ~~5 MB opus) ·
[xkeril cave drone](https://freesound.org/people/xkeril/sounds/610538/) (CC0, zone spice; loop-seam
care) · [szegvari Dark Temple Cave](https://freesound.org/people/szegvari/sounds/581131/) (CC0
catalog well; audition — some uploads drift melodic) · Paid fallback: [Hidden Sound Drones – Dark
Ambience 01](https://www.asoundeffect.com/sound-library/drones-dark-ambience-01/) (~~$20–60, 161 min;
only if free tier leaves regions samey).

**Book foley:** **[PMSFX Books Alive](https://sonniss.com/product/books-alive) — $24.99, BUY.**
434 binding/leather/page recordings at 192 kHz on a 650-page leather hardback — the tactile
identity of the hero moment; pitch-down headroom for "impossibly large tome." Ship ~30 curated
one-shots (~2 MB). Free baseline that could ship alone: [SpaceJoe Book Sounds
pack](https://freesound.org/people/SpaceJoe/packs/27304/) (CC0, 62 **quiet** page turns — recorded
at Babel's intensity) + [esperri page-turn trio](https://freesound.org/people/esperri/sounds/119126/)
(CC0, instant round-robin) + [eZZin books](https://freesound.org/people/eZZin/sounds/641757/) (CC0).

**Rejected (license traps the spec must not re-tread):** **EchoThief** — best IR catalog
aesthetically, but license permits only derivative _rendering_; shipping raw IRs in a web bundle is
redistribution requiring written permission (chris@superhoax.com if ever worth the email).
**Fokke van Saane IRs** — no formal license, 2004-era host. **SoundMorph Doom Drones** —
loop-designed + trailer-tonal. Pulsing/orchestral Freesound drones — rhythm and melody are the
enemies.

## A4. Presence (added scope: Kairo/Pulse · Backrooms · quiet Lovecraft)

Tone ruling baked into every pick: **traces, never monsters.** Explicit entity meshes (all
surveyed Backrooms packs) are rejected on tone AND constraints — a skinned animated mesh blows
draw calls, fights determinism, and looks flat under shadowless PointLights. The Kairo register —
smudged silhouettes, stains shaped like people, sounds with no second occurrence — is exactly what
the doctrine set permits. All triggers below are **hash-gated pure functions of coordinate/move
count** — never timers, never `Math.random`.

**Audio presence (zero capture cost — do first):**

1. [audible-edge "Wind howling through cracks"](https://freesound.org/people/audible-edge/sounds/76454/)
   (CC0, 8:00 FLAC) — pitched down 2–4 semitones: the building exhaling. Hero bed of the category.
2. [Rudmer_Rotteveel wood-creak set](https://freesound.org/people/Rudmer_Rotteveel/sounds/502507/)
   (CC0, + [KVV_Audio](https://freesound.org/people/KVV_Audio/sounds/796507/),
   [Nox_Sound](https://freesound.org/people/Nox_Sound/) backups) — weight shifting, one creak at a
   time, no footstep pattern; hash-fired on ~every k-th room transition, panned off-axis.
3. [ragamuffin distant knock](https://freesound.org/people/ragamuffin/sounds/186517/) +
   [Osiruswaltz low knocking](https://freesound.org/people/Osiruswaltz/sounds/457742/) (both CC0) —
   through the mausoleum IR: three soft knocks from a gallery you cannot locate. **Rarity is the
   tone dial: 1/200 rooms = dread, 1/20 = haunted house.**
4. [nicholasdaryl "BookFallingFromShelf"](https://freesound.org/people/nicholasdaryl/sounds/563457/)
   (CC0) — somewhere in the stacks, one book just fell. The most site-specific one-shot possible;
   rarest of all, fixed coordinates. Pound-for-pound the best single one-shot in the report.
5. [geoneo0 "Four Voices Whispering"](https://freesound.org/people/geoneo0/packs/12285/) (CC0, dry
   pack) — pitched down, pre-semanticized (reverse/stretch — English words must not survive),
   through the mausoleum IR at −30 dB. Whispers inhabiting the library's impossible acoustic:
   **the single highest-leverage free pairing in the whole report.**
6. CAUTION tier: [helenavelikaja slow breathing](https://freesound.org/people/helenavelikaja/sounds/361923/)
   (CC0) — only survives heavy processing (LPF ~400 Hz, slowed, buried in the wind). If it ever
   reads as "a woman breathing," cut without mercy.

**Visual presence (each costs capture-pass time; all flag-gated):** 7. **The figure-stain** — composite a CC0 human silhouette
([publicdomainvectors](https://publicdomainvectors.org/en/human-figure-silhouette-clip-art),
pose slightly wrong: too tall, arms too low) gaussian-smudged and streaked vertically into
[ambientCG/cc0-textures "Leaking"](https://ambientcg.com/list?q=leaking) damp maps, baked into
wall albedo at import. From distance, in fog, it resolves as a standing person; up close it's
damp. **Zero draw calls.** Keep ≤ 20% legibility — crisp = haunted-house prop. 8. **The distant figure** — scout verdict: **no asset survives; hand-author it.** One 2-triangle
billboard, the same smudged silhouette at lower contrast, tinted just-darker-than-fog, 40–60 m
down a corridor axis in ~1/40 rooms (never the occupied room, culled on approach by a
deterministic distance rule). +1 draw call. **Highest-variance item in the entire report** — 5%
too legible and it's a Slender clone. Prototype behind a flag; be willing to cut.

**Rejected (the tonal line, held):** Backrooms entity meshes (itch.io/CGTrader — PSX-meme
aesthetics puncture the Borges register) · red/glowing eyes (needs bloom = banned; light that
doesn't illuminate violates the scene's physical honesty) · intelligible whispers or name-calling
(words collapse ambiguity into a ghost story with a plot) · any figure that moves, turns, or
reacts (a jump-scare with extra steps; the billboard is legal precisely because it never
acknowledges you) · composed "haunted house" wind+thunder beds (Halloween-store register).

## A5. Reference art & photography (mood-board; not shipped)

Public domain → safe to commit under `docs/mood/reference/`; copyrighted → private board only.

**The one non-negotiable:** **Erik Desmazières' Library of Babel etchings (1997–2000)** — the
definitive visual interpretation of the actual source text: hexagonal galleries, air shafts,
railings, and his solution to _showing infinity from inside it_ (etched line dissolving into haze
= our fog curve). Viewable free: [feuilleton
essay](https://www.johncoulthart.com/feuilleton/2013/02/02/the-library-of-babel-by-erik-desmazieres/),
[socks-studio](https://socks-studio.com/2011/05/01/eric-desmazieres-etchings-for-borges-library-of-babel/).
Buy: the Godine book edition, ~$100–300 used
([AbeBooks](https://www.abebooks.com/9781567921236/Library-Babel-Jorge-Luis-Borges-156792123X/plp)) — **flagged >$100**, worth it.

**Piranesi Carceri (all public domain, commit freely):** use the darker **1761 second edition**.
Met Open Access (CC0, full-res): [The Drawbridge](https://www.metmuseum.org/art/collection/search/337060)
→ shaft look-down pose · [The Round Tower](https://www.metmuseum.org/art/collection/search/337725)
→ gallery-around-shaft · [The Gothic Arch](https://www.metmuseum.org/art/collection/search/362798)
→ corridor repetition-rhythm (tone, not line, swallows the piers — the fog-falloff reference).
[Art Institute of Chicago](https://www.artic.edu/collection?artist_ids=Giovanni+Battista+Piranesi)
holds **both** 1750/1761 states — a masterclass in "same architecture, more ominous" (deeper
blacks, lowered ceilings), directly instructive for knob tuning. Met rate-limits scripts —
download by hand.

**Photography:** Candida Höfer _Libraries_ (~$65, [Rizzoli](https://www.rizzolibookstore.com/product/libraries-candida-hofer))
— repetition-as-hypnosis, frontal symmetric framing → corridor + mirror poses · Lynne Cohen
*Occupied Territory* (~$50–65, [Aperture](https://aperture.org/books/occupied-territory/)) — the
ur-text of liminal institutional dread; flat sourceless light, "someone left one second ago" ·
[Beinecke Library photo essays](https://www.archdaily.com/65987/ad-classics-beinecke-rare-book-and-manuscript-library-skidmore-owings-merrill)
— **the vellum glow made architectural**: light through material, the reading-glow reference ·
[Robarts brutalist details](https://urbantoronto.ca/news/2021/05/robarts-librarys-brutalist-details.45167)
— how raw concrete takes low raking light · [George Peabody Library on
Commons](https://commons.wikimedia.org/wiki/Category:George_Peabody_Library) (PD/CC shots) — the
purest real "one room repeated vertically around a light well."

**Painters/etchers (copyrighted, private board):** late **Beksiński**
([official estate museum](https://muzeum.sanok.pl/en/zbiory/zdzislaw-beksinski)) — steal the light
falloff: glow with no visible source, the ambient-grade reference · **Gérard Trignac**
([Warnock](https://www.warnockfinearts.com/gerard-trignac)) — where Piranesi is violent, Trignac is
silent; architecture as the only protagonist · **Escher** _Relativity_/_House of Stairs_
([mcescher.com](https://mcescher.com/gallery/back-in-holland/), strictly copyrighted) — a **logic**
reference only (his light is cheerful): the multiple-gravity trick for the vestibule mirror ·
Anton Semenov ([ArtStation](https://www.artstation.com/gloom82)) — bridge between Beksiński's haze
and what a real-time renderer can hit.

**Rejected:** baroque hall libraries (Admont/Trinity/Joanina — "civilization triumphant," the
exact opposite note; every image search will push them at you) · Nihei's _BLAME!_ (closest miss —
genuinely infinite, but one panel on the board and every session drifts cyberpunk; same kills
Giger) · Ahmet Ertug's _Temples of Knowledge_ (four figures resale — browse free at
[ahmetertug.com](https://www.ahmetertug.com/publication/temples-of-knowledge/), skip the purchase).

## A6. Wildcards

1. **[Kenney Particle Pack](https://www.kenney.nl/assets/particle-pack)** (CC0) — dust motes:
   near-static instanced sprites in the bulb cones, positions seeded per room from the coordinate
   hash, drift as a pure `f(seed, uTime)` vertex function. "This air has not moved in centuries."
   **+1 draw call.** Biggest atmosphere delta per byte in the report.
2. **[ambientCG Surface Imperfections / Scratches](https://ambientcg.com/view?id=SurfaceImperfections002)**
   (CC0) — grime multiplied into albedo/roughness **at import, offset per room by coordinate
   hash**: every room individually worn by centuries of specific, absent readers. Zero draw calls;
   kills the video-game-repeat tell. Interacts with roughness-under-PointLights — the item most
   likely to eat a second capture iteration.
3. **[Noto Sans Symbols](https://fonts.google.com/noto/specimen/Noto+Sans+Symbols)** (OFL) —
   scout's correction: it's Symbols (1), **not** Symbols 2, that covers the Unicode Alchemical
   block (U+1F700–1F77F, 116 real hermetic glyphs). Bake hash-selected glyph strings into spine
   albedo at import (zero draw calls). **Beats every paid SVG pack at $0** and composes with the
   cipher aesthetic. ☿ for those who lean in.
4. **[Voynich Manuscript scans](https://archive.org/details/voynich)** (public domain) — the most
   famous _actually undeciphered_ book on Earth as endpaper/marginalia texture. Some players will
   recognize it — which is worse. Must stay decorative (content doctrine: spreads render the
   cipher, nothing else).
5. **[Wellcome Collection alchemical engravings](https://wellcomecollection.org/search/images?query=%22Alchemy.%22)**
   (PD-marked items; verify per image) — one or two framed plates in the vestibule imply a curator.
   Who framed these? Note: vestibule was just sealed; the mirror pass must include the plates or
   their absence in the mirror becomes an _unintentional_ horror. Skip if the vestibule is already
   dense.
6. [Kinoton large-hall room tone](https://freesound.org/people/Kinoton/sounds/353159/) (license
   unverified — check before download) — the silence floor that _ducks_ when a book opens. May be
   redundant with the procedural hush; audition first.

**Rejected (constraint line held):** volumetric god-rays (every credible path is post or an
animated additive cone — flicker-adjacent, fights FogExp2's premise) · candle-flicker on the
PointLights (per-frame randomization is _precisely_ what C4 forbids; a sine "breathing" light reads
mechanical) · lens dirt/vignette/film grain (post by definition) · cobwebs/hanging-chain sway
(frame-rate-dependent sim breaks determinism; reads "abandoned house," wrong dread) · ambisonic
packs (parallel audio graph vs. the frozen one-bus API).

## A7. Top-5 acquire today

| #   | Item                                                                                           | Cost                           |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | PMSFX **Books Alive** binding/leather foley                                                    | **$24.99**                     |
| 2   | OpenAIR IR set (Gill Heads, Railway Tunnel, York Stairway, Bottle Dungeon, Hamilton Mausoleum) | free (CC BY, one credits line) |
| 3   | **Compagnon Roman** (0.600 em drop-in reading face) + EB Garamond (UI)                         | free (OFL)                     |
| 4   | PBR five: Plastered Stone Wall · Dark Wooden Planks · Metal 063 · Black Leather 01 · Paper 006 | free (CC0)                     |
| 5   | Presence audio kit: wind #76454 · creak pool · distant knocks · book-fall · whispers (dry)     | free (CC0)                     |

**Total: $24.99.** Optional flagged purchases: Desmazières Godine book ~$100–300 used (**>$100**,
the one reference that is the actual source text visualized), Höfer *Libraries* ~$65.

## A8. Phased adoption plan (fewest mood-gate passes)

**Phase 0 — audio, zero captures (start immediately, ship incrementally).**
All of A3 + A4 audio: convolvers on the bus (master send = Gill Heads; shaft emitter = truncated
Hamilton; reading-mode swap = Bottle Dungeon), beds, presence one-shot pools with hash-gated
schedules, Books Alive curation (~30 one-shots). Nothing here can alter a committed pose pixel.
Grep-gate discipline: every trigger a pure function of coordinate/move-count; no `Math.random`,
no timers.

**Phase 1 — world-material reskin → capture pass 1 (poses P1–P8).**
Stone/wood/metal/leather/vellum maps (KTX2), grime bake with per-room hash offsets, and (behind a
flag) the figure-stain bake. One tuning session inside the declared knob modules, one
re-render-and-compare, one commit of re-blessed captures. Keep Unit 03 greybox flag as the bisect
baseline (this addendum seconds the brief's insurance argument).

**Phase 2 — reading layer → capture pass 2 (poses P9–P12).**
Font swap (prototype Compagnon Roman vs. TT2020 side-by-side behind the existing poses — TT2020's
`calt`-in-troika is the one unknown that could change the ranking), Paper 006 vellum, spine
marginalia bake (Noto alchemical glyphs), optional Voynich endpapers. Books Alive foley lands here
too (audio, but auditioned against the same poses).

**Phase 3 — presence visuals & particles → capture pass 3 (flag-gated, cuttable).**
Dust motes (+1 draw), distant-figure billboard (+1 draw), optional vestibule plates (+0–1 draw).
Worst-case ledger: ~21 current + 3 = **24 of 30** — inside budget. This pass is deliberately last:
highest variance, and the piece must already give chills _without_ it; if any item reads as cheap
horror at the gate, cut it and lose nothing.

## A9. License ledger (tracked obligations)

- **CC0 / public domain** (no obligation): all PBR maps, all Freesound items marked CC0 (verify
  the two flagged: szegvari #581131, Kinoton #353159), Kenney, Met/AIC/Commons scans, Voynich,
  silhouette SVGs.
- **CC BY 4.0** (credits line required): OpenAIR IRs — _"Impulse responses: OpenAIR, Audiolab,
  University of York (CC BY 4.0)."_ Per-IR licensing: re-verify any IR beyond the five listed.
- **SIL OFL 1.1** (keep license file, rename per RFN if any): Compagnon, TT2020, Xanh Mono,
  Cutive Mono, EB Garamond, Alegreya, Noto Sans Symbols. Subsetting explicitly permitted.
- **Royalty-free proprietary** (no attribution; no raw redistribution): PMSFX Books Alive
  ($24.99), Sonniss GDC bundles. In-game use fine; do not commit raw source libraries to the repo.
- **Rejected on license alone** (do not re-tread): EchoThief, Fokke van Saane, Poliigon,
  Textures.com, ShareTextures, freepbr, Fontshare, Klim Pitch.
