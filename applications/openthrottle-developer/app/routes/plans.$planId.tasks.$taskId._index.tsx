import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  GetPlanByIdDocument,
  GetTaskByIdDocument,
  PlanDetailAddHookDocument,
  PlanDetailDetachHookDocument,
  TaskDetailAddTaskTagDocument,
  TaskDetailPromoteToPlanDocument,
  TaskDetailRemoveTaskTagDocument,
  TaskLinkedArtifactsDocument,
  TaskOutputStreamChunksDocument,
  UpdateTaskDocument,
} from '~/__generated__/graphql';
import {
  AddHookInputSchema,
  DetachHookInputSchema,
} from '~/__generated__/schemas';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { PlanTaskNotFound } from '~/routing/plans/components/PlanTaskNotFound';
import { redirect } from 'react-router';
import {
  messageOrFallback,
  toErrorMessage,
} from '~/global/utils/utils.error-message';
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

  const plan =
    task?.planId != null
      ? ((
          await executeGraphqlWithAuth(args.request, GetPlanByIdDocument, {
            id: task.planId,
          })
        ).plan ?? null)
      : null;

  const linkedArtifacts =
    task != null
      ? ((
          await executeGraphqlWithAuth(
            args.request,
            TaskLinkedArtifactsDocument,
            { taskId },
          )
        ).workArtifactsByTask.artifacts ?? [])
      : [];

  // Task-scoped output (v1): fetch the plan's chunks; the Output tab filters
  // client-side by taskId (see useTaskOutputStream).
  const planOutputChunks =
    task?.planId != null
      ? ((
          await executeGraphqlWithAuth(
            args.request,
            TaskOutputStreamChunksDocument,
            { planId: task.planId },
          )
        ).planOutputStreamChunks ?? [])
      : [];

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
  const tag = formData.get('tag');

  if (intent === 'promoteTask') {
    try {
      const result = await executeGraphqlWithAuth(
        args.request,
        TaskDetailPromoteToPlanDocument,
        { input: { taskId } },
      );
      const promote = result.promoteTaskToPlan;
      if (promote == null || !promote.success) {
        return {
          promoteTaskError: messageOrFallback(
            promote?.error,
            'Failed to promote task.',
          ),
        };
      }
      return { promoteTask: promote };
    } catch (error) {
      return {
        promoteTaskError: toErrorMessage(error, 'Failed to promote task.'),
      };
    }
  }

  if (intent === 'setTaskStatus') {
    const status = formData.get('status');
    if (typeof status !== 'string' || status.trim() === '') {
      return { setTaskStatusError: 'Status is required.' };
    }
    try {
      const result = await executeGraphqlWithAuth(
        args.request,
        UpdateTaskDocument,
        { input: { id: taskId, status: status.trim() } },
      );
      if (!result.updateTask) {
        return { setTaskStatusError: 'Failed to update task status.' };
      }
      return { setTaskStatus: result.updateTask };
    } catch (error) {
      return {
        setTaskStatusError: toErrorMessage(
          error,
          'Failed to update task status.',
        ),
      };
    }
  }

  if (intent === 'addTaskTag' || intent === 'removeTaskTag') {
    if (typeof tag !== 'string' || tag.trim() === '') {
      return { taskTagError: 'Tag is required.' };
    }
    try {
      if (intent === 'addTaskTag') {
        await executeGraphqlWithAuth(
          args.request,
          TaskDetailAddTaskTagDocument,
          { input: { tag: tag.trim(), taskId } },
        );
      } else {
        await executeGraphqlWithAuth(
          args.request,
          TaskDetailRemoveTaskTagDocument,
          { input: { tag: tag.trim(), taskId } },
        );
      }
      return { taskTagUpdated: true };
    } catch (error) {
      return {
        taskTagError: toErrorMessage(error, 'Failed to update task tag.'),
      };
    }
  }

  if (intent === 'addHook') {
    const planId = args.params.planId;
    if (planId == null || planId === '') {
      return { addHookError: 'Missing plan id.' };
    }

    const optionalField = (key: string): string | undefined => {
      const value = formData.get(key);
      return typeof value === 'string' && value.trim() !== ''
        ? value.trim()
        : undefined;
    };

    try {
      const input = AddHookInputSchema().parse({
        anchorTaskId: taskId,
        planId,
        role: formData.get('role'),
        scope: optionalField('scope'),
        skillSlug: optionalField('skillSlug'),
        source: formData.get('source'),
        title: optionalField('title'),
      });

      const result = await executeGraphqlWithAuth(
        args.request,
        PlanDetailAddHookDocument,
        { input },
      );

      if (!result.addHook) {
        return { addHookError: 'Failed to add hook.' };
      }

      return { addHook: result.addHook };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { addHookError: message };
    }
  }

  if (intent === 'detachHook') {
    try {
      const input = DetachHookInputSchema().parse({
        hookTaskId: formData.get('hookTaskId'),
      });

      const result = await executeGraphqlWithAuth(
        args.request,
        PlanDetailDetachHookDocument,
        { input },
      );

      if (!result.detachHook) {
        return { detachHookError: 'Failed to remove hook.' };
      }

      return { detachHook: result.detachHook };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { detachHookError: message };
    }
  }

  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
