/**
 * Footsteps (§4.3) — ONE `ambient`-kind emitter: the feet are head-locked, so a
 * panner would be wrong (the sound is always "here"). Each stride fires a fresh
 * one-shot noise burst through a bandpass: stone reads lower/duller with a
 * longer decay, stair brighter/shorter. The two decayed-noise buffers are
 * precomputed once (seeded xorshift32, never `Math.random` — C4); per-step
 * playbackRate/gain variation is drawn from a deterministic seed so two runs of
 * the same stride sequence are byte-identical (capture determinism).
 *
 * The stride cadence + stone/stair classification are locomotion state, so the
 * render side calls `step(surface)` — this module only exposes the sound
 * (footstep TRIGGERS are not an audio concern, §4.3).
 *
 * Web Audio is consumed through the narrow `FootstepContext` structural surface
 * so unit tests inject a hand-rolled fake (E5) and drive the whole graph
 * without a real engine. A real `BaseAudioContext` satisfies it structurally.
 */
import type { AudioBus, AudioEmitter, AudioNodeLike, GainNodeLike } from './audio-bus';

export type FootstepSurface = 'stone' | 'stair';

const FOOTSTEP_GAIN = 0.22;
const BURST_SECONDS = 0.22; // buffer length — the longest (stone) decay fits inside

type SurfaceBand = {
  /** Bandpass center — stone dull/low, stair bright/high. */
  centerHz: number;
  q: number;
  /** Envelope decay time-constant (s) — stone longer, stair shorter. */
  decay: number;
  /** Playback-rate center — stair a touch faster/brighter. */
  baseRate: number;
  /** Buffer noise seed — distinct per surface so the two buffers never coincide. */
  seed: number;
};

const BANDS: Record<FootstepSurface, SurfaceBand> = {
  stone: { centerHz: 520, q: 0.7, decay: 0.11, baseRate: 1.0, seed: 0x51074e },
  stair: { centerHz: 1150, q: 0.9, decay: 0.06, baseRate: 1.18, seed: 0x57a175 },
};

/** Advances an xorshift32 state; returns the new state and a unit float in [0, 1).
 * Shared PRNG helper (C4) — page-rustle (Unit 05) reuses it for its buffers. */
export function xorshift32(state: number): { state: number; unit: number } {
  let s = state | 0;
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  s |= 0;
  return { state: s, unit: (s >>> 8) / 0x1000000 };
}

/** Minimal AudioBuffer surface the footstep buffers use. */
type AudioBufferLike = { getChannelData(channel: number): Float32Array };

/** Minimal one-shot source surface. */
type BufferSourceLike = {
  buffer: AudioBufferLike | null;
  playbackRate: { value: number };
  onended: ((ev: Event) => void) | null;
  connect(destination: AudioNodeLike): unknown;
  disconnect(): void;
  start(when?: number): void;
  stop(when?: number): void;
};

/** Minimal bandpass surface. */
type BiquadLike = {
  type: string;
  frequency: { value: number };
  Q: { value: number };
  connect(destination: AudioNodeLike): unknown;
  disconnect(): void;
};

/** The narrow AudioContext-shaped surface footsteps consume (E5 seam). */
export type FootstepContext = {
  sampleRate: number;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike;
  createBufferSource(): BufferSourceLike;
  createBiquadFilter(): BiquadLike;
  createGain(): GainNodeLike;
};

/** A seeded, decay-enveloped noise burst — the raw footstep material for one surface. */
function makeBurstBuffer(ctx: FootstepContext, band: SurfaceBand): AudioBufferLike {
  const length = Math.max(1, Math.floor(ctx.sampleRate * BURST_SECONDS));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = band.seed;
  for (let i = 0; i < length; i++) {
    const next = xorshift32(seed);
    seed = next.state;
    const white = next.unit * 2 - 1; // [-1, 1)
    const env = Math.exp(-(i / ctx.sampleRate) / band.decay);
    data[i] = white * env;
  }
  return buffer;
}

export type FootstepsHandle = {
  /** Fire one footstep of the given surface (render-side stride trigger). */
  step(surface: FootstepSurface): void;
  /** Idempotent: stop any live bursts and dispose the emitter. */
  dispose(): void;
};

export function createFootsteps(bus: AudioBus, ctx: FootstepContext): FootstepsHandle {
  const emitter: AudioEmitter = bus.createEmitter({ kind: 'ambient' });
  emitter.setGain(FOOTSTEP_GAIN);

  const buffers: Record<FootstepSurface, AudioBufferLike> = {
    stone: makeBurstBuffer(ctx, BANDS.stone),
    stair: makeBurstBuffer(ctx, BANDS.stair),
  };

  const live = new Set<BufferSourceLike>();
  let variationSeed = 0x0f00d5; // deterministic per-step jitter — same sequence every run
  let disposed = false;

  return {
    step(surface: FootstepSurface) {
      if (disposed) return;
      const band = BANDS[surface];
      const r = xorshift32(variationSeed);
      variationSeed = r.state;
      const g = xorshift32(variationSeed);
      variationSeed = g.state;

      const source = ctx.createBufferSource();
      source.buffer = buffers[surface];
      source.playbackRate.value = band.baseRate * (0.94 + 0.12 * r.unit); // ±6% pitch

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = band.centerHz;
      filter.Q.value = band.q;

      const gain = ctx.createGain();
      gain.gain.value = 0.85 + 0.15 * g.unit; // per-step loudness jitter

      source.connect(filter);
      filter.connect(gain);
      gain.connect(emitter.input);

      live.add(source);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
        live.delete(source);
      };
      source.start();
    },
    dispose() {
      if (disposed) return; // idempotent
      disposed = true;
      for (const source of [...live]) {
        try {
          source.stop();
        } catch {
          /* already stopped */
        }
        source.disconnect();
      }
      live.clear();
      emitter.dispose();
    },
  };
}
