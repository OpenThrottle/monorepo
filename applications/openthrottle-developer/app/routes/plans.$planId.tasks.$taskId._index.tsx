import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';
import { redirect } from 'react-router';

import type { Route } from '@/app/routes/+types/plans.$planId.tasks.$taskId._index';
import { GetTaskByIdDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { detachHook } from '~/routing/plans/actions/planId';
import {
  addTaskHook,
  promoteTask,
  setTaskStatus,
  updateTaskTag,
} from '~/routing/plans/actions/taskId';
import { PlanTaskNotFound } from '~/routing/plans/components/PlanTaskNotFound';
import { TaskDetailRoute } from '~/routing/plans/components/TaskDetailRoute';
import { loadTaskDetailRelations } from '~/routing/plans/utils/loadTaskDetailRelations';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => (
    <OpenThrottleClipboard
      className="block max-w-full cursor-pointer truncate whitespace-nowrap sm:max-w-64"
      label={match.loaderData?.task?.title ?? match.params.taskId}
      text={match.loaderData?.task?.id ?? ''}
    />
  ),
  links: (match) => {
    const planId = match.loaderData?.plan?.id ?? match.params.planId;
    const planTitle = match.loaderData?.plan?.title ?? 'Plan';

    return [
      { children: 'Plans', to: '/plans' },
      {
        children: planTitle,
        className: 'inline-block max-w-48 truncate align-bottom',
        to: `/plans/${planId ?? 'not-found'}`,
      },
    ];
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  const { planId, taskId } = args.params;

  if (taskId == null || taskId === '') {
    return {
      linkedArtifacts: [],
      plan: null,
      planOutputChunks: [],
      tagVocabulary: [],
      task: null,
      trajectories: [],
    };
  }

  const taskResult = await executeGraphqlWithAuth(
    args.request,
    GetTaskByIdDocument,
    { id: taskId },
  );

  const task = taskResult.task ?? null;
  const tagVocabulary = taskResult.skillTagVocabulary.tags ?? [];

  if (task?.planId != null && planId != null && task.planId !== planId) {
    return redirect(`/plans/${task.planId}/tasks/${taskId}`);
  }

  const relations = await loadTaskDetailRelations(args.request, task, taskId);

  return { ...relations, tagVocabulary, task };
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
  const { loaderData, params } = props;
  const { task } = loaderData;

  // Hooks

  // Setup

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
    <TaskDetailRoute loaderData={loaderData} params={params} task={task} />
  );
}

export const action = async (args: Route.ActionArgs) => {
  const taskId = args.params.taskId;
  if (taskId == null || taskId === '') {
    return { taskTagError: 'Missing task id.' };
  }

  const formData = await args.request.formData();
  const intent = formData.get('intent');

  switch (intent) {
    case 'addHook':
      return addTaskHook(args, taskId, formData);
    case 'addTaskTag':
      return updateTaskTag(args, taskId, formData, true);
    case 'detachHook':
      return detachHook(args.request, formData);
    case 'promoteTask':
      return promoteTask(args, taskId);
    case 'removeTaskTag':
      return updateTaskTag(args, taskId, formData, false);
    case 'setTaskStatus':
      return setTaskStatus(args, taskId, formData);
    default:
      return {};
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
