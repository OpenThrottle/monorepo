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

/**
 * @description The evals index: pick a repository, then its datasets and runs.
 */
export const EVAL_RUNS_COPY = {
  breadcrumb: `Evals`,
  datasetHeading: `Datasets`,
  datasetVersion: `v`,
  emptyDatasets: `This repository has no eval datasets yet. Create one from recorded trajectories.`,
  emptyRepositories: `No repositories are registered. Add one in Settings, then come back.`,
  emptyRuns: `No runs of this dataset yet.`,
  openReport: `Open report`,
  pageDescription: `Eval runs and how they compare. Every number is computed on the server over the trials that count.`,
  pageTitle: `Evals`,
  pickRepository: `Pick a repository to see its datasets and runs.`,
  repositoryHeading: `Repositories`,
  runColumns: {
    config: `Configuration`,
    k: `k`,
    report: `Report`,
    started: `Started`,
    status: `Status`,
  },
  unknownModel: `default model`,
} as const;

/**
 * @description One run's report page: the four headline numbers, the config
 * tuple, the graders and the per-case table.
 */
export const EVAL_REPORT_COPY = {
  breadcrumb: `Report`,
  caseFailed: `Failed`,
  caseNotCounted: `Not counted`,
  casePassed: `Passed`,
  casesColumns: {
    attempts: `Passed / counted`,
    case: `Case`,
    result: `Result`,
    split: `Split`,
  },
  casesHeading: `Cases`,
  compareHeading: `Compare with another run`,
  compareHint: `Open this run as the candidate against a baseline.`,
  compareLink: `Compare against`,
  compareNone: `No other runs of this dataset to compare with.`,
  configHeading: `Configuration`,
  configLabels: {
    authMode: `Auth mode`,
    budget: `Budget`,
    dataset: `Dataset`,
    driver: `Driver`,
    effort: `Effort`,
    finished: `Finished`,
    k: `Attempts per case (k)`,
    model: `Model`,
    promptSha: `Prompt SHA`,
    skillSha: `Skill SHA`,
    started: `Started`,
    status: `Status`,
  },
  excludedHeading: `Left out of the pass rate`,
  excludedReasons: {
    errored: `attempt errored`,
    gradeError: `a counted grader could not decide`,
    noCountedGrade: `no grade that counts`,
    usageLimited: `paused by a usage limit`,
  },
  gradersColumns: {
    calibration: `Calibration`,
    counts: `Counts`,
    grader: `Grader`,
    judge: `Judge model`,
    kappa: `Kappa (95% CI)`,
    kind: `Kind`,
    version: `Version`,
  },
  gradersCountsNo: `Not counted`,
  gradersCountsYes: `Counts`,
  gradersHeading: `Graders`,
  gradersHint: `Code graders and judges calibrated gating or unsupervised count toward the pass rate. Human grades and uncalibrated judges are shown but do not.`,
  headlineDetailCases: `cases counted`,
  headlineHeading: `Headline numbers`,
  notSet: `not set`,
  unlimited: `unlimited`,
} as const;

/**
 * @description The headline stat tiles, shared by the report and the compare
 * page so the same number is named the same way in both.
 */
export const EVAL_STAT_COPY = {
  costPerSuccess: `Cost per success`,
  costPerSuccessHint: `Cost of every counted trial divided by its passes. Not shown when any trial is unpriced.`,
  detectionFloor: `Detection floor`,
  detectionFloorHint: `The smallest change in pass rate this many cases can reliably detect. Smaller differences are noise.`,
  judgeAgreement: `Judge agreement`,
  judgeAgreementHint: `Cohen's kappa of the weakest judge against human labels.`,
  judgeAgreementNone: `no calibrated judge`,
  noValue: `—`,
  passHatK: `pass^k`,
  passHatKHint: `The chance all k attempts pass, averaged over cases.`,
  passRate: `Pass rate`,
  passRateHint: `Passing trials over trials that count, with a bootstrap 95% interval.`,
  pointsSuffix: `points`,
  unpriced: `unpriced`,
} as const;

/**
 * @description The compare page: side-by-side numbers, McNemar in plain words,
 * the comparability warnings and the regressed cases.
 */
export const EVAL_COMPARE_COPY = {
  baseline: `Baseline`,
  breadcrumb: `Compare`,
  candidate: `Candidate`,
  improvedEmpty: `No case got better.`,
  improvedHeading: `Got better`,
  metricColumn: `Number`,
  missingRuns: `Pick a baseline and a candidate run: /evals/compare?base=<runId>&candidate=<runId>.`,
  noShared: `No case has a counted outcome in both runs, so there is nothing to test.`,
  notSignificant: `not significant at this size`,
  pageTitle: `Compare runs`,
  regressedEmpty: `No case got worse.`,
  regressedHeading: `Got worse`,
  regressionColumns: {
    base: `Baseline`,
    candidate: `Candidate`,
    case: `Case`,
    split: `Split`,
  },
  sharedCases: `shared cases`,
  significant: `significant at this size`,
  verdictHeading: `Did it get worse?`,
  warningsHeading: `Not strictly comparable`,
} as const;
