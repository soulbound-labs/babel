/**
 * App shell (§4.9): the app layer instantiates the presence adapter and
 * injects it through `PresenceContext` — presentation never imports
 * adapters (C2). Unit 07 swaps `LocalPresencePort` for the Convex one here,
 * one line. The audio bus is created here too; the entry click resumes it
 * (one gesture satisfies pointer lock AND audio policy — §4.7, E2).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { LocalPresencePort } from '../adapters/presence/local-presence-port';
import { PresenceContext } from '../presentation/presence-context';
import { startAmbient } from '../presentation/audio/ambient';
import { createAudioBus } from '../presentation/audio/audio-bus';
import type { AudioBus } from '../presentation/audio/audio-bus';
import { createFootsteps } from '../presentation/audio/footsteps';
import type { FootstepsHandle } from '../presentation/audio/footsteps';
import { attachVisibilityPause } from '../presentation/audio/visibility-pause';
import { isTouchPrimary } from '../presentation/input/capabilities';
import type { LocomotionHandle } from '../presentation/render/player/LocomotionController';
import { WorldScene } from '../presentation/render/WorldScene';
import { EntryOverlay } from './EntryOverlay';

const presencePort = new LocalPresencePort();

type AudioStack = { ctx: AudioContext; bus: AudioBus; footsteps: FootstepsHandle } | null;

export function App() {
  // jsdom/CI has no Web Audio (E5); the scene never blocks on audio (E2).
  // The whole stack lives inside the effect: StrictMode's dev double-mount
  // disposes the first stack (closing its AudioContext) and builds a fresh
  // one, so the surviving bus is always live.
  const [audio, setAudio] = useState<AudioStack>(null);
  const locomotionRef = useRef<LocomotionHandle | null>(null);
  const readingOpenRef = useRef(false);
  // Visibility resumes ONLY what visibility suspended (mobile spec §4.3): the
  // reader owns its own suspend/resume pairing — a re-entry tap must never
  // resume locomotion under an open book (INV-B6).
  const suspendedByVisibility = useRef(false);

  useEffect(() => {
    if (typeof AudioContext === 'undefined') return;
    const ctx = new AudioContext();
    const bus = createAudioBus(ctx);
    const ambient = startAmbient(bus, ctx);
    const footsteps = createFootsteps(bus, ctx);
    // Suspend-on-hide (mobile spec §3.4): attached in the SAME effect that
    // owns the context, so the listener's lifetime equals the context's.
    const detachPause = attachVisibilityPause(document, ctx);
    setAudio({ ctx, bus, footsteps });
    return () => {
      detachPause();
      footsteps.dispose();
      ambient.dispose();
      bus.dispose();
      setAudio(null);
    };
  }, []);

  // Visibility-driven locomotion pause (touch-primary only): touch has no
  // pointer-lock loss to freeze movement, so backgrounding is the pause
  // signal. Suspend only while the reader is closed — reader open means
  // locomotion is ALREADY suspended and the reader owns the resume().
  useEffect(() => {
    if (!isTouchPrimary()) return;
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return;
      if (readingOpenRef.current || suspendedByVisibility.current) return;
      locomotionRef.current?.suspend();
      suspendedByVisibility.current = true;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const handleEnter = useCallback(() => {
    if (suspendedByVisibility.current) {
      suspendedByVisibility.current = false;
      locomotionRef.current?.resume();
    }
    return audio?.bus.resume() ?? Promise.resolve();
  }, [audio]);

  return (
    <PresenceContext.Provider value={presencePort}>
      <WorldScene
        locomotionRef={locomotionRef}
        onReadingChange={(open) => {
          readingOpenRef.current = open;
        }}
        audioBus={audio?.bus}
        audioCtx={audio?.ctx}
        footsteps={audio?.footsteps}
      />
      <EntryOverlay onEnter={handleEnter} />
    </PresenceContext.Provider>
  );
}
