/**
 * @description Parse and validate job-run lifecycle hook JSON for plan storage and enqueue.
 */

import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { DEFAULT_RALPH_PROMPT } from './ralph-runtime-config';
import {
  DEFAULT_JOB_RUN_HOOK_TIMEOUT_SECONDS,
  JOB_RUN_HOOK_SKILL_PATH_PREFIXES,
  MAX_JOB_RUN_HOOK_STRING_LEN,
  MAX_JOB_RUN_HOOK_TIMEOUT_SECONDS,
  MAX_JOB_RUN_HOOKS_PER_PHASE,
  MAX_JOB_RUN_HOOKS_TOTAL,
  type JobRunHookConditions,
  type JobRunHookEntry,
  type JobRunHookOnFailure,
  type JobRunHookPhase,
  type JobRunHookPhaseWire,
  type JobRunHookPromptDelivery,
  type JobRunHookRunKind,
  type JobRunHookTaskContext,
  type JobRunHookTaskOutcome,
  type JobRunHooksConfig,
  normalizeJobRunHookPhase,
  sortJobRunHookEntries,
} from '../types/job-run-lifecycle-hooks';

const JOB_RUN_HOOK_PHASES_WIRE: readonly JobRunHookPhaseWire[] = [
  'afterAll',
  'afterEach',
  'after_run',
  'beforeAll',
  'beforeEach',
  'before_run',
];
const JOB_RUN_HOOK_ON_FAILURE: readonly JobRunHookOnFailure[] = [
  'block',
  'warn',
  'ignore',
];
const JOB_RUN_HOOK_RUN_KINDS: readonly JobRunHookRunKind[] = [
  'spawn',
  'orchestrator',
];
const JOB_RUN_HOOK_PROMPT_DELIVERY: readonly JobRunHookPromptDelivery[] = [
  'named',
  'file',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeOptionalString = (
  value: unknown,
  field: string,
): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  if (trimmed.length > MAX_JOB_RUN_HOOK_STRING_LEN) {
    throw new Error(
      `${field} must be at most ${MAX_JOB_RUN_HOOK_STRING_LEN} characters`,
    );
  }
  return trimmed;
};

const parseOptionalPositiveInt = (
  value: unknown,
  field: string,
  max: number,
): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  if (value > max) {
    throw new Error(`${field} must be at most ${max}`);
  }
  return value;
};

const parsePhase = (value: unknown): JobRunHookPhase => {
  if (
    typeof value !== 'string' ||
    !JOB_RUN_HOOK_PHASES_WIRE.includes(value as JobRunHookPhaseWire)
  ) {
    throw new Error(
      `phase must be one of: ${JOB_RUN_HOOK_PHASES_WIRE.join(', ')}`,
    );
  }
  return normalizeJobRunHookPhase(value as JobRunHookPhaseWire);
};

const parseOnFailure = (value: unknown): JobRunHookOnFailure | undefined => {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value !== 'string' ||
    !JOB_RUN_HOOK_ON_FAILURE.includes(value as JobRunHookOnFailure)
  ) {
    throw new Error(
      `onFailure must be one of: ${JOB_RUN_HOOK_ON_FAILURE.join(', ')}`,
    );
  }
  return value as JobRunHookOnFailure;
};

const parsePromptDelivery = (
  value: unknown,
): JobRunHookPromptDelivery | undefined => {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value !== 'string' ||
    !JOB_RUN_HOOK_PROMPT_DELIVERY.includes(value as JobRunHookPromptDelivery)
  ) {
    throw new Error(
      `promptDelivery must be one of: ${JOB_RUN_HOOK_PROMPT_DELIVERY.join(', ')}`,
    );
  }
  return value as JobRunHookPromptDelivery;
};

