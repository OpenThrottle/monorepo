import * as React from 'react';
import classnames from 'classnames';
import {
  Card,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { ColumnsIcon } from '@phosphor-icons/react/dist/ssr/Columns';
import { PuzzlePieceIcon } from '@phosphor-icons/react/dist/ssr/PuzzlePiece';
import { TableIcon } from '@phosphor-icons/react/dist/ssr/Table';
import {
  Outlet,
  redirect,
  useRevalidator,
  useSearchParams,
} from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  OpenThrottleBreadcrumbs,
  OpenThrottleClipboard,
} from '@openthrottle/react-router-ui';
import type {
  PlanStatusChangedPayload,
  TaskStatusChangedPayload,
} from '@openthrottle/openthrottle-notifications';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { useNotificationsSocket } from '@openthrottle/react-router-notifications';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { RalphPlanRunTuningInput } from '~/__generated__/graphql';
import { RalphPlanRunTuningInputSchema } from '~/__generated__/schemas';
import {
  GetPlanByIdDocument,
  GetTasksByPlanIdDocument,
  PlanDetailCancelPlanRunDocument,
  PlanDetailEnqueuePlanRunDocument,
  PlanDetailSetPlanStatusDocument,
  PlanDetailUpdateTaskDocument,
} from '~/__generated__/graphql';
import { PlanDetails } from '~/routing/plans/components/PlanDetails';
import { PlanTasksBoard } from '~/routing/plans/components/PlanTasksBoard';
import { PlanTasksTable } from '~/routing/plans/components/PlanTasksTable';
import type { Route } from '@/app/routes/+types/plans.$planId._index';

const PLAN_TASKS_VIEW_STORAGE_KEY = 'openthrottle-developer.planTasksView';

/**
 * @description Parses `view` query/localStorage values for the plan tasks table vs board switcher.
 */
const parsePlanTasksView = (raw: string | null): 'board' | 'table' | null => {
  if (raw === 'board' || raw === 'table') return raw;
  return null;
};

