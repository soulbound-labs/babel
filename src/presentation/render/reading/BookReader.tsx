/**
 * BookReader (§4.2/§4.3, KDD-1/3/4/5/7) — the whole reading mode, composed:
 * reticle pick → `suspend()` → the BOOK eases from its shelf transform to the
 * reading pose in front of the HELD camera (never a second camera, never a
 * scripted camera path — KDD-1) → it opens → glyphs stream line-by-line as a
 * reveal-front uniform over the memoized page buffer (KDD-4) → pages turn as
 * a spine-pivot vertex bend the glyphs ride (KDD-5) → close removes the mesh
 * and `resume()` reads back the identical pose (no phantom commit, INV-B6).
 *
 * The opened book is a SEPARATE small mesh group; the shelf instance it came
 * from is hidden via its own instance matrix and restored on close (KDD-7).
 * Determinism: no `Math.random`; `line()` is never called in `useFrame` —
 * content comes from `openPage`, memoized, computed only on open/settle.
 *
 * Input while reading: left-click = next page, right-click = previous page,
 * E = close and walk on.
 */
import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BoxGeometry,
  DoubleSide,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Quaternion,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { RefObject } from 'react';

import {
  EYE_HEIGHT,
  PAGE_FACE_HEIGHT,
  PAGE_FACE_WIDTH,
  PAGE_TEXT_MARGIN,
  READ_DISTANCE,
  READ_HEIGHT_OFFSET,
  READ_LINE_PITCH,
} from '../room/dimensions';
import { slotTransform } from '../room/instancing';
import { mustMerge } from '../room/Room';
import type { LocomotionHandle } from '../player/LocomotionController';
import {
  ATLAS_CHARS,
  createGlyphMaterial,
  createVellumMaterial,
  GLYPH_FONT_SIZE,
  GLYPH_LINE_HEIGHT,
  READING_FONT_URL,
} from './atlas';
import type { PageAddress } from './book-address';
import { openPage } from './page-content';
import { createPageUniforms, patchPageMaterial } from './page-shader';
import {
  acknowledgeIntent,
  advance,
  approachFractionOf,
  close,
  CLOSED_READER,
  open,
  retreat,
  revealFrontOf,
  tick,
  turnProgressOf,
} from './reader-state';
import type { ReaderEvent, ReaderState, ReadingPhase, SurfaceModeLike } from './reader-state';
import { GLOW_OFFSET, glowIntensityAt, READING_GLOW } from './reading-light';
import { useBookPick } from './useBookPick';
import type { BookPick } from './useBookPick';
import type { AudioBus } from '../../audio/audio-bus';
import { startPageRustle } from '../../audio/page-rustle';
import type { PageRustleHandle } from '../../audio/page-rustle';
import type { LineAddress } from '../../../domain/entities';
import { bookToSlot } from '../room/instancing';

const COVER_THICKNESS = 0.006;
const COVER_OVERHANG = 0.008;
/** Standing-on-slab tolerance — same gate as useBookPick (§4.3). */
const FLOOR_EPSILON = 0.02;
/** Leather like the shelf pool's dark tones — plain; Unit 06 owns richer bindings. */
const coverMaterial = new MeshStandardMaterial({ color: '#231710', roughness: 0.9 });

/** The closed travelling book shows its front cover (a ±x face) to the group +z. */
const CLOSED_LOCAL_YAW = Math.PI / 2;
const Q_YAW_PI = new Quaternion().setFromEuler(new Euler(0, Math.PI, 0));
const Q_YAW_NEG_HALF = new Quaternion().setFromEuler(new Euler(0, -CLOSED_LOCAL_YAW, 0));

/** Open-book covers: left board + right board + spine ridge, merged = 1 draw. */
function openCoversGeometry() {
  const w = PAGE_FACE_WIDTH + COVER_OVERHANG;
  const h = PAGE_FACE_HEIGHT + COVER_OVERHANG;
  const left = new BoxGeometry(w, h, COVER_THICKNESS);
  left.translate(-w / 2, 0, -COVER_THICKNESS);
  const right = new BoxGeometry(w, h, COVER_THICKNESS);
  right.translate(w / 2, 0, -COVER_THICKNESS);
  const spine = new BoxGeometry(0.02, h, COVER_THICKNESS * 1.6);
  spine.translate(0, 0, -COVER_THICKNESS * 1.4);
  return mustMerge([left, right, spine]);
}

