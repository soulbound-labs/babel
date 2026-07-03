/**
 * Mirror hook (§4.8) — a dark, glossy placeholder plane in the vestibule.
 * Unit 06 supplies a render-target `reflection` texture; nothing else about
 * this component changes. Local origin is the mirror center, facing +z.
 */
import type { Texture } from 'three';

import { MIRROR_HEIGHT, MIRROR_WIDTH } from './dimensions';

export type MirrorSurfaceProps = {
  position: [number, number, number];
  rotationY?: number;
  /** Unit 06's render-target texture — mapped when present. */
  reflection?: Texture;
};

export function MirrorSurface({ position, rotationY = 0, reflection }: MirrorSurfaceProps) {
  return (
    <mesh position={position} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[MIRROR_WIDTH, MIRROR_HEIGHT]} />
      <meshStandardMaterial
        color="#101014"
        roughness={0.08}
        metalness={0.9}
        map={reflection ?? null}
      />
    </mesh>
  );
}
