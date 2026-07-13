import * as React from 'react';
import {
  Badge,
  Card,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { Link, useFetcher, useSearchParams } from 'react-router';
import {
  BoltIcon,
  CogIcon,
  LayoutListIcon,
  NotebookTextIcon,
  TerminalSquareIcon,
} from 'lucide-react';
import {
  EnqueuePlanRunInputSchema,
  RalphPlanRunTuningInputSchema,
  SetPlanStatusInputSchema,
  UpdateTaskInputSchema,
} from '~/__generated__/schemas';
import {
  PlanDetailAddPlanTagDocument,
  PlanDetailEnqueuePlanRunDocument,
  PlanDetailIndexLoaderDocument,
  PlanDetailRemovePlanTagDocument,
  PlanDetailSetPlanStatusDocument,
  PlanDetailUpdatePlanJobRunHooksDocument,
  PlanDetailUpdatePlanRunConfigDocument,
  PlanDetailUpdateTaskDocument,
} from '~/__generated__/graphql';
import { parseJobRunHooksJsonFromPlan } from '~/routing/plans/utils/job-run-hooks-ui';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { cancelPlanRun } from '~/routing/plans/actions/planId';
import { DEFAULT_PLAN_TASKS_VIEW_STORAGE_KEY } from '~/routing/plans/config/defaults';
import {
  isPlanStatusKey,
  PlanStatusBadge,
} from '~/routing/plans/components/PlanStatusBadge';
import {
  PLANS_DETAIL_TAB_SEARCH_PARAM,
  parsePlanDetailTab,
  parsePlanTasksView,
} from '~/routing/plans/utils/parsers';
import { PlanTabConfiguration } from '~/routing/plans/components/PlanTabConfiguration';
import { PlanTabDetails } from '~/routing/plans/components/PlanTabDetails';
import { LinkedArtifactsPanel } from '~/routing/plans/components/LinkedArtifactsPanel';
import { PlanRuleApplications } from '~/routing/plans/components/PlanRuleApplications';
import { PlanTabTasks } from '~/routing/plans/components/PlanTabTasks';
import { PlanTagChips } from '~/routing/plans/components/PlanTagChips';
import { PlanTasksBoard } from '~/routing/plans/components/PlanTasksBoard';
import { SITE_TITLE } from '~/global/config/settings';
import type { RalphPlanRunTuningInput } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/plans.$planId._index';
import {
  OpenThrottleClipboard,
  OpenThrottleEmptyState,
  OpenThrottleTabs,
} from '@openthrottle/react-router-ui';
import { formatPlanDate } from '~/routing/plans/utils/formatters';
import { PlanTabOutput } from '~/routing/plans/components/PlanTabOutput';
import { usePlanOutputStream } from '~/routing/plans/hooks/usePlanOutputStream';
import { usePlanLifecycleRevalidation } from '~/routing/plans/hooks/usePlanLifecycleRevalidation';
import { usePlanRunConfigEditor } from '~/routing/plans/hooks/usePlanRunConfigEditor';

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
  const { actionData: _a, loaderData, matches: _m, params } = props;
  const { linkedArtifacts, plan, ruleApplications, tagVocabulary, tasks } =
    loaderData;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const tagFetcher = useFetcher();
  const {
    jobRunHookRows,
    jobRunHooksJson,
    jobRunHooksValidation,
    onResetToDefaults,
    onSaveJobRunHooks,
    onSaveRunConfig,
    onToggleExpanded,
    ralphTuningJson,
    runConfigSaveBlocked,
    runConfigSaveBlockedReason,
    saveJobRunHooksPending,
    saveRunConfigPending,
    setJobRunHookRows,
    setWorkflowInput,
    setWorkflowTimeout,
    setWorkingDirectory,
    workflowInput,
    workflowTimeout,
    workingDirectory,
  } = usePlanRunConfigEditor(plan);

  // Setup
  const [fullscreen, setFullscreen] = React.useState(false);

  const planTasksView = parsePlanTasksView(searchParams.get('view')) ?? 'table';
  const isBoardView = planTasksView === 'board';

  const planId = params.planId ?? '';

  // Pilot: seed from the loader snapshot, then merge live deltas from the
  // planOutputChunkAdded subscription (graphql-ws). Socket.IO keeps running.
  const planOutputChunks = usePlanOutputStream(
    planId,
    loaderData.planOutputChunks,
  );
  const status =
    plan != null && isPlanStatusKey(plan.status) ? plan.status : 'PENDING';

  const completedTaskCount = tasks.filter(
    (task) => task.status === 'COMPLETED',
  ).length;

  // Handlers

  // Markup

  // Life Cycle

  // When URL has no `view`, apply last choice from localStorage (board only adds a query param).
  // Runs when the plan changes so switching plans can restore the saved board preference without
  // re-applying on every search-param change (e.g. after the user clears `view` for table).
  React.useEffect(() => {
    if (parsePlanTasksView(searchParams.get('view'))) return;

    try {
      const stored = parsePlanTasksView(
        localStorage.getItem(DEFAULT_PLAN_TASKS_VIEW_STORAGE_KEY),
      );
      if (stored === 'board') {
        const next = new URLSearchParams(searchParams);
        next.set('view', 'board');
        setSearchParams(next, { replace: true });
      }
    } catch {
      // ignore
    }
  }, [planId]);

  // Keep storage in sync when `view` is present in the URL (e.g. shared links).
  React.useEffect(() => {
    const fromUrl = parsePlanTasksView(searchParams.get('view'));
    if (!fromUrl) return;

    try {
      localStorage.setItem(DEFAULT_PLAN_TASKS_VIEW_STORAGE_KEY, fromUrl);
    } catch {
      // ignore
    }
  }, [searchParams]);

  // Revalidate plan detail when a plan/task lifecycle notification arrives over
  // the GraphQL subscription (server-side topic routing by planId).
  usePlanLifecycleRevalidation(planId);

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

  return (
    <>
      <GlobalScreen className="-max-w-5xl flex h-full w-full flex-col gap-4 p-4 md:gap-8 md:p-8 lg:gap-12 lg:p-12">
        <div>
          <GlobalHeading
            className="mb-4"
            icon={NotebookTextIcon}
            title={plan.title ?? 'Untitled'}
          />
          <div className="text-muted-foreground line-clamp-3 flex items-center gap-2 text-sm">
            <PlanStatusBadge status={status} to={`/plans?status=${status}`} />
            <span>&bull;</span>
            {plan.projectRelation?.id != null ? (
              <Badge asChild={true} color="slate" size="xs">
                <Link
                  to={`/projects/${plan.projectRelation.id}`}
                  viewTransition={true}
                >
                  {plan.projectRelation.name}
                </Link>
              </Badge>
            ) : (
              <Badge color="slate" size="xs">
                {plan.projectRelation?.name
                  ? plan.projectRelation.name
                  : plan.project}
              </Badge>
            )}
            <span>&bull;</span>
            <span>Last updated</span>
            <span>&bull;</span>
            <span className="font-medium">
              {formatPlanDate(plan.updatedAt)}
            </span>
            {/* {plan.description ?? 'No description'} */}
          </div>
          {/* {plan.projectRelation != null ||
          (plan.project != null && plan.project !== '') ? (
            <div
              className="bg-muted/40 text-muted-foreground mt-3 rounded-md border px-3 py-2 text-sm"
              role="note"
            >
              Project:{' '}
              {plan.projectRelation != null ? (
                <Link
                  aria-label={`Project: ${plan.projectRelation.name}`}
                  className="hover:text-foreground font-medium underline underline-offset-2"
                  to={`/projects/${plan.projectRelation.id}`}
                  viewTransition={true}
                >
                  {plan.projectRelation.name}
                </Link>
              ) : (
                <span className="text-foreground font-medium">
                  {plan.project}
                </span>
              )}
            </div>
          ) : null} */}
        </div>

        <div className="flex flex-col gap-3">
          <PlanTagChips
            onAddTag={(tag) =>
              tagFetcher.submit(
                { intent: 'addPlanTag', tag },
                { method: 'post' },
              )
            }
            onRemoveTag={(tag) =>
              tagFetcher.submit(
                { intent: 'removePlanTag', tag },
                { method: 'post' },
              )
            }
            pending={tagFetcher.state !== 'idle'}
            tags={plan.tags}
            vocabulary={tagVocabulary}
          />
          <PlanRuleApplications applications={ruleApplications} />
          <LinkedArtifactsPanel artifacts={linkedArtifacts} />
        </div>

        <div className="">
          <OpenThrottleTabs
            urlSync={{
              defaultValue: 'overview',
              param: PLANS_DETAIL_TAB_SEARCH_PARAM,
              parse: (raw) => parsePlanDetailTab(raw) ?? undefined,
            }}
          >
            <TabsList
              className="mb-8 w-full max-w-full justify-start gap-4 overflow-x-auto overflow-y-hidden"
              variant="line"
            >
              <TabsTrigger
                className="flex-0 cursor-pointer"
                id="plan-tab-overview"
                value="overview"
              >
                <BoltIcon />
                Details
              </TabsTrigger>
              <TabsTrigger
                className="flex-0 cursor-pointer"
                id="plan-tab-tasks"
                value="tasks"
              >
                <LayoutListIcon />
                Tasks ({completedTaskCount}/{tasks.length})
              </TabsTrigger>
              <TabsTrigger
                className="flex-0 cursor-pointer"
                id="plan-tab-output"
                value="output"
              >
                <TerminalSquareIcon />
                Output
              </TabsTrigger>

              <div className="flex-1" />
              <TabsTrigger
                className="flex-0 cursor-pointer"
                id="plan-tab-configuration"
                value="configuration"
              >
                <CogIcon />
                Configuration
              </TabsTrigger>
            </TabsList>

            <PlanTabDetails
              fullscreen={fullscreen}
              jobRunHooksBlocked={!jobRunHooksValidation.ok}
              jobRunHooksBlockedReason={jobRunHooksValidation.issues[0]}
              jobRunHooksJson={jobRunHooksJson}
              ralphTuningJson={ralphTuningJson}
              setFullscreen={setFullscreen}
              workflowInput={workflowInput}
              workflowTimeout={workflowTimeout}
              workingDirectory={workingDirectory}
            />
            <PlanTabTasks />
            <PlanTabOutput chunks={planOutputChunks} />
            <PlanTabConfiguration
              iterationTimeoutText={workflowTimeout}
              jobRunHookRows={jobRunHookRows}
              onCollapse={() => onToggleExpanded(false)}
              onIterationTimeoutTextChange={setWorkflowTimeout}
              onJobRunHookRowsChange={setJobRunHookRows}
              onResetToDefaults={onResetToDefaults}
              onSaveJobRunHooks={onSaveJobRunHooks}
              onSaveRunConfig={onSaveRunConfig}
              onValueChange={setWorkflowInput}
              onWorkingDirectoryChange={setWorkingDirectory}
              planId={plan.id}
              saveJobRunHooksDisabled={!jobRunHooksValidation.ok}
              saveJobRunHooksPending={saveJobRunHooksPending}
              saveRunConfigDisabled={runConfigSaveBlocked}
              saveRunConfigPending={saveRunConfigPending}
              value={workflowInput}
              workingDirectory={workingDirectory}
            />

            {/* saveJobRunHooks / saveRunConfig outcomes surface as toasts
                (useActionToast in usePlanRunConfigEditor). */}

            {runConfigSaveBlocked && runConfigSaveBlockedReason != null ? (
              <p className="text-muted-foreground px-4 text-xs" role="note">
                Save configuration blocked: {runConfigSaveBlockedReason}
              </p>
            ) : null}
          </OpenThrottleTabs>
        </div>
      </GlobalScreen>

      {isBoardView ? (
        <Card className="mx-4 overflow-hidden">
          <PlanTasksBoard />
        </Card>
      ) : null}
    </>
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
