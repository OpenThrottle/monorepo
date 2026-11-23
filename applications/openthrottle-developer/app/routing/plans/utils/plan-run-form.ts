/**
 * @description Pure parsing behind the `runPlan` and `schedulePlanRun` action
 * intents. Both submit the same kickoff form, so one parser reads it: the
 * enqueue fields, the model/effort selection and the OT Loop settings the
 * dialog persists to the plan's saved run config.
 *
 * Model, driver and effort are persisted AND overlaid onto the run's tuning,
 * so the run that starts and the config on the plan agree.
 */

import {
  getDefaultPlanRunConfigStorage,
  MAX_PLAN_RUN_OT_LOOP_RETRIES,
  pickPlanRunConfigOtLoop,
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
  PlanRunTuningInput,
} from '~/__generated__/graphql';
import {
  EnqueuePlanRunInputSchema,
  PlanRunTuningInputSchema,
} from '~/__generated__/schemas';
import { parseJobRunHooksJsonFromPlan } from '~/routing/plans/utils/job-run-hooks-ui';
import type { PlanRunModelSelection } from '~/routing/plans/utils/plan-run-model-effort';
import { parsePlanRunEffort } from '~/routing/plans/utils/plan-run-model-effort';
import {
  DEFAULT_RUN_DRIVER,
  DEFAULT_RUN_MODEL,
} from '~/routing/plans/utils/plan-run-options';
import {
  mergeOtLoopFields,
  parseOtLoopCommandsText,
  parseOtLoopMaxRetriesText,
} from '~/routing/plans/utils/plan-run-ot-loop';
import { isSelectablePlanRunDriver } from '~/routing/plans/utils/plan-workflow-config-execution';

/**
 * @description The model/effort the dialog saves to the plan's run config:
 * driver and model travel together (a plan can never hold a `claude` model on
 * the `cursor` runner); `effort` is `''` when the run should keep the
 * driver's own reasoning default.
 */
export interface PlanRunPersistedSelection extends PlanRunModelSelection {
  readonly effort: string;
}

/**
 * @description The OT Loop settings the dialog saves to `runConfigJson.run`: the edited
 * validation commands and retry count, merged onto the stored block so its setup and
 * final-validation commands survive.
 */
export interface PlanRunOtLoopSelection {
  readonly maxRetries: number | undefined;
  readonly validationCommands: readonly string[];
}

/** @description The enqueue input minus the route's `planId`. */
export type PlanRunEnqueueFields = Omit<EnqueuePlanRunInput, 'planId'>;

export type PlanRunFormResult =
  | { readonly error: string; readonly success: false }
  | {
      readonly fields: PlanRunEnqueueFields;
      readonly otLoopSelection: PlanRunOtLoopSelection | undefined;
      readonly persisted: PlanRunPersistedSelection | undefined;
      readonly success: true;
    };

/**
 * @description Overlays the persisted selection onto the submitted tuning, with
 * the same omit-the-default rules as the tuning builder (default driver,
 * `auto` model and an empty effort send nothing), so a selection that returns
 * to a default also clears the stale key from the submitted tuning.
 * `undefined` when nothing is left to send.
 */
export const overlayPlanRunTuning = (
  tuning: PlanRunTuningInput | undefined,
  persisted: PlanRunPersistedSelection | undefined,
): PlanRunTuningInput | undefined => {
  const next: PlanRunTuningInput = { ...tuning };

  if (persisted !== undefined) {
    const model = persisted.model.trim();
    const effort = persisted.effort.trim();

    delete next.driver;
    delete next.effort;
    delete next.model;

    if (persisted.driver !== DEFAULT_RUN_DRIVER) {
      next.driver = persisted.driver;
    }

    if (model !== '' && model !== DEFAULT_RUN_MODEL) {
      next.model = model;
    }

    if (effort !== '') {
      next.effort = effort;
    }
  }

  return Object.keys(next).length === 0 ? undefined : next;
};

const loadStoredRunConfig = (
  runConfigJson: string | null | undefined,
  options: { readonly planId: string },
): ReturnType<typeof planRunConfigFromPlanStorage> => {
  if (runConfigJson == null || runConfigJson.trim() === '') {
    return getDefaultPlanRunConfigStorage(options);
  }

  return planRunConfigFromPlanStorage(JSON.parse(runConfigJson), options);
};

/**
 * @description Merges the dialog's model/driver/effort into a plan's saved
 * run config. Everything else in `runConfigJson` is preserved. `changed` is
 * `false` when the saved config already holds the selection, so the caller can
 * skip the write.
 * @throws Error when `runConfigJson` is present but not valid JSON.
 */
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
    stored.run.driver !== persisted.driver ||
    stored.run.model !== model ||
    stored.run.effort !== effort;

  return {
    changed,
    runConfigJson: serializePlanRunConfigForGraphql(
      {
        ...stored,
        run: {
          ...stored.run,
          driver: persisted.driver,
          effort,
          model,
        },
      },
      options,
    ),
  };
};

/**
 * @description Merges the dialog's OT Loop settings into a plan's saved run config and keeps its setup and final-validation commands. `changed` is `false` when
 * the saved config already holds the settings, so the caller can skip the write.
 * @throws Error when `runConfigJson` is present but not valid JSON.
 */
