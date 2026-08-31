/**
 * @description Single-sourced user-facing copy for the plans routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */
import { ListChevronsUpDownIcon } from 'lucide-react';
import type { GlobalFeatureOnboardingContent } from '@openthrottle/react-router-ui-global';

/**
 * @description New-user "teach-me-fast" onboarding copy for the plans index,
 * shown only when a workspace has zero plans and no filters are active. Conforms
 * to {@link GlobalFeatureOnboardingContent} and is rendered through the shared
 * `GlobalFeatureOnboarding` layout.
 */
export const PLANS_ONBOARDING: GlobalFeatureOnboardingContent = {
  cta: { label: `Create your first plan`, to: `/plans/create` },
  icon: ListChevronsUpDownIcon,
  internalUsage: `Every feature we ship starts as a plan we create from the editor via MCP — "Create a plan. …", whatever detail we have, and @-mentions of the files that matter. Ralph executes the tasks one at a time; each commit carries its Plan-Id and Task-Id so shipped work on main traces straight back to the plan that asked for it.`,
  steps: [
    `In your editor, start with "Create a plan. Xxxx" — replace Xxxx with a short title.`,
    `Give as little or as much detail as you like after that.`,
    `@-mention files when they help so the agent reads the real source, not a recap.`,
    `The plan and tasks land here. Queue a run and follow the output as work ships.`,
  ],
  tagline: `Turn intent into shipped work: break an idea into tasks, run it agentically, and trace every commit back to the plan.`,
  title: `Plans`,
  useCases: [
    `Break an idea or PRD into an ordered list of executable tasks.`,
    `Drive agentic execution (Ralph) task-by-task with status tracking.`,
    `Trace shipped commits on main back to the plan and task that drove them.`,
  ],
  whatItIs: `A plan is OpenThrottle's record of intended work — what you decided to build, broken into tasks with status, assignee, and summaries. Plans can be worked by hand or executed agentically, with commits linked back for traceability.`,
};

export const PLAN_TASK_NOT_FOUND_COPY = {
  description: `The task you are looking for does not exist.`,
  title: `Task not found`,
} as const;

/**
 * @description Copy for the task-detail Details tab. `noDescription` fills the
 * main column when a task carries neither a description nor a summary, so the
 * issue-style layout never renders an empty body.
 */
export const TASK_DETAIL_COPY = {
  noDescription: `No description provided yet.`,
} as const;

/**
 * @description Empty-state copy for the plans index list. Two cases: a truly
 * empty workspace (no plans at all) vs an active filter/search with no matches.
 * The filtered case links back to the unfiltered list; the empty case links to
 * plan creation. Single-sourced so {@link PlanTasksEmpty} and its specs agree.
 */
export const PLANS_INDEX_EMPTY_COPY = {
  emptyAction: `New plan`,
  emptyDescription: `Create your first plan to get started.`,
  emptyTitle: `No plans yet`,
  filteredAction: `Clear filters`,
  filteredDescription: `No plans match the current filters. Clear them to see every plan.`,
  filteredTitle: `No plans match your filters`,
} as const;

/**
 * @description Empty-state copy for a plan's Tasks tab (list and table views)
 * when the plan has no tasks. Distinct from {@link PLANS_INDEX_EMPTY_COPY} so a
 * task-less plan never borrows the plans-index "No plans yet" wording.
 */
export const PLAN_TASKS_EMPTY_COPY = {
  description: `Add a task to break this plan into executable work.`,
  title: `No tasks yet`,
} as const;

/**
 * @description Copy for the "managed" badge shown on tag→action rule-injected
 * tasks (e.g. GitHub Commit). Their placement is a reconciled invariant — a
 * manual reorder snaps back on the next rule-evaluation pass — so the badge and
 * its tooltip make that ownership explicit.
 */
export const MANAGED_TASK_BADGE_COPY = {
  label: `Managed`,
  tooltip: `Kept in place by a rule. Its position is set automatically, so a manual reorder will snap back.`,
} as const;

/**
 * @description Copy for the lifecycle-hook lists rendered under a plan (beforeAll/
 * afterAll, beforeEach/afterEach) and under each task (per-task before/after).
 */
export const HOOK_LIST_COPY = {
  addAfter: `Add after-hook`,
  addBefore: `Add before-hook`,
  afterTitle: `After`,
  beforeTitle: `Before`,
  detach: `Remove hook`,
  emptyAfter: `No after-hooks`,
  emptyBefore: `No before-hooks`,
  hookBadge: `hook`,
} as const;

/**
 * @description Copy for the plan/task lifecycle-hooks section (the container that
 * groups the before/after {@link HOOK_LIST_COPY} lists) and its add-hook dialog.
 */
