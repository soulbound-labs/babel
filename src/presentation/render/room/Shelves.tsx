/**
 * Shelf boards + frames for the four book-walls (§4.1) — merged into a single
 * static mesh. Board tops sit exactly where `instancing.ts` rests the books
 * (shelf · SHELF_PITCH + 0.02).
 */
import { useMemo } from 'react';
import { BoxGeometry, BufferGeometry } from 'three';

import {
  BOOK_SLOT_WIDTH,
  BOOKS_PER_SHELF,
  CEILING_HEIGHT,
  HEX_APOTHEM,
  SHELF_DEPTH,
  SHELF_PITCH,
  SHELVES_PER_WALL,
} from './dimensions';
import { WALL_TO_SIDE } from './instancing';
import { woodMaterial } from './materials';
import { mustMerge } from './Room';

const BOARD_THICKNESS = 0.04;
const BOARD_WIDTH = BOOKS_PER_SHELF * BOOK_SLOT_WIDTH + 0.1; // slight frame margin
const UPRIGHT_WIDTH = 0.05;

/** Box oriented on a book wall: local x = along the wall, z = outward normal. */
function wallBox(
  side: number,
  dims: [number, number, number],
  along: number,
  y: number,
  radial: number,
): BufferGeometry {
  const theta = side * (Math.PI / 3);
  const g = new BoxGeometry(...dims);
  g.rotateY(theta);
  const tx = Math.cos(theta);
  const tz = -Math.sin(theta);
  g.translate(Math.sin(theta) * radial + tx * along, y, Math.cos(theta) * radial + tz * along);
  return g;
}

export function shelvesGeometry(): BufferGeometry {
  const geoms: BufferGeometry[] = [];
  const radial = HEX_APOTHEM - SHELF_DEPTH / 2;
  for (const side of WALL_TO_SIDE) {
    for (let shelf = 0; shelf < SHELVES_PER_WALL; shelf++) {
      geoms.push(
        wallBox(side, [BOARD_WIDTH, BOARD_THICKNESS, SHELF_DEPTH], 0, shelf * SHELF_PITCH, radial),
      );
    }
    for (const dir of [-1, 1]) {
      geoms.push(
        wallBox(
          side,
          [UPRIGHT_WIDTH, CEILING_HEIGHT, SHELF_DEPTH],
          dir * ((BOARD_WIDTH + UPRIGHT_WIDTH) / 2),
          CEILING_HEIGHT / 2,
          radial,
        ),
      );
    }
  }
  return mustMerge(geoms);
}

export function Shelves() {
  const geometry = useMemo(() => shelvesGeometry(), []);
  return <mesh geometry={geometry} material={woodMaterial} />;
}
