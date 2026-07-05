/**
 * Aspect-driven vertical FOV (mobile spec §3.1, §3.6) — pure. The identity
 * clause is load-bearing: for aspect ≥ 1 the resolver returns the frozen
 * desktop constant EXACTLY (early return, no float arithmetic), so the
 * desktop projection matrix — and every committed mood capture — stays
 * bit-identical. Below 1 (portrait) it preserves the horizontal FOV derived
 * at the 16:9 reference, clamped: the unclamped identity yields ~133° on an
 * iPhone 13 portrait, unusable.
 */

/** Frozen render-doctrine value — landscape identity. */
export const DESKTOP_FOV = 62;
/** Aspect at which DESKTOP_FOV's implied horizontal FOV is derived. */
export const FOV_REF_ASPECT = 16 / 9;
/** Portrait clamp (degrees) — named tunable, on-device mood judgment (Phase 5). */
export const PORTRAIT_FOV_MAX = 85;

const DEG = Math.PI / 180;

export function resolveFov(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return DESKTOP_FOV;
  if (aspect >= 1) return DESKTOP_FOV;
  const hRef = 2 * Math.atan(Math.tan((DESKTOP_FOV / 2) * DEG) * FOV_REF_ASPECT);
  const vFov = (2 * Math.atan(Math.tan(hRef / 2) / aspect)) / DEG;
  return Math.min(vFov, PORTRAIT_FOV_MAX);
}
