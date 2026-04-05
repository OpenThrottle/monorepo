import * as React from 'react';
import classnames from 'classnames';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { PuzzlePieceIcon } from '@phosphor-icons/react/dist/ssr/PuzzlePiece';
import { Link, redirect } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import {
  GetPlanByIdDocument,
  GetTaskByIdDocument,
} from '~/__generated__/graphql';
import { TaskDetails } from '~/routing/plans/components/TaskDetails';
import type { Route } from '@/app/routes/+types/plans.$planId.tasks.$taskId._index';

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
  const { plan, task } = loaderData;

  // Hooks

  // Setup
  const taskId = params.taskId ?? '';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (task == null) {
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
          <EmptyTitle>Task not found</EmptyTitle>
          <EmptyDescription>
            The task you are looking for does not exist.
          </EmptyDescription>
        </Empty>
      </main>
    );
  }

  const effectivePlanId = task.planId ?? '';

  return (
    <main className="p-4 md:p-8 lg:p-12 relative h-full max-w-7xl mx-auto w-full">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild={true}>
              <Link to="/plans" viewTransition={true}>
                Plans
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild={true}>
              <Link to={`/plans/${effectivePlanId}`} viewTransition={true}>
                {plan?.title ?? (
                  <OpenThrottleClipboard
                    className="cursor-pointer whitespace-nowrap"
                    label={effectivePlanId}
                    text={effectivePlanId}
                  />
                )}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              <OpenThrottleClipboard
                className="cursor-pointer whitespace-nowrap"
                label={taskId}
                text={taskId}
              />
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <TaskDetails planId={effectivePlanId} task={task} />
    </main>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
