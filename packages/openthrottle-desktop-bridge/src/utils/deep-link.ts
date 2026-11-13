import {
  DESKTOP_DEEP_LINK_PROTOCOL,
  UUID_PATTERN,
} from '../data/data.desktop-bridge.ts';

const PLAN_ROUTE_PATTERN = /^\/plans\/([^/?#]+)$/;

/**
 * @description The first `openthrottle://` argument in a process argv (how
 * Windows and Linux deliver a deep link to a new or second instance), or
 * `undefined`.
 *
 * @public
 */
export const findDeepLink = (argv: readonly string[]): string | undefined => {
  return argv.find((arg) => arg.startsWith(`${DESKTOP_DEEP_LINK_PROTOCOL}://`));
};

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

/**
 * @description Maps `openthrottle://plans/<uuid>` to the Developer app route
 * `/plans/<uuid>`; everything else (other schemes, hosts, paths, bad ids,
 * credentials, ports) yields `undefined` and must not navigate. Query and hash
 * are ignored.
 *
 * @public
 */
export const mapDeepLink = (url: string): string | undefined => {
  const parsed = URL.parse(url);

  if (parsed === null || parsed.protocol !== `${DESKTOP_DEEP_LINK_PROTOCOL}:`) {
    return undefined;
  }

  const hasAuthority =
    parsed.username !== '' || parsed.password !== '' || parsed.port !== '';

  if (hasAuthority || parsed.hostname !== 'plans') {
    return undefined;
  }

  return toPlanRoute(`/plans${parsed.pathname}`);
};
