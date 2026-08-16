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
  actionsColumn: `Actions`,
  branchColumn: `Branch`,
  clearSearch: `Clear search`,
  collapseGroup: `Collapse worktrees`,
  expandGroup: `Expand worktrees`,
  noResults: `No repositories match this search.`,
  pathColumn: `Path`,
  repositoryColumn: `Repository / checkout`,
  searchLabel: `Search repositories`,
  searchPlaceholder: `Search repositories...`,
  sortLabel: `Sort repositories`,
  updatedColumn: `Updated`,
  warningsColumn: `Warnings`,
  worktreeBadge: `Worktree`,
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
  removeConfirmButton: `Remove checkout`,
  removeDescriptionPrefix: `This removes the registered checkout`,
  removeDescriptionSuffix: `from OpenThrottle. The folder on disk is left untouched.`,
  removeTitle: `Remove this checkout?`,
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
