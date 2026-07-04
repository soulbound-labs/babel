/**
 * The vestibule beyond side 3 (§4.1, Unit 04 KDD-1): a narrow hallway with
 * the R1 stair ALCOVE bulging from the −x flank — the stair axis sits at
 * (x = STAIR_AXIS_X, z = STAIR_CENTER_Z), off the door-to-door walk line, so
 * corridor traversal and the walkable spiral coexist. A straight walk lane
 * x ∈ [+0.30, +1.00] runs past the mirror to the far-cap door (centered
 * x = FAR_DOOR_CENTER_X), which aligns with the next room's entrance. The
 * spiral cross-section is byte-identical to Unit 03 — only world placement
 * moved (frozen seam, Unit 03 spec §7.3).
 */
import { useMemo } from 'react';
import { BufferGeometry, Path, PlaneGeometry, Shape, ShapeGeometry } from 'three';

import {
  CEILING_HEIGHT,
  DOOR_HEIGHT,
  DOOR_WIDTH,
  HEX_APOTHEM,
  STAIR_RADIUS,
  VESTIBULE_DEPTH,
  VESTIBULE_WIDTH,
} from './dimensions';
import { InfinityMirrors } from './InfinityMirrors';
import { stoneMaterial } from './materials';
import { mustMerge, wallForSide } from './Room';
import { Staircase } from './Staircase';
import { ALCOVE_BACK_X, ALCOVE_NEAR_Z, STAIR_AXIS_X, STAIR_AXIS_Z } from '../player/stair';

const NEAR_Z = -HEX_APOTHEM; // shared wall with the hexagon (side 3)
const FAR_Z = -(HEX_APOTHEM + VESTIBULE_DEPTH);
const HALF_W = VESTIBULE_WIDTH / 2;
/** Stair axis (KDD-1): in the −x alcove, clear of the walk lane — canonical values in stair.ts. */
export const STAIR_CENTER_Z = STAIR_AXIS_Z;
/** Far-cap door center — where the next room's entrance door aligns (+0.55 lateral drift/hop). */
export const FAR_DOOR_CENTER_X = 0.55;
const STAIRWELL_RADIUS = STAIR_RADIUS + 0.06;

/**
 * Vestibule + alcove footprint as a 2D shape, with the circular stairwell
 * opening around the stair axis. `zToShapeY` maps world z to shape-space y:
 * −z for the floor (rotateX(−π/2)), +z for the ceiling (rotateX(+π/2)) — both
 * land on the same world footprint with opposite normals. ShapeGeometry
 * normalizes winding, so the mirrored variant triangulates correctly.
 */
