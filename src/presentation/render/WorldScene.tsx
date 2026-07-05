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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Ref, RefObject } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';

import { ORIGIN } from '../../domain/entities';
import type { Coordinate } from '../../domain/entities';
import type { AudioBus } from '../audio/audio-bus';
import type { FootstepsHandle } from '../audio/footsteps';
import { isTouchPrimary } from '../input/capabilities';
import { DebugStats } from './debug/DebugStats';
import { parseDebugParam, parsePoseParam, SPAWN_POSE } from './debug/poses';
import { TouchControls } from './hud/TouchControls';
import { LocomotionController } from './player/LocomotionController';
import type { LocomotionHandle } from './player/LocomotionController';
import { resolveFov } from './player/fov';
import { createTouchInputState } from './player/touch-input';
import type { TouchInputState } from './player/touch-input';
import { BookReader } from './reading/BookReader';
import { EdgeVeil } from './world/EdgeVeil';
import { RoomStream } from './world/RoomStream';

/** Forward a value into a caller-supplied ref of either shape. */
function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (!ref) return;
  if (typeof ref === 'function') ref(value as T);
  else (ref as RefObject<T | null>).current = value;
}

/**
 * Portrait FOV (mobile spec §3.1): on resize only, write `resolveFov(aspect)`
 * to the ONE existing camera. On aspect ≥ 1 this writes exactly 62 — a no-op
 * by the identity clause, so desktop projection stays bit-identical.
 */
function PortraitFovDriver() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const fov = resolveFov(size.width / size.height);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, size]);
  return null;
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
  /** The app-lifetime audio context (§4.3) — RoomStream builds per-room hum graphs on it. */
  audioCtx?: BaseAudioContext;
  /** Footsteps (§4.3) — the controller fires `step(surface)` on the stride cadence. */
  footsteps?: FootstepsHandle;
  /** Reading open/close transitions (mobile spec §3.4) — App gates its visibility pause on this. */
  onReadingChange?: (open: boolean) => void;
};

export function WorldScene({
  locomotionRef,
  audioBus,
  audioCtx,
  footsteps,
  onReadingChange,
}: WorldSceneProps = {}) {
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
  // The ONE LocomotionHandle (§4.7), teed: the reader consumes it in-scene
  // (Unit 05 reads in place under it) and any outer caller still receives it.
  const readerHandleRef = useRef<LocomotionHandle | null>(null);
  const teeLocomotionRef = useCallback(
    (handle: LocomotionHandle | null) => {
      readerHandleRef.current = handle;
      assignRef(locomotionRef, handle);
    },
    [locomotionRef],
  );
  // Touch scheme (mobile spec §3.1): the shared input ref the HUD writes and
  // the controller drains; null on desktop — the boolean path stays pristine.
  const touchInputRef = useRef<TouchInputState | null>(null);
  if (touchInputRef.current === null && isTouchPrimary()) {
    touchInputRef.current = createTouchInputState();
  }
  // Reading-mode seam to the DOM HUD (mobile spec §3.3): BookReader populates
  // the close ref while open and signals open/close transitions.
  const readerCloseRef = useRef<(() => void) | null>(null);
  const [readingOpen, setReadingOpen] = useState(false);

  return (
    <>
      <Canvas
        style={{ position: 'fixed', inset: 0, background: '#050507', touchAction: 'none' }}
        dpr={[1, 1.5]}
        camera={{ fov: 62, near: 0.05, far: 60 }}
      >
        <LocomotionController
          initialPose={pose}
          initialCoordinate={initialCoordinate}
          handleRef={teeLocomotionRef}
          footsteps={footsteps}
          touchInput={touchInputRef}
          onCommit={(c) => {
            rebaseRef.current?.(c);
            edgeVeilRef.current?.(c);
          }}
        />
        <PortraitFovDriver />
        {audioBus && <ListenerPoseDriver bus={audioBus} />}
        {debug && <DebugStats />}
        <EdgeVeil applyRef={edgeVeilRef} initialCoordinate={initialCoordinate} />
        <RoomStream
          rebaseRef={rebaseRef}
          initialCoordinate={initialCoordinate}
          audioBus={audioBus}
          audioCtx={audioCtx}
        />
        <BookReader
          handleRef={readerHandleRef}
          closeRef={readerCloseRef}
          onReadingChange={(open) => {
            setReadingOpen(open);
            onReadingChange?.(open);
          }}
          audioBus={audioBus}
          audioCtx={audioCtx}
          pinned={pose.book}
        />
      </Canvas>
      <TouchControls
        touchInput={touchInputRef}
        readingOpen={readingOpen}
        onCloseReading={() => readerCloseRef.current?.()}
      />
    </>
  );
}
