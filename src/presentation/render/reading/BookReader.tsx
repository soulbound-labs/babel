/**
 * BookReader (§4.2/§4.3, KDD-1/3/4/5/7) — the whole reading mode, composed:
 * reticle pick → `suspend()` → the BOOK eases from its shelf transform to the
 * reading pose in front of the HELD camera (never a second camera, never a
 * scripted camera path — KDD-1) → it opens → glyphs stream line-by-line as a
 * reveal-front uniform over the memoized page buffer, both leaves in parallel
 * (KDD-4) → pages turn as a spine-pivot vertex bend the glyphs ride, refused
 * until the stream completes (§4.4) → close removes the mesh
 * and `resume()` reads back the identical pose (no phantom commit, INV-B6).
 *
 * The opened book is a SEPARATE small mesh group; the shelf instance it came
 * from is hidden via its own instance matrix and restored on close (KDD-7).
 * Determinism: no `Math.random`; `line()` is never called in `useFrame` —
 * content comes from `openPage`, memoized, computed only on open/settle.
 *
 * Input while reading: left-click = next page, right-click = previous page,
 * Q = close and walk on — a plain keydown, so the pointer lock never drops
 * and navigation resumes instantly. Esc is NOT a close key: it is the
 * browser's own pointer-lock exit (unpreventable, no reliable keydown, and
 * the lock can't be programmatically re-acquired afterwards), so Esc simply
 * pauses to the overlay's splash like anywhere else — the book stays open
 * and reading continues after "Click to Continue".
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
  BOOK_PAGES,
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
import { isPointerLocked, isTouchPrimary } from '../../input/capabilities';
import { classifySwipe } from '../../input/gestures';
import type { TouchTracePoint } from '../../input/gestures';
import {
  ATLAS_CHARS,
  createGlyphMaterial,
  createVellumMaterial,
  GLYPH_FONT_SIZE,
  GLYPH_LINE_HEIGHT,
  READING_FONT_URL,
} from './atlas';
import type { PageAddress } from './book-address';
import { toRoman } from './folio';
import { openPage } from './page-content';
import { createPageUniforms, patchPageMaterial } from './page-shader';
import { REVEAL_LINES } from './reveal';
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
import { resolveBookAddress } from './book-address';
import { useBookHover } from './useBookHover';
import { useBookProximityGlow } from './useBookProximityGlow';
import { findCurrentRoomBookMesh, useBookPick } from './useBookPick';
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
/** Folios read as small furniture, not body type. */
const FOLIO_FONT_SIZE = GLYPH_FONT_SIZE * 0.8;
/**
 * Folio bottom edge: the 40-line glyph block ends exactly one margin above the
 * page's bottom edge, so the folio drops INTO the bottom vellum margin —
 * vertically centred in that band, clear of the last line of body text.
 */
const FOLIO_Y = -PAGE_FACE_HEIGHT / 2 + (PAGE_TEXT_MARGIN - FOLIO_FONT_SIZE) / 2;
/** Leather like the shelf pool's dark tones — plain; Unit 06 owns richer bindings. */
const coverMaterial = new MeshStandardMaterial({ color: '#231710', roughness: 0.9 });

/** The closed travelling book shows its front cover (a ±x face) to the group +z. */
const CLOSED_LOCAL_YAW = Math.PI / 2;
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
  /**
   * Reading-mode seam to the DOM HUD (mobile spec §3.3): populated with
   * `closeReader` while a book is open, null otherwise — the ✕ button routes
   * through the SAME close ordering (INV-B6), never a parallel path.
   */
  closeRef?: RefObject<(() => void) | null>;
  /**
   * The touch OPEN seam (the ✕'s mirror): populated with "open the glowing
   * book" while the reader is closed, null while open. The HUD's READ button
   * routes through this — canvas taps NEVER open a book (two on-device rounds
   * proved tap-the-world unfixable in a room papered with books).
   */
  openRef?: RefObject<(() => void) | null>;
  /** Open/close transitions only — the HUD swaps joystick ↔ ✕ on this. */
  onReadingChange?: (open: boolean) => void;
  /** Glow transitions (true while a slot glows) — the HUD shows READ on this. */
  onGlowChange?: (active: boolean) => void;
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

