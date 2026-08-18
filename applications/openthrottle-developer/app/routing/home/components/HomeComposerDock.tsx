import * as React from 'react';
import clsx from 'clsx';

export interface HomeComposerDockProps {
  /** The composer region to dock — the `<Await>` boundary and its skeleton fallback. */
  children: React.ReactNode;
  className?: string;
}

/**
 * @description Docks the home-route composer to the bottom of the page scroll
 * container so it stays reachable in a long thread.
 *
 * `sticky` (never `fixed`): it pins against `GlobalLayout`'s scroll wrapper —
 * the app's only scroll container — so the sidebar inset, scroll restoration
 * and the iOS visual viewport all keep working untouched. Being the last
 * in-flow child of the thread column, it needs no thread bottom-padding: at
 * scroll-bottom it rests in its own space and covers nothing, so the final
 * message and the retry notice are always fully visible.
 *
 * The opaque background stops messages showing through, and the gradient above
 * fades scrolled-past content into the bar instead of hard-clipping it. The
 * safe-area padding is required because the app ships `viewport-fit=cover`.
 */
export const HomeComposerDock = (
  props: HomeComposerDockProps,
): React.ReactElement => {
  const { children, className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx(
        'bg-background sticky bottom-0 z-10 pb-[env(safe-area-inset-bottom)]',
        className,
      )}
      data-testid="HomeComposerDock"
    >
      {/* Fade the thread into the bar. Sits above the dock and outside the
          flow (no height of its own) so it cannot shift the composer. */}
      <div
        aria-hidden={true}
        className="from-background pointer-events-none absolute inset-x-0 bottom-full h-6 bg-gradient-to-t to-transparent"
      />
      {children}
    </div>
  );
};
