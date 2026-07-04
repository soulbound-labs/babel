/**
 * The entry gesture (§4.7): a near-black curtain — "BABEL", a faint "click to
 * enter". One click satisfies both browser policies: it requests pointer lock
 * AND runs `onEnter` (the audio-context resume, Phase 5), then the curtain
 * fades out over ~1.5 s.
 *
 * Pointer-lock loss (`Esc`, alt-tab — E1) is the app's pause signal, but it
 * doubles as the book-close signal: `Esc` is the browser's own lock exit and
 * its keydown isn't reliably delivered while locked, so we act on the LOSS.
 * While a book is open (`readingRef`) a loss shelves the book (`closeBookRef`)
 * and RE-ACQUIRES the lock in the same gesture — putting a book down drops you
 * straight back into navigation, no splash and no click. While NOT reading, a
 * loss brings back the minimal "Click to Continue" pause splash. WebGL context
 * loss (E3) also brings the curtain back. Nothing here crashes the scene.
 */
import { useCallback, useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';

export type EntryOverlayProps = {
  /** Runs on the entry click — the same gesture that requests pointer lock (E2). */
  onEnter?: () => Promise<void>;
  /** True while a book is open — a lock-loss then shelves the book instead of pausing. */
  readingRef?: MutableRefObject<boolean>;
  /** The reader's close handle — invoked to return the book to the shelf on lock-loss. */
  closeBookRef?: MutableRefObject<(() => void) | null>;
};

type Phase = 'initial' | 'fading' | 'hidden' | 'returned';

function requestPointerLockSafely(): void {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  try {
    // Some browsers return a promise; a denial must never crash (E1).
    const result = canvas.requestPointerLock() as unknown;
    if (result instanceof Promise) result.catch(() => {});
  } catch {
    /* pointer lock denied — the overlay simply stays up */
  }
}

export function EntryOverlay({ onEnter, readingRef, closeBookRef }: EntryOverlayProps) {
  const [phase, setPhase] = useState<Phase>('initial');

  const enter = useCallback(() => {
    requestPointerLockSafely();
    void onEnter?.().catch(() => {
      /* audio stays suspended; retried on the next gesture (E2) */
    });
    setPhase('fading');
  }, [onEnter]);

  // Lock loss (E1) and WebGL context loss/restore (E3) bring back the curtain —
  // unless a book is open, in which case the loss just shelves the book.
  useEffect(() => {
    const onLockChange = () => {
      if (document.pointerLockElement !== null) return;
      // Reading + Esc: shelve the book and re-acquire the lock Esc just released
      // in the SAME gesture — putting a book down returns you straight to
      // navigation, no pause splash and no click needed.
      if (readingRef?.current) {
        closeBookRef?.current?.();
        requestPointerLockSafely();
        return;
      }
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
  }, [readingRef, closeBookRef]);

  useEffect(() => {
    if (phase !== 'fading') return;
    const t = setTimeout(() => setPhase('hidden'), 1600);
    return () => clearTimeout(t);
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
        {phase === 'returned' ? 'Click to Continue' : 'click to enter'}
      </div>
    </div>
  );
}
