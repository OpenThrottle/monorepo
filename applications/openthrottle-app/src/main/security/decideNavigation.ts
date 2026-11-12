import { isAllowedNavigation } from './isAllowedNavigation.ts';
import { toExternalUrl } from './toExternalUrl.ts';

export type NavigationDecision =
  | { readonly kind: 'allow' }
  | { readonly kind: 'block' }
  | { readonly kind: 'external'; readonly url: string };

/**
 * @description Decides what to do with a renderer-initiated navigation or
 * redirect: allow it in-app, block it, or block it and open the URL in the
 * system browser (http/https only).
 */
export const decideNavigation = (
  url: string,
  allowedOrigins: readonly string[],
): NavigationDecision => {
  if (isAllowedNavigation(url, allowedOrigins)) {
    return { kind: 'allow' };
  }

  const external = toExternalUrl(url);

  if (external === undefined) {
    return { kind: 'block' };
  }

  return { kind: 'external', url: external };
};
