import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { createRef } from 'react';

import { TouchControls } from '@/presentation/render/hud/TouchControls';
import { createTouchInputState } from '@/presentation/render/player/touch-input';
import type { TouchInputState } from '@/presentation/render/player/touch-input';

/**
 * HUD structure pins (mobile spec §6): mounts iff touch-primary, joystick
 * touches never reach a sibling canvas-element listener (structural
 * hit-exclusion), ✕ exists only in reading mode and routes to the close
 * callback. Gesture MATH is node-tested in touch-input.spec.ts — jsdom here
 * only pins mounting + event topology.
 */
function stubCapability(coarse: boolean, maxTouchPoints: number) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: coarse && query === '(pointer: coarse)',
  }));
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    value: maxTouchPoints,
    configurable: true,
  });
}

const mounted: Array<{ container: HTMLElement; root: Root }> = [];

function mount(ui: ReactElement): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => root.render(ui));
  mounted.push({ container, root });
  return container;
}

afterEach(() => {
  for (const { container, root } of mounted.splice(0)) {
    flushSync(() => root.unmount());
    container.remove();
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function touchRef(): { current: TouchInputState } {
  const ref = createRef<TouchInputState>() as { current: TouchInputState };
  ref.current = createTouchInputState();
  return ref;
}

describe('TouchControls', () => {
  it('mounts the joystick iff touch-primary', () => {
    stubCapability(true, 5);
    const c1 = mount(
      <TouchControls touchInput={touchRef()} readingOpen={false} onCloseReading={() => {}} />,
    );
    expect(c1.querySelector('[data-touch-joystick]')).not.toBeNull();

    stubCapability(false, 0);
    const c2 = mount(
      <TouchControls touchInput={touchRef()} readingOpen={false} onCloseReading={() => {}} />,
    );
    expect(c2.querySelector('[data-touch-joystick]')).toBeNull();
    expect(c2.innerHTML).toBe('');
  });

  it('joystick pointerdown never reaches a sibling canvas-element listener', () => {
    stubCapability(true, 5);
    const canvasSpy = vi.fn();
    const container = mount(
      <>
        <canvas />
        <TouchControls touchInput={touchRef()} readingOpen={false} onCloseReading={() => {}} />
      </>,
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    canvas?.addEventListener('pointerdown', canvasSpy);

    const joystick = container.querySelector('[data-touch-joystick]');
    expect(joystick).not.toBeNull();
    joystick?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));

    expect(canvasSpy).not.toHaveBeenCalled();
  });

  it('renders ✕ only while reading, hides the joystick, and routes to onCloseReading', () => {
    stubCapability(true, 5);
    const onClose = vi.fn();
    const walking = mount(
      <TouchControls touchInput={touchRef()} readingOpen={false} onCloseReading={onClose} />,
    );
    expect(walking.querySelector('[data-touch-close-reading]')).toBeNull();

    const reading = mount(
      <TouchControls touchInput={touchRef()} readingOpen={true} onCloseReading={onClose} />,
    );
    expect(reading.querySelector('[data-touch-joystick]')).toBeNull();
    const close = reading.querySelector('[data-touch-close-reading]');
    expect(close).not.toBeNull();
    close?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('visibilitychange → hidden zeroes movement and deactivates the scheme', () => {
    stubCapability(true, 5);
    const ref = touchRef();
    mount(<TouchControls touchInput={ref} readingOpen={false} onCloseReading={() => {}} />);
    ref.current.active = true;
    ref.current.analog.f = 0.7;
    ref.current.analog.r = -0.2;
    ref.current.lookDX = 14;
    ref.current.lookDY = -3;

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(ref.current).toEqual({
      active: false,
      analog: { f: 0, r: 0 },
      lookDX: 0,
      lookDY: 0,
    });
  });
});
