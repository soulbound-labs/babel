---
type: is
id: is-01kwnpwjr5q8b4b0dey87kvhcj
title: "Close Unit 04: record Phase-7 mood gate (Rei), archive spec, final commit + PR ready"
kind: task
status: open
priority: 1
version: 2
spec_path: docs/tasks/ongoing/04-staircase/04-staircase-spec.md
labels:
  - unit-04
  - mood-gate
dependencies:
  - type: blocks
    target: is-01kwnpwxqfkkxywcra7j15g18c
created_at: 2026-07-04T04:41:16.292Z
updated_at: 2026-07-04T04:41:49.387Z
---
Everything needed to CLOSE Unit 04 (staircase & inter-room traversal). All 8 spec phases are EXECUTED on branch `feat/04-staircase` (PR #2, draft); the ONLY thing standing between here and archive is the Phase-7 mood-gate RECORD, which needs Rei's inputs. Do not fabricate any of it.

## State (2026-07-04)
- Commits: d10cef9 (P1) → 273f45f (P2) → 4fff4dc (P3) → 7499ce2 (P4) → c6f0eda (P5) → 9351a3c (P6) → 9cf70de + d9ce73d (Phase-7 gate fixes: STAIR_OUTER_R 0.60→0.72; edge fogColor ramp to #262735 + P7 reframe) → a712dcb (traversal-doctrine.md CREATED + render/audio/mood-gate amendments) → 6b9ac2a (Phase 8 doctrine review).
- Gate green at 6b9ac2a: doctrine-lint (9 doctrines) + compile + 160 tests + lint + verify-boundaries.
- Spec: docs/tasks/ongoing/04-staircase/04-staircase-spec.md. Phase 7 protocol: spec §8 Steps 7.1/7.2; mood details §4.4.

## What Rei must supply (the human instrument — cannot be automated)
1. Captures: 1280×720 PNGs via `?pose=5..8` after entry → save as docs/mood/unit-04/pose-{5,6,7,8}.png. Double-render each pose; the two frames must be identical (nondeterminism tripwire — if they differ, STOP, find the source, never re-bless).
2. Perf: `?debug` at spawn AND mid-climb → draw calls (analytic prediction: 20 interior / 21 edge; must be ≤ 30) + fps + device → fill §1 table in docs/mood/unit-04/checklist.md. M1-class run only if marginal, else carry the M3 Pro caveat.
3. Objective floor verdicts (§3 checkboxes): P5 bottomless (≥2 repeated tiers, no terminator), P6 ≥3 receding doorframes/no black void, P7 fog denser/no wall-clip-horizon, P8 destination floor complete/no pop-in.
4. Unit 03 regression (§4): re-render P1–P4; **P3 must be byte-identical** (knob canary — if it diffs, STOP and attribute before anything else; env drift vs regression, see docs/mood/unit-04/baseline.md). P1/P2/P4 diffs expected (streamed geometry replacing void): Rei views side-by-side; on approval REPLACE captures in docs/mood/unit-03/ and APPEND amendment to docs/mood/unit-03/checklist.md (date, cause: "Unit 04 streaming made neighbor geometry visible through doorways/shaft; shaft illusion replaced the void", quoted unchanged knob values — exposure 1.3 / fog 0.16 / #0b0a10 / ambient 0.05 / bulb 3.2/7 — and re-blessing). Old captures live in git history only.
5. Stair re-walk: confirm the 0.72 walk-band killed the "squeezing through a cutout" feel (checklist §5 says pending).
6. Shaft-drone verdict: keep or DELETE (see companion bead — never tune up).
7. Final acceptance question, verbatim: "does the descent feel bottomless — is the vertigo there?" Vertigo is the feature; softening is a gate FAILURE. Live tuning confined to atmosphere.ts (incl. final RAMP values, then locked in the checklist) + Bulbs.tsx only.

## Then the agent finishes mechanically
1. Fill docs/mood/unit-04/checklist.md: tables, checkboxes, knob values at capture (incl. final RAMP), waivers in Rei's words under "Deviations recorded", and the line `Approved by: Rei, live walkthrough, <date>` (grep-verified by the spec).
2. Verify Step 7.2: `test -f docs/mood/unit-04/pose-{5..8}.png` + `grep -q "Approved by: Rei" docs/mood/unit-04/checklist.md`.
3. Archive: `git mv docs/tasks/ongoing/04-staircase docs/tasks/completed/04-staircase` (traversal-doctrine §6 pointer already targets the completed path). NOTE: doctrine-updates copy stays in docs/tasks/ongoing/doctrine-updates/.
4. Final commit per /substrate:execute step 6 format ("feat(04-staircase): execute spec … Phases: 8 … Doctrine amendments: docs/tasks/completed/04-staircase/doctrine-amendments.md"), push to origin, mark PR #2 ready-for-review.
5. Then run /substrate:synthesize-session (separate bead).

## Operating constraints (Rei-directed, standing)
- NO browser automation (puppeteer/playwright) for captures — human samples visuals.
- Commits SSH-signed via 1Password; on "failed to fill whole buffer"/"agent returned an error", ask Rei to unlock, retry at next gate.
- PR #2 comment has the full session-handoff context: https://github.com/soulbound-labs/babel/pull/2#issuecomment-4879912546
