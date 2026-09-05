/**
 * Job-run lifecycle hook configuration (Jest-style phases + legacy wire aliases).
 * Canonical types for plan storage, GraphQL, and BullMQ payloads. See `JOB_RUN_LIFECYCLE_HOOKS.md`.
 *
 * Aligned with layer-1 Ralph prompt delivery (`named` → `--prompt`, `file` → `--prompt-file`)
 * in `ralph-prompt-resolution.ts` and `PlanWorkflowConfigPrompt` / `WorkflowRalphPromptLayer`.
 */

import type { WorkflowRunnerId } from '@openthrottle/openthrottle-agentic-utils';

/**
 * Canonical Jest-style lifecycle phases (normalized after parse).
 */
export type JobRunHookPhase =
  'afterAll' | 'afterEach' | 'beforeAll' | 'beforeEach';

/**
 * Legacy wire values accepted on read; mapped to canonical phases in parse.
 */
export type JobRunHookPhaseWire =
  | 'after_run'
  | 'afterAll'
  | 'afterEach'
  | 'before_run'
  | 'beforeAll'
  | 'beforeEach';

/**
 * How hook failure affects the job (see {@link resolveJobRunHookOnFailure}).
 */
export type JobRunHookOnFailure = 'block' | 'ignore' | 'warn';

/**
 * Matches {@link JobRunHookEntry} variants.
 */
export type JobRunHookKind = 'prompt_profile' | 'skill';

/**
 * Layer-1-style prompt delivery for `prompt_profile` hooks.
 */
export type JobRunHookPromptDelivery = 'file' | 'named';

/**
 * BullMQ plan job discriminant; mirrors `RunPlanJobData.runKind`.
 */
export type JobRunHookRunKind = 'orchestrator' | 'spawn';

/**
 * Terminal task outcome for afterEach hooks and conditions.
 */
export type JobRunHookTaskOutcome = 'blocked' | 'completed' | 'failed';

/**
 * Optional filters; all fields omitted means “always run” for that phase.
 */
export interface JobRunHookConditions {
  /**
   * When set, hook runs only for listed job paths. Omit = both spawn and orchestrator.
   */
  readonly runKinds?: ReadonlyArray<JobRunHookRunKind>;
  /**
   * `beforeEach` / `afterEach` only. Restrict by task category (e.g. 'infra').
   */
  readonly taskCategories?: ReadonlyArray<string>;
  /**
   * `beforeEach` / `afterEach` only. Restrict by task status at the boundary.
   */
  readonly taskStatuses?: ReadonlyArray<string>;
  /**
   * `afterAll` only. Omit = run on any terminal main-run outcome.
   * `true` = main run succeeded; `false` = main run failed or was blocked before start.
   */
  readonly whenMainRunSucceeded?: boolean;
  /**
   * `afterAll` only (canonical name). Alias of {@link JobRunHookConditions.whenMainRunSucceeded}.
   */
  readonly whenPlanRunSucceeded?: boolean;
  /**
   * `afterEach` only. Omit = any task terminal outcome.
   */
  readonly whenTaskOutcome?: ReadonlyArray<JobRunHookTaskOutcome>;
}

/**
 * Fields shared by every hook entry.
 */
export interface JobRunHookEntryBase {
  readonly conditions?: JobRunHookConditions;
  readonly onFailure?: JobRunHookOnFailure;
  /**
   * Stable ordering within the same {@link JobRunHookPhase}; lower runs first. Default `0`.
   */
  readonly order?: number;
  readonly phase: JobRunHookPhase;
  /**
   * Per-hook wall-clock cap (seconds). Omit = server default ({@link DEFAULT_JOB_RUN_HOOK_TIMEOUT_SECONDS}).
   */
  readonly timeoutSeconds?: number;
}

/**
 * `prompt_profile` + `named`: command-style path (e.g. `/agents-ralph`).
 * Resolved like `RalphNestedRunTuningInput.prompt` / `--prompt`.
 */
export interface JobRunHookPromptProfileNamed extends JobRunHookEntryBase {
  readonly kind: 'prompt_profile';
  readonly prompt: string;
  readonly promptDelivery: 'named';
}

/**
 * `prompt_profile` + `file`: repo-relative or absolute UTF-8 prompt file.
 * Resolved like `RalphNestedRunTuningInput.promptFile` / `--prompt-file`.
 */
export interface JobRunHookPromptProfileFile extends JobRunHookEntryBase {
  readonly kind: 'prompt_profile';
  readonly promptDelivery: 'file';
  readonly promptFile: string;
}

/**
 * Repo skill under `.agents/skills` (SKILL.md path).
 */
export interface JobRunHookSkill extends JobRunHookEntryBase {
  readonly kind: 'skill';
  /** Repo-relative path to `SKILL.md` (e.g. `.agents/skills/workflow-ralph/SKILL.md`). */
  readonly skillPath: string;
}

/**
 * Discriminated hook entry: phase + kind + delivery-specific target fields.
 */
