import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  GetPlanByIdDocument,
  GetTaskByIdDocument,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { Badge } from '@openthrottle/react-router-shadcn';
import { ListOrderedIcon } from 'lucide-react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { parseTaskStatusColor } from '~/routing/plans/utils/parsers';
import { PlanTaskNotFound } from '~/routing/plans/components/PlanTaskNotFound';
import { redirect } from 'react-router';
import { SITE_TITLE } from '~/global/config/settings';
import { TaskDetails } from '~/routing/plans/components/TaskDetails';
import type { Route } from '@/app/routes/+types/plans.$planId.tasks.$taskId._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => (
    <OpenThrottleClipboard
      className="cursor-pointer whitespace-nowrap"
      label={match.loaderData?.task?.id ?? ''}
      text={match.loaderData?.task?.id ?? ''}
    />
  ),
  links: (match) => {
    const title = match.loaderData?.plan?.title;
    const id = match.loaderData?.plan?.id ?? 'not-found';
    const planTitle = title ? `${title.slice(0, 30)} …` : 'Not Found';

    return [
      { children: 'Plans', to: '/plans' },
      { children: planTitle, to: `/plans/${id}` },
    ];
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  const { planId, taskId } = args.params;

  if (taskId == null || taskId === '') {
    return { plan: null, task: null };
  }

  const taskResult = await executeGraphqlWithAuth(
    args.request,
    GetTaskByIdDocument,
    { id: taskId },
  );

  const task = taskResult.task ?? null;

  if (task?.planId != null && planId != null && task.planId !== planId) {
    return redirect(`/plans/${task.planId}/tasks/${taskId}`);
  }

  const plan =
    task?.planId != null
      ? ((
          await executeGraphqlWithAuth(args.request, GetPlanByIdDocument, {
            id: task.planId,
          })
        ).plan ?? null)
      : null;

  return { plan, task };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const task = args.loaderData?.task;
  const title = task?.title
    ? `${task.title} | Task | ${SITE_TITLE}`
    : `Task Details | ${SITE_TITLE}`;

  return [{ title }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params } = props;
  const { task } = loaderData;

  // Hooks

  // Setup
  const _taskId = params.taskId ?? '';
  const effectivePlanId = task != null ? (task.planId ?? '') : '';
  const color = parseTaskStatusColor(task?.status ?? '');

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (task == null) {
    return (
      <GlobalScreen>
        <PlanTaskNotFound />
      </GlobalScreen>
    );
  }

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          icon={ListOrderedIcon}
          title={`Task: ${task.title}`}
        />
        <div className="text-sm text-muted-foreground line-clamp-3">
          <Badge color={color} size="xs">
            {task.status}
          </Badge>
        </div>
      </div>
      <TaskDetails planId={effectivePlanId} task={task} />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
