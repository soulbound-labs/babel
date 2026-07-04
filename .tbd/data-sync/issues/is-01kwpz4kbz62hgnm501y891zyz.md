---
type: is
id: is-01kwpz4kbz62hgnm501y891zyz
title: Rapid Esc->Continue stranded the player unlocked (cooldown jank)
kind: bug
status: closed
priority: 2
version: 2
labels: []
dependencies: []
created_at: 2026-07-04T16:24:42.110Z
updated_at: 2026-07-04T16:24:51.640Z
closed_at: 2026-07-04T16:24:51.638Z
close_reason: Shipped in 5419371; HIL pass by Rei
---
Fixed in 5419371: Continue clicks inside Chrome's ~1.25s post-Esc pointer-lock cooldown were rejected while the curtain faded optimistically. EntryOverlay now runs an acquire-with-retry loop inside the click's transient activation and dismisses the splash only on the confirmed pointerlockchange acquire ('one moment...' while draining the cooldown). HIL-verified.
