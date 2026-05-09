import * as React from 'react';
import {
  Card,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalCollapsible,
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import { redirect, useRevalidator, useSearchParams } from 'react-router';
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
  LucideIcon,
  NotebookTextIcon,
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
  type WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import {
  PlanDetailEnqueuePlanRunDocument,
  PlanDetailIndexLoaderDocument,
  PlanDetailSetPlanStatusDocument,
  PlanDetailUpdateTaskDocument,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
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
  type PlanDetailTab,
} from '~/routing/plans/utils/parsers';
import { PlanNotFound } from '~/routing/plans/components/PlanNotFound';
import { PlanTabConfiguration } from '~/routing/plans/components/PlanTabConfiguration';
import { PlanTabDetails } from '~/routing/plans/components/PlanTabDetails';
import { PlanTabRequirements } from '~/routing/plans/components/PlanTabRequirements';
import { PlanTabsMetadata } from '~/routing/plans/components/PlanTabsMetadata';
import { PlanTabTasks } from '~/routing/plans/components/PlanTabTasks';
import { PlanTasksBoard } from '~/routing/plans/components/PlanTasksBoard';
import { SITE_TITLE } from '~/global/config/settings';
import type { RalphPlanRunTuningInput } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/plans.$planId._index';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
// import { formatPlanDate } from '~/routing/plans/utils/formatters';
// import { PlanDetails } from '~/routing/plans/components/PlanDetails';
// import { PlanLoggerOutput } from '~/routing/plans/components/PlanLoggerOutput';
// import { PlanTasksTable } from '~/routing/plans/components/PlanTasksTable';
// import { PlanWorkflowConfig } from '~/routing/plans/components/PlanWorkflowConfig';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => (
    <OpenThrottleClipboard
      className="cursor-pointer whitespace-nowrap"
      label={match?.loaderData?.plan?.id ?? ''}
      text={match?.loaderData?.plan?.id ?? ''}
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
  const { plan, recentPlanRuns, tasks } = loaderData;

  // Hooks
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  const socketContext = useNotificationsSocket();
  const [workflowTimeout, setWorkflowTimeout] = React.useState('');
  const [workingDirectory, setWorkingDirectory] = React.useState('');
  const [workflowInput, setWorkflowInput] =
    React.useState<WorkflowRalphRunOptionsInput>(() =>
      getDefaultWorkflowRalphRunOptionsInput({ planId: plan?.id }),
    );

  // Setup

  const { PLAN_STATUS_CHANGED } = NOTIFICATION_EVENT_NAMES;
  const { TASK_STATUS_CHANGED } = NOTIFICATION_EVENT_NAMES;
  const planTasksView = parsePlanTasksView(searchParams.get('view')) ?? 'table';
  const isBoardView = planTasksView === 'board';
  const planDetailTab: PlanDetailTab =
    parsePlanDetailTab(searchParams.get(PLANS_DETAIL_TAB_SEARCH_PARAM)) ??
    'overview';

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

  // Handlers
  const onPlanDetailTabChange = (next: string): void => {
    const parsed = parsePlanDetailTab(next);
    const tab: PlanDetailTab = parsed ?? 'overview';
    const nextParams = new URLSearchParams(searchParams);

    if (tab === 'overview') {
      nextParams.delete(PLANS_DETAIL_TAB_SEARCH_PARAM);
    } else {
      nextParams.set(PLANS_DETAIL_TAB_SEARCH_PARAM, tab);
    }

    setSearchParams(nextParams, {
      preventScrollReset: true,
      replace: true,
    });
  };

  const onResetToDefaults = (): void => {
    setWorkflowInput(
      getDefaultWorkflowRalphRunOptionsInput({ planId: plan?.id }),
    );

    setWorkingDirectory('');
    setWorkflowTimeout('');
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
    setWorkflowInput(
      getDefaultWorkflowRalphRunOptionsInput({ planId: plan?.id }),
    );
    setWorkingDirectory('');
    setWorkflowTimeout('');
  }, [plan?.id]);

  // Subscribe to plan/task status-change events so we revalidate when status
  // is updated via openthrottle-mcp or API, keeping plan and tasks in sync.
  // Manual QA: see `PlanTasksBoard.test.tsx` file comment (socket + board/table).
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
    return <PlanNotFound />;
  }

  interface Item {
    content: React.ReactNode;
    icon: LucideIcon;
    title: string;
  }

  const items: Item[] = [
    // {
    //   content: (
    //     <PlanWorkflowConfig
    //       iterationTimeoutText={workflowTimeout}
    //       onCollapse={() => onToggleExpanded(false)}
    //       onIterationTimeoutTextChange={setWorkflowTimeout}
    //       onResetToDefaults={onResetToDefaults}
    //       onValueChange={setWorkflowInput}
    //       onWorkingDirectoryChange={setWorkingDirectory}
    //       planId={plan.id}
    //       value={workflowInput}
    //       workingDirectory={workingDirectory}
    //     />
    //   ),
    //   icon: CogIcon,
    //   title: 'Configuration',
    // },
    // {
    //   content: <PlanLoggerOutput chunks={planOutputChunks} />,
    //   icon: TerminalSquareIcon,
    //   title: 'Output',
    // },
  ];

  return (
    <>
      <GlobalScreen>
        <div>
          <GlobalHeading
            className="mb-4"
            icon={NotebookTextIcon}
            title={plan.title ?? 'Untitled'}
          >
            <div></div>
          </GlobalHeading>
          <div className="text-sm text-muted-foreground line-clamp-3">
            <PlanStatusBadge status={status} /> &bull; Last updated:{' '}
            {/* {formatPlanDate(plan.updatedAt)} */}
            {/* {plan.description ?? 'No description'} */}
          </div>
        </div>

        <Tabs
          className="w-full"
          onValueChange={onPlanDetailTabChange}
          value={planDetailTab}
        >
          <TabsList className="mb-8 gap-4 w-full" variant="line">
            <TabsTrigger className="flex-0 cursor-pointer" value="overview">
              <BoltIcon />
              Details
            </TabsTrigger>
            <TabsTrigger className="flex-0 cursor-pointer" value="tasks">
              <LayoutListIcon />
              Tasks
            </TabsTrigger>
            <TabsTrigger className="flex-0 cursor-pointer" value="requirements">
              <BadgeCheckIcon />
              Requirements
            </TabsTrigger>
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
          </TabsList>

          <PlanTabDetails
            plan={plan}
            ralphTuningJson={ralphTuningJson}
            recentPlanRuns={recentPlanRuns}
            workflowInput={workflowInput}
            workflowTimeout={workflowTimeout}
            workingDirectory={workingDirectory}
          />
          <PlanTabTasks tasks={tasks} />
          <PlanTabConfiguration
            iterationTimeoutText={workflowTimeout}
            onCollapse={() => onToggleExpanded(false)}
            onIterationTimeoutTextChange={setWorkflowTimeout}
            onResetToDefaults={onResetToDefaults}
            onValueChange={setWorkflowInput}
            onWorkingDirectoryChange={setWorkingDirectory}
            planId={plan.id}
            value={workflowInput}
            workingDirectory={workingDirectory}
          />
          <PlanTabRequirements />
          <PlanTabsMetadata plan={plan} />
        </Tabs>

        {items.map((item) => {
          return (
            <GlobalCollapsible
              icon={item.icon}
              key={item.title}
              open={true}
              title={item.title}
            >
              {item.content}
            </GlobalCollapsible>
          );
        })}
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
    try {
      const result = await cancelPlanRun(args, planId);

      return { cancelPlanRun: result.cancelPlanRun };
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);

      return { cancelPlanRunError: message };
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

    try {
      const input = EnqueuePlanRunInputSchema().parse({
        planId,
        priority,
        ...(ralph !== undefined ? { ralph } : {}),
        ...(workingDirectory !== undefined ? { workingDirectory } : {}),
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
