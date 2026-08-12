// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createActionArgs } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/resources.agent-setup';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { action } = await import('../resources.agent-setup');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const buildArgs = (formData: Record<string, string>): Route.ActionArgs =>
  createActionArgs<Route.ActionArgs>({
    body: formData,
    url: 'http://localhost/resources/agent-setup',
  });

describe('routes/resources.agent-setup action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('runs installAgentCli when intent is not update', async () => {
    mockExecute.mockResolvedValue({
      installAgentCli: {
        backend: 'claude',
        disabled: false,
        errorMessage: null,
        mode: 'install',
        runId: 'run-1',
      },
    });

    const result = await action(buildArgs({ backend: 'claude' }));

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      backend: 'claude',
      disabled: false,
      errorMessage: null,
      mode: 'install',
      runId: 'run-1',
    });
  });

  test('runs updateAgentCli when intent is update', async () => {
    mockExecute.mockResolvedValue({
      updateAgentCli: {
        backend: 'codex',
        disabled: false,
        errorMessage: null,
        mode: 'update',
        runId: 'run-2',
      },
    });

    const result = await action(
      buildArgs({ backend: 'codex', intent: 'update' }),
    );

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      backend: 'codex',
      disabled: false,
      errorMessage: null,
      mode: 'update',
      runId: 'run-2',
    });
  });

  test('returns a failure result with the backend + mode when the mutation throws', async () => {
    mockExecute.mockRejectedValue(new Error('flag disabled'));

    const result = await action(buildArgs({ backend: 'gemini' }));

    expect(result).toEqual({
      backend: 'gemini',
      disabled: false,
      errorMessage: 'flag disabled',
      mode: 'install',
      runId: null,
    });
  });

  test('falls back to a generic error message for non-Error rejections', async () => {
    mockExecute.mockRejectedValue('nope');

    const result = await action(
      buildArgs({ backend: 'gemini', intent: 'update' }),
    );

    expect(result).toEqual({
      backend: 'gemini',
      disabled: false,
      errorMessage: 'Failed to start the run.',
      mode: 'update',
      runId: null,
    });
  });
});
