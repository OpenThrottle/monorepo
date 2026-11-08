import { PlanDetailCancelPlanRunDocument } from '@openthrottle/openthrottle-developer-codegen';
import {
  executeGraphqlWithAuth,
  isJsonString,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';

import type { Route } from '@/app/routes/+types/plans.$planId._index';
import type {
  PlanDetailForceSettlePlanRunMutation,
  PlanDetailPostPlanMessageMutation,
  PlanDetailWithdrawPlanMessageMutation,
} from '~/__generated__/graphql';
import {
  PlanDetailAddHookDocument,
  PlanDetailAddPlanTagDocument,
  PlanDetailDetachHookDocument,
  PlanDetailEnqueuePlanRunDocument,
  PlanDetailEvaluatePlanRulesDocument,
  PlanDetailForceSettlePlanRunDocument,
  PlanDetailPostPlanMessageDocument,
  PlanDetailRemovePlanTagDocument,
  PlanDetailReschedulePlanRunDocument,
  PlanDetailRunConfigDocument,
  PlanDetailSchedulePlanRunDocument,
  PlanDetailSetPlanStatusDocument,
  PlanDetailUpdatePlanJobRunHooksDocument,
  PlanDetailUpdatePlanRunConfigDocument,
  PlanDetailUpdateTaskDocument,
  PlanDetailWithdrawPlanMessageDocument,
} from '~/__generated__/graphql';
import {
  AddHookInputSchema,
  AddPlanTagInputSchema,
  CancelPlanRunInputSchema,
  DetachHookInputSchema,
  EnqueuePlanRunInputSchema,
  ForceSettlePlanRunInputSchema,
  PostPlanMessageInputSchema,
  RemovePlanTagInputSchema,
  ReschedulePlanRunInputSchema,
  SchedulePlanRunInputSchema,
  SetPlanStatusInputSchema,
  UpdateTaskInputSchema,
  WithdrawPlanMessageInputSchema,
} from '~/__generated__/schemas';
import { toErrorMessage } from '~/global/utils/utils.error-message';
import { parseJobRunHooksJsonFromPlan } from '~/routing/plans/utils/job-run-hooks-ui';
import type { PlanRunPersistedSelection } from '~/routing/plans/utils/plan-run-form';
import {
  mergePersistedSelectionIntoRunConfig,
  parsePlanRunForm,
  parseScheduledFor,
} from '~/routing/plans/utils/plan-run-form';
import { readPlanScheduleFailure } from '~/routing/plans/utils/plan-schedule-conflict';

/**
 * Cancels a plan's runs. With no `planRunId` it is the per-plan cancel it always
 * was. With a `planRunId` form field (a SCHEDULED run of this plan) only that run
 * is cancelled and live runs are untouched. The same intent serves both because
 * the server input is one shape with an optional id.
 */
export const cancelPlanRun = async (
  args: Route.ActionArgs,
  planId: string,
  formData: FormData,
) => {
  const parsed = parseFormData(
    formData,
    CancelPlanRunInputSchema().omit({ planId: true }),
    { strict: false },
  );
  if (!parsed.success) {
    return { cancelPlanRunError: parsed.error };
  }

  try {
    const input = CancelPlanRunInputSchema().parse({
      planId,
      ...(parsed.data.planRunId != null
        ? { planRunId: parsed.data.planRunId }
        : {}),
    });
    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailCancelPlanRunDocument,
      { input },
    );

    if (!result.cancelPlanRun) {
      return { cancelPlanRunError: 'Failed to cancel plan run.' };
    }

    return { cancelPlanRun: result.cancelPlanRun };
  } catch (error) {
    return {
      cancelPlanRunError: toErrorMessage(error, 'Failed to cancel plan run.'),
    };
  }
};

/**
 * Settles the newest interactive (non-heartbeating) run to STALE. Unlike
 * `cancelPlanRun` this is keyed by the plan_runs row id, not the plan: the form
 * posts `planRunId` because the plan may already have moved on while the dead
 * row still reads IN_PROGRESS and holds its worktree.
 */
export const forceSettlePlanRun = async (
  args: Route.ActionArgs,
  formData: FormData,
): Promise<
  | {
      forceSettlePlanRun: NonNullable<
        PlanDetailForceSettlePlanRunMutation['forceSettlePlanRun']
      >;
    }
  | { forceSettlePlanRunError: string }
