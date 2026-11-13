import { PROXIED_PATHS } from '../../main/data/data.server-env.ts';

/**
 * @description Whether a request URL belongs to the OT server rather than the
 * developer app. Matches the path exactly or as a prefix segment, never a
 * lookalike such as `/graphql-docs`.
 */
export const isProxiedPath = (url: string | undefined): boolean => {
  if (url === undefined) {
    return false;
  }

  const pathname = url.split('?')[0] ?? '';

  return PROXIED_PATHS.some((proxied) => {
    return pathname === proxied || pathname.startsWith(`${proxied}/`);
  });
};

/**
 * @description Whether an upgrade request is the graphql-ws socket. Only
 * `/graphql` may upgrade; every other upgrade is refused.
 */
export const isGraphqlSocketPath = (url: string | undefined): boolean => {
  const pathname = url?.split('?')[0];

  return pathname === '/graphql';
};
