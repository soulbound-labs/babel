import { describe, expect, it } from 'vitest';

import { ORIGIN } from '@/domain/entities';
import type { PlayerState, PresencePort } from '@/domain/ports';
import {
  createPresencePublisher,
  MIN_PUBLISH_INTERVAL,
} from '@/presentation/render/player/presence-publisher';

function fakePort(): PresencePort & { published: PlayerState[] } {
  const published: PlayerState[] = [];
  return {
    published,
    publish(state: PlayerState) {
      published.push(state);
    },
    subscribe() {
      return () => {};
    },
  };
}

const pose = (z: number): PlayerState => ({
  coordinate: ORIGIN,
  localPosition: { x: 0, y: 1.62, z },
  yaw: 0,
  pitch: 0,
});

describe('INV-R6 — publish throttle', () => {
  it('publishes at ≤ 10 Hz while the pose changes every frame', () => {
    const port = fakePort();
    const publish = createPresencePublisher(port);
    const seconds = 5;
    const fps = 60;
    for (let i = 0; i < seconds * fps; i++) {
      publish(pose(1 - i / 1000), i / fps); // moving every frame
    }
    expect(port.published.length).toBeLessThanOrEqual(seconds / MIN_PUBLISH_INTERVAL + 1);
    expect(port.published.length).toBeGreaterThan(0);
  });

  it('publishes only on pose change', () => {
    const port = fakePort();
    const publish = createPresencePublisher(port);
    const still = pose(1.0);
    for (let i = 0; i < 100; i++) publish(still, i); // stationary, plenty of time
    expect(port.published.length).toBe(1); // the initial pose only
  });

  it('resumes publishing when the pose changes again', () => {
    const port = fakePort();
    const publish = createPresencePublisher(port);
    publish(pose(1.0), 0);
    publish(pose(1.0), 1); // no change — skipped
    publish(pose(0.8), 2); // moved — published
    expect(port.published.length).toBe(2);
    expect(port.published[1]?.localPosition.z).toBe(0.8);
  });
});
