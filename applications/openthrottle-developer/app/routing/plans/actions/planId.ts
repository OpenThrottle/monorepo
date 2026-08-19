import {
  coerceNumber,
  executeGraphqlWithAuth,
  isJsonString,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';
import { PlanDetailCancelPlanRunDocument } from '@openthrottle/openthrottle-developer-codegen';
import {
  AddHookInputSchema,
  AddPlanTagInputSchema,
  CancelPlanRunInputSchema,
  DetachHookInputSchema,
  EnqueuePlanRunInputSchema,
  RalphPlanRunTuningInputSchema,
  RemovePlanTagInputSchema,
  SetPlanStatusInputSchema,
  UpdateTaskInputSchema,
} from '~/__generated__/schemas';
import {
  PlanDetailAddHookDocument,
  PlanDetailAddPlanTagDocument,
  PlanDetailDetachHookDocument,
  PlanDetailEnqueuePlanRunDocument,
  PlanDetailEvaluatePlanRulesDocument,
  PlanDetailRemovePlanTagDocument,
  PlanDetailSetPlanStatusDocument,
  PlanDetailUpdatePlanJobRunHooksDocument,
  PlanDetailUpdatePlanRunConfigDocument,
  PlanDetailUpdateTaskDocument,
} from '~/__generated__/graphql';
import { parseJobRunHooksJsonFromPlan } from '~/routing/plans/utils/job-run-hooks-ui';
import { toErrorMessage } from '~/global/utils/utils.error-message';
import type { RalphPlanRunTuningInput } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/plans.$planId._index';

export const cancelPlanRun = async (args: Route.ActionArgs, planId: string) => {
  try {
    const input = CancelPlanRunInputSchema().parse({ planId });
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
  const status =
    parsed.data.status != null && parsed.data.status !== ''
      ? parsed.data.status
      : 'COMPLETED';

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
  const jobRunHooksJson =
    parsed.data.jobRunHooksJson != null && parsed.data.jobRunHooksJson !== ''
      ? parsed.data.jobRunHooksJson
      : JSON.stringify({ hooks: [] });

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

export const runPlan = async (
  args: Route.ActionArgs,
  planId: string,
  formData: FormData,
) => {
  // Read every kickoff field through parseFormData (no `formData.get`). The
  // generated `EnqueuePlanRunInputSchema` supplies checkoutId/repositoryId/
  // workingDirectory/jobRunHooksJson; `planId` and `idempotencyKey` are not from
  // the form, `branch` is relaxed to attach a friendly required message below,
  // `priority` is coerced to a number, and `ralph` arrives as the raw
  // `ralphTuning` JSON string (validated against its schema afterwards to keep
  // the exact messages). `strict: false` lets the dispatch `intent` pass through.
  const parsed = parseFormData(
    formData,
    EnqueuePlanRunInputSchema()
      .omit({ idempotencyKey: true, planId: true, ralph: true })
      .extend({
        branch: z.string().nullish(),
        priority: coerceNumber(z.number()).nullish(),
        ralphTuning: z.string().nullish(),
      }),
    { strict: false },
  );
  if (!parsed.success) {
    return { runPlanError: parsed.error };
  }
  const fields = parsed.data;

  let ralph: RalphPlanRunTuningInput | undefined;
  if (fields.ralphTuning != null && fields.ralphTuning !== '') {
    try {
      const tuning: unknown = JSON.parse(fields.ralphTuning);
      const tuningResult = RalphPlanRunTuningInputSchema().safeParse(tuning);
      if (!tuningResult.success) {
        const issues = tuningResult.error.issues.map((i) => i.message);
        return {
          runPlanError: `Invalid workflow run options: ${issues.join('; ')}`,
        };
      }

      ralph = tuningResult.data;
    } catch {
      return { runPlanError: 'Invalid workflow run options payload.' };
    }
  }

  // Branch is a REQUIRED kickoff input (never inferred server-side). The run
  // config form pre-fills it from the selected checkout's current branch, but
  // the value is always sent explicitly; fail loud here when it is blank.
  const branch = fields.branch ?? undefined;
  if (branch === undefined) {
    return {
      runPlanError:
        'A git branch is required to run this plan. Pick or enter the branch this run operates on.',
    };
  }

  // Default to interactive priority (1) for UI-triggered runs.
  const priority = fields.priority ?? 1;
  const workingDirectory = fields.workingDirectory ?? undefined;
  const checkoutId = fields.checkoutId ?? undefined;
  const repositoryId = fields.repositoryId ?? undefined;

  let jobRunHooksJson: string | undefined;
  if (fields.jobRunHooksJson != null && fields.jobRunHooksJson !== '') {
    try {
      parseJobRunHooksJsonFromPlan(fields.jobRunHooksJson);
      jobRunHooksJson = fields.jobRunHooksJson;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        runPlanError: `Invalid job run hooks: ${message}`,
      };
    }
  }

  try {
    const input = EnqueuePlanRunInputSchema().parse({
      branch,
      planId,
      priority,
      ...(checkoutId !== undefined ? { checkoutId } : {}),
      ...(ralph !== undefined ? { ralph } : {}),
      ...(repositoryId !== undefined ? { repositoryId } : {}),
      ...(workingDirectory !== undefined ? { workingDirectory } : {}),
      ...(jobRunHooksJson !== undefined ? { jobRunHooksJson } : {}),
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
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);

    return { runPlanError: message };
  }
};

/**
 * @description The `plans.$planId._index` route action's response contract — the union of
 * every intent handler above, plus the missing-plan-id guard the route itself returns.
 *
 * Declared here rather than inferred from the route module via `typeof action` so domain
 * components never import from `~/routes/*`; that direction becomes a library→application
 * cycle if `app/routing` is extracted (OT plan 88f747ff task 8ab97f22). The route module
 * annotates its `action` with this type, so the union cannot silently drift from the
 * handlers — adding an intent without extending this union is a compile error there.
 */
export type PlanDetailActionData =
  | Awaited<ReturnType<typeof addHook>>
  | Awaited<ReturnType<typeof addPlanTag>>
  | Awaited<ReturnType<typeof cancelPlanRun>>
  | Awaited<ReturnType<typeof detachHook>>
  | Awaited<ReturnType<typeof evaluatePlanRules>>
  | Awaited<ReturnType<typeof removePlanTag>>
  | Awaited<ReturnType<typeof runPlan>>
  | Awaited<ReturnType<typeof saveJobRunHooks>>
  | Awaited<ReturnType<typeof saveRunConfig>>
  | Awaited<ReturnType<typeof setPlanStatus>>
  | Awaited<ReturnType<typeof updateTaskStatus>>
  | { runPlanError: string };
