---
type: is
id: is-01kwpy4g3dahbz0bnkeh1qcbj2
title: "Reading polish: parallel 2x stream, folio clearance, flip lock"
kind: task
status: closed
priority: 2
version: 2
labels: []
dependencies: []
created_at: 2026-07-04T16:07:10.188Z
updated_at: 2026-07-04T16:07:16.961Z
closed_at: 2026-07-04T16:07:16.953Z
close_reason: Shipped in 3cd1511, merged 47cb3a5; gate green; HIL pass by Rei
---
Quick-spec iteration on feat/05-book-reading (commit 3cd1511): folios moved into the bottom vellum margin clear of the text block; READ_LINES_PER_SECOND 8->16; reveal front now 0..40 shared by both leaves (parallel streaming, full spread 2.5s); advance/retreat refused mid-stream. P10-P12 revealedLines rescaled to 0..40 domain. Gate green, HIL-verified by Rei.
