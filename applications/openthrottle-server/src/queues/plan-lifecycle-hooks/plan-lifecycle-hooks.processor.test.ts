/**
 * @description Unit tests for {@link PlanLifecycleHooksProcessor.process}: job
 * unpacking, delegation to executeSinglePlanLifecycleHook, and error propagation.
 */

import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanOutputStreamService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { executeSinglePlanLifecycleHook } from './execute-single-plan-lifecycle-hook';
import { PlanLifecycleHooksProcessor } from './plan-lifecycle-hooks.processor';
import type {
  PlanLifecycleHookJob,
  PlanLifecycleHookJobData,
} from './plan-lifecycle-hooks.types';

vi.mock('./execute-single-plan-lifecycle-hook', () => ({
  executeSinglePlanLifecycleHook: vi.fn(),
}));

const executeMock = vi.mocked(executeSinglePlanLifecycleHook);

const buildJobData = (
  overrides: Partial<PlanLifecycleHookJobData> = {},
): PlanLifecycleHookJobData => ({
  entry: {
    kind: 'prompt_profile',
    phase: 'beforeAll',
    prompt: 'test-prompt',
    promptDelivery: 'named',
  },
  hookIndex: 0,
  mainRunStarted: true,
  mainRunSucceeded: false,
  parentJobId: 'parent-1',
  parentQueueName: 'Plans',
  phase: 'beforeAll',
  planId: '00000000-0000-4000-8000-000000000001',
  planRunJobData: {
    planId: '00000000-0000-4000-8000-000000000001',
    runKind: 'orchestrator',
  },
  ...overrides,
});

describe('PlanLifecycleHooksProcessor.process', () => {
  let processor: PlanLifecycleHooksProcessor;
  let logger: LoggerService;
  let planOutputStreamService: PlanOutputStreamService;
  let plansService: PlansService;
  let tasksService: TasksService;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = createMock<LoggerService>();
    planOutputStreamService = createMock<PlanOutputStreamService>();
    plansService = createMock<PlansService>();
    tasksService = createMock<TasksService>();
    processor = new PlanLifecycleHooksProcessor(
      logger,
      planOutputStreamService,
      plansService,
      tasksService,
    );
  });

  it('unpacks a well-formed job and delegates to executeSinglePlanLifecycleHook with mapped arguments', async () => {
    const expected = { blocked: false, ok: true };
    executeMock.mockResolvedValueOnce(expected);

    const data = buildJobData();
    const result = await processor.process(
      createMock<PlanLifecycleHookJob>({ data }),
    );

    expect(result).toBe(expected);
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entry: data.entry,
        hookIndex: data.hookIndex,
        jobData: data.planRunJobData,
        logLabel: 'PlanLifecycleHooksProcessor',
        logger,
        mainRunStarted: data.mainRunStarted,
        mainRunSucceeded: data.mainRunSucceeded,
        phase: data.phase,
        planOutputStreamService,
        plansService,
        tasksService,
      }),
    );
  });

  it('forwards optional task context and outcome when present', async () => {
    executeMock.mockResolvedValueOnce({ blocked: false, ok: true });

    const data = buildJobData({
      phase: 'afterEach',
      task: {
        category: undefined,
        id: 'task-1',
        status: 'pending',
        title: 'Task 1',
      },
      taskOutcome: 'completed',
    });
    await processor.process(createMock<PlanLifecycleHookJob>({ data }));

    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'afterEach',
        task: data.task,
        taskOutcome: data.taskOutcome,
      }),
    );
  });

  it('fails loudly on missing job data instead of silently no-oping', async () => {
    // @ts-expect-error deliberately malformed job (missing `data`) to assert the runtime guard
    await expect(processor.process({})).rejects.toBeInstanceOf(TypeError);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('propagates a hook execution error so BullMQ marks the job failed', async () => {
    const failure = new Error('hook blew up');
    executeMock.mockRejectedValueOnce(failure);

    await expect(
      processor.process(
        createMock<PlanLifecycleHookJob>({ data: buildJobData() }),
      ),
    ).rejects.toBe(failure);
  });
});
