import { GLOBAL_RELEASES_URL } from '../data/releases';

/**
 * @description The releases search for `<appName>@<version>` (nx.json
 * `releaseTag.pattern`). A search rather than `/releases/tag/<tag>` so the link
 * never 404s for a version whose tag has not been cut yet.
 */
export const buildAppReleaseHref = (
  appName: string,
  version: string,
): string => {
  const query = new URLSearchParams({
    expanded: 'true',
    q: `${appName}@${version}`,
  });

  return `${GLOBAL_RELEASES_URL}?${query.toString()}`;
};
