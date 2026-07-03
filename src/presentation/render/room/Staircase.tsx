/**
 * The static spiral staircase (§7.3): a helix of treads around a center
 * column, extending ~1.5 turns above and below floor level so it visibly
 * winds out of sight into the fog. Radius/pitch come from `dimensions.ts`,
 * sized for a walkable tread from day one — Unit 04 adds collision and the
 * climb WITHOUT reshaping this spiral. Local origin: stair axis at floor level.
 */
import { useMemo } from 'react';
import { BoxGeometry, BufferGeometry, CylinderGeometry } from 'three';

import { CEILING_HEIGHT, STAIR_RADIUS } from './dimensions';
import { woodMaterial } from './materials';
import { mustMerge } from './Room';

const TREADS_PER_TURN = 12;
const TURNS_EACH_WAY = 1.5;
const TREAD_THICKNESS = 0.035;
const TREAD_WIDTH = 0.24; // tangential
const COLUMN_RADIUS = 0.055;
const INNER_GAP = 0.08; // treads start just off the column

function spiralGeometry(): BufferGeometry {
  const geoms: BufferGeometry[] = [];
  const treadCount = Math.floor(2 * TURNS_EACH_WAY * TREADS_PER_TURN);
  const rise = CEILING_HEIGHT / TREADS_PER_TURN; // rise per turn = CEILING_HEIGHT (§7.3)
  const treadLength = STAIR_RADIUS - INNER_GAP;

  for (let i = -treadCount / 2; i < treadCount / 2; i++) {
    const phi = i * ((2 * Math.PI) / TREADS_PER_TURN);
    const tread = new BoxGeometry(TREAD_WIDTH, TREAD_THICKNESS, treadLength);
    tread.translate(0, 0, INNER_GAP + treadLength / 2); // extend radially from the column
    tread.rotateY(phi);
    tread.translate(0, i * rise, 0);
    geoms.push(tread);
  }

  const columnLength = 2 * TURNS_EACH_WAY * CEILING_HEIGHT + 1;
  const column = new CylinderGeometry(COLUMN_RADIUS, COLUMN_RADIUS, columnLength, 10);
  geoms.push(column);

  return mustMerge(geoms);
}

export function Staircase() {
  const spiral = useMemo(() => spiralGeometry(), []);
  return <mesh geometry={spiral} material={woodMaterial} />;
}
