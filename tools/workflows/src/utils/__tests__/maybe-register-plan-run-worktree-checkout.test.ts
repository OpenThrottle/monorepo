/**
 * @description Soft-fail gating for CLI run-start worktree checkout registration.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const registerPlanRunWorktreeCheckoutGraphqlMock = vi.hoisted(() => vi.fn());
const resolveWorkflowAuthTokenFromEnvMock = vi.hoisted(() => vi.fn());

vi.mock('../openthrottle-ralph-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../openthrottle-ralph-graphql')>();
  return {
    ...actual,
    registerPlanRunWorktreeCheckoutGraphql:
      registerPlanRunWorktreeCheckoutGraphqlMock,
  };
});

vi.mock('@openthrottle/openthrottle-agentic-ralph', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-ralph')
    >();
  return {
    ...actual,
    resolveWorkflowAuthTokenFromEnv: resolveWorkflowAuthTokenFromEnvMock,
  };
});

describe('isWorkflowActorUserJwt', () => {
  it('accepts a three-segment JWT that is not ot_sa_', async () => {
    const { isWorkflowActorUserJwt } = await import('../openthrottle-ralph.js');
    expect(isWorkflowActorUserJwt('aaa.bbb.ccc')).toBe(true);
  });

  it('rejects service-account tokens', async () => {
    const { isWorkflowActorUserJwt } = await import('../openthrottle-ralph.js');
    expect(isWorkflowActorUserJwt('ot_sa_prefix_secret')).toBe(false);
  });

  it('rejects missing / blank / non-JWT tokens', async () => {
    const { isWorkflowActorUserJwt } = await import('../openthrottle-ralph.js');
    expect(isWorkflowActorUserJwt(undefined)).toBe(false);
    expect(isWorkflowActorUserJwt('')).toBe(false);
    expect(isWorkflowActorUserJwt('   ')).toBe(false);
    expect(isWorkflowActorUserJwt('not-a-jwt')).toBe(false);
  });
});

describe('maybeRegisterPlanRunWorktreeCheckout', () => {
  beforeEach(() => {
    registerPlanRunWorktreeCheckoutGraphqlMock.mockReset();
    registerPlanRunWorktreeCheckoutGraphqlMock.mockResolvedValue(undefined);
    resolveWorkflowAuthTokenFromEnvMock.mockReset();
    resolveWorkflowAuthTokenFromEnvMock.mockReturnValue('aaa.bbb.ccc');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the GraphQL mutation when graphql transport + user JWT', async () => {
    const { maybeRegisterPlanRunWorktreeCheckout } =
      await import('../openthrottle-ralph.js');

    await maybeRegisterPlanRunWorktreeCheckout(
      { transport: 'graphql' },
      {
        filesystemPath: '/tmp/worktrees/example',
        planRunId: 'cli-run-1',
      },
    );

    expect(registerPlanRunWorktreeCheckoutGraphqlMock).toHaveBeenCalledWith({
      filesystemPath: '/tmp/worktrees/example',
      planRunId: 'cli-run-1',
    });
  });

  it('skips when transport is postgres-direct (no actor JWT path)', async () => {
    const { maybeRegisterPlanRunWorktreeCheckout } =
      await import('../openthrottle-ralph.js');

    await maybeRegisterPlanRunWorktreeCheckout(
      {
        connectionString: 'postgres://localhost/ot',
        transport: 'postgres-direct',
      },
      {
        filesystemPath: '/tmp/worktrees/example',
        planRunId: 'cli-run-1',
      },
    );

    expect(registerPlanRunWorktreeCheckoutGraphqlMock).not.toHaveBeenCalled();
  });

  it('does not pass ot_sa_ service-account tokens to the mutation', async () => {
    resolveWorkflowAuthTokenFromEnvMock.mockReturnValue('ot_sa_prefix_secret');
    const { maybeRegisterPlanRunWorktreeCheckout } =
      await import('../openthrottle-ralph.js');

    await maybeRegisterPlanRunWorktreeCheckout(
      { transport: 'graphql' },
      {
        filesystemPath: '/tmp/worktrees/example',
        planRunId: 'cli-run-1',
      },
    );

    expect(registerPlanRunWorktreeCheckoutGraphqlMock).not.toHaveBeenCalled();
  });

  it('soft-fails (warns + continues) when the GraphQL call throws', async () => {
    registerPlanRunWorktreeCheckoutGraphqlMock.mockRejectedValueOnce(
      new Error('forbidden'),
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { maybeRegisterPlanRunWorktreeCheckout } =
      await import('../openthrottle-ralph.js');

    await expect(
      maybeRegisterPlanRunWorktreeCheckout(
        { transport: 'graphql' },
        {
          filesystemPath: '/tmp/worktrees/example',
          planRunId: 'cli-run-1',
        },
      ),
    ).resolves.toBeUndefined();

    expect(
      warnSpy.mock.calls.some((call) =>
        String(call[0]).includes('Soft-fail worktree checkout registration'),
      ),
    ).toBe(true);
    warnSpy.mockRestore();
  });
});
