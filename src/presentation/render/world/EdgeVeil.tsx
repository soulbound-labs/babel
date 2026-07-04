/**
 * EdgeVeil (Unit 04 §4.2.5, §4.4) — the ONE component that ramps scene fog as
 * the player nears the ±64 walkable bound, so the world dissolves into murk
 * instead of hitting a visible terminator. No "wall" ever renders (§4.2.5).
 *
 * Distance-to-edge is computed from the EXACT bigint coordinate; the small
 * `number` conversion happens only inside the ramp zone (T-6 — never convert an
 * absolute coordinate needlessly). All fog goes through `applyAtmosphere`
 * (§4.4): this file never constructs `FogExp2` nor touches `scene.fog` directly.
 *
 * Re-base: WorldScene drives the registered callback on every commit, in the
 * same frame as the rooms and camera. Outside the ramp the profile is
 * byte-identical to `DEFAULT_ATMOSPHERE` (the identity clause), so Unit 03's
 * interior poses are untouched.
 */
import { useThree } from '@react-three/fiber';
import { useCallback, useLayoutEffect } from 'react';
import type { RefObject } from 'react';

import { ORIGIN } from '../../../domain/entities';
import type { Coordinate } from '../../../domain/entities';
import { WALKABLE_BOUND } from '../../traversal/bounds';
import { applyAtmosphere, atmosphereAt, DEFAULT_ATMOSPHERE, RAMP } from '../atmosphere/atmosphere';

const RAMP_WIDTH = BigInt(RAMP.width);

/** Min bigint distance from `v` to either ±WALKABLE_BOUND edge, in rooms/floors. */
function edgeDistance(v: bigint): bigint {
  const toHigh = WALKABLE_BOUND - v;
  const toLow = v + WALKABLE_BOUND;
  return toHigh < toLow ? toHigh : toLow;
}

/**
 * Small-number distance for the ramp: clamped to the ramp width so the interior
 * (every coordinate ≥ width from both edges) yields exactly the identity result.
 * Only distances ≤ RAMP.width — a handful — ever cross into float.
 */
function rampDistance(v: bigint): number {
  const d = edgeDistance(v);
  return d >= RAMP_WIDTH ? RAMP.width : Number(d);
}

export type EdgeVeilProps = {
  /** WorldScene registers here and drives the same-frame re-base on commit. */
  applyRef: RefObject<((c: Coordinate) => void) | null>;
  initialCoordinate?: Coordinate;
};

export function EdgeVeil({ applyRef, initialCoordinate = ORIGIN }: EdgeVeilProps) {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);

  const applyCoordinate = useCallback(
    (c: Coordinate) => {
      applyAtmosphere(scene, gl, atmosphereAt(rampDistance(c.n), rampDistance(c.floor)));
    },
    [scene, gl],
  );

  useLayoutEffect(() => {
    applyRef.current = applyCoordinate;
    applyCoordinate(initialCoordinate);
    return () => {
      applyRef.current = null;
    };
  }, [applyRef, applyCoordinate, initialCoordinate]);

  // ambientIntensity never modulates (identity clause) — a constant floor light.
  return <ambientLight intensity={DEFAULT_ATMOSPHERE.ambientIntensity} />;
}
