/**
 * @description Single-sourced user-facing copy for the Repositories settings area.
 * The section renders these and specs import the same constants, so a wording
 * change updates one place and no spec breaks on copy drift. Add new copy here
 * rather than inlining sentence-length literals in components.
 */
import type { GlobalFeatureOnboardingContent } from '@openthrottle/react-router-ui-global';
import { FolderGit2Icon } from 'lucide-react';

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
  worktreeActivityUnverified: `Running (unverified)`,
  worktreeActivityUnverifiedTitle: `A plan run claims this worktree, but it is an interactive run with no heartbeat — nothing confirms the agent is still alive. If it crashed, this worktree stays held until the run is settled.`,
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

/**
 * @description Copy for the per-checkout skill-usage telemetry readiness badge
 * and its expanded explanation.
 *
 * Every negative state carries a `remediation` the user can act on without
 * leaving the page. That is the point of the feature: a cursor-agent run once
 * captured a skill invocation correctly, resolved no endpoint, wrote the record
 * to a local buffer, and nothing in the product said so — the missing value was
 * a single line in `~/.openthrottle/.env`.
 *
 * `notWired` is deliberately not phrased as breakage. An OpenThrottle-
 * orchestrated run passes `--plugin-dir` at spawn time and records from any
 * checkout, wired or not; what is missing is only the wiring for runs the user
 * starts himself.
 */
export const REPOSITORY_HOOK_TELEMETRY_COPY = {
  bufferingLabel: `Buffering locally`,
  bufferingRemediation: `Add your OpenThrottle server to ~/.openthrottle/.env — one line, and it applies to every repository on this machine:`,
  bufferingSummary: `Skill invocations are captured here, but no OpenThrottle endpoint resolves, so records are written to a local file instead of being sent.`,
  columnLabel: `Telemetry`,
  endpointSourceLabels: {
    none: `not configured`,
    process_env: `the shell environment`,
    repo_env: `this checkout's .env`,
    user_env: `~/.openthrottle/.env`,
  },
  envSnippet: `OPENTHROTTLE_GRAPHQL_URL=https://your-openthrottle-server/graphql`,
  heading: `Skill-usage telemetry`,
  missingTokenLabel: `Buffering locally`,
  missingTokenRemediation: `An endpoint is configured but no auth token is. A server that requires authentication rejects these records and they buffer instead — add the token alongside the URL in ~/.openthrottle/.env:`,
  missingTokenSnippet: `OPENTHROTTLE_MCP_AUTH_TOKEN=your-token`,
  missingTokenSummary: `An endpoint resolves but no auth token does, so records are rejected with Unauthorized and buffered locally.`,
  notInspectedLabel: `Not inspected`,
  notInspectedSummary: `This checkout has not been inspected since telemetry readiness was added. Refresh it to find out.`,
  notWiredLabel: `Not wired here`,
  notWiredRemediation: `Install the plugin for the agent you use, or start runs through OpenThrottle — the driver passes --plugin-dir at spawn time and records either way:`,
  notWiredSummary: `Nothing in this checkout wires the hooks up, so a run you start yourself records nothing. OpenThrottle-orchestrated runs still record.`,
  offlineLabel: `Offline`,
  offlineRemediation: `Unset OPENTHROTTLE_TELEMETRY_OFFLINE to start sending again:`,
  offlineSnippet: `unset OPENTHROTTLE_TELEMETRY_OFFLINE`,
  offlineSummary: `OPENTHROTTLE_TELEMETRY_OFFLINE is set, so records are buffered on purpose and never sent.`,
  producersLabel: `Wired for`,
  recordingLabel: `Recording`,
  recordingSummary: `Skill invocations from this checkout are sent to OpenThrottle.`,
  wireSnippet: `cursor-agent --plugin-dir <monorepo>/plugins/openthrottle-cursor -p "…"`,
} as const;
