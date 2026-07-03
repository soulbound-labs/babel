/**
 * The vestibule beyond side 3 (§4.1): a narrow hallway with two closet
 * doorways (placeholder dark recesses — one per flank), the mirror surface,
 * and the static spiral staircase winding through a stairwell opening in
 * floor and ceiling. The far end is fog-black; walking stops at the stair
 * mouth (collision §7.3). Runs along -z from the hexagon's side-3 wall.
 */
import { useMemo } from 'react';
import { BufferGeometry, Path, PlaneGeometry, Shape, ShapeGeometry } from 'three';

import {
  CEILING_HEIGHT,
  CLOSET_SIDE,
  HEX_APOTHEM,
  MIRROR_HEIGHT,
  STAIR_RADIUS,
  VESTIBULE_DEPTH,
  VESTIBULE_WIDTH,
} from './dimensions';
import { stoneMaterial, voidMaterial } from './materials';
import { MirrorSurface } from './MirrorSurface';
import { mustMerge, wallForSide } from './Room';
import { Staircase } from './Staircase';

const NEAR_Z = -HEX_APOTHEM; // shared wall with the hexagon (side 3)
const FAR_Z = -(HEX_APOTHEM + VESTIBULE_DEPTH);
const HALF_W = VESTIBULE_WIDTH / 2;
/** Stair axis: in the fog-eaten far zone, mouth at the walk blocker (§7.3). */
export const STAIR_CENTER_Z = -(HEX_APOTHEM + VESTIBULE_DEPTH - 0.9);
const STAIRWELL_RADIUS = STAIR_RADIUS + 0.06;

/** Vestibule floor/ceiling rectangle with the circular stairwell opening. */
function slabWithStairwell(): Shape {
  const shape = new Shape();
  shape.moveTo(-HALF_W, -NEAR_Z);
  shape.lineTo(HALF_W, -NEAR_Z);
  shape.lineTo(HALF_W, -FAR_Z);
  shape.lineTo(-HALF_W, -FAR_Z);
  shape.closePath();
  const hole = new Path();
  hole.absarc(0, -STAIR_CENTER_Z, STAIRWELL_RADIUS, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

function vestibuleShell(): BufferGeometry {
  const geoms: BufferGeometry[] = [];
  const midZ = (NEAR_Z + FAR_Z) / 2;

  // Flank walls (inward-facing) and the far cap.
  for (const dir of [-1, 1]) {
    const flank = new PlaneGeometry(VESTIBULE_DEPTH, CEILING_HEIGHT);
    flank.rotateY(dir * (Math.PI / 2));
    flank.translate(-dir * HALF_W, CEILING_HEIGHT / 2, midZ);
    geoms.push(flank);
  }
  const farCap = new PlaneGeometry(VESTIBULE_WIDTH, CEILING_HEIGHT);
  farCap.translate(0, CEILING_HEIGHT / 2, FAR_Z);
  geoms.push(farCap);

  // Vestibule-side face of the shared side-3 wall (jambs + lintel around the door).
  geoms.push(...wallForSide(3, 'out'));

  // Floor and ceiling with the stairwell opening. Shape-space y maps to -z.
  const slab = slabWithStairwell();
  const floor = new ShapeGeometry(slab);
  floor.rotateX(-Math.PI / 2);
  geoms.push(floor);
  const ceiling = new ShapeGeometry(slab);
  ceiling.rotateX(-Math.PI / 2); // same footprint as the floor…
  ceiling.rotateZ(Math.PI); // …then flip the normal to -y (x is symmetric)
  ceiling.translate(0, CEILING_HEIGHT, 0);
  geoms.push(ceiling);

  return mustMerge(geoms);
}

/** Placeholder closet doorways: dark recessed rectangles, one per flank. Unit 06 deepens them. */
function closetDoorways(): BufferGeometry {
  const geoms: BufferGeometry[] = [];
  const doorZ = NEAR_Z - CLOSET_SIDE; // just inside the hallway
  for (const dir of [-1, 1]) {
    const doorway = new PlaneGeometry(CLOSET_SIDE, 1.7);
    doorway.rotateY(dir * (Math.PI / 2));
    doorway.translate(-dir * (HALF_W - 0.01), 1.7 / 2, doorZ);
    geoms.push(doorway);
  }
  return mustMerge(geoms);
}

export function Vestibule() {
  const { shell, closets } = useMemo(
    () => ({ shell: vestibuleShell(), closets: closetDoorways() }),
    [],
  );
  return (
    <group>
      <mesh geometry={shell} material={stoneMaterial} />
      <mesh geometry={closets} material={voidMaterial} />
      <MirrorSurface
        position={[HALF_W - 0.02, MIRROR_HEIGHT / 2 + 0.3, -(HEX_APOTHEM + 0.9)]}
        rotationY={-Math.PI / 2}
      />
      <group position={[0, 0, STAIR_CENTER_Z]}>
        <Staircase />
      </group>
    </group>
  );
}
