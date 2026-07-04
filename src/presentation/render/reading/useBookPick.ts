/**
 * Reticle book pick (§4.3, KDD-2) — pointer-lock has no free cursor, so the
 * pick ray casts from screen center on `pointerdown`. The ray set is
 * RESTRICTED to the current room's book mesh: the `InstancedMesh` whose
 * parent group carries `userData` offset `(0, 0)` (the Unit 04 RoomStream
 * seam — room identity = which mesh the ray hit). A neighbor's book seen
 * through a doorway is simply not in the ray set (FMEA #6). Under a single
 * room the filter degenerates to the one mesh.
 *
 * Floor gate: the frozen `LocomotionHandle` exposes no surface mode (§4.7 —
 * the seam's shape is untouched), so the gate reads the held camera: standing
 * on the room slab puts the eye exactly at EYE_HEIGHT in the local frame; on
 * the stair helix it is off-slab by at least a tread rise. Presentation-only,
 * no seam widening.
 */
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { InstancedMesh, Raycaster, Vector2 } from 'three';
import type { Object3D } from 'three';

import type { Coordinate, LineAddress } from '../../../domain/entities';
import { EYE_HEIGHT } from '../room/dimensions';
import { resolveBookAddress } from './book-address';

/** Standing-on-slab tolerance (m): tread rise is 0.167, far outside this. */
const FLOOR_EPSILON = 0.02;

export type BookPick = {
  address: LineAddress;
  /** The shelf instance (=== instanceId, frozen §4.5). */
  slot: number;
  /** The current-room book mesh the ray hit (for KDD-7 instance dim/hide). */
  mesh: InstancedMesh;
};

export type UseBookPickOptions = {
  /** Gate beyond the built-ins (e.g. no book already open). */
  enabled: () => boolean;
  /** The LIVE traversal coordinate — never reconstructed from a position. */
  coordinate: () => Coordinate | null;
  onPick: (pick: BookPick) => void;
};

/** The current room's `(0, 0)` book mesh, from the RoomStream group seam. */
export function findCurrentRoomBookMesh(root: Object3D): InstancedMesh | null {
  let found: InstancedMesh | null = null;
  root.traverse((object) => {
    if (found !== null) return;
    if (!(object instanceof InstancedMesh)) return;
    const parent = object.parent;
    if (!parent) return;
    const { roomKey, dn, dfloor } = parent.userData as {
      roomKey?: string;
      dn?: number;
      dfloor?: number;
    };
    if (roomKey !== undefined && dn === 0 && dfloor === 0) found = object;
  });
  return found;
}

export function useBookPick({ enabled, coordinate, onPick }: UseBookPickOptions): void {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const raycasterRef = useRef<Raycaster | null>(null);

  useEffect(() => {
    const raycaster = (raycasterRef.current ??= new Raycaster());
    const center = new Vector2(0, 0);

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (document.pointerLockElement === null) return; // E1: input only while locked
      if (!enabled()) return;
      // Floor gate (§4.3): standing on the slab, not mid-stair.
      if (Math.abs(camera.position.y - EYE_HEIGHT) > FLOOR_EPSILON) return;
      const liveCoordinate = coordinate();
      if (liveCoordinate === null) return;

      const mesh = findCurrentRoomBookMesh(scene);
      if (mesh === null) return;

      raycaster.setFromCamera(center, camera);
      const [hit] = raycaster.intersectObject(mesh, false);
      if (!hit || hit.instanceId === undefined) return;

      const address = resolveBookAddress(liveCoordinate, { dn: 0, dfloor: 0 }, hit.instanceId);
      if (address === null) return;
      onPick({ address, slot: hit.instanceId, mesh });
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [camera, scene, enabled, coordinate, onPick]);
}
