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
  TaskDetailAddTaskTagDocument,
  TaskDetailRemoveTaskTagDocument,
  TaskLinkedArtifactsDocument,
} from '~/__generated__/graphql';
import { LinkedArtifactsPanel } from '~/routing/plans/components/LinkedArtifactsPanel';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { Badge } from '@openthrottle/react-router-shadcn';
import { ListOrderedIcon } from 'lucide-react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { parseTaskStatusColor } from '~/routing/plans/utils/parsers';
import { PlanTagChips } from '~/routing/plans/components/PlanTagChips';
import { PlanTaskNotFound } from '~/routing/plans/components/PlanTaskNotFound';
import { redirect, useFetcher } from 'react-router';
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
    return { linkedArtifacts: [], plan: null, tagVocabulary: [], task: null };
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

  return { linkedArtifacts, plan, tagVocabulary, task };
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
  const { linkedArtifacts, tagVocabulary, task } = loaderData;

  // Hooks
  const tagFetcher = useFetcher();

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
        <div className="text-muted-foreground line-clamp-3 text-sm">
          <Badge color={color} size="xs">
            {task.status}
          </Badge>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-muted-foreground text-xs font-medium uppercase">
          Tags
        </h2>
        <PlanTagChips
          onAddTag={(tag) =>
            tagFetcher.submit({ intent: 'addTaskTag', tag }, { method: 'post' })
          }
          onRemoveTag={(tag) =>
            tagFetcher.submit(
              { intent: 'removeTaskTag', tag },
              { method: 'post' },
            )
          }
          pending={tagFetcher.state !== 'idle'}
          tags={task.tags}
          vocabulary={tagVocabulary}
        />
      </div>
      <TaskDetails planId={effectivePlanId} task={task} />
      <LinkedArtifactsPanel artifacts={linkedArtifacts} />
    </GlobalScreen>
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
      const message = error instanceof Error ? error.message : String(error);
      return { taskTagError: message };
    }
  }

  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
