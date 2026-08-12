import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  PlanDetailAddHookDocument,
  TaskDetailAddTaskTagDocument,
  TaskDetailPromoteToPlanDocument,
  TaskDetailRemoveTaskTagDocument,
  UpdateTaskDocument,
} from '~/__generated__/graphql';
import { AddHookInputSchema } from '~/__generated__/schemas';
import {
  messageOrFallback,
  toErrorMessage,
} from '~/global/utils/utils.error-message';
import type { Route } from '@/app/routes/+types/plans.$planId.tasks.$taskId._index';

export const promoteTask = async (args: Route.ActionArgs, taskId: string) => {
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
};

export const setTaskStatus = async (
  args: Route.ActionArgs,
  taskId: string,
  formData: FormData,
) => {
  const status = formData.get('status');
  if (typeof status !== 'string' || status.trim() === '') {
    return { setTaskStatusError: 'Status is required.' };
  }
  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      UpdateTaskDocument,
      {
        input: { id: taskId, status: status.trim() },
      },
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
};

export const updateTaskTag = async (
  args: Route.ActionArgs,
  taskId: string,
  formData: FormData,
  add: boolean,
) => {
  const tag = formData.get('tag');
  if (typeof tag !== 'string' || tag.trim() === '') {
    return { taskTagError: 'Tag is required.' };
  }
  try {
    if (add) {
      await executeGraphqlWithAuth(args.request, TaskDetailAddTaskTagDocument, {
        input: { tag: tag.trim(), taskId },
      });
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
};

export const addTaskHook = async (
  args: Route.ActionArgs,
  taskId: string,
  formData: FormData,
) => {
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
};
