/**
 * Reading glow (§4.2, KDD-8) — the ONE genuinely new mood knob of Unit 05,
 * confined to this module (analogous to atmosphere.ts). A warm short-range
 * `PointLight` bound to the book: it lifts the open vellum legibly WITHOUT
 * lifting wall/ceiling/fog in the Unit 03 P1/P4 sightlines (mood floor).
 * Steady and unceasing — no flicker (capture determinism). No shadow maps.
 *
 * Defaults live in the canonical dimensions.ts; intensity/range/warmth are
 * live-tuned at the chills-gate and the final values recorded in
 * docs/mood/unit-05/checklist.md.
 *
 * The light is mounted PERMANENTLY (intensity 0 while no book is open): the
 * scene's light count stays constant (12 pool + 1 glow), so materials never
 * relink shaders at book-open (the Unit 04 KDD-4 rationale).
 */
import { READ_GLOW_COLOR, READ_GLOW_DISTANCE, READ_GLOW_INTENSITY } from '../room/dimensions';

export const READING_GLOW = {
  color: READ_GLOW_COLOR,
  intensity: READ_GLOW_INTENSITY,
  distance: READ_GLOW_DISTANCE,
  decay: 2,
} as const;

/** Local offset from the book group: just above and reader-side of the spread. */
export const GLOW_OFFSET = { x: 0, y: 0.16, z: 0.12 } as const;

/**
 * The glow lights up over the approach ease (§4.3) and holds steady at rest.
 * `fraction` is the eased approach fraction 0..1; closed ⇒ 0 ⇒ dark.
 */
export function glowIntensityAt(fraction: number): number {
  const f = Math.min(1, Math.max(0, fraction));
  return READING_GLOW.intensity * f;
}
