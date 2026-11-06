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

/** The server's cap on a label note (`LabelAgentTrajectoryInput.note`). */
export const TRAJECTORY_NOTE_MAX_LENGTH = 4_000;
