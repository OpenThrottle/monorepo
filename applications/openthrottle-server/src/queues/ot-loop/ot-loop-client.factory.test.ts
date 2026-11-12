import { asMock } from '@openthrottle/nestjs-testing';
import {
  AppendPlanOutputDocument,
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
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  OtLoopExecuteGraphql,
  PlanOutputChunk,
  PlanOutputWriter,
} from './ot-loop.types.ts';
import { createOtLoopClient } from './ot-loop-client.factory.ts';

const PLAN_ID = 'plan-1';

interface Call {
  readonly document: unknown;
  readonly options: unknown;
  readonly variables: unknown;
}

describe('createOtLoopClient', () => {
  const calls: Call[] = [];
  const written: PlanOutputChunk[] = [];
  const output: PlanOutputWriter = {
    settled: async () => undefined,
    write: (chunk) => {
      written.push(chunk);
    },
  };
  const respond = vi.fn((document: unknown): unknown => {
    if (document === RalphClaimPlanMessagesDocument) {
      return {
        claimPlanMessages: {
          messages: [
            { body: 'use the helper', id: 'm1', kind: 'STEER' },
            { body: 'also add docs', id: 'm2', kind: 'QUEUE' },
          ],
        },
      };
    }

    if (document === RalphStartWorkSessionDocument) {
      return { startWorkSession: { id: 'session-1' } };
    }

    if (document === GetPlanDocument) {
      return { plan: { id: PLAN_ID, status: 'IN_PROGRESS' } };
    }

    if (document === GetTasksByPlanIdDocument) {
      return {
        tasksByPlanId: [
          {
            category: 'test',
            createdAt: '2026-11-09T00:00:00.000Z',
            description: 'd',
            id: 't1',
            planId: PLAN_ID,
            requirementsJson: '[]',
            sortOrder: 1,
            status: 'QUEUED',
            title: 'T',
          },
        ],
      };
    }

    return {};
  });
  const execute = async (
    document: unknown,
    variables?: unknown,
    options?: unknown,
  ): Promise<unknown> => {
    calls.push({ document, options, variables });

    return respond(document);
  };
  const buildClient = (
    workSessionId: string | null = 'run-session',
  ): ReturnType<typeof createOtLoopClient> => {
    return createOtLoopClient({
      executeGraphqlV2: asMock<OtLoopExecuteGraphql>(execute),
      externalRef: 'job-9',
      output,
      planId: PLAN_ID,
      planRunId: 'run-1',
      workSessionId,
    });
  };
  const callsTo = (document: unknown): Call[] => {
    return calls.filter((call) => call.document === document);
  };

  beforeEach(() => {
    calls.length = 0;
    written.length = 0;
  });

  it('claims the inbox for the run and task and returns the bodies in delivery order', async () => {
    const bodies = await buildClient().claimInbox({ taskId: 't1' });

    expect(bodies).toEqual(['use the helper', 'also add docs']);
    expect(callsTo(RalphClaimPlanMessagesDocument)[0]?.variables).toEqual({
      input: { planId: PLAN_ID, planRunId: 'run-1', taskId: 't1' },
    });
  });

  it('opens a per-task session declaring the model, then attaches the task as its subject', async () => {
    const id = await buildClient().startWorkSession({
      model: 'sonnet',
      planId: PLAN_ID,
      taskId: 't1',
    });

    expect(id).toBe('session-1');
    expect(callsTo(RalphStartWorkSessionDocument)[0]?.variables).toEqual({
      input: {
        externalRef: 'job-9',
        model: 'sonnet',
        planRunId: 'run-1',
        toolName: 'ot-loop',
      },
    });
    expect(
      callsTo(RalphAttachWorkSessionSubjectDocument)[0]?.variables,
    ).toEqual({
      input: { planId: PLAN_ID, sessionId: 'session-1', taskId: 't1' },
    });
  });

  it('ends exactly the session it is given', async () => {
    await buildClient().endWorkSession('session-1');

    expect(callsTo(RalphEndWorkSessionDocument)[0]?.variables).toEqual({
      input: { sessionId: 'session-1' },
    });
  });

  it('writes task and plan status with the run session header', async () => {
    const client = buildClient();

    await client.updateTask({
      status: 'COMPLETED',
      summary: 'done',
      taskId: 't1',
    });
    await client.updatePlanStatus({ planId: PLAN_ID, status: 'BLOCKED' });

    expect(callsTo(UpdateTaskDocument)[0]).toMatchObject({
      options: { headers: { 'X-OT-Session-Id': 'run-session' } },
      variables: { input: { id: 't1', status: 'COMPLETED', summary: 'done' } },
    });
    expect(callsTo(UpdatePlanDocument)[0]).toMatchObject({
      options: { headers: { 'X-OT-Session-Id': 'run-session' } },
      variables: { input: { id: PLAN_ID, status: 'BLOCKED' } },
    });
  });

  it('sends no session header and omits an absent summary when the run has no session', async () => {
    await buildClient(null).updateTask({
      status: 'PENDING',
      summary: undefined,
      taskId: 't1',
    });

    expect(callsTo(UpdateTaskDocument)[0]).toMatchObject({
      options: undefined,
      variables: { input: { id: 't1', status: 'PENDING' } },
    });
    expect(callsTo(UpdateTaskDocument)[0]?.variables).not.toHaveProperty(
      'input.summary',
    );
  });

  it('creates follow-ups as new tasks in one batch, dropping a null category', async () => {
    await buildClient().createFollowUps({
      followUps: [
        { category: 'test', description: 'd1', title: 'one' },
        { category: null, description: 'd2', title: 'two' },
      ],
      planId: PLAN_ID,
    });

    expect(callsTo(CreateTasksDocument)[0]?.variables).toEqual({
      input: {
        planId: PLAN_ID,
        tasks: [
          { category: 'test', description: 'd1', title: 'one' },
          { description: 'd2', title: 'two' },
        ],
      },
    });
  });

  it('reads the plan status and lists tasks as loop tasks', async () => {
    const client = buildClient();

    expect(await client.getPlanStatus(PLAN_ID)).toBe('IN_PROGRESS');
    expect(await client.listTasks(PLAN_ID)).toMatchObject([
      { id: 't1', requirements: [], status: 'QUEUED' },
    ]);
  });

  it('throws when the plan does not exist', async () => {
    respond.mockReturnValueOnce({ plan: null });

    await expect(buildClient().getPlanStatus(PLAN_ID)).rejects.toThrow(
      /not found/,
    );
  });

  it('narrates through the shared writer, tagged with the task', async () => {
    await buildClient().narrate({
      attempt: 2,
      message: 'task started',
      taskId: 't1',
    });

    expect(written).toEqual([
      {
        attempt: 2,
        kind: 'loop',
        taskId: 't1',
        text: '[ot-loop] task started\n',
      },
    ]);
    expect(callsTo(AppendPlanOutputDocument)).toHaveLength(0);
  });
});
