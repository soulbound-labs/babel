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
import { WorldScene } from '../presentation/render/WorldScene';
import { EntryOverlay } from './EntryOverlay';

const presencePort = new LocalPresencePort();

type AudioStack = { ctx: AudioContext; bus: AudioBus } | null;

export function App() {
  // jsdom/CI has no Web Audio (E5); the scene never blocks on audio (E2).
  const [audio] = useState<AudioStack>(() => {
    if (typeof AudioContext === 'undefined') return null;
    const ctx = new AudioContext();
    return { ctx, bus: createAudioBus(ctx) };
  });

  useEffect(() => {
    if (!audio) return;
    const ambient = startAmbient(audio.bus, audio.ctx);
    return () => {
      ambient.dispose();
      audio.bus.dispose();
    };
  }, [audio]);

  return (
    <PresenceContext.Provider value={presencePort}>
      <WorldScene audioBus={audio?.bus} />
      <EntryOverlay onEnter={() => audio?.bus.resume() ?? Promise.resolve()} />
    </PresenceContext.Provider>
  );
}
