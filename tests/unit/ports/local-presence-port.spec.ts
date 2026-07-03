import { describe, expect, it } from 'vitest';

import { LocalPresencePort } from '@/adapters/presence/local-presence-port';
import { ORIGIN } from '@/domain/entities';
import type { PlayerState, PresencePort } from '@/domain/ports';

describe('LocalPresencePort (port adapter)', () => {
  const port: PresencePort = new LocalPresencePort();
  const state: PlayerState = {
    coordinate: ORIGIN,
    localPosition: { x: 0, y: 1.62, z: 1.18 },
    yaw: 0,
    pitch: 0,
  };

  it('satisfies the PresencePort interface', () => {
    expect(typeof port.publish).toBe('function');
    expect(typeof port.subscribe).toBe('function');
  });

  it('accepts a valid PlayerState at ORIGIN without throwing', () => {
    expect(() => port.publish(state)).not.toThrow();
  });

  it('subscribe returns a callable unsubscribe', () => {
    const unsubscribe = port.subscribe(() => {});
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });
});
