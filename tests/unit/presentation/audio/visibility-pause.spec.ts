import { describe, expect, it } from 'vitest';

import { attachVisibilityPause } from '@/presentation/audio/visibility-pause';
import type {
  SuspendableContextLike,
  VisibilityDocLike,
} from '@/presentation/audio/visibility-pause';

/**
 * The fake ctx type deliberately has NO `resume` method — gesture-only resume
 * is encoded in the type: if visibility-pause ever grew a resume call, this
 * file would not compile.
 */
function fakeDoc(): VisibilityDocLike & {
  setVisibility(state: string): void;
  fire(): void;
  listenerCount(): number;
} {
  let visibilityState = 'visible';
  const listeners = new Set<() => void>();
  return {
    get visibilityState() {
      return visibilityState;
    },
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    setVisibility(state: string) {
      visibilityState = state;
    },
    fire() {
      for (const listener of [...listeners]) listener();
    },
    listenerCount: () => listeners.size,
  };
}

function fakeCtx(state: string, behavior: 'resolve' | 'reject' = 'resolve') {
  const calls = { suspend: 0 };
  const ctx: SuspendableContextLike = {
    state,
    suspend() {
      calls.suspend += 1;
      return behavior === 'resolve'
        ? Promise.resolve()
        : Promise.reject(new Error('InvalidStateError'));
    },
  };
  return { ctx, calls };
}

describe('attachVisibilityPause', () => {
  it('hide while running → exactly one suspend()', () => {
    const doc = fakeDoc();
    const { ctx, calls } = fakeCtx('running');
    attachVisibilityPause(doc, ctx);
    doc.setVisibility('hidden');
    doc.fire();
    expect(calls.suspend).toBe(1);
  });

  it('hide while suspended or closed → zero suspends', () => {
    for (const state of ['suspended', 'closed', 'interrupted']) {
      const doc = fakeDoc();
      const { ctx, calls } = fakeCtx(state);
      attachVisibilityPause(doc, ctx);
      doc.setVisibility('hidden');
      doc.fire();
      expect(calls.suspend).toBe(0);
    }
  });

  it('becoming visible → nothing (resume is gesture-only, by type)', () => {
    const doc = fakeDoc();
    const { ctx, calls } = fakeCtx('running');
    attachVisibilityPause(doc, ctx);
    doc.setVisibility('visible');
    doc.fire();
    expect(calls.suspend).toBe(0);
    expect('resume' in ctx).toBe(false);
  });

  it('a rejecting suspend is swallowed', async () => {
    const doc = fakeDoc();
    const { ctx, calls } = fakeCtx('running', 'reject');
    attachVisibilityPause(doc, ctx);
    doc.setVisibility('hidden');
    expect(() => doc.fire()).not.toThrow();
    await Promise.resolve(); // let the swallowed rejection settle
    expect(calls.suspend).toBe(1);
  });

  it('detach removes the listener and is idempotent', () => {
    const doc = fakeDoc();
    const { ctx, calls } = fakeCtx('running');
    const detach = attachVisibilityPause(doc, ctx);
    expect(doc.listenerCount()).toBe(1);
    detach();
    expect(doc.listenerCount()).toBe(0);
    detach(); // second call is a no-op
    expect(doc.listenerCount()).toBe(0);
    doc.setVisibility('hidden');
    doc.fire();
    expect(calls.suspend).toBe(0);
  });
});