/** Right/turning page: subdivided so the spine-pivot bend curves the silhouette. */
function bendablePageGeometry() {
  const geometry = new PlaneGeometry(PAGE_FACE_WIDTH, PAGE_FACE_HEIGHT, 32, 4);
  geometry.translate(PAGE_FACE_WIDTH / 2, 0, 0); // spine at x = 0
  return geometry;
}

function flatLeftPageGeometry() {
  const geometry = new PlaneGeometry(PAGE_FACE_WIDTH, PAGE_FACE_HEIGHT, 1, 1);
  geometry.translate(-PAGE_FACE_WIDTH / 2, 0, 0);
  return geometry;
}

type EndpointPose = { position: Vector3; quaternion: Quaternion };

export type BookReaderProps = {
  /** The ONE frozen camera seam, shared with LocomotionController (§4.7). */
  handleRef: RefObject<LocomotionHandle | null>;
  /** The Unit 03 bus — page rustle is "just more emitters" (§4.5). */
  audioBus?: AudioBus;
  /** The shared app-lifetime context; absent in CI/jsdom — rustle skipped. */
  audioCtx?: BaseAudioContext;
  /**
   * Pose-harness pin (§4.6, P9–P12): mount the reader open at this exact
   * phase, time frozen — approach/stream/turn driven by the phase params,
   * never wall-clock. Interaction is disabled while pinned.
   */
  pinned?: { address: LineAddress; phase: ReadingPhase };
};

