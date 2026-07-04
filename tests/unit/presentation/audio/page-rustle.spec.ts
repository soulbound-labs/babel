import { describe, expect, it, vi } from 'vitest';

import { createAudioBus } from '@/presentation/audio/audio-bus';
import type {
  AudioNodeLike,
  BusContext,
  GainNodeLike,
  PannerNodeLike,
} from '@/presentation/audio/audio-bus';
import type { FootstepContext } from '@/presentation/audio/footsteps';
import { startPageRustle } from '@/presentation/audio/page-rustle';

/** Hand-rolled fake bus graph (E5), mirroring footsteps.spec.ts. */
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

function fakeBusContext() {
  const gains: (FakeNode & GainNodeLike)[] = [];
  const panners: (FakeNode & PannerNodeLike)[] = [];
  let closes = 0;
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
    close: () => {
      closes++;
      return Promise.resolve();
    },
  };
  return { ctx, gains, panners, closes: () => closes };
}

function fakeRustleContext() {
  type Src = {
    buffer: { getChannelData(ch: number): Float32Array } | null;
    playbackRate: { value: number };
    onended: (() => void) | null;
    stops: number;
    connect(d: AudioNodeLike): unknown;
    disconnect(): void;
    start(): void;
    stop(): void;
  };
  const sources: Src[] = [];
  const filters: { type: string; frequency: { value: number }; Q: { value: number } }[] = [];
  const buffers: Float32Array[] = [];
  const ctx: FootstepContext = {
    sampleRate: 48000,
    createBuffer(_channels, length) {
      const data = new Float32Array(length);
      buffers.push(data);
      return { getChannelData: () => data };
    },
    createBufferSource() {
      const src: Src = {
        buffer: null,
        playbackRate: { value: 1 },
        onended: null,
        stops: 0,
        connect: () => undefined,
        disconnect() {},
        start() {},
        stop() {
          this.stops++;
        },
      };
      sources.push(src);
      return src;
    },
    createBiquadFilter() {
      const f = {
        type: '',
        frequency: { value: 0 },
        Q: { value: 0 },
        connect: () => undefined,
        disconnect() {},
      };
      filters.push(f);
      return f;
    },
    createGain() {
      return { ...fakeNode(), gain: { value: 1 } };
    },
  };
  return { ctx, sources, filters, buffers };
}

const POSITION = { x: 0.1, y: 1.4, z: 0.5 };

