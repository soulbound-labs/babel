---
type: is
id: is-01kwrrkejxdnta434t8fkchvqg
title: Touch look-drag binds via one-shot querySelector('canvas') — dies silently on late mount or canvas replacement
kind: bug
status: open
priority: 2
version: 1
labels: []
dependencies: []
created_at: 2026-07-05T09:08:57.564Z
updated_at: 2026-07-05T09:08:57.564Z
---
## Why now (session signal)
TouchControls (src/presentation/render/hud/TouchControls.tsx) binds its look-drag listeners with a one-shot `document.querySelector('canvas')` inside a mount effect. This session's jsdom work made the fragility visible: if the canvas element mounts after TouchControls' effect runs, or R3F replaces the canvas (remount after WebGL context loss / key change), touch look input dies silently — joystick still works, look does not, no error anywhere. EntryOverlay uses the same idiom but only for one-shot lock requests, which re-query per call and are therefore safe.

## Acceptance criterion
Look-drag listeners survive (a) TouchControls mounting before the canvas exists and (b) the canvas element being replaced after mount. Either bind inside the Canvas tree via `useThree((s) => s.gl.domElement)` and bridge to the HUD through a ref/prop, or re-resolve the canvas on a cheap signal (e.g. re-query on pointerdown capture at the container). A jsdom test mounts TouchControls BEFORE inserting the canvas and asserts look deltas still accumulate after insertion.

## State-transfer prompt
> Working in soulbound-labs/babel. Your task: make TouchControls' canvas-bound look-drag listeners robust to late canvas mount and canvas replacement (acceptance above).
>
> Relevant files:
> - src/presentation/render/hud/TouchControls.tsx — the look-capture effect (`document.querySelector('canvas')`, one-shot)
> - src/presentation/render/WorldScene.tsx — renders <Canvas> and <TouchControls> as siblings; the touchInputRef seam
> - tests/unit/presentation/render/hud/TouchControls.spec.tsx — extend, don't fork
>
> Relevant prior commits:
> - c34b8cf — phase 2 (documents WHY look-drag is canvas-attached: a DOM look region would swallow the canvas tap-pick)
>
> Constraints — do NOT modify:
> - Hit-exclusion structure: HUD stays canvas siblings; world touch handlers stay on the canvas element
> - TouchInputState shape; LocomotionController's drain contract
>
> Verification commands:
> - pnpm compile && pnpm test:unit:ci tests/unit/presentation/render/hud && pnpm lint

## Dependencies
- blocked-by: []

---
originating-spec: docs/tasks/ongoing/mobile/mobile-spec.md
originating-session: 2026-07-05
cross-repo: in-repo
effort: S