export const mergeOtLoopSelectionIntoRunConfig = (input: {
  readonly planId: string;
  readonly runConfigJson: string | null | undefined;
  readonly selection: PlanRunOtLoopSelection;
}): { readonly changed: boolean; readonly runConfigJson: string } => {
  const { planId, runConfigJson, selection } = input;
  const options = { planId };
  const stored = loadStoredRunConfig(runConfigJson, options);
  const storedOtLoop = pickPlanRunConfigOtLoop(stored.run);
  const nextOtLoop = mergeOtLoopFields(storedOtLoop, selection);
  const changed = JSON.stringify(storedOtLoop) !== JSON.stringify(nextOtLoop);
  const {
    finalValidationCommands: _finalValidationCommands,
    maxRetries: _maxRetries,
    setupCommands: _setupCommands,
    validationCommands: _validationCommands,
    ...runWithoutOtLoop
  } = stored.run;

  return {
    changed,
    runConfigJson: serializePlanRunConfigForGraphql(
      { ...stored, run: { ...runWithoutOtLoop, ...nextOtLoop } },
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
  readonly driver?: string | null;
  readonly effort?: string | null;
  readonly model?: string | null;
}): PersistedSelectionResult => {
  const { driver: driver, effort, model } = fields;

  if (driver == null && model == null) {
    if (effort == null) {
      return { persisted: undefined, success: true };
    }

    return {
      error: 'A reasoning effort can only be saved together with a model.',
      success: false,
    };
  }

  if (driver == null || model == null) {
    return {
      error: 'A model and its driver must be submitted together.',
      success: false,
    };
  }

  if (!isSelectablePlanRunDriver(driver)) {
    return { error: `Unknown driver "${driver}".`, success: false };
  }

  const trimmedEffort = effort?.trim() ?? '';
  if (trimmedEffort !== '' && parsePlanRunEffort(trimmedEffort) === undefined) {
    return {
      error: `Unknown reasoning effort "${trimmedEffort}".`,
      success: false,
    };
  }

  return {
    persisted: { driver, effort: trimmedEffort, model: model.trim() },
    success: true,
  };
};

type OtLoopSelectionResult =
  | { readonly error: string; readonly success: false }
  | {
      readonly selection: PlanRunOtLoopSelection | undefined;
      readonly success: true;
    };

/**
 * @description The OT Loop settings, present only when the form names the runner (the Run dialog
 * does; the toolbar's one-click Run edits nothing).
 */
const parseOtLoopSelection = (fields: {
  readonly otLoopMaxRetries?: string | null;
  readonly otLoopSettings?: string | null;
  readonly otLoopValidationCommands?: string | null;
}): OtLoopSelectionResult => {
  const { otLoopMaxRetries, otLoopSettings, otLoopValidationCommands } = fields;

  if (otLoopSettings == null) {
    return { selection: undefined, success: true };
  }

  const maxRetries = parseOtLoopMaxRetriesText(otLoopMaxRetries ?? '');
  if (maxRetries === null) {
    return {
      error: `Retries must be a whole number from 0 to ${MAX_PLAN_RUN_OT_LOOP_RETRIES}.`,
      success: false,
    };
  }

  return {
    selection: {
      maxRetries,
      validationCommands: parseOtLoopCommandsText(
        otLoopValidationCommands ?? '',
      ),
    },
    success: true,
  };
};

/**
 * @description Reads the kickoff form shared by `runPlan` and
 * `schedulePlanRun`. Every field goes through `parseFormData` (blank fields
 * arrive absent). `runTuning` is the raw JSON the toolbar built from the
 * Configuration tab; `driver` + `model` (+ `effort`, blank = unset) are the
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
        mode: true,
        planId: true,
        taskId: true,
        tuning: true,
      })
      .extend({
        branch: z.string().nullish(),
        driver: z.string().nullish(),
        effort: z.string().nullish(),
        model: z.string().nullish(),
        otLoopMaxRetries: z.string().nullish(),
        otLoopSettings: z.string().nullish(),
        otLoopValidationCommands: z.string().nullish(),
        priority: coerceNumber(z.number()).nullish(),
        runTuning: z.string().nullish(),
      }),
    { strict: false },
  );
  if (!parsed.success) {
    return { error: parsed.error, success: false };
  }
  const fields = parsed.data;

  let tuning: PlanRunTuningInput | undefined;
  if (fields.runTuning != null && fields.runTuning !== '') {
    try {
      const raw: unknown = JSON.parse(fields.runTuning);
      const tuningResult = PlanRunTuningInputSchema().safeParse(raw);
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

  const otLoopSelection = parseOtLoopSelection(fields);
  if (!otLoopSelection.success) {
    return otLoopSelection;
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

  const runTuning = overlayPlanRunTuning(tuning, selection.persisted);
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
      ...(runTuning !== undefined ? { tuning: runTuning } : {}),
      ...(repositoryId !== undefined ? { repositoryId } : {}),
      ...(workingDirectory !== undefined ? { workingDirectory } : {}),
    },
    otLoopSelection: otLoopSelection.selection,
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
