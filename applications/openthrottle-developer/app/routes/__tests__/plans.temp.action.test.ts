// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import {
  RalphNestedDebugCli,
  TestWorkflowDocument,
} from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/plans.temp';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { action, loader } = await import('../plans.temp');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const buildActionArgs = (body: Record<string, string>): Route.ActionArgs => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(body)) {
    formData.set(key, value);
  }
  const request = new Request('http://localhost/plans/temp', {
    body: formData,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/plans/temp',
    request,
    url: new URL(request.url),
  };
};

describe('routes/plans.temp loader', () => {
  test('returns an empty object', async () => {
    const request = new Request('http://localhost/plans/temp');
    const result = await loader({
      context: createTestRouterContext(),
      params: {},
      pattern: '/plans/temp',
      request,
      url: new URL(request.url),
    });

    expect(result).toEqual({});
  });
});

describe('routes/plans.temp action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('defaults branch to main and forwards the plan id', async () => {
    mockExecute.mockResolvedValue({ testWorkflow: {} });

    await action(buildActionArgs({ planId: 'plan-1' }));

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      TestWorkflowDocument,
      {
        input: {
          branch: 'main',
          planId: 'plan-1',
          ralph: { ralphDebugCli: RalphNestedDebugCli.Verbose },
        },
      },
    );
  });

  test('trims and forwards an explicit branch', async () => {
    mockExecute.mockResolvedValue({ testWorkflow: {} });

    await action(
      buildActionArgs({ branch: '  feature/foo  ', planId: 'plan-2' }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      TestWorkflowDocument,
      {
        input: {
          branch: 'feature/foo',
          planId: 'plan-2',
          ralph: { ralphDebugCli: RalphNestedDebugCli.Verbose },
        },
      },
    );
  });

  test('returns an empty object result', async () => {
    mockExecute.mockResolvedValue({ testWorkflow: {} });

    const result = await action(buildActionArgs({ planId: 'plan-1' }));

    expect(result).toEqual({});
  });
});
