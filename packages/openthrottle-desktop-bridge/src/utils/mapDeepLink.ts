import { DESKTOP_DEEP_LINK_PROTOCOL } from '../data/data.desktop-bridge.ts';
import { toPlanRoute } from './toPlanRoute.ts';

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
