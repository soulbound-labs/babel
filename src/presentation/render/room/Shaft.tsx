/**
 * The shaft (§4.1, Unit 04 §4.2.4): the low railing ring around the floor
 * opening. Unit 03's black placeholder tubes are gone — the repeating-slice
 * `ShaftImpostor` supersedes them (real rooms fill floors ±1; slices continue
 * beyond). The floor/ceiling openings themselves are cut by `Room.tsx`; the
 * railing circle is the collision constraint's visual twin.
 */
import { useMemo } from 'react';
import { BufferGeometry, CylinderGeometry, TorusGeometry } from 'three';

import { mustMerge } from './Room';
import { RAILING_HEIGHT, RAILING_RADIUS } from './dimensions';
import { metalMaterial } from './materials';

const RAIL_TUBE = 0.02;
const POST_RADIUS = 0.015;
const POST_COUNT = 6;

export function railingGeometry(): BufferGeometry {
  const geoms: BufferGeometry[] = [];
  for (const y of [RAILING_HEIGHT, RAILING_HEIGHT / 2]) {
    const ring = new TorusGeometry(RAILING_RADIUS, RAIL_TUBE, 6, 36);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, y, 0);
    geoms.push(ring);
  }
  for (let i = 0; i < POST_COUNT; i++) {
    const phi = Math.PI / 6 + i * ((2 * Math.PI) / POST_COUNT); // at the opening's corners
    const post = new CylinderGeometry(POST_RADIUS, POST_RADIUS, RAILING_HEIGHT, 6);
    post.translate(
      RAILING_RADIUS * Math.sin(phi),
      RAILING_HEIGHT / 2,
      RAILING_RADIUS * Math.cos(phi),
    );
    geoms.push(post);
  }
  return mustMerge(geoms);
}

export function Shaft() {
  const railing = useMemo(() => railingGeometry(), []);
  return <mesh geometry={railing} material={metalMaterial} />;
}
