/**
 * Touch proximity glow (mobile spec §3.3) — the touch analogue of the reticle
 * hover: no cursor and no reticle on a phone, so the nearest openable book in
 * front of the camera carries the shared static tint instead. Selection is
 * the pure `nearestFacingSlot` over the current room's `slotTransform`
 * positions — no raycast, `instanceId === slot` never at risk.
 *
 * Mood-gate exemption is structural: touch-primary only AND inert whenever a
 * `?pose=` pin is active, so the capture rig can never render a tinted
 * instance. Static tint at the hover's 12 Hz cadence — no time-driven
 * animation of any kind.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Vector3 } from 'three';

import { isPointerLocked, isTouchPrimary } from '../../input/capabilities';
import { parsePoseParam } from '../debug/poses';
import { EYE_HEIGHT } from '../room/dimensions';
import { BOOK_COUNT, slotTransform } from '../room/instancing';
import { applyHighlight, clearHighlight } from './highlight';
import type { Highlighted } from './highlight';
import { nearestFacingSlot, PROXIMITY_MAX_DISTANCE, PROXIMITY_MIN_FACING_DOT } from './proximity';
import { findCurrentRoomBookMesh } from './useBookPick';

/** Standing-on-slab tolerance — same gate as useBookPick (§4.3). */
const FLOOR_EPSILON = 0.02;
/** Mirror useBookHover's cadence. */
const GLOW_INTERVAL = 1 / 12;

export type UseBookProximityGlowOptions = {
  /** Same gate as the pick/hover (reader closed and not pinned). */
  enabled: () => boolean;
  /**
   * Glow transitions (slot or null), fired only on change — the READ
   * affordance shows while a slot glows, and BookReader opens exactly this
   * slot. The glow and the open action share one selector by construction.
   */
  onGlowChange?: (slot: number | null) => void;
};

export function useBookProximityGlow({ enabled, onGlowChange }: UseBookProximityGlowOptions): void {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const touchPrimary = useMemo(() => isTouchPrimary(), []);
  const poseInert = useMemo(() => parsePoseParam(window.location.search) !== null, []);
  const forward = useMemo(() => new Vector3(), []);
  // Slot positions are room-local; the current room sits at the local origin
  // (re-based every commit), so they are camera-frame positions as-is — the
  // same convention BookReader's travel start uses.
  const slots = useMemo(
    () =>
      Array.from({ length: BOOK_COUNT }, (_, slot) => ({
        slot,
        position: slotTransform(slot).position,
      })),
    [],
  );
  const glowing = useRef<Highlighted | null>(null);
  const sinceLast = useRef(0);
  const notified = useRef<number | null>(null);
  // Ref-read so the unmount cleanup never fires a stale callback.
  const onGlowChangeRef = useRef(onGlowChange);
  onGlowChangeRef.current = onGlowChange;

  const notify = (slot: number | null) => {
    if (notified.current === slot) return;
    notified.current = slot;
    onGlowChangeRef.current?.(slot);
  };

  const clear = () => {
    glowing.current = clearHighlight(glowing.current);
  };

  /** Clear the tint AND retract the READ affordance. */
  const off = () => {
    clear();
    notify(null);
  };

  useFrame((_, delta) => {
    if (!touchPrimary || poseInert) return; // structurally inert on the capture rig
    sinceLast.current += delta;
    if (sinceLast.current < GLOW_INTERVAL) return;
    sinceLast.current = 0;

    // Gates mirror the READ open path (M-2: lock-null side of the disjunction).
    if (!enabled()) return off();
    if (isPointerLocked()) return off();
    if (Math.abs(camera.position.y - EYE_HEIGHT) > FLOOR_EPSILON) return off();

    const mesh = findCurrentRoomBookMesh(scene);
    if (mesh === null) return off();

    camera.getWorldDirection(forward);
    const slot = nearestFacingSlot({ position: camera.position, forward }, slots, {
      maxDistance: PROXIMITY_MAX_DISTANCE,
      minFacingDot: PROXIMITY_MIN_FACING_DOT,
    });
    if (slot === null) return off();

    const current = glowing.current;
    if (current && current.mesh === mesh && current.slot === slot) return;

    clear(); // restore whatever was lit before moving the glow
    glowing.current = applyHighlight(mesh, slot);
    notify(slot);
  });

  // Leave no book lit (and no READ affordance up) if the reader unmounts
  // mid-glow. `off` reaches state only through refs — unmount-safe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => off, []);
}
