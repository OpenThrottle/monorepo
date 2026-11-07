import { ChatCheckoutKind, type ChatCheckoutOption } from '../types';
import { parseRepositoryRemote } from './repository-identity';

/**
 * Heading for the trailing group of checkouts with no parseable remote — a
 * provisional, local-only clone or a path that was registered by hand.
 */
export const LOCAL_ONLY_GROUP_HEADING = 'Local only';

/** One row of a {@link ChatCheckoutGroup}, in display order. @public */
export interface ChatCheckoutGroupEntry {
  readonly checkout: ChatCheckoutOption;
  /**
   * True for a worktree that sits directly beneath a primary checkout of the
   * same repository in this group — the row indents under its parent. A
   * worktree whose primary is not registered stays flush, because indenting it
   * under a neighbouring repository's primary would claim a parent it lacks.
   */
  readonly nested: boolean;
}

/** One owner/org heading and the checkouts under it. @public */
export interface ChatCheckoutGroup {
  /** {@link options} paired with how each row sits in the tree, same order. */
  readonly entries: readonly ChatCheckoutGroupEntry[];
  /** `owner`, or `host/owner` when the list spans more than one host. */
  readonly heading: string;
  /** Display order: by repository, primary checkouts first, then worktrees. */
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

/** The group heading for one checkout's remote identity. */
function resolveGroupHeading(
  identity: ReturnType<typeof parseRepositoryRemote>,
  qualifyWithHost: boolean,
): string {
  if (identity === null) {
    return LOCAL_ONLY_GROUP_HEADING;
  }

  if (qualifyWithHost) {
    return `${identity.host}/${identity.owner}`;
  }

  return identity.owner;
}

/** Case-insensitive, locale-aware compare used for every sort here. */
function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

/** Repository key within a group: the remote's name, else the display label. */
function repositoryKeyOf(
  checkout: ChatCheckoutOption,
  identity: ReturnType<typeof parseRepositoryRemote>,
): string {
  return identity?.name ?? checkout.label;
}

function isWorktree(checkout: ChatCheckoutOption): boolean {
  return checkout.kind === ChatCheckoutKind.worktree;
}

/**
 * Order one group's rows: repositories alphabetically, and within each the
 * primary checkout(s) first, then its worktrees — each tier by label. The
 * primary is the checkout people reach for; worktrees are the transient,
 * numerous ones, so they follow their parent instead of interleaving.
 */
function orderGroupEntries(
  rows: readonly {
    readonly checkout: ChatCheckoutOption;
    readonly identity: ReturnType<typeof parseRepositoryRemote>;
  }[],
): ChatCheckoutGroupEntry[] {
  const sorted = [...rows].sort((a, b) => {
    return (
      compareText(
        repositoryKeyOf(a.checkout, a.identity),
        repositoryKeyOf(b.checkout, b.identity),
      ) ||
      Number(isWorktree(a.checkout)) - Number(isWorktree(b.checkout)) ||
      compareText(a.checkout.label, b.checkout.label)
    );
  });

  const repositoriesWithPrimary = new Set(
    sorted
      .filter(({ checkout }) => !isWorktree(checkout))
      .map(({ checkout, identity }) => repositoryKeyOf(checkout, identity)),
  );

  return sorted.map(({ checkout, identity }) => ({
    checkout,
    nested:
      isWorktree(checkout) &&
      repositoriesWithPrimary.has(repositoryKeyOf(checkout, identity)),
  }));
}

/**
 * Group checkouts by the owner/org of their git remote, so several look-alike
 * `monorepo` checkouts land under visibly different headings. Checkouts with no
 * parseable remote collect into a trailing {@link LOCAL_ONLY_GROUP_HEADING}
 * group rather than being dropped or folded into someone else's org.
 *
 * Headings qualify with the host (`host/owner`) only when the list actually
 * spans more than one host — on the single-host common case that prefix would
 * be noise. Groups are sorted by heading; within a group rows are ordered by
 * repository, primary checkouts first and worktrees nested after them (see
 * {@link orderGroupEntries}), so the output is deterministic and never depends
 * on input order or Map iteration luck.
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

  const byHeading = new Map<string, (typeof identities)[number][]>();
  for (const entry of identities) {
    const heading = resolveGroupHeading(entry.identity, qualifyWithHost);

    const existing = byHeading.get(heading);
    if (existing === undefined) {
      byHeading.set(heading, [entry]);
    } else {
      existing.push(entry);
    }
  }

  const headings = [...byHeading.keys()].sort((a, b) => {
    // The local-only bucket is a catch-all, not an org — it always sorts last.
    if (a === LOCAL_ONLY_GROUP_HEADING) return 1;
    if (b === LOCAL_ONLY_GROUP_HEADING) return -1;
    return compareText(a, b);
  });

  return headings.map((heading) => {
    const entries = orderGroupEntries(byHeading.get(heading) ?? []);
    return {
      entries,
      heading,
      options: entries.map((entry) => entry.checkout),
    };
  });
}
