/**
 * RoomStream (Unit 04 §4.2.3, KDD-4) — the 11-room working set as
 * per-material mega-instancing:
 *
 *   stone ×11 = 1 draw call · wood (shelves + spiral turn) = 1 · metal
 *   railing = 1 · void (closet recesses) = 1 · bulb spheres = 1 · books = 11
 *   (per-room meshes — `instanceId === slot` per mesh is the FROZEN Unit 05
 *   seam; room identity = which mesh the ray hit, in `userData`) · mirrors ×3
 *   (current + horizontal neighbors) · edge blockers ≤ 2 (only when an edge
 *   room is live).
 *
 * Lights: a fixed pool of 12 PointLights (3 × {n−1, n, n+1} on the current
 * floor + the floors-±1 vestibule bulbs + the floor-−1 near bulb — descent
 * bias), repositioned on commit, never added/removed: constant light count
 * means the shader never relinks (KDD-4).
 *
 * Re-base contract (§4.2.1 step 3): the LocomotionController calls the
 * function registered in `rebaseRef` SYNCHRONOUSLY inside its frame callback,
 * so instance matrices, lights, mirrors and blockers move in the SAME frame
 * as the camera shift — a screen-space no-op, no React round-trip, no pop.
 * Streaming is a pure function of the coordinate; zero allocation per frame
 * (commits allocate a handful of transforms, frames allocate nothing).
 */
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import {
  Color,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

import { ORIGIN } from '../../../domain/entities';
import type { Coordinate } from '../../../domain/entities';
import { WALKABLE_BOUND } from '../../traversal/bounds';
import { liveRooms } from '../../traversal/working-set';
import { STAIR_AXIS_X, STAIR_AXIS_Z } from '../player/stair';
import {
  BULB_COLOR,
  BULB_POSITIONS,
  BULB_RADIUS,
  LIGHT_DISTANCE,
  LIGHT_INTENSITY,
} from '../room/Bulbs';
import { HEX_APOTHEM, MIRROR_HEIGHT, VESTIBULE_WIDTH } from '../room/dimensions';
import { BOOK_COUNT, slotJitter, slotTransform } from '../room/instancing';
import { metalMaterial, stoneMaterial, voidMaterial, woodMaterial } from '../room/materials';
import { MirrorSurface } from '../room/MirrorSurface';
import { entranceVoidGeometry, hexStoneGeometry, mustMerge } from '../room/Room';
import { railingGeometry } from '../room/Shaft';
import { shelvesGeometry } from '../room/Shelves';
import { spiralTurnGeometry } from '../room/Staircase';
import {
  closetDoorwaysGeometry,
  farDoorPlugGeometry,
  vestibuleStoneGeometry,
} from '../room/Vestibule';
import { ShaftImpostor } from './ShaftImpostor';
import { streamTransforms } from './streaming';
import type { RoomTransform } from './streaming';

const MAX_ROOMS = 11;
const MIRROR_DELTAS = [-1, 0, 1] as const;
const MIRROR_LOCAL: [number, number, number] = [
  VESTIBULE_WIDTH / 2 - 0.02,
  MIRROR_HEIGHT / 2 + 0.3,
  -(HEX_APOTHEM + 1.8),
];

/** Base is white; per-instance color carries the actual dark leather tone (as BookWalls). */
const bookMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
const bulbMaterial = new MeshBasicMaterial({ color: BULB_COLOR });

type StreamObjects = {
  megas: InstancedMesh[]; // stone, wood, metal, void — one instance per live room
  bulbs: InstancedMesh; // 3 spheres per live room
  books: { group: Group; mesh: InstancedMesh }[];
  lights: PointLight[];
  entranceVoid: Mesh;
  farPlug: Mesh;
};

function makeMega(geometry: ReturnType<typeof hexStoneGeometry>, material: unknown): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material as MeshStandardMaterial, MAX_ROOMS);
  mesh.frustumCulled = false; // instances span the working set; per-room culling is fog's job
  return mesh;
}

