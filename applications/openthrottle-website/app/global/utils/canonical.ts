import { APP_URL } from '@openthrottle/react-router-utils';
import type { MetaDescriptor } from 'react-router';

/**
 * @description Builds the absolute canonical URL for a route from its pathname.
 *
 * Search params and hash fragments are intentionally dropped: a canonical URL
 * should point at the single, clean representation of a page so duplicate
 * variants (`?ref=…`, `#section`) all consolidate onto one signal. Trailing
 * slashes are normalized away (except for the root) so `/docs` and `/docs/`
 * never advertise two different canonicals.
 */
export function buildCanonicalUrl(pathname: string): string {
  const base = (APP_URL ?? '').replace(/\/+$/, '');
  const normalizedPath =
    pathname === '/' ? '' : `/${pathname.replace(/^\/+|\/+$/g, '')}`;

  return `${base}${normalizedPath}`;
}

/**
 * @description Per-route canonical `<link>` meta descriptor for the given
 * pathname. Use inside a route `meta()` so every page advertises its own
 * canonical URL rather than inheriting a single static one.
 */
export function canonicalMeta(pathname: string): MetaDescriptor {
  return {
    href: buildCanonicalUrl(pathname),
    rel: 'canonical',
    tagName: 'link',
  };
}
