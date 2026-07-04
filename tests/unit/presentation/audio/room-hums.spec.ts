import { describe, expect, it } from 'vitest';

import { createAudioBus } from '@/presentation/audio/audio-bus';
import type {
  AudioNodeLike,
  BusContext,
  GainNodeLike,
  PannerNodeLike,
} from '@/presentation/audio/audio-bus';
import { startRoomHums } from '@/presentation/audio/room-hums';
import type { HumSource } from '@/presentation/audio/room-hums';

/** Hand-rolled fake Web Audio graph (E5) — records wiring and disposal. */
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

/** Records the injected source-graph lifecycle without touching a real context. */
function stubSourceFactory() {
  const sources: { stops: number; disconnects: number }[] = [];
  const make = (): HumSource => {
    const rec = { stops: 0, disconnects: 0 };
    sources.push(rec);
    return {
      stop() {
        rec.stops++;
      },
      disconnect() {
        rec.disconnects++;
      },
    };
  };
  return { make, sources };
}

const THREE_BULBS = [
  { x: 0, y: 1.85, z: 0 },
  { x: 1, y: 1.85, z: 0 },
  { x: 0, y: 1.85, z: -2 },
] as const;

// startRoomHums only uses `ctx` inside the (stubbed) factory here; a bare cast is safe.
const fakeAudioCtx = {} as unknown as BaseAudioContext;

describe('room hums (§4.3, KDD-5)', () => {
  it('creates one positional emitter + one source per bulb, with refDistance 0.8 / rolloff 1.4', () => {
    const f = fakeContext();
    const bus = createAudioBus(f.ctx);
    const src = stubSourceFactory();

    startRoomHums(bus, fakeAudioCtx, THREE_BULBS, src.make);

    expect(f.panners).toHaveLength(THREE_BULBS.length);
    expect(src.sources).toHaveLength(THREE_BULBS.length);
    for (const p of f.panners) {
      expect(p.distanceModel).toBe('inverse');
      expect(p.refDistance).toBe(0.8);
      expect(p.rolloffFactor).toBe(1.4);
    }
    // Each bulb emitter is placed at its bulb position.
    expect(f.panners[0]!.positionZ!.value).toBe(0);
    expect(f.panners[2]!.positionZ!.value).toBe(-2);
  });

  it('reposition moves every emitter to its re-based coordinate', () => {
    const f = fakeContext();
    const bus = createAudioBus(f.ctx);
    const src = stubSourceFactory();
    const hums = startRoomHums(bus, fakeAudioCtx, THREE_BULBS, src.make);

    hums.reposition([
      { x: 10, y: 20, z: 30 },
      { x: 11, y: 21, z: 31 },
      { x: 12, y: 22, z: 32 },
    ]);

    expect(f.panners[0]!.positionX!.value).toBe(10);
    expect(f.panners[1]!.positionY!.value).toBe(21);
    expect(f.panners[2]!.positionZ!.value).toBe(32);
  });

  it('dispose stops sources, disconnects, disposes emitters — and is idempotent', () => {
    const f = fakeContext();
    const bus = createAudioBus(f.ctx);
    const src = stubSourceFactory();
    const hums = startRoomHums(bus, fakeAudioCtx, THREE_BULBS, src.make);

    hums.dispose();
    hums.dispose(); // idempotent

    for (const rec of src.sources) {
      expect(rec.stops).toBe(1); // stopped exactly once despite double dispose
      expect(rec.disconnects).toBe(1);
    }
    // Emitter gains + panners fully disconnected (gains[0] is the bus master).
    for (const g of f.gains.slice(1)) expect(g.connections.size).toBe(0);
    for (const p of f.panners) expect(p.connections.size).toBe(0);
  });

  it('N spawn/dispose cycles leave zero orphaned nodes on the context', () => {
    const f = fakeContext();
    const bus = createAudioBus(f.ctx);
    const src = stubSourceFactory();

    for (let i = 0; i < 6; i++) {
      const hums = startRoomHums(bus, fakeAudioCtx, THREE_BULBS, src.make);
      hums.reposition(THREE_BULBS);
      hums.dispose();
    }

    expect(src.sources).toHaveLength(6 * THREE_BULBS.length);
    for (const rec of src.sources) expect(rec.stops).toBe(1);
    for (const g of f.gains.slice(1)) expect(g.connections.size).toBe(0);
    for (const p of f.panners) expect(p.connections.size).toBe(0);
  });
});
