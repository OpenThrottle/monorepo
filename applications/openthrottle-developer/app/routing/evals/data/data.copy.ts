/**
 * @description Single-sourced user-facing copy for the evals routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

/**
 * @description The task page's Trajectories tab: the list of recorded runs.
 */
export const TASK_TRAJECTORIES_COPY = {
  empty: `No trajectories yet. One appears here once a run iteration on this task finishes.`,
  heading: `Trajectories`,
  open: `Open trajectory`,
  tab: `Trajectories`,
} as const;

/**
 * @description Labels for a trajectory's summary fields, shared by the task-page
 * list and the viewer header.
 */
export const TRAJECTORY_SUMMARY_COPY = {
  cached: `cached`,
  cost: `Cost`,
  duration: `Duration`,
  exitCode: `Exit`,
  incomplete: `Incomplete`,
  input: `in`,
  noModel: `unknown model`,
  noOutcome: `no outcome`,
  output: `out`,
  sourceSessionUpload: `Interactive session`,
  sourceSpawned: `Spawned run`,
  tokens: `Tokens`,
  toolCalls: `Tool calls`,
  truncated: `Truncated`,
  unknown: `—`,
  unpriced: `unpriced`,
} as const;

/**
 * @description The viewer header, run errors and final metrics blocks.
 */
export const TRAJECTORY_VIEWER_COPY = {
  backToTask: `Back to task`,
  errorsHeading: `Run errors`,
  finalMetricsHeading: `Final metrics`,
  metricCompletion: `Completion tokens`,
  metricCost: `Cost`,
  metricPrompt: `Prompt tokens (incl. cached)`,
  metricSteps: `Steps`,
  pageTitle: `Trajectory`,
  timelineHeading: `Steps`,
  unreadable: `This trajectory's document could not be read as ATIF, so only its summary is shown.`,
} as const;

/**
 * @description The step timeline: step headings, collapsible sections and the
 * batch controls that keep a long trajectory responsive.
 */
export const TRAJECTORY_TIMELINE_COPY = {
  arguments: `Arguments`,
  collapse: `Show less`,
  emptyMessage: `(no message)`,
  emptyResult: `(empty result)`,
  error: `Error`,
  expand: `Show all`,
  lines: `lines`,
  noResult: `No result recorded for this call.`,
  noSteps: `This trajectory has no steps.`,
  reasoning: `Reasoning`,
  showAllSteps: `Show all steps`,
  showMoreSteps: `Show more steps`,
  sourceAgent: `Agent`,
  sourceSystem: `System`,
  sourceUser: `User`,
  step: `Step`,
  steps: `steps`,
  stepsShown: `shown of`,
  subagent: `Subagent`,
  subagentsHeading: `Subagents`,
  subagentsHint: `Subagents that could not be matched to the tool call that spawned them.`,
  synthesized: `Reconstructed from result`,
  unmatchedResults: `Results without a matching call`,
} as const;

/**
 * @description The label panel: your verdict form and other raters' labels.
 */
export const TRAJECTORY_LABEL_COPY = {
  currentLabel: `Your label`,
  fail: `Fail`,
  failureType: `Failure type`,
  failureTypeHint: `Optional, for example wrong-file or gave-up.`,
  heading: `Label`,
  noOtherLabels: `No other raters have labelled this trajectory.`,
  note: `Note`,
  noteHint: `What went wrong, or what made it pass.`,
  otherLabels: `Other raters`,
  pass: `Pass`,
  remove: `Remove my label`,
  removing: `Removing…`,
  save: `Save label`,
  saving: `Saving…`,
  updated: `Updated`,
  verdict: `Verdict`,
  verdictRequired: `Choose pass or fail.`,
} as const;
