import { parseRepositoryRemote } from './repository-identity';
import type { ChatCheckoutOption } from '../types';

/**
 * Heading for the trailing group of checkouts with no parseable remote — a
 * provisional, local-only clone or a path that was registered by hand.
 */
export const LOCAL_ONLY_GROUP_HEADING = 'Local only';

/** One owner/org heading and the checkouts under it. @public */
export interface ChatCheckoutGroup {
  /** `owner`, or `host/owner` when the list spans more than one host. */
  readonly heading: string;
  readonly options: readonly ChatCheckoutOption[];
}

/**
 * Everything about a checkout worth matching a search query against, joined
 * into the one string cmdk filters on: label, `owner`, `name`, `host`,
 * filesystem path and project name. Without this the search only sees the
 * display name — which is precisely the field that is ambiguous.
 *
 * @public
 */
export function checkoutSearchTerms(
  checkout: ChatCheckoutOption,
): readonly string[] {
  const identity = parseRepositoryRemote(checkout.remoteUrl);

  return [
    checkout.label,
    checkout.branch,
    checkout.filesystemPath,
    checkout.projectName,
    identity?.host,
    identity?.name,
    identity?.owner,
  ].filter((term): term is string => term != null && term !== '');
}

/**
 * Group checkouts by the owner/org of their git remote, so several look-alike
 * `monorepo` checkouts land under visibly different headings. Checkouts with no
 * parseable remote collect into a trailing {@link LOCAL_ONLY_GROUP_HEADING}
 * group rather than being dropped or folded into someone else's org.
 *
 * Headings qualify with the host (`host/owner`) only when the list actually
 * spans more than one host — on the single-host common case that prefix would
 * be noise. Groups are sorted by heading and options keep their input order, so
 * the output is deterministic and never depends on Map iteration luck.
 *
 * @public
 */
export function groupCheckoutOptions(
  checkouts: readonly ChatCheckoutOption[],
): ChatCheckoutGroup[] {
  const identities = checkouts.map((checkout) => ({
    checkout,
    identity: parseRepositoryRemote(checkout.remoteUrl),
  }));

  const hosts = new Set(
    identities
      .map(({ identity }) => identity?.host)
      .filter((host): host is string => host != null),
  );
  const qualifyWithHost = hosts.size > 1;

  const byHeading = new Map<string, ChatCheckoutOption[]>();
  for (const { checkout, identity } of identities) {
    const heading =
      identity === null
        ? LOCAL_ONLY_GROUP_HEADING
        : qualifyWithHost
          ? `${identity.host}/${identity.owner}`
          : identity.owner;

    const existing = byHeading.get(heading);
    if (existing === undefined) {
      byHeading.set(heading, [checkout]);
    } else {
      existing.push(checkout);
    }
  }

  const headings = [...byHeading.keys()].sort((a, b) => {
    // The local-only bucket is a catch-all, not an org — it always sorts last.
    if (a === LOCAL_ONLY_GROUP_HEADING) return 1;
    if (b === LOCAL_ONLY_GROUP_HEADING) return -1;
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });

  return headings.map((heading) => ({
    heading,
    options: byHeading.get(heading) ?? [],
  }));
}
