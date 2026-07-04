import { describe, expect, it } from 'vitest';

import { createAudioBus } from '@/presentation/audio/audio-bus';
import type {
  AudioNodeLike,
  BusContext,
  GainNodeLike,
  PannerNodeLike,
} from '@/presentation/audio/audio-bus';
import { createFootsteps } from '@/presentation/audio/footsteps';
import type { FootstepContext } from '@/presentation/audio/footsteps';

/** Hand-rolled fake bus graph (E5). */
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

/** Records each one-shot burst's buffer, playbackRate, bandpass freq, and gain. */
function fakeFootstepContext() {
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
  const buffers: { getChannelData(ch: number): Float32Array }[] = [];
  const ctx: FootstepContext = {
    sampleRate: 48000,
    createBuffer(_channels, length) {
      const data = new Float32Array(length);
      const buffer = { getChannelData: () => data };
      buffers.push(buffer);
      return buffer;
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

describe('footsteps (§4.3)', () => {
  it('uses ONE ambient emitter — no panner (feet are head-locked)', () => {
    const bus = fakeBusContext();
    const step = fakeFootstepContext();
    createFootsteps(createAudioBus(bus.ctx), step.ctx);
    // Bus master = gains[0]; the ambient emitter adds gains[1]; NO panner ever.
    expect(bus.panners).toHaveLength(0);
    expect(bus.gains.length).toBeGreaterThanOrEqual(2);
  });

  it('precomputes exactly two burst buffers (stone + stair), once', () => {
    const bus = fakeBusContext();
    const step = fakeFootstepContext();
    const feet = createFootsteps(createAudioBus(bus.ctx), step.ctx);
    feet.step('stone');
    feet.step('stair');
    feet.step('stone');
    expect(step.buffers).toHaveLength(2); // not one-per-step
  });

  it('stone vs stair select distinct buffers and distinct bandpass centers', () => {
    const bus = fakeBusContext();
    const step = fakeFootstepContext();
    const feet = createFootsteps(createAudioBus(bus.ctx), step.ctx);

    feet.step('stone');
    feet.step('stair');

    const stoneSrc = step.sources[0]!;
    const stairSrc = step.sources[1]!;
    expect(stoneSrc.buffer).not.toBe(stairSrc.buffer); // different material
    expect(step.filters[0]!.type).toBe('bandpass');
    expect(step.filters[0]!.frequency.value).toBeLessThan(step.filters[1]!.frequency.value); // stone duller
  });

  it('two instances under the fixed seed produce identical variation sequences', () => {
    const seqOf = () => {
      const bus = fakeBusContext();
      const step = fakeFootstepContext();
      const feet = createFootsteps(createAudioBus(bus.ctx), step.ctx);
      for (let i = 0; i < 8; i++) feet.step('stone');
      return step.sources.map((s) => s.playbackRate.value);
    };
    const a = seqOf();
    const b = seqOf();
    expect(a).toHaveLength(8);
    expect(a).toEqual(b); // deterministic — no Math.random (C4)
    // And the jitter genuinely varies step to step (not a constant).
    expect(new Set(a).size).toBeGreaterThan(1);
  });

  it('dispose stops live bursts and is idempotent', () => {
    const bus = fakeBusContext();
    const step = fakeFootstepContext();
    const feet = createFootsteps(createAudioBus(bus.ctx), step.ctx);
    feet.step('stone'); // burst still "live" (onended not fired)
    feet.dispose();
    feet.dispose(); // idempotent

    expect(step.sources[0]!.stops).toBe(1);
    // Post-dispose steps are no-ops (no new sources).
    feet.step('stair');
    expect(step.sources).toHaveLength(1);
  });
});
