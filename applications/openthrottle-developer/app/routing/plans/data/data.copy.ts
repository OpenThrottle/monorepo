/**
 * @description Single-sourced user-facing copy for the plans routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */
import type { GlobalFeatureOnboardingContent } from '@openthrottle/react-router-ui-global';
import { ListChevronsUpDownIcon } from 'lucide-react';

/**
 * @description New-user "teach-me-fast" onboarding copy for the plans index,
 * shown only when a workspace has zero plans and no filters are active. Conforms
 * to {@link GlobalFeatureOnboardingContent} and is rendered through the shared
 * `GlobalFeatureOnboarding` layout. It deliberately carries no `cta`: plans are
 * authored through the OpenThrottle MCP from your editor, never from a web form,
 * so the `steps` are the call to action.
 */
export const PLANS_ONBOARDING = {
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
} satisfies GlobalFeatureOnboardingContent;

/**
 * @description Copy for the plans index Status filter ({@link PlanStatusFilter}):
 * the trigger title, the two group headings and the two footer actions.
 */
export const PLAN_STATUS_FILTER_COPY = {
  activeGroup: `Active`,
  allStatuses: `All statuses`,
  resetToDefaults: `Reset to defaults`,
  resolvedGroup: `Resolved`,
  title: `Status`,
} as const;

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
 * The filtered case links back to the unfiltered list; the empty case offers no
 * action at all, because plans are authored through the OpenThrottle MCP rather
 * than a web form. Single-sourced so {@link PlanTasksEmpty} and its specs agree.
 */
