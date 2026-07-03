# Unit 03 mood gate — reference captures & checklist

**Approved by:** Rei, live walkthrough, 2026-07-03.
**Reference device:** Apple M3 Pro (exceeds the mid-iGPU floor; M1-class is the
series reference — re-verify there if numbers ever look marginal).
**Renderer settings at capture:** exposure 1.3, fog density 0.16, fog color
`#0b0a10`, ambient 0.05, bulb intensity 3.2 / distance 7 (see
`src/presentation/render/atmosphere/atmosphere.ts` + `room/Bulbs.tsx`).

> **These captures are the mood reference. Re-render the poses and compare
> before changing anything that touches light, fog, or materials.**

## Captures

1280×720 PNG, captured via `?pose=N` after entry (deterministic — C4).

| Pose                                                                                                                        | Frame | fps (1 s rAF count)         | draw calls |
| --------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------- | ---------- |
| P1 `pose-1.png` — spawn framing: book-wall spines, near bulb, shaft opening, vestibule bulb + staircase through the doorway | ✔     | 121 (display-capped 120 Hz) | 14         |
| P2 `pose-2.png` — at the railing, looking down the shaft                                                                    | ✔     | 121                         | 11         |
| P3 `pose-3.png` — book-wall close-up, spines filling the frame                                                              | ✔     | 119                         | 7          |
| P4 `pose-4.png` — vestibule: staircase winding out of sight, vestibule bulb, mirror on the right flank                      | ✔     | 121                         | 9          |

## Objective floor (spec §7.1)

- [x] No visible horizon or sky — every sightline terminates in fog or geometry.
- [x] Shaft top and bottom unreadable at P2 — depth swallowed; the railing ring
      reads, the hexagonal void below does not resolve.
- [x] Bulbs read as insufficient — pools of warm light with deep shadow between
      them; the far book-wall at P1 is visible but dim.
- [x] Vestibule far end fog-eaten at P4 — with the (Rei-directed) third
      vestibule bulb, the staircase and mirror now read, but the far cap and
      closet recesses still dissolve into darkness.
- [x] ≥ 60 fps at all poses on the reference device; draw calls ≤ 30 at every
      pose (max observed: 14).

## Deviations recorded (gate owner's direction, 2026-07-03)

- The original two-bulb tuning left the vestibule and mirror unreadable. Rei
  directed: brighter overall (exposure/ambient/bulb intensity up), a visible
  fog tint, a readable mirror, and a **third bulb in the vestibule** — a
  deliberate departure from the spec's "two bulbs are the whole story" (§4.8),
  recorded here as the gate owner's call. The spec's checklist line "most of
  every frame in deep shadow" is satisfied in spirit (shadow dominates between
  light pools) at the brighter level Rei approved.