const parseConditions = (value: unknown): JobRunHookConditions | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    throw new Error('conditions must be an object');
  }

  let runKinds: JobRunHookRunKind[] | undefined;
  if (value.runKinds !== undefined && value.runKinds !== null) {
    if (!Array.isArray(value.runKinds)) {
      throw new Error('conditions.runKinds must be an array');
    }
    runKinds = value.runKinds.map((item, index) => {
      if (
        typeof item !== 'string' ||
        !JOB_RUN_HOOK_RUN_KINDS.includes(item as JobRunHookRunKind)
      ) {
        throw new Error(
          `conditions.runKinds[${index}] must be one of: ${JOB_RUN_HOOK_RUN_KINDS.join(', ')}`,
        );
      }
      return item as JobRunHookRunKind;
    });
    if (runKinds.length === 0) {
      throw new Error('conditions.runKinds must not be empty when set');
    }
  }

  let whenMainRunSucceeded: boolean | undefined;
  const whenPlanRunSucceededRaw =
    value.whenPlanRunSucceeded ?? value.whenMainRunSucceeded;
  if (
    whenPlanRunSucceededRaw !== undefined &&
    whenPlanRunSucceededRaw !== null
  ) {
    if (typeof whenPlanRunSucceededRaw !== 'boolean') {
      throw new Error(
        'conditions.whenPlanRunSucceeded / whenMainRunSucceeded must be a boolean',
      );
    }
    whenMainRunSucceeded = whenPlanRunSucceededRaw;
  }

  let whenTaskOutcome: JobRunHookTaskOutcome[] | undefined;
  if (value.whenTaskOutcome !== undefined && value.whenTaskOutcome !== null) {
    if (!Array.isArray(value.whenTaskOutcome)) {
      throw new Error('conditions.whenTaskOutcome must be an array');
    }
    const allowed: readonly JobRunHookTaskOutcome[] = [
      'blocked',
      'completed',
      'failed',
    ];
    whenTaskOutcome = value.whenTaskOutcome.map((item, index) => {
      if (
        typeof item !== 'string' ||
        !allowed.includes(item as JobRunHookTaskOutcome)
      ) {
        throw new Error(
          `conditions.whenTaskOutcome[${index}] must be one of: ${allowed.join(', ')}`,
        );
      }
      return item as JobRunHookTaskOutcome;
    });
    if (whenTaskOutcome.length === 0) {
      throw new Error('conditions.whenTaskOutcome must not be empty when set');
    }
  }

  const parseStringArray = (
    field: 'taskCategories' | 'taskStatuses',
  ): string[] | undefined => {
    const raw = value[field];
    if (raw === undefined || raw === null) return undefined;
    if (!Array.isArray(raw)) {
      throw new Error(`conditions.${field} must be an array`);
    }
    const parsed = raw.map((item, index) => {
      if (typeof item !== 'string' || item.trim() === '') {
        throw new Error(
          `conditions.${field}[${index}] must be a non-empty string`,
        );
      }
      return item.trim();
    });
    if (parsed.length === 0) {
      throw new Error(`conditions.${field} must not be empty when set`);
    }
    return parsed;
  };

  const taskCategories = parseStringArray('taskCategories');
  const taskStatuses = parseStringArray('taskStatuses');

  if (
    runKinds === undefined &&
    whenMainRunSucceeded === undefined &&
    whenTaskOutcome === undefined &&
    taskCategories === undefined &&
    taskStatuses === undefined
  ) {
    return undefined;
  }

  return {
    ...(runKinds !== undefined ? { runKinds } : {}),
    ...(whenMainRunSucceeded !== undefined ? { whenMainRunSucceeded } : {}),
    ...(whenMainRunSucceeded !== undefined
      ? { whenPlanRunSucceeded: whenMainRunSucceeded }
      : {}),
    ...(whenTaskOutcome !== undefined ? { whenTaskOutcome } : {}),
    ...(taskCategories !== undefined ? { taskCategories } : {}),
    ...(taskStatuses !== undefined ? { taskStatuses } : {}),
  };
};

/**
 * @description Validates named prompt path (layer-1 `--prompt`): non-empty, leading `/` for agent commands.
 */
