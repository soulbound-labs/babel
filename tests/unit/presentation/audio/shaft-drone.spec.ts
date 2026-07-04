import { describe, expect, it } from 'vitest';

import { createAudioBus } from '@/presentation/audio/audio-bus';
import type {
  AudioNodeLike,
  BusContext,
  GainNodeLike,
  PannerNodeLike,
} from '@/presentation/audio/audio-bus';
import { startShaftDrone } from '@/presentation/audio/shaft-drone';
import type { DroneSource } from '@/presentation/audio/shaft-drone';

type FakeNode = AudioNodeLike & { connections: Set<AudioNodeLike> };
function fakeNode(): FakeNode {
  const connections = new Set<AudioNodeLike>();
  return {
    connections,
    connect(dest) {
      connections.add(dest);
      return dest;
    },
    disconnect() {
      connections.clear();
    },
  };
}

function fakeContext() {
  const gains: (FakeNode & GainNodeLike)[] = [];
  const panners: (FakeNode & PannerNodeLike)[] = [];
  const ctx: BusContext = {
    destination: fakeNode(),
    listener: {},
    createGain() {
      const g = { ...fakeNode(), gain: { value: 1 } };
      gains.push(g);
      return g;
    },
    createPanner() {
      const p = {
        ...fakeNode(),
        panningModel: '',
        distanceModel: '',
        refDistance: 1,
        rolloffFactor: 1,
        positionX: { value: 0 },
        positionY: { value: 0 },
        positionZ: { value: 0 },
      };
      panners.push(p);
      return p;
    },
    resume: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
  return { ctx, gains, panners };
}

function stubSource() {
  const rec = { stops: 0, disconnects: 0 };
  const make = (): DroneSource => ({
    stop() {
      rec.stops++;
    },
    disconnect() {
      rec.disconnects++;
    },
  });
  return { make, rec };
}

const fakeAudioCtx = {} as unknown as BaseAudioContext;

describe('shaft drone (§4.3, cut-able at the gate)', () => {
  it('is ONE positional emitter at the shaft axis, at near-threshold gain', () => {
    const f = fakeContext();
    const bus = createAudioBus(f.ctx);
    const src = stubSource();

    startShaftDrone(bus, fakeAudioCtx, { x: -0.55, y: 1, z: -2 }, src.make);

    expect(f.panners).toHaveLength(1);
    expect(f.panners[0]!.positionX!.value).toBe(-0.55);
    // gains[0] is the bus master; gains[1] is the drone emitter.
    expect(f.gains[1]!.gain.value).toBeLessThan(0.05); // near-threshold
    expect(f.gains[1]!.gain.value).toBeGreaterThan(0);
  });

  it('reposition moves the emitter (re-base)', () => {
    const f = fakeContext();
    const drone = startShaftDrone(
      createAudioBus(f.ctx),
      fakeAudioCtx,
      { x: 0, y: 0, z: 0 },
      stubSource().make,
    );
    drone.reposition({ x: 5, y: 6, z: 7 });
    expect(f.panners[0]!.positionZ!.value).toBe(7);
  });

  it('dispose stops the source, disconnects, disposes the emitter — idempotent', () => {
    const f = fakeContext();
    const src = stubSource();
    const drone = startShaftDrone(
      createAudioBus(f.ctx),
      fakeAudioCtx,
      { x: 0, y: 0, z: 0 },
      src.make,
    );

    drone.dispose();
    drone.dispose();

    expect(src.rec.stops).toBe(1);
    expect(src.rec.disconnects).toBe(1);
    expect(f.panners[0]!.connections.size).toBe(0);
  });
});
