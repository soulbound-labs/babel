/**
 * Room hums (§4.3, KDD-5) — the "hum of the bulbs" under streaming. Each live
 * room owns a positional emitter + hum source graph per bulb; hums follow the
 * room streaming lifecycle 1:1 (NOT a repositioned pool — audio doctrine §3
 * couples bulb ↔ hum so light and its sound never desynchronize). The origin
 * room's hums arrive via this same path like every other room's — one code path.
 *
 * `startRoomHums` builds one room's hums; `reposition` shifts them on re-base
 * (same frame as the listener pose, §4.2.1 step 3); `dispose` (idempotent)
 * stops the one-shot sources, disconnects, and disposes the emitters when the
 * room leaves the working set. Rooms streaming back build FRESH source graphs —
 * `OscillatorNode`s cannot restart after `stop()` (lifecycle MUST #6).
 *
 * The source-graph factory is injected so unit tests drive the whole lifecycle
 * against the fake `BusContext` (E5) without a real Web Audio engine.
 */
import type { AudioBus, AudioEmitter, AudioNodeLike, Vec3 } from './audio-bus';

const HUM_GAIN = 0.035;
const HUM_FREQ = 120;

/** A running bulb-hum source graph feeding one emitter — stop + disconnect only. */
export type HumSource = { stop(): void; disconnect(): void };

/** Builds and starts a bulb-hum source graph into `input` (browser Web Audio). */
export type HumSourceFactory = (ctx: BaseAudioContext, input: AudioNodeLike) => HumSource;

/** 120 Hz sine + faint 240 Hz harmonic — the frozen bulb-hum timbre (moved from ambient.ts). */
export function defaultHumSource(ctx: BaseAudioContext, input: AudioNodeLike): HumSource {
  const mix = ctx.createGain();
  mix.gain.value = 1;
  mix.connect(input as AudioNode);

  const fundamental = ctx.createOscillator();
  fundamental.type = 'sine';
  fundamental.frequency.value = HUM_FREQ;
  fundamental.connect(mix);
  fundamental.start();

  const harmonic = ctx.createOscillator();
  harmonic.type = 'sine';
  harmonic.frequency.value = HUM_FREQ * 2;
  const harmonicGain = ctx.createGain();
  harmonicGain.gain.value = 0.25;
  harmonic.connect(harmonicGain);
  harmonicGain.connect(mix);
  harmonic.start();

  return {
    stop() {
      try {
        fundamental.stop();
      } catch {
        /* already stopped */
      }
      try {
        harmonic.stop();
      } catch {
        /* already stopped */
      }
    },
    disconnect() {
      fundamental.disconnect();
      harmonic.disconnect();
      harmonicGain.disconnect();
      mix.disconnect();
    },
  };
}

export type RoomHumsHandle = {
  /** Shift every bulb emitter to its re-based position (§4.2.1). Extra/short lists are ignored. */
  reposition(positions: readonly Vec3[]): void;
  /** Idempotent: stop sources, disconnect, dispose emitters (room left the set). */
  dispose(): void;
};

/**
 * One streamed room's bulb hums: a positional emitter (distanceModel 'inverse'
 * via the bus, refDistance 0.8, rolloff 1.4) + a hum source per bulb, placed at
 * `positions` in the render-local frame.
 */
export function startRoomHums(
  bus: AudioBus,
  ctx: BaseAudioContext,
  positions: readonly Vec3[],
  makeSource: HumSourceFactory = defaultHumSource,
): RoomHumsHandle {
  const emitters: AudioEmitter[] = [];
  const sources: HumSource[] = [];
  for (const position of positions) {
    const emitter = bus.createEmitter({
      kind: 'positional',
      position,
      refDistance: 0.8,
      rolloff: 1.4,
    });
    emitter.setGain(HUM_GAIN);
    emitters.push(emitter);
    sources.push(makeSource(ctx, emitter.input));
  }

  let disposed = false;
  return {
    reposition(next: readonly Vec3[]) {
      for (let i = 0; i < emitters.length && i < next.length; i++) {
        emitters[i]!.setPosition(next[i]!);
      }
    },
    dispose() {
      if (disposed) return; // idempotent (lifecycle MUST #3)
      disposed = true;
      for (const s of sources) {
        s.stop();
        s.disconnect();
      }
      for (const e of emitters) e.dispose();
    },
  };
}
