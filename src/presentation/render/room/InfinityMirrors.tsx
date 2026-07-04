/**
 * Infinity mirrors — the vestibule's facing pair (the Unit 06 mirror hook,
 * brought forward). The Unit 03 right-flank mirror gains a twin on the
 * stair-alcove back wall; near the vestibule both planes become LIVE planar
 * reflections (three's `Reflector` — real render-to-target, oblique-clipped),
 * and because they face each other each pass nests one true bounce plus
 * frame feedback: the walk lane reads as a corridor of spiral stairs
 * receding into fog. Borges: "mirrors faithfully duplicate all appearances,
 * and men usually infer from them that the Library is not infinite".
 *
 * Past LIVE_RADIUS (and for neighbor rooms, `live=false`) the pair falls
 * back to the untouched MirrorSurface placeholder — its standard material
 * fogs correctly, while the Reflector shader is fog-blind, so a live mirror
 * never renders at distance. The placeholder⇄live swap is a pure function of
 * the camera position (§3 determinism: a pose always produces the same image).
 *
 * Budget note (render-doctrine §4): each visible live reflector re-renders
 * the scene into a 512² target (nested once when one mirror sees the other).
 * The proximity gate keeps every pose outside the vestibule on the
 * placeholder path; inside it (P4/P5/P13) the HUD draw-call reading includes
 * the reflection passes — the mood gate records the waiver or retunes.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { PlaneGeometry, Vector3 } from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

import { ALCOVE_BACK_X } from '../player/stair';
import { HEX_APOTHEM, MIRROR_HEIGHT, MIRROR_WIDTH, VESTIBULE_WIDTH } from './dimensions';
import { MirrorSurface } from './MirrorSurface';

/** Right-flank mirror, local to the room origin — the frozen Unit 03 placement. */
export const MIRROR_RIGHT: [number, number, number] = [
  VESTIBULE_WIDTH / 2 - 0.02,
  MIRROR_HEIGHT / 2 + 0.3,
  -(HEX_APOTHEM + 1.8),
];
/** The twin on the stair-alcove back wall, directly facing MIRROR_RIGHT. */
export const MIRROR_LEFT: [number, number, number] = [
  ALCOVE_BACK_X + 0.02,
  MIRROR_HEIGHT / 2 + 0.3,
  -(HEX_APOTHEM + 1.8),
];
/** Live-reflection gate, meters from the pair's midpoint. 4.0 keeps the room
 * center live (the pair is visible through the side-3 door) while every
 * committed hexagon-interior pose (P1–P3, spawn) stays on the placeholder path. */
const LIVE_RADIUS = 4.0;
const RESOLUTION = 512;
/** Reflection tint — just under unity, cool: smoked glass, not a light source. */
const MIRROR_TINT = '#b4bac6';

const MIDPOINT_OFFSET_X = (MIRROR_LEFT[0] - MIRROR_RIGHT[0]) / 2;

export type InfinityMirrorsProps = {
  /** Live reflections (current room only). Neighbors render placeholders. */
  live?: boolean;
};

export function InfinityMirrors({ live = false }: InfinityMirrorsProps) {
  const fallbackRef = useRef<Group>(null);

  const reflectors = useMemo(() => {
    if (!live) return null;
    const geometry = new PlaneGeometry(MIRROR_WIDTH, MIRROR_HEIGHT);
    const make = () => {
      const r = new Reflector(geometry, {
        clipBias: 0.003,
        textureWidth: RESOLUTION,
        textureHeight: RESOLUTION,
        color: MIRROR_TINT,
      });
      r.visible = false; // useFrame drives visibility before the first render
      return r;
    };
    return { geometry, right: make(), left: make() };
  }, [live]);

  useEffect(() => {
    if (!reflectors) return;
    return () => {
      reflectors.right.dispose();
      reflectors.left.dispose();
      reflectors.geometry.dispose();
    };
  }, [reflectors]);

  const scratch = useMemo(() => ({ midpoint: new Vector3(), cam: new Vector3() }), []);

  // Placeholder⇄live swap. Rooms stream by translation only, so the pair's
  // world midpoint is the right mirror's world position shifted in x.
  useFrame(({ camera }) => {
    if (!reflectors) return;
    reflectors.right.getWorldPosition(scratch.midpoint);
    scratch.midpoint.x += MIDPOINT_OFFSET_X;
    camera.getWorldPosition(scratch.cam);
    const near = scratch.cam.distanceTo(scratch.midpoint) < LIVE_RADIUS;
    reflectors.right.visible = near;
    reflectors.left.visible = near;
    if (fallbackRef.current) fallbackRef.current.visible = !near;
  });

  return (
    <group>
      <group ref={fallbackRef}>
        <MirrorSurface position={MIRROR_RIGHT} rotationY={-Math.PI / 2} />
        <MirrorSurface position={MIRROR_LEFT} rotationY={Math.PI / 2} />
      </group>
      {reflectors && (
        <>
          <primitive
            object={reflectors.right}
            position={MIRROR_RIGHT}
            rotation={[0, -Math.PI / 2, 0]}
          />
          <primitive
            object={reflectors.left}
            position={MIRROR_LEFT}
            rotation={[0, Math.PI / 2, 0]}
          />
        </>
      )}
    </group>
  );
}
