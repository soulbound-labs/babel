import { describe, expect, it } from 'vitest';

import { createAudioBus } from '@/presentation/audio/audio-bus';
import type {
  AudioNodeLike,
  BusContext,
  GainNodeLike,
  PannerNodeLike,
} from '@/presentation/audio/audio-bus';

/** Hand-rolled fake Web Audio graph (E5) — records wiring and disposal. */
type FakeNode = AudioNodeLike & {
  name: string;
  connections: Set<AudioNodeLike>;
};

function fakeNode(name: string): FakeNode {
  const connections = new Set<AudioNodeLike>();
  return {
    name,
    connections,
    connect(dest: AudioNodeLike) {
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
  const destination = fakeNode('destination');
  const listener = {
    positionX: { value: 0 },
    positionY: { value: 0 },
    positionZ: { value: 0 },
    forwardX: { value: 0 },
    forwardY: { value: 0 },
    forwardZ: { value: -1 },
    upX: { value: 0 },
    upY: { value: 1 },
    upZ: { value: 0 },
  };
  let resumes = 0;
  let closes = 0;
  const ctx: BusContext = {
    destination,
    listener,
    createGain() {
      const g = { ...fakeNode(`gain${gains.length}`), gain: { value: 1 } };
      gains.push(g);
      return g;
    },
    createPanner() {
      const p = {
        ...fakeNode(`panner${panners.length}`),
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
    resume() {
      resumes++;
      return Promise.resolve();
    },
    close() {
      closes++;
      return Promise.resolve();
    },
  };
  return {
    ctx,
    gains,
    panners,
    destination,
    listener,
    counts: () => ({ resumes, closes }),
  };
}

describe('INV-R7 — AudioBus graph wiring & lifecycle', () => {
  it('routes master → destination on creation', () => {
    const f = fakeContext();
    createAudioBus(f.ctx);
    const master = f.gains[0]!;
    expect(master.connections.has(f.destination)).toBe(true);
  });

  it('ambient emitter: gain → master; positional: gain → panner → master', () => {
    const f = fakeContext();
    const bus = createAudioBus(f.ctx);
    const master = f.gains[0]!;

    bus.createEmitter({ kind: 'ambient' });
    const ambientGain = f.gains[1]!;
    expect(ambientGain.connections.has(master)).toBe(true);

    bus.createEmitter({ kind: 'positional', position: { x: 1, y: 2, z: 3 } });
    const posGain = f.gains[2]!;
    const panner = f.panners[0]!;
    expect(posGain.connections.has(panner)).toBe(true);
    expect(panner.connections.has(master)).toBe(true);
    expect(panner.panningModel).toBe('equalpower');
    expect(panner.distanceModel).toBe('inverse');
    expect(panner.positionX!.value).toBe(1);
    expect(panner.positionY!.value).toBe(2);
    expect(panner.positionZ!.value).toBe(3);
  });

  it('N emitters all mix through the one master gain', () => {
    const f = fakeContext();
    const bus = createAudioBus(f.ctx);
    const master = f.gains[0]!;
    for (let i = 0; i < 5; i++) bus.createEmitter({ kind: 'ambient' });
    bus.createEmitter({ kind: 'positional', position: { x: 0, y: 0, z: 0 } });
    for (const g of f.gains.slice(1)) {
      const target = [...g.connections][0]!;
      expect(target === master || f.panners.includes(target as never)).toBe(true);
    }
    for (const p of f.panners) expect(p.connections.has(master)).toBe(true);
  });

  it('emitter dispose disconnects its nodes and is idempotent', () => {
    const f = fakeContext();
    const bus = createAudioBus(f.ctx);
    const emitter = bus.createEmitter({ kind: 'positional', position: { x: 0, y: 0, z: 0 } });
    emitter.dispose();
    emitter.dispose(); // double-dispose safe
    expect(f.gains[1]!.connections.size).toBe(0);
    expect(f.panners[0]!.connections.size).toBe(0);
  });

  it('bus dispose leaves zero orphaned nodes and closes the context; idempotent', () => {
    const f = fakeContext();
    const bus = createAudioBus(f.ctx);
    bus.createEmitter({ kind: 'ambient' });
    bus.createEmitter({ kind: 'positional', position: { x: 0, y: 0, z: 0 } });
    bus.dispose();
    bus.dispose();
    for (const g of f.gains) expect(g.connections.size).toBe(0);
    for (const p of f.panners) expect(p.connections.size).toBe(0);
    expect(f.counts().closes).toBe(1);
  });

  it('setGain / setMasterGain write the gain params', () => {
    const f = fakeContext();
    const bus = createAudioBus(f.ctx);
    const emitter = bus.createEmitter({ kind: 'ambient' });
    emitter.setGain(0.25);
    bus.setMasterGain(0.5);
    expect(f.gains[1]!.gain.value).toBe(0.25);
    expect(f.gains[0]!.gain.value).toBe(0.5);
  });

  it('setListenerPose drives the listener params; setPosition moves a panner', () => {
    const f = fakeContext();
    const bus = createAudioBus(f.ctx);
    bus.setListenerPose({
      position: { x: 1, y: 2, z: 3 },
      forward: { x: 0, y: 0, z: -1 },
      up: { x: 0, y: 1, z: 0 },
    });
    expect(f.listener.positionX.value).toBe(1);
    expect(f.listener.positionZ.value).toBe(3);
    expect(f.listener.forwardZ.value).toBe(-1);

    const emitter = bus.createEmitter({ kind: 'positional', position: { x: 0, y: 0, z: 0 } });
    emitter.setPosition({ x: 9, y: 8, z: 7 });
    expect(f.panners[0]!.positionX!.value).toBe(9);

    // Ambient setPosition is a declared no-op.
    const ambient = bus.createEmitter({ kind: 'ambient' });
    expect(() => ambient.setPosition({ x: 1, y: 1, z: 1 })).not.toThrow();
  });

  it('resume() delegates to the context', async () => {
    const f = fakeContext();
    const bus = createAudioBus(f.ctx);
    await bus.resume();
    expect(f.counts().resumes).toBe(1);
  });
});
