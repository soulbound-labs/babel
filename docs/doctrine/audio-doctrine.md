# Audio Doctrine — the N-emitter bus, procedural ambient & lifecycle (DOCTRINE)

> **Preload when** you touch `src/presentation/audio/**`, add any sound to the piece,
> or debug silence. Siblings: the scene that drives the listener pose is
> [`render-doctrine.md`](./render-doctrine.md); browser-policy entry gating lives with
> the entry overlay (`src/app/EntryOverlay.tsx`).

## 1. High-level summary

All sound flows through **one handle-based `AudioBus`** (`src/presentation/audio/audio-bus.ts`),
sized for N emitters from day one. Consumers never touch Web Audio routing: they call
`bus.createEmitter(spec)` and connect their source graph to `emitter.input`. The bus
owns spatialization and the master gain. Footsteps (Unit 04), page rustle (Unit 05),
and remote players (Unit 07) are _just more emitters on this same bus_ — that is the
frozen contract.

```
source graph → emitter gain (→ panner, positional only) → master gain → destination
```

- `EmitterSpec`: `{ kind: 'ambient' }` (straight to master) or
  `{ kind: 'positional', position, refDistance?, rolloff? }`
  (`equalpower` panning, `inverse` distance model).
- `setListenerPose` is driven from the camera **every frame** by `WorldScene`.
- `dispose()` is idempotent at both emitter and bus level; **bus disposal closes the
  `AudioContext`** — a disposed bus is dead, not dormant (see §4).

## 2. The frozen API and the narrow `BusContext`

The `AudioBus` / `AudioEmitter` interfaces are frozen (spec §4.6). The constructor
takes a **narrow `BusContext`** — only the factory surface the bus actually uses
(`createGain`, `createPanner`, `destination`, `listener`, `resume`, `close?`). A real
`AudioContext` satisfies it structurally; unit tests inject a hand-rolled fake and
assert graph wiring + disposal without a browser
(`tests/unit/presentation/audio/audio-bus.spec.ts`, INV-R7). Panner/listener setters
have param-based (`positionX.value`) and legacy (`setPosition(...)`) paths because
engines differ (Firefox) — keep both fallbacks.

## 3. Procedural ambient — the bus carries real signal, zero asset files

`src/presentation/audio/ambient.ts` builds everything in code (asset files are
Unit 06's business):

- **The hush** — looped seeded brown-ish noise (xorshift32, seed `0xbabe1` — never
  `Math.random`, C4) → lowpass ≈ 220 Hz → slow gain LFO, on an `ambient` emitter.
  Gain is deliberately near-threshold: _felt, not heard_.
- **Bulb hums** — 120 Hz sine + faint 240 Hz harmonic on a `positional` emitter at
  **each entry of `BULB_POSITIONS`** (`render/room/Bulbs.tsx`). This coupling is
  intentional: add a bulb to the scene and it hums automatically; light and its sound
  never desynchronize. It also means the positional path is genuinely exercised, not
  shipped untested until a later unit needs it under gate pressure.

## 4. Lifecycle & browser policy (where the silence bugs live)

**Autoplay policy:** an `AudioContext` starts suspended until a user gesture. The
entry overlay's single click requests pointer lock **and** `bus.resume()` — one
gesture satisfies both browser policies (spec E2). If `resume()` fails, retry on the
next gesture; the scene never blocks on audio.

Symptom → cause → fix:

- **Total silence in `pnpm dev`, works in prod build** → React `StrictMode`
  double-mounts effects in dev; an app-lifetime `AudioContext`/bus created in a
  `useState` initializer survived the remount, but the first effect cleanup had
  already called `bus.dispose()` — which **closes the context**. The second mount then
  built its graph on a dead bus, and the entry click's `resume()` rejected
  (`InvalidStateError`). **Fix (shipped in `src/app/App.tsx`):** create the _whole_
  stack (ctx + bus + ambient) inside one `useEffect` and dispose it in that effect's
  cleanup — each mount gets a live context. Never split creation (state) from disposal
  (effect) for Web Audio.
- **Silence after `Esc` / re-entry** → nothing to fix: the context stays resumed;
  only pointer lock is re-requested. If audio _does_ stop, check nothing called
  `bus.dispose()` on overlay transitions.
- **A positional emitter doesn't attenuate/pan** → listener pose isn't being driven
  (camera hookup in `WorldScene`), or the emitter was created `ambient`. `setPosition`
  is a no-op on ambient emitters by contract.
- **Sounds too quiet to verify** → intended mix: `HUSH_GAIN`/`HUM_GAIN` in
  `ambient.ts` sit near the threshold of hearing. Tune there, not at the master gain
  (the master is the future user volume control).

## 5. Pointers

- `docs/tasks/ongoing/03-world-render/03-world-render-spec.md` §4.6/§7.5 — the frozen
  bus API and the procedural-ambient decision record.
- [`render-doctrine.md`](./render-doctrine.md) — `BULB_POSITIONS` freeze, deterministic
  presentation (C4), and the entry-gesture seam shared with pointer lock.