> => {
  const parsed = parseFormData(formData, ForceSettlePlanRunInputSchema(), {
    strict: false,
  });
  if (!parsed.success) {
    return { forceSettlePlanRunError: parsed.error };
  }

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailForceSettlePlanRunDocument,
      { input: parsed.data },
    );

    // Null means the guard did not match: the run is no longer IN_PROGRESS, or
    // it heartbeats (a supervised run the sweeper owns). Nothing was changed.
    if (!result.forceSettlePlanRun) {
      return {
        forceSettlePlanRunError: `Nothing to settle — this run is no longer an unsettled interactive run.`,
      };
    }

    return { forceSettlePlanRun: result.forceSettlePlanRun };
  } catch (error) {
    return {
      forceSettlePlanRunError: toErrorMessage(
        error,
        'Failed to settle plan run.',
      ),
    };
  }
};

/**
 * Posts a STEER or QUEUE message to the plan inbox. `author` is left for the
 * server to stamp from the caller's identity, so the form cannot attribute a
 * message to someone else.
 */
export const postPlanMessage = async (
  args: Route.ActionArgs,
  planId: string,
  formData: FormData,
): Promise<
  | {
      postPlanMessage: PlanDetailPostPlanMessageMutation['postPlanMessage'];
    }
  | { postPlanMessageError: string }
> => {
  const parsed = parseFormData(
    formData,
    PostPlanMessageInputSchema().omit({ author: true, planId: true }),
    { labels: { body: 'Message' }, strict: false },
  );
  if (!parsed.success) {
    return { postPlanMessageError: parsed.error };
  }

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailPostPlanMessageDocument,
      { input: { ...parsed.data, planId } },
    );

    return { postPlanMessage: result.postPlanMessage };
  } catch (error) {
    return {
      postPlanMessageError: toErrorMessage(error, 'Failed to send message.'),
    };
  }
};

/** Withdraws a PENDING inbox message so no run receives it. */
export const withdrawPlanMessage = async (
  args: Route.ActionArgs,
  formData: FormData,
): Promise<
  | {
      withdrawPlanMessage: PlanDetailWithdrawPlanMessageMutation['withdrawPlanMessage'];
    }
  | { withdrawPlanMessageError: string }
> => {
  const parsed = parseFormData(formData, WithdrawPlanMessageInputSchema(), {
    strict: false,
  });
  if (!parsed.success) {
    return { withdrawPlanMessageError: parsed.error };
  }

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailWithdrawPlanMessageDocument,
      { input: parsed.data },
    );

    return { withdrawPlanMessage: result.withdrawPlanMessage };
  } catch (error) {
    return {
      withdrawPlanMessageError: toErrorMessage(
        error,
        'Failed to withdraw message.',
      ),
    };
  }
};

