/**
 * @description Pure parsing behind the `runPlan` and `schedulePlanRun` action
 * intents. Both submit the same kickoff form, so one parser reads it: the
 * enqueue fields, the per-run `iterations` override, and the model/effort
 * selection the dialog persists to the plan's saved run config.
 *
 * The two never mix. `iterations` is overlaid onto the run's tuning only; the
 * saved config never sees it. Model, backend and effort are persisted AND
 * overlaid, so the run that starts and the config on the plan agree.
 */

import {
  getDefaultPlanRunConfigStorage,
  planRunConfigFromPlanStorage,
  serializePlanRunConfigForGraphql,
} from '@openthrottle/openthrottle-plan-config';
import {
  coerceNumber,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';

import type {
  EnqueuePlanRunInput,
  RalphPlanRunTuningInput,
} from '~/__generated__/graphql';
import {
  EnqueuePlanRunInputSchema,
  RalphPlanRunTuningInputSchema,
} from '~/__generated__/schemas';
import { parseJobRunHooksJsonFromPlan } from '~/routing/plans/utils/job-run-hooks-ui';
import {
  parsePlanRunEffort,
  type PlanRunModelSelection,
} from '~/routing/plans/utils/plan-run-model-effort';
import { isExecutionBackend } from '~/routing/plans/utils/plan-workflow-config-execution';
import {
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_RUNNER,
} from '~/routing/plans/utils/workflow-ralph-config';

/**
 * @description The model/effort the dialog saves to `runConfigJson.ralph`:
 * backend and model travel together (a plan can never hold a `claude` model on
 * the `cursor` runner); `effort` is `''` when the run should keep the
 * backend's own reasoning default.
 */
export interface PlanRunPersistedSelection extends PlanRunModelSelection {
  readonly effort: string;
}

/** @description The enqueue input minus the route's `planId`. */
export type PlanRunEnqueueFields = Omit<EnqueuePlanRunInput, 'planId'>;

export type PlanRunFormResult =
  | { readonly error: string; readonly success: false }
  | {
      readonly fields: PlanRunEnqueueFields;
      readonly persisted: PlanRunPersistedSelection | undefined;
      readonly success: true;
    };

/**
 * @description Overlays the per-run overrides onto the submitted tuning.
 * `iterations` always wins when given. A persisted selection is applied with
 * the same omit-the-default rules as the tuning builder (default runner,
 * `auto` model and an empty effort send nothing), so a selection that returns
 * to a default also clears the stale key from the submitted tuning.
 * `undefined` when nothing is left to send.
 */
export const overlayPlanRunTuning = (
  tuning: RalphPlanRunTuningInput | undefined,
  overrides: {
    readonly iterations: number | undefined;
    readonly persisted: PlanRunPersistedSelection | undefined;
  },
): RalphPlanRunTuningInput | undefined => {
  const { iterations, persisted } = overrides;
  const next: RalphPlanRunTuningInput = { ...tuning };

  if (persisted !== undefined) {
    const model = persisted.model.trim();
    const effort = persisted.effort.trim();

    delete next.backend;
    delete next.effort;
    delete next.model;

    if (persisted.backend !== DEFAULT_RALPH_RUNNER) {
      next.backend = persisted.backend;
    }

    if (model !== '' && model !== DEFAULT_RALPH_MODEL) {
      next.model = model;
    }

    if (effort !== '') {
      next.effort = effort;
    }
  }

  if (iterations !== undefined) {
    next.iterations = iterations;
  }

  return Object.keys(next).length === 0 ? undefined : next;
};

/**
 * @description Merges the dialog's model/backend/effort into a plan's saved
 * run config. Everything else in `runConfigJson` is preserved, and
 * `iterations` is never touched. `changed` is `false` when the saved config
 * already holds the selection, so the caller can skip the write.
 * @throws Error when `runConfigJson` is present but not valid JSON.
 */
const loadStoredRunConfig = (
  runConfigJson: string | null | undefined,
  options: { readonly planId: string },
): ReturnType<typeof planRunConfigFromPlanStorage> => {
  if (runConfigJson == null || runConfigJson.trim() === '') {
    return getDefaultPlanRunConfigStorage(options);
  }

  return planRunConfigFromPlanStorage(JSON.parse(runConfigJson), options);
};

export const mergePersistedSelectionIntoRunConfig = (input: {
  readonly persisted: PlanRunPersistedSelection;
  readonly planId: string;
  readonly runConfigJson: string | null | undefined;
}): { readonly changed: boolean; readonly runConfigJson: string } => {
  const { persisted, planId, runConfigJson } = input;
  const options = { planId };
  const stored = loadStoredRunConfig(runConfigJson, options);

  const model = persisted.model.trim();
  const effort = persisted.effort.trim();
  const changed =
    stored.ralph.executionBackend !== persisted.backend ||
    stored.ralph.model !== model ||
    stored.ralph.effort !== effort;

  return {
    changed,
    runConfigJson: serializePlanRunConfigForGraphql(
      {
        ...stored,
        ralph: {
          ...stored.ralph,
          effort,
          executionBackend: persisted.backend,
          model,
        },
      },
      options,
    ),
  };
};

type PersistedSelectionResult =
  | { readonly error: string; readonly success: false }
  | {
      readonly persisted: PlanRunPersistedSelection | undefined;
      readonly success: true;
    };

const parsePersistedSelection = (fields: {
  readonly backend?: string | null;
  readonly effort?: string | null;
  readonly model?: string | null;
}): PersistedSelectionResult => {
  const { backend, effort, model } = fields;

  if (backend == null && model == null) {
    if (effort == null) {
      return { persisted: undefined, success: true };
    }

    return {
      error: 'A reasoning effort can only be saved together with a model.',
      success: false,
    };
  }

  if (backend == null || model == null) {
    return {
      error: 'A model and its backend must be submitted together.',
      success: false,
    };
  }

  if (!isExecutionBackend(backend)) {
    return { error: `Unknown execution backend "${backend}".`, success: false };
  }

  const trimmedEffort = effort?.trim() ?? '';
  if (trimmedEffort !== '' && parsePlanRunEffort(trimmedEffort) === undefined) {
    return {
      error: `Unknown reasoning effort "${trimmedEffort}".`,
      success: false,
    };
  }

  return {
    persisted: { backend, effort: trimmedEffort, model: model.trim() },
    success: true,
  };
};

/**
 * @description Reads the kickoff form shared by `runPlan` and
 * `schedulePlanRun`. Every field goes through `parseFormData` (blank fields
 * arrive absent). `ralphTuning` is the raw JSON the toolbar built from the
 * Configuration tab; `iterations` (a positive whole number) overrides it for
 * this run only; `backend` + `model` (+ `effort`, blank = unset) are the
 * selection to persist and overlay. `branch` is required and blank is
 * rejected as hard as missing.
 */
export const parsePlanRunForm = (formData: FormData): PlanRunFormResult => {
  const parsed = parseFormData(
    formData,
    EnqueuePlanRunInputSchema()
      .omit({
        cancelScheduled: true,
        idempotencyKey: true,
        planId: true,
        ralph: true,
      })
      .extend({
        backend: z.string().nullish(),
        branch: z.string().nullish(),
        effort: z.string().nullish(),
        iterations: coerceNumber(
          z
            .number()
            .int('Iterations must be a whole number.')
            .min(1, 'Iterations must be at least 1.'),
        ).nullish(),
        model: z.string().nullish(),
        priority: coerceNumber(z.number()).nullish(),
        ralphTuning: z.string().nullish(),
      }),
    { strict: false },
  );
  if (!parsed.success) {
    return { error: parsed.error, success: false };
  }
  const fields = parsed.data;

  let tuning: RalphPlanRunTuningInput | undefined;
  if (fields.ralphTuning != null && fields.ralphTuning !== '') {
    try {
      const raw: unknown = JSON.parse(fields.ralphTuning);
      const tuningResult = RalphPlanRunTuningInputSchema().safeParse(raw);
      if (!tuningResult.success) {
        const issues = tuningResult.error.issues.map((i) => i.message);
        return {
          error: `Invalid workflow run options: ${issues.join('; ')}`,
          success: false,
        };
      }

      tuning = tuningResult.data;
    } catch {
      return { error: 'Invalid workflow run options payload.', success: false };
    }
  }

  const selection = parsePersistedSelection(fields);
  if (!selection.success) {
    return selection;
  }

  // Branch is a REQUIRED kickoff input (never inferred server-side). The run
  // config form pre-fills it from the selected checkout's current branch, but
  // the value is always sent explicitly; fail loud here when it is blank.
  //
  // 🚨 An empty or whitespace-only string is rejected as hard as a missing one.
  // The toolbar disables Run while `workspaceRepositories` is still resolving,
  // but client-side disabling is not the boundary: a fast click during that
  // window must not be able to enqueue a run with no branch.
  const branch = fields.branch ?? undefined;
  if (branch === undefined || branch.trim() === '') {
    return {
      error: `A git branch is required to run this plan. Pick or enter the branch this run operates on.`,
      success: false,
    };
  }

  let jobRunHooksJson: string | undefined;
  if (fields.jobRunHooksJson != null && fields.jobRunHooksJson !== '') {
    try {
      parseJobRunHooksJsonFromPlan(fields.jobRunHooksJson);
      jobRunHooksJson = fields.jobRunHooksJson;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Invalid job run hooks: ${message}`, success: false };
    }
  }

  const ralph = overlayPlanRunTuning(tuning, {
    iterations: fields.iterations ?? undefined,
    persisted: selection.persisted,
  });
  const checkoutId = fields.checkoutId ?? undefined;
  const repositoryId = fields.repositoryId ?? undefined;
  const workingDirectory = fields.workingDirectory ?? undefined;

  return {
    fields: {
      branch,
      // Default to interactive priority (1) for UI-triggered runs.
      priority: fields.priority ?? 1,
      ...(checkoutId !== undefined ? { checkoutId } : {}),
      ...(jobRunHooksJson !== undefined ? { jobRunHooksJson } : {}),
      ...(ralph !== undefined ? { ralph } : {}),
      ...(repositoryId !== undefined ? { repositoryId } : {}),
      ...(workingDirectory !== undefined ? { workingDirectory } : {}),
    },
    persisted: selection.persisted,
    success: true,
  };
};

export type ScheduledForResult =
  | { readonly error: string; readonly success: false }
  | { readonly scheduledFor: string; readonly success: true };

/**
 * @description Validates the `scheduledFor` instant the client posts and
 * normalizes it to a UTC ISO-8601 string. Only "is this an instant" is checked
 * here: whether it is in the future and inside the 30-day horizon is the
 * server's call (it owns the clock and the cap), and its message is forwarded.
 */
export const parseScheduledFor = (
  raw: string | null | undefined,
): ScheduledForResult => {
  const trimmed = raw?.trim() ?? '';
  if (trimmed === '') {
    return {
      error: 'Choose when this run should start.',
      success: false,
    };
  }

  const instant = new Date(trimmed);
  if (Number.isNaN(instant.getTime())) {
    return {
      error: 'The scheduled start time is not a valid date and time.',
      success: false,
    };
  }

  return { scheduledFor: instant.toISOString(), success: true };
};
