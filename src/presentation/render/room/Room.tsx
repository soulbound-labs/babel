/**
 * The hexagon shell (§4.1): six walls (door gaps on free sides 0 and 3),
 * floor and ceiling with the hexagonal shaft openings, and the black void
 * volume beyond the side-0 entrance ("the corridor continues" — Unit 04
 * replaces it with the next room). Geometry is merged per material so the
 * whole shell costs a handful of draw calls (C3).
 */
import { useMemo } from 'react';
import { BufferGeometry, Path, PlaneGeometry, Shape, ShapeGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

import {
  CEILING_HEIGHT,
  DOOR_HEIGHT,
  DOOR_WIDTH,
  HEX_APOTHEM,
  HEX_SIDE,
  SHAFT_RADIUS,
} from './dimensions';
import { stoneMaterial, voidMaterial } from './materials';

const FREE_SIDES = new Set([0, 3]); // §4.1 — entrance and vestibule

function sideAngle(side: number): number {
  return side * (Math.PI / 3); // outward normal, CCW from +z
}

/** Merge or die — a null merge means empty input, which is a bug here. */
export function mustMerge(geoms: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(geoms);
  if (!merged) throw new Error('geometry merge failed');
  geoms.forEach((g) => g.dispose());
  return merged;
}

/**
 * A wall plane segment on hexagon side `side`, facing inward.
 * `along` offsets the segment center along the wall's tangent.
 */
export function wallSegment(
  side: number,
  width: number,
  height: number,
  along: number,
  yCenter: number,
  facing: 'in' | 'out' = 'in',
): BufferGeometry {
  const theta = sideAngle(side);
  const g = new PlaneGeometry(width, height);
  g.rotateY(theta + (facing === 'in' ? Math.PI : 0));
  const tx = Math.cos(theta);
  const tz = -Math.sin(theta);
  g.translate(
    Math.sin(theta) * HEX_APOTHEM + tx * along,
    yCenter,
    Math.cos(theta) * HEX_APOTHEM + tz * along,
  );
  return g;
}

/** Full-height wall, or three segments (jambs + lintel) around a door gap. */
export function wallForSide(side: number, facing: 'in' | 'out' = 'in'): BufferGeometry[] {
  if (!FREE_SIDES.has(side)) {
    return [wallSegment(side, HEX_SIDE, CEILING_HEIGHT, 0, CEILING_HEIGHT / 2, facing)];
  }
  const jambWidth = (HEX_SIDE - DOOR_WIDTH) / 2;
  const jambOffset = DOOR_WIDTH / 2 + jambWidth / 2;
  const lintelHeight = CEILING_HEIGHT - DOOR_HEIGHT;
  return [
    wallSegment(side, jambWidth, CEILING_HEIGHT, -jambOffset, CEILING_HEIGHT / 2, facing),
    wallSegment(side, jambWidth, CEILING_HEIGHT, jambOffset, CEILING_HEIGHT / 2, facing),
    wallSegment(side, DOOR_WIDTH, lintelHeight, 0, DOOR_HEIGHT + lintelHeight / 2, facing),
  ];
}

/** Regular hexagon outline (corners between the sides), as a 2D shape path. */
function hexPoints(circumradius: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const phi = Math.PI / 6 + k * (Math.PI / 3);
    pts.push([circumradius * Math.sin(phi), circumradius * Math.cos(phi)]);
  }
  return pts;
}

/** Hexagonal slab with the hexagonal shaft opening (floor or ceiling). */
function hexSlabWithShaftHole(): Shape {
  const outer = hexPoints(HEX_SIDE); // circumradius of a regular hexagon = its side
  const shape = new Shape();
  outer.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  const hole = new Path();
  const inner = hexPoints(SHAFT_RADIUS).reverse(); // opposite winding
  inner.forEach(([x, y], i) => (i === 0 ? hole.moveTo(x, y) : hole.lineTo(x, y)));
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

/** The black volume beyond the side-0 doorway — an unlit dead-end corridor.
 * Unit 04: rendered ONLY for edge rooms (n = −64), where the corridor truly ends. */
export function entranceVoidGeometry(): BufferGeometry {
  const depth = 1.4;
  const w = DOOR_WIDTH + 0.3;
  const geoms: BufferGeometry[] = [];
  // Far cap facing back toward the room (+z side of the hexagon).
  const cap = new PlaneGeometry(w, CEILING_HEIGHT);
  cap.rotateY(Math.PI);
  cap.translate(0, CEILING_HEIGHT / 2, HEX_APOTHEM + depth);
  geoms.push(cap);
  for (const dir of [-1, 1]) {
    const sideWall = new PlaneGeometry(depth, CEILING_HEIGHT);
    sideWall.rotateY(dir * (Math.PI / 2));
    sideWall.translate((-dir * w) / 2, CEILING_HEIGHT / 2, HEX_APOTHEM + depth / 2);
    geoms.push(sideWall);
  }
  return mustMerge(geoms);
}

/** The hexagon's full stone geometry — walls, floor, ceiling — merged (Unit 04: instanced ×11). */
export function hexStoneGeometry(): BufferGeometry {
  const geoms: BufferGeometry[] = [];
  for (let side = 0; side < 6; side++) geoms.push(...wallForSide(side));

  const slab = hexSlabWithShaftHole();
  const floorGeom = new ShapeGeometry(slab);
  floorGeom.rotateX(-Math.PI / 2); // normal +y — walkable face up
  geoms.push(floorGeom);
  const ceilingGeom = new ShapeGeometry(slab);
  ceilingGeom.rotateX(Math.PI / 2); // normal -y — faces down into the room
  ceilingGeom.translate(0, CEILING_HEIGHT, 0);
  geoms.push(ceilingGeom);

  return mustMerge(geoms);
}

export function Room() {
  const { shell, voidBeyond } = useMemo(
    () => ({ shell: hexStoneGeometry(), voidBeyond: entranceVoidGeometry() }),
    [],
  );

  return (
    <group>
      <mesh geometry={shell} material={stoneMaterial} />
      <mesh geometry={voidBeyond} material={voidMaterial} />
    </group>
  );
}
