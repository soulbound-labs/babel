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
import { useMemo, useRef } from 'react';
import type { Ref } from 'react';
import { Vector3 } from 'three';

import { ORIGIN } from '../../domain/entities';
import type { Coordinate } from '../../domain/entities';
import type { AudioBus } from '../audio/audio-bus';
import { DebugStats } from './debug/DebugStats';
import { parseDebugParam, parsePoseParam, SPAWN_POSE } from './debug/poses';
import { LocomotionController } from './player/LocomotionController';
import type { LocomotionHandle } from './player/LocomotionController';
import { EdgeVeil } from './world/EdgeVeil';
import { RoomStream } from './world/RoomStream';

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
  // The teleport coordinate (§4.4): P5–P8 carry a logical (n, floor); interior
  // poses (P1–P4) settle at ORIGIN. Streaming + veil load this same-frame.
  const initialCoordinate = pose.coordinate ?? ORIGIN;
  const debug = parseDebugParam(search);
  // The same-frame re-base channel (§4.2.1): controller → RoomStream + EdgeVeil, no React round-trip.
  const rebaseRef = useRef<((c: Coordinate) => void) | null>(null);
  const edgeVeilRef = useRef<((c: Coordinate) => void) | null>(null);

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, background: '#050507' }}
      dpr={[1, 1.5]}
      camera={{ fov: 62, near: 0.05, far: 60 }}
    >
      <LocomotionController
        initialPose={pose}
        initialCoordinate={initialCoordinate}
        handleRef={locomotionRef}
        onCommit={(c) => {
          rebaseRef.current?.(c);
          edgeVeilRef.current?.(c);
        }}
      />
      {audioBus && <ListenerPoseDriver bus={audioBus} />}
      {debug && <DebugStats />}
      <EdgeVeil applyRef={edgeVeilRef} initialCoordinate={initialCoordinate} />
      <RoomStream rebaseRef={rebaseRef} initialCoordinate={initialCoordinate} />
    </Canvas>
  );
}