export const PLAN_LIFECYCLE_HOOKS_COPY = {
  addDialogTitle: `Add lifecycle hook`,
  cancel: `Cancel`,
  planSectionTitle: `Lifecycle hooks`,
  scopeEach: `Each task`,
  scopeLabel: `Scope`,
  scopeOnce: `Once`,
  skillSlugLabel: `Skill slug`,
  skillSlugPlaceholder: `e.g. github-commit`,
  sourceLabel: `Source`,
  sourceSkill: `Skill`,
  sourceTemplate: `Template`,
  submit: `Add hook`,
  taskSectionTitle: `Task hooks`,
  titleLabel: `Title`,
  titlePlaceholder: `e.g. seed fixtures`,
} as const;

/**
 * @description Copy for the shared plan/task output-stream renderer
 * ({@link OutputStream}). The iteration marker rides on the same line as the
 * timestamp, so it is a short prefix (`#1`) rather than a sentence; the full
 * meaning is carried by `iterationTitle` on hover.
 */
export const OUTPUT_STREAM_COPY = {
  iterationPrefix: `#`,
  iterationTitle: `Iteration`,
  unknownDay: `Unknown date`,
} as const;

/**
 * @description Section headings and empty-state hints for the plan detail Output
 * tab, which reads as a history: agent output, then the rule-applications change
 * log, then linked artifacts. Headings mirror the reused panel components
 * (PlanRuleApplications, LinkedArtifactsPanel) so populated and empty states read
 * the same.
 */
/**
 * @description Region-scoped failure copy for the plan-detail route's deferred
 * sections. Each string is what `PlanDeferredSection` renders in place of one
 * region when that region's own promise rejects — the rest of the plan page is
 * unaffected, which is the point of splitting the loader query. Kept per-region
 * rather than generic so the reader knows which part of the page is missing.
 */
export const PLAN_RUN_GATING_COPY = {
  /** Server-side refusal when a run is submitted with no branch. */
  missingBranch: `Cannot start a run without a branch. Wait for the workspace to finish loading, then try again.`,
  /**
   * Shown while `workspaceRepositories` is still resolving. Deliberately phrased
   * as progress, not as a validation failure: the run config is not invalid, it
   * is merely not fully known yet, and a validation error on a loading page
   * reads as a bug.
   */
  resolvingWorkspace: `Resolving workspace…`,
} as const;

export const PLAN_DEFERRED_SECTION_COPY = {
  configurationError: `Could not load your workspace repositories. Reload to try again.`,
  editorsError: `Could not load your editor deep links.`,
  outputError: `Could not load this plan's output stream. Reload to try again.`,
  runHistoryError: `Could not load run history for this plan.`,
  tagVocabularyError: `Could not load the tag vocabulary.`,
} as const;

export const PLAN_TAB_OUTPUT_COPY = {
  agentOutputHeading: `Agent output`,
  linkedArtifactsEmpty: `No linked artifacts yet. Artifacts appear here once a run produces and links them.`,
  linkedArtifactsHeading: `Linked artifacts`,
  ruleChangeLogEmpty: `No rule changes recorded yet. Evaluating rules records applications here.`,
  ruleChangeLogHeading: `Rule applications`,
} as const;

/**
 * @description Tooltip copy for the plan-level toolbar (PlanToolbar) explaining
 * why the mutating actions are disabled. The `*Running*` strings cover an active
 * run (QUEUED / IN_PROGRESS) — Kill run stays available and is the intended
 * mid-run action. The `*Terminal*` strings cover a finished/abandoned plan
 * (COMPLETED / CANCELED / SKIPPED): there is no more work to do here, so the
 * fix is to fall forward and ship a new plan rather than to unblock the action.
 */
export const PLAN_EDITOR_ACTIONS_COPY = {
  focusedWindowTooltip: (label: string): string =>
    `Sends the run prompt to whatever ${label} window is focused — ${label}'s deep link cannot target a folder.`,
  needsCheckoutTooltip: (label: string): string =>
    `Select a checkout in Configuration → Workspace to open this plan in ${label}.`,
  openTooltip: (label: string): string =>
    `Opens this plan's working directory in ${label} with the run prompt prefilled.`,
} as const;

/**
 * @description Copy for {@link PlanCheckoutSelector} — the compact checkout
 * picker in the plan-detail tabs row. The two hints are the whole point of the
 * control: a plan with no (or a de-registered) checkout cannot run or open in an
 * editor, and the row must say so rather than sit there inertly.
 *
 * `minimalHint` covers the third, healthy state, which only exists in the
 * icon-only presentation: with the label gone from the button face, the hover
 * has to say what the icon is for. The two failure hints still outrank it.
 */
export const PLAN_CHECKOUT_SELECTOR_COPY = {
  emptyLabel: `No checkouts`,
  emptyRegistryHint: `No repository checkouts are registered yet. Register one in Settings → Workspace, then pick it here to make this plan runnable.`,
  minimalHint: `The repository checkout this plan runs in. Click to pick a different one.`,
  placeholder: `Select checkout`,
  staleCheckoutHint: `The checkout recorded on this plan is no longer registered. Pick another one to make this plan runnable again.`,
} as const;

