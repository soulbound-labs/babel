/**
 * The entry gesture (§4.7): a near-black curtain — "BABEL", a faint "click to
 * enter". One click satisfies both browser policies: it requests pointer lock
 * AND runs `onEnter` (the audio-context resume, Phase 5), then the curtain
 * fades out over ~1.5 s.
 *
 * Pointer-lock loss (`Esc`, alt-tab — E1) is the app's pause signal — reading
 * or walking, it brings back the minimal "Click to Continue" splash (an open
 * book simply stays open underneath and reading resumes on re-entry; Q is the
 * reader's close key, which never touches the lock). WebGL context loss (E3)
 * also brings the curtain back. Nothing here crashes the scene.
 *
 * Re-locking is CONFIRMED, never assumed: a Continue click that lands inside
 * Chrome's ~1.25 s post-Esc cooldown is rejected, so the click starts an
 * acquire-with-retry loop instead of blindly fading the curtain — the click's
 * transient user activation lasts ~5 s, long enough for a retry to fire after
 * the cooldown and be granted with no further gesture. The splash stays up
 * ("one moment…") until the pointerlockchange ACQUIRE dismisses it. The slow
 * fade remains an entry-only mood beat; resuming is instant.
 */
import { useCallback, useEffect, useState } from 'react';

export type EntryOverlayProps = {
  /** Runs on the entry click — the same gesture that requests pointer lock (E2). */
  onEnter?: () => Promise<void>;
};

type Phase = 'initial' | 'fading' | 'hidden' | 'returned';

/** Retry cadence for the acquire loop: 12 × 250 ms ≈ 3 s — comfortably past
 * the post-Esc cooldown, comfortably inside the click's transient activation. */
const RELOCK_INTERVAL_MS = 250;
const RELOCK_MAX_ATTEMPTS = 12;

function requestPointerLockSafely(): void {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  try {
    // Some browsers return a promise; a denial must never crash (E1).
    const result = canvas.requestPointerLock() as unknown;
    if (result instanceof Promise) result.catch(() => {});
  } catch {
    /* pointer lock denied — the retry loop or the next click tries again */
  }
}

export function EntryOverlay({ onEnter }: EntryOverlayProps) {
  const [phase, setPhase] = useState<Phase>('initial');
  // True while the acquire-with-retry loop runs (set by a click, cleared by
  // lock ACQUIRE, lock loss, or attempt exhaustion).
  const [relocking, setRelocking] = useState(false);

  const enter = useCallback(() => {
    setRelocking(true); // the acquire loop below carries the actual request
    void onEnter?.().catch(() => {
      /* audio stays suspended; retried on the next gesture (E2) */
    });
    // Entry only: the mood fade starts on the gesture. The pause splash does
    // NOT fade here — it dismisses on the confirmed ACQUIRE (see onLockChange).
    setPhase((p) => (p === 'initial' ? 'fading' : p));
  }, [onEnter]);

  // The acquire-with-retry loop: request now, and keep re-requesting on the
  // cadence until locked or out of attempts. Denials inside the post-Esc
  // cooldown are absorbed here — a later retry lands inside the same click's
  // transient activation and is granted.
  useEffect(() => {
    if (!relocking) return;
    let attempts = 0;
    let timer: number | undefined;
    const attempt = () => {
      if (document.pointerLockElement !== null) return; // acquired — done
      if (attempts >= RELOCK_MAX_ATTEMPTS) {
        setRelocking(false); // give up; the splash takes the next click
        return;
      }
      attempts += 1;
      requestPointerLockSafely();
      timer = window.setTimeout(attempt, RELOCK_INTERVAL_MS);
    };
    attempt();
    return () => window.clearTimeout(timer);
  }, [relocking]);

  // Lock transitions drive the curtain: an ACQUIRE dismisses the pause splash
  // (confirmed, instant — no blind fade); a loss (E1) brings it back and
  // cancels any retry loop (never fight an Esc). WebGL context loss (E3) also
  // brings the curtain back.
  useEffect(() => {
    const onLockChange = () => {
      if (document.pointerLockElement !== null) {
        setRelocking(false);
        setPhase((p) => (p === 'returned' ? 'hidden' : p));
        return;
      }
      setRelocking(false);
      setPhase((p) => (p === 'initial' ? p : 'returned'));
    };
    document.addEventListener('pointerlockchange', onLockChange);

    const canvas = document.querySelector('canvas');
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setPhase('returned');
    };
    canvas?.addEventListener('webglcontextlost', onContextLost);
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      canvas?.removeEventListener('webglcontextlost', onContextLost);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'fading') return;
    const t = setTimeout(() => setPhase('hidden'), 1600);
    return () => clearTimeout(t);
  }, [phase]);

  // Click-to-relock safety net: if the curtain is somehow hidden while the
  // pointer is free (e.g. the entry fade completed but the lock was denied),
  // any click kicks the same acquire loop. It cannot accidentally open a
  // book: the pick handler requires the lock to ALREADY be held at
  // pointerdown, and this lock lands asynchronously after the click.
  useEffect(() => {
    if (phase !== 'hidden') return;
    const onPointerDown = () => {
      if (document.pointerLockElement === null) setRelocking(true);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [phase]);

  if (phase === 'hidden') return null;

  const faded = phase === 'fading';
  return (
    <div
      onClick={enter}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.2rem',
        background: '#030304',
        color: '#8a8578',
        cursor: 'pointer',
        userSelect: 'none',
        opacity: faded ? 0 : 1,
        pointerEvents: faded ? 'none' : 'auto',
        transition: 'opacity 1.5s ease-out',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ fontSize: '2.2rem', letterSpacing: '0.9rem' }}>BABEL</div>
      <div style={{ fontSize: '0.8rem', letterSpacing: '0.2rem', opacity: 0.5 }}>
        {phase === 'returned'
          ? relocking
            ? 'one moment…'
            : 'Click to Continue'
          : 'click to enter'}
      </div>
    </div>
  );
}