export const addPlanTag = async (
  args: Route.ActionArgs,
  planId: string,
  formData: FormData,
) => {
  // `planId` is a route param, not a form field, so validate only `tag` from
  // the generated schema and inject the id.
  const parsed = parseFormData(
    formData,
    AddPlanTagInputSchema().omit({ planId: true }),
  );
  if (!parsed.success) {
    return { planTagError: parsed.error };
  }
  try {
    await executeGraphqlWithAuth(args.request, PlanDetailAddPlanTagDocument, {
      input: { planId, tag: parsed.data.tag },
    });
    return { planTagUpdated: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { planTagError: message };
  }
};

export const removePlanTag = async (
  args: Route.ActionArgs,
  planId: string,
  formData: FormData,
) => {
  const parsed = parseFormData(
    formData,
    RemovePlanTagInputSchema().omit({ planId: true }),
  );
  if (!parsed.success) {
    return { planTagError: parsed.error };
  }
  try {
    await executeGraphqlWithAuth(
      args.request,
      PlanDetailRemovePlanTagDocument,
      {
        input: { planId, tag: parsed.data.tag },
      },
    );
    return { planTagUpdated: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { planTagError: message };
  }
};

export const addHook = async (
  args: Route.ActionArgs,
  planId: string,
  formData: FormData,
) => {
  // Parse the form once through the generated schema (minus the `planId` route
  // param), replacing the per-field optionalField reads + separate `.parse`.
  const parsed = parseFormData(
    formData,
    AddHookInputSchema().omit({ planId: true }),
    { strict: false },
  );
  if (!parsed.success) {
    return { addHookError: parsed.error };
  }

  try {
    const input = { ...parsed.data, planId };

    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailAddHookDocument,
      { input },
    );

    if (!result.addHook) {
      return { addHookError: 'Failed to add hook.' };
    }

    return { addHook: result.addHook };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { addHookError: message };
  }
};

export const detachHook = async (request: Request, formData: FormData) => {
  const parsed = parseFormData(formData, DetachHookInputSchema(), {
    strict: false,
  });
  if (!parsed.success) {
    return { detachHookError: parsed.error };
  }

  try {
    const result = await executeGraphqlWithAuth(
      request,
      PlanDetailDetachHookDocument,
      { input: parsed.data },
    );

    if (!result.detachHook) {
      return { detachHookError: 'Failed to remove hook.' };
    }

    return { detachHook: result.detachHook };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { detachHookError: message };
  }
};

export const evaluatePlanRules = async (
  args: Route.ActionArgs,
  planId: string,
) => {
  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailEvaluatePlanRulesDocument,
      { planId },
    );

    if (!result.evaluatePlanRules?.enqueued) {
      return { evaluatePlanRulesError: 'Failed to queue rules evaluation.' };
    }

    return { evaluatePlanRulesTriggered: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { evaluatePlanRulesError: message };
  }
};

export const setPlanStatus = async (
  args: Route.ActionArgs,
  planId: string,
  formData: FormData,
) => {
  // `planId` is the route param; `status` defaults to COMPLETED when the form
  // omits it (the toolbar's primary action). `strict: false` lets the dispatch
  // `intent` field pass through.
  const parsed = parseFormData(
    formData,
    SetPlanStatusInputSchema().omit({ planId: true }),
    { strict: false },
  );
  if (!parsed.success) {
    return { setPlanStatusError: parsed.error };
  }
  const requestedStatus = parsed.data.status;
  const hasRequestedStatus = requestedStatus != null && requestedStatus !== '';
  const status = hasRequestedStatus ? requestedStatus : 'COMPLETED';

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailSetPlanStatusDocument,
      { input: { planId, status } },
    );

    if (!result.setPlanStatus) {
      return { setPlanStatusError: 'Failed to update plan status.' };
    }

    // Fetcher submissions auto-revalidate the page loaders, so returning a
    // success marker (instead of redirecting to the same URL) refreshes the
    // status and lets the toolbar surface a success toast.
    return { setPlanStatus: result.setPlanStatus };
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);

    return { setPlanStatusError: message };
  }
};

export const updateTaskStatus = async (
  args: Route.ActionArgs,
  planId: string,
  formData: FormData,
) => {
  // The form posts `taskId` (the schema field is `id`) + `status`; read both
  // through parseFormData, then assemble and validate the generated input.
  const parsed = parseFormData(
    formData,
    z.object({ status: z.string().min(1), taskId: z.string().min(1) }),
    { strict: false },
  );
  if (!parsed.success) {
    return { updateTaskError: parsed.error };
  }

  try {
    const input = UpdateTaskInputSchema().parse({
      id: parsed.data.taskId,
      planId,
      status: parsed.data.status,
    });

    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailUpdateTaskDocument,
      { input },
    );

    if (!result.updateTask) {
      return { updateTaskError: 'Failed to update task status.' };
    }

    return { ok: true };
  } catch (error) {
    return {
      updateTaskError: toErrorMessage(error, 'Failed to update task status.'),
    };
  }
};

export const saveRunConfig = async (
  args: Route.ActionArgs,
  planId: string,
  formData: FormData,
) => {
  // `runConfigJson` stays a JSON string on the wire — validate its JSON validity
  // in place with `isJsonString` rather than parsing it into an object.
  const parsed = parseFormData(
    formData,
    z.object({
      runConfigJson: z
        .string()
        .refine(isJsonString, 'runConfigJson must be valid JSON.')
        .nullish(),
    }),
    { strict: false },
  );
  if (!parsed.success) {
    return { saveRunConfigError: parsed.error };
  }
  const runConfigJson = parsed.data.runConfigJson ?? null;

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailUpdatePlanRunConfigDocument,
      {
        input: {
          id: planId,
          runConfigJson,
        },
      },
    );

    if (!result.updatePlan?.id) {
      return { saveRunConfigError: 'Failed to save run configuration.' };
    }

    return { saveRunConfig: result.updatePlan };
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);

    return { saveRunConfigError: message };
  }
};

