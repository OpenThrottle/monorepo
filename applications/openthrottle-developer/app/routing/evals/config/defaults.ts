import { AgentTrajectoryScoreState } from '~/__generated__/graphql';

/**
 * @description How many timeline steps render before the "show more" control.
 * A long trajectory (hundreds of steps) renders in batches so the first paint
 * stays cheap; every step past the batch is one click away.
 */
export const TRAJECTORY_STEP_BATCH_SIZE = 100;

/**
 * @description Long text (prompts, observations, reasoning) is clamped to this
 * many lines until expanded. The clamp slices the string rather than hiding
 * overflow with CSS, so a 16 KiB observation never reaches the DOM until asked.
 */
export const TRAJECTORY_CLAMP_LINES = 12;

/** Companion to {@link TRAJECTORY_CLAMP_LINES} for long single-line content. */
export const TRAJECTORY_CLAMP_CHARS = 1_600;

/** A user prompt is collapsed past this many lines. */
export const TRAJECTORY_PROMPT_CLAMP_LINES = 6;

/** Characters of a tool call's arguments shown inline while they are collapsed. */
export const TRAJECTORY_ARGUMENTS_PREVIEW_CHARS = 140;

/** The two verdicts a rater can record (see `labelAgentTrajectory`). */
export const TRAJECTORY_VERDICTS = ['pass', 'fail'] as const;

/** Form `intent` values the trajectory viewer route action dispatches on. */
export const TRAJECTORY_LABEL_INTENT = {
  label: 'label',
  remove: 'removeLabel',
} as const;

export type TrajectoryLabelIntentKey = keyof typeof TRAJECTORY_LABEL_INTENT;
export type TrajectoryLabelIntentValue =
  (typeof TRAJECTORY_LABEL_INTENT)[TrajectoryLabelIntentKey];

/** The server's cap on a label note (`LabelAgentTrajectoryInput.note`). */
export const TRAJECTORY_NOTE_MAX_LENGTH = 4_000;

/** The URL search param the Trajectories tab keeps its score filter in. */
export const TRAJECTORY_SCORE_FILTER_PARAM = 'score';

/**
 * @description The Trajectories tab's score filter, judged by your own label.
 * `unscored` is the default: the tab is a to-do list for raters.
 */
export const TRAJECTORY_SCORE_FILTER = {
  all: 'all',
  scored: 'scored',
  unscored: 'unscored',
} as const;

export type TrajectoryScoreFilterKey = keyof typeof TRAJECTORY_SCORE_FILTER;
export type TrajectoryScoreFilterValue =
  (typeof TRAJECTORY_SCORE_FILTER)[TrajectoryScoreFilterKey];

/** The server's score state for each URL filter value. */
export const TRAJECTORY_SCORE_STATE_BY_FILTER: Readonly<
  Record<TrajectoryScoreFilterValue, AgentTrajectoryScoreState>
> = {
  [TRAJECTORY_SCORE_FILTER.all]: AgentTrajectoryScoreState.All,
  [TRAJECTORY_SCORE_FILTER.scored]: AgentTrajectoryScoreState.Scored,
  [TRAJECTORY_SCORE_FILTER.unscored]: AgentTrajectoryScoreState.Unscored,
};

/** The Trajectories tab's filters, in the order the filter bar shows them. */
export const TRAJECTORY_SCORE_FILTERS = [
  TRAJECTORY_SCORE_FILTER.unscored,
  TRAJECTORY_SCORE_FILTER.scored,
  TRAJECTORY_SCORE_FILTER.all,
] as const;

/** The tabs of the evals area. */
export const EVALS_TAB = {
  runs: 'runs',
  trajectories: 'trajectories',
} as const;

export type EvalsTabKey = keyof typeof EVALS_TAB;
export type EvalsTabValue = (typeof EVALS_TAB)[EvalsTabKey];

/** Badge colour for your verdict on a trajectory, matching the label list. */
export const TRAJECTORY_VERDICT_BADGE_COLOR = {
  fail: 'red',
  pass: 'green',
  unscored: 'slate',
} as const;

export type TrajectoryVerdictBadgeColorKey =
  keyof typeof TRAJECTORY_VERDICT_BADGE_COLOR;
export type TrajectoryVerdictBadgeColorValue =
  (typeof TRAJECTORY_VERDICT_BADGE_COLOR)[TrajectoryVerdictBadgeColorKey];
