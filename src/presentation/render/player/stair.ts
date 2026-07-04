/**
 * Helicoid stair math (Unit 04 §4.2.2) — pure, node-testable, no three/react.
 * Cylindrical parameterization around the alcove stair axis (KDD-1). The
 * frozen Unit 03 cross-section (12 treads/turn, rise/turn = CEILING_HEIGHT,
 * STAIR_RADIUS 0.78) is restated here numerically; `stair.spec.ts` pins the
 * restatement to the frozen values.
 *
 * Azimuth convention matches the tread geometry (`Staircase.tsx` rotateY):
 * θ = atan2(dx, dz), so direction (sin θ, cos θ); θ = 0 faces +z — the stair
 * mouth, toward the vestibule walk area. Tread i sits at azimuth i·TREAD_ANGLE
 * with its top at i·TREAD_RISE: the helix crosses every floor level at θ = 0,
 * which is why "climb one full turn → same vestibule, one floor up" is a
 * property of the geometry (the deterministic up/down rule is free).
 */
import { CEILING_HEIGHT, HEX_APOTHEM, STAIR_RADIUS, VESTIBULE_DEPTH } from '../room/dimensions';

/** Stair axis in room-local coordinates (KDD-1 alcove placement). */
export const STAIR_AXIS_X = -0.55;
export const STAIR_AXIS_Z = -(HEX_APOTHEM + VESTIBULE_DEPTH - 0.9);
/** Alcove bulge extents (KDD-1): −x flank bows out to ALCOVE_BACK_X over z ∈ [FAR_Z, ALCOVE_NEAR_Z]. */
export const ALCOVE_BACK_X = -1.45;
export const ALCOVE_NEAR_Z = -2.3;

/** Cross-section (frozen, Unit 03 spec §7.3). */
export const TREADS_PER_TURN = 12;
export const TREAD_RISE = CEILING_HEIGHT / TREADS_PER_TURN; // ≈ 0.167 < MAX_STEP
export const TREAD_ANGLE = (2 * Math.PI) / TREADS_PER_TURN;
export const RISE_PER_TURN = TREAD_RISE * TREADS_PER_TURN; // === CEILING_HEIGHT exactly

/**
 * Player-center walkable annulus on the helix (§4.2.2). The treads physically
 * span r ∈ [0.08, 0.78] (plank length 0.70), so the center band can be generous;
 * capsule overhang past the tread edge is embraced as vertigo. Inner stays at
 * 0.36 to clear the 0.055 newel with the 0.28 capsule (0.36 − 0.28 = 0.08 gap).
 *
 * Outer widened 0.60 → 0.72 after Rei's Phase-7 walkthrough: the old 0.24 m band
 * was narrower than the 0.56 m body, so collision pinned the player against both
 * the column and the outer edge at once — walking the stair felt like squeezing
 * through a cutout. 0.72 gives a 0.36 m corridor (overhang 0.22 m past the tread).
 */
export const STAIR_INNER_R = 0.36;
export const STAIR_OUTER_R = 0.72;
/** The stairwell opening cut into the slabs (visual twin in Vestibule.tsx). */
export const STAIRWELL_RADIUS = STAIR_RADIUS + 0.06;
/** Landing sector: joins the walk area to the helix at each floor's repeat azimuth (θ = 0). */
export const LANDING_OUTER_R = 0.9;
export const LANDING_HALF_ANGLE = Math.PI / 4;

/** A stair site in the local float frame (one per live room, at the room's offset).
 * Optional feet-y caps implement "stair cell caps θ at floor ±64" (§4.2.5): a tread
 * beyond the cap does not exist — locomotion rejects the step (soft invisible stop). */
export type StairSite = { x: number; z: number; minFeetY?: number; maxFeetY?: number };

/** Wrapped azimuth of (x, z) about `site`, in (−π, π]; 0 faces +z (the mouth). */
export function stairAzimuth(x: number, z: number, site: StairSite): number {
  return Math.atan2(x - site.x, z - site.z);
}

export function stairRadius(x: number, z: number, site: StairSite): number {
  return Math.hypot(x - site.x, z - site.z);
}

/** Continuous helix ramp: unwrapped azimuth → height (θ = 0 ⇒ floor level 0). */
export function rampY(thetaUnwrapped: number): number {
  return (thetaUnwrapped / (2 * Math.PI)) * CEILING_HEIGHT;
}

/**
 * Tread-top surface height at wrapped azimuth θ, on the helix turn nearest
 * `refY` (the player's current feet height disambiguates which floor's turn
 * they are on — the helix passes every CEILING_HEIGHT).
 */
export function stairSurfaceY(theta: number, refY: number): number {
  const tread = Math.round(theta / TREAD_ANGLE); // index within the wrapped turn
  const turn = Math.round((refY / TREAD_RISE - tread) / TREADS_PER_TURN);
  return (tread + turn * TREADS_PER_TURN) * TREAD_RISE;
}

export type SurfaceSample = {
  surface: 'floor' | 'stair';
  y: number;
  /** The tread is beyond the site's ±64-floor cap — the step must be refused. */
  capped?: boolean;
};

/**
 * Surface under (x, z): a tread top when within a stair footprint (annulus or
 * landing sector), else the nearest floor slab (floors repeat every
 * CEILING_HEIGHT — identical local geometry per floor, KDD-3).
 */
export function surfaceAt(
  x: number,
  z: number,
  refY: number,
  sites: readonly StairSite[],
): SurfaceSample {
  for (const site of sites) {
    const r = stairRadius(x, z, site);
    if (r < STAIR_INNER_R || r > LANDING_OUTER_R) continue;
    const theta = stairAzimuth(x, z, site);
    const inAnnulus = r <= STAIR_OUTER_R;
    const inLanding = Math.abs(theta) <= LANDING_HALF_ANGLE;
    if (inAnnulus || inLanding) {
      const y = stairSurfaceY(theta, refY);
      if (site.maxFeetY !== undefined && y > site.maxFeetY) {
        return { surface: 'stair', y, capped: true };
      }
      if (site.minFeetY !== undefined && y < site.minFeetY) {
        return { surface: 'stair', y, capped: true };
      }
      return { surface: 'stair', y };
    }
  }
  return { surface: 'floor', y: Math.round(refY / CEILING_HEIGHT) * CEILING_HEIGHT };
}
