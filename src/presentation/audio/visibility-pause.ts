/**
 * Suspend-on-hide (mobile spec §3.4) — app-shell CONTEXT lifecycle, not bus
 * routing: App.tsx constructed the raw context and owns it; suspending there
 * widens nothing (the frozen AudioBus and its narrow BusContext are
 * untouched). Suspend is a reversible pause — never dispose, never a new
 * context. There is deliberately NO resume here: resume is gesture-only (the
 * entry/continue tap), which iOS requires anyway and which also normalizes
 * iOS's flaky `interrupted` auto-resume path.
 */
export type SuspendableContextLike = {
  readonly state: string;
  suspend(): Promise<void>;
};

export type VisibilityDocLike = {
  readonly visibilityState: string;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
};

/**
 * Suspends `ctx` on `visibilitychange → hidden` while it is running; swallows
 * rejections (closed StrictMode ghost, mid-transition). Returns an idempotent
 * detach — attach it inside the SAME effect that owns the context, so the
 * listener's lifetime equals the context's.
 */
export function attachVisibilityPause(
  doc: VisibilityDocLike,
  ctx: SuspendableContextLike,
): () => void {
  const onVisibilityChange = () => {
    if (doc.visibilityState !== 'hidden') return; // resume is gesture-only
    if (ctx.state !== 'running') return; // at most one suspend per hide (M-7)
    void ctx.suspend().catch(() => {
      /* closed or transitioning — a paused context needs no rescue */
    });
  };
  doc.addEventListener('visibilitychange', onVisibilityChange);
  let detached = false;
  return () => {
    if (detached) return;
    detached = true;
    doc.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
