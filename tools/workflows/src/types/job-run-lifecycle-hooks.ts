/**
 * @description Job-run lifecycle hook configuration (phase 1: `before_run` / `after_run`).
 * Canonical types for plan storage, GraphQL, and BullMQ payloads. See `JOB_RUN_LIFECYCLE_HOOKS.md`.
 *
 * Aligned with layer-1 Ralph prompt delivery (`named` → `--prompt`, `file` → `--prompt-file`)
 * in `ralph-prompt-resolution.ts` and `PlanWorkflowConfigPrompt` / `WorkflowRalphPromptLayer`.
 */

import type { RalphExecutionBackendId } from '../utils/ralph-execution-backend';

/** @description When a hook runs relative to the main Ralph/orchestrator run. */
export type JobRunHookPhase = 'after_run' | 'before_run';

/** @description How hook failure affects the job (see {@link resolveJobRunHookOnFailure}). */
export type JobRunHookOnFailure = 'block' | 'ignore' | 'warn';

/** @description Matches {@link JobRunHookEntry} variants. */
export type JobRunHookKind = 'prompt_profile' | 'skill';

/** @description Layer-1-style prompt delivery for `prompt_profile` hooks. */
export type JobRunHookPromptDelivery = 'file' | 'named';

/** @description BullMQ plan job discriminant; mirrors `RunPlanJobData.runKind`. */
export type JobRunHookRunKind = 'orchestrator' | 'spawn';

/**
 * @description Optional filters; all fields omitted means “always run” for that phase.
 */
export interface JobRunHookConditions {
  /**
   * When set, hook runs only for listed job paths. Omit = both spawn and orchestrator.
   */
  readonly runKinds?: ReadonlyArray<JobRunHookRunKind>;
  /**
   * `after_run` only. Omit = run on any terminal main-run outcome.
   * `true` = main run succeeded; `false` = main run failed or was blocked before start.
   */
  readonly whenMainRunSucceeded?: boolean;
}

/** @description Fields shared by every hook entry. */
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
 * @description `prompt_profile` + `named`: command-style path (e.g. `/agents/ralph`).
 * Resolved like `RalphNestedRunTuningInput.prompt` / `--prompt`.
 */
export interface JobRunHookPromptProfileNamed extends JobRunHookEntryBase {
  readonly kind: 'prompt_profile';
  readonly prompt: string;
  readonly promptDelivery: 'named';
}

/**
 * @description `prompt_profile` + `file`: repo-relative or absolute UTF-8 prompt file.
 * Resolved like `RalphNestedRunTuningInput.promptFile` / `--prompt-file`.
 */
export interface JobRunHookPromptProfileFile extends JobRunHookEntryBase {
  readonly kind: 'prompt_profile';
  readonly promptDelivery: 'file';
  readonly promptFile: string;
}

/**
 * @description Repo skill under `.agents/skills` or `.cursor/skills` (SKILL.md path).
 */
export interface JobRunHookSkill extends JobRunHookEntryBase {
  readonly kind: 'skill';
  /** Repo-relative path to `SKILL.md` (e.g. `.agents/skills/workflow-ralph/SKILL.md`). */
  readonly skillPath: string;
}

/**
 * @description Discriminated hook entry: phase + kind + delivery-specific target fields.
 */
export type JobRunHookEntry =
  | JobRunHookPromptProfileFile
  | JobRunHookPromptProfileNamed
  | JobRunHookSkill;

/**
 * @description Plan-scoped hook list (versioned with plan; copied onto enqueue payload).
 */
export interface JobRunHooksConfig {
  readonly hooks: readonly JobRunHookEntry[];
}

/**
 * @description Optional per-hook runner overrides (phase 1: usually inherit main run).
 */
export interface JobRunHookRunOptions {
  readonly backend?: RalphExecutionBackendId | null;
  readonly model?: string | null;
  readonly project?: string | null;
}

/** @description Default timeout when {@link JobRunHookEntryBase.timeoutSeconds} is omitted. */
export const DEFAULT_JOB_RUN_HOOK_TIMEOUT_SECONDS = 600;

/** @description Max hooks per phase (abuse guard). */
export const MAX_JOB_RUN_HOOKS_PER_PHASE = 10;

/** @description Max total hooks on a plan. */
export const MAX_JOB_RUN_HOOKS_TOTAL = 20;

/** @description Max string field length for paths / prompts. */
export const MAX_JOB_RUN_HOOK_STRING_LEN = 8192;

/** @description Upper bound for {@link JobRunHookEntryBase.timeoutSeconds}. */
export const MAX_JOB_RUN_HOOK_TIMEOUT_SECONDS = 7 * 24 * 3600;

/** @description Allowed repo-relative prefixes for {@link JobRunHookSkill.skillPath}. */
export const JOB_RUN_HOOK_SKILL_PATH_PREFIXES = [
  '.agents/skills/',
  '.cursor/skills/',
] as const;

/**
 * @description Default {@link JobRunHookOnFailure} when omitted on an entry.
 */
export const defaultJobRunHookOnFailure = (
  phase: JobRunHookPhase,
): JobRunHookOnFailure => (phase === 'before_run' ? 'block' : 'warn');

/**
 * @description Resolves effective failure policy for a hook entry.
 */
export const resolveJobRunHookOnFailure = (
  entry: Pick<JobRunHookEntry, 'onFailure' | 'phase'>,
): JobRunHookOnFailure =>
  entry.onFailure ?? defaultJobRunHookOnFailure(entry.phase);

/**
 * @description Sort key: `before_run` before `after_run`, then `order`, then stable index.
 */
export const compareJobRunHookEntries = (
  a: Pick<JobRunHookEntry, 'order' | 'phase'>,
  b: Pick<JobRunHookEntry, 'order' | 'phase'>,
): number => {
  const phaseOrder = (p: JobRunHookPhase): number =>
    p === 'before_run' ? 0 : 1;
  const byPhase = phaseOrder(a.phase) - phaseOrder(b.phase);
  if (byPhase !== 0) return byPhase;
  return (a.order ?? 0) - (b.order ?? 0);
};

/**
 * @description Returns a copy sorted for execution order.
 */
export const sortJobRunHookEntries = (
  hooks: readonly JobRunHookEntry[],
): JobRunHookEntry[] => [...hooks].sort(compareJobRunHookEntries);

/**
 * @description Short label for plan output stream / logs.
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
