import { UUID_PATTERN } from '../data/data.desktop-bridge.ts';

const PLAN_ROUTE_PATTERN = /^\/plans\/([^/?#]+)$/;

/**
 * @description Validates an app-relative path and returns the canonical
 * `/plans/<uuid>` route, or `undefined`. Strict on purpose: the id must be a
 * UUID, and a query, hash, trailing slash or any other path is rejected.
 *
 * @public
 */
export const toPlanRoute = (path: string): string | undefined => {
  const id = PLAN_ROUTE_PATTERN.exec(path)?.[1];

  if (id === undefined || !UUID_PATTERN.test(id)) {
    return undefined;
  }

  return `/plans/${id.toLowerCase()}`;
};
