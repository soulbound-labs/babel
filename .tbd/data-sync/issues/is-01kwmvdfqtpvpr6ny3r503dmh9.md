---
type: is
id: is-01kwmvdfqtpvpr6ny3r503dmh9
title: "Consolidate src layers: 6 top-level dirs -> 4 (domain{entities,ports} - adapters - presentation - app)"
kind: task
status: closed
priority: 2
version: 2
spec_path: docs/tasks/ongoing/09-layer-consolidation/09-layer-consolidation-spec.md
labels:
  - architecture
  - refactor
dependencies: []
created_at: 2026-07-03T20:41:10.137Z
updated_at: 2026-07-03T20:53:51.210Z
closed_at: 2026-07-03T20:53:51.208Z
close_reason: Landed in 75302a9. Structure (domain/{entities,ports}, adapters, presentation, app) was moved by the concurrent DDD refactor; this commit completed the missing eslint/verify-boundaries realignment (HEAD was a silent false-green) + architecture doctrine. pnpm ci:local green; entities->react provably rejected.
---
Reduce top-level src dirs from 6 to 4: move ports under domain, rename pure core to entities, merge render+audio into a new presentation (driving) layer; adapters stays driven-only. Touches architecture.md doctrine, eslint boundaries matrix, and verify-boundaries probe path. Pure structural move, no behaviour change. See spec.
