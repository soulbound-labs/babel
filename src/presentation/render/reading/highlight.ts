/**
 * Shared per-instance highlight mechanics (mobile spec §3.3) — extracted from
 * `useBookHover` so the desktop reticle hover and the touch proximity glow
 * share ONE tint implementation. Values are byte-unchanged from the hover's
 * originals. Exact-restore semantics: the true base colour is read back from
 * the mesh (never recomputed from a formula), so restore survives any future
 * per-room colour variation. Static tint — never time-animated (mood-gate).
 */
import { Color } from 'three';
import type { InstancedMesh } from 'three';

/** Warm tone the leather leans toward when lit; a little, not a spotlight. */
export const HIGHLIGHT_TINT = new Color('#ffcf9a');
/** How far the base leather is pulled toward the tint (0 = none, 1 = full). */
export const HIGHLIGHT_MIX = 0.55;

export type Highlighted = { mesh: InstancedMesh; slot: number; base: Color };

const scratchBase = new Color();
const scratchLit = new Color();

/** Tint one instance; returns the restore token (null if the mesh has no colours). */
export function applyHighlight(mesh: InstancedMesh, slot: number): Highlighted | null {
  if (mesh.instanceColor === null) return null;
  mesh.getColorAt(slot, scratchBase);
  scratchLit.copy(scratchBase).lerp(HIGHLIGHT_TINT, HIGHLIGHT_MIX);
  mesh.setColorAt(slot, scratchLit);
  mesh.instanceColor.needsUpdate = true;
  return { mesh, slot, base: scratchBase.clone() };
}

/** Restore the exact base colour; always returns null for assign-through use. */
export function clearHighlight(highlighted: Highlighted | null): null {
  if (highlighted !== null) {
    highlighted.mesh.setColorAt(highlighted.slot, highlighted.base);
    if (highlighted.mesh.instanceColor) highlighted.mesh.instanceColor.needsUpdate = true;
  }
  return null;
}