export const saveJobRunHooks = async (
  args: Route.ActionArgs,
  planId: string,
  formData: FormData,
) => {
  const parsed = parseFormData(
    formData,
    z.object({ jobRunHooksJson: z.string().nullish() }),
    { strict: false },
  );
  if (!parsed.success) {
    return { saveJobRunHooksError: parsed.error };
  }
  // `||` (not `??`) on purpose: a blank submission also falls back to no hooks.
  const jobRunHooksJson =
    parsed.data.jobRunHooksJson || JSON.stringify({ hooks: [] });

  // Domain-validate (richer than plain JSON validity) and keep the exact
  // user-facing message.
  try {
    parseJobRunHooksJsonFromPlan(jobRunHooksJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { saveJobRunHooksError: message };
  }

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailUpdatePlanJobRunHooksDocument,
      {
        input: {
          id: planId,
          jobRunHooksJson,
        },
      },
    );

    if (!result.updatePlan?.id) {
      return { saveJobRunHooksError: 'Failed to save job run hooks.' };
    }

    return { saveJobRunHooks: result.updatePlan };
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);

    return { saveJobRunHooksError: message };
  }
};

/**
 * Writes the dialog's model/backend/effort to the plan's saved run config
 * through the same `updatePlan.runConfigJson` mutation the Configuration tab's
 * save uses. Read-merge-write so nothing else in the saved config changes (and
 * `iterations`, a per-run override, never lands there). Skips the write when the
 * saved config already holds the selection. Returns an error message on failure.
 */
const persistPlanRunSelection = async (
  args: Route.ActionArgs,
  planId: string,
  persisted: PlanRunPersistedSelection,
): Promise<string | undefined> => {
  try {
    const current = await executeGraphqlWithAuth(
      args.request,
      PlanDetailRunConfigDocument,
      { id: planId },
    );
    const merged = mergePersistedSelectionIntoRunConfig({
      persisted,
      planId,
      runConfigJson: current.plan?.runConfigJson,
    });

    if (!merged.changed) {
      return undefined;
    }

    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailUpdatePlanRunConfigDocument,
      { input: { id: planId, runConfigJson: merged.runConfigJson } },
    );

    return result.updatePlan?.id
      ? undefined
      : 'Failed to save the model and effort to the plan run configuration.';
  } catch (error) {
    return `Could not save the model and effort to the plan run configuration: ${toErrorMessage(error, 'unknown error')}`;
  }
};

export const runPlan = async (
  args: Route.ActionArgs,
  planId: string,
  formData: FormData,
) => {
  // The kickoff form is read once by `parsePlanRunForm` (see its header): enqueue
  // fields, the per-run `iterations` override (overlaid onto `ralphTuning`,
  // never saved), and the model/backend/effort selection to persist.
  const parsed = parsePlanRunForm(formData);
  if (!parsed.success) {
    return { runPlanError: parsed.error };
  }

  // Persist BEFORE enqueuing so the run and the saved config agree. A failed
  // save stops here: enqueuing anyway would run a model the plan does not show.
  if (parsed.persisted !== undefined) {
    const persistError = await persistPlanRunSelection(
      args,
      planId,
      parsed.persisted,
    );
    if (persistError !== undefined) {
      return { runPlanError: persistError };
    }
  }

  try {
    // `cancelScheduled=true` is the user's yes to "Unschedule and run now?".
    const input = EnqueuePlanRunInputSchema().parse({
      ...parsed.fields,
      ...(formData.get('cancelScheduled') === 'true'
        ? { cancelScheduled: true }
        : {}),
      planId,
    });

    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailEnqueuePlanRunDocument,
      { input },
    );

    if (!result.enqueuePlanRun) {
      return { runPlanError: 'Failed to enqueue plan run.' };
    }

    return { runPlan: result.enqueuePlanRun };
  } catch (error) {
    // A scheduled plan comes back as a conflict, not an error, so the client opens
    // the unschedule-and-run confirm instead of a generic toast.
    const failure = readPlanScheduleFailure(
      error,
      'Failed to enqueue plan run.',
    );

    return 'conflict' in failure
      ? { runPlanConflict: failure.conflict }
      : { runPlanError: failure.message };
  }
};

