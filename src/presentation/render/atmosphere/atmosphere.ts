/**
 * Atmosphere hook (§4.8) — the ONE module that owns background color, fog,
 * and tone mapping. Tuned during the Phase-6 mood pass, then locked.
 *
 * Unit 06's volumetric upgrade replaces this module's IMPLEMENTATION behind
 * the same exported surface (`AtmosphereProfile` + `applyAtmosphere`) — no
 * other file changes. The depth-driven tint/fog curve (§7.6) would also land
 * here, later.
 */
import { ACESFilmicToneMapping, Color, FogExp2 } from 'three';
import type { Scene, WebGLRenderer } from 'three';

export type AtmosphereProfile = {
  /** Near-black background — every sightline must terminate in fog or geometry. */
  background: string;
  /** Fog tint — slightly lighter than the background so the murk itself reads. */
  fogColor: string;
  /** FogExp2 density. Aggressive by design: darkness and fog are the budget's best friends (C3). */
  fogDensity: number;
  /** ACES exposure — tuned once here, never per-material. */
  toneMappingExposure: number;
  /** Floor ambient so blacks roll off instead of clipping. */
  ambientIntensity: number;
};

/** Mood-gate starting point (§7.1). Tune ONLY here + Bulbs.tsx during Phase 6. */
export const DEFAULT_ATMOSPHERE: AtmosphereProfile = {
  background: '#050507',
  fogColor: '#0b0a10',
  fogDensity: 0.16,
  toneMappingExposure: 1.3,
  ambientIntensity: 0.05,
};

/**
 * Edge-fog ramp (§4.4) — the ONLY new mood knob this unit adds. Density thickens
 * as the player nears the ±64 walkable bound so the world dissolves into murk
 * instead of hitting a visible terminator. Width is in rooms/floors; max density
 * is live-tunable at the mood gate. `fogColor`/`toneMappingExposure`/ambient/
 * background never modulate — only `fogDensity` (see the identity clause below).
 */
export const RAMP = {
  /** Distance-to-edge (rooms or floors) at which the ramp begins; 0 = the edge itself. */
  width: 4,
  /** Peak `FogExp2` density at the edge — DEFAULT is the floor, this is the ceiling. */
  maxDensity: 0.32,
  /**
   * Fog tint at the very edge (§4.4, Rei's Phase-7 direction). The interior fog
   * is near-black (`#0b0a10`), so denser fog alone just goes to black and reads
   * as a wall; ramping the tint toward this cool dim grey makes the edge
   * dissolve into a visible glowing MURK instead. Live-tunable at the gate.
   */
  edgeFogColor: '#262735',
} as const;

/**
 * The atmosphere at a coordinate's distance from the two edges (§4.4). Pure and
 * position-deterministic: at rest at coordinate X, the profile is exactly f(X)
 * every session. `FogExp2` is scene-global, so this is whole-scene fog as a
 * function of the player coordinate — not spatially local fog.
 *
 * Identity clause (MUST): outside the ramp zone the result is byte-identical to
 * `DEFAULT_ATMOSPHERE`, so every Unit 03 pose is unaffected. Only the FOG
 * (density + color) ramps; `background`, `toneMappingExposure`, and
 * `ambientIntensity` never modulate. `distanceToEdge*` are the min over the
 * near/far edge, in rooms/floors (converted to small `number` by the caller).
 */
export function atmosphereAt(
  distanceToEdgeRooms: number,
  distanceToEdgeFloors: number,
): AtmosphereProfile {
  const nearest = Math.min(distanceToEdgeRooms, distanceToEdgeFloors);
  if (nearest >= RAMP.width) return DEFAULT_ATMOSPHERE; // identity: interior is untouched
  // Linear ramp from the default floor (at width) to the ceiling (at the edge).
  const t = clamp01((RAMP.width - nearest) / RAMP.width);
  const fogDensity =
    DEFAULT_ATMOSPHERE.fogDensity + t * (RAMP.maxDensity - DEFAULT_ATMOSPHERE.fogDensity);
  const fogColor = lerpHexColor(DEFAULT_ATMOSPHERE.fogColor, RAMP.edgeFogColor, t);
  return { ...DEFAULT_ATMOSPHERE, fogDensity, fogColor };
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** Per-channel linear blend a→b by t ∈ [0,1], back to `#rrggbb`. */
function lerpHexColor(a: string, b: string, t: number): string {
  const ca = parseHexColor(a);
  const cb = parseHexColor(b);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * t);
  return (
    '#' +
    [ch(ca.r, cb.r), ch(ca.g, cb.g), ch(ca.b, cb.b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Renderer subset we touch — keeps the seam testable and the swap narrow. */
type AtmosphereRenderer = Pick<WebGLRenderer, 'toneMapping' | 'toneMappingExposure'>;

export function applyAtmosphere(
  scene: Scene,
  renderer: AtmosphereRenderer,
  profile: AtmosphereProfile = DEFAULT_ATMOSPHERE,
): void {
  scene.background = new Color(profile.background);
  scene.fog = new FogExp2(profile.fogColor, profile.fogDensity);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = profile.toneMappingExposure;
}
