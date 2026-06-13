import * as React from 'react';
import { Card, TabsList, TabsTrigger } from '@openthrottle/react-router-shadcn';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import {
  Link,
  redirect,
  useFetcher,
  useRevalidator,
  useSearchParams,
} from 'react-router';
import { useNotificationsSocket } from '@openthrottle/react-router-notifications';
import type {
  PlanStatusChangedPayload,
  TaskStatusChangedPayload,
} from '@openthrottle/openthrottle-notifications';
import {
  BadgeCheckIcon,
  BoltIcon,
  CogIcon,
  FileIcon,
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
  buildRalphPlanRunTuningInputFromWorkflowRunOptions,
  getDefaultWorkflowRalphRunOptionsInput,
  parseWorkflowRunIterationTimeoutSeconds,
  validateWorkflowRalphRunOptionsState,
  type WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import {
  PlanDetailEnqueuePlanRunDocument,
  PlanDetailIndexLoaderDocument,
  PlanDetailSetPlanStatusDocument,
  PlanDetailUpdatePlanJobRunHooksDocument,
  PlanDetailUpdatePlanRunConfigDocument,
  PlanDetailUpdateTaskDocument,
} from '~/__generated__/graphql';
import {
  jobRunHookEntriesToDraftRows,
  normalizeJobRunHookDraftRows,
  parseJobRunHooksJsonFromPlan,
  serializeJobRunHooksConfig,
  validateJobRunHooksDraftRows,
  type JobRunHookDraftRow,
} from '~/routing/plans/utils/job-run-hooks-ui';
import {
  hydratePlanRunConfigUiState,
  serializePlanRunConfigUiState,
} from '~/routing/plans/utils/plan-run-config-ui';
import { validateWorkspacePathClient } from '~/routing/plans/utils/workspace-path';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE,
  WORKFLOW_RUN_OPTIONS_SEARCH_PARAM,
} from '~/routing/plans/utils/workflow-run-options-search-param';
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
import { PlanTabRequirements } from '~/routing/plans/components/PlanTabRequirements';
import { PlanTabsMetadata } from '~/routing/plans/components/PlanTabsMetadata';
import { PlanTabTasks } from '~/routing/plans/components/PlanTabTasks';
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
      plan: null,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      tasks: [],
    };
  }

  const page = await executeGraphqlWithAuth(
    args.request,
    PlanDetailIndexLoaderDocument,
    { planId },
  );

  return {
    plan: page.plan ?? null,
    planOutputChunks: page.planOutputStreamChunks ?? [],
    planRunAuditRows: page.planRunsByPlanId ?? [],
    recentPlanRuns: page.metrics.recentPlanRunsMetrics ?? [],
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
  const { plan, planRunAuditRows, recentPlanRuns, tasks } = loaderData;

  // Hooks
  const revalidator = useRevalidator();
  const socketContext = useNotificationsSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const [workflowTimeout, setWorkflowTimeout] = React.useState('');
  const [workingDirectory, setWorkingDirectory] = React.useState('');
  const [workflowInput, setWorkflowInput] =
    React.useState<WorkflowRalphRunOptionsInput>(() =>
      getDefaultWorkflowRalphRunOptionsInput({ planId: plan?.id }),
    );
  const [jobRunHookRows, setJobRunHookRows] = React.useState<
    JobRunHookDraftRow[]
  >(() => jobRunHookEntriesToDraftRows([]));
  const fetcherSaveJobRunHooks = useFetcher<typeof action>();
  const fetcherSaveRunConfig = useFetcher<typeof action>();

  // Setup
  const [fullscreen, setFullscreen] = React.useState(false);

  const { PLAN_STATUS_CHANGED } = NOTIFICATION_EVENT_NAMES;
  const { TASK_STATUS_CHANGED } = NOTIFICATION_EVENT_NAMES;
  const planTasksView = parsePlanTasksView(searchParams.get('view')) ?? 'table';
  const isBoardView = planTasksView === 'board';

  const planId = params.planId ?? '';
  const status =
    plan != null && isPlanStatusKey(plan.status) ? plan.status : 'PENDING';

  const ralphTuningJson = React.useMemo((): string => {
    const merged: WorkflowRalphRunOptionsInput = {
      ...workflowInput,
      iterationTimeoutSeconds:
        parseWorkflowRunIterationTimeoutSeconds(workflowTimeout),
    };

    const tuning = buildRalphPlanRunTuningInputFromWorkflowRunOptions(merged);

    return tuning === undefined ? '' : JSON.stringify(tuning);
  }, [workflowInput, workflowTimeout]);

  const jobRunHooksJson = React.useMemo((): string => {
    const validation = validateJobRunHooksDraftRows(jobRunHookRows);
    if (!validation.ok) {
      return '';
    }
    try {
      const entries = normalizeJobRunHookDraftRows(jobRunHookRows);
      return serializeJobRunHooksConfig(entries);
    } catch {
      return '';
    }
  }, [jobRunHookRows]);

  const jobRunHooksValidation = validateJobRunHooksDraftRows(jobRunHookRows);

  const workflowValidation = validateWorkflowRalphRunOptionsState(
    workflowInput,
    workflowTimeout,
    { requireCliTargetIds: true },
  );
  const workspacePathError = validateWorkspacePathClient(workingDirectory);
  const runConfigSaveBlocked =
    !workflowValidation.ok || workspacePathError != null;
  const runConfigSaveBlockedReason = !workflowValidation.ok
    ? workflowValidation.issues[0]?.message
    : workspacePathError;

  const runConfigJson = React.useMemo((): string => {
    if (runConfigSaveBlocked || plan?.id == null) {
      return '';
    }

    try {
      return serializePlanRunConfigUiState({
        iterationTimeoutText: workflowTimeout,
        workflowInput,
        workingDirectory,
      });
    } catch {
      return '';
    }
  }, [
    plan?.id,
    runConfigSaveBlocked,
    workflowInput,
    workflowTimeout,
    workingDirectory,
  ]);

  const saveJobRunHooksData = fetcherSaveJobRunHooks.data;
  const saveJobRunHooksError =
    saveJobRunHooksData != null &&
    typeof saveJobRunHooksData === 'object' &&
    'saveJobRunHooksError' in saveJobRunHooksData &&
    typeof saveJobRunHooksData.saveJobRunHooksError === 'string'
      ? saveJobRunHooksData.saveJobRunHooksError
      : undefined;

  const saveRunConfigData = fetcherSaveRunConfig.data;
  const saveRunConfigError =
    saveRunConfigData != null &&
    typeof saveRunConfigData === 'object' &&
    'saveRunConfigError' in saveRunConfigData &&
    typeof saveRunConfigData.saveRunConfigError === 'string'
      ? saveRunConfigData.saveRunConfigError
      : undefined;

  // Handlers
  const onResetToDefaults = (): void => {
    setWorkflowInput(
      getDefaultWorkflowRalphRunOptionsInput({ planId: plan?.id }),
    );

    setWorkingDirectory('');
    setWorkflowTimeout('');
  };

  const onSaveJobRunHooks = (): void => {
    if (!plan?.id || !jobRunHooksValidation.ok) {
      return;
    }

    const formData = new FormData();
    formData.set('intent', 'saveJobRunHooks');
    formData.set('jobRunHooksJson', jobRunHooksJson);
    void fetcherSaveJobRunHooks.submit(formData, { method: 'post' });
  };

  const onSaveRunConfig = (): void => {
    if (!plan?.id || runConfigSaveBlocked || runConfigJson === '') {
      return;
    }

    const formData = new FormData();
    formData.set('intent', 'saveRunConfig');
    formData.set('runConfigJson', runConfigJson);
    void fetcherSaveRunConfig.submit(formData, { method: 'post' });
  };

  const onToggleExpanded = (expanded: boolean): void => {
    const next = new URLSearchParams(searchParams);
    if (expanded) {
      next.set(
        WORKFLOW_RUN_OPTIONS_SEARCH_PARAM,
        WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE,
      );
    } else {
      next.delete(WORKFLOW_RUN_OPTIONS_SEARCH_PARAM);
    }

    setSearchParams(next, {
      preventScrollReset: true,
      replace: true,
    });
  };

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

  React.useEffect(() => {
    if (!plan?.id) {
      return;
    }

    const hydrated = hydratePlanRunConfigUiState(plan.id, plan.runConfigJson);

    setWorkflowInput(hydrated.workflowInput);
    setWorkingDirectory(hydrated.workingDirectory);
    setWorkflowTimeout(hydrated.iterationTimeoutText);

    try {
      const entries = parseJobRunHooksJsonFromPlan(plan.jobRunHooksJson);
      setJobRunHookRows(jobRunHookEntriesToDraftRows(entries));
    } catch {
      setJobRunHookRows(jobRunHookEntriesToDraftRows([]));
    }
  }, [plan?.id, plan?.jobRunHooksJson, plan?.runConfigJson]);

  // Subscribe to plan/task status-change events so we revalidate when status
  // is updated via openthrottle-mcp or API, keeping plan and tasks in sync.
  // Manual QA: see `PlanTasksBoard.test.tsx` file comment (socket + board/table).
  React.useEffect(() => {
    if (fetcherSaveJobRunHooks.state !== 'idle') return;

    const data = fetcherSaveJobRunHooks.data;
    if (
      data != null &&
      typeof data === 'object' &&
      'saveJobRunHooks' in data &&
      data.saveJobRunHooks != null
    ) {
      revalidator.revalidate();
    }
  }, [fetcherSaveJobRunHooks.state, fetcherSaveJobRunHooks.data, revalidator]);

  React.useEffect(() => {
    if (fetcherSaveRunConfig.state !== 'idle') return;

    const data = fetcherSaveRunConfig.data;
    if (
      data != null &&
      typeof data === 'object' &&
      'saveRunConfig' in data &&
      data.saveRunConfig != null
    ) {
      revalidator.revalidate();
    }
  }, [fetcherSaveRunConfig.state, fetcherSaveRunConfig.data, revalidator]);

  React.useEffect(() => {
    if (!planId || !socketContext?.socket) return;
    const socket = socketContext.socket;

    const onPlanStatusChanged = (payload: PlanStatusChangedPayload): void => {
      if (payload.planId === planId) revalidator.revalidate();
    };

    const onTaskStatusChanged = (payload: TaskStatusChangedPayload): void => {
      if (payload.planId === planId) revalidator.revalidate();
    };

    socket.on(PLAN_STATUS_CHANGED, onPlanStatusChanged);
    socket.on(TASK_STATUS_CHANGED, onTaskStatusChanged);

    return () => {
      socket.off(PLAN_STATUS_CHANGED, onPlanStatusChanged);
      socket.off(TASK_STATUS_CHANGED, onTaskStatusChanged);
    };
  }, [planId, revalidator, socketContext?.socket]);

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
      <GlobalScreen>
        <div>
          <GlobalHeading
            className="mb-4"
            icon={NotebookTextIcon}
            title={plan.title ?? 'Untitled'}
          />
          <div className="text-sm text-muted-foreground line-clamp-3">
            <PlanStatusBadge status={status} /> &bull; Last updated:{' '}
            {formatPlanDate(plan.updatedAt)}
            {/* {plan.description ?? 'No description'} */}
          </div>
          {plan.projectRelation != null ||
          (plan.project != null && plan.project !== '') ? (
            <div
              className="mt-3 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
              role="note"
            >
              Project:{' '}
              {plan.projectRelation != null ? (
                <Link
                  aria-label={`Project: ${plan.projectRelation.name}`}
                  className="font-medium underline underline-offset-2 hover:text-foreground"
                  to={`/projects/${plan.projectRelation.id}`}
                  viewTransition={true}
                >
                  {plan.projectRelation.name}
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  {plan.project}
                </span>
              )}
            </div>
          ) : null}
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
              className="mb-8 gap-4 justify-start max-w-full overflow-x-auto overflow-y-hidden w-full"
              variant="line"
            >
              <TabsTrigger className="flex-0 cursor-pointer" value="overview">
                <BoltIcon />
                Details
              </TabsTrigger>
              <TabsTrigger className="flex-0 cursor-pointer" value="tasks">
                <LayoutListIcon />
                Tasks ({tasks.length})
              </TabsTrigger>
              <TabsTrigger
                className="flex-0 cursor-pointer"
                value="requirements"
              >
                <BadgeCheckIcon />
                Requirements ({tasks.length})
              </TabsTrigger>
              {/* {loaderData.planOutputChunks.length > 0 ? (
              ) : null} */}
              <div className="flex-1" />
              <TabsTrigger
                className="flex-0 cursor-pointer"
                value="configuration"
              >
                <CogIcon />
                Configuration
              </TabsTrigger>
              <TabsTrigger className="flex-0 cursor-pointer" value="metadata">
                <FileIcon />
                Metadata
              </TabsTrigger>
              <TabsTrigger className="flex-0 cursor-pointer" value="output">
                <TerminalSquareIcon />
                Output
              </TabsTrigger>
            </TabsList>

            <PlanTabDetails
              fullscreen={fullscreen}
              jobRunHooksBlocked={!jobRunHooksValidation.ok}
              jobRunHooksBlockedReason={jobRunHooksValidation.issues[0]}
              jobRunHooksJson={jobRunHooksJson}
              plan={plan}
              planRunAuditRows={planRunAuditRows}
              ralphTuningJson={ralphTuningJson}
              recentPlanRuns={recentPlanRuns}
              setFullscreen={setFullscreen}
              workflowInput={workflowInput}
              workflowTimeout={workflowTimeout}
              workingDirectory={workingDirectory}
            />
            <PlanTabTasks tasks={tasks} />
            <PlanTabRequirements plan={plan} tasks={tasks} />
            <PlanTabOutput chunks={loaderData.planOutputChunks} />
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
              saveJobRunHooksPending={fetcherSaveJobRunHooks.state !== 'idle'}
              saveRunConfigDisabled={runConfigSaveBlocked}
              saveRunConfigPending={fetcherSaveRunConfig.state !== 'idle'}
              value={workflowInput}
              workingDirectory={workingDirectory}
            />
            {saveJobRunHooksError != null ? (
              <p className="text-destructive text-xs px-4" role="alert">
                {saveJobRunHooksError}
              </p>
            ) : null}
            {saveRunConfigError != null ? (
              <p className="text-destructive text-xs px-4" role="alert">
                {saveRunConfigError}
              </p>
            ) : null}
            {runConfigSaveBlocked && runConfigSaveBlockedReason != null ? (
              <p className="text-muted-foreground text-xs px-4" role="note">
                Save configuration blocked: {runConfigSaveBlockedReason}
              </p>
            ) : null}
            <PlanTabsMetadata plan={plan} />
          </OpenThrottleTabs>
        </div>
      </GlobalScreen>

      {isBoardView ? (
        <Card className="overflow-hidden mx-4">
          <PlanTasksBoard planId={plan.id} tasks={tasks} />
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

      return redirect(`/plans/${planId}`);
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