export const PLANS_INDEX_EMPTY_COPY = {
  emptyDescription: `No plans have been created in this workspace yet.`,
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
  description: `This plan has no tasks yet.`,
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
  /** Why Run is disabled while the run branch is blank (the toolbar tooltip and the Run dialog). */
  branchRequired: `Set the git branch in Configuration → Workspace before running (branch is required).`,
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

/**
 * @description The plan Details "Runs" card ({@link PlanWorkflowRunTransparency}): what is about
 * to run, what just ran, the run history, and a collapsed CLI & debug section. `empty` replaces the
 * three run sections when the plan has never run and nothing is scheduled; `time` backs
 * `formatRunTime`.
 */
export const PLAN_RUN_TRANSPARENCY_COPY = {
  cli: {
    configurationLink: `Configuration tab`,
    copyDebugBundle: `Copy debug bundle`,
    diffEmpty: `Matches the defaults — the CLI needs only --plan or --task.`,
    diffHeading: `Differs from defaults`,
    heading: `CLI & debug`,
    precedenceLabel: `Precedence:`,
    precedenceSuffix: `Edit the CLI layer on the`,
    queueLinkPrefix: `Queue:`,
  },
  description: `Scheduled, active and past runs of this plan.`,
  empty: {
    description: `Use Run or Schedule in the toolbar to start this plan.`,
    title: `No runs yet`,
  },
  history: {
    actions: {
      copiedToast: `Run id copied to clipboard`,
      copyFailedToast: `Could not copy the run id`,
      copyRunId: `Copy run id`,
      menuAriaLabelPrefix: `Run actions for`,
      openJob: `Open job`,
    },
    columns: {
      branch: `Branch / PR`,
      expand: `Details`,
      modelBackend: `Model / backend`,
      status: `Status`,
      when: `When`,
    },
    detail: {
      ariaLabel: `Run details`,
      branch: `Branch / PR`,
      configDiff: `vs current config`,
      configMatches: `Matches current config`,
      effort: `Effort`,
      finished: `Finished`,
      jobId: `Job id`,
      modelBackend: `Model / backend`,
      noJob: `No job (CLI or orchestrator run)`,
      none: `—`,
      rssEnd: `RSS end (MB)`,
      runKind: `Kind`,
      workspace: `Workspace`,
    },
    /** The chevron keeps one name; `aria-expanded` carries open/closed. */
    expandAriaLabel: `Run details`,
    fetchLimitFooter: (limit: number): string =>
      `Showing the ${limit} most recent runs`,
    heading: `Run history`,
    showMore: (count: number): string => `Show ${count} more`,
    staleBadge: `Stale`,
  },
  latest: {
    heading: `Latest run`,
    heartbeatLabel: `Last heartbeat`,
    staleWarning: `No recent heartbeat. This run may have lost contact.`,
    startedLabel: `Started`,
  },
  meta: {
    ariaLabel: `Run details`,
  },
  time: {
    unknown: `Time unknown`,
  },
  title: `Runs`,
  upcoming: {
    backstopMeta: `Details appear once this run is in the run history.`,
    firesLabel: `Fires`,
    firesUnknown: `Fire time unknown`,
    heading: `Upcoming`,
  },
} as const;

export const LINKED_ARTIFACTS_PANEL_COPY = {
  allTypesLabel: `All types`,
  allVerificationsLabel: `All`,
  collapsedMoreSuffix: `more — expand to see all`,
  filteredEmpty: `No artifacts match the current filters.`,
  orphanedHint: `A claim git could not confirm.`,
  totalSuffix: `artifacts`,
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
 * (COMPLETED / CANCELED / PROMOTED / SKIPPED): there is no more work to do here, so the
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

/**
 * @description Plan toolbar copy. The `settleRun*` entries belong to
 * {@link SettlePlanRunButton}, the escape hatch for an interactive run whose
 * agent is gone. The tone is deliberate: Kill says "stop this run"; Settle says
 * "this run is gone, close the books on it". It is an admission that contact
 * was lost, not a normal stop, and the dialog has to explain why the user is
 * here at all — an interactive run has no heartbeat, so nothing can verify it
 * or settle it on its own, and until it is settled its worktree stays held.
 */
export const PLAN_TOOLBAR_COPY = {
  evaluateRulesRunningTooltip: `Unavailable while a run is active — kill the run first.`,
  evaluateRulesTerminalTooltip: `This plan is in a terminal state — nothing to evaluate.`,
  markCompleteRunningTooltip: `Unavailable while a run is active — kill the run first.`,
  runCaretAriaLabel: `More run options`,
  runDefaultTooltip: `Enqueue a worker run for this plan using tuning from Workflow run options (defaults apply if you have not changed them).`,
  runQueuedToast: `Plan run queued`,
  runQueuedToastDescription: (
    jobId: string,
    queueName: string,
    jobPath: string,
  ): string => `Job ${jobId}. Queue ${queueName}: ${jobPath}`,
  runRunningTooltip: `A run is already active for this plan — kill it before starting another.`,
  runScheduledToast: `Run scheduled`,
  runScheduledToastDescription: (localTime: string): string =>
    `Fires ${localTime}.`,
  runScheduledTooltip: (localTime: string): string =>
    `A run is scheduled for ${localTime}; cancel it to run now.`,
  runTerminalTooltip: `This plan is in a terminal state — create a new plan to do more work.`,
  runWithOptionsLabel: `Run with options…`,
  scheduleLabel: `Schedule…`,
  settleRunAriaLabel: (planTitle: string): string =>
    `Settle interactive run for ${planTitle}`,
  settleRunCancelLabel: `Keep waiting`,
  settleRunConfirmLabel: `Settle run`,
  settleRunDialogBody: (planTitle: string): string =>
    `The newest run for "${planTitle}" was started from an interactive agent session, so it sends no heartbeat. Nothing can verify whether it is still alive, Kill cannot reach it once the agent is gone, and it will not be settled automatically for hours. Until it is settled, its worktree stays marked busy.`,
  settleRunDialogConsequence: `Settling records the run as STALE — contact lost — not completed and not cancelled. Plan and task status are left exactly as they are. Do this only when you know the agent session is gone.`,
  settleRunDialogTitle: `Settle this interactive run?`,
  settleRunLabel: `Settle run`,
  settleRunPendingLabel: `Settling…`,
  settleRunSuccessToast: `Run recorded as STALE — contact lost. Its worktree is released; plan and task status are unchanged.`,
  settleRunTriggerTitle: `Close the books on an interactive run that has lost contact: it cannot be verified or stopped, and until it is settled its worktree stays held.`,
  workflowRunBlockedFallback: `Fix workflow run options in Configuration (aligned with workflow-ralph argv).`,
} as const;

/**
 * @description Labels for the task-detail toolbar (PlanTaskToolbar): the tag
 * section heading, the Mark Complete gating tooltips and the Promote to Plan
 * flow. Mirrors the plan-level toolbar so task and plan surfaces read the same.
 */
export const PLAN_TASK_TOOLBAR_COPY = {
  markCompleteRunningTooltip: `Unavailable while the plan run is active — kill the run first.`,
  markCompleteTerminalTooltip: `The plan is in a terminal state — create a new plan to change tasks.`,
  promoteConfirmLabel: `Promote`,
  promoteDialogBody: `This creates a new plan from this task (carrying its title, description, and tags) and closes out this task (marks it PROMOTED, meaning the work continued as its own plan). This cannot be undone from here.`,
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
 * @description Copy for the shared plan-run model picker and effort control, used by the
 * Configuration tab and the Run dialog so both surfaces say the same thing. `effortDisabledReason`
 * is the tooltip for a backend with no reasoning knob (cursor bakes effort into the model id):
 * it names the fix rather than just refusing.
 */
export const PLAN_RUN_MODEL_EFFORT_COPY = {
  effortDisabledLabel: `Effort`,
  effortDisabledReason: (backendLabel: string): string =>
    `${backendLabel} has no separate effort setting: effort is part of the model you pick. Choose a different model variant (for example a -high or -low model id) to change it.`,
  effortHint: `Reasoning effort for the run. Leave unset to use the runner's default.`,
  effortLabel: `Effort`,
  modelHint: `Models the selected runner can run. Picking one also selects its runner; the default model is omitted.`,
  modelLabel: `Model`,
  modelsError: `Could not load the model list.`,
  noModelsNotice: `No agent models were discovered. Check Settings → Agents.`,
} as const;

/**
 * @description Status cell of the queued-run audit table. `USAGE_LIMITED` is a run that stopped
 * cleanly on a Claude subscription usage limit; the cell says when it resumes (a continuation run
 * exists) or when the limit resets (none does). `SCHEDULED` shows when it fires; `MISSED` (not
 * fired within the 1-hour grace window) and `SUPERSEDED` (another run was active when it was due)
 * say why the run never started.
 */
export const PLAN_RUN_STATUS_CELL_COPY = {
  columnLabel: `Status`,
  firesPrefix: `Fires at`,
  firesUnknown: `Fire time unknown`,
  missedBadge: `Missed`,
  missedReason: `Could not fire within the 1-hour grace window after its scheduled time.`,
  notResumedSuffix: `Not resumed automatically`,
  resetUnknown: `Reset time unknown`,
  resetsPrefix: `Resets at`,
  resumedBadge: `Resumed`,
  resumedHint: `Continues a run that hit a usage limit`,
  resumesPrefix: `Resumes after the reset at`,
  scheduledBadge: `Scheduled`,
  supersededBadge: `Superseded`,
  supersededReason: `Another run of this plan was already active when this one was due.`,
  usageLimitedBadge: `Usage limited`,
} as const;

/**
 * @description Run audit table "Actions" column, the {@link PlanRunCancelScheduledButton} on a
 * SCHEDULED row and the toolbar caret-menu item (`menuItemLabel`) that opens the same dialog.
 * Cancelling removes only that scheduled run; live runs and plan/task status are untouched. "Keep it scheduled" is the dialog dismissal so it does not read as a second "Cancel".
 */
export const PLAN_RUN_CANCEL_SCHEDULED_COPY = {
  actionsColumnLabel: `Actions`,
  ariaLabel: `Cancel scheduled run`,
  confirmLabel: `Cancel run`,
  dialogBody: `This scheduled run will not fire. The plan, its tasks and any run that is already active are left as they are.`,
  dialogTitle: `Cancel scheduled run?`,
  keepLabel: `Keep it scheduled`,
  menuItemLabel: `Cancel scheduled run`,
  pendingLabel: `Cancelling…`,
  triggerLabel: `Cancel`,
  triggerTitle: `Cancel this scheduled run before it fires.`,
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
  menuAriaLabelPrefix: `Task actions for`,
  view: `View task`,
} as const;

/**
 * @description Copy for {@link PlanRunDialog}: the Run now / Schedule dialog.
 * Model and effort are PLAN settings (the action saves them to the run config),
 * iterations is this-run-only, and the workspace is read-only here, so each
 * section says which of the three it is.
 */
export const PLAN_RUN_DIALOG_COPY = {
  cancelLabel: `Cancel`,
  checkoutLabel: `Checkout`,
  checkoutNone: `No checkout selected`,
  configurationLinkLabel: `Change in Configuration`,
  description: `Run this plan now, or schedule it for later. The run uses the plan's saved run configuration plus the settings below.`,
  iterationsHint: (planIterations: number): string =>
    `Resets to the plan's configured ${planIterations} each time this dialog opens. Not saved to the plan.`,
  iterationsInvalid: `Iterations must be a whole number of at least 1.`,
  iterationsLabel: `Iterations`,
  iterationsScope: `this run only`,
  modeRunLabel: `Run now`,
  modeScheduleLabel: `Schedule`,
  planSettingsHeading: `Plan settings`,
  planSettingsNotice: `Changing the model or effort changes this plan's run config. They are saved to the plan, not just to this run.`,
  relativeIn: (count: number, unit: 'day' | 'hour' | 'minute'): string =>
    `in about ${count} ${unit}${count === 1 ? '' : 's'}`,
  relativeInLessThanMinute: `in less than a minute`,
  runSubmitLabel: `Run now`,
  runSubmittingLabel: `Starting…`,
  runSummary: `Confirm to enqueue a worker run for this plan right away.`,
  scheduleDateLabel: `Date`,
  scheduleDatePlaceholder: `Pick a date`,
  scheduleInvalid: `Choose a valid date and time for the run.`,
  schedulePast: `That time has already passed. Choose a time in the future.`,
  scheduleSubmitLabel: `Schedule run`,
  scheduleSubmittingLabel: `Scheduling…`,
  scheduleSummary: (when: string, relative: string): string =>
    `fires ${when}, ${relative}`,
  scheduleTimeLabel: `Time`,
  scheduleTimeZoneLabel: (timeZone: string): string =>
    `Local time (${timeZone})`,
  scheduleTooFar: (maxDays: number): string =>
    `Runs can be scheduled at most ${maxDays} days ahead. Choose an earlier time.`,
  title: `Run plan`,
  workspaceBranchLabel: `Branch`,
  workspaceHeading: `Workspace`,
  workspaceNotice: `Read-only here. Branch and checkout come from this plan's Configuration.`,
} as const;
