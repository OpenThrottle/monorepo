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
const { PlanDetailAddPlanTagDocument, PlanDetailAddHookDocument } =
  await import('~/__generated__/graphql');
const { addPlanTag, removePlanTag, addHook } = await import('../planId');

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
