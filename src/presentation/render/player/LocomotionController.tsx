/**
 * First-person locomotion (§4.7, Unit 04 §4.2.1): pointer-lock mouselook (yaw
 * unbounded, pitch clamped), WASD walking resolved through the analytic
 * colliders, and — Unit 04 — the traversal machine underneath: the controller
 * holds `TraversalState`, detects commit-plane crossings (`origin.ts`), gates
 * them through `canMove`, and on an ACCEPTED commit shifts the local position
 * by the exact negation of the world shift and re-bases the streamed world
 * SYNCHRONOUSLY in the same frame (screen-space no-op). Unit 03's
 * `coordinate: ORIGIN` pin is retired — `PlayerState.coordinate` now reflects
 * the traversal coordinate. Only this pipeline ever calls `crossThreshold`;
 * nothing here constructs a Coordinate by hand (T-1).
 *
 * The controller owns the SINGLE camera and exposes the frozen
 * `LocomotionHandle` seam — shape unchanged (suspend/resume/state).
 * Input only flows while pointer-locked (E1); lock loss freezes movement.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useContext, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { Ref } from 'react';

import { ORIGIN } from '../../../domain/entities';
import type { Coordinate } from '../../../domain/entities';
import type { PlayerState } from '../../../domain/ports';
import { canMove } from '../../traversal/bounds';
import { createTraversal, crossThreshold } from '../../traversal/traversal';
import type { TraversalState } from '../../traversal/traversal';
import { PresenceContext } from '../../presence-context';
import type { CameraPose } from '../debug/poses';
import { commitShift, detectCommit, INITIAL_TRACKER } from '../world/origin';
import type { OriginTracker } from '../world/origin';
import { liveCollisionSpecs } from '../world/streaming';
import { createCollisionContext } from './collision';
import { EYE_HEIGHT } from '../room/dimensions';
import { clampPitch, createLocomotionState, stepLocomotion } from './locomotion';
import type { LocomotionInput, LocomotionState } from './locomotion';
import { createPresencePublisher } from './presence-publisher';

/** Frozen camera seam (§4.7) — consumed by Units 04 and 05. */
export interface LocomotionHandle {
  /** Stops input→movement; camera control yielded to the caller (Unit 05 reading). */
  suspend(): void;
  /** Restores walking from wherever the camera was returned. */
  resume(): void;
  /** Current pose — coordinate is the live traversal coordinate. */
  readonly state: PlayerState;
}

const MOUSE_SENSITIVITY = 0.0022; // rad per px

const KEY_MAP: Record<string, keyof Pick<LocomotionInput, 'forward' | 'back' | 'left' | 'right'>> =
  {
    KeyW: 'forward',
    KeyS: 'back',
    KeyA: 'left',
    KeyD: 'right',
  };

export type LocomotionControllerProps = {
  initialPose: CameraPose;
  /** Logical coordinate the pose starts at (§4.4 teleport); defaults to ORIGIN. */
  initialCoordinate?: Coordinate;
  handleRef?: Ref<LocomotionHandle>;
  /** Called synchronously inside the frame on an accepted commit (§4.2.1 step 3). */
  onCommit?: (coordinate: Coordinate) => void;
};

