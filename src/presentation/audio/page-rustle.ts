/**
 * Page rustle (Unit 05 §4.5) — "just more emitters" on the Unit 03 bus.
 * ONE positional emitter per reading session (created on open, disposed on
 * close — never per turn); each `rustle()` builds a fresh one-shot
 * `BufferSource` from a PRECOMPUTED seeded-noise buffer → bandpass → the
 * emitter input, self-disconnecting in `onended` (a stopped source can never
 * restart, §5).
 *
 * Deterministic synthesis (INV-B8): a rustle is a filtered seeded-noise burst
 * under an envelope — `xorshift32` with RUSTLE_SEED (distinct from ambient's
 * 0xbabe1 and the footstep seeds), fast attack + exponential decay, computed
 * offline into a small fixed bank at handle creation. Variation without
 * `Math.random`: the buffer is selected BY PAGE INDEX (`page % bank size`),
 * and 'lift' vs 'settle' shape the filter/rate deterministically.
 *
 * Never `bus.dispose()`, never `new AudioContext()` — the shared bus/context
 * are consumed, not owned. Web Audio comes through the narrow
 * `FootstepContext` structural surface so unit tests inject a fake (E5).
 */
import type { AudioBus, AudioEmitter, Vec3 } from './audio-bus';
import { xorshift32 } from './footsteps';
import type { FootstepContext } from './footsteps';

/** Distinct from ambient's 0xbabe1 and footsteps' seeds. */
export const RUSTLE_SEED = 0x9a4e11;
/** Near-threshold, tuned at the gate — NEVER at master (§4.5). */
export const RUSTLE_GAIN = 0.14;

const BANK_SIZE = 4;
const BUFFER_SECONDS = 0.32;
const ATTACK_SECONDS = 0.008; // fast paper attack
const DECAY_SECONDS = 0.2; // exponential decay time-constant
const RELEASE_SECONDS = 0.04; // linear tail to exactly zero (INV-B8: ≈0 at ends)

export type RustlePhase = 'lift' | 'settle';

/** Deterministic per-phase shaping: lift brighter/quicker, settle duller/softer. */
const PHASE_SHAPE: Record<
  RustlePhase,
  { centerHz: number; q: number; rate: number; gain: number }
> = {
  lift: { centerHz: 4200, q: 0.6, rate: 1.1, gain: 1 },
  settle: { centerHz: 2600, q: 0.7, rate: 0.92, gain: 0.8 },
};

type AudioBufferLike = { getChannelData(channel: number): Float32Array };

/** One seeded, enveloped noise burst — byte-identical for a given seed. */
function makeRustleBuffer(ctx: FootstepContext, seed: number): AudioBufferLike {
  const length = Math.max(1, Math.floor(ctx.sampleRate * BUFFER_SECONDS));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const attackSamples = Math.max(1, Math.floor(ctx.sampleRate * ATTACK_SECONDS));
  const releaseSamples = Math.max(1, Math.floor(ctx.sampleRate * RELEASE_SECONDS));
  let state = seed | 0;
  for (let i = 0; i < length; i++) {
    const next = xorshift32(state);
    state = next.state;
    const white = next.unit * 2 - 1; // [-1, 1)
    const attack = i < attackSamples ? i / attackSamples : 1;
    const decay = Math.exp(-(i / ctx.sampleRate) / DECAY_SECONDS);
    const release = Math.min(1, (length - 1 - i) / releaseSamples);
    data[i] = white * attack * decay * release; // |s| ≤ 1, ≈0 at both ends
  }
  return buffer;
}

export type PageRustleHandle = {
  /** Fire one rustle; the buffer is selected deterministically by page index. */
  rustle(phase: RustlePhase, pageIndex: number): void;
  /** Move the emitter to the settled book position (render-local frame). */
  reposition(position: Vec3): void;
  /** Idempotent: stop live one-shots, dispose the session emitter. */
  dispose(): void;
};

/** Bank seeds: RUSTLE_SEED walked by the golden-ratio odd constant. */
function bankSeed(index: number): number {
  return (RUSTLE_SEED + Math.imul(index, 0x9e3779b9)) | 0;
}

export function startPageRustle(
  bus: AudioBus,
  ctx: FootstepContext,
  position: Vec3,
): PageRustleHandle {
  // One positional emitter for the whole reading session (§4.5).
  const emitter: AudioEmitter = bus.createEmitter({
    kind: 'positional',
    position,
    refDistance: 0.6,
    rolloff: 1.2,
  });
  emitter.setGain(RUSTLE_GAIN);

  // The fixed bank, computed offline ONCE at handle creation.
  const bank: AudioBufferLike[] = Array.from({ length: BANK_SIZE }, (_, k) =>
    makeRustleBuffer(ctx, bankSeed(k)),
  );

  const live = new Set<{ stop(): void; disconnect(): void }>();
  let disposed = false;

  return {
    rustle(phase: RustlePhase, pageIndex: number) {
      if (disposed) return;
      const shape = PHASE_SHAPE[phase];

      const source = ctx.createBufferSource();
      source.buffer = bank[((pageIndex % BANK_SIZE) + BANK_SIZE) % BANK_SIZE] ?? null;
      source.playbackRate.value = shape.rate;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = shape.centerHz;
      filter.Q.value = shape.q;

      const gain = ctx.createGain();
      gain.gain.value = shape.gain;

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
    reposition(next: Vec3) {
      emitter.setPosition(next);
    },
    dispose() {
      if (disposed) return; // idempotent (StrictMode double-mount safe)
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