export const validateJobRunHookNamedPrompt = (prompt: string): string => {
  const trimmed = prompt.trim();
  if (trimmed === '') {
    throw new Error('prompt must be non-empty for named prompt_profile');
  }
  if (trimmed.length > MAX_JOB_RUN_HOOK_STRING_LEN) {
    throw new Error(
      `prompt must be at most ${MAX_JOB_RUN_HOOK_STRING_LEN} characters`,
    );
  }
  if (!trimmed.startsWith('/')) {
    throw new Error(
      'named prompt_profile must start with "/" (e.g. /agents-ralph)',
    );
  }
  return trimmed;
};

/**
 * @description Validates repo-relative or absolute prompt file path.
 */
export const validateJobRunHookPromptFile = (
  promptFile: string,
  options?: { readonly cwd?: string; readonly requireExists?: boolean },
): string => {
  const trimmed = promptFile.trim();
  if (trimmed === '') {
    throw new Error('promptFile must be non-empty for file prompt_profile');
  }
  if (trimmed.length > MAX_JOB_RUN_HOOK_STRING_LEN) {
    throw new Error(
      `promptFile must be at most ${MAX_JOB_RUN_HOOK_STRING_LEN} characters`,
    );
  }
  if (options?.requireExists === true && options.cwd !== undefined) {
    const absolute = isAbsolute(trimmed)
      ? trimmed
      : resolve(options.cwd, trimmed);
    if (!existsSync(absolute)) {
      throw new Error(`promptFile does not exist: ${trimmed}`);
    }
  }
  return trimmed;
};

/**
 * @description Validates repo-relative skill path under allowed skill roots.
 */
export const validateJobRunHookSkillPath = (
  skillPath: string,
  options?: { readonly cwd?: string; readonly requireExists?: boolean },
): string => {
  const trimmed = skillPath.trim().replace(/\\/g, '/');
  if (trimmed === '') {
    throw new Error('skillPath must be non-empty');
  }
  if (trimmed.length > MAX_JOB_RUN_HOOK_STRING_LEN) {
    throw new Error(
      `skillPath must be at most ${MAX_JOB_RUN_HOOK_STRING_LEN} characters`,
    );
  }
  if (isAbsolute(trimmed)) {
    throw new Error('skillPath must be repo-relative');
  }
  const allowed = JOB_RUN_HOOK_SKILL_PATH_PREFIXES.some((prefix) =>
    trimmed.startsWith(prefix),
  );
  if (!allowed) {
    throw new Error(
      `skillPath must start with one of: ${JOB_RUN_HOOK_SKILL_PATH_PREFIXES.join(', ')}`,
    );
  }
  if (!trimmed.endsWith('SKILL.md')) {
    throw new Error('skillPath must end with SKILL.md');
  }
  if (options?.requireExists === true && options.cwd !== undefined) {
    const absolute = resolve(options.cwd, trimmed);
    if (!existsSync(absolute)) {
      throw new Error(`skillPath does not exist: ${trimmed}`);
    }
  }
  return trimmed;
};

/**
 * @description Parses one wire-format hook object into a discriminated {@link JobRunHookEntry}.
 *
 * Wire shape supports:
 * - Canonical: `kind` + `promptDelivery` + `prompt` | `promptFile` | `skillPath`
 * - Legacy draft: `kind` + `target` (named prompt or skill path; file requires `promptDelivery: file`)
 */
