/**
 * @description Parses and resolves job-run lifecycle hooks for plan storage and BullMQ enqueue.
 */

import type { PlanJobRunHooksStorage } from '@openthrottle/nestjs-repositories';
import type { JobRunHookEntry, JobRunHooksConfig } from '@tools/workflows';
import { parseJobRunHooksConfig } from '@tools/workflows';
import { validateWorkingDirectory } from './enqueue-plan-ralph-tuning';

const MAX_JOB_RUN_HOOKS_JSON_LEN = 512_000;

/**
 * @description Dedup key for a hook entry. Skill entries collapse on phase+skillPath so a hook that
 * exists both as a materialized hook-task and in jobRunHooksJson runs once; other kinds never collide.
 */
const hookEntryDedupeKey = (entry: JobRunHookEntry): string =>
  entry.kind === 'skill'
    ? `skill::${entry.phase}::${entry.skillPath}`
    : `other::${entry.phase}::${String(entry.order ?? '')}::${entry.kind}`;

/**
 * @description Unions config-authored hooks (jobRunHooksJson / plan column) with entries derived from
 * materialized hook-tasks, config first, dropping later duplicates by {@link hookEntryDedupeKey}. No
 * D1 cutover: jobRunHooksJson stays a first-class authoring surface; materialized hooks are additive.
 */
const mergeHookEntries = (
  configHooks: readonly JobRunHookEntry[],
  materializedHooks: readonly JobRunHookEntry[],
): JobRunHookEntry[] => {
  const seen = new Set<string>();
  const merged: JobRunHookEntry[] = [];

  for (const entry of [...configHooks, ...materializedHooks]) {
    const key = hookEntryDedupeKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }

  return merged;
};

/**
 * @description Serializes stored hooks for GraphQL `jobRunHooksJson`.
 */
export const serializeJobRunHooksForGraphql = (
  stored: PlanJobRunHooksStorage | null | undefined,
): string => JSON.stringify(parseJobRunHooksConfig(stored ?? { hooks: [] }));

/**
 * @description Parses GraphQL JSON into canonical {@link JobRunHooksConfig} for DB or enqueue.
 * @throws Error when JSON is invalid or hook entries fail validation.
 */
export const parseJobRunHooksJsonInput = (
  raw: string | null | undefined,
  options?: {
    readonly cwd?: string;
    readonly requireTargetsExist?: boolean;
  },
): JobRunHooksConfig | undefined => {
  if (raw === undefined || raw === null) return undefined;
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  if (trimmed.length > MAX_JOB_RUN_HOOKS_JSON_LEN) {
    throw new Error(
      `jobRunHooksJson must be at most ${MAX_JOB_RUN_HOOKS_JSON_LEN} characters`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('jobRunHooksJson must be valid JSON');
  }

  return parseJobRunHooksConfig(parsed, options);
};

/**
 * @description Normalizes plan column value (legacy empty/null) to {@link JobRunHooksConfig}.
 */
export const jobRunHooksFromPlanStorage = (
  stored: PlanJobRunHooksStorage | null | undefined,
): JobRunHooksConfig => parseJobRunHooksConfig(stored ?? { hooks: [] });

/**
 * @description Resolves hooks for a queued run: enqueue override wins over the persisted plan column,
 * then entries derived from materialized hook-tasks are unioned in (additive, deduped). Returns
 * undefined when the merged set is empty so the BullMQ payload stays backward compatible.
 */
export const resolveJobRunHooksForEnqueue = (params: {
  readonly enqueueHooksJson?: string | null;
  readonly materializedHookEntries?: readonly JobRunHookEntry[];
  readonly planHooks: PlanJobRunHooksStorage | null | undefined;
  readonly workingDirectory?: string | null;
}): JobRunHooksConfig | undefined => {
  const cwd =
    validateWorkingDirectory(params.workingDirectory) ??
    (process.env.WORKSPACE_ROOT?.trim() || process.cwd());
  const validateOpts = { cwd, requireTargetsExist: true as const };

  const override = parseJobRunHooksJsonInput(
    params.enqueueHooksJson,
    validateOpts,
  );
  const configHooks =
    override !== undefined
      ? override.hooks
      : jobRunHooksFromPlanStorage(params.planHooks).hooks;

  const merged = mergeHookEntries(
    configHooks,
    params.materializedHookEntries ?? [],
  );

  return merged.length > 0 ? { hooks: merged } : undefined;
};

/**
 * @description Strips empty hook lists so BullMQ payloads stay backward compatible.
 */
export const jobRunHooksForJobPayload = (
  config: JobRunHooksConfig | undefined,
): JobRunHooksConfig | undefined =>
  config !== undefined && config.hooks.length > 0 ? config : undefined;
