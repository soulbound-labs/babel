/**
 * All 640 books as ONE `InstancedMesh` — one draw call (C3). The instance id
 * IS the slot (§4.5, frozen): Unit 05 resolves clicks via
 * `raycast → instanceId → slotToBook(instanceId)`. Transforms and
 * per-instance color come from the pure `instancing.ts` (seeded — C4).
 * Static after mount; no per-frame instance writes this unit.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  Color,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

import { BOOK_COUNT, slotJitter, slotTransform } from './instancing';

/** Base is white; per-instance color carries the actual dark leather tone. */
const bookMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });

export function BookWalls() {
  const ref = useRef<InstancedMesh>(null);
  // Unit book with a subtle spine bevel; per-instance scale gives each its format.
  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 1, 0.08), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    const p = new Vector3();
    const q = new Quaternion();
    const e = new Euler();
    const s = new Vector3();
    const c = new Color();
    for (let slot = 0; slot < BOOK_COUNT; slot++) {
      const t = slotTransform(slot);
      p.set(t.position.x, t.position.y, t.position.z);
      e.set(t.rotation.x, t.rotation.y, t.rotation.z);
      q.setFromEuler(e);
      s.set(t.scale.x, t.scale.y, t.scale.z);
      m.compose(p, q, s);
      mesh.setMatrixAt(slot, m);
      // Muted leather tones, deterministic from the slot's seeded shade (C4).
      const shade = slotJitter(slot).shade;
      c.setHSL(0.04 + 0.08 * shade, 0.28, 0.09 + 0.07 * shade);
      mesh.setColorAt(slot, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  return <instancedMesh ref={ref} args={[geometry, bookMaterial, BOOK_COUNT]} />;
}
