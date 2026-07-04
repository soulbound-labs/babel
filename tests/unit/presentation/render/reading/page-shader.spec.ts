import { describe, expect, it } from 'vitest';

import { createPageUniforms, injectPageShader } from '@/presentation/render/reading/page-shader';
import type { ShaderLike } from '@/presentation/render/reading/page-shader';

/** A minimal three-like shader pair carrying the standard chunk anchors. */
function fakeShader(): ShaderLike {
  return {
    vertexShader: [
      'void main() {',
      '#include <begin_vertex>',
      '#include <project_vertex>',
      '}',
    ].join('\n'),
    fragmentShader: ['void main() {', '#include <color_fragment>', '}'].join('\n'),
    uniforms: {},
  };
}

describe('page shader injection (§4.4 glue)', () => {
  it('injects bend + reveal at the standard anchors and wires the shared uniforms', () => {
    const shader = fakeShader();
    const uniforms = createPageUniforms({ uPageWidth: 0.24, uLineStart: 40 });
    const ok = injectPageShader(shader, uniforms, { bend: true, reveal: true });
    expect(ok).toBe(true);
    expect(shader.vertexShader).toContain('babelBendPage(transformed)');
    expect(shader.vertexShader).toContain('vBabelLine');
    // The per-leaf line offset is folded into the reveal varying.
    expect(shader.vertexShader).toContain('uLineStart + (uLineTop - transformed.y)');
    expect(shader.fragmentShader).toContain('uRevealFront');
    expect(shader.fragmentShader).toContain('diffuseColor.a *= babelReveal');
    // Shared by reference: per-frame uniform writes reach the program.
    expect(shader.uniforms.uTurnProgress).toBe(uniforms.uTurnProgress);
    expect(shader.uniforms.uRevealFront).toBe(uniforms.uRevealFront);
    expect(shader.uniforms.uLineStart).toBe(uniforms.uLineStart);
    expect(shader.uniforms.uLineStart?.value).toBe(40);
    expect(shader.uniforms.uPageWidth?.value).toBe(0.24);
  });

  it('bend-only injection leaves the fragment shader untouched (vellum page)', () => {
    const shader = fakeShader();
    const before = shader.fragmentShader;
    const ok = injectPageShader(shader, createPageUniforms(), { bend: true, reveal: false });
    expect(ok).toBe(true);
    expect(shader.fragmentShader).toBe(before);
    expect(shader.uniforms.uRevealFront).toBeUndefined();
    expect(shader.uniforms.uLineStart).toBeUndefined();
  });

  it('falls back to the project_vertex anchor when begin_vertex was consumed (troika)', () => {
    const shader = fakeShader();
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      'vec3 transformed = troikaLayout(position);',
    );
    const ok = injectPageShader(shader, createPageUniforms(), { bend: true, reveal: false });
    expect(ok).toBe(true);
    const bendAt = shader.vertexShader.indexOf('babelBendPage(transformed)');
    const projectAt = shader.vertexShader.indexOf('#include <project_vertex>');
    expect(bendAt).toBeGreaterThan(-1);
    expect(bendAt).toBeLessThan(projectAt); // bend applies before projection
  });

  it('reports failure when no anchor exists (break-glass signal, never silent)', () => {
    const shader: ShaderLike = {
      vertexShader: 'void main() { gl_Position = vec4(0.0); }',
      fragmentShader: 'void main() {}',
      uniforms: {},
    };
    expect(injectPageShader(shader, createPageUniforms(), { bend: true, reveal: true })).toBe(
      false,
    );
  });
});