export function LocomotionController({
  initialPose,
  initialCoordinate = ORIGIN,
  handleRef,
  onCommit,
}: LocomotionControllerProps) {
  const camera = useThree((s) => s.camera);
  const presencePort = useContext(PresenceContext);
  const publishPresence = useMemo(() => createPresencePublisher(presencePort), [presencePort]);
  const stateRef = useRef<LocomotionState>(createLocomotionState(initialPose, initialCoordinate));
  const traversalRef = useRef<TraversalState>(createTraversal(initialCoordinate));
  const trackerRef = useRef<OriginTracker>(INITIAL_TRACKER);
  const collisionRef = useRef(
    createCollisionContext(liveCollisionSpecs(traversalRef.current.coordinate)),
  );
  const inputRef = useRef<LocomotionInput>({
    forward: false,
    back: false,
    left: false,
    right: false,
    yaw: initialPose.yaw,
    pitch: clampPitch(initialPose.pitch),
  });
  const lockedRef = useRef(false);

  useEffect(() => {
    camera.rotation.order = 'YXZ'; // yaw about +y, then pitch (§4.2 convention)
  }, [camera]);

  useEffect(() => {
    const onLockChange = () => {
      lockedRef.current = document.pointerLockElement !== null;
      if (!lockedRef.current) {
        // No input while unlocked (E1); keys may be released unseen.
        const input = inputRef.current;
        input.forward = input.back = input.left = input.right = false;
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!lockedRef.current) return;
      const input = inputRef.current;
      input.yaw -= e.movementX * MOUSE_SENSITIVITY;
      input.pitch = clampPitch(input.pitch - e.movementY * MOUSE_SENSITIVITY);
    };
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code];
      if (!action || !lockedRef.current) return;
      inputRef.current[action] = down;
    };
    const onKeyDown = onKey(true);
    const onKeyUp = onKey(false);

    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useImperativeHandle(
    handleRef,
    (): LocomotionHandle => ({
      suspend() {
        stateRef.current = { ...stateRef.current, suspended: true };
      },
      resume() {
        // Pick walking back up from wherever the caller returned the camera.
        const yaw = camera.rotation.y;
        const pitch = clampPitch(camera.rotation.x);
        stateRef.current = {
          player: {
            coordinate: stateRef.current.player.coordinate,
            localPosition: {
              x: camera.position.x,
              y: stateRef.current.player.localPosition.y,
              z: camera.position.z,
            },
            yaw,
            pitch,
          },
          velocity: { x: 0, z: 0 },
          surface: stateRef.current.surface,
          suspended: false,
        };
        inputRef.current.yaw = yaw;
        inputRef.current.pitch = pitch;
      },
      get state() {
        return stateRef.current.player;
      },
    }),
    [camera],
  );

  useFrame((frame, delta) => {
    const state = stateRef.current;
    if (state.suspended) return; // camera belongs to the suspender

    const prev = state.player.localPosition;
    stateRef.current = stepLocomotion(state, inputRef.current, delta, collisionRef.current);
    const next = stateRef.current.player.localPosition;

    // Commit detection in feet space (§4.2.1); the ±64 gate runs BEFORE apply (T-5).
    const step = detectCommit(
      trackerRef.current,
      { x: prev.x, y: prev.y - EYE_HEIGHT, z: prev.z },
      { x: next.x, y: next.y - EYE_HEIGHT, z: next.z },
      (m) => canMove(traversalRef.current.coordinate, m),
    );
    trackerRef.current = step.tracker;

    if (step.commit !== null) {
      traversalRef.current = crossThreshold(traversalRef.current, step.commit);
      const coordinate = traversalRef.current.coordinate;
      const shift = commitShift(step.commit);
      stateRef.current = {
        ...stateRef.current,
        player: {
          ...stateRef.current.player,
          coordinate,
          localPosition: { x: next.x + shift.x, y: next.y + shift.y, z: next.z + shift.z },
        },
      };
      collisionRef.current = createCollisionContext(liveCollisionSpecs(coordinate));
      // Same frame: matrices, lights, emitters, listener follow before render (§4.2.1 step 3).
      onCommit?.(coordinate);
    }

    const { localPosition, yaw, pitch } = stateRef.current.player;
    camera.position.set(localPosition.x, localPosition.y, localPosition.z);
    camera.rotation.set(pitch, yaw, 0);
    // ≤ 10 Hz, pose-change-only (INV-R6) — a no-op port today, the Unit 07 seam.
    publishPresence(stateRef.current.player, frame.clock.elapsedTime);
  });

  return null;
}
