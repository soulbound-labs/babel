/**
 * Touch HUD (mobile spec §3.1, §4.3) — DOM overlay, never scene geometry:
 * canvas SIBLINGS, zero draw calls, CSS transforms only. Hit-exclusion is
 * structural: joystick/✕ touches land on these elements and can never reach
 * the canvas-attached world handlers; conversely the look-drag capture
 * attaches to the canvas element itself (the world touch surface — a
 * viewport-covering DOM region would swallow the tap-pick of §3.3), so HUD
 * and world stay disjoint with no stopPropagation discipline.
 *
 * Mounts only when touch-primary; desktop renders nothing. All writes go to
 * the shared `TouchInputState` ref the controller drains each frame. On
 * `visibilitychange → hidden` every field zeroes and pointer tracking resets
 * — iOS may never fire pointerup when backgrounding mid-touch (§3.2).
 */
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { isTouchPrimary } from '../../input/capabilities';
import { joystickVector } from '../player/touch-input';
import type { TouchInputState } from '../player/touch-input';

export type TouchControlsProps = {
  touchInput: RefObject<TouchInputState | null>;
  readingOpen: boolean;
  onCloseReading: () => void;
};

/** Warm vellum monochrome, recessive at rest — the world's tone, not a game skin. */
const HUD_INK = 'rgba(138, 133, 120, 0.5)';
const JOYSTICK_SIZE = 128;
const THUMB_SIZE = 44;

export function TouchControls({ touchInput, readingOpen, onCloseReading }: TouchControlsProps) {
  const [touchPrimary] = useState(() => isTouchPrimary());
  const baseRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const joyPointer = useRef<number | null>(null);
  const joyCenter = useRef({ x: 0, y: 0 });
  const joyRadius = useRef(1);
  const lookPointer = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const readingOpenRef = useRef(readingOpen);

  const resetThumb = () => {
    if (thumbRef.current) thumbRef.current.style.transform = 'translate(0px, 0px)';
  };

  const zeroMovement = () => {
    const s = touchInput.current;
    if (s) {
      s.analog.f = 0;
      s.analog.r = 0;
    }
    joyPointer.current = null;
    resetThumb();
  };

  // Reading mode: the joystick unmounts and look capture is suppressed —
  // release any in-flight pointers so nothing keeps writing movement.
  useEffect(() => {
    readingOpenRef.current = readingOpen;
    if (readingOpen) {
      zeroMovement();
      lookPointer.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingOpen]);

  // Look-drag capture on the canvas element (the world touch surface).
  useEffect(() => {
    if (!touchPrimary) return;
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const onDown = (e: PointerEvent) => {
      if (document.pointerLockElement !== null) return; // touch gate (M-2)
      if (readingOpenRef.current) return; // reading swipes belong to BookReader (§3.3)
      if (lookPointer.current !== null) return;
      lookPointer.current = e.pointerId;
      lookLast.current = { x: e.clientX, y: e.clientY };
      const s = touchInput.current;
      if (s) s.active = true;
    };
    const onMove = (e: PointerEvent) => {
      if (lookPointer.current === null || e.pointerId !== lookPointer.current) return;
      if (readingOpenRef.current) return;
      const s = touchInput.current;
      if (s) {
        s.lookDX += e.clientX - lookLast.current.x;
        s.lookDY += e.clientY - lookLast.current.y;
      }
      lookLast.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === lookPointer.current) lookPointer.current = null;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [touchPrimary, touchInput]);

  // Backgrounding zeroes everything — mirrors the desktop lock-loss zeroing.
  useEffect(() => {
    if (!touchPrimary) return;
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return;
      const s = touchInput.current;
      if (s) {
        s.analog.f = 0;
        s.analog.r = 0;
        s.lookDX = 0;
        s.lookDY = 0;
        s.active = false;
      }
      joyPointer.current = null;
      lookPointer.current = null;
      resetThumb();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [touchPrimary, touchInput]);

  if (!touchPrimary) return null;

  const writeJoystick = (clientX: number, clientY: number) => {
    const s = touchInput.current;
    if (!s) return;
    const v = joystickVector(joyCenter.current, { x: clientX, y: clientY }, joyRadius.current);
    s.analog.f = v.f;
    s.analog.r = v.r;
    // Thumb visual: raw offset clamped to the ring — CSS transform only.
    const dx = clientX - joyCenter.current.x;
    const dy = clientY - joyCenter.current.y;
    const mag = Math.hypot(dx, dy);
    const clamp = mag > joyRadius.current ? joyRadius.current / mag : 1;
    if (thumbRef.current) {
      thumbRef.current.style.transform = `translate(${dx * clamp}px, ${dy * clamp}px)`;
    }
  };

  return (
    <>
      {!readingOpen && (
        <div
          ref={baseRef}
          data-touch-joystick
          onPointerDown={(e) => {
            const base = baseRef.current;
            if (!base || joyPointer.current !== null) return;
            joyPointer.current = e.pointerId;
            const rect = base.getBoundingClientRect();
            joyCenter.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            joyRadius.current = Math.max(rect.width / 2, 1);
            try {
              base.setPointerCapture(e.pointerId);
            } catch {
              /* jsdom / older WebKit: capture is an optimization, not a requirement */
            }
            const s = touchInput.current;
            if (s) s.active = true;
            writeJoystick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.pointerId !== joyPointer.current) return;
            writeJoystick(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (e.pointerId === joyPointer.current) zeroMovement();
          }}
          onPointerCancel={(e) => {
            if (e.pointerId === joyPointer.current) zeroMovement();
          }}
          style={{
            position: 'fixed',
            left: 24,
            bottom: 24,
            width: JOYSTICK_SIZE,
            height: JOYSTICK_SIZE,
            borderRadius: '50%',
            border: `1px solid ${HUD_INK}`,
            background: 'rgba(10, 9, 8, 0.25)',
            zIndex: 500,
            touchAction: 'none',
            userSelect: 'none',
            opacity: 0.5,
          }}
        >
          <div
            ref={thumbRef}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              marginLeft: -THUMB_SIZE / 2,
              marginTop: -THUMB_SIZE / 2,
              borderRadius: '50%',
              background: HUD_INK,
              willChange: 'transform',
            }}
          />
        </div>
      )}
      {readingOpen && (
        <button
          type="button"
          data-touch-close-reading
          aria-label="close book"
          onClick={onCloseReading}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: `1px solid ${HUD_INK}`,
            background: 'rgba(3, 3, 4, 0.35)',
            color: '#8a8578',
            fontSize: '1.1rem',
            fontFamily: 'Georgia, serif',
            lineHeight: 1,
            zIndex: 500,
            touchAction: 'none',
            userSelect: 'none',
            opacity: 0.55,
          }}
        >
          ✕
        </button>
      )}
    </>
  );
}
