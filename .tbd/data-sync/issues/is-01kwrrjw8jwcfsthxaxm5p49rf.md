---
type: is
id: is-01kwrrjw8jwcfsthxaxm5p49rf
title: "Close mobile unit: Rei on-device walkthrough (5.3), tuning log, pose compare, Phase 6 doctrine review, archive spec"
kind: task
status: closed
priority: 1
version: 2
spec_path: docs/tasks/ongoing/mobile/mobile-spec.md
labels: []
dependencies: []
created_at: 2026-07-05T09:08:38.800Z
updated_at: 2026-07-05T14:47:06.109Z
closed_at: 2026-07-05T14:47:06.108Z
close_reason: "Unit closed at Rei's direction 2026-07-05: round-4 on-device interaction pass (4716fc5 — isPointerLocked root-cause fix + READ button), checklist §7 verdict PASS with three §4 waivers (pose compare owed before next light/fog/material change), Phase 6 doctrine review done (6d38c18, amendments in doctrine-updates/mobile-amendments.md), spec archived to docs/tasks/completed/mobile."
---
## Why now (session signal)
The mobile spec executed phases 1-5 (mechanical) green on 2026-07-05 and is PAUSED at Step 5.3 — the mandatory human gate. Nothing after it (Phase 6 doctrine review, archive) can run until Rei's on-device pass.

## Acceptance criterion
All of: (1) docs/mood/mobile/checklist.md has every §1 objective-floor item ticked or waived in §4, the §3 tuning log filled with final on-device values (source edits applied + gate re-run per change), and the §7 verdict recorded; (2) desktop pose re-render ?pose=1..4 @1280x720 pixel-identical to docs/mood/unit-03/pose-{1..4}.png; (3) Phase 6 of the spec executed (doctrine review — expected amendments: book-reading input contract is desktop-absolute, mood-gate assumes the desktop capture rig, no doctrine owns app lifecycle, FOV identity-clause pattern); (4) `git mv docs/tasks/ongoing/mobile docs/tasks/completed/mobile` committed.

## State-transfer prompt
> Working in soulbound-labs/babel. Your task: finish the mobile touch-controls unit — walk Rei's sign-off, run Phase 6 doctrine review, archive the spec.
>
> Relevant files:
> - docs/tasks/ongoing/mobile/mobile-spec.md — the executed spec; §8 Phase 5 Step 5.3 + Phase 6 are the open steps; Post-execution notes list the 5 deviations
> - docs/mood/mobile/checklist.md — the instrument sheet (objective floor, acceptance flow, tuning log, waiver table, sign-off)
> - src/presentation/input/gestures.ts, src/presentation/render/player/touch-input.ts, src/presentation/render/player/fov.ts, src/presentation/render/reading/proximity.ts — the on-device tunables
>
> Relevant prior commits:
> - f7af5e7..8b4875f — the six per-phase execution commits (2026-07-05)
> - 7f8f547 — post-execution deviation notes
>
> Constraints — do NOT modify:
> - Frozen seams: LocomotionHandle, AudioBus/BusContext, dimensions.ts, HIGHLIGHT_TINT/MIX values, desktop fov 62 (resolveFov identity clause), reader-state machine
> - No browser automation — visual truth is Rei's (mood-gate doctrine)
>
> Verification commands:
> - pnpm compile && pnpm test:unit:ci && pnpm lint
> - spec §9 grep audits (frozen-seam + invariant)

## Dependencies
- blocked-by: []

## Notes

Watch-items parked in checklist §5 (portrait READ_DISTANCE legibility, iOS `interrupted` without visibilitychange, entry-tap click suppression) — file beads only if observed on-device. Mirrors the babel-oe9o / babel-t2yu close-out pattern.

---
originating-spec: docs/tasks/ongoing/mobile/mobile-spec.md
originating-session: 2026-07-05
cross-repo: in-repo
effort: M
