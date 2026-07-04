/**
 * Page-turn curve (§4.4, KDD-5) — pure scalar params + the GLSL bend chunk.
 * The turn is a deterministic rigged vertex bend: one `uTurnProgress` uniform
 * (0 = flat, 1 = fully turned) pivots the page about the spine, with a curl
 * term that peaks mid-turn so the silhouette CURVES (never a flat flip). No
 * physics, no cloth. The same bend rides the glyph material (page-shader.ts)
 * so type curves with the paper.
 *
 * The GLSL string is mood-gate-visual; the scalar params here are node-tested
 * (INV-B4).
 */
import { READ_TURN_SECONDS } from '../room/dimensions';

/** Extra curl (radians) at the free edge, at the mid-turn peak. */
export const TURN_CURL = 0.85;

/** Smoothstep progress over the locked turn duration — monotonic, 0→1. */
export function turnProgressAt(elapsedSeconds: number): number {
  const t = Math.min(1, Math.max(0, elapsedSeconds / READ_TURN_SECONDS));
  return t * t * (3 - 2 * t);
}

/** Base pivot angle about the spine: 0 = flat (right), π = fully turned (left). */
export function turnAngleAt(progress: number): number {
  return Math.PI * Math.min(1, Math.max(0, progress));
}

/** Curl term: zero at both rest states, peaking mid-turn — the curved silhouette. */
export function curlAt(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return TURN_CURL * Math.sin(Math.PI * p);
}

/**
 * The vertex bend chunk (§4.4). Page-local frame: spine at x = 0, the free
 * edge at x = uPageWidth; the page lies in the XY plane facing +z. Vertices
 * rotate about the spine axis by the base angle plus a curl that grows toward
 * the free edge — the same function `turnAngleAt`/`curlAt` express in JS.
 */
export const PAGE_BEND_GLSL = /* glsl */ `
uniform float uTurnProgress;
uniform float uPageWidth;

vec3 babelBendPage(vec3 pos) {
  float r = pos.x;
  float edge = clamp(r / uPageWidth, 0.0, 1.0);
  float theta = 3.14159265 * uTurnProgress
    + ${TURN_CURL.toFixed(4)} * sin(3.14159265 * uTurnProgress) * edge;
  return vec3(r * cos(theta), pos.y, pos.z + r * sin(theta));
}
`;
