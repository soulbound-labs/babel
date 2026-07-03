# Brief — Unit 07: Multiplayer

**Unit**: 07 of 08 · Stage 5·B · depends on 01, 03 · **parallel with Unit 06**
**Path**: `docs/tasks/ongoing/07-multiplayer/07-multiplayer-brief.md`
**Owner**: Rei · **For**: architect agent → `07-multiplayer-spec.md`

## Context

Babel is a deterministic Library of Babel as a flat-screen 3D art piece. By now the world is walkable (Unit 04), readable (Unit 05), and — in parallel with this unit — becoming lush (Unit 06). This unit adds the last piece of the MVP vision: **you are not alone in the Library.** Another person walks in through the vestibule, out of the fog, and you see them and hear their footsteps before you see them.

This matters more than "a feature." For a contemplative art piece where you *behold* rather than *do*, the presence of other silent figures drifting through the same infinite dark is likely the thing that turns a thirty-second novelty into something you linger in. The awe of the endless Library is amplified by sharing it wordlessly with strangers. Multiplayer may be the retention mechanism, not a bonus.

It was **descoped from the MVP's earlier units but architected-for throughout** — which is what makes this unit an *adapter swap*, not a rebuild. Unit 03 shipped a presence interface with a no-op local implementation, a `PlayerState` struct, and an N-emitter audio bus. Unit 04 kept movement state compatible with that struct. This unit implements the real thing behind those seams.

It runs parallel to Unit 06 (atmosphere) on a separate branch. The two touch disjoint subsystems — netcode vs. rendering — so the merge surface is near-zero, provided this unit stays out of the render internals and only *feeds* avatar state into the existing render/audio hooks.

## Objective

Let players **see and hear each other move** through the Library in real time: a lightweight identity per session, positions synced through Convex presence, remote avatars rendered moving through the fog, and their footsteps placed in the world via the existing positional-audio bus. Swap Unit 03's no-op presence implementation for a live Convex-backed one.

## What it must do

- **Identity per session**: give each visitor a stable session-scoped player identity (an anonymous player ID) so a second avatar can be distinguished and drawn. No login, no account required to enter — but identity of *some* kind exists, because you can't draw a second person without knowing they're a distinct person.
- **Position sync via Convex Presence**: publish the local player's position/facing and subscribe to others', using the Convex Presence component. Debounced to a modest rate (~5–10 Hz) with client-side interpolation so remote avatars glide rather than teleport — appropriate for the slowest-possible multiplayer experience (people drifting through fog).
- **Remote avatars**: render other players as moving figures in the world — enough to read as "a person is there, and there, in the dark." They move using the same movement model the local player does (the `PlayerState` from Unit 03/04), so remote and local motion are consistent.
- **Positional footsteps**: place remote players' footsteps into the Unit 03 audio bus as positional emitters — you hear someone approaching through the fog before you see them. This is presence-work the fog is actively hiding, and it's half the effect.
- **Swap the presence adapter**: replace Unit 03's no-op `PresencePort` implementation with the live Convex one. Downstream code that consumed the interface should not need to change — that's the payoff of the seam.
- **Co-location**: because the walkable region is bounded and everyone spawns at the same origin, players actually share hexagons near spawn — this is where "seeing each other" happens. The unit must render/sync correctly when multiple players occupy the same or adjacent rooms.

## Decisions already locked (do not re-litigate)

- **Descoped-but-architected-for**: this is an adapter swap behind the Unit 03 presence interface + `PlayerState` + audio bus. Do not refactor those seams; implement against them.
- **Transport = Convex Presence component.** Convex is fine for this because a Borges library is the slowest multiplayer imaginable (people drift through fog); debounced ~5–10 Hz + client interpolation is the model. No separate WSS relay, no Cloudflare — the earlier stack decision stands unless concurrency proves it can't.
- **Peak concurrency target ≈ 50** near spawn. Design and test against that, not thousands.
- **Convex Auth is acceptable here** — and *only* here — purely to light up the Presence component if that's the cleanest path. It was deliberately kept out of every earlier unit (removed from Unit 01's bootstrap). If anonymous sessions suffice for Presence, prefer them; use Convex Auth only if Presence effectively requires an auth identity.
- **No authentication as a user-facing gate**: entering the Library requires nothing. Whatever identity exists is anonymous/session-scoped.
- **Convex enters as a real dependency here** (its first real schema/functions). Earlier units treated it as empty scaffold; deterministic content still needs no DB — this unit uses Convex for *presence*, not for storing books.
- **Deterministic world is shared for free**: because content is a pure function of coordinates (Unit 02), two players in the same hexagon see the same books with no synchronization — only *positions* need syncing, never content.

## Explicitly out of scope

