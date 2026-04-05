import * as React from 'react';
import classnames from 'classnames';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { Link, redirect } from 'react-router';
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
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import {
  GetTaskByIdDocument,
  UpdateTaskDocument,
} from '~/__generated__/graphql';
import { TaskForm } from '~/routing/plans/components/TaskForm';
import type { Route } from '@/app/routes/+types/plans.$planId.tasks.$taskId.edit';

export const loader = async (args: Route.LoaderArgs) => {
  const { planId, taskId } = args.params;
  if (taskId == null || taskId === '') {
    return { task: null };
  }
  const result = await executeGraphqlWithAuth(
    args.request,
    GetTaskByIdDocument,
    { id: taskId },
  );
  const task = result.task ?? null;
  if (task?.planId != null && planId != null && task.planId !== planId) {
    return redirect(`/plans/${task.planId}/tasks/${taskId}/edit`);
  }
  return { task };
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const task = args.loaderData?.task;
  const title = task?.title
    ? `Edit ${task.title} | ${SITE_TITLE}`
    : `Edit task | ${SITE_TITLE}`;

  return [{ title }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params } = props;
  const { task } = loaderData;

  // Hooks

  // Setup
  const _taskId = params.taskId ?? '';
  const planId = task?.planId ?? params.planId ?? '';

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

  return (
    <>
      <main className="p-4 md:p-8 relative h-full max-w-7xl mx-auto w-full">
        <Breadcrumb className="mb-4 md:mb-8">
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
                <Link to={`/plans/${planId}`} viewTransition={true}>
                  {planId}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit Task</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <TaskForm actionData={actionData} planId={planId} task={task} />
      </main>
    </>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { planId, taskId } = args.params;
  if (taskId == null || taskId === '') {
    return { error: 'Task id is required.' };
  }

  const formData = await args.request.formData();
  const id = formData.get('id');
  const title = formData.get('title');

  if (typeof id !== 'string' || id.trim() === '') {
    return { error: 'Task id is required.' };
  }

  if (id !== taskId) {
    return { error: 'Task id does not match.' };
  }

  if (typeof title !== 'string' || !title.trim()) {
    return { error: 'Title is required.' };
  }

  const assignee = formData.get('assignee');
  const category = formData.get('category');
  const description = formData.get('description');
  const requirements = formData.get('requirements');
  const status = formData.get('status');
  const summary = formData.get('summary');

  const input = {
    id: taskId,
    title: title.trim(),
    ...(typeof assignee === 'string' && { assignee: assignee.trim() }),
    ...(typeof category === 'string' && { category: category.trim() }),
    ...(typeof description === 'string' && { description: description.trim() }),
    ...(typeof requirements === 'string' && {
      requirements: requirements.trim(),
    }),
    ...(typeof status === 'string' &&
      status.trim() && { status: status.trim() }),
    ...(typeof summary === 'string' && { summary: summary.trim() }),
  };

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      UpdateTaskDocument,
      { input },
    );

    if (!result.updateTask?.id) {
      return { error: 'Failed to update task.' };
    }

    const effectivePlanId = planId ?? result.updateTask.planId ?? '';

    return redirect(`/plans/${effectivePlanId}/tasks/${result.updateTask.id}`);
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : 'Failed to update task.';

    return { error: message };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  // throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
