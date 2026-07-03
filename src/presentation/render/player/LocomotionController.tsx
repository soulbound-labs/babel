/**
 * First-person locomotion (§4.7): pointer-lock mouselook (yaw unbounded,
 * pitch clamped), WASD walking resolved through the analytic colliders. The
 * controller owns the SINGLE camera and exposes the frozen `LocomotionHandle`
 * seam — Unit 05 reads in place through suspend()/resume(), Unit 04 extends
 * movement underneath it. One camera, one owner (§7.2).
 *
 * Input only flows while pointer-locked (E1); lock loss freezes movement and
 * the entry overlay takes over. No input handler ever throws on denial.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useContext, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { Ref } from 'react';

import type { PlayerState } from '../../../domain/ports';
import { PresenceContext } from '../../presence-context';
import type { CameraPose } from '../debug/poses';
import { clampPitch, createLocomotionState, stepLocomotion } from './locomotion';
import type { LocomotionInput, LocomotionState } from './locomotion';
import { createPresencePublisher } from './presence-publisher';

/** Frozen camera seam (§4.7) — consumed by Units 04 and 05. */
export interface LocomotionHandle {
  /** Stops input→movement; camera control yielded to the caller (Unit 05 reading). */
  suspend(): void;
  /** Restores walking from wherever the camera was returned. */
  resume(): void;
  /** Current pose (coordinate = ORIGIN this unit). */
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
  handleRef?: Ref<LocomotionHandle>;
};

export function LocomotionController({ initialPose, handleRef }: LocomotionControllerProps) {
  const camera = useThree((s) => s.camera);
  const presencePort = useContext(PresenceContext);
  const publishPresence = useMemo(() => createPresencePublisher(presencePort), [presencePort]);
  const stateRef = useRef<LocomotionState>(createLocomotionState(initialPose));
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
    stateRef.current = stepLocomotion(state, inputRef.current, delta);
    const { localPosition, yaw, pitch } = stateRef.current.player;
    camera.position.set(localPosition.x, localPosition.y, localPosition.z);
    camera.rotation.set(pitch, yaw, 0);
    // ≤ 10 Hz, pose-change-only (INV-R6) — a no-op port today, the Unit 07 seam.
    publishPresence(stateRef.current.player, frame.clock.elapsedTime);
  });

  return null;
}
