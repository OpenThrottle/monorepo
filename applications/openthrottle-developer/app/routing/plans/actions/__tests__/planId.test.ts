// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/plans.$planId._index';

// Keep the real `parseFormData`; only stub the network call. `importOriginal`
// is SSR-safe under node (the package's `window.env` read is `IS_BROWSER`-gated).
vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const {
  PlanDetailAddPlanTagDocument,
  PlanDetailAddHookDocument,
  PlanDetailDetachHookDocument,
  PlanDetailEnqueuePlanRunDocument,
  PlanDetailSetPlanStatusDocument,
  PlanDetailUpdatePlanRunConfigDocument,
  PlanDetailUpdateTaskDocument,
} = await import('~/__generated__/graphql');
const {
  addPlanTag,
  removePlanTag,
  addHook,
  detachHook,
  runPlan,
  saveRunConfig,
  setPlanStatus,
  updateTaskStatus,
} = await import('../planId');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const actionArgs = (): Route.ActionArgs => {
  const request = new Request('http://localhost/plans/plan-1', {
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: { planId: 'plan-1' },
    pattern: '/plans/:planId',
    request,
    url: new URL(request.url),
  };
};

const form = (entries: Record<string, string>): FormData => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
};

describe('plans/actions/planId tag + hook parsers', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        addHook: { id: 'h1' },
      }),
    );
  });

  test('addPlanTag injects the route planId and forwards the trimmed tag', async () => {
    const result = await addPlanTag(
      actionArgs(),
      'plan-1',
      form({ tag: '  urgent  ' }),
    );

    expect(result).toEqual({ planTagUpdated: true });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      PlanDetailAddPlanTagDocument,
      { input: { planId: 'plan-1', tag: 'urgent' } },
    );
  });

  test('addPlanTag rejects a blank tag without calling the server', async () => {
    const result = await addPlanTag(
      actionArgs(),
      'plan-1',
      form({ tag: '   ' }),
    );

    expect(result).toEqual({ planTagError: 'Tag is required.' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('removePlanTag rejects a blank tag', async () => {
    const result = await removePlanTag(
      actionArgs(),
      'plan-1',
      form({ tag: '' }),
    );

    expect(result).toEqual({ planTagError: 'Tag is required.' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('addHook parses the form once and injects the route planId', async () => {
    const result = await addHook(
      actionArgs(),
      'plan-1',
      form({ role: 'before', source: 'skill' }),
    );

    expect(result).toEqual({ addHook: { id: 'h1' } });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      PlanDetailAddHookDocument,
      { input: { planId: 'plan-1', role: 'before', source: 'skill' } },
    );
  });

  test('addHook surfaces a validation error when a required field is blank', async () => {
    const result = await addHook(
      actionArgs(),
      'plan-1',
      form({ role: '', source: 'skill' }),
    );

    expect(result.addHookError).toBeDefined();
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe('plans/actions/planId status + config parsers', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('setPlanStatus defaults to COMPLETED when status is omitted', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        setPlanStatus: { id: 'plan-1' },
      }),
    );

    const result = await setPlanStatus(actionArgs(), 'plan-1', form({}));

    expect(result).toEqual({ setPlanStatus: { id: 'plan-1' } });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      PlanDetailSetPlanStatusDocument,
      { input: { planId: 'plan-1', status: 'COMPLETED' } },
    );
  });

  test('setPlanStatus forwards an explicit status', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        setPlanStatus: { id: 'plan-1' },
      }),
    );

    await setPlanStatus(
      actionArgs(),
      'plan-1',
      form({ status: 'IN_PROGRESS' }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      PlanDetailSetPlanStatusDocument,
      { input: { planId: 'plan-1', status: 'IN_PROGRESS' } },
    );
  });

  test('updateTaskStatus maps taskId to id and injects the plan id', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        updateTask: { id: 'task-1' },
      }),
    );

    const result = await updateTaskStatus(
      actionArgs(),
      'plan-1',
      form({ status: 'COMPLETED', taskId: 'task-1' }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      PlanDetailUpdateTaskDocument,
      { input: { id: 'task-1', planId: 'plan-1', status: 'COMPLETED' } },
    );
  });

  test('updateTaskStatus rejects a blank task id without calling the server', async () => {
    const result = await updateTaskStatus(
      actionArgs(),
      'plan-1',
      form({ status: 'COMPLETED', taskId: '' }),
    );

    expect(result.updateTaskError).toBeDefined();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('detachHook forwards the hook task id', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        detachHook: { id: 'h1' },
      }),
    );

    const result = await detachHook(
      actionArgs().request,
      form({ hookTaskId: 'task-9' }),
    );

    expect(result).toEqual({ detachHook: { id: 'h1' } });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      PlanDetailDetachHookDocument,
      { input: { hookTaskId: 'task-9' } },
    );
  });

  test('detachHook rejects a blank hook task id', async () => {
    const result = await detachHook(
      actionArgs().request,
      form({ hookTaskId: '' }),
    );

    expect(result.detachHookError).toBeDefined();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('saveRunConfig rejects invalid JSON with the user-facing message', async () => {
    const result = await saveRunConfig(
      actionArgs(),
      'plan-1',
      form({ runConfigJson: '{bad' }),
    );

    expect(result).toEqual({
      saveRunConfigError: 'runConfigJson must be valid JSON.',
    });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('saveRunConfig sends null for a blank config and the string otherwise', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        updatePlan: { id: 'plan-1' },
      }),
    );

    await saveRunConfig(actionArgs(), 'plan-1', form({ runConfigJson: '' }));
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      PlanDetailUpdatePlanRunConfigDocument,
      { input: { id: 'plan-1', runConfigJson: null } },
    );

    mockExecute.mockClear();
    await saveRunConfig(
      actionArgs(),
      'plan-1',
      form({ runConfigJson: '{"a":1}' }),
    );
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      PlanDetailUpdatePlanRunConfigDocument,
      { input: { id: 'plan-1', runConfigJson: '{"a":1}' } },
    );
  });

  test('runPlan requires a branch and does not call the server without one', async () => {
    const result = await runPlan(
      actionArgs(),
      'plan-1',
      form({ priority: '3' }),
    );

    expect(result.runPlanError).toContain('branch is required');
    expect(mockExecute).not.toHaveBeenCalled();
  });

  // 🚨 The toolbar disables Run while workspaceRepositories is still resolving,
  // but client-side disabling is not the boundary. A fast click in that window
  // must not be able to enqueue a run with a blank branch.
  test.each([[''], ['   ']])(
    'runPlan rejects a blank branch (%j) without calling the server',
    async (branch) => {
      const result = await runPlan(actionArgs(), 'plan-1', form({ branch }));

      expect(result.runPlanError).toContain('branch is required');
      expect(mockExecute).not.toHaveBeenCalled();
    },
  );

  test('runPlan enqueues with the coerced priority and injected plan id', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        enqueuePlanRun: { id: 'run-1' },
      }),
    );

    const result = await runPlan(
      actionArgs(),
      'plan-1',
      form({ branch: 'main', priority: '5' }),
    );

    expect(result).toEqual({ runPlan: { id: 'run-1' } });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      PlanDetailEnqueuePlanRunDocument,
      { input: { branch: 'main', planId: 'plan-1', priority: 5 } },
    );
  });

  test('runPlan defaults priority to 1 when omitted', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        enqueuePlanRun: { id: 'run-1' },
      }),
    );

    await runPlan(actionArgs(), 'plan-1', form({ branch: 'main' }));

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      PlanDetailEnqueuePlanRunDocument,
      { input: { branch: 'main', planId: 'plan-1', priority: 1 } },
    );
  });
});
