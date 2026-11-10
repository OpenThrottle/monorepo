import type {
  LoopClient,
  LoopFollowUp,
  LoopPlanStatus,
  LoopTaskStatus,
} from '@openthrottle/openthrottle-agentic-loop';
import {
  CreateTasksDocument,
  GetPlanDocument,
  GetTasksByPlanIdDocument,
  RalphAttachWorkSessionSubjectDocument,
  RalphClaimPlanMessagesDocument,
  RalphEndWorkSessionDocument,
  RalphStartWorkSessionDocument,
  UpdatePlanDocument,
  UpdateTaskDocument,
} from '@openthrottle/openthrottle-agentic-ralph';

import {
  OT_LOOP_NARRATION_PREFIX,
  OT_LOOP_TOOL_NAME,
} from './ot-loop.constants.ts';
import type { OtLoopClientOptions } from './ot-loop.types.ts';
import {
  buildSessionOptions,
  formatNarration,
  toLoopTask,
} from './ot-loop.utils.ts';

/**
 * @description The OT Loop `LoopClient` over the worker-scoped GraphQL executor Ralph uses, mirroring
 * its calls: the same `getTasksByPlanId`, `updateTask`, `updatePlan`, `createTasks` and
 * `appendPlanOutput` documents, plus work-session start/attach/end and the inbox claim. Status
 * writes carry the processor's run session in `X-OT-Session-Id` (as Ralph's do); the per-task
 * sessions opened here are separate rows and are the only ones this client ever ends.
 */
export const createOtLoopClient = (
  options: OtLoopClientOptions,
): LoopClient => {
  const { executeGraphqlV2, externalRef, output, planId, planRunId } = options;
  const sessionOptions = buildSessionOptions(options.workSessionId);

  const claimInbox: LoopClient['claimInbox'] = async ({ taskId }) => {
    const result = await executeGraphqlV2(RalphClaimPlanMessagesDocument, {
      input: {
        planId,
        taskId,
        ...(planRunId !== undefined ? { planRunId } : {}),
      },
    });

    return result.claimPlanMessages.messages.map((message) => message.body);
  };

  const createFollowUps = async (input: {
    readonly followUps: readonly LoopFollowUp[];
    readonly planId: string;
  }): Promise<void> => {
    await executeGraphqlV2(
      CreateTasksDocument,
      {
        input: {
          planId: input.planId,
          tasks: input.followUps.map((followUp) => ({
            ...(followUp.category !== null
              ? { category: followUp.category }
              : {}),
            description: followUp.description,
            title: followUp.title,
          })),
        },
      },
      sessionOptions,
    );
  };

  const startWorkSession: LoopClient['startWorkSession'] = async (input) => {
    const started = await executeGraphqlV2(RalphStartWorkSessionDocument, {
      input: {
        ...(externalRef !== undefined ? { externalRef } : {}),
        ...(input.model !== undefined ? { model: input.model } : {}),
        ...(planRunId !== undefined ? { planRunId } : {}),
        toolName: OT_LOOP_TOOL_NAME,
      },
    });
    const sessionId = started.startWorkSession.id;

    await executeGraphqlV2(RalphAttachWorkSessionSubjectDocument, {
      input: { planId: input.planId, sessionId, taskId: input.taskId },
    });

    return sessionId;
  };

  const updatePlanStatus = async (input: {
    readonly planId: string;
    readonly status: LoopPlanStatus;
  }): Promise<void> => {
    await executeGraphqlV2(
      UpdatePlanDocument,
      { input: { id: input.planId, status: input.status } },
      sessionOptions,
    );
  };

  const updateTask = async (input: {
    readonly status: LoopTaskStatus;
    readonly summary: string | undefined;
    readonly taskId: string;
  }): Promise<void> => {
    await executeGraphqlV2(
      UpdateTaskDocument,
      {
        input: {
          id: input.taskId,
          status: input.status,
          ...(input.summary !== undefined ? { summary: input.summary } : {}),
        },
      },
      sessionOptions,
    );
  };

  return {
    claimInbox,
    createFollowUps,
    endWorkSession: async (sessionId) => {
      await executeGraphqlV2(RalphEndWorkSessionDocument, {
        input: { sessionId },
      });
    },
    getPlanStatus: async (id) => {
      const result = await executeGraphqlV2(GetPlanDocument, { id });

      if (result.plan === null || result.plan === undefined) {
        throw new Error(`plan ${id} not found`);
      }

      return result.plan.status;
    },
    listTasks: async (id) => {
      const result = await executeGraphqlV2(GetTasksByPlanIdDocument, {
        input: { planId: id },
      });

      return result.tasksByPlanId.map(toLoopTask);
    },
    narrate: async ({ message, taskId }) => {
      output.write(taskId, formatNarration(OT_LOOP_NARRATION_PREFIX, message));
      await output.settled();
    },
    startWorkSession,
    updatePlanStatus,
    updateTask,
  };
};
