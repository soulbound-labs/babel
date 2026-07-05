---
type: is
id: is-01kwrrmn08ddzgpzw04b4786kw
title: "Which doctrine owns app-shell lifecycle (visibility pause, ctx suspend, splash phases)? (parked: revisit at Phase 6 / next lifecycle feature)"
kind: task
status: closed
priority: 3
version: 2
labels: []
dependencies: []
created_at: 2026-07-05T09:09:36.903Z
updated_at: 2026-07-05T14:47:06.575Z
closed_at: 2026-07-05T14:47:06.574Z
close_reason: "Resolved at Phase 6: mobile-doctrine §7 owns app-shell lifecycle (visibility pause, ctx suspend, suspendedByVisibility, splash-as-gate) — no new doctrine. Cross-pointer suggestions recorded in doctrine-updates/mobile-amendments.md."
---
## The question
The mobile unit introduced app-shell lifecycle semantics that no doctrine owns: `visibilitychange` as the universal pause signal, ctx-level audio suspend in App.tsx (deliberately outside the frozen AudioBus), the `suspendedByVisibility` resume-only-what-you-suspended rule (INV-B6 guard), and EntryOverlay's splash phases doing double duty as the structural touch gate. Pieces are scattered across audio-doctrine (bus consumers), render/book-reading (splash mentions), and nothing claims the whole. Where should this live — a new app-lifecycle doctrine, a section in audio-doctrine, or split between render and audio?

## Why parked
No caller is currently confused and no doctrine claim is WRONG — the gap is coverage, not drift. The spec's Phase 6 doctrine review (pending, tracked by babel-vi8c) will produce the concrete amendment candidates; deciding the home before that review would pre-empt it.

## When to revisit
At Phase 6 of the mobile unit (babel-vi8c), or the next feature that touches visibility/suspend/splash semantics — whichever comes first.

---
originating-spec: docs/tasks/ongoing/mobile/mobile-spec.md
originating-session: 2026-07-05
