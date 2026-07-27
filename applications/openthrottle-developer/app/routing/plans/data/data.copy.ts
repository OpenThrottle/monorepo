/**
 * @description Single-sourced user-facing copy for the plans routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

export const PLAN_TASK_NOT_FOUND_COPY = {
  description: `The task you are looking for does not exist.`,
  title: `Task not found`,
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
  skillSlugPlaceholder: `e.g. validate-plan`,
  sourceLabel: `Source`,
  sourceSkill: `Skill`,
  sourceTemplate: `Template`,
  submit: `Add hook`,
  taskSectionTitle: `Task hooks`,
  titleLabel: `Title`,
  titlePlaceholder: `e.g. seed fixtures`,
} as const;

/**
 * @description Section headings and empty-state hints for the plan detail Output
 * tab, which reads as a history: agent output, then the rule-applications change
 * log, then linked artifacts. Headings mirror the reused panel components
 * (PlanRuleApplications, LinkedArtifactsPanel) so populated and empty states read
 * the same.
 */
export const PLAN_TAB_OUTPUT_COPY = {
  agentOutputHeading: `Agent output`,
  linkedArtifactsEmpty: `No linked artifacts yet. Artifacts appear here once a run produces and links them.`,
  linkedArtifactsHeading: `Linked artifacts`,
  ruleChangeLogEmpty: `No rule changes recorded yet. Evaluating rules records applications here.`,
  ruleChangeLogHeading: `Rule applications`,
} as const;

/**
 * @description Tooltip copy for the plan-level toolbar (PlanToolbar) explaining
 * why the mutating actions are disabled while a plan run is active (QUEUED or
 * IN_PROGRESS). Kill run stays available and is the intended mid-run action.
 */
export const PLAN_TOOLBAR_COPY = {
  evaluateRulesRunningTooltip: `Unavailable while a run is active — kill the run first.`,
  markCompleteRunningTooltip: `Unavailable while a run is active — kill the run first.`,
  runRunningTooltip: `A run is already active for this plan — kill it before starting another.`,
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
  promoteConfirmLabel: `Promote`,
  promoteDialogBody: `This creates a new plan from this task (carrying its title, description, and tags) and closes out this task (marks it SKIPPED and tags it "promoted"). This cannot be undone from here.`,
  promoteDialogTitle: `Promote task to a plan?`,
  promoteLabel: `Promote to Plan`,
  promoteRunningTooltip: `Unavailable while the plan run is active — kill the run first.`,
  promoteTooltip: `Create a first-class plan from this task and close the task out.`,
  promotedDisabledTooltip: `This task has already been promoted to a plan.`,
} as const;
