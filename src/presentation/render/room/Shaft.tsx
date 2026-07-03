/**
 * The shaft (§4.1): the low railing ring around the floor opening, and black
 * open-ended tubes continuing the opening up and down so the depth is
 * unreadable — darkness + fog only. Unit 04 replaces the tubes with the
 * repeating-parallax fake. The floor/ceiling openings themselves are cut by
 * `Room.tsx`; the railing circle is the collision constraint's visual twin.
 */
import { useMemo } from 'react';
import { BufferGeometry, CylinderGeometry, TorusGeometry } from 'three';

import { mustMerge } from './Room';
import { CEILING_HEIGHT, RAILING_HEIGHT, RAILING_RADIUS, SHAFT_RADIUS } from './dimensions';
import { metalMaterial, voidMaterial } from './materials';

const RAIL_TUBE = 0.02;
const POST_RADIUS = 0.015;
const POST_COUNT = 6;
const TUBE_LENGTH = 8; // far past what fog lets you read

function railingGeometry(): BufferGeometry {
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

function shaftTubes(): BufferGeometry {
  const geoms: BufferGeometry[] = [];
  for (const yCenter of [-TUBE_LENGTH / 2, CEILING_HEIGHT + TUBE_LENGTH / 2]) {
    // 6 radial segments = a hexagonal tube matching the opening's corners.
    const tube = new CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, TUBE_LENGTH, 6, 1, true);
    tube.rotateY(Math.PI / 6);
    tube.translate(0, yCenter, 0);
    geoms.push(tube);
  }
  return mustMerge(geoms);
}

export function Shaft() {
  const { railing, tubes } = useMemo(
    () => ({ railing: railingGeometry(), tubes: shaftTubes() }),
    [],
  );
  return (
    <group>
      <mesh geometry={railing} material={metalMaterial} />
      <mesh geometry={tubes} material={voidMaterial} />
    </group>
  );
}
