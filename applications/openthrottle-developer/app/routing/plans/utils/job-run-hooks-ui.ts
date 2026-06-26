/**
 * @description Client-side job-run lifecycle hooks: parse, validate, and serialize for plan UI + enqueue.
 * Constants align with `tools/workflows/src/types/job-run-lifecycle-hooks.ts` (no Node `fs` import).
 */

import { DEFAULT_RALPH_PROMPT } from '~/routing/plans/utils/build-workflow-ralph-argv';

/** When a hook runs relative to the main Ralph/orchestrator run. */
export type JobRunHookPhase = 'after_run' | 'before_run';

/** How hook failure affects the job. */
export type JobRunHookOnFailure = 'block' | 'ignore' | 'warn';

/** Matches hook entry variants. */
export type JobRunHookKind = 'prompt_profile' | 'skill';

export type JobRunHookPromptDelivery = 'file' | 'named';

export interface JobRunHookEntryBase {
  readonly conditions?: {
    readonly runKinds?: ReadonlyArray<'orchestrator' | 'spawn'>;
    readonly whenMainRunSucceeded?: boolean;
  };
  readonly onFailure?: JobRunHookOnFailure;
  readonly order?: number;
  readonly phase: JobRunHookPhase;
  readonly timeoutSeconds?: number;
}

export interface JobRunHookPromptProfileNamed extends JobRunHookEntryBase {
  readonly kind: 'prompt_profile';
  readonly prompt: string;
  readonly promptDelivery: 'named';
}

export interface JobRunHookPromptProfileFile extends JobRunHookEntryBase {
  readonly kind: 'prompt_profile';
  readonly promptDelivery: 'file';
  readonly promptFile: string;
}

export interface JobRunHookSkill extends JobRunHookEntryBase {
  readonly kind: 'skill';
  readonly skillPath: string;
}

export type JobRunHookEntry =
  | JobRunHookPromptProfileFile
  | JobRunHookPromptProfileNamed
  | JobRunHookSkill;

export interface JobRunHooksConfig {
  readonly hooks: readonly JobRunHookEntry[];
}

export const DEFAULT_JOB_RUN_HOOK_TIMEOUT_SECONDS = 600;
export const MAX_JOB_RUN_HOOKS_PER_PHASE = 10;
export const MAX_JOB_RUN_HOOKS_TOTAL = 20;
export const MAX_JOB_RUN_HOOK_STRING_LEN = 8192;
export const MAX_JOB_RUN_HOOK_TIMEOUT_SECONDS = 7 * 24 * 3600;

export const JOB_RUN_HOOK_SKILL_PATH_PREFIXES = [
  '.agents/skills/',
  '.cursor/skills/',
] as const;

const compareJobRunHookEntries = (
  a: Pick<JobRunHookEntry, 'order' | 'phase'>,
  b: Pick<JobRunHookEntry, 'order' | 'phase'>,
): number => {
  const phaseOrder = (p: JobRunHookPhase): number =>
    p === 'before_run' ? 0 : 1;
  const byPhase = phaseOrder(a.phase) - phaseOrder(b.phase);
  if (byPhase !== 0) return byPhase;
  return (a.order ?? 0) - (b.order ?? 0);
};

const sortJobRunHookEntries = (
  hooks: readonly JobRunHookEntry[],
): JobRunHookEntry[] => [...hooks].sort(compareJobRunHookEntries);

/** Stable React key for an editable hook row. */
export type JobRunHookDraftRow = JobRunHookEntry & {
  readonly draftId: string;
};

const JOB_RUN_HOOK_PHASES: readonly JobRunHookPhase[] = [
  'after_run',
  'before_run',
];

const JOB_RUN_HOOK_ON_FAILURE: readonly JobRunHookOnFailure[] = [
  'block',
  'ignore',
  'warn',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const trimOptional = (value: unknown, field: string): string | undefined => {
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

export const isJobRunHookPhase = (value: unknown): value is JobRunHookPhase =>
  typeof value === 'string' &&
  JOB_RUN_HOOK_PHASES.some((phase) => phase === value);

const isJobRunHookOnFailure = (value: unknown): value is JobRunHookOnFailure =>
  typeof value === 'string' &&
  JOB_RUN_HOOK_ON_FAILURE.some((onFailure) => onFailure === value);

const parsePhase = (value: unknown): JobRunHookPhase => {
  if (!isJobRunHookPhase(value)) {
    throw new Error(`phase must be one of: ${JOB_RUN_HOOK_PHASES.join(', ')}`);
  }
  return value;
};

const parseOnFailure = (value: unknown): JobRunHookOnFailure | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isJobRunHookOnFailure(value)) {
    throw new Error(
      `onFailure must be one of: ${JOB_RUN_HOOK_ON_FAILURE.join(', ')}`,
    );
  }
  return value;
};

