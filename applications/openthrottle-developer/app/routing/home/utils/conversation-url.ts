const PARAM = 'conversationId';

const replaceUrl = (url: URL): void => {
  // Pass the router's own history state through unchanged so its back/forward
  // bookkeeping (idx/key) stays intact.
  window.history.replaceState(window.history.state, '', url);
};

/**
 * @description Writes `?conversationId=<id>` with `history.replaceState`, not a
 * router navigation: `navigate`/`setSearchParams` re-run route loaders (the home
 * loader does slow git/fs scans) and would also feed the deep-link restore
 * effect in the route.
 */
export const writeConversationIdParam = (conversationId: string): void => {
  const url = new URL(window.location.href);
  if (url.searchParams.get(PARAM) === conversationId) {
    return;
  }

  url.searchParams.set(PARAM, conversationId);
  replaceUrl(url);
};

/** @description Drops `?conversationId=` so a reload does not resurrect a cleared thread. */
export const clearConversationIdParam = (): void => {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM)) {
    return;
  }

  url.searchParams.delete(PARAM);
  replaceUrl(url);
};