export function BookReader({ handleRef, audioBus, audioCtx, pinned }: BookReaderProps) {
  const camera = useThree((s) => s.camera);

  const machineRef = useRef<ReaderState>(CLOSED_READER);
  /** Re-render trigger: open/close/page-settle only — never per frame. */
  const [display, setDisplay] = useState<PageAddress | null>(null);
  const groupRef = useRef<Group>(null);
  const closedRef = useRef<Mesh>(null);
  const openGroupRef = useRef<Group>(null);
  const pickRef = useRef<{ mesh: InstancedMesh; slot: number } | null>(null);
  const travelRef = useRef<{ start: EndpointPose; end: EndpointPose } | null>(null);
  const lightRef = useRef<PointLight>(null);
  const pinnedInitRef = useRef(false);
  const scratch = useMemo(() => ({ m: new Matrix4(), v: new Vector3(), q: new Quaternion() }), []);

  const geometries = useMemo(
    () => ({
      covers: openCoversGeometry(),
      leftPage: flatLeftPageGeometry(),
      rightPage: bendablePageGeometry(),
      closed: new RoundedBoxGeometry(1, 1, 1, 1, 0.08),
    }),
    [],
  );

  // The bent page and its glyphs SHARE the driven uniform objects
  // (uTurnProgress/uRevealFront) so one write reaches both programs — the
  // type rides the curl because both run the SAME babelBendPage (KDD-5). They
  // differ only in uXOffset: the glyph mesh sits at the text margin, so its
  // local x = 0 is PAGE_TEXT_MARGIN from the spine.
  const uniforms = useMemo(() => {
    const page = createPageUniforms({
      uPageWidth: PAGE_FACE_WIDTH,
      uLinePitch: READ_LINE_PITCH,
      uXOffset: 0, // page mesh spine at local x = 0
      uLineTop: 0,
    });
    const glyphs = createPageUniforms({
      uPageWidth: PAGE_FACE_WIDTH,
      uLinePitch: READ_LINE_PITCH,
      uXOffset: PAGE_TEXT_MARGIN,
      uLineTop: 0, // anchorY 'top' ⇒ glyph local y = 0 at the first line
    });
    glyphs.uTurnProgress = page.uTurnProgress;
    glyphs.uRevealFront = page.uRevealFront;
    return { page, glyphs };
  }, []);

  const materials = useMemo(() => {
    const leftVellum = createVellumMaterial();
    const rightVellum = createVellumMaterial();
    rightVellum.side = DoubleSide; // the turning leaf shows blank vellum from behind
    patchPageMaterial(rightVellum, uniforms.page, { bend: true, reveal: false });
    const glyphs = createGlyphMaterial();
    // Glyphs bend AND reveal; FrontSide (default) so type vanishes past 90° —
    // the leaf's back reads as blank paper, exactly right for a turned page.
    patchPageMaterial(glyphs, uniforms.glyphs, { bend: true, reveal: true });
    return { leftVellum, rightVellum, glyphs };
  }, [uniforms]);

  /** KDD-7: hide the pulled shelf instance without touching neighbours. */
  const hideShelfInstance = useCallback(
    (mesh: InstancedMesh, slot: number) => {
      scratch.m.makeScale(0, 0, 0);
      mesh.setMatrixAt(slot, scratch.m);
      mesh.instanceMatrix.needsUpdate = true;
    },
    [scratch],
  );

  const restoreShelfInstance = useCallback(
    (mesh: InstancedMesh, slot: number) => {
      const t = slotTransform(slot); // pure — the exact original matrix
      scratch.q.setFromEuler(new Euler(t.rotation.x, t.rotation.y, t.rotation.z));
      scratch.m.compose(
        scratch.v.set(t.position.x, t.position.y, t.position.z),
        scratch.q,
        new Vector3(t.scale.x, t.scale.y, t.scale.z),
      );
      mesh.setMatrixAt(slot, scratch.m);
      mesh.instanceMatrix.needsUpdate = true;
    },
    [scratch],
  );

  const surfaceMode = useCallback(
    (): SurfaceModeLike =>
      Math.abs(camera.position.y - EYE_HEIGHT) <= FLOOR_EPSILON ? 'floor' : 'stair',
    [camera],
  );

  const onPick = useCallback(
    (pick: BookPick) => {
      const next = open(machineRef.current, pick.address, pick.slot, surfaceMode());
      if (next === machineRef.current) return;
      machineRef.current = acknowledgeIntent(next);
      // KDD-1: the reader suspends walking; the camera is HELD from here on.
      handleRef.current?.suspend();
      pickRef.current = { mesh: pick.mesh, slot: pick.slot };
      hideShelfInstance(pick.mesh, pick.slot);

      // Shelf → reading-rest endpoints, both computed ONCE at open (§4.3).
      const t = slotTransform(pick.slot);
      const startQuat = new Quaternion()
        .setFromEuler(new Euler(t.rotation.x, t.rotation.y, t.rotation.z))
        .multiply(Q_YAW_NEG_HALF); // closed child carries +π/2 yaw; composite = shelf pose
      const start: EndpointPose = {
        position: new Vector3(t.position.x, t.position.y, t.position.z),
        quaternion: startQuat,
      };
      const dir = camera.getWorldDirection(new Vector3());
      const end: EndpointPose = {
        position: camera.position
          .clone()
          .addScaledVector(dir, READ_DISTANCE)
          .add(new Vector3(0, READ_HEIGHT_OFFSET, 0)),
        // Book +z faces the camera, perpendicular to the held gaze — legible.
        quaternion: camera.quaternion.clone().multiply(Q_YAW_PI),
      };
      travelRef.current = { start, end };
      setDisplay(pick.address);
    },
    [camera, handleRef, hideShelfInstance, surfaceMode],
  );

  const closeReader = useCallback(() => {
    const next = close(machineRef.current);
    if (next === machineRef.current) return;
    machineRef.current = acknowledgeIntent(next);
    const picked = pickRef.current;
    if (picked) restoreShelfInstance(picked.mesh, picked.slot);
    pickRef.current = null;
    travelRef.current = null;
    // KDD-1: the camera was never moved, so resume() reads back the identical
    // pose — zero first-frame delta, no phantom commit (INV-B6).
    handleRef.current?.resume();
    setDisplay(null);
  }, [handleRef, restoreShelfInstance]);

  useBookPick({
    enabled: useCallback(
      () => pinned === undefined && machineRef.current.status === 'closed',
      [pinned],
    ),
    coordinate: useCallback(() => handleRef.current?.state.coordinate ?? null, [handleRef]),
    onPick,
  });

  // --- Page rustle (§4.5): ONE positional emitter per reading session ---
  // Create-in-body / dispose-in-cleanup; keyed on the open/close transition
  // only (never per page turn). The ambient bed continues underneath and
  // WorldScene keeps driving setListenerPose from the held camera.
  const rustleRef = useRef<PageRustleHandle | null>(null);
  const readingOpen = display !== null;
  useEffect(() => {
    if (!readingOpen || !audioBus || !audioCtx) return;
    const at = travelRef.current?.end.position;
    const handle = startPageRustle(audioBus, audioCtx, {
      x: at?.x ?? 0,
      y: at?.y ?? 0,
      z: at?.z ?? 0,
    });
    rustleRef.current = handle;
    return () => {
      handle.dispose(); // idempotent — StrictMode double-mount safe
      rustleRef.current = null;
    };
  }, [readingOpen, audioBus, audioCtx]);

  const fireRustle = useCallback((events: ReaderEvent[], pageIndex: number) => {
    for (const event of events) {
      rustleRef.current?.rustle(event === 'turn-lift' ? 'lift' : 'settle', pageIndex);
    }
  }, []);

  // Reading-mode input (attached only while a book is up).
  useEffect(() => {
    if (display === null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (document.pointerLockElement === null) return;
      if (event.button === 0) {
        const { state, events } = advance(machineRef.current);
        machineRef.current = state;
        fireRustle(events, state.address?.page ?? 0);
      } else if (event.button === 2) {
        const { state, events } = retreat(machineRef.current);
        machineRef.current = state;
        fireRustle(events, state.address?.page ?? 0);
      }
    };
    const onContextMenu = (event: Event) => event.preventDefault();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyE') closeReader();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [display, closeReader, fireRustle]);

  useFrame((_, delta) => {
    const light = lightRef.current;

    // ── Pinned pose mode (§4.6): phase params, not wall-clock; time frozen ──
    if (pinned !== undefined) {
      if (!pinnedInitRef.current) {
        pinnedInitRef.current = true;
        // Frame 1: the LocomotionController (subscribed earlier) has applied
        // the ?pose camera; hold it forever — identical to a real read.
        handleRef.current?.suspend();
        const { wall, shelf, volume } = pinned.address;
        const slot = bookToSlot(wall, shelf, volume);
        const t = slotTransform(slot);
        const start: EndpointPose = {
          position: new Vector3(t.position.x, t.position.y, t.position.z),
          quaternion: new Quaternion()
            .setFromEuler(new Euler(t.rotation.x, t.rotation.y, t.rotation.z))
            .multiply(Q_YAW_NEG_HALF),
        };
        const dir = camera.getWorldDirection(new Vector3());
        const end: EndpointPose = {
          position: camera.position
            .clone()
            .addScaledVector(dir, READ_DISTANCE)
            .add(new Vector3(0, READ_HEIGHT_OFFSET, 0)),
          quaternion: camera.quaternion.clone().multiply(Q_YAW_PI),
        };
        travelRef.current = { start, end };
        pickRef.current = null; // shelf instance left untouched while pinned
        setDisplay(pinned.address);
      }
      const travel = travelRef.current;
      const group = groupRef.current;
      const f = pinned.phase.approach ?? 1;
      if (group && travel) {
        group.position.lerpVectors(travel.start.position, travel.end.position, f);
        group.quaternion.slerpQuaternions(travel.start.quaternion, travel.end.quaternion, f);
        if (light) {
          light.position.copy(group.position);
          light.position.y += GLOW_OFFSET.y;
          light.position.z += GLOW_OFFSET.z;
          light.intensity = glowIntensityAt(f);
        }
      }
      const approachingPinned = f < 1;
      if (closedRef.current) closedRef.current.visible = approachingPinned;
      if (openGroupRef.current) openGroupRef.current.visible = !approachingPinned;
      uniforms.page.uRevealFront.value = approachingPinned ? 0 : (pinned.phase.revealedLines ?? 40);
      uniforms.page.uTurnProgress.value = pinned.phase.turnProgress ?? 0;
      return;
    }

    const before = machineRef.current;
    if (before.status === 'closed') {
      if (light) light.intensity = 0;
      return;
    }
    const { state, events } = tick(before, delta);
    machineRef.current = state;
    fireRustle(events, state.address?.page ?? 0);

    // Arrived at the reading rest: pin the session emitter to the settled pose.
    if (before.status === 'approaching' && state.status === 'open') {
      const at = travelRef.current?.end.position;
      if (at) rustleRef.current?.reposition({ x: at.x, y: at.y, z: at.z });
    }

    // Page settle → recompute content (the ONLY content trigger besides open).
    if (state.address !== null && display !== null && state.address.page !== display.page) {
      setDisplay(state.address);
    }

    const group = groupRef.current;
    const travel = travelRef.current;
    if (group && travel) {
      const f = approachFractionOf(state);
      group.position.lerpVectors(travel.start.position, travel.end.position, f);
      group.quaternion.slerpQuaternions(travel.start.quaternion, travel.end.quaternion, f);
      // The reading glow rides the book and lights up over the ease (KDD-8);
      // steady at rest, never flickering.
      if (light) {
        light.position.copy(group.position);
        light.position.y += GLOW_OFFSET.y;
        light.position.z += GLOW_OFFSET.z;
        light.intensity = glowIntensityAt(f);
      }
    }
    const approaching = state.status === 'approaching';
    if (closedRef.current) closedRef.current.visible = approaching;
    if (openGroupRef.current) openGroupRef.current.visible = !approaching;

    // One write each — shared by reference into both patched programs.
    uniforms.page.uRevealFront.value = revealFrontOf(state);
    uniforms.page.uTurnProgress.value = turnProgressOf(state);
  });

  // Content: assembled once per (address, page) via the memoized openPage —
  // never in useFrame, never per reveal step (KDD-4, INV-B5).
  const pageText = useMemo(() => {
    if (display === null) return '';
    return openPage(display)
      .map((row) => row.join(''))
      .join('\n');
  }, [display]);

  const closedScale = useMemo(() => {
    const slot =
      pinned !== undefined
        ? bookToSlot(pinned.address.wall, pinned.address.shelf, pinned.address.volume)
        : pickRef.current?.slot;
    if (slot === undefined || display === null) return new Vector3(1, 1, 1);
    const t = slotTransform(slot);
    return new Vector3(t.scale.x, t.scale.y, t.scale.z);
  }, [display, pinned]);

  return (
    <>
      <GlyphPrewarm />
      {/* Permanently mounted (intensity 0 when closed): constant light count
          ⇒ no shader relink at book-open. The one declared mood knob (KDD-8). */}
      <pointLight
        ref={lightRef}
        color={READING_GLOW.color}
        intensity={0}
        distance={READING_GLOW.distance}
        decay={READING_GLOW.decay}
      />
      {display !== null && (
        <group ref={groupRef}>
          <mesh
            ref={closedRef}
            geometry={geometries.closed}
            material={coverMaterial}
            rotation={[0, CLOSED_LOCAL_YAW, 0]}
            scale={closedScale}
          />
          <group ref={openGroupRef} visible={false}>
            <mesh geometry={geometries.covers} material={coverMaterial} />
            <mesh geometry={geometries.leftPage} material={materials.leftVellum} />
            <mesh geometry={geometries.rightPage} material={materials.rightVellum} />
            <Text
              font={READING_FONT_URL}
              fontSize={GLYPH_FONT_SIZE}
              lineHeight={GLYPH_LINE_HEIGHT}
              anchorX="left"
              anchorY="top"
              whiteSpace="nowrap"
              material={materials.glyphs}
              position={[PAGE_TEXT_MARGIN, PAGE_FACE_HEIGHT / 2 - PAGE_TEXT_MARGIN, 0.0015]}
            >
              {pageText}
            </Text>
          </group>
        </group>
      )}
    </>
  );
}

/**
 * Hidden pre-warm text (§4.2/FMEA #3): mounts all 29 glyphs once so troika's
 * SDF worker generates the full atlas before any book opens. Invisible ⇒ no
 * draw call.
 */
export function GlyphPrewarm({ onReady }: { onReady?: () => void } = {}) {
  return (
    <Text
      font={READING_FONT_URL}
      fontSize={GLYPH_FONT_SIZE}
      visible={false}
      onSync={() => onReady?.()}
    >
      {ATLAS_CHARS}
    </Text>
  );
}
