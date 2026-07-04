/**
 * ShaftImpostor (Unit 04 §4.2.4) — the Hero-Moment support: one `InstancedMesh`
 * of a low-poly floor-slice silhouette (railing ring + stair-turn) repeated at
 * Δfloor ∈ {±2, ±3, ±4}. Floors ±1 are real rooms; slices continue beyond them
 * and are swallowed by `FogExp2` before repetition becomes identifiable.
 *
 * Consistency rule (binding, §4.2.4): a slice at Δfloor = d sits exactly where
 * `streaming.ts` would place the real room at that delta — `shaftSlices` is the
 * single source, phase-locked to `roomPosition`. Positions are a pure function
 * of the coordinate; near |floor| → 64 the out-of-bounds slices are simply
 * absent, so the shaft ends in fog at the walkable stop.
 *
 * Re-base: RoomStream fans the same-frame commit (§4.2.1 step 3) into the
 * callback registered in `applyRef`, so slices shift in the same frame as the
 * camera and the real rooms — no pop, no React round-trip. One draw call.
 */
import { useCallback, useLayoutEffect, useMemo } from 'react';
import type { RefObject } from 'react';
import { InstancedMesh, Matrix4 } from 'three';

import { ORIGIN } from '../../../domain/entities';
import type { Coordinate } from '../../../domain/entities';
import { STAIR_AXIS_X, STAIR_AXIS_Z } from '../player/stair';
import { metalMaterial } from '../room/materials';
import { mustMerge } from '../room/Room';
import { railingGeometry } from '../room/Shaft';
import { spiralTurnGeometry } from '../room/Staircase';
import { SHAFT_SLICE_DELTAS, shaftSlices } from './streaming';

const MAX_SLICES = SHAFT_SLICE_DELTAS.length;

/** One slice: the railing ring + a stair-turn silhouette, placed on the shaft axis. */
function impostorGeometry() {
  const spiral = spiralTurnGeometry();
  spiral.translate(STAIR_AXIS_X, 0, STAIR_AXIS_Z);
  return mustMerge([railingGeometry(), spiral]);
}

export type ShaftImpostorProps = {
  /** RoomStream registers here and drives the same-frame re-base (§4.2.1). */
  applyRef: RefObject<((c: Coordinate) => void) | null>;
  initialCoordinate?: Coordinate;
};

export function ShaftImpostor({ applyRef, initialCoordinate = ORIGIN }: ShaftImpostorProps) {
  const mesh = useMemo(() => {
    const m = new InstancedMesh(impostorGeometry(), metalMaterial, MAX_SLICES);
    m.frustumCulled = false; // slices span the shaft; per-slice culling is fog's job
    return m;
  }, []);
  const scratch = useMemo(() => new Matrix4(), []);

  const applyCoordinate = useCallback(
    (c: Coordinate) => {
      const slices = shaftSlices(c);
      mesh.count = slices.length;
      slices.forEach((s, i) => {
        scratch.makeTranslation(s.position.x, s.position.y, s.position.z);
        mesh.setMatrixAt(i, scratch);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
    [mesh, scratch],
  );

  useLayoutEffect(() => {
    applyRef.current = applyCoordinate;
    applyCoordinate(initialCoordinate);
    return () => {
      applyRef.current = null;
    };
  }, [applyRef, applyCoordinate, initialCoordinate]);

  return <primitive object={mesh} />;
}