describe('page rustle (INV-B8)', () => {
  it('creates exactly ONE positional emitter per session, at the book position', () => {
    const bus = fakeBusContext();
    const rustle = fakeRustleContext();
    const handle = startPageRustle(createAudioBus(bus.ctx), rustle.ctx, POSITION);
    handle.rustle('lift', 0);
    handle.rustle('settle', 0);
    handle.rustle('lift', 3);
    expect(bus.panners).toHaveLength(1); // one emitter, not one per turn
    expect(bus.panners[0]!.positionX!.value).toBe(POSITION.x);
    expect(bus.panners[0]!.positionZ!.value).toBe(POSITION.z);
  });

  it('never constructs an AudioContext and never closes/disposes the shared bus', () => {
    const audioContextSpy = vi.fn();
    vi.stubGlobal('AudioContext', audioContextSpy);
    try {
      const bus = fakeBusContext();
      const rustle = fakeRustleContext();
      const handle = startPageRustle(createAudioBus(bus.ctx), rustle.ctx, POSITION);
      handle.rustle('lift', 0);
      handle.dispose();
      expect(audioContextSpy).not.toHaveBeenCalled();
      expect(bus.closes()).toBe(0); // bus.dispose() would close the context
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('precomputes a fixed buffer bank once; buffers are seed-deterministic (byte-identical)', () => {
    const first = fakeRustleContext();
    startPageRustle(createAudioBus(fakeBusContext().ctx), first.ctx, POSITION);
    const second = fakeRustleContext();
    startPageRustle(createAudioBus(fakeBusContext().ctx), second.ctx, POSITION);

    expect(first.buffers).toHaveLength(4); // the bank, at creation — not per trigger
    expect(second.buffers).toHaveLength(4);
    for (let k = 0; k < 4; k++) {
      expect(first.buffers[k]).toEqual(second.buffers[k]); // seed → byte-identical
    }
    // Bank entries genuinely differ from each other (seed offsets).
    expect(first.buffers[0]).not.toEqual(first.buffers[1]);
  });

  it('envelope is bounded (|s| ≤ 1) and ≈0 at both ends', () => {
    const rustle = fakeRustleContext();
    startPageRustle(createAudioBus(fakeBusContext().ctx), rustle.ctx, POSITION);
    for (const data of rustle.buffers) {
      let peak = 0;
      for (const s of data) peak = Math.max(peak, Math.abs(s));
      expect(peak).toBeLessThanOrEqual(1);
      expect(peak).toBeGreaterThan(0.1); // a real burst, not silence
      expect(Math.abs(data[0]!)).toBeLessThan(0.01); // attack from zero
      expect(Math.abs(data[data.length - 1]!)).toBeLessThan(0.05); // decayed out
    }
  });

  it('selects the buffer BY PAGE INDEX — deterministic variation, no Math.random', () => {
    const rustle = fakeRustleContext();
    const handle = startPageRustle(createAudioBus(fakeBusContext().ctx), rustle.ctx, POSITION);
    for (const page of [0, 1, 2, 3, 4, 5]) handle.rustle('lift', page);
    const pick = (i: number) => rustle.sources[i]!.buffer;
    expect(pick(4)).toBe(pick(0)); // 4 % 4 === 0
    expect(pick(5)).toBe(pick(1));
    expect(pick(0)).not.toBe(pick(1));
  });

  it("each trigger is a FRESH BufferSource ('lift' bright, 'settle' dull), self-disconnecting", () => {
    const rustle = fakeRustleContext();
    const handle = startPageRustle(createAudioBus(fakeBusContext().ctx), rustle.ctx, POSITION);
    handle.rustle('lift', 0);
    handle.rustle('settle', 0);
    expect(rustle.sources).toHaveLength(2); // never reused after stop() (§5)
    expect(rustle.filters[0]!.type).toBe('bandpass');
    expect(rustle.filters[0]!.frequency.value).toBeGreaterThan(rustle.filters[1]!.frequency.value);
    expect(rustle.sources[0]!.playbackRate.value).toBeGreaterThan(
      rustle.sources[1]!.playbackRate.value,
    );
    rustle.sources[0]!.onended?.(); // browser fires this — the graph self-cleans
  });

  it('reposition moves the session emitter (same frame as a re-base would)', () => {
    const bus = fakeBusContext();
    const handle = startPageRustle(createAudioBus(bus.ctx), fakeRustleContext().ctx, POSITION);
    handle.reposition({ x: 9, y: 8, z: 7 });
    expect(bus.panners[0]!.positionX!.value).toBe(9);
    expect(bus.panners[0]!.positionY!.value).toBe(8);
  });

  it('dispose stops live one-shots, disposes the emitter, and is idempotent', () => {
    const bus = fakeBusContext();
    const rustle = fakeRustleContext();
    const handle = startPageRustle(createAudioBus(bus.ctx), rustle.ctx, POSITION);
    handle.rustle('lift', 0);
    handle.dispose();
    handle.dispose(); // idempotent (StrictMode double-mount)
    expect(rustle.sources[0]!.stops).toBe(1);
    // Post-dispose triggers are no-ops.
    handle.rustle('settle', 1);
    expect(rustle.sources).toHaveLength(1);
    // The emitter's panner graph was torn down.
    expect(bus.panners[0]!.connections.size).toBe(0);
  });
});