/**
 * Same kickoff form as `runPlan` plus `scheduledFor` (an ISO instant from the
 * client). Only "does it parse" is checked here; the server owns "in the future"
 * and the 30-day cap, and its message is returned as `schedulePlanRunError`.
 */
export const schedulePlanRun = async (
  args: Route.ActionArgs,
  planId: string,
  formData: FormData,
) => {
  const scheduled = parseFormData(
    formData,
    z.object({ scheduledFor: z.string().nullish() }),
    { strict: false },
  );
  if (!scheduled.success) {
    return { schedulePlanRunError: scheduled.error };
  }

  const when = parseScheduledFor(scheduled.data.scheduledFor);
  if (!when.success) {
    return { schedulePlanRunError: when.error };
  }

  const parsed = parsePlanRunForm(formData);
  if (!parsed.success) {
    return { schedulePlanRunError: parsed.error };
  }

  if (parsed.persisted !== undefined) {
    const persistError = await persistPlanRunSelection(
      args,
      planId,
      parsed.persisted,
    );
    if (persistError !== undefined) {
      return { schedulePlanRunError: persistError };
    }
  }

  try {
    // `replaceScheduled=true` is the user's yes to "Replace the scheduled run?".
    const validated = SchedulePlanRunInputSchema().parse({
      ...parsed.fields,
      planId,
      ...(formData.get('replaceScheduled') === 'true'
        ? { replaceScheduled: true }
        : {}),
      scheduledFor: when.scheduledFor,
    });
    // The generated schema types the `DateTime` scalar loosely (optional `any`),
    // so restate the instant that was just validated to keep the field required.
    const input = { ...validated, scheduledFor: when.scheduledFor };

    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailSchedulePlanRunDocument,
      { input },
    );

    if (!result.schedulePlanRun) {
      return { schedulePlanRunError: 'Failed to schedule plan run.' };
    }

    return { schedulePlanRun: result.schedulePlanRun };
  } catch (error) {
    const failure = readPlanScheduleFailure(
      error,
      'Failed to schedule plan run.',
    );

    return 'conflict' in failure
      ? { schedulePlanRunConflict: failure.conflict }
      : { schedulePlanRunError: failure.message };
  }
};

/**
 * Moves ONE SCHEDULED run's fire time in place. The form carries `planRunId` and
 * `scheduledFor` (an ISO instant); only "does it parse" is checked here. The
 * server owns "in the future, within 30 days, still SCHEDULED", and its message
 * is returned as `reschedulePlanRunError`.
 */
export const reschedulePlanRun = async (
  args: Route.ActionArgs,
  planId: string,
  formData: FormData,
) => {
  const parsed = parseFormData(
    formData,
    z.object({
      planRunId: z.string().min(1, 'Missing scheduled run id.'),
      scheduledFor: z.string().nullish(),
    }),
    { strict: false },
  );
  if (!parsed.success) {
    return { reschedulePlanRunError: parsed.error };
  }

  const when = parseScheduledFor(parsed.data.scheduledFor);
  if (!when.success) {
    return { reschedulePlanRunError: when.error };
  }

  try {
    const validated = ReschedulePlanRunInputSchema().parse({
      planId,
      planRunId: parsed.data.planRunId,
      scheduledFor: when.scheduledFor,
    });
    // The generated schema types the `DateTime` scalar loosely, so restate the
    // instant that was just validated to keep the field required.
    const input = { ...validated, scheduledFor: when.scheduledFor };

    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailReschedulePlanRunDocument,
      { input },
    );

    if (!result.reschedulePlanRun) {
      return { reschedulePlanRunError: 'Failed to reschedule plan run.' };
    }

    return { reschedulePlanRun: result.reschedulePlanRun };
  } catch (error) {
    return {
      reschedulePlanRunError: toErrorMessage(
        error,
        'Failed to reschedule plan run.',
      ),
    };
  }
};
