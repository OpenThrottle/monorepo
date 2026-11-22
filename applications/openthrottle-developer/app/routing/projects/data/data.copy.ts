/**
 * @description Single-sourced user-facing copy for the projects routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

export const PROJECT_NOT_FOUND_COPY = {
  description: `The project you're looking for doesn't exist or was removed.`,
  title: `Project not found`,
} as const;

export const PROJECTS_ROW_ACTIONS_COPY = {
  menuAriaLabelPrefix: `Project actions for`,
  view: `View project`,
} as const;

export const PROJECT_REPOSITORIES_COPY = {
  addButton: `Link`,
  addLabel: `Link a repository`,
  addPlaceholder: `Select a repository`,
  empty: `No repositories are linked to this project yet.`,
  heading: `Repositories`,
  menuAriaLabelPrefix: `Repository actions for`,
  unlink: `Unlink repository`,
} as const;

export const PROJECT_PLANS_COPY = {
  addButton: `Add plan`,
  addLabel: `Add an existing plan`,
  addPlaceholder: `Select a plan`,
  empty: `No plans in this project yet. Add an existing plan to start the order.`,
  heading: `Plans`,
  menuAriaLabelPrefix: `Plan actions for`,
  moveDown: `Move down`,
  moveUp: `Move up`,
  openPlan: `Open plan`,
  pullRequestAriaLabelPrefix: `Pull request`,
  pullRequestPrefix: `PR #`,
  remove: `Remove from project`,
} as const;

export const PROJECT_RUN_COPY = {
  cancel: `Cancel run`,
  cancelled: `The last run was cancelled.`,
  cancelling: `Cancelling…`,
  completed: `The last run finished: every plan has a draft PR.`,
  currentPlanLabel: `Running`,
  description: `Runs the plans one after another in this order, one draft PR each. The first plan that does not finish stops the run.`,
  heading: `Project run`,
  idle: `This project has not been run yet.`,
  onPlanPrefix: `On plan`,
  resume: `Resume`,
  run: `Run project`,
  stoppedLabel: `Stopped here`,
  stoppedPrefix: `Stopped at`,
  stoppedResumeHint: `Resume starts at this plan; finished plans are passed over.`,
} as const;

export const PROJECT_RUN_STATE_LABEL = {
  cancelled: `Cancelled`,
  completed: `Completed`,
  idle: `Not run`,
  running: `Running`,
  stopped: `Stopped`,
} as const;
