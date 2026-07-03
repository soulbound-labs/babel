/**
 * AudioBus (§4.6, frozen API) — handle-based, N emitters from day one.
 * Consumers never touch Web Audio directly: they connect a source graph to
 * `emitter.input` and the bus owns routing, spatialization, and the master
 * gain. Footsteps (04), page rustle (05), and remote players (07) are just
 * more emitters on this same bus.
 *
 * The constructor takes a NARROW `BusContext` (only the factory surface it
 * uses) so unit tests inject a hand-rolled fake and assert graph wiring and
 * disposal without a browser (E5, INV-R7). In the browser the default is a
 * real `AudioContext`, which satisfies `BusContext` structurally. Optional
 * fields cover engines (Firefox) that still lack the param-based
 * listener/panner setters.
 */

export type Vec3 = { x: number; y: number; z: number };
export type ListenerPose = { position: Vec3; forward: Vec3; up: Vec3 };
export type EmitterSpec =
  | { kind: 'ambient' } // non-positional, straight to master
  | { kind: 'positional'; position: Vec3; refDistance?: number; rolloff?: number };

type AudioParamLike = { value: number };

export type AudioNodeLike = {
  connect(destination: AudioNodeLike): unknown;
  disconnect(): void;
};

export type GainNodeLike = AudioNodeLike & { gain: AudioParamLike };

export type PannerNodeLike = AudioNodeLike & {
  panningModel: string;
  distanceModel: string;
  refDistance: number;
  rolloffFactor: number;
  positionX?: AudioParamLike;
  positionY?: AudioParamLike;
  positionZ?: AudioParamLike;
  setPosition?(x: number, y: number, z: number): void;
};

export type BusListener = {
  positionX?: AudioParamLike;
  positionY?: AudioParamLike;
  positionZ?: AudioParamLike;
  forwardX?: AudioParamLike;
  forwardY?: AudioParamLike;
  forwardZ?: AudioParamLike;
  upX?: AudioParamLike;
  upY?: AudioParamLike;
  upZ?: AudioParamLike;
  setPosition?(x: number, y: number, z: number): void;
  setOrientation?(fx: number, fy: number, fz: number, ux: number, uy: number, uz: number): void;
};

/** The narrow AudioContext-shaped surface the bus consumes. */
export type BusContext = {
  destination: AudioNodeLike;
  listener: BusListener;
  createGain(): GainNodeLike;
  createPanner(): PannerNodeLike;
  resume(): Promise<void>;
  close?(): Promise<void>;
};

export interface AudioEmitter {
  readonly input: AudioNodeLike; // consumers connect their source graph here
  setPosition(p: Vec3): void; // positional only; no-op for ambient
  setGain(g: number): void;
  dispose(): void; // disconnects + releases nodes; idempotent
}

export interface AudioBus {
  createEmitter(spec: EmitterSpec): AudioEmitter;
  setListenerPose(pose: ListenerPose): void; // camera drives this each frame
  setMasterGain(g: number): void;
  resume(): Promise<void>; // called from the entry gesture (§4.7)
  dispose(): void;
}

function setPannerPosition(panner: PannerNodeLike, p: Vec3): void {
  if (panner.positionX && panner.positionY && panner.positionZ) {
    panner.positionX.value = p.x;
    panner.positionY.value = p.y;
    panner.positionZ.value = p.z;
  } else {
    panner.setPosition?.(p.x, p.y, p.z);
  }
}

export function createAudioBus(ctx: BusContext = new AudioContext()): AudioBus {
  const master = ctx.createGain();
  master.connect(ctx.destination);

  const liveEmitters = new Set<() => void>(); // per-emitter dispose fns
  let disposed = false;

  function createEmitter(spec: EmitterSpec): AudioEmitter {
    const gain = ctx.createGain();
    let panner: PannerNodeLike | null = null;

    if (spec.kind === 'positional') {
      panner = ctx.createPanner();
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'inverse';
      panner.refDistance = spec.refDistance ?? 1;
      panner.rolloffFactor = spec.rolloff ?? 1;
      setPannerPosition(panner, spec.position);
      gain.connect(panner);
      panner.connect(master);
    } else {
      gain.connect(master);
    }

    let emitterDisposed = false;
    const dispose = () => {
      if (emitterDisposed) return; // idempotent
      emitterDisposed = true;
      gain.disconnect();
      panner?.disconnect();
      liveEmitters.delete(dispose);
    };
    liveEmitters.add(dispose);

    return {
      input: gain,
      setPosition(p: Vec3) {
        if (panner) setPannerPosition(panner, p);
      },
      setGain(g: number) {
        gain.gain.value = g;
      },
      dispose,
    };
  }

  return {
    createEmitter,
    setListenerPose(pose: ListenerPose) {
      const l = ctx.listener;
      if (l.positionX && l.positionY && l.positionZ) {
        l.positionX.value = pose.position.x;
        l.positionY.value = pose.position.y;
        l.positionZ.value = pose.position.z;
      } else {
        l.setPosition?.(pose.position.x, pose.position.y, pose.position.z);
      }
      const { forward: f, up: u } = pose;
      if (l.forwardX && l.forwardY && l.forwardZ && l.upX && l.upY && l.upZ) {
        l.forwardX.value = f.x;
        l.forwardY.value = f.y;
        l.forwardZ.value = f.z;
        l.upX.value = u.x;
        l.upY.value = u.y;
        l.upZ.value = u.z;
      } else {
        l.setOrientation?.(f.x, f.y, f.z, u.x, u.y, u.z);
      }
    },
    setMasterGain(g: number) {
      master.gain.value = g;
    },
    resume() {
      return ctx.resume();
    },
    dispose() {
      if (disposed) return; // idempotent
      disposed = true;
      for (const disposeEmitter of [...liveEmitters]) disposeEmitter();
      master.disconnect();
      void ctx.close?.().catch(() => {});
    },
  };
}
