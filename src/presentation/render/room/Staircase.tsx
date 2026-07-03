/**
 * The static spiral staircase (§7.3, Unit 04 §4.2.3): ONE inter-floor turn of
 * the helix per room — floor level to ceiling. Streamed rooms above and below
 * continue it seamlessly (the mouth azimuth repeats every floor exactly), and
 * the shaft impostor carries the silhouette beyond the live set. Radius/pitch
 * come from `dimensions.ts`; the cross-section is FROZEN (Unit 04 walks it
 * WITHOUT reshaping): 12 treads/turn, rise/turn = CEILING_HEIGHT,
 * STAIR_RADIUS 0.78. Local origin: stair axis at floor level.
 */
import { useMemo } from 'react';
import { BoxGeometry, BufferGeometry, CylinderGeometry } from 'three';

import { CEILING_HEIGHT, STAIR_RADIUS } from './dimensions';
import { woodMaterial } from './materials';
import { mustMerge } from './Room';

const TREADS_PER_TURN = 12;
const TREAD_THICKNESS = 0.035;
const TREAD_WIDTH = 0.24; // tangential
const COLUMN_RADIUS = 0.055;
const INNER_GAP = 0.08; // treads start just off the column

/** One full turn: treads 0..11 (floor → ceiling) + the column segment for this floor. */
export function spiralTurnGeometry(): BufferGeometry {
  const geoms: BufferGeometry[] = [];
  const rise = CEILING_HEIGHT / TREADS_PER_TURN; // rise per turn = CEILING_HEIGHT (§7.3)
  const treadLength = STAIR_RADIUS - INNER_GAP;

  for (let i = 0; i < TREADS_PER_TURN; i++) {
    const phi = i * ((2 * Math.PI) / TREADS_PER_TURN);
    const tread = new BoxGeometry(TREAD_WIDTH, TREAD_THICKNESS, treadLength);
    tread.translate(0, 0, INNER_GAP + treadLength / 2); // extend radially from the column
    tread.rotateY(phi);
    tread.translate(0, i * rise, 0);
    geoms.push(tread);
  }

  const column = new CylinderGeometry(COLUMN_RADIUS, COLUMN_RADIUS, CEILING_HEIGHT, 10);
  column.translate(0, CEILING_HEIGHT / 2, 0);
  geoms.push(column);

  return mustMerge(geoms);
}

export function Staircase() {
  const spiral = useMemo(() => spiralTurnGeometry(), []);
  return <mesh geometry={spiral} material={woodMaterial} />;
}
