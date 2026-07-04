---
type: is
id: is-01kwpyfbj5q0t93nyhxax789b2
title: Esc-while-reading left the player stuck unlocked
kind: bug
status: closed
priority: 2
version: 2
labels: []
dependencies: []
created_at: 2026-07-04T16:13:05.988Z
updated_at: 2026-07-04T16:13:19.819Z
closed_at: 2026-07-04T16:13:19.818Z
close_reason: Shipped in 3b42b87; HIL pass by Rei
---
Fixed in 3b42b87 on feat/05-book-reading: the pointerlockchange handler's auto-re-lock after shelving a book can never succeed (no user activation + Chrome post-Esc cooldown), leaving no click surface. Now any click while the curtain is hidden and the pointer is free re-requests the lock. HIL-verified.
