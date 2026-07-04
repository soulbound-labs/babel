/**
 * Page shader glue (§4.4, KDD-5) — the shared vertex-bend + reveal-front GLSL
 * injection for BOTH the vellum page mesh and troika's glyph material, so the
 * type rides the curl and clips on the reveal front. Injection is plain string
 * surgery in `onBeforeCompile` driven by two uniforms (`uTurnProgress`,
 * `uRevealFront`) — deterministic, settable to exact values for captures.
 *
 * Anchor strategy (FMEA #9 hedge): primary anchor is three's
 * `#include <begin_vertex>` / `#include <color_fragment>` chunks; if a derived
 * material (troika) has already consumed a token, fall back to
 * `#include <project_vertex>` / `void main() {`. `injectPageShader` reports
 * whether it landed so the caller can warn instead of failing silently. If the
 * drei `<Text>` surface proves un-injectable live, the documented break-glass
 * is a direct `troika-three-text@^0.52.4` dep + `createDerivedMaterial`
 * (KDD-9) — not attempted unless proven needed.
 */
import type { Material } from 'three';

import { PAGE_BEND_GLSL } from './turn';

/** The mutable shader bag three hands to `onBeforeCompile`. */
export type ShaderLike = {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { value: unknown }>;
};

export type PageUniforms = {
  uTurnProgress: { value: number };
  uPageWidth: { value: number };
  uXOffset: { value: number };
  uRevealFront: { value: number };
  uLineTop: { value: number };
  uLinePitch: { value: number };
  /** This block's first global line index — 0 (left leaf) or 40 (right leaf). */
  uLineStart: { value: number };
};

export type PageShaderOptions = {
  /** Inject the spine-pivot vertex bend (the turning leaf + its glyphs). */
  bend: boolean;
  /** Inject the reveal-front line clip/fade (glyph material only). */
  reveal: boolean;
};

export function createPageUniforms(
  init?: Partial<Record<keyof PageUniforms, number>>,
): PageUniforms {
  return {
    uTurnProgress: { value: init?.uTurnProgress ?? 0 },
    uPageWidth: { value: init?.uPageWidth ?? 1 },
    uXOffset: { value: init?.uXOffset ?? 0 },
    uRevealFront: { value: init?.uRevealFront ?? 0 },
    uLineTop: { value: init?.uLineTop ?? 0 },
    uLinePitch: { value: init?.uLinePitch ?? 1 },
    uLineStart: { value: init?.uLineStart ?? 0 },
  };
}

const VERTEX_REVEAL_DECL = /* glsl */ `
uniform float uLineTop;
uniform float uLinePitch;
uniform float uLineStart;
varying float vBabelLine;
`;

const FRAGMENT_REVEAL_DECL = /* glsl */ `
uniform float uRevealFront;
varying float vBabelLine;
`;

const FRAGMENT_REVEAL_BODY = /* glsl */ `
  float babelReveal = clamp(uRevealFront - vBabelLine, 0.0, 1.0);
  if (babelReveal <= 0.0) discard;
  diffuseColor.a *= babelReveal;
`;

/** Insert `snippet` after the first occurrence of `anchor`; null if absent. */
function insertAfter(source: string, anchor: string, snippet: string): string | null {
  const at = source.indexOf(anchor);
  if (at === -1) return null;
  const end = at + anchor.length;
  return source.slice(0, end) + '\n' + snippet + source.slice(end);
}

/** Insert `snippet` before the first occurrence of `anchor`; null if absent. */
function insertBefore(source: string, anchor: string, snippet: string): string | null {
  const at = source.indexOf(anchor);
  if (at === -1) return null;
  return source.slice(0, at) + snippet + '\n' + source.slice(at);
}

/**
 * Inject bend and/or reveal into a shader. Returns true iff every requested
 * injection found an anchor. Uniform objects are shared by reference so the
 * caller's per-frame writes reach the program.
 */
export function injectPageShader(
  shader: ShaderLike,
  uniforms: PageUniforms,
  opts: PageShaderOptions,
): boolean {
  let ok = true;

  if (opts.bend) {
    shader.uniforms.uTurnProgress = uniforms.uTurnProgress;
    shader.uniforms.uPageWidth = uniforms.uPageWidth;
    shader.uniforms.uXOffset = uniforms.uXOffset;
  }
  if (opts.reveal) {
    shader.uniforms.uRevealFront = uniforms.uRevealFront;
    shader.uniforms.uLineTop = uniforms.uLineTop;
    shader.uniforms.uLinePitch = uniforms.uLinePitch;
    shader.uniforms.uLineStart = uniforms.uLineStart;
  }

  // --- Vertex declarations (prepended — valid before three's own decls) ---
  const vertexDecl = (opts.bend ? PAGE_BEND_GLSL : '') + (opts.reveal ? VERTEX_REVEAL_DECL : '');
  if (vertexDecl) shader.vertexShader = vertexDecl + '\n' + shader.vertexShader;

  // --- Vertex body: line varying (pre-bend y), then the bend ---
  const bodyLines = [
    opts.reveal ? 'vBabelLine = uLineStart + (uLineTop - transformed.y) / uLinePitch;' : '',
    opts.bend ? 'transformed = babelBendPage(transformed);' : '',
  ]
    .filter(Boolean)
    .join('\n');
  if (bodyLines) {
    const injected =
      insertAfter(shader.vertexShader, '#include <begin_vertex>', bodyLines) ??
      insertBefore(shader.vertexShader, '#include <project_vertex>', bodyLines);
    if (injected !== null) shader.vertexShader = injected;
    else ok = false;
  }

  // --- Fragment: reveal clip/fade on the glyph alpha ---
  if (opts.reveal) {
    shader.fragmentShader = FRAGMENT_REVEAL_DECL + '\n' + shader.fragmentShader;
    const injected = insertAfter(
      shader.fragmentShader,
      '#include <color_fragment>',
      FRAGMENT_REVEAL_BODY,
    );
    if (injected !== null) shader.fragmentShader = injected;
    else ok = false;
  }

  return ok;
}

/**
 * Wire a material for injection: chains any existing `onBeforeCompile`
 * (troika's derived materials keep theirs), and keys the program cache by the
 * injection shape so variants never share a program.
 */
export function patchPageMaterial(
  material: Material,
  uniforms: PageUniforms,
  opts: PageShaderOptions,
): void {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    const ok = injectPageShader(shader as unknown as ShaderLike, uniforms, opts);
    if (!ok) {
      // Break-glass signal (KDD-9): the anchors were consumed by a derived
      // material — visible in the console, not a silent visual no-op.
      console.warn('babel: page shader anchors not found; bend/reveal not injected', opts);
    }
  };
  const baseKey = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () =>
    `${baseKey?.() ?? ''}|babel-page:${opts.bend ? 'b' : ''}${opts.reveal ? 'r' : ''}`;
  material.needsUpdate = true;
}
