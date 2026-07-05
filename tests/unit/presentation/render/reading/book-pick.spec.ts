import { describe, expect, it } from 'vitest';
import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  Vector2,
} from 'three';

import { ORIGIN } from '@/domain/entities';
import { castBookPick, findCurrentRoomBookMesh } from '@/presentation/render/reading/useBookPick';
import { isIntendedPick, tapToNdc } from '@/presentation/render/reading/useBookTapPick';

/**
 * INV-B1 pinned through the castBookPick extraction: the ray set is the
 * current room's book mesh ONLY — a neighbor's mesh dead ahead through a
 * doorway is simply not castable. Node-run three (pure math, no WebGL).
 */
function bookMesh(at: { x: number; y: number; z: number }): InstancedMesh {
  const geometry = new BoxGeometry(0.3, 0.3, 0.3);
  geometry.computeBoundingSphere();
  const mesh = new InstancedMesh(geometry, new MeshBasicMaterial(), 1);
  mesh.setMatrixAt(0, new Matrix4().makeTranslation(at.x, at.y, at.z));
  return mesh;
}

function roomGroup(
  mesh: InstancedMesh,
  userData: { roomKey?: string; dn?: number; dfloor?: number },
): Group {
  const group = new Group();
  group.userData = userData;
  group.add(mesh);
  return group;
}

function eyeCamera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(62, 16 / 9, 0.05, 60);
  camera.position.set(0, 1.7, 0);
  camera.updateMatrixWorld(true);
  return camera;
}

describe('castBookPick (INV-B1: current-room mesh only)', () => {
  it('hits the current-room instance dead ahead and resolves its slot', () => {
    const scene = new Scene();
    const current = bookMesh({ x: 0, y: 1.7, z: -2 });
    scene.add(roomGroup(current, { roomKey: '0,0', dn: 0, dfloor: 0 }));
    scene.updateMatrixWorld(true);

    const pick = castBookPick(new Vector2(0, 0), eyeCamera(), scene, ORIGIN);
    expect(pick).not.toBeNull();
    expect(pick?.slot).toBe(0);
    expect(pick?.mesh).toBe(current);
    expect(pick?.address).toMatchObject({ n: 0n, floor: 0n, page: 0, line: 0 });
  });

  it('a neighbor-room mesh dead ahead yields null — it is not in the ray set', () => {
    const scene = new Scene();
    // Neighbor directly on the ray; the current room's mesh far off-axis.
    scene.add(roomGroup(bookMesh({ x: 0, y: 1.7, z: -2 }), { roomKey: '1,0', dn: 1, dfloor: 0 }));
    scene.add(roomGroup(bookMesh({ x: 8, y: 1.7, z: -2 }), { roomKey: '0,0', dn: 0, dfloor: 0 }));
    scene.updateMatrixWorld(true);

    expect(castBookPick(new Vector2(0, 0), eyeCamera(), scene, ORIGIN)).toBeNull();
  });

  it('no current-room mesh in the scene yields null', () => {
    const scene = new Scene();
    scene.add(roomGroup(bookMesh({ x: 0, y: 1.7, z: -2 }), { roomKey: '1,0', dn: 1, dfloor: 0 }));
    scene.updateMatrixWorld(true);

    expect(castBookPick(new Vector2(0, 0), eyeCamera(), scene, ORIGIN)).toBeNull();
    expect(findCurrentRoomBookMesh(scene)).toBeNull();
  });

  it('an off-center NDC ray picks the instance sitting on that ray', () => {
    const scene = new Scene();
    const camera = eyeCamera();
    // Place the box up-right of center; compute its exact NDC via projection.
    const current = bookMesh({ x: 0.8, y: 2.3, z: -2 });
    scene.add(roomGroup(current, { roomKey: '0,0', dn: 0, dfloor: 0 }));
    scene.updateMatrixWorld(true);

    expect(castBookPick(new Vector2(0, 0), camera, scene, ORIGIN)).toBeNull(); // center misses
    // Exact: project the instance center through the camera.
    const projected = current.position.clone().set(0.8, 2.3, -2).project(camera);
    const hit = castBookPick(new Vector2(projected.x, projected.y), camera, scene, ORIGIN);
    expect(hit).not.toBeNull();
    expect(hit?.slot).toBe(0);
  });
});

describe('isIntendedPick (the tap opens ONLY the glowing book)', () => {
  // Eye at origin looking down -z; slot 3 is the nearest facing candidate.
  const pose = { position: { x: 0, y: 1.7, z: 0 }, forward: { x: 0, y: 0, z: -1 } };
  const slots = [
    { slot: 3, position: { x: 0.2, y: 1.7, z: -1.5 } }, // glowing: nearest, in front
    { slot: 9, position: { x: -0.4, y: 1.7, z: -2.8 } }, // in front but farther
    { slot: 12, position: { x: 0, y: 1.7, z: 2 } }, // behind
  ];

  it('accepts a tap that lands on the glowing (nearest-facing) slot', () => {
    expect(isIntendedPick({ slot: 3 }, pose, slots)).toBe(true);
  });

  it('refuses a tap on any other book — no more stray-touch openings', () => {
    expect(isIntendedPick({ slot: 9 }, pose, slots)).toBe(false);
    expect(isIntendedPick({ slot: 12 }, pose, slots)).toBe(false);
  });

  it('refuses every tap when nothing is in glow range (no intended slot)', () => {
    const farPose = { position: { x: 0, y: 1.7, z: 50 }, forward: { x: 0, y: 0, z: -1 } };
    expect(isIntendedPick({ slot: 3 }, farPose, slots)).toBe(false);
  });
});

describe('tapToNdc (exact at center and corners)', () => {
  const rect = { left: 40, top: 20, width: 800, height: 600 };

  it('maps the rect center to exactly (0, 0)', () => {
    expect(tapToNdc(40 + 400, 20 + 300, rect)).toEqual({ x: 0, y: 0 });
  });

  it('maps the four corners to exactly (±1, ±1)', () => {
    expect(tapToNdc(40, 20, rect)).toEqual({ x: -1, y: 1 }); // top-left
    expect(tapToNdc(40 + 800, 20, rect)).toEqual({ x: 1, y: 1 }); // top-right
    expect(tapToNdc(40, 20 + 600, rect)).toEqual({ x: -1, y: -1 }); // bottom-left
    expect(tapToNdc(40 + 800, 20 + 600, rect)).toEqual({ x: 1, y: -1 }); // bottom-right
  });
});