export const parseJobRunHookEntry = (
  raw: unknown,
  index?: number,
): JobRunHookEntry => {
  const label =
    index === undefined ? 'hook entry' : `hook entry at index ${index}`;
  if (!isRecord(raw)) {
    throw new Error(`${label} must be an object`);
  }

  const phase = parsePhase(raw.phase);
  const onFailure = parseOnFailure(raw.onFailure);
  const order = parseOptionalPositiveInt(raw.order, 'order', 1_000_000);
  const timeoutSeconds = parseOptionalPositiveInt(
    raw.timeoutSeconds,
    'timeoutSeconds',
    MAX_JOB_RUN_HOOK_TIMEOUT_SECONDS,
  );
  if (timeoutSeconds !== undefined && timeoutSeconds < 1) {
    throw new Error('timeoutSeconds must be at least 1 when set');
  }
  const conditions = parseConditions(raw.conditions);

  if (conditions?.whenMainRunSucceeded !== undefined && phase !== 'afterAll') {
    throw new Error(
      'conditions.whenMainRunSucceeded / whenPlanRunSucceeded is only valid for afterAll hooks',
    );
  }

  if (
    (conditions?.whenTaskOutcome !== undefined ||
      conditions?.taskCategories !== undefined ||
      conditions?.taskStatuses !== undefined) &&
    phase !== 'afterEach' &&
    phase !== 'beforeEach'
  ) {
    throw new Error(
      'conditions.whenTaskOutcome, taskCategories, and taskStatuses are only valid for beforeEach / afterEach hooks',
    );
  }

  if (conditions?.whenTaskOutcome !== undefined && phase !== 'afterEach') {
    throw new Error(
      'conditions.whenTaskOutcome is only valid for afterEach hooks',
    );
  }

  const kind = raw.kind;
  if (kind !== 'prompt_profile' && kind !== 'skill') {
    throw new Error(`${label}: kind must be prompt_profile or skill`);
  }

  const base = {
    phase,
    ...(onFailure !== undefined ? { onFailure } : {}),
    ...(order !== undefined ? { order } : {}),
    ...(timeoutSeconds !== undefined ? { timeoutSeconds } : {}),
    ...(conditions !== undefined ? { conditions } : {}),
  };

  if (kind === 'skill') {
    const skillPath =
      normalizeOptionalString(raw.skillPath, 'skillPath') ??
      normalizeOptionalString(raw.target, 'target');
    if (skillPath === undefined) {
      throw new Error(`${label}: skillPath or target is required for skill`);
    }
    return {
      ...base,
      kind: 'skill',
      skillPath: validateJobRunHookSkillPath(skillPath),
    };
  }

  const promptDelivery = parsePromptDelivery(raw.promptDelivery);
  const prompt = normalizeOptionalString(raw.prompt, 'prompt');
  const promptFile = normalizeOptionalString(raw.promptFile, 'promptFile');
  const target = normalizeOptionalString(raw.target, 'target');

  if (promptDelivery === 'file' || promptFile !== undefined) {
    const path = promptFile ?? target;
    if (path === undefined) {
      throw new Error(
        `${label}: promptFile or target is required for file prompt_profile`,
      );
    }
    if (prompt !== undefined) {
      throw new Error(
        `${label}: prompt must not be set when promptDelivery is file`,
      );
    }
    return {
      ...base,
      kind: 'prompt_profile',
      promptDelivery: 'file',
      promptFile: validateJobRunHookPromptFile(path),
    };
  }

  const named = prompt ?? target;
  if (named === undefined) {
    throw new Error(
      `${label}: prompt or target is required for named prompt_profile`,
    );
  }
  if (promptFile !== undefined) {
    throw new Error(
      `${label}: promptFile must not be set for named prompt_profile`,
    );
  }
  return {
    ...base,
    kind: 'prompt_profile',
    prompt: validateJobRunHookNamedPrompt(named),
    promptDelivery: 'named',
  };
};

/**
 * @description Parses and validates a hook list; returns sorted canonical entries.
 */
