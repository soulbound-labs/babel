/**
 * Shaft drone (§4.3, USER-APPROVED — cut-able at the mood gate) — a procedural
 * low drone (seeded filtered noise, lowpass ~80–120 Hz) at near-threshold gain,
 * on ONE positional emitter at the current vestibule's shaft axis. The current
 * room is always the local-frame anchor, so the drone sits at a fixed local
 * shaft-axis position and re-bases with the world for free (§4.2.1).
 *
 * Lifecycle follows the CURRENT room only (not all 11 live rooms). If Rei's
 * Phase 7 verdict is "doesn't land", this module and its wiring are DELETED,
 * not tuned up.
 *
 * The source-graph factory is injected so unit tests drive the lifecycle
 * against the fake `BusContext` (E5) without a real Web Audio engine.
 */
import type { AudioBus, AudioEmitter, AudioNodeLike, Vec3 } from './audio-bus';

const DRONE_GAIN = 0.02; // near-threshold: felt in the chest, not consciously heard
const DRONE_CUTOFF_HZ = 100; // within the §4.3 80–120 Hz band

/** A running drone source graph feeding one emitter — stop + disconnect only. */
export type DroneSource = { stop(): void; disconnect(): void };

/** Builds and starts the drone source graph into `input` (browser Web Audio). */
export type DroneSourceFactory = (ctx: BaseAudioContext, input: AudioNodeLike) => DroneSource;

/** Seeded brown-ish noise → lowpass ~100 Hz (seeded xorshift32, never Math.random — C4). */
export function defaultDroneSource(ctx: BaseAudioContext, input: AudioNodeLike): DroneSource {
  const length = Math.max(1, Math.floor(ctx.sampleRate * 3));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0xd7018e;
  let brown = 0;
  for (let i = 0; i < length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed |= 0;
    const white = (seed >>> 8) / 0x7fffff - 1; // [-1, 1)
    brown = (brown + 0.02 * white) / 1.002; // integrate with leak
    data[i] = brown * 3.5;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = DRONE_CUTOFF_HZ;
  noise.connect(lowpass);
  lowpass.connect(input as AudioNode);
  noise.start();

  return {
    stop() {
      try {
        noise.stop();
      } catch {
        /* already stopped */
      }
    },
    disconnect() {
      noise.disconnect();
      lowpass.disconnect();
    },
  };
}

export type ShaftDroneHandle = {
  /** Move the drone to a new shaft-axis position (§4.2.1 re-base). */
  reposition(position: Vec3): void;
  /** Idempotent: stop the source, disconnect, dispose the emitter. */
  dispose(): void;
};

export function startShaftDrone(
  bus: AudioBus,
  ctx: BaseAudioContext,
  position: Vec3,
  makeSource: DroneSourceFactory = defaultDroneSource,
): ShaftDroneHandle {
  const emitter: AudioEmitter = bus.createEmitter({
    kind: 'positional',
    position,
    refDistance: 1.2,
    rolloff: 1.0,
  });
  emitter.setGain(DRONE_GAIN);
  const source = makeSource(ctx, emitter.input);

  let disposed = false;
  return {
    reposition(next: Vec3) {
      emitter.setPosition(next);
    },
    dispose() {
      if (disposed) return; // idempotent
      disposed = true;
      source.stop();
      source.disconnect();
      emitter.dispose();
    },
  };
}
