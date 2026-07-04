---
type: is
id: is-01kwpywaq1tv12da3vjwstbkpm
title: Q = close book; Esc = universal pause (revert reader-overlay bridge)
kind: task
status: closed
priority: 2
version: 2
labels: []
dependencies: []
created_at: 2026-07-04T16:20:11.105Z
updated_at: 2026-07-04T16:20:17.625Z
closed_at: 2026-07-04T16:20:17.624Z
close_reason: Shipped in d3b209c; HIL pass by Rei
---
Shipped in d3b209c on feat/05-book-reading: Q keydown closes the book with the pointer lock held (instant navigation, no click). Esc reverts to the plain pause splash in all states; an open book survives pause/resume. readingRef/closeBookRef plumbing deleted (net -65 lines). Click-to-relock net kept for the post-Esc-cooldown denial edge. HIL-verified.