export const PLAN_TOOLBAR_COPY = {
  evaluateRulesRunningTooltip: `Unavailable while a run is active — kill the run first.`,
  evaluateRulesTerminalTooltip: `This plan is in a terminal state — nothing to evaluate.`,
  markCompleteRunningTooltip: `Unavailable while a run is active — kill the run first.`,
  runRunningTooltip: `A run is already active for this plan — kill it before starting another.`,
  runTerminalTooltip: `This plan is in a terminal state — create a new plan to do more work.`,
} as const;

/**
 * @description Labels for the task-detail toolbar (PlanTaskToolbar): the tag
 * section heading and the secondary actions. Mirrors the plan-level toolbar so
 * task and plan surfaces read the same.
 */
export const PLAN_TASK_TOOLBAR_COPY = {
  actionsLabel: `Actions`,
  actionsTooltip: `Task actions`,
  editTaskLabel: `Edit Task`,
  markCompleteRunningTooltip: `Unavailable while the plan run is active — kill the run first.`,
  markCompleteTerminalTooltip: `The plan is in a terminal state — create a new plan to change tasks.`,
  promoteConfirmLabel: `Promote`,
  promoteDialogBody: `This creates a new plan from this task (carrying its title, description, and tags) and closes out this task (marks it SKIPPED and tags it "promoted"). This cannot be undone from here.`,
  promoteDialogTitle: `Promote task to a plan?`,
  promoteLabel: `Promote to Plan`,
  promoteRunningTooltip: `Unavailable while the plan run is active — kill the run first.`,
  promoteTerminalTooltip: `The plan is in a terminal state — create a new plan to change tasks.`,
  promoteTooltip: `Create a first-class plan from this task and close the task out.`,
  promotedDisabledTooltip: `This task has already been promoted to a plan.`,
} as const;

/**
 * @description Copy for the Configuration tab's worktree fieldset. Queued runs get a worktree that
 * OpenThrottle creates itself (the agent CLI's own `-w` stays off), so the wording here talks about
 * the worktree the run works in rather than about a CLI flag.
 */
export const PLAN_CONFIG_WORKTREE_COPY = {
  autoNameHint: (derivedName: string): string =>
    `Leave blank to use ${derivedName}, derived from the plan id. One worktree per plan, reused across runs, so its branch accumulates the plan's work.`,
  explainer: `Queued runs execute in a git worktree OpenThrottle creates through \`pnpm run worktree:new\`, so the run has its own branch, ports, and provisioned .env. Turn this off only to run in the base checkout.`,
  modeLabel: `Worktree`,
  modeOmitLabel: `Off (run in the base checkout)`,
  nameLabel: `Worktree name`,
  offWarning: `With the worktree off, the run works directly in the base checkout — its edits land in whatever branch that checkout has open.`,
} as const;

/**
 * @description Supplementary copy for `02. Workspace` on the plan Configuration tab. A plan now
 * records the workspace it was CREATED in, so the selector opens pre-filled rather than on the
 * monorepo root — `createdInDefault` says so, and `staleCheckout` covers the case where that
 * recorded checkout has since been de-registered.
 */
export const PLAN_RUN_WORKSPACE_SELECTOR_COPY = {
  createdInDefault: `Defaults to the workspace this plan was created in. Change it here if the run belongs somewhere else.`,
  staleCheckout: `The workspace recorded on this plan is no longer registered. Choose another one before queuing a run.`,
} as const;

/**
 * @description Column header and empty value for the worktree the queued run actually used, read
 * from `run_config_snapshot.workspace.workingDirectory`.
 */
export const PLAN_RUN_AUDIT_WORKSPACE_COPY = {
  columnLabel: `Worktree`,
  emptyLabel: `—`,
} as const;

/**
 * @description Plans index row Actions menu (Queue + optional Kill run).
 */
export const PLANS_ROW_ACTIONS_COPY = {
  killCancel: `Cancel`,
  killConfirm: `Kill run`,
  killDescriptionSuffix: `or signals an active run to terminate. Task or plan edits are not deleted.`,
  killPendingLabel: `Stopping…`,
  killTitle: `Kill plan run?`,
  menuAriaLabelPrefix: `Plan actions for`,
  queue: `Queue plan`,
  queueAriaLabelSuffix: `with default worker tuning (open plan details to set Workflow run options)`,
  queuePendingLabel: `Queuing…`,
  view: `View plan`,
} as const;

/**
 * @description Plan tasks table row Actions menu (view + edit the task).
 */
export const PLAN_TASK_ROW_ACTIONS_COPY = {
  edit: `Edit task`,
  menuAriaLabelPrefix: `Task actions for`,
  view: `View task`,
} as const;
