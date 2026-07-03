/**
 * Shared placeholder materials (§4.4 / C3). One small set of dark
 * `MeshStandardMaterial`s reused by every room module keeps the renderer's
 * program count tiny; Unit 06's asset pass replaces surfaces, not structure.
 * Module-level singletons are safe: presentation is deterministic (C4) and
 * the scene mounts once.
 */
import { Color, DoubleSide, MeshBasicMaterial, MeshStandardMaterial } from 'three';

/** Stone-dark walls, floor, ceiling. */
export const stoneMaterial = new MeshStandardMaterial({
  color: new Color('#17151a'),
  roughness: 0.95,
  metalness: 0.0,
});

/** Slightly warmer dark wood — shelves, staircase treads. */
export const woodMaterial = new MeshStandardMaterial({
  color: new Color('#1d1410'),
  roughness: 0.85,
  metalness: 0.0,
});

/** Dull dark metal — railing, stair column. */
export const metalMaterial = new MeshStandardMaterial({
  color: new Color('#26242a'),
  roughness: 0.5,
  metalness: 0.8,
});

/** Unlit near-black — the void beyond doorways and down the shaft. Double-sided
 * so open tubes read as darkness from within. */
export const voidMaterial = new MeshBasicMaterial({
  color: new Color('#000002'),
  side: DoubleSide,
});
