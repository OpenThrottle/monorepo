import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  GetPlanByIdDocument,
  GetTaskByIdDocument,
  TaskLinkedArtifactsDocument,
  TaskOutputStreamChunksDocument,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { PlanTaskNotFound } from '~/routing/plans/components/PlanTaskNotFound';
import { redirect } from 'react-router';
import { detachHook } from '~/routing/plans/actions/planId';
import {
  addTaskHook,
  promoteTask,
  setTaskStatus,
  updateTaskTag,
} from '~/routing/plans/actions/taskId';
import { SITE_TITLE } from '~/global/config/settings';
import { TaskDetailRoute } from '~/routing/plans/components/TaskDetailRoute';
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
    const planId = `${id.split('-').shift()} …`;
    const _planTitle = title ? `${title.slice(0, 30)} …` : 'Not Found';

    return [
      { children: 'Plans', to: '/plans' },
      { children: planId, to: `/plans/${id}` },
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

  /*
    The plan, the linked artifacts and the output chunks each depend only on the
    task we just fetched — never on each other — so they issue together instead
    of stacking three more round-trips behind the first. Task-scoped output (v1)
    fetches the plan's chunks; the Output tab filters client-side by taskId (see
    useTaskOutputStream).
  */
  const [planResult, linkedArtifactsResult, planOutputChunksResult] =
    await Promise.all([
      task?.planId != null
        ? executeGraphqlWithAuth(args.request, GetPlanByIdDocument, {
            id: task.planId,
          })
        : null,
      task != null
        ? executeGraphqlWithAuth(args.request, TaskLinkedArtifactsDocument, {
            taskId,
          })
        : null,
      task?.planId != null
        ? executeGraphqlWithAuth(args.request, TaskOutputStreamChunksDocument, {
            planId: task.planId,
          })
        : null,
    ]);

  const plan = planResult?.plan ?? null;
  const linkedArtifacts =
    linkedArtifactsResult?.workArtifactsByTask.artifacts ?? [];
  const planOutputChunks = planOutputChunksResult?.planOutputStreamChunks ?? [];

  return { linkedArtifacts, plan, planOutputChunks, tagVocabulary, task };
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
