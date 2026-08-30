/**
 * @description Single-sourced user-facing copy for the Repositories settings area.
 * The section renders these and specs import the same constants, so a wording
 * change updates one place and no spec breaks on copy drift. Add new copy here
 * rather than inlining sentence-length literals in components.
 */
import { FolderGit2Icon } from 'lucide-react';
import type { GlobalFeatureOnboardingContent } from '@openthrottle/react-router-ui-global';

/**
 * @description Copy for the repositories index table, toolbar, and per-row
 * actions menu. Labels that already exist on `WORKSPACE_FOLDERS_COPY` (refresh,
 * apply editor config, remove, managed badge) are reused from there rather than
 * duplicated here.
 */
export const REPOSITORIES_TABLE_COPY = {
  branchColumn: `Branch`,
  clearSearch: `Clear search`,
  collapseGroup: `Collapse worktrees`,
  expandGroup: `Expand worktrees`,
  injectionColumn: `Skills`,
  injectionInherited: `Inherited`,
  injectionInheritedTitle: `Skill injection is set per repository — it applies to every one of your checkouts, including this worktree.`,
  injectionToggleLabelPrefix: `Toggle skill injection for`,
  injectionUpdateFailed: `Failed to update skill injection.`,
  noResults: `No repositories match this search.`,
  notAGitRepositoryBadge: `Not a git repository`,
  notAGitRepositoryTitle: `This folder is registered but is not a git checkout, so nothing can be planned or run in it. Removing the checkout here leaves the folder on disk untouched.`,
  repositoryColumn: `Repository / checkout`,
  searchLabel: `Search repositories`,
  searchPlaceholder: `Search repositories...`,
  sortLabel: `Sort repositories`,
  unlinkedGroupName: `Worktrees found on disk`,
  unregisteredBadge: `Not registered`,
  unregisteredBadgeTitle: `This worktree exists on disk but OpenThrottle has no record of it. Register it to plan against it or open it in the IDE.`,
  updatedColumn: `Updated`,
  warningsColumn: `Warnings`,
  worktreeActivityDirty: `Uncommitted work`,
  worktreeActivityDirtyTitle: `Nothing is running here, but there are uncommitted changes or commits ahead of the upstream.`,
  worktreeActivityIdle: `Idle`,
  worktreeActivityIdleTitle: `Clean, with nothing running.`,
  worktreeActivityRunning: `Running`,
  worktreeActivityRunningTitle: `A plan run is executing here right now — its heartbeat is live.`,
  worktreeBadge: `Worktree`,
  worktreeRunLinkLabel: `View run`,
} as const;

/**
 * @description Copy for the per-row actions menu. Item labels themselves come
 * from `WORKSPACE_FOLDERS_COPY` (refresh / apply editor config / remove) — only
 * the wrapper affordances the menu introduces live here.
 */
export const REPOSITORIES_ROW_ACTIONS_COPY = {
  cancelButton: `Cancel`,
  menuAriaLabelPrefix: `Actions for`,
  refreshingLabel: `Refreshing…`,
  registerWorktreeLabel: `Register this worktree`,
  registeringWorktreeLabel: `Registering…`,
  removeConfirmButton: `Remove checkout`,
  removeDescriptionPrefix: `This removes the registered checkout`,
  removeDescriptionSuffix: `from OpenThrottle. The folder on disk is left untouched.`,
  removeTitle: `Remove this checkout?`,
  worktreeMenuAriaLabelPrefix: `Actions for the worktree`,
} as const;

/**
 * @description Copy for the on-disk worktree scan banner: the refresh control, the
 * scanned-root line, the warning list, and the state where no root could be
 * resolved at all. Plain sentences only — no markdown, since these render as text.
 */
export const WORKTREE_DISCOVERY_COPY = {
  /** The genuinely degraded case: something we could not read may be hiding worktrees. */
  degradedSummary: `Some worktrees may be missing from this list.`,
  detailsHide: `Hide details`,
  detailsShow: `Show details`,
  droppedCountSuffix: `more were found on disk and are not listed.`,
  /** A repository that has no worktrees yet — stated as a count, never as an error per repo. */
  emptyRootsSuffixOne: `repository has no worktrees yet.`,
  emptyRootsSuffixOther: `repositories have no worktrees yet.`,
  problemsCountSuffixOne: `note from the last scan`,
  problemsCountSuffixOther: `notes from the last scan`,
  refreshButton: `Rescan worktrees`,
  refreshingButton: `Rescanning…`,
  rootPrefix: `Scanning for worktrees in`,
  /** The one actionable line: git is still holding entries for directories that are gone. */
  staleRemedy: `Run \`git worktree prune\` in the repository to clear them.`,
  staleSummarySuffixOne: `worktree is still registered with git but no longer on disk.`,
  staleSummarySuffixOther: `worktrees are still registered with git but no longer on disk.`,
  unconfiguredBody: `OpenThrottle could not work out where your worktrees live, so none are listed. Set a worktree root in workspace settings, or register a primary checkout so the default sibling directory can be resolved.`,
  unconfiguredLinkLabel: `Open workspace settings`,
  unconfiguredTitle: `No worktree root to scan`,
} as const;

/**
 * @description New-user "teach-me-fast" onboarding copy for the Repositories
 * settings index, shown only when a user has zero repositories registered.
 * Conforms to {@link GlobalFeatureOnboardingContent} and is rendered through the
 * shared `GlobalFeatureOnboarding` layout.
 *
 * The `cta` points at the current route rather than a dedicated "new" route:
 * repositories are added via the in-place `AddFolderDialog` / `CloneRepoDialog`
 * (local component state, not URL-driven), so there is no route to deep-link to.
 */
export const REPOSITORIES_ONBOARDING: GlobalFeatureOnboardingContent = {
  cta: { label: `Add a repository`, to: `/settings/repositories` },
  icon: FolderGit2Icon,
  internalUsage: `We register every checkout we work in — the monorepo plus each throwaway worktree — so plans, agent runs, and the in-app IDE all point at real folders on the server host instead of paths pasted by hand.`,
  steps: [
    `Add a folder that's already on the server host, or clone a repo by its git URL.`,
    `OpenThrottle identifies it by its git remote and groups your on-disk checkouts under one repository.`,
    `The repository appears in the list, ready to plan against, run agents in, and open in the IDE.`,
  ],
  tagline: `Connect the on-disk git checkouts OpenThrottle operates on, so every plan, agent run, and IDE session points at a real folder — not a path you pasted by hand.`,
  title: `Repositories`,
  useCases: [
    `Plan and run agents against a checkout without re-typing its server path each time.`,
    `Group multiple worktrees of the same repo under one entry, identified by their shared git remote.`,
    `Open any registered checkout in the in-app IDE and link it to an OpenThrottle project.`,
  ],
  whatItIs: `A repository is an on-disk git checkout on the server host that OpenThrottle can plan against, run agents in, and open in the IDE. Checkouts sharing a git remote are grouped under one repository entry.`,
};
