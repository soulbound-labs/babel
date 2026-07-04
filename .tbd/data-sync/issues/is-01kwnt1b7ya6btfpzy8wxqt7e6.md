---
type: is
id: is-01kwnt1b7ya6btfpzy8wxqt7e6
title: Verify troika bend/reveal shader injection live; land KDD-9 break-glass if anchors miss
kind: bug
status: open
priority: 1
version: 2
spec_path: docs/tasks/ongoing/05-book-reading/05-book-reading-spec.md
labels: []
dependencies:
  - type: blocks
    target: is-01kwnt1br6aebr15b3nspe9xcg
created_at: 2026-07-04T05:36:18.173Z
updated_at: 2026-07-04T05:36:21.899Z
---
## Why now (session signal)
Unit 05 injects a shared bend/reveal GLSL into troika's DERIVED glyph material via chained onBeforeCompile (src/presentation/render/reading/page-shader.ts) — untestable without a browser this session; troika's createDerivedMaterial may swallow the base hook or consume the begin_vertex anchor.

## Acceptance criterion
In a live browser: open a book, confirm (a) glyphs curl WITH the page during a turn (P11 half-turn silhouette) and (b) glyphs clip line-by-line on the reveal front. Console shows NO "babel: page shader anchors not found" warning. If injection fails: add "troika-three-text": "^0.52.4" to dependencies (version-locked to drei's resolved copy — KDD-9), reimplement via createDerivedMaterial vertexTransform/fragment defs, record the decision in the spec Change Log, and re-verify (a)+(b).

## State-transfer prompt
> Working in the babel repo. Your task: verify the troika shader injection lands live; if not, apply the KDD-9 break-glass (direct troika-three-text dep + createDerivedMaterial).
>
> Relevant files:
> - src/presentation/render/reading/page-shader.ts — injectPageShader/patchPageMaterial (anchor strategy + fallbacks + warn)
> - src/presentation/render/reading/BookReader.tsx — materials useMemo patches vellum (bend) + glyphs (bend+reveal); shared uniform objects
> - src/presentation/render/reading/turn.ts — PAGE_BEND_GLSL (uTurnProgress/uPageWidth/uXOffset)
> - docs/tasks/ongoing/05-book-reading/05-book-reading-spec.md — KDD-5, KDD-9
>
> Relevant prior commits: 9e97441 (page-shader), 6273b35 (BookReader wiring)
>
> Constraints — do NOT modify: the frozen @/domain barrel; reader-state semantics; dimensions constants.
>
> Verification: pnpm dev → open a book → turn a page; pnpm compile && pnpm lint && pnpm test:unit:ci tests/unit/presentation/render/reading; pnpm build (worker bundling).

## Notes

originating-spec: docs/tasks/ongoing/05-book-reading/05-book-reading-spec.md · originating-session: 2026-07-04 · cross-repo: in-repo · effort: S
