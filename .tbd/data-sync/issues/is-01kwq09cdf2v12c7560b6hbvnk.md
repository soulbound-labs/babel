---
type: is
id: is-01kwq09cdf2v12c7560b6hbvnk
title: "Vestibule draw-call budget: record waiver or retune reflector knobs at mood gate"
kind: task
status: open
priority: 2
version: 1
labels: []
dependencies: []
created_at: 2026-07-04T16:44:47.406Z
updated_at: 2026-07-04T16:44:47.406Z
---
Live reflectors re-render the scene into 512^2 targets inside the vestibule (nested once when mirrors face each other) — the <=30 draw-call floor bends there. Knobs: RESOLUTION and LIVE_RADIUS in src/presentation/render/room/InfinityMirrors.tsx. Verify M1 fps in-vestibule; record explicit waiver in the unit checklist or retune.