export type JobRunHookEntry =
  JobRunHookPromptProfileFile | JobRunHookPromptProfileNamed | JobRunHookSkill;

/**
 * Plan-scoped hook list (versioned with plan; copied onto enqueue payload).
 */
export interface JobRunHooksConfig {
  readonly hooks: readonly JobRunHookEntry[];
}

/**
 * Optional per-hook runner overrides (phase 1: usually inherit main run).
 */
export interface JobRunHookRunOptions {
  readonly backend?: WorkflowRunnerId | null;
  readonly model?: string | null;
  readonly project?: string | null;
}

/**
 * Task context for beforeEach / afterEach hook evaluation and prompts.
 */
export interface JobRunHookTaskContext {
  readonly category: string | undefined;
  readonly id: string;
  readonly status: string;
  readonly title: string;
}

/**
 * Default timeout when {@link JobRunHookEntryBase.timeoutSeconds} is omitted.
 */
export const DEFAULT_JOB_RUN_HOOK_TIMEOUT_SECONDS = 600;

/**
 * Max hooks per phase (abuse guard).
 */
export const MAX_JOB_RUN_HOOKS_PER_PHASE = 10;

/**
 * Max total hooks on a plan.
 */
export const MAX_JOB_RUN_HOOKS_TOTAL = 20;

/**
 * Max string field length for paths / prompts.
 */
export const MAX_JOB_RUN_HOOK_STRING_LEN = 8192;

/**
 * Upper bound for {@link JobRunHookEntryBase.timeoutSeconds}.
 */
export const MAX_JOB_RUN_HOOK_TIMEOUT_SECONDS = 7 * 24 * 3600;

/**
 * Allowed repo-relative prefixes for {@link JobRunHookSkill.skillPath}.
 */
export const JOB_RUN_HOOK_SKILL_PATH_PREFIXES = ['.agents/skills/'] as const;

const PHASE_SORT_ORDER: Readonly<Record<JobRunHookPhase, number>> = {
  afterAll: 3,
  afterEach: 2,
  beforeAll: 0,
  beforeEach: 1,
};

/**
 * Maps legacy wire phase strings to canonical {@link JobRunHookPhase}.
 */
export const normalizeJobRunHookPhase = (
  wire: JobRunHookPhaseWire,
): JobRunHookPhase => {
  if (wire === 'before_run') return 'beforeAll';
  if (wire === 'after_run') return 'afterAll';

  return wire;
};

/**
 * Default {@link JobRunHookOnFailure} when omitted on an entry.
 */
export const defaultJobRunHookOnFailure = (
  phase: JobRunHookPhase,
): JobRunHookOnFailure => {
  if (phase === 'beforeAll' || phase === 'beforeEach') {
    return 'block';
  }

  return 'warn';
};

/**
 * Resolves effective failure policy for a hook entry.
 */
export const resolveJobRunHookOnFailure = (
  entry: Pick<JobRunHookEntry, 'onFailure' | 'phase'>,
): JobRunHookOnFailure => {
  return entry.onFailure ?? defaultJobRunHookOnFailure(entry.phase);
};

/**
 * Sort key: beforeAll → beforeEach → afterEach → afterAll, then `order`, then stable index.
 */
export const compareJobRunHookEntries = (
  a: Pick<JobRunHookEntry, 'order' | 'phase'>,
  b: Pick<JobRunHookEntry, 'order' | 'phase'>,
): number => {
  const byPhase = PHASE_SORT_ORDER[a.phase] - PHASE_SORT_ORDER[b.phase];
  if (byPhase !== 0) return byPhase;

  return (a.order ?? 0) - (b.order ?? 0);
};

/**
 * Returns a copy sorted for execution order.
 */
export const sortJobRunHookEntries = (
  hooks: readonly JobRunHookEntry[],
): JobRunHookEntry[] => {
  return [...hooks].sort(compareJobRunHookEntries);
};

/**
 * Short label for plan output stream / logs.
 */
export const formatJobRunHookEntryLabel = (entry: JobRunHookEntry): string => {
  const phase = entry.phase;
  const failure = resolveJobRunHookOnFailure(entry);

  if (entry.kind === 'skill') {
    return `${phase} skill ${entry.skillPath} (on_failure=${failure})`;
  }

  if (entry.promptDelivery === 'file') {
    return `${phase} prompt_profile file:${entry.promptFile} (on_failure=${failure})`;
  }

  return `${phase} prompt_profile ${entry.prompt} (on_failure=${failure})`;
};

/**
 * True when the phase runs at plan scope (once per plan run).
 */
export const isPlanScopedJobRunHookPhase = (
  phase: JobRunHookPhase,
): phase is 'afterAll' | 'beforeAll' => {
  return phase === 'beforeAll' || phase === 'afterAll';
};

/**
 * True when the phase runs at task scope (per task transition).
 */
export const isTaskScopedJobRunHookPhase = (
  phase: JobRunHookPhase,
): phase is 'afterEach' | 'beforeEach' => {
  return phase === 'beforeEach' || phase === 'afterEach';
};
