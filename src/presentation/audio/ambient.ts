/**
 * Procedural ambient (§7.5) — zero asset files. Two source graphs on the bus:
 *   hush — looped seeded brown-ish noise → lowpass ≈ 220 Hz → slow gain LFO,
 *          on an `ambient` emitter at very low gain (felt, not heard);
 *   hums — 120 Hz sine + faint harmonic on a `positional` emitter at each
 *          bulb, so the positional path is genuinely exercised this unit.
 * "The hum of the bulbs": the light is unceasing, and so is its sound.
 *
 * Browser-only module (real Web Audio); the bus's graph logic is what unit
 * tests cover (E5). Noise is seeded (xorshift32), never Math.random (C4).
 */
import type { AudioBus, AudioEmitter } from './audio-bus';
import { BULB_POSITIONS } from '../render/room/Bulbs';

const HUSH_GAIN = 0.05;
const HUSH_LFO_HZ = 0.06;
const HUM_GAIN = 0.035;
const HUM_FREQ = 120;

/** Deterministic noise buffer — a leaky-integrated xorshift32 walk (brown-ish). */
function makeNoiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0xbabe1;
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
  return buffer;
}

export type AmbientHandle = { dispose(): void };

/** Builds and starts the ambient graphs. Silent until `bus.resume()` (E2). */
export function startAmbient(bus: AudioBus, ctx: BaseAudioContext): AmbientHandle {
  const emitters: AudioEmitter[] = [];
  const sources: { stop(): void; disconnect(): void }[] = [];
  const nodes: { disconnect(): void }[] = [];

  // --- The hush ---
  const hush = bus.createEmitter({ kind: 'ambient' });
  hush.setGain(HUSH_GAIN);
  emitters.push(hush);

  const noise = ctx.createBufferSource();
  noise.buffer = makeNoiseBuffer(ctx, 4);
  noise.loop = true;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 220;
  const swell = ctx.createGain();
  swell.gain.value = 1;
  noise.connect(lowpass);
  lowpass.connect(swell);
  swell.connect(hush.input as AudioNode);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = HUSH_LFO_HZ;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.3; // breathe around the base gain
  lfo.connect(lfoDepth);
  lfoDepth.connect(swell.gain);

  noise.start();
  lfo.start();
  sources.push(noise, lfo);
  nodes.push(lowpass, swell, lfoDepth);

  // --- Two bulb hums (positional) ---
  for (const position of BULB_POSITIONS) {
    const hum = bus.createEmitter({
      kind: 'positional',
      position,
      refDistance: 0.8,
      rolloff: 1.4,
    });
    hum.setGain(HUM_GAIN);
    emitters.push(hum);

    const mix = ctx.createGain();
    mix.gain.value = 1;
    mix.connect(hum.input as AudioNode);
    nodes.push(mix);

    const fundamental = ctx.createOscillator();
    fundamental.type = 'sine';
    fundamental.frequency.value = HUM_FREQ;
    fundamental.connect(mix);
    fundamental.start();
    sources.push(fundamental);

    const harmonic = ctx.createOscillator();
    harmonic.type = 'sine';
    harmonic.frequency.value = HUM_FREQ * 2;
    const harmonicGain = ctx.createGain();
    harmonicGain.gain.value = 0.25;
    harmonic.connect(harmonicGain);
    harmonicGain.connect(mix);
    harmonic.start();
    sources.push(harmonic);
    nodes.push(harmonicGain);
  }

  return {
    dispose() {
      for (const s of sources) {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
        s.disconnect();
      }
      for (const n of nodes) n.disconnect();
      for (const e of emitters) e.dispose();
    },
  };
}