const parseHookEntryFromRecord = (
  raw: Record<string, unknown>,
  index: number,
): JobRunHookEntry => {
  const label = `hook at index ${index}`;
  const phase = parsePhase(raw.phase);
  const onFailure = parseOnFailure(raw.onFailure);
  const order =
    raw.order === undefined || raw.order === null
      ? undefined
      : (() => {
          if (
            typeof raw.order !== 'number' ||
            !Number.isInteger(raw.order) ||
            raw.order < 0
          ) {
            throw new Error(`${label}: order must be a non-negative integer`);
          }
          return raw.order;
        })();
  const timeoutSeconds =
    raw.timeoutSeconds === undefined || raw.timeoutSeconds === null
      ? undefined
      : (() => {
          if (
            typeof raw.timeoutSeconds !== 'number' ||
            !Number.isInteger(raw.timeoutSeconds) ||
            raw.timeoutSeconds < 1 ||
            raw.timeoutSeconds > MAX_JOB_RUN_HOOK_TIMEOUT_SECONDS
          ) {
            throw new Error(
              `${label}: timeoutSeconds must be an integer from 1 to ${MAX_JOB_RUN_HOOK_TIMEOUT_SECONDS}`,
            );
          }
          return raw.timeoutSeconds;
        })();

  const base = {
    phase,
    ...(onFailure !== undefined ? { onFailure } : {}),
    ...(order !== undefined ? { order } : {}),
    ...(timeoutSeconds !== undefined ? { timeoutSeconds } : {}),
  };

  const kind = raw.kind;
  if (kind === 'skill') {
    const skillPath =
      trimOptional(raw.skillPath, 'skillPath') ??
      trimOptional(raw.target, 'target');
    if (skillPath === undefined) {
      throw new Error(`${label}: skillPath is required for skill`);
    }
    const normalized = skillPath.replace(/\\/g, '/');
    if (
      !JOB_RUN_HOOK_SKILL_PATH_PREFIXES.some((prefix) =>
        normalized.startsWith(prefix),
      )
    ) {
      throw new Error(
        `${label}: skillPath must start with ${JOB_RUN_HOOK_SKILL_PATH_PREFIXES.join(' or ')}`,
      );
    }
    if (!normalized.endsWith('SKILL.md')) {
      throw new Error(`${label}: skillPath must end with SKILL.md`);
    }
    return { ...base, kind: 'skill', skillPath: normalized };
  }

  if (kind !== 'prompt_profile') {
    throw new Error(`${label}: kind must be prompt_profile or skill`);
  }

  const promptDelivery =
    raw.promptDelivery === 'file'
      ? 'file'
      : raw.promptDelivery === 'named'
        ? 'named'
        : undefined;
  const prompt = trimOptional(raw.prompt, 'prompt');
  const promptFile = trimOptional(raw.promptFile, 'promptFile');
  const target = trimOptional(raw.target, 'target');

  if (promptDelivery === 'file' || promptFile !== undefined) {
    const path = promptFile ?? target;
    if (path === undefined) {
      throw new Error(`${label}: promptFile is required for file prompt`);
    }
    return {
      ...base,
      kind: 'prompt_profile',
      promptDelivery: 'file',
      promptFile: path,
    };
  }

  const named = prompt ?? target ?? DEFAULT_RALPH_PROMPT;
  return {
    ...base,
    kind: 'prompt_profile',
    prompt: named,
    promptDelivery: 'named',
  };
};

/**
 * @description Parses plan `jobRunHooksJson` or empty string into hook entries.
 */
export const parseJobRunHooksJsonFromPlan = (
  json: string | null | undefined,
): JobRunHookEntry[] => {
  const trimmed = (json ?? '').trim();
  if (trimmed === '') {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error('jobRunHooksJson must be valid JSON');
  }

  const list = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.hooks)
      ? parsed.hooks
      : null;

  if (list === null) {
    throw new Error('job run hooks must be { hooks: [...] }');
  }

  if (list.length > MAX_JOB_RUN_HOOKS_TOTAL) {
    throw new Error(`at most ${MAX_JOB_RUN_HOOKS_TOTAL} hooks allowed`);
  }

  return list.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`hook at index ${index} must be an object`);
    }
    return parseHookEntryFromRecord(item, index);
  });
};

