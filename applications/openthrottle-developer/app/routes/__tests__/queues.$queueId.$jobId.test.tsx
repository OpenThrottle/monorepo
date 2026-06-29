import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { action, loader } from '../queues.$queueId.$jobId';
import type { Route } from '@/app/routes/+types/queues.$queueId.$jobId';
import { createTestRouterContext } from '~/testing/router-context';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const mockJob = {
  data: '{"planId":"p1"}',
  failedReason: null,
  finishedOn: null,
  id: 'job-1',
  name: 'run-plan',
  processedOn: null,
  progress: null,
  returnvalue: null,
  state: 'waiting',
  taskRunMetrics: null,
  timestamp: 1,
} as const;

const routeParams = {
  jobId: 'job-1',
  queueId: 'Plans',
} as const;

const actionArgs = (formData: FormData): Route.ActionArgs => ({
  context: createTestRouterContext(),
  params: routeParams,
  pattern: '/queues/Plans/job-1',
  request: new Request('http://localhost/queues/Plans/job-1', {
    body: formData,
    method: 'POST',
  }),
  url: new URL('http://localhost/queues/Plans/job-1'),
});

describe('routes/queues.$queueId.$jobId.tsx', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe('loader', () => {
    test('fetches job and decodes job id from the path', async () => {
      mockExecute.mockResolvedValueOnce({ job: mockJob });

      const args: Route.LoaderArgs = {
        context: createTestRouterContext(),
        params: {
          jobId: encodeURIComponent('ralph-orch:abc'),
          queueId: 'Plans',
        },
        pattern: '/queues/Plans/ralph-orch%3Aabc',
        request: new Request('http://localhost/queues/Plans/ralph-orch%3Aabc'),
        url: new URL('http://localhost/queues/Plans/ralph-orch%3Aabc'),
      };

      const result = await loader(args);

      expect(result.queueName).toBe('Plans');
      expect(result.job.id).toBe('job-1');
      expect(mockExecute).toHaveBeenCalledWith(
        args.request,
        expect.any(Object),
        {
          jobId: 'ralph-orch:abc',
          queueName: 'Plans',
        },
      );
    });

    test('throws 400 when queue name is missing', async () => {
      const args: Route.LoaderArgs = {
        context: createTestRouterContext(),
        params: { jobId: 'job-1', queueId: '' },
        pattern: '/queues',
        request: new Request('http://localhost'),
        url: new URL('http://localhost'),
      };

      await expect(loader(args)).rejects.toMatchObject({ status: 400 });
    });

    test('throws 400 when job id is missing', async () => {
      const args: Route.LoaderArgs = {
        context: createTestRouterContext(),
        params: { jobId: '', queueId: 'Plans' },
        pattern: '/queues/Plans',
        request: new Request('http://localhost/queues/Plans'),
        url: new URL('http://localhost/queues/Plans'),
      };

      await expect(loader(args)).rejects.toMatchObject({ status: 400 });
    });

    test('throws 404 when GraphQL returns no job', async () => {
      mockExecute.mockResolvedValueOnce({ job: null });

      const args: Route.LoaderArgs = {
        context: createTestRouterContext(),
        params: { jobId: 'missing', queueId: 'Plans' },
        pattern: '/queues/Plans/missing',
        request: new Request('http://localhost/queues/Plans/missing'),
        url: new URL('http://localhost/queues/Plans/missing'),
      };

      await expect(loader(args)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('action', () => {
    test('returns error when queue or job id is missing', async () => {
      const formData = new FormData();
      formData.set('intent', 'retryJob');

      const result = await action({
        context: createTestRouterContext(),
        params: { jobId: '', queueId: 'Plans' },
        pattern: '/queues/Plans',
        request: new Request('http://localhost', {
          body: formData,
          method: 'POST',
        }),
        url: new URL('http://localhost'),
      });

      expect(result).toEqual({ retryJobError: 'Missing queue or job id.' });
    });

    test('calls retryJob with decoded job id and queue name', async () => {
      const retryPayload = {
        error: null,
        jobId: 'job-1',
        success: true,
      };
      mockExecute.mockResolvedValueOnce({ retryJob: retryPayload });

      const formData = new FormData();
      formData.set('intent', 'retryJob');

      const args: Route.ActionArgs = {
        context: createTestRouterContext(),
        params: {
          jobId: encodeURIComponent('ralph-orch:abc'),
          queueId: 'Plans',
        },
        pattern: '/queues/Plans/ralph-orch%3Aabc',
        request: new Request('http://localhost/queues/Plans/ralph-orch%3Aabc', {
          body: formData,
          method: 'POST',
        }),
        url: new URL('http://localhost/queues/Plans/ralph-orch%3Aabc'),
      };

      const result = await action(args);

      expect(mockExecute).toHaveBeenCalledWith(
        args.request,
        expect.any(Object),
        {
          input: { jobId: 'ralph-orch:abc', queueName: 'Plans' },
        },
      );
      expect(result).toEqual({ retryJob: retryPayload });
    });

    test('returns retryJobError when retryJob is missing from response', async () => {
      mockExecute.mockResolvedValueOnce({ retryJob: null });

      const formData = new FormData();
      formData.set('intent', 'retryJob');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ retryJobError: 'Retry failed.' });
    });

    test('returns retryJobError when GraphQL throws', async () => {
      mockExecute.mockRejectedValueOnce(new Error('network down'));

      const formData = new FormData();
      formData.set('intent', 'retryJob');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ retryJobError: 'network down' });
    });

    test('calls cancelPlanRun with plan id from form', async () => {
      const planId = '80864bba-630a-451d-bfd2-4b25ec202381';
      const cancelPayload = {
        activeJobIdsCouldNotCancel: [],
        noMatchingJob: false,
        planId,
        planStatusAfter: 'PENDING',
        removedJobIds: ['job-1'],
        signaledActiveRunToStop: false,
      };
      mockExecute.mockResolvedValueOnce({ cancelPlanRun: cancelPayload });

      const formData = new FormData();
      formData.set('intent', 'cancelPlanRun');
      formData.set('planId', planId);

      const args = actionArgs(formData);
      const result = await action(args);

      expect(mockExecute).toHaveBeenCalledWith(
        args.request,
        expect.any(Object),
        {
          input: { planId },
        },
      );
      expect(result).toEqual({ cancelPlanRun: cancelPayload });
    });

    test('returns cancelPlanRunError when cancelPlanRun is missing from response', async () => {
      mockExecute.mockResolvedValueOnce({ cancelPlanRun: null });

      const formData = new FormData();
      formData.set('intent', 'cancelPlanRun');
      formData.set('planId', '80864bba-630a-451d-bfd2-4b25ec202381');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({
        cancelPlanRunError: 'Failed to cancel plan run.',
      });
    });

    test('returns cancelPlanRunError when GraphQL throws', async () => {
      mockExecute.mockRejectedValueOnce(new Error('cancel failed'));

      const formData = new FormData();
      formData.set('intent', 'cancelPlanRun');
      formData.set('planId', '80864bba-630a-451d-bfd2-4b25ec202381');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ cancelPlanRunError: 'cancel failed' });
    });

    test('returns empty object for unknown intent', async () => {
      const formData = new FormData();
      formData.set('intent', 'unknown');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({});
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });
});
