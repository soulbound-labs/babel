/**
 * Touch input state + joystick math (mobile spec §3.1, §3.2) — pure, no DOM.
 * The HUD overlay writes this state; `LocomotionController` drains it each
 * frame before `stepLocomotion` (look deltas accumulate-and-drain, mirroring
 * the movementX path). Strictly upstream of the traversal machine: this
 * module never sees the camera, refs, or coordinates.
 */

export interface TouchInputState {
  /** False until the first pointer interaction; zeroed on visibility-hidden. */
  active: boolean;
  /** Camera-frame move vector (screen up = +f, right = +r), |vector| ≤ 1. */
  analog: { f: number; r: number };
  /** Look deltas in CSS px — accumulate on drag, drained (zeroed) per frame. */
  lookDX: number;
  lookDY: number;
}

export function createTouchInputState(): TouchInputState {
  return { active: false, analog: { f: 0, r: 0 }, lookDX: 0, lookDY: 0 };
}

/**
 * Hard deadzone (fraction of radius): resting/near-center thumb writes
 * EXACTLY zero wish velocity — drift must not creep across commit planes
 * (spec §3.2).
 */
export const JOYSTICK_DEADZONE = 0.15;
/** Radians per CSS px of drag (~2× mouse) — tuned on-device in Phase 5. */
export const TOUCH_LOOK_SENSITIVITY = 0.0045;

/**
 * Screen-space thumb offset → analog move vector. Screen up (thumb above
 * center, dy < 0) is +f; screen right is +r. Magnitude clamps to 1; below
 * the deadzone it is exactly {f: 0, r: 0}.
 */
export function joystickVector(
  center: { x: number; y: number },
  thumb: { x: number; y: number },
  radius: number,
): { f: number; r: number } {
  if (!(radius > 0)) return { f: 0, r: 0 };
  const dx = (thumb.x - center.x) / radius;
  const dy = (thumb.y - center.y) / radius;
  const mag = Math.hypot(dx, dy);
  if (mag < JOYSTICK_DEADZONE) return { f: 0, r: 0 };
  const scale = mag > 1 ? 1 / mag : 1;
  // `+ 0` normalizes -0 (e.g. a dead-level horizontal thumb) to exact zero.
  return { f: -dy * scale + 0, r: dx * scale + 0 };
}