export const parseJobRunHooksConfig = (
  raw: unknown,
  options?: {
    readonly cwd?: string;
    readonly requireTargetsExist?: boolean;
  },
): JobRunHooksConfig => {
  if (raw === undefined || raw === null) {
    return { hooks: [] };
  }

  let list: unknown[];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (isRecord(raw) && Array.isArray(raw.hooks)) {
    list = raw.hooks;
  } else {
    throw new Error('job run hooks must be an array or { hooks: [...] }');
  }

  if (list.length > MAX_JOB_RUN_HOOKS_TOTAL) {
    throw new Error(
      `at most ${MAX_JOB_RUN_HOOKS_TOTAL} hooks allowed per plan`,
    );
  }

  const entries = list.map((item, index) => {
    const entry = parseJobRunHookEntry(item, index);
    if (options?.requireTargetsExist === true && options.cwd !== undefined) {
      if (entry.kind === 'prompt_profile' && entry.promptDelivery === 'file') {
        validateJobRunHookPromptFile(entry.promptFile, {
          cwd: options.cwd,
          requireExists: true,
        });
      }
      if (entry.kind === 'skill') {
        validateJobRunHookSkillPath(entry.skillPath, {
          cwd: options.cwd,
          requireExists: true,
        });
      }
    }
    return entry;
  });

  const byPhase = new Map<JobRunHookPhase, number>();
  for (const entry of entries) {
    const count = (byPhase.get(entry.phase) ?? 0) + 1;
    byPhase.set(entry.phase, count);
    if (count > MAX_JOB_RUN_HOOKS_PER_PHASE) {
      throw new Error(
        `at most ${MAX_JOB_RUN_HOOKS_PER_PHASE} hooks per phase (${entry.phase})`,
      );
    }
  }

  return { hooks: sortJobRunHookEntries(entries) };
};

/**
 * @description Effective timeout for a hook run (seconds).
 */
export const resolveJobRunHookTimeoutSeconds = (
  entry: Pick<JobRunHookEntry, 'timeoutSeconds'>,
): number =>
  entry.timeoutSeconds !== undefined && entry.timeoutSeconds >= 1
    ? entry.timeoutSeconds
    : DEFAULT_JOB_RUN_HOOK_TIMEOUT_SECONDS;

/**
 * @description Whether a hook should run for the current job context.
 */
export const shouldRunJobRunHook = (
  entry: JobRunHookEntry,
  context: {
    readonly mainRunStarted: boolean;
    readonly mainRunSucceeded: boolean;
    readonly phase: JobRunHookPhase;
    readonly runKind: JobRunHookRunKind;
    readonly task?: JobRunHookTaskContext;
    readonly taskOutcome?: JobRunHookTaskOutcome;
  },
): boolean => {
  if (entry.phase !== context.phase) return false;

  const conditions = entry.conditions;
  if (conditions?.runKinds !== undefined && conditions.runKinds.length > 0) {
    if (!conditions.runKinds.includes(context.runKind)) {
      return false;
    }
  }

  const whenPlanSucceeded =
    conditions?.whenPlanRunSucceeded ?? conditions?.whenMainRunSucceeded;
  if (entry.phase === 'afterAll' && whenPlanSucceeded !== undefined) {
    if (!context.mainRunStarted) {
      return false;
    }
    if (whenPlanSucceeded !== context.mainRunSucceeded) {
      return false;
    }
  }

  if (
    entry.phase === 'afterEach' &&
    conditions?.whenTaskOutcome !== undefined
  ) {
    if (context.taskOutcome === undefined) {
      return false;
    }
    if (!conditions.whenTaskOutcome.includes(context.taskOutcome)) {
      return false;
    }
  }

  if (
    (entry.phase === 'beforeEach' || entry.phase === 'afterEach') &&
    context.task !== undefined
  ) {
    if (
      conditions?.taskCategories !== undefined &&
      conditions.taskCategories.length > 0
    ) {
      const category = context.task.category ?? '';
      if (!conditions.taskCategories.includes(category)) {
        return false;
      }
    }

    if (
      conditions?.taskStatuses !== undefined &&
      conditions.taskStatuses.length > 0
    ) {
      if (!conditions.taskStatuses.includes(context.task.status)) {
        return false;
      }
    }
  }

  return true;
};

/**
 * @description Maps a hook entry to layer-1 seed fields for the hook runner (not main run).
 */
export const jobRunHookEntryToPromptSeed = (
  entry: JobRunHookEntry,
): { readonly prompt: string; readonly promptFile?: string } => {
  if (entry.kind === 'skill') {
    return {
      prompt: `[skill:${entry.skillPath}]`,
      promptFile: undefined,
    };
  }
  if (entry.promptDelivery === 'file') {
    return {
      prompt: DEFAULT_RALPH_PROMPT,
      promptFile: entry.promptFile,
    };
  }
  return { prompt: entry.prompt, promptFile: undefined };
};
