/**
 * Nearest-openable-in-front selector (mobile spec §3.3) — pure, no raycast:
 * the touch proximity glow picks its slot by camera pose against the room's
 * slot transforms, so `instanceId === slot` is never at risk. The hook feeds
 * ONLY the current room's slots (INV-B1 mirrored — a neighbour's shelf can
 * never be a candidate).
 */
export type Vec3Like = { x: number; y: number; z: number };

/** Named tunables — final values are an on-device judgment (Phase 5). */
export const PROXIMITY_MAX_DISTANCE = 3.2;
export const PROXIMITY_MIN_FACING_DOT = 0.35;

export function nearestFacingSlot(
  pose: { position: Vec3Like; forward: Vec3Like },
  slots: ReadonlyArray<{ slot: number; position: Vec3Like }>,
  opts: { maxDistance: number; minFacingDot: number } = {
    maxDistance: PROXIMITY_MAX_DISTANCE,
    minFacingDot: PROXIMITY_MIN_FACING_DOT,
  },
): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  for (const candidate of slots) {
    const dx = candidate.position.x - pose.position.x;
    const dy = candidate.position.y - pose.position.y;
    const dz = candidate.position.z - pose.position.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance === 0 || distance > opts.maxDistance) continue;
    const facingDot = (dx * pose.forward.x + dy * pose.forward.y + dz * pose.forward.z) / distance;
    if (facingDot < opts.minFacingDot) continue;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate.slot;
    }
  }
  return best;
}
