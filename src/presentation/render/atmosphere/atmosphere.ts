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
  fogDensity: 0.18,
  toneMappingExposure: 1.0,
  ambientIntensity: 0.02,
};

/** Renderer subset we touch — keeps the seam testable and the swap narrow. */
type AtmosphereRenderer = Pick<WebGLRenderer, 'toneMapping' | 'toneMappingExposure'>;

export function applyAtmosphere(
  scene: Scene,
  renderer: AtmosphereRenderer,
  profile: AtmosphereProfile = DEFAULT_ATMOSPHERE,
): void {
  scene.background = new Color(profile.background);
  scene.fog = new FogExp2(profile.background, profile.fogDensity);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = profile.toneMappingExposure;
}
