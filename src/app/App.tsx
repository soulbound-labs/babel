/**
 * App shell (§4.9): the app layer instantiates the presence adapter and
 * injects it through `PresenceContext` — presentation never imports
 * adapters (C2). Unit 07 swaps `LocalPresencePort` for the Convex one here,
 * one line. The audio bus is created here too; the entry click resumes it
 * (one gesture satisfies pointer lock AND audio policy — §4.7, E2).
 */
import { useEffect, useState } from 'react';

import { LocalPresencePort } from '../adapters/presence/local-presence-port';
import { PresenceContext } from '../presentation/presence-context';
import { startAmbient } from '../presentation/audio/ambient';
import { createAudioBus } from '../presentation/audio/audio-bus';
import type { AudioBus } from '../presentation/audio/audio-bus';
import { createFootsteps } from '../presentation/audio/footsteps';
import type { FootstepsHandle } from '../presentation/audio/footsteps';
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

  useEffect(() => {
    if (typeof AudioContext === 'undefined') return;
    const ctx = new AudioContext();
    const bus = createAudioBus(ctx);
    const ambient = startAmbient(bus, ctx);
    const footsteps = createFootsteps(bus, ctx);
    setAudio({ ctx, bus, footsteps });
    return () => {
      footsteps.dispose();
      ambient.dispose();
      bus.dispose();
      setAudio(null);
    };
  }, []);

  return (
    <PresenceContext.Provider value={presencePort}>
      <WorldScene audioBus={audio?.bus} audioCtx={audio?.ctx} footsteps={audio?.footsteps} />
      <EntryOverlay onEnter={() => audio?.bus.resume() ?? Promise.resolve()} />
    </PresenceContext.Provider>
  );
}
