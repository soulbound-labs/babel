/**
 * BookReader (§4.2/§4.3, KDD-1/3/4/5/7) — the opened book: a SEPARATE small
 * mesh group (covers+spine merged, left vellum page, right/turning vellum
 * page, one troika `<Text>` of glyphs), never an animated instance in the
 * shelf pool (KDD-7). Phase 2 skeleton: statically renders one open page of a
 * given address as shaded SDF type on vellum — no interaction yet. Selection,
 * approach and the suspend()/resume() seam arrive in Phase 3; turn/stream
 * driving in Phase 4; rustle in Phase 5; the reading glow in Phase 6.
 *
 * Determinism: no `Math.random`; `line()` is never called in `useFrame`
 * (content comes from the memoized `openPage`); the bend/reveal uniforms are
 * settable to exact values for byte-identical captures.
 */
import { Text } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { BoxGeometry, MeshStandardMaterial, PlaneGeometry, DoubleSide } from 'three';

import {
  PAGE_FACE_HEIGHT,
  PAGE_FACE_WIDTH,
  PAGE_TEXT_MARGIN,
  READ_LINE_PITCH,
} from '../room/dimensions';
import { mustMerge } from '../room/Room';
import {
  ATLAS_CHARS,
  createGlyphMaterial,
  createVellumMaterial,
  GLYPH_FONT_SIZE,
  GLYPH_LINE_HEIGHT,
  READING_FONT_URL,
  preloadGlyphs,
} from './atlas';
import type { PrewarmableText } from './atlas';
import type { PageAddress } from './book-address';
import { openPage } from './page-content';
import { createPageUniforms, patchPageMaterial } from './page-shader';

const COVER_THICKNESS = 0.006;
const COVER_OVERHANG = 0.008;
/** Leather like the shelf pool's dark tones — plain, Unit 06 owns richer bindings. */
const coverMaterial = new MeshStandardMaterial({ color: '#231710', roughness: 0.9 });

/** Open-book covers: left board + right board + spine ridge, merged = 1 draw. */
function openCoversGeometry() {
  const w = PAGE_FACE_WIDTH + COVER_OVERHANG;
  const h = PAGE_FACE_HEIGHT + COVER_OVERHANG;
  const left = new BoxGeometry(w, h, COVER_THICKNESS);
  left.translate(-w / 2, 0, -COVER_THICKNESS);
  const right = new BoxGeometry(w, h, COVER_THICKNESS);
  right.translate(w / 2, 0, -COVER_THICKNESS);
  const spine = new BoxGeometry(0.02, h, COVER_THICKNESS * 1.6);
  spine.translate(0, 0, -COVER_THICKNESS * 1.4);
  return mustMerge([left, right, spine]);
}

/** Right/turning page: subdivided so the spine-pivot bend curves the silhouette. */
function bendablePageGeometry() {
  const geometry = new PlaneGeometry(PAGE_FACE_WIDTH, PAGE_FACE_HEIGHT, 32, 4);
  geometry.translate(PAGE_FACE_WIDTH / 2, 0, 0); // spine at x = 0
  return geometry;
}

function flatLeftPageGeometry() {
  const geometry = new PlaneGeometry(PAGE_FACE_WIDTH, PAGE_FACE_HEIGHT, 1, 1);
  geometry.translate(-PAGE_FACE_WIDTH / 2, 0, 0);
  return geometry;
}

export type BookReaderSkeletonProps = {
  /** Phase-2 static display: one open page at this address, fully revealed. */
  debugAddress: PageAddress;
  /** Reveal front override in lines (default: full page). */
  revealedLines?: number;
  /** Turn progress override (default: flat). */
  turnProgress?: number;
  position?: [number, number, number];
  rotationY?: number;
};

/**
 * Phase-2 static skeleton — renders one open page as lit SDF type on vellum.
 * Not yet mounted by WorldScene; the interactive reader composes this in
 * Phase 3.
 */