export function BookReader({
  handleRef,
  closeRef,
  openRef,
  onReadingChange,
  onGlowChange,
  audioBus,
  audioCtx,
  pinned,
}: BookReaderProps) {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);

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

  // Both glyph blocks SHARE the one driven reveal front (uRevealFront, 0..40)
  // AND the same uLineStart of 0: the front sweeps BOTH leaves in parallel —
  // line k resolves on the left and the right page together. The right block
  // also shares the page's uTurnProgress so the type rides the curl of the
  // turning leaf (KDD-5); the left leaf is flat, so it neither bends nor needs
  // it. Glyph local x = 0 sits PAGE_TEXT_MARGIN from each leaf's spine
  // (uXOffset), so the bend axis lines up with the vellum.
  const uniforms = useMemo(() => {
    const page = createPageUniforms({
      uPageWidth: PAGE_FACE_WIDTH,
      uLinePitch: READ_LINE_PITCH,
      uXOffset: 0, // page mesh spine at local x = 0
      uLineTop: 0,
    });
    const glyphLeft = createPageUniforms({
      uPageWidth: PAGE_FACE_WIDTH,
      uLinePitch: READ_LINE_PITCH,
      uLineTop: 0, // anchorY 'top' ⇒ glyph local y = 0 at the first line
      uLineStart: 0, // both leaves stream the shared front's lines 0..39
    });
    const glyphRight = createPageUniforms({
      uPageWidth: PAGE_FACE_WIDTH,
      uLinePitch: READ_LINE_PITCH,
      uXOffset: PAGE_TEXT_MARGIN,
      uLineTop: 0,
      uLineStart: 0, // in parallel with the left leaf, not after it
    });
    glyphLeft.uRevealFront = page.uRevealFront;
    glyphRight.uTurnProgress = page.uTurnProgress;
    glyphRight.uRevealFront = page.uRevealFront;
    // Right-leaf folio: bends with the turning leaf (shares uTurnProgress) but
    // never reveals — its spine axis sits at the OUTER edge, so uXOffset places
    // the anchorX="right" folio's distance-from-spine correctly (turn.ts:
    // r = pos.x + uXOffset).
    const folio = createPageUniforms({
      uPageWidth: PAGE_FACE_WIDTH,
      uXOffset: PAGE_FACE_WIDTH - PAGE_TEXT_MARGIN,
    });
    folio.uTurnProgress = page.uTurnProgress;
    return { page, glyphLeft, glyphRight, folio };
  }, []);

  const materials = useMemo(() => {
    const leftVellum = createVellumMaterial();
    const rightVellum = createVellumMaterial();
    rightVellum.side = DoubleSide; // the turning leaf shows blank vellum from behind
    patchPageMaterial(rightVellum, uniforms.page, { bend: true, reveal: false });
    // FrontSide (default) so type vanishes past 90° — the turned leaf's back
    // reads as blank paper. Only the right leaf turns, so only it bends.
    const leftGlyphs = createGlyphMaterial();
    patchPageMaterial(leftGlyphs, uniforms.glyphLeft, { bend: false, reveal: true });
    const rightGlyphs = createGlyphMaterial();
    patchPageMaterial(rightGlyphs, uniforms.glyphRight, { bend: true, reveal: true });
    // Folios: always visible (reveal off). Left leaf is flat; the right rides
    // the turning leaf's bend.
    const leftFolio = createGlyphMaterial();
    const rightFolio = createGlyphMaterial();
    patchPageMaterial(rightFolio, uniforms.folio, { bend: true, reveal: false });
    return { leftVellum, rightVellum, leftGlyphs, rightGlyphs, leftFolio, rightFolio };
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
        // The page front (+z, where the FrontSide glyphs + left vellum live)
        // must face the reader: the camera looks down its local -z, so its
        // local +z already points back at the eye. Copying camera.quaternion
        // aims the spread's +z at the reader — legible, glyphs unculled. (A
        // yaw-π flip here would face the spread AWAY: the reader would see the
        // glow-lit BACK of the vellum with the FrontSide type culled.)
        quaternion: camera.quaternion.clone(),
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

  // Live precisely when a click would open a book: not pinned, reader closed.
  const interactionEnabled = useCallback(
    () => pinned === undefined && machineRef.current.status === 'closed',
    [pinned],
  );

  const liveCoordinate = useCallback(
    () => handleRef.current?.state.coordinate ?? null,
    [handleRef],
  );

  useBookPick({
    enabled: interactionEnabled,
    coordinate: liveCoordinate,
    onPick,
  });

  // The reticle "invisible pointer" highlight: the book a click would open
  // lights up a little (shares the pick's gate exactly).
  useBookHover({ enabled: interactionEnabled });

  // Touch OPEN path: the proximity glow selects the slot, the HUD's READ
  // button (via openRef) opens exactly that slot. Canvas taps never open —
  // in a room papered with books every stray touch raycasts into a shelf,
  // and two on-device rounds showed no tap gate survives that geometry.
  const glowSlotRef = useRef<number | null>(null);
  const handleGlowChange = useCallback(
    (slot: number | null) => {
      glowSlotRef.current = slot;
      onGlowChange?.(slot !== null);
    },
    [onGlowChange],
  );

  // Touch twin of the hover (mobile spec §3.3): nearest-facing proximity glow,
  // touch-primary + pose-inert by construction — never lit on the capture rig.
  useBookProximityGlow({ enabled: interactionEnabled, onGlowChange: handleGlowChange });

  // The READ open body: same gates as a pick (M-2 lock-null side, floor,
  // live coordinate, reader closed) resolved for the GLOWING slot — glow and
  // action cannot disagree, and both ride the one resolveBookAddress pipeline.
  const openGlowingBook = useCallback(() => {
    if (isPointerLocked()) return; // touch side only (M-2)
    if (!interactionEnabled()) return;
    if (surfaceMode() !== 'floor') return; // §4.3 floor gate
    const slot = glowSlotRef.current;
    if (slot === null) return;
    const liveCoord = liveCoordinate();
    if (liveCoord === null) return;
    const mesh = findCurrentRoomBookMesh(scene);
    if (mesh === null) return;
    const address = resolveBookAddress(liveCoord, { dn: 0, dfloor: 0 }, slot);
    if (address === null) return;
    onPick({ address, slot, mesh });
  }, [interactionEnabled, liveCoordinate, onPick, scene, surfaceMode]);

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

  // The two turn bodies, shared by desktop clicks AND touch swipes (mobile
  // spec §3.3) — touch turns must not be silent, so the rustle lives here.
  const turnNext = useCallback(() => {
    const { state, events } = advance(machineRef.current);
    machineRef.current = state;
    fireRustle(events, state.address?.page ?? 0);
  }, [fireRustle]);
  const turnPrev = useCallback(() => {
    const { state, events } = retreat(machineRef.current);
    machineRef.current = state;
    fireRustle(events, state.address?.page ?? 0);
  }, [fireRustle]);

  // Reading-mode seam to the DOM HUD (mobile spec §3.3): the ✕ routes through
  // closeReader's exact ordering; the open/close signal swaps joystick ↔ ✕.
  const readingOpenNow = display !== null;
  useEffect(() => {
    if (closeRef) closeRef.current = readingOpenNow ? closeReader : null;
    if (openRef) openRef.current = readingOpenNow ? null : openGlowingBook;
    onReadingChange?.(readingOpenNow);
    return () => {
      if (closeRef) closeRef.current = null;
      if (openRef) openRef.current = null;
    };
  }, [closeRef, openRef, onReadingChange, readingOpenNow, closeReader, openGlowingBook]);

  // Reading-mode input (attached only while a book is up).
  useEffect(() => {
    if (display === null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!isPointerLocked()) return; // never `=== null` — undefined on iOS reads as locked
      if (event.button === 0) {
        turnNext();
      } else if (event.button === 2) {
        turnPrev();
      }
    };
    const onContextMenu = (event: Event) => event.preventDefault();
    // Q closes (E1-consistent: only while locked). Deliberately NOT Esc — that
    // is the browser's lock exit and pauses to the splash instead (see header).
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPointerLocked()) return;
      if (event.code === 'KeyQ') closeReader();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [display, turnNext, turnPrev, closeReader]);

  // Touch page turns (mobile spec §3.3): swipes on the canvas element while a
  // book is up. A recognized swipe fires advance/retreat EXACTLY once; the
  // bend animates on the machine clock — never finger-scrubbed. Refused
  // swipes (mid-stream, at bounds) get no feedback: the pure functions'
  // refusal IS the contract. While the splash is visible it covers the
  // canvas, so no swipe reaches these listeners (structural gate).
  useEffect(() => {
    if (display === null || pinned !== undefined) return;
    if (!isTouchPrimary()) return;
    const canvas = gl.domElement;
    const traces = new Map<number, TouchTracePoint[]>();
    const point = (e: PointerEvent): TouchTracePoint => ({
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
    });
    const onPointerDown = (e: PointerEvent) => {
      if (isPointerLocked()) return; // M-2: touch is unlocked-side only
      traces.set(e.pointerId, [point(e)]);
    };
    const onPointerMove = (e: PointerEvent) => {
      traces.get(e.pointerId)?.push(point(e));
    };
    const onPointerUp = (e: PointerEvent) => {
      const trace = traces.get(e.pointerId);
      traces.delete(e.pointerId);
      if (!trace) return;
      trace.push(point(e));
      if (isPointerLocked()) return;
      const swipe = classifySwipe(trace);
      if (swipe === 'left') turnNext();
      else if (swipe === 'right') turnPrev();
    };
    const onPointerCancel = (e: PointerEvent) => {
      traces.delete(e.pointerId); // no stuck half-gesture (§3.3)
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') traces.clear();
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [display, pinned, gl, turnNext, turnPrev]);

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
          // Page front (+z) faces the reader — see the onPick end pose.
          quaternion: camera.quaternion.clone(),
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
      uniforms.page.uRevealFront.value = approachingPinned
        ? 0
        : (pinned.phase.revealedLines ?? REVEAL_LINES);
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

  // Content: BOTH leaves of the spread assembled once per address via the
  // memoized openPage — the left leaf is `page`, the right leaf `page + 1`.
  // Never in useFrame, never per reveal step (KDD-4, INV-B5).
  const leftPageText = useMemo(() => {
    if (display === null) return '';
    return openPage(display)
      .map((row) => row.join(''))
      .join('\n');
  }, [display]);
  const rightPageText = useMemo(() => {
    if (display === null || display.page + 1 >= BOOK_PAGES) return '';
    return openPage({ ...display, page: display.page + 1 })
      .map((row) => row.join(''))
      .join('\n');
  }, [display]);

  // Folios: 1-based roman numerals at the bottom-outer corners. The right folio
  // is blank whenever its leaf is (same guard as rightPageText).
  const leftFolioText = useMemo(
    () => (display === null ? '' : toRoman(display.page + 1)),
    [display],
  );
  const rightFolioText = useMemo(
    () => (display === null || display.page + 1 >= BOOK_PAGES ? '' : toRoman(display.page + 2)),
    [display],
  );

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
            {/* Left leaf (page N): its spine is at x = 0, so the text block
                starts a margin in from the leaf's outer edge (-PAGE_FACE_WIDTH). */}
            <Text
              font={READING_FONT_URL}
              fontSize={GLYPH_FONT_SIZE}
              lineHeight={GLYPH_LINE_HEIGHT}
              anchorX="left"
              anchorY="top"
              whiteSpace="nowrap"
              material={materials.leftGlyphs}
              position={[
                -PAGE_FACE_WIDTH + PAGE_TEXT_MARGIN,
                PAGE_FACE_HEIGHT / 2 - PAGE_TEXT_MARGIN,
                0.0015,
              ]}
            >
              {leftPageText}
            </Text>
            {/* Right leaf (page N+1): the turning leaf; its glyphs bend + reveal. */}
            <Text
              font={READING_FONT_URL}
              fontSize={GLYPH_FONT_SIZE}
              lineHeight={GLYPH_LINE_HEIGHT}
              anchorX="left"
              anchorY="top"
              whiteSpace="nowrap"
              material={materials.rightGlyphs}
              position={[PAGE_TEXT_MARGIN, PAGE_FACE_HEIGHT / 2 - PAGE_TEXT_MARGIN, 0.0015]}
            >
              {rightPageText}
            </Text>
            {/* Left folio: bottom-left (outer) corner of the flat left leaf. */}
            <Text
              font={READING_FONT_URL}
              fontSize={FOLIO_FONT_SIZE}
              anchorX="left"
              anchorY="bottom"
              whiteSpace="nowrap"
              material={materials.leftFolio}
              position={[-PAGE_FACE_WIDTH + PAGE_TEXT_MARGIN, FOLIO_Y, 0.0015]}
            >
              {leftFolioText}
            </Text>
            {/* Right folio: bottom-right (outer) corner; rides the turning leaf's
                bend, anchored to the outer edge (uXOffset = outer edge). */}
            <Text
              font={READING_FONT_URL}
              fontSize={FOLIO_FONT_SIZE}
              anchorX="right"
              anchorY="bottom"
              whiteSpace="nowrap"
              material={materials.rightFolio}
              position={[PAGE_FACE_WIDTH - PAGE_TEXT_MARGIN, FOLIO_Y, 0.0015]}
            >
              {rightFolioText}
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