export const jobRunHookEntriesToDraftRows = (
  hooks: readonly JobRunHookEntry[],
): JobRunHookDraftRow[] =>
  hooks.map((entry) => ({
    ...entry,
    draftId: crypto.randomUUID(),
  }));

export const createDefaultJobRunHookDraftRow = (): JobRunHookDraftRow => ({
  draftId: crypto.randomUUID(),
  kind: 'prompt_profile',
  phase: 'before_run',
  prompt: DEFAULT_RALPH_PROMPT,
  promptDelivery: 'named',
});

/**
 * @description Assigns `order` within each phase from row index (0-based).
 */
export const normalizeJobRunHookDraftRows = (
  rows: readonly JobRunHookDraftRow[],
): JobRunHookEntry[] => {
  const byPhase = new Map<JobRunHookPhase, JobRunHookDraftRow[]>();
  for (const row of rows) {
    const list = byPhase.get(row.phase) ?? [];
    list.push(row);
    byPhase.set(row.phase, list);
  }

  const entries: JobRunHookEntry[] = [];
  for (const phase of JOB_RUN_HOOK_PHASES) {
    const phaseRows = byPhase.get(phase) ?? [];
    if (phaseRows.length > MAX_JOB_RUN_HOOKS_PER_PHASE) {
      throw new Error(
        `at most ${MAX_JOB_RUN_HOOKS_PER_PHASE} hooks for ${phase}`,
      );
    }
    phaseRows.forEach((row, index) => {
      const { draftId: _draftId, ...entry } = row;
      entries.push({
        ...entry,
        order: index,
      });
    });
  }

  return sortJobRunHookEntries(entries);
};

export const serializeJobRunHooksConfig = (
  hooks: readonly JobRunHookEntry[],
): string => JSON.stringify({ hooks: sortJobRunHookEntries([...hooks]) });

export interface JobRunHooksUiValidation {
  readonly issues: readonly string[];
  readonly ok: boolean;
}

export const validateJobRunHooksDraftRows = (
  rows: readonly JobRunHookDraftRow[],
): JobRunHooksUiValidation => {
  const issues: string[] = [];

  if (rows.length > MAX_JOB_RUN_HOOKS_TOTAL) {
    issues.push(`At most ${MAX_JOB_RUN_HOOKS_TOTAL} hooks total.`);
  }

  const beforeCount = rows.filter((r) => r.phase === 'before_run').length;
  const afterCount = rows.filter((r) => r.phase === 'after_run').length;
  if (beforeCount > MAX_JOB_RUN_HOOKS_PER_PHASE) {
    issues.push(`At most ${MAX_JOB_RUN_HOOKS_PER_PHASE} before_run hooks.`);
  }
  if (afterCount > MAX_JOB_RUN_HOOKS_PER_PHASE) {
    issues.push(`At most ${MAX_JOB_RUN_HOOKS_PER_PHASE} after_run hooks.`);
  }

  for (const row of rows) {
    if (row.kind === 'skill') {
      const path = row.skillPath.trim();
      if (path === '') {
        issues.push('Skill path is required.');
      }
    } else if (row.promptDelivery === 'file') {
      if (row.promptFile.trim() === '') {
        issues.push('Prompt file path is required for file delivery.');
      }
    } else if (row.prompt.trim() === '') {
      issues.push('Named prompt path is required.');
    }

    if (
      row.timeoutSeconds !== undefined &&
      (row.timeoutSeconds < 1 ||
        row.timeoutSeconds > MAX_JOB_RUN_HOOK_TIMEOUT_SECONDS)
    ) {
      issues.push(
        `Timeout must be between 1 and ${MAX_JOB_RUN_HOOK_TIMEOUT_SECONDS} seconds.`,
      );
    }
  }

  try {
    normalizeJobRunHookDraftRows(rows);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
  }

  return { issues, ok: issues.length === 0 };
};

export const jobRunHookKindLabel = (kind: JobRunHookKind): string =>
  kind === 'skill' ? 'Repo skill' : 'Prompt profile';

export const jobRunHookPhaseLabel = (phase: JobRunHookPhase): string =>
  phase === 'before_run' ? 'Before run' : 'After run';

export const jobRunHookDefaultTimeoutHint = (): string =>
  String(DEFAULT_JOB_RUN_HOOK_TIMEOUT_SECONDS);
