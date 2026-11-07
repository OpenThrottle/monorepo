import { mapDeepLink } from '@openthrottle/openthrottle-desktop-bridge';

export interface CreateDeepLinkRouterOptions {
  /** Focuses the window and, for a route, navigates it. `undefined` just focuses. */
  readonly openRoute: (route: string | undefined) => void;
}

export interface DeepLinkRouter {
  /** Maps and opens a deep link; queued until `markReady`. Unknown links only focus the window. */
  readonly handle: (url: string) => void;
  /** Call once the window exists; flushes links that arrived earlier (macOS `open-url` can fire before `ready`). */
  readonly markReady: () => void;
}

/**
 * @description Routes `openthrottle://` links to the Developer app. The mapper
 * is the only thing that decides a route, so a link that is not exactly
 * `openthrottle://plans/<uuid>` can never navigate; it merely focuses the window.
 */
export const createDeepLinkRouter = (
  options: CreateDeepLinkRouterOptions,
): DeepLinkRouter => {
  const { openRoute } = options;
  let isReady = false;
  let pending: string[] = [];

  const open = (url: string): void => {
    openRoute(mapDeepLink(url));
  };

  const handle = (url: string): void => {
    if (isReady) {
      open(url);

      return;
    }

    pending.push(url);
  };

  const markReady = (): void => {
    isReady = true;

    const queued = pending;

    pending = [];
    queued.forEach(open);
  };

  return { handle, markReady };
};
