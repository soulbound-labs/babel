/**
 * Reticle book hover (companion to `useBookPick`) — the "invisible pointer"
 * highlight. Pointer-lock has no free cursor, so the same screen-centre ray
 * that `useBookPick` fires on click is cast CONTINUOUSLY (throttled) here, and
 * the book the ray is over — the one a click would open — has its per-instance
 * colour brightened a little so it "lights up".
 *
 * One InstancedMesh, one draw call (render-doctrine §4): only a single
 * instance's colour is rewritten, restored the moment the reticle moves off.
 * The highlight is input-driven, not ambient — it never animates on its own, so
 * it neither flickers per session nor perturbs the mood-gate reference captures
 * (which are shot without hover).
 *
 * Gates mirror `useBookPick` exactly (locked, on-slab, reader closed), so the
 * highlight is live precisely when a click would land — and dark while a book
 * is open, mid-stair, or unlocked.
 */
import { useThree } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, Raycaster, Vector2 } from 'three';
import type { InstancedMesh } from 'three';

import { EYE_HEIGHT } from '../room/dimensions';
import { findCurrentRoomBookMesh } from './useBookPick';

/** Standing-on-slab tolerance (m) — identical gate to useBookPick (§4.3). */
const FLOOR_EPSILON = 0.02;
/** ~12 Hz: one raycast per tick is cheap, but no need to churn every frame. */
const HOVER_INTERVAL = 1 / 12;
/** Warm tone the leather leans toward when lit; a little, not a spotlight. */
const HIGHLIGHT_TINT = new Color('#ffcf9a');
/** How far the base leather is pulled toward the tint (0 = none, 1 = full). */
const HIGHLIGHT_MIX = 0.55;

export type UseBookHoverOptions = {
  /** Same gate the pick uses (e.g. reader closed and not pinned). */
  enabled: () => boolean;
};

type Hovered = { mesh: InstancedMesh; slot: number; base: Color };

export function useBookHover({ enabled }: UseBookHoverOptions): void {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const raycaster = useMemo(() => new Raycaster(), []);
  const center = useMemo(() => new Vector2(0, 0), []);
  const scratch = useMemo(() => ({ base: new Color(), lit: new Color() }), []);
  const hovered = useRef<Hovered | null>(null);
  const sinceLast = useRef(0);

  /** Restore the highlighted instance's original colour and forget it. */
  const clear = () => {
    const h = hovered.current;
    if (!h) return;
    h.mesh.setColorAt(h.slot, h.base);
    if (h.mesh.instanceColor) h.mesh.instanceColor.needsUpdate = true;
    hovered.current = null;
  };

  useFrame((_, delta) => {
    sinceLast.current += delta;
    if (sinceLast.current < HOVER_INTERVAL) return;
    sinceLast.current = 0;

    // Gate exactly as the pick does: only highlight when a click could land.
    if (!enabled()) return clear();
    if (document.pointerLockElement === null) return clear();
    if (Math.abs(camera.position.y - EYE_HEIGHT) > FLOOR_EPSILON) return clear();

    const mesh = findCurrentRoomBookMesh(scene);
    if (mesh === null || mesh.instanceColor === null) return clear();

    raycaster.setFromCamera(center, camera);
    const [hit] = raycaster.intersectObject(mesh, false);
    if (!hit || hit.instanceId === undefined) return clear();

    const slot = hit.instanceId;
    const current = hovered.current;
    if (current && current.mesh === mesh && current.slot === slot) return;

    clear(); // restore whatever was lit before moving the highlight
    // Read the true base back (never the formula) so restore is exact and
    // survives any future per-room colour variation.
    mesh.getColorAt(slot, scratch.base);
    scratch.lit.copy(scratch.base).lerp(HIGHLIGHT_TINT, HIGHLIGHT_MIX);
    mesh.setColorAt(slot, scratch.lit);
    mesh.instanceColor.needsUpdate = true;
    hovered.current = { mesh, slot, base: scratch.base.clone() };
  });

  // Leave no book lit if the reader unmounts mid-hover.
  useEffect(() => clear, []);
}
