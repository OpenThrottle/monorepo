// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { action } from '../plans.$planId.tasks.$taskId._index';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const invokeAction = async (
  fields: Record<string, string>,
): Promise<unknown> => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  const request = new Request('http://localhost/plans/plan-1/tasks/task-1', {
    body: formData,
    method: 'POST',
  });
  return action({
    context: createTestRouterContext(),
    params: { planId: 'plan-1', taskId: 'task-1' },
    pattern: '/plans/:planId/tasks/:taskId',
    request,
    url: new URL(request.url),
  });
};

describe('routes/plans.$planId.tasks.$taskId._index.tsx action', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  describe('promoteTask intent', () => {
    test('returns the accepted result on success', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        promoteTaskToPlan: { error: null, jobId: 'job-1', success: true },
      });

      const result = await invokeAction({ intent: 'promoteTask' });

      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { input: { taskId: 'task-1' } },
      );
      expect(result).toEqual({
        promoteTask: { error: null, jobId: 'job-1', success: true },
      });
    });

    test('maps a validation failure (success false) to promoteTaskError', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        promoteTaskToPlan: {
          error: 'Task has already been promoted to a plan.',
          jobId: null,
          success: false,
        },
      });

      const result = await invokeAction({ intent: 'promoteTask' });

      expect(result).toEqual({
        promoteTaskError: 'Task has already been promoted to a plan.',
      });
    });

    test('maps a thrown GraphQL error to promoteTaskError', async () => {
      mockExecuteGraphqlWithAuth.mockRejectedValue(new Error('network down'));

      const result = await invokeAction({ intent: 'promoteTask' });

      expect(result).toEqual({ promoteTaskError: 'network down' });
    });

    test('falls back when the failure carries an empty error string', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        promoteTaskToPlan: { error: '', jobId: null, success: false },
      });

      const result = await invokeAction({ intent: 'promoteTask' });

      // An empty error must never reach the toast (the boundary guard would
      // suppress it and show nothing) — a fallback is returned instead.
      expect(result).toEqual({ promoteTaskError: 'Failed to promote task.' });
    });

    test('falls back when the failure carries a whitespace error string', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        promoteTaskToPlan: { error: '   ', jobId: null, success: false },
      });

      const result = await invokeAction({ intent: 'promoteTask' });

      expect(result).toEqual({ promoteTaskError: 'Failed to promote task.' });
    });

    test('falls back when the thrown error has an empty message', async () => {
      mockExecuteGraphqlWithAuth.mockRejectedValue(new Error(''));

      const result = await invokeAction({ intent: 'promoteTask' });

      expect(result).toEqual({ promoteTaskError: 'Failed to promote task.' });
    });
  });

  describe('setTaskStatus intent', () => {
    test('updates status and returns the task on success', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        updateTask: { id: 'task-1', status: 'COMPLETED' },
      });

      const result = await invokeAction({
        intent: 'setTaskStatus',
        status: 'COMPLETED',
      });

      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { input: { id: 'task-1', status: 'COMPLETED' } },
      );
      expect(result).toEqual({
        setTaskStatus: { id: 'task-1', status: 'COMPLETED' },
      });
    });

    test('returns an error when status is missing', async () => {
      const result = await invokeAction({ intent: 'setTaskStatus' });

      expect(result).toEqual({ setTaskStatusError: 'Status is required.' });
      expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('maps a thrown error to setTaskStatusError', async () => {
      mockExecuteGraphqlWithAuth.mockRejectedValue(new Error('boom'));

      const result = await invokeAction({
        intent: 'setTaskStatus',
        status: 'COMPLETED',
      });

      expect(result).toEqual({ setTaskStatusError: 'boom' });
    });

    test('falls back when the thrown error has an empty message', async () => {
      mockExecuteGraphqlWithAuth.mockRejectedValue(new Error(''));

      const result = await invokeAction({
        intent: 'setTaskStatus',
        status: 'COMPLETED',
      });

      expect(result).toEqual({
        setTaskStatusError: 'Failed to update task status.',
      });
    });
  });
});