Storing generated books in Convex — content is deterministic and needs no persistence (do not "helpfully" cache books; it would couple the core to the backend). Voice or text chat between players — this is a wordless, contemplative piece. Player collision/physics interactions — avatars pass through each other; no bumping. Avatar customization / appearance choice. Any render-internal changes — this unit *feeds* avatar state into Unit 03/06 render hooks; it does not restyle the world (that's Unit 06). Anti-abuse/anti-spoofing hardening beyond the basics (acceptable gap for an art piece; note it). Search (Unit 08). Bookmarks/shareable coordinates (Unit 08 territory).

## References (read before writing the spec)

- `docs/doctrine/00-architecture.md` — layers; where the Convex presence adapter and avatar rendering sit relative to `adapters/`, `render/`, and the ports.
- `docs/doctrine/01-frozen-contracts.md` — the `PresencePort` interface and `PlayerState` struct this unit implements against.
- Unit 01 spec — the empty Convex scaffold, the `ConvexProvider`, env wiring, and the fact that Convex Auth was deliberately deferred to here.
- Unit 03 spec — the `PresencePort` no-op implementation, the `PlayerState` struct, the N-emitter positional-audio bus, and the avatar render seam this unit feeds.
- Unit 04 spec — the movement model and coordinate/local-frame handling, so remote avatars move and stream identically to the local player.
- Unit 06 spec (parallel) — the render/audio hooks avatars feed into, to confirm the disjoint boundary and avoid merge conflict.
- Convex Presence component documentation — the debounce/interpolation pattern, its identity model, and its concurrency characteristics at ~50 players. The architect should verify current Presence capabilities and limits rather than assume.

## Open questions for the architect

- **Anonymous sessions vs. Convex Auth for Presence**: does the Presence component require an authenticated identity, or can it key on an anonymous session ID? This decides whether Convex Auth enters at all. Prefer anonymous; confirm against current Convex docs.
- **Position representation across the floating-origin world**: the local player has an exact `bigint` coordinate + a local float frame (Unit 04). What exactly is published — the `bigint` room coordinate plus an in-room float offset + facing? Remote clients must reconstruct a remote avatar's world position in *their own* local frame. This is the subtlest correctness point in the unit.
- **Co-location rendering**: when two players share a hexagon, how are both drawn correctly in each other's local frame? And across the bounded walkable region, how far apart can players be and still be synced/visible — is presence global (all ~50 everywhere) or spatial (only sync players in nearby rooms)?
- **Sync rate and interpolation**: confirm the debounce rate (~5–10 Hz) and the interpolation/extrapolation scheme that makes drifting avatars smooth without a dedicated game-netcode transport. What happens on a dropped update — hold, extrapolate, or freeze?
- **Footstep audio placement**: remote footsteps are positional emitters in the Unit 03 bus — driven by remote velocity? Cadence tied to their movement speed? How many simultaneous footstep emitters before the audio bus needs culling (near the 50-player cap, mostly hidden by fog)?
- **Presence lifecycle**: join (spawn at origin), leave (disconnect/tab-close), and stale-entry cleanup — how are avatars added and, crucially, *removed* so ghosts don't accumulate?
- **The walkable-bound ↔ co-location coupling**: Unit 04 set (or left open) where the invisible wall sits. That radius *is* the co-location radius — the smaller the walkable region, the more players share rooms and actually meet. Confirm the two decisions agree; if Unit 04 picked a bound without multiplayer in mind, this unit may need to renegotiate it.

## Deliverable

Two or more people share the Library in real time: anonymous session identity, positions synced through Convex Presence at a debounced rate with smooth interpolation, remote avatars drifting through the fog, and their footsteps placed positionally in the world — all behind the presence seam Unit 03 left, with the no-op adapter swapped for the live Convex one, and no changes to the deterministic core or the render internals. On green, the MVP vision is complete: *"one person walks in through the vestibule."*

---

Two flags before this goes to the architect.

**The walkable-bound ↔ co-location coupling (last open question) is the one cross-unit decision that can bite at integration.** I raised it in the Unit 04 brief too and deliberately left the wall's radius open there — because that number is simultaneously "how far you can wander" and "how likely you are to ever meet someone." If Unit 04 ships first (it's on the critical path; this unit is Stage 5) and picks a bound sized only for streaming performance, you could end up with a walkable region so large that fifty players scatter and never see each other — silently defeating this unit. My recommendation: **decide the walkable radius with multiplayer in mind now**, and write the agreed number into *both* the Unit 04 and Unit 07 specs so the parallel-and-sequential branches don't disagree. Want me to go back and thread a concrete proposed radius through both?

**The position-representation question is the real technical core of this unit, and it's easy to under-spec.** "Sync positions" sounds trivial until the floating-origin world makes it not: every client has its *own* local float frame around its *own* bigint origin, so a remote player's published position has to be expressed in a frame-independent way (bigint room coordinate + in-room offset + facing) and reconstructed per-client. If the architect treats positions as simple world-space floats, it'll work near spawn and drift/break as players move — the exact failure mode floating-origin exists to prevent. I'd make sure the spec pins the frame-independent position format explicitly rather than leaving it to the executor. This is the one place I'd want the architect to slow down and be Socratic with you.
