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

import { isTouchPrimary } from '../../input/capabilities';
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
};

export function useBookProximityGlow({ enabled }: UseBookProximityGlowOptions): void {
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

  const clear = () => {
    glowing.current = clearHighlight(glowing.current);
  };

  useFrame((_, delta) => {
    if (!touchPrimary || poseInert) return; // structurally inert on the capture rig
    sinceLast.current += delta;
    if (sinceLast.current < GLOW_INTERVAL) return;
    sinceLast.current = 0;

    // Gates mirror the tap pick (M-2: lock-null side of the disjunction).
    if (!enabled()) return clear();
    if (document.pointerLockElement !== null) return clear();
    if (Math.abs(camera.position.y - EYE_HEIGHT) > FLOOR_EPSILON) return clear();

    const mesh = findCurrentRoomBookMesh(scene);
    if (mesh === null) return clear();

    camera.getWorldDirection(forward);
    const slot = nearestFacingSlot({ position: camera.position, forward }, slots, {
      maxDistance: PROXIMITY_MAX_DISTANCE,
      minFacingDot: PROXIMITY_MIN_FACING_DOT,
    });
    if (slot === null) return clear();

    const current = glowing.current;
    if (current && current.mesh === mesh && current.slot === slot) return;

    clear(); // restore whatever was lit before moving the glow
    glowing.current = applyHighlight(mesh, slot);
  });

  // Leave no book lit if the reader unmounts mid-glow.
  useEffect(() => clear, []);
}
