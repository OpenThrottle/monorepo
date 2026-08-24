import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';
import type {
  DiscoveredWorktree,
  RepositoryCheckout,
  RepositoryCheckoutRow,
} from '~/routing/settings/repositories/data/types';

/** The `kind` discriminator the server writes for worktree checkouts. */
const WORKTREE_CHECKOUT_KIND = 'worktree';

/** Row-id prefix for a worktree that exists on disk but has no checkout row. */
const UNREGISTERED_ROW_ID_PREFIX = 'worktree:';

const toRow = (
  repository: WorkspaceRepositoryFieldsFragment,
  checkout: RepositoryCheckout,
  foreignSkillInjectionEnabled: boolean,
  discovered: DiscoveredWorktree | null,
  children: RepositoryCheckoutRow[] = [],
): RepositoryCheckoutRow => ({
  activity: discovered?.activity ?? null,
  branch:
    discovered?.branch ??
    checkout.inspection?.git.currentBranch ??
    repository.defaultBranch ??
    null,
  checkout,
  children: children.length > 0 ? children : undefined,
  displayName: checkout.displayName,
  foreignSkillInjectionEnabled,
  id: checkout.id,
  isWorktree: checkout.kind === WORKTREE_CHECKOUT_KIND,
  path: checkout.filesystemPath,
  planId: discovered?.planId ?? null,
  planRunId: discovered?.planRunId ?? null,
  remoteUrl: repository.normalizedRemoteUrl ?? null,
  repositoryId: repository.id,
  repositoryName: repository.name,
  unregistered: false,
  updatedAt: checkout.updatedAt ?? null,
});

/**
 * A worktree found on disk with no `repository_checkouts` row. There is no checkout to
 * carry, so the row stands on the discovery payload alone.
 */
const toDiscoveredRow = (
  discovered: DiscoveredWorktree,
  repository: WorkspaceRepositoryFieldsFragment | null,
  foreignSkillInjectionEnabled: boolean,
  children: RepositoryCheckoutRow[] = [],
): RepositoryCheckoutRow => ({
  activity: discovered.activity,
  branch: discovered.branch ?? null,
  checkout: null,
  children: children.length > 0 ? children : undefined,
  displayName: discovered.name,
  foreignSkillInjectionEnabled,
  id: `${UNREGISTERED_ROW_ID_PREFIX}${discovered.path}`,
  isWorktree: true,
  path: discovered.path,
  planId: discovered.planId ?? null,
  planRunId: discovered.planRunId ?? null,
  remoteUrl: repository?.normalizedRemoteUrl ?? null,
  repositoryId: repository?.id ?? null,
  repositoryName: repository?.name ?? REPOSITORIES_TABLE_COPY.unlinkedGroupName,
  unregistered: true,
  updatedAt: null,
});

/**
 * @description Turn the flat `workspaceRepositories` payload plus the on-disk
 * `discoveredWorktrees` scan into the two-level row model the repositories table
 * renders: a repository's primary checkout is a parent row and its worktrees —
 * registered or not — hang off it as children.
 *
 * Edge cases, all deliberate and covered by tests:
 * - **Zero checkouts** — the repository is skipped entirely. Every row is something
 *   on disk, and a repository with none has nothing to act on; the repository
 *   itself remains reachable at its detail route.
 * - **Several primary checkouts** — each becomes its own parent row. The
 *   repository's worktrees attach to the first primary so they surface exactly
 *   once rather than being duplicated under every primary.
 * - **Worktrees with no primary sibling** — the first worktree is promoted to
 *   parent (still flagged `isWorktree`) and the rest nest beneath it, so an
 *   orphaned worktree is never dropped from the table.
 * - **A registered checkout that discovery also found** — collapses to ONE row,
 *   matched on `checkoutId` from the server rather than by comparing path strings,
 *   and gains that scan's activity, branch, and run id.
 * - **A discovered worktree whose repository is not registered** — grouped under
 *   its own promoted parent row rather than dropped, keeping the tree two levels
 *   deep.
 */
export function buildRepositoryRows(
  repositories: WorkspaceRepositoryFieldsFragment[],
  discoveredWorktrees: readonly DiscoveredWorktree[] = [],
): RepositoryCheckoutRow[] {
  // Match on checkoutId, not on the path: the server already resolved symlinks when
  // it indexed the user's checkouts, so this is the authoritative pairing.
  const discoveredByCheckoutId = new Map<string, DiscoveredWorktree>();
  const unregisteredByRepositoryId = new Map<string, DiscoveredWorktree[]>();
  const unlinked: DiscoveredWorktree[] = [];

  for (const worktree of discoveredWorktrees) {
    if (worktree.checkoutId != null) {
      discoveredByCheckoutId.set(worktree.checkoutId, worktree);
      continue;
    }
    if (worktree.repositoryId == null) {
      unlinked.push(worktree);
      continue;
    }
    const existing = unregisteredByRepositoryId.get(worktree.repositoryId);
    if (existing === undefined) {
      unregisteredByRepositoryId.set(worktree.repositoryId, [worktree]);
    } else {
      existing.push(worktree);
    }
  }

  const rows: RepositoryCheckoutRow[] = [];
  const groupedRepositoryIds = new Set<string>();

  for (const repository of repositories) {
    const checkouts = repository.checkouts ?? [];

    if (checkouts.length === 0) {
      continue;
    }
    groupedRepositoryIds.add(repository.id);

    // Repository-level rollup, computed once so every row for this repository
    // agrees: the flag is stored per checkout but flipped for all of them at once.
    const injectionEnabled = checkouts.some(
      (checkout) => checkout.foreignSkillInjectionEnabled,
    );

    const row = (
      checkout: RepositoryCheckout,
      children: RepositoryCheckoutRow[] = [],
    ): RepositoryCheckoutRow =>
      toRow(
        repository,
        checkout,
        injectionEnabled,
        discoveredByCheckoutId.get(checkout.id) ?? null,
        children,
      );

    const primaries = checkouts.filter(
      (checkout) => checkout.kind !== WORKTREE_CHECKOUT_KIND,
    );
    const worktrees = checkouts.filter(
      (checkout) => checkout.kind === WORKTREE_CHECKOUT_KIND,
    );
    const discoveredOnly = (
      unregisteredByRepositoryId.get(repository.id) ?? []
    ).map((worktree) =>
      toDiscoveredRow(worktree, repository, injectionEnabled),
    );

    if (primaries.length === 0) {
      const [promoted, ...rest] = worktrees;

      rows.push(
        row(promoted, [
          ...rest.map((worktree) => row(worktree)),
          ...discoveredOnly,
        ]),
      );

      continue;
    }

    primaries.forEach((primary, index) => {
      const children =
        index === 0
          ? [...worktrees.map((worktree) => row(worktree)), ...discoveredOnly]
          : [];

      rows.push(row(primary, children));
    });
  }

  // Worktrees whose owning repository is not registered for this user (or whose
  // repository had zero checkouts, so no parent row exists): promote the first to
  // parent and nest the rest, so nothing on disk is silently dropped.
  const orphans = [
    ...unlinked,
    ...[...unregisteredByRepositoryId.entries()]
      .filter(([repositoryId]) => !groupedRepositoryIds.has(repositoryId))
      .flatMap(([, worktrees]) => worktrees),
  ];

  if (orphans.length > 0) {
    const [promoted, ...rest] = orphans;
    rows.push(
      toDiscoveredRow(
        promoted,
        null,
        false,
        rest.map((worktree) => toDiscoveredRow(worktree, null, false)),
      ),
    );
  }

  return rows;
}
