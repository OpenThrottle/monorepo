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
  internalUsage: `Every feature we ship starts as a plan: we break an idea or PRD into tasks, hand them to Ralph to execute one at a time, and each commit carries its Plan-Id and Task-Id — so shipped work on main traces straight back to the plan that asked for it.`,
  steps: [
    `Create a plan and give it a clear title and description.`,
    `Break it into tasks — or drop in a PRD and let it decompose for you.`,
    `Queue a run to have Ralph work the tasks one at a time.`,
    `Follow the output and linked commits as the work lands.`,
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
 * why the mutating actions are disabled. The `*Running*` strings cover an active
 * run (QUEUED / IN_PROGRESS) — Kill run stays available and is the intended
 * mid-run action. The `*Terminal*` strings cover a finished/abandoned plan
 * (COMPLETED / CANCELED / SKIPPED): there is no more work to do here, so the
 * fix is to fall forward and ship a new plan rather than to unblock the action.
 */
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
