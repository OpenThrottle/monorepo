import { toExternalUrl } from './to-external-url.ts';

export type WindowOpenDecision =
  | { readonly kind: 'deny' }
  | { readonly kind: 'external'; readonly url: string };

/**
 * @description Decides what a `window.open` / `target="_blank"` request does.
 * The app never creates a second in-app window, so the handler always denies;
 * an http/https target is additionally opened in the system browser. That
 * includes same-origin targets on purpose: the only one the developer app
 * produces is the footer's `/health` link, which the embedded server proxies,
 * so it works in the system browser (it just carries no session).
 */
export const decideWindowOpen = (url: string): WindowOpenDecision => {
  const external = toExternalUrl(url);

  if (external === undefined) {
    return { kind: 'deny' };
  }

  return { kind: 'external', url: external };
};
