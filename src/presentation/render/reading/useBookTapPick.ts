/**
 * Touch tap → book pick (mobile spec §3.3). Same pipeline as the desktop
 * reticle pick — `castBookPick` is the ONE body (INV-B1 lives there) — only
 * the ray origin differs: tap NDC instead of screen center. Listeners attach
 * to the CANVAS element, never `document`: HUD elements are canvas siblings,
 * so their touches can never arrive here (structural hit-exclusion, §4.3).
 *
 * Gate disjointness (M-2): the desktop pick requires the lock HELD; this hook
 * requires it NULL — on a hybrid device exactly one of the two can fire.
 * While the entry/pause splash is visible it covers the canvas, so no tap
 * reaches these listeners (structural splash gate; App threads no state).
 */
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Raycaster, Vector2, Vector3 } from 'three';

import type { Coordinate } from '../../../domain/entities';
import { isTouchPrimary } from '../../input/capabilities';
import { classifyTouch } from '../../input/gestures';
import type { TouchTracePoint } from '../../input/gestures';
import { EYE_HEIGHT } from '../room/dimensions';
import { BOOK_COUNT, slotTransform } from '../room/instancing';
import { nearestFacingSlot, PROXIMITY_MAX_DISTANCE, PROXIMITY_MIN_FACING_DOT } from './proximity';
import type { Vec3Like } from './proximity';
import { castBookPick } from './useBookPick';
import type { BookPick } from './useBookPick';

/** Standing-on-slab tolerance — same gate as useBookPick (§4.3). */
const FLOOR_EPSILON = 0.02;

/**
 * Intent gate: a tap opens a book only when its ray lands on the slot the
 * proximity glow is advertising (nearest facing, within reach — the SAME
 * pure selector and constants as useBookProximityGlow). Without this, every
 * stray touch in a room papered wall-to-wall with books opens a reader —
 * the on-device "stuck opening books forever" loop.
 */
export function isIntendedPick(
  pick: { slot: number },
  pose: { position: Vec3Like; forward: Vec3Like },
  slots: ReadonlyArray<{ slot: number; position: Vec3Like }>,
): boolean {
  const intended = nearestFacingSlot(pose, slots, {
    maxDistance: PROXIMITY_MAX_DISTANCE,
    minFacingDot: PROXIMITY_MIN_FACING_DOT,
  });
  return intended !== null && intended === pick.slot;
}

/** Tap client coords → NDC against the canvas rect. Pure, exact at corners. */
export function tapToNdc(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

export type UseBookTapPickOptions = {
  /** Gate beyond the built-ins — same callback shape as useBookPick. */
  enabled: () => boolean;
  /** The LIVE traversal coordinate — never reconstructed from a position. */
  coordinate: () => Coordinate | null;
  onPick: (pick: BookPick) => void;
};

export function useBookTapPick({ enabled, coordinate, onPick }: UseBookTapPickOptions): void {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const raycasterRef = useRef<Raycaster | null>(null);
  const forward = useMemo(() => new Vector3(), []);
  // Same room-local slot positions the glow uses (current room at the origin).
  const slots = useMemo(
    () =>
      Array.from({ length: BOOK_COUNT }, (_, slot) => ({
        slot,
        position: slotTransform(slot).position,
      })),
    [],
  );

  useEffect(() => {
    if (!isTouchPrimary()) return;
    const canvas = gl.domElement;
    const raycaster = (raycasterRef.current ??= new Raycaster());
    const traces = new Map<number, TouchTracePoint[]>();

    const point = (e: PointerEvent): TouchTracePoint => ({
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
    });

    const onPointerDown = (e: PointerEvent) => {
      if (document.pointerLockElement !== null) return; // M-2: touch is lock-null only
      traces.set(e.pointerId, [point(e)]);
    };
    const onPointerMove = (e: PointerEvent) => {
      traces.get(e.pointerId)?.push(point(e));
    };
    const onPointerCancel = (e: PointerEvent) => {
      traces.delete(e.pointerId); // no stuck half-gesture (§3.3)
    };
    const onPointerUp = (e: PointerEvent) => {
      const trace = traces.get(e.pointerId);
      traces.delete(e.pointerId);
      if (!trace) return;
      trace.push(point(e));
      if (document.pointerLockElement !== null) return;
      if (classifyTouch(trace) !== 'tap') return; // drags belong to the look capture
      if (!enabled()) return;
      // Floor gate (§4.3): standing on the slab, not mid-stair.
      if (Math.abs(camera.position.y - EYE_HEIGHT) > FLOOR_EPSILON) return;
      const liveCoordinate = coordinate();
      if (liveCoordinate === null) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const ndc = tapToNdc(e.clientX, e.clientY, rect);
      const pick = castBookPick(
        new Vector2(ndc.x, ndc.y),
        camera,
        scene,
        liveCoordinate,
        raycaster,
      );
      if (pick === null) return;
      // Only the glowing book opens — the glow IS the tap affordance.
      camera.getWorldDirection(forward);
      if (!isIntendedPick(pick, { position: camera.position, forward }, slots)) return;
      onPick(pick);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [camera, scene, gl, enabled, coordinate, onPick, forward, slots]);
}