export function BookReaderSkeleton({
  debugAddress,
  revealedLines = 40,
  turnProgress = 0,
  position = [0, 1.1, 0.4],
  rotationY = 0,
}: BookReaderSkeletonProps) {
  const geometries = useMemo(
    () => ({
      covers: openCoversGeometry(),
      leftPage: flatLeftPageGeometry(),
      rightPage: bendablePageGeometry(),
    }),
    [],
  );

  // One uniforms object shared by the bent page and its glyphs — the type
  // rides the curl because both materials run the SAME babelBendPage (KDD-5).
  const uniforms = useMemo(
    () =>
      createPageUniforms({
        uPageWidth: PAGE_FACE_WIDTH,
        uLinePitch: READ_LINE_PITCH,
        uLineTop: 0, // glyph mesh local: anchorY 'top' ⇒ y = 0 at the first line
      }),
    [],
  );

  const materials = useMemo(() => {
    const leftVellum = createVellumMaterial();
    const rightVellum = createVellumMaterial();
    rightVellum.side = DoubleSide; // the turning leaf shows blank vellum from behind
    patchPageMaterial(rightVellum, uniforms, { bend: true, reveal: false });
    const glyphs = createGlyphMaterial();
    // Glyphs bend AND reveal; FrontSide (default) so type vanishes past 90° —
    // the leaf's back reads as blank paper, exactly right for a turned page.
    patchPageMaterial(glyphs, uniforms, { bend: true, reveal: true });
    return { leftVellum, rightVellum, glyphs };
  }, [uniforms]);

  uniforms.uRevealFront.value = revealedLines;
  uniforms.uTurnProgress.value = turnProgress;
  uniforms.uXOffset.value = 0; // page mesh spine at local x = 0; Text child overrides via position

  const pageText = useMemo(() => {
    const rows = openPage(debugAddress);
    return rows.map((row) => row.join('')).join('\n');
  }, [debugAddress]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={geometries.covers} material={coverMaterial} />
      <mesh geometry={geometries.leftPage} material={materials.leftVellum} />
      <mesh geometry={geometries.rightPage} material={materials.rightVellum} />
      <Text
        font={READING_FONT_URL}
        fontSize={GLYPH_FONT_SIZE}
        lineHeight={GLYPH_LINE_HEIGHT}
        anchorX="left"
        anchorY="top"
        whiteSpace="nowrap"
        material={materials.glyphs}
        position={[PAGE_TEXT_MARGIN, PAGE_FACE_HEIGHT / 2 - PAGE_TEXT_MARGIN, 0.0015]}
        onSync={(troika: PrewarmableText & { position: { x: number } }) => {
          // The glyph mesh sits at the margin: its local x = 0 is uXOffset
          // from the spine, so the bend rotates it about the true spine axis.
          uniforms.uXOffset.value = PAGE_TEXT_MARGIN;
          void troika;
        }}
      >
        {pageText}
      </Text>
      <GlyphPrewarm />
    </group>
  );
}

/**
 * Hidden pre-warm text (§4.2/FMEA #3): mounts all 29 glyphs once so troika's
 * SDF worker generates the full atlas before any book opens; `preloadGlyphs`
 * awaits its sync. Invisible ⇒ no draw call.
 */
export function GlyphPrewarm({ onReady }: { onReady?: () => void } = {}) {
  return (
    <Text
      font={READING_FONT_URL}
      fontSize={GLYPH_FONT_SIZE}
      visible={false}
      onSync={() => onReady?.()}
    >
      {ATLAS_CHARS}
    </Text>
  );
}

/** Await the full 29-glyph atlas on an arbitrary troika Text (capture harness seam). */
export function usePrewarmedAtlas(textRef: { current: PrewarmableText | null }): void {
  useEffect(() => {
    const text = textRef.current;
    if (text) void preloadGlyphs(text);
  }, [textRef]);
}
