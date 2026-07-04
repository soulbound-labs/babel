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
  /** Plane size — additive props; default to the frozen hero-pair dimensions.
   * InfinityMirrors passes full-wall spans so placeholders match the live pair. */
  width?: number;
  height?: number;
};

export function MirrorSurface({
  position,
  rotationY = 0,
  reflection,
  width = MIRROR_WIDTH,
  height = MIRROR_HEIGHT,
}: MirrorSurfaceProps) {
  return (
    <mesh position={position} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color="#2b2d38"
        roughness={0.05}
        metalness={0.55}
        emissive="#12141c"
        emissiveIntensity={0.6}
        map={reflection ?? null}
      />
    </mesh>
  );
}
