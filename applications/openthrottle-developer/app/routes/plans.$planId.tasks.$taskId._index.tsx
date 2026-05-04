import * as React from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { PuzzlePieceIcon } from '@phosphor-icons/react/dist/ssr/PuzzlePiece';
import { redirect } from 'react-router';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import {
  GetPlanByIdDocument,
  GetTaskByIdDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { TaskDetails } from '~/routing/plans/components/TaskDetails';
import type { Route } from '@/app/routes/+types/plans.$planId.tasks.$taskId._index';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (match) => (
    <OpenThrottleClipboard
      className="cursor-pointer whitespace-nowrap"
      label={match.data.task.id}
      text={match.data.task.id}
    />
  ),
  links: (match) => [
    { children: 'All Plans', to: '/plans' },
    { children: match.data.plan.title, to: `/plans/${match.data.plan.id}` },
  ],
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

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (task == null) {
    return (
      <GlobalScreen>
        <Empty>
          <EmptyMedia variant="icon">
            <PuzzlePieceIcon size={48} />
          </EmptyMedia>
          <EmptyTitle>Task not found</EmptyTitle>
          <EmptyDescription>
            The task you are looking for does not exist.
          </EmptyDescription>
        </Empty>
      </GlobalScreen>
    );
  }

  const effectivePlanId = task.planId ?? '';

  return (
    <GlobalScreen>
      <TaskDetails planId={effectivePlanId} task={task} />
    </GlobalScreen>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