function slabWithStairwell(zToShapeY: (z: number) => number): Shape {
  const corners: [number, number][] = [
    [-HALF_W, NEAR_Z],
    [HALF_W, NEAR_Z],
    [HALF_W, FAR_Z],
    [ALCOVE_BACK_X, FAR_Z],
    [ALCOVE_BACK_X, ALCOVE_NEAR_Z],
    [-HALF_W, ALCOVE_NEAR_Z],
  ];
  const shape = new Shape();
  corners.forEach(([x, z], i) =>
    i === 0 ? shape.moveTo(x, zToShapeY(z)) : shape.lineTo(x, zToShapeY(z)),
  );
  shape.closePath();
  const hole = new Path();
  hole.absarc(STAIR_AXIS_X, zToShapeY(STAIR_CENTER_Z), STAIRWELL_RADIUS, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

/**
 * A wall plane emitted TWICE — inward and outward faces at the same spot.
 * Stone is FrontSide: a lone plane is a phantom from its back side, and since
 * Unit 04 streamed lit neighbors, a phantom vestibule wall reads as "seeing
 * into the world beyond" (the sealing bug this fixes). Opposite windings on
 * one plane never z-fight — exactly one face is visible from any side.
 */
function sealedWall(
  width: number,
  height: number,
  yawIn: number,
  x: number,
  y: number,
  z: number,
): BufferGeometry[] {
  return [yawIn, yawIn + Math.PI].map((yaw) => {
    // abs: a negative span must not silently flip the winding — yawIn is the
    // single source of facing (the pre-seal right flank shipped inverted this way).
    const g = new PlaneGeometry(Math.abs(width), height);
    g.rotateY(yaw);
    g.translate(x, y, z);
    return g;
  });
}

export function vestibuleStoneGeometry(): BufferGeometry {
  const geoms: BufferGeometry[] = [];

  // +x flank — full straight wall (the walk lane runs along it). Inward = −x.
  geoms.push(
    ...sealedWall(
      VESTIBULE_DEPTH,
      CEILING_HEIGHT,
      -Math.PI / 2,
      HALF_W,
      CEILING_HEIGHT / 2,
      (NEAR_Z + FAR_Z) / 2,
    ),
  );

  // −x flank — near segment up to the alcove mouth… Inward = +x.
  geoms.push(
    ...sealedWall(
      ALCOVE_NEAR_Z - NEAR_Z,
      CEILING_HEIGHT,
      Math.PI / 2,
      -HALF_W,
      CEILING_HEIGHT / 2,
      (NEAR_Z + ALCOVE_NEAR_Z) / 2,
    ),
  );

  // …the alcove back wall (inward = +x, into the alcove)…
  geoms.push(
    ...sealedWall(
      FAR_Z - ALCOVE_NEAR_Z,
      CEILING_HEIGHT,
      Math.PI / 2,
      ALCOVE_BACK_X,
      CEILING_HEIGHT / 2,
      (ALCOVE_NEAR_Z + FAR_Z) / 2,
    ),
  );

  // …and the connector wall across the alcove mouth.
  geoms.push(
    ...sealedWall(
      -HALF_W - ALCOVE_BACK_X,
      CEILING_HEIGHT,
      0,
      (ALCOVE_BACK_X + -HALF_W) / 2,
      CEILING_HEIGHT / 2,
      ALCOVE_NEAR_Z,
    ),
  );

  // Far cap with the door gap (jamb + lintel) centered at FAR_DOOR_CENTER_X.
  // Phase 3 renders this conditionally (edge rooms only); unconditional here.
  const doorLeft = FAR_DOOR_CENTER_X - DOOR_WIDTH / 2;
  const doorRight = FAR_DOOR_CENTER_X + DOOR_WIDTH / 2;
  geoms.push(
    ...sealedWall(
      doorLeft - ALCOVE_BACK_X,
      CEILING_HEIGHT,
      0,
      (ALCOVE_BACK_X + doorLeft) / 2,
      CEILING_HEIGHT / 2,
      FAR_Z,
    ),
  );
  if (doorRight < HALF_W - 1e-9) {
    geoms.push(
      ...sealedWall(
        HALF_W - doorRight,
        CEILING_HEIGHT,
        0,
        (doorRight + HALF_W) / 2,
        CEILING_HEIGHT / 2,
        FAR_Z,
      ),
    );
  }
  const lintelHeight = CEILING_HEIGHT - DOOR_HEIGHT;
  geoms.push(
    ...sealedWall(
      DOOR_WIDTH,
      lintelHeight,
      0,
      FAR_DOOR_CENTER_X,
      DOOR_HEIGHT + lintelHeight / 2,
      FAR_Z,
    ),
  );

  // Vestibule-side face of the shared side-3 wall (jambs + lintel around the door).
  geoms.push(...wallForSide(3, 'out'));

  // Floor and ceiling with the stairwell opening.
  const floor = new ShapeGeometry(slabWithStairwell((z) => -z));
  floor.rotateX(-Math.PI / 2); // shape y → −z, normal +y
  geoms.push(floor);
  const ceiling = new ShapeGeometry(slabWithStairwell((z) => z));
  ceiling.rotateX(Math.PI / 2); // shape y → +z, normal −y
  ceiling.translate(0, CEILING_HEIGHT, 0);
  geoms.push(ceiling);

  return mustMerge(geoms);
}

// The Unit 03 placeholder closet recesses (flat void-black decals, one per
// flank) are GONE: the right one vanished behind the full-wall mirror, and
// the left one read as a black hole punched in the sealed wall — the exact
// "black wall" glitch. Unit 06 models the two Borges closets as real
// recessed doorways instead (bead babel-zga4).

/** Void plug over the far-cap door gap — edge rooms (n = +64) only: the corridor ends in dark. */
export function farDoorPlugGeometry(): BufferGeometry {
  const plug = new PlaneGeometry(DOOR_WIDTH + 0.1, DOOR_HEIGHT + 0.05);
  plug.translate(FAR_DOOR_CENTER_X, DOOR_HEIGHT / 2, FAR_Z - 0.02);
  return plug;
}

export function Vestibule() {
  const shell = useMemo(() => vestibuleStoneGeometry(), []);
  return (
    <group>
      <mesh geometry={shell} material={stoneMaterial} />
      {/* The facing mirror pair — placeholders here; RoomStream mounts the live
          reflective pair for the current room (InfinityMirrors live). */}
      <InfinityMirrors />
      <group position={[STAIR_AXIS_X, 0, STAIR_CENTER_Z]}>
        <Staircase />
      </group>
    </group>
  );
}
