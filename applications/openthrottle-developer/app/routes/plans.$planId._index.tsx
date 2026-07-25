import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  AddHookInputSchema,
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
  PlanDetailIndexLoaderDocument,
  PlanDetailRemovePlanTagDocument,
  PlanDetailSetPlanStatusDocument,
  PlanDetailUpdatePlanJobRunHooksDocument,
  PlanDetailUpdatePlanRunConfigDocument,
  PlanDetailUpdateTaskDocument,
} from '~/__generated__/graphql';
import { parseJobRunHooksJsonFromPlan } from '~/routing/plans/utils/job-run-hooks-ui';
import { cancelPlanRun } from '~/routing/plans/actions/planId';
import { PlanDetailRoute } from '~/routing/plans/components/PlanDetailRoute';
import { PlanRunConfigStoreProvider } from '~/routing/plans/components/PlanRunConfigStoreProvider';
import { SITE_TITLE } from '~/global/config/settings';
import type { RalphPlanRunTuningInput } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/plans.$planId._index';
import {
  OpenThrottleClipboard,
  OpenThrottleEmptyState,
} from '@openthrottle/react-router-ui';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => (
    <OpenThrottleClipboard
      className="cursor-pointer whitespace-nowrap"
      label={match.params.planId}
      text={match.params.planId ?? 'not-found'}
    />
  ),
  links: (_match) => [{ children: 'Plans', to: '/plans' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { planId } = args.params;

  if (!planId) {
    return {
      linkedArtifacts: [],
      plan: null,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      ruleApplications: [],
      tagVocabulary: [],
      tasks: [],
      workspaceRepositories: [],
    };
  }

  const page = await executeGraphqlWithAuth(
    args.request,
    PlanDetailIndexLoaderDocument,
    { planId },
  );

  return {
    linkedArtifacts: page.workArtifactsByPlan.artifacts ?? [],
    plan: page.plan ?? null,
    planOutputChunks: page.planOutputStreamChunks ?? [],
    planRunAuditRows: page.planRunsByPlanId ?? [],
    recentPlanRuns: page.metrics.recentPlanRunsMetrics ?? [],
    ruleApplications: page.ruleApplications ?? [],
    tagVocabulary: page.skillTagVocabulary.tags ?? [],
    tasks: page.tasksByPlanId ?? [],
    workspaceRepositories: page.workspaceRepositories ?? [],
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const plan = args.loaderData?.plan;
  const title = plan?.title
    ? `${plan.title} | Plans | ${SITE_TITLE}`
    : `Plan Details | ${SITE_TITLE}`;

  return [{ title }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData, params } = props;
  const { plan } = loaderData;

  // 🔌 Short Circuit
  if (!plan) {
    return (
      <GlobalScreen>
        <OpenThrottleEmptyState
          description="The plan you are looking for does not exist."
          title="Plan not found"
        />
      </GlobalScreen>
    );
  }

  // Route-scoped Jotai store keyed on plan.id: run-config atoms reset on plan
  // navigation and are seeded once per mount from the plan's persisted config.
  // The body reads those atoms, so it must live inside the Provider (a component
  // cannot consume a Provider it renders in its own JSX).
  return (
    <PlanRunConfigStoreProvider key={plan.id} plan={plan}>
      <PlanDetailRoute loaderData={loaderData} params={params} plan={plan} />
    </PlanRunConfigStoreProvider>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const planId = args.params.planId;

  if (!planId) {
    return { runPlanError: 'Missing plan id.' };
  }

  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'cancelPlanRun') {
    const result = await cancelPlanRun(args, planId);

    if (result.cancelPlanRunError != null && result.cancelPlanRunError !== '') {
      return { cancelPlanRunError: result.cancelPlanRunError };
    }

    return { cancelPlanRun: result.cancelPlanRun };
  }

  if (intent === 'addPlanTag') {
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
  }

  if (intent === 'removePlanTag') {
    const tag = formData.get('tag');
    if (typeof tag !== 'string' || tag.trim() === '') {
      return { planTagError: 'Tag is required.' };
    }
    try {
      await executeGraphqlWithAuth(
        args.request,
        PlanDetailRemovePlanTagDocument,
        { input: { planId, tag: tag.trim() } },
      );
      return { planTagUpdated: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { planTagError: message };
    }
  }

  if (intent === 'addHook') {
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
  }

  if (intent === 'detachHook') {
    try {
      const input = DetachHookInputSchema().parse({
        hookTaskId: formData.get('hookTaskId'),
      });

      const result = await executeGraphqlWithAuth(
        args.request,
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
  }

  if (intent === 'evaluatePlanRules') {
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
  }

  if (intent === 'setPlanStatus') {
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
  }

  if (intent === 'updateTaskStatus') {
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
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);

      return { updateTaskError: message };
    }
  }

  if (intent === 'saveRunConfig') {
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
  }

  if (intent === 'saveJobRunHooks') {
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
  }

  if (intent === 'runPlan') {
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

    const workingDirectoryRaw = formData.get('workingDirectory');
    const workingDirectory =
      typeof workingDirectoryRaw === 'string' &&
      workingDirectoryRaw.trim() !== ''
        ? workingDirectoryRaw.trim()
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
        planId,
        priority,
        ...(ralph !== undefined ? { ralph } : {}),
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
  }

  // 🚨 Default to invalid action error when no intent is provided.
  throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
