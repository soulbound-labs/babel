/**
 * Perf HUD behind `?debug` (INV-R9): three/addons Stats (fps) plus a
 * draw-call readout from `renderer.info.render.calls`. Query-param-gated
 * only — no build-time fork, harmless if discovered (E7). Budget: ≤ 30 draw
 * calls, 60 fps on the reference device (C3).
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import Stats from 'three/addons/libs/stats.module.js';

export function DebugStats() {
  const gl = useThree((s) => s.gl);
  const stats = useMemo(() => new Stats(), []);
  const callsEl = useMemo(() => {
    const el = document.createElement('div');
    el.style.cssText =
      'position:fixed;top:48px;left:0;padding:2px 6px;font:12px monospace;' +
      'color:#9f9;background:rgba(0,0,0,.6);z-index:10000;pointer-events:none';
    return el;
  }, []);

  useEffect(() => {
    document.body.appendChild(stats.dom);
    document.body.appendChild(callsEl);
    return () => {
      stats.dom.remove();
      callsEl.remove();
    };
  }, [stats, callsEl]);

  useFrame(() => {
    stats.update();
    // info.render resets each frame — read it live, update DOM imperatively.
    callsEl.textContent = `draw calls: ${gl.info.render.calls}`;
  });

  return null;
}
