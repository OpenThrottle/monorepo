import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { PlanDetailCancelPlanRunDocument } from '@openthrottle/openthrottle-developer-codegen';
import {
  AddHookInputSchema,
  CancelPlanRunInputSchema,
  DetachHookInputSchema,
  EnqueuePlanRunInputSchema,
  RalphPlanRunTuningInputSchema,
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
  const tag = formData.get('tag');
  if (typeof tag !== 'string' || tag.trim() === '') {
    return { planTagError: 'Tag is required.' };
  }
  try {
    await executeGraphqlWithAuth(args.request, PlanDetailAddPlanTagDocument, {
      input: { planId, tag: tag.trim() },
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
  const tag = formData.get('tag');
  if (typeof tag !== 'string' || tag.trim() === '') {
    return { planTagError: 'Tag is required.' };
  }
  try {
    await executeGraphqlWithAuth(
      args.request,
      PlanDetailRemovePlanTagDocument,
      {
        input: { planId, tag: tag.trim() },
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
  const optionalField = (key: string): string | undefined => {
    const value = formData.get(key);
    return typeof value === 'string' && value.trim() !== ''
      ? value.trim()
      : undefined;
  };

  try {
    const input = AddHookInputSchema().parse({
      anchorTaskId: optionalField('anchorTaskId'),
      planId,
      role: formData.get('role'),
      scope: optionalField('scope'),
      skillSlug: optionalField('skillSlug'),
      source: formData.get('source'),
      title: optionalField('title'),
    });

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
  try {
    const input = DetachHookInputSchema().parse({
      hookTaskId: formData.get('hookTaskId'),
    });

    const result = await executeGraphqlWithAuth(
      request,
      PlanDetailDetachHookDocument,
      { input },
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
  const statusField = formData.get('status');
  const status =
    typeof statusField === 'string' && statusField.trim() !== ''
      ? statusField
      : 'COMPLETED';

  const input = SetPlanStatusInputSchema().parse({ planId, status });

  if (!status || status.trim() === '') {
    return { setPlanStatusError: 'Status is required.' };
  }

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailSetPlanStatusDocument,
      { input },
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
  try {
    const input = UpdateTaskInputSchema().parse({
      id: formData.get('taskId'),
      planId,
      status: formData.get('status'),
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
  const configRaw = formData.get('runConfigJson');
  const runConfigJson =
    typeof configRaw === 'string' && configRaw.trim() !== ''
      ? configRaw.trim()
      : null;

  if (runConfigJson != null) {
    try {
      JSON.parse(runConfigJson);
    } catch {
      return { saveRunConfigError: 'runConfigJson must be valid JSON.' };
    }
  }

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
  const hooksRaw = formData.get('jobRunHooksJson');
  const jobRunHooksJson =
    typeof hooksRaw === 'string' && hooksRaw.trim() !== ''
      ? hooksRaw.trim()
      : JSON.stringify({ hooks: [] });

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
  const priorityRaw = formData.get('priority');
  const priority =
    priorityRaw != null && priorityRaw !== '' ? Number(priorityRaw) : 1; // Default to interactive priority (1) for UI-triggered runs

  const ralphTuningRaw = formData.get('ralphTuning');
  let ralph: RalphPlanRunTuningInput | undefined;

  if (typeof ralphTuningRaw === 'string' && ralphTuningRaw.trim() !== '') {
    try {
      const parsed: unknown = JSON.parse(ralphTuningRaw);
      const tuningResult = RalphPlanRunTuningInputSchema().safeParse(parsed);
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
  const branchRaw = formData.get('branch');
  const branch =
    typeof branchRaw === 'string' && branchRaw.trim() !== ''
      ? branchRaw.trim()
      : undefined;
  if (branch === undefined) {
    return {
      runPlanError:
        'A git branch is required to run this plan. Pick or enter the branch this run operates on.',
    };
  }

  const workingDirectoryRaw = formData.get('workingDirectory');
  const workingDirectory =
    typeof workingDirectoryRaw === 'string' && workingDirectoryRaw.trim() !== ''
      ? workingDirectoryRaw.trim()
      : undefined;

  const checkoutIdRaw = formData.get('checkoutId');
  const checkoutId =
    typeof checkoutIdRaw === 'string' && checkoutIdRaw.trim() !== ''
      ? checkoutIdRaw.trim()
      : undefined;

  const repositoryIdRaw = formData.get('repositoryId');
  const repositoryId =
    typeof repositoryIdRaw === 'string' && repositoryIdRaw.trim() !== ''
      ? repositoryIdRaw.trim()
      : undefined;

  const jobRunHooksRaw = formData.get('jobRunHooksJson');
  let jobRunHooksJson: string | undefined;
  if (typeof jobRunHooksRaw === 'string' && jobRunHooksRaw.trim() !== '') {
    try {
      parseJobRunHooksJsonFromPlan(jobRunHooksRaw.trim());
      jobRunHooksJson = jobRunHooksRaw.trim();
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
