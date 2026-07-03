/**
 * The world (§4.4): R3F Canvas composing the hexagon room modules. DPR is
 * clamped ≤ 1.5 and there are no shadow maps or post-processing (C3).
 * Phase 4 replaces the static spawn camera with the locomotion controller;
 * Phase 3 replaces the temporary work light with Bulbs + atmosphere.
 *
 * Boundary contract (C2): imports only domain/entities, domain/ports,
 * third-party, and presentation modules — never adapters or convex.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { Ref } from 'react';
import { Vector3 } from 'three';

import type { AudioBus } from '../audio/audio-bus';
import { applyAtmosphere, DEFAULT_ATMOSPHERE } from './atmosphere/atmosphere';
import { DebugStats } from './debug/DebugStats';
import { parseDebugParam, parsePoseParam, SPAWN_POSE } from './debug/poses';
import { LocomotionController } from './player/LocomotionController';
import type { LocomotionHandle } from './player/LocomotionController';
import { BookWalls } from './room/BookWalls';
import { Bulbs } from './room/Bulbs';
import { Room } from './room/Room';
import { Shaft } from './room/Shaft';
import { Shelves } from './room/Shelves';
import { Vestibule } from './room/Vestibule';

/** Applies the §4.8 atmosphere profile + the floor ambient inside the Canvas. */
function Atmosphere() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    applyAtmosphere(scene, gl, DEFAULT_ATMOSPHERE);
  }, [scene, gl]);
  return <ambientLight intensity={DEFAULT_ATMOSPHERE.ambientIntensity} />;
}

/** The camera drives the audio listener each frame (§4.6). */
function ListenerPoseDriver({ bus }: { bus: AudioBus }) {
  const camera = useThree((s) => s.camera);
  const forward = useMemo(() => new Vector3(), []);
  useFrame(() => {
    camera.getWorldDirection(forward);
    bus.setListenerPose({
      position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      forward: { x: forward.x, y: forward.y, z: forward.z },
      up: { x: camera.up.x, y: camera.up.y, z: camera.up.z },
    });
  });
  return null;
}

export type WorldSceneProps = {
  /** The frozen §4.7 camera seam, for callers that need suspend()/resume() (Unit 05). */
  locomotionRef?: Ref<LocomotionHandle>;
  /** The §4.6 audio bus — the camera drives its listener pose. */
  audioBus?: AudioBus;
};

export function WorldScene({ locomotionRef, audioBus }: WorldSceneProps = {}) {
  // Debug hooks (§7.1, E7): invalid ?pose is ignored — normal spawn.
  const search = window.location.search;
  const pose = parsePoseParam(search) ?? SPAWN_POSE;
  const debug = parseDebugParam(search);

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, background: '#050507' }}
      dpr={[1, 1.5]}
      camera={{ fov: 62, near: 0.05, far: 60 }}
    >
      <LocomotionController initialPose={pose} handleRef={locomotionRef} />
      {audioBus && <ListenerPoseDriver bus={audioBus} />}
      {debug && <DebugStats />}
      <Atmosphere />
      <Bulbs />
      <Room />
      <Shaft />
      <Vestibule />
      <Shelves />
      <BookWalls />
    </Canvas>
  );
}