export const loader = async (args: Route.LoaderArgs) => {
  const { planId } = args.params;

  const [planResult, tasksResult] = await Promise.all([
    executeGraphqlWithAuth(args.request, GetPlanByIdDocument, { id: planId }),
    executeGraphqlWithAuth(args.request, GetTasksByPlanIdDocument, {
      input: { planId },
    }),
  ]);

  const plan = planResult.plan ?? null;
  const tasks = tasksResult.tasksByPlanId ?? [];

  return { plan, tasks };
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
  const { plan, tasks } = loaderData;

  // Hooks
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  const socketContext = useNotificationsSocket();

  // Setup
  const planTasksView = parsePlanTasksView(searchParams.get('view')) ?? 'table';
  const isBoardView = planTasksView === 'board';
  const planId = params.planId ?? '';

  // Handlers
  const onChangeView = (value: string): void => {
    if (value !== 'table' && value !== 'board') return;
    try {
      localStorage.setItem(PLAN_TASKS_VIEW_STORAGE_KEY, value);
    } catch {
      // ignore quota / private mode
    }

    const next = new URLSearchParams(searchParams);
    if (value === 'table') {
      next.delete('view');
    } else {
      next.set('view', value);
    }

    setSearchParams(next, { replace: true });
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
        localStorage.getItem(PLAN_TASKS_VIEW_STORAGE_KEY),
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
      localStorage.setItem(PLAN_TASKS_VIEW_STORAGE_KEY, fromUrl);
    } catch {
      // ignore
    }
  }, [searchParams]);

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

    const { PLAN_STATUS_CHANGED } = NOTIFICATION_EVENT_NAMES;
    const { TASK_STATUS_CHANGED } = NOTIFICATION_EVENT_NAMES;

    socket.on(PLAN_STATUS_CHANGED, onPlanStatusChanged);
    socket.on(TASK_STATUS_CHANGED, onTaskStatusChanged);

    return () => {
      socket.off(PLAN_STATUS_CHANGED, onPlanStatusChanged);
      socket.off(TASK_STATUS_CHANGED, onTaskStatusChanged);
    };
  }, [planId, revalidator, socketContext?.socket]);

  // 🔌 Short Circuit

  // When planId is "new", render outlet so plans.$planId.create can show the create form.
  if (!plan && planId === 'new') {
    return <Outlet />;
  }

  // 🔌 Short Circuit
  if (!plan) {
    return (
      <main
        className={classnames(
          'h-full max-w-7xl w-full mx-auto',
          'flex flex-1 items-center justify-center',
        )}
      >
        <Empty>
          <EmptyMedia variant="icon">
            <PuzzlePieceIcon size={48} />
          </EmptyMedia>
          <EmptyTitle>Plan not found</EmptyTitle>
          <EmptyDescription>
            The plan you are looking for does not exist.
          </EmptyDescription>
        </Empty>
      </main>
    );
  }

  return (
    <>
      <main className="p-4 md:p-8 relative h-full max-w-7xl mx-auto w-full">
        <OpenThrottleBreadcrumbs
          children={
            <OpenThrottleClipboard
              className="cursor-pointer whitespace-nowrap"
              label={plan.id}
              text={plan.id}
            />
          }
          className="mb-4"
          links={[{ children: 'Plans', to: '/plans' }]}
        />

        <PlanDetails plan={plan} />

        {tasks.length === 0 ? (
          <>
            <h2 className="text-lg font-semibold mb-3">Tasks</h2>
            <Empty>
              <EmptyTitle>No tasks</EmptyTitle>
              <EmptyDescription>This plan has no tasks yet.</EmptyDescription>
            </Empty>
          </>
        ) : (
          <>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">Tasks</h2>
              <ToggleGroup
                aria-label="Choose how to display plan tasks"
                className="shrink-0"
                onValueChange={onChangeView}
                size="sm"
                type="single"
                value={planTasksView}
                variant="outline"
              >
                <ToggleGroupItem
                  aria-label="Table view"
                  className="gap-1.5 px-2.5"
                  value="table"
                >
                  <TableIcon aria-hidden={true} className="size-4" />
                  Table
                </ToggleGroupItem>
                <ToggleGroupItem
                  aria-label="Board view"
                  className="gap-1.5 px-2.5"
                  value="board"
                >
                  <ColumnsIcon aria-hidden={true} className="size-4" />
                  Board
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {!isBoardView ? (
              <Card>
                <PlanTasksTable tasks={tasks} />
              </Card>
            ) : null}
          </>
        )}

        <Outlet />
      </main>

      {isBoardView ? (
        <Card className="overflow-hidden p-4 mx-4">
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
      const result = await executeGraphqlWithAuth(
        args.request,
        PlanDetailCancelPlanRunDocument,
        { input: { planId } },
      );

      if (!result.cancelPlanRun) {
        return { cancelPlanRunError: 'Failed to cancel plan run.' };
      }

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

    if (!status || status.trim() === '') {
      return { setPlanStatusError: 'Status is required.' };
    }

    try {
      const result = await executeGraphqlWithAuth(
        args.request,
        PlanDetailSetPlanStatusDocument,
        { input: { planId, status: status.trim() } },
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
    const taskIdRaw = formData.get('taskId');
    const statusRaw = formData.get('status');
    const planIdRaw = formData.get('planId');
    const taskId = typeof taskIdRaw === 'string' ? taskIdRaw : '';
    const status = typeof statusRaw === 'string' ? statusRaw : '';
    const bodyPlanId = typeof planIdRaw === 'string' ? planIdRaw : '';

    if (!taskId.trim() || !status.trim()) {
      return { updateTaskError: 'Task id and status are required.' };
    }

    if (bodyPlanId !== planId) {
      return { updateTaskError: 'Plan id mismatch.' };
    }

    try {
      const result = await executeGraphqlWithAuth(
        args.request,
        PlanDetailUpdateTaskDocument,
        {
          input: {
            id: taskId.trim(),
            planId,
            status: status.trim(),
          },
        },
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
          return { runPlanError: 'Invalid workflow run options payload.' };
        }

        ralph = tuningResult.data;
      } catch {
        return { runPlanError: 'Invalid workflow run options payload.' };
      }
    }

    try {
      const result = await executeGraphqlWithAuth(
        args.request,
        PlanDetailEnqueuePlanRunDocument,
        {
          input: {
            planId,
            priority,
            ...(ralph !== undefined ? { ralph } : {}),
          },
        },
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