function buildObjects(): StreamObjects {
  // One room's full per-material geometry, instanced across the live set.
  const spiral = spiralTurnGeometry();
  spiral.translate(STAIR_AXIS_X, 0, STAIR_AXIS_Z);

  const stone = makeMega(mustMerge([hexStoneGeometry(), vestibuleStoneGeometry()]), stoneMaterial);
  const wood = makeMega(mustMerge([shelvesGeometry(), spiral]), woodMaterial);
  const metal = makeMega(railingGeometry(), metalMaterial);
  const voids = makeMega(closetDoorwaysGeometry(), voidMaterial);

  const bulbs = new InstancedMesh(
    new SphereGeometry(BULB_RADIUS, 12, 8),
    bulbMaterial,
    MAX_ROOMS * BULB_POSITIONS.length,
  );
  bulbs.frustumCulled = false;

  // The 11-book-mesh pool: identical instance layout per room (deterministic,
  // seeded); room identity lives on the GROUP the ray hit (Unit 05 seam).
  const bookGeometry = new RoundedBoxGeometry(1, 1, 1, 1, 0.08);
  const m = new Matrix4();
  const p = new Vector3();
  const q = new Quaternion();
  const e = new Euler();
  const s = new Vector3();
  const c = new Color();
  const books = Array.from({ length: MAX_ROOMS }, () => {
    const mesh = new InstancedMesh(bookGeometry, bookMaterial, BOOK_COUNT);
    for (let slot = 0; slot < BOOK_COUNT; slot++) {
      const t = slotTransform(slot);
      p.set(t.position.x, t.position.y, t.position.z);
      e.set(t.rotation.x, t.rotation.y, t.rotation.z);
      q.setFromEuler(e);
      s.set(t.scale.x, t.scale.y, t.scale.z);
      m.compose(p, q, s);
      mesh.setMatrixAt(slot, m);
      const shade = slotJitter(slot).shade;
      c.setHSL(0.04 + 0.08 * shade, 0.28, 0.09 + 0.07 * shade);
      mesh.setColorAt(slot, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    const group = new Group();
    group.add(mesh);
    return { group, mesh };
  });

  const lights = Array.from({ length: 12 }, () => {
    const light = new PointLight(BULB_COLOR, LIGHT_INTENSITY, LIGHT_DISTANCE, 2);
    return light;
  });

  const entranceVoid = new Mesh(entranceVoidGeometry(), voidMaterial);
  const farPlug = new Mesh(farDoorPlugGeometry(), voidMaterial);

  return { megas: [stone, wood, metal, voids], bulbs, books, lights, entranceVoid, farPlug };
}

/** The 12-light-pool targets for a live set (KDD-4). Parked lights get intensity 0. */
function lightTargets(
  byDelta: Map<string, RoomTransform>,
): { x: number; y: number; z: number; on: boolean }[] {
  const targets: { x: number; y: number; z: number; on: boolean }[] = [];
  const park = { x: 0, y: 0, z: 0, on: false };
  for (const dn of [-1, 0, 1]) {
    const t = byDelta.get(`${dn}:0`);
    for (const b of BULB_POSITIONS) {
      targets.push(
        t
          ? { x: t.position.x + b.x, y: t.position.y + b.y, z: t.position.z + b.z, on: true }
          : { ...park },
      );
    }
  }
  const vestBulb = BULB_POSITIONS[2];
  const nearBulb = BULB_POSITIONS[0];
  for (const df of [1, -1]) {
    const t = byDelta.get(`0:${df}`);
    targets.push(
      t && vestBulb
        ? {
            x: t.position.x + vestBulb.x,
            y: t.position.y + vestBulb.y,
            z: t.position.z + vestBulb.z,
            on: true,
          }
        : { ...park },
    );
  }
  const below = byDelta.get('0:-1');
  targets.push(
    below && nearBulb
      ? {
          x: below.position.x + nearBulb.x,
          y: below.position.y + nearBulb.y,
          z: below.position.z + nearBulb.z,
          on: true,
        }
      : { ...park },
  );
  return targets;
}

export type RoomStreamProps = {
  /** The controller writes here-registered callback synchronously on commit (§4.2.1). */
  rebaseRef: RefObject<((c: Coordinate) => void) | null>;
  initialCoordinate?: Coordinate;
};

export function RoomStream({ rebaseRef, initialCoordinate = ORIGIN }: RoomStreamProps) {
  const objects = useMemo(buildObjects, []);
  const scratch = useMemo(
    () => ({ m: new Matrix4(), byDelta: new Map<string, RoomTransform>() }),
    [],
  );
  const mirrorGroups = useRef<(Group | null)[]>([null, null, null]);
  // The shaft impostor rebases in the SAME frame as the rooms (§4.2.4 consistency rule).
  const shaftRef = useRef<((c: Coordinate) => void) | null>(null);

  const applyCoordinate = useCallback(
    (coordinate: Coordinate) => {
      const transforms = streamTransforms(liveRooms(coordinate));
      const { m, byDelta } = scratch;
      byDelta.clear();
      for (const t of transforms) byDelta.set(`${t.slot.dn}:${t.slot.dfloor}`, t);

      for (const mesh of objects.megas) {
        mesh.count = transforms.length;
        transforms.forEach((t, i) => {
          m.makeTranslation(t.position.x, t.position.y, t.position.z);
          mesh.setMatrixAt(i, m);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }

      objects.bulbs.count = transforms.length * BULB_POSITIONS.length;
      transforms.forEach((t, i) => {
        BULB_POSITIONS.forEach((b, j) => {
          m.makeTranslation(t.position.x + b.x, t.position.y + b.y, t.position.z + b.z);
          objects.bulbs.setMatrixAt(i * BULB_POSITIONS.length + j, m);
        });
      });
      objects.bulbs.instanceMatrix.needsUpdate = true;

      objects.books.forEach(({ group }, i) => {
        const t = transforms[i];
        if (!t) {
          group.visible = false;
          return;
        }
        group.visible = true;
        group.position.set(t.position.x, t.position.y, t.position.z);
        // The Unit 05 seam: room identity = which mesh the ray hit.
        group.userData.roomKey = t.slot.key;
        group.userData.dn = t.slot.dn;
        group.userData.dfloor = t.slot.dfloor;
        group.userData.coordinate = t.slot.coordinate;
      });

      MIRROR_DELTAS.forEach((dn, i) => {
        const g = mirrorGroups.current[i];
        if (!g) return;
        const t = byDelta.get(`${dn}:0`);
        g.visible = t !== undefined;
        if (t) g.position.set(t.position.x, t.position.y, t.position.z);
      });

      const targets = lightTargets(byDelta);
      objects.lights.forEach((light, i) => {
        const tg = targets[i];
        if (!tg) return;
        light.position.set(tg.x, tg.y, tg.z);
        light.intensity = tg.on ? LIGHT_INTENSITY : 0;
      });

      // Edge blockers: only where the corridor truly ends (§4.2.5) — no wall ever renders.
      const backEdge = transforms.find(
        (t) => t.slot.dfloor === 0 && t.slot.coordinate.n === -WALKABLE_BOUND,
      );
      objects.entranceVoid.visible = backEdge !== undefined;
      if (backEdge) {
        objects.entranceVoid.position.set(
          backEdge.position.x,
          backEdge.position.y,
          backEdge.position.z,
        );
      }
      const frontEdge = transforms.find(
        (t) => t.slot.dfloor === 0 && t.slot.coordinate.n === WALKABLE_BOUND,
      );
      objects.farPlug.visible = frontEdge !== undefined;
      if (frontEdge) {
        objects.farPlug.position.set(
          frontEdge.position.x,
          frontEdge.position.y,
          frontEdge.position.z,
        );
      }

      // Same-frame: the shaft impostor is phase-locked to this coordinate (§4.2.4).
      shaftRef.current?.(coordinate);
    },
    [objects, scratch],
  );

  useLayoutEffect(() => {
    rebaseRef.current = applyCoordinate;
    applyCoordinate(initialCoordinate);
    return () => {
      rebaseRef.current = null;
    };
  }, [rebaseRef, applyCoordinate, initialCoordinate]);

  return (
    <group>
      {objects.megas.map((mesh, i) => (
        <primitive key={`mega-${i}`} object={mesh} />
      ))}
      <primitive object={objects.bulbs} />
      {objects.books.map(({ group }, i) => (
        <primitive key={`books-${i}`} object={group} />
      ))}
      {objects.lights.map((light, i) => (
        <primitive key={`light-${i}`} object={light} />
      ))}
      <primitive object={objects.entranceVoid} />
      <primitive object={objects.farPlug} />
      <ShaftImpostor applyRef={shaftRef} initialCoordinate={initialCoordinate} />
      {MIRROR_DELTAS.map((dn, i) => (
        <group
          key={`mirror-${dn}`}
          ref={(g) => {
            mirrorGroups.current[i] = g;
          }}
        >
          <MirrorSurface position={MIRROR_LOCAL} rotationY={-Math.PI / 2} />
        </group>
      ))}
    </group>
  );
}
