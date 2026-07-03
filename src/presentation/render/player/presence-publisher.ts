/**
 * Presence publishing throttle (§4.7, INV-R6) — pure factory, node-testable
 * with a fake port. Publishes through the injected `PresencePort` at ≤ 10 Hz
 * and only when the pose changed. A no-op adapter today; Unit 07 swaps in
 * Convex behind the same seam.
 */
import type { PlayerState, PresencePort } from '../../../domain/ports';

/** ≤ 10 Hz (INV-R6). */
export const MIN_PUBLISH_INTERVAL = 0.1; // seconds

function samePose(a: PlayerState, b: PlayerState): boolean {
  return (
    a.coordinate === b.coordinate &&
    a.localPosition.x === b.localPosition.x &&
    a.localPosition.y === b.localPosition.y &&
    a.localPosition.z === b.localPosition.z &&
    a.yaw === b.yaw &&
    a.pitch === b.pitch
  );
}

export type PresencePublisher = (player: PlayerState, nowSeconds: number) => void;

export function createPresencePublisher(port: PresencePort): PresencePublisher {
  let lastTime = -Infinity;
  let lastPublished: PlayerState | null = null;
  return (player, nowSeconds) => {
    if (nowSeconds - lastTime < MIN_PUBLISH_INTERVAL) return;
    if (lastPublished !== null && samePose(lastPublished, player)) return;
    port.publish(player);
    lastTime = nowSeconds;
    lastPublished = player;
  };
}
