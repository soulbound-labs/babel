/**
 * The bulbs (§4.8) — the whole lighting story. Emissive spheres, two placed
 * transversally in the hexagon plus one in the vestibule (Borges: "the light
 * they emit is insufficient, unceasing"), each with a warm low PointLight,
 * decay 2, no shadow maps (C3), no flicker (C4 — captures stay deterministic).
 * Tune ONLY here + atmosphere.ts during the Phase-6 mood pass.
 */
import { HEX_APOTHEM } from './dimensions';
import type { Vec3 } from './instancing';

const BULB_HEIGHT = 1.85;
const BULB_OFFSET = 1.15; // transversal: perpendicular to the door (z) axis
const BULB_RADIUS = 0.09;
const BULB_COLOR = '#ffd9a0';
const LIGHT_INTENSITY = 3.2; // insufficient by design — but the room must still read
const LIGHT_DISTANCE = 7; // reaches through the doorways: shaft railing + vestibule catch spill

/** Frozen bulb positions — the positional audio hums (§4.6) sit exactly here.
 * Two transversal in the hexagon (Borges) + one in the vestibule hallway,
 * clear of the stairwell opening. */
export const BULB_POSITIONS: readonly Vec3[] = [
  { x: -BULB_OFFSET, y: BULB_HEIGHT, z: 0 },
  { x: BULB_OFFSET, y: BULB_HEIGHT, z: 0 },
  { x: 0, y: BULB_HEIGHT, z: -(HEX_APOTHEM + 0.55) },
];

export function Bulbs() {
  return (
    <group>
      {BULB_POSITIONS.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]}>
          <mesh>
            <sphereGeometry args={[BULB_RADIUS, 12, 8]} />
            <meshBasicMaterial color={BULB_COLOR} />
          </mesh>
          <pointLight
            color={BULB_COLOR}
            intensity={LIGHT_INTENSITY}
            distance={LIGHT_DISTANCE}
            decay={2}
          />
        </group>
      ))}
    </group>
  );
}
