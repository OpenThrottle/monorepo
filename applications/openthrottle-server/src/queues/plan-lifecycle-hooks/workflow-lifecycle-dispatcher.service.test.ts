/**
 * @description Unit tests for {@link WorkflowLifecycleDispatcherFactory} hook filtering.
 */

import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { Job, Queue, QueueEvents } from 'bullmq';
import { WorkflowLifecycleDispatcherFactory } from './workflow-lifecycle-dispatcher.service';
import type {
  PlanLifecycleHookJobData,
  PlanLifecycleHookJobResult,
} from './plan-lifecycle-hooks.types';

type LifecycleHookQueue = Queue<
  PlanLifecycleHookJobData,
  PlanLifecycleHookJobResult
>;
type LifecycleHookJob = Job<
  PlanLifecycleHookJobData,
  PlanLifecycleHookJobResult
>;

const mockWaitUntilFinished = vi.fn<LifecycleHookJob['waitUntilFinished']>();
const mockQueueAdd = vi
  .fn<LifecycleHookQueue['add']>()
  .mockImplementation(async () =>
    createMock<LifecycleHookJob>({ waitUntilFinished: mockWaitUntilFinished }),
  );

describe('WorkflowLifecycleDispatcherFactory', () => {
  let factory: WorkflowLifecycleDispatcherFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitUntilFinished.mockResolvedValue({ blocked: false, ok: true });

    factory = new WorkflowLifecycleDispatcherFactory(
      createMock<LoggerService>(),
      createMock<LifecycleHookQueue>({
        add: mockQueueAdd,
        opts: { connection: {} },
      }),
    );

    Reflect.set(
      factory,
      'queueEvents',
      createMock<QueueEvents>({
        close: vi.fn().mockResolvedValue(undefined),
        waitUntilReady: vi.fn().mockResolvedValue(undefined),
      }),
    );
  });

  it('enqueues beforeAll child jobs serially for orchestrator runs', async () => {
    const dispatcher = factory.create({
      hooks: {
        hooks: [
          {
            kind: 'prompt_profile',
            phase: 'beforeAll',
            prompt: '/agents/ralph',
            promptDelivery: 'named',
          },
        ],
      },
      parentJobId: 'parent-1',
      parentQueueName: 'Plans',
      planRunJobData: {
        planId: '00000000-0000-4000-8000-000000000001',
        runKind: 'orchestrator',
      },
    });

    const result = await dispatcher.runPlan({ phase: 'beforeAll' });

    expect(result.blocked).toBe(false);
    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'lifecycle-hook',
      expect.objectContaining({ phase: 'beforeAll' }),
      expect.objectContaining({
        parent: { id: 'parent-1', queue: 'Plans' },
      }),
    );
  });

  it('returns blocked when a beforeAll child job reports blocked', async () => {
    mockWaitUntilFinished.mockResolvedValueOnce({ blocked: true, ok: false });

    const dispatcher = factory.create({
      hooks: {
        hooks: [
          {
            kind: 'prompt_profile',
            onFailure: 'block',
            phase: 'beforeAll',
            prompt: '/agents/ralph',
            promptDelivery: 'named',
          },
        ],
      },
      parentJobId: 'parent-2',
      parentQueueName: 'Plans',
      planRunJobData: {
        planId: '00000000-0000-4000-8000-000000000002',
        runKind: 'orchestrator',
      },
    });

    const result = await dispatcher.runPlan({ phase: 'beforeAll' });

    expect(result.blocked).toBe(true);
  });
});
