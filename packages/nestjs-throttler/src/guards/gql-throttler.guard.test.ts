import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GqlThrottlerGuard } from './gql-throttler.guard';

/**
 * Unit coverage for the GraphQL-specific skip logic. The throttling behaviour
 * itself is exercised end-to-end in the module integration suites; here we pin
 * down which contexts the guard refuses to throttle (and therefore never lets
 * the stock guard touch `req.ip` / `res.header`).
 */

interface TestGraphqlContext {
  readonly req?: unknown;
}

interface TestGraphqlInfo {
  readonly operation: { readonly operation: string };
}

const createGuard = (): GqlThrottlerGuard =>
  // Constructor deps are unused by `shouldSkip` for the GraphQL branches under
  // test; the http fall-through path is covered by the integration suites.
  new GqlThrottlerGuard({ throttlers: [] }, {} as never, {} as never);

const createGraphqlContext = (): ExecutionContext =>
  ({
    getType: vi.fn().mockReturnValue('graphql'),
  }) as unknown as ExecutionContext;

const mockGqlContext = (
  context: TestGraphqlContext,
  info: TestGraphqlInfo | undefined,
): void => {
  vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
    getContext: () => context,
    getInfo: () => info,
  } as unknown as GqlExecutionContext);
};

// `shouldSkip` is protected; the suite drives it through a thin typed accessor.
const callShouldSkip = (
  guard: GqlThrottlerGuard,
  context: ExecutionContext,
): Promise<boolean> => {
  const withProtected = guard as unknown as {
    shouldSkip(ctx: ExecutionContext): Promise<boolean>;
  };

  return withProtected.shouldSkip(context);
};

describe('GqlThrottlerGuard.shouldSkip', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips graphql-ws contexts that carry no request', async () => {
    mockGqlContext({ req: undefined }, undefined);

    await expect(
      callShouldSkip(createGuard(), createGraphqlContext()),
    ).resolves.toBe(true);
  });

  it('skips subscription operations even when a request is present', async () => {
    mockGqlContext(
      { req: { ip: '203.0.113.1' } },
      { operation: { operation: 'subscription' } },
    );

    await expect(
      callShouldSkip(createGuard(), createGraphqlContext()),
    ).resolves.toBe(true);
  });

  it('skips mutations executed over graphql-ws (request present, no HTTP response)', async () => {
    // @nestjs/apollo surfaces the ws upgrade request as `req` for operations
    // executed over the socket — but there is no Express `res` to header().
    mockGqlContext(
      { req: { headers: {} } },
      { operation: { operation: 'mutation' } },
    );

    await expect(
      callShouldSkip(createGuard(), createGraphqlContext()),
    ).resolves.toBe(true);
  });

  it('does not skip queries/mutations (defers to the base guard)', async () => {
    mockGqlContext(
      { req: { ip: '203.0.113.1', res: { header: vi.fn() } } },
      { operation: { operation: 'query' } },
    );

    const baseProto = ThrottlerGuard.prototype as unknown as {
      shouldSkip(ctx: ExecutionContext): Promise<boolean>;
    };
    const superSkip = vi
      .spyOn(baseProto, 'shouldSkip')
      .mockResolvedValue(false);

    await expect(
      callShouldSkip(createGuard(), createGraphqlContext()),
    ).resolves.toBe(false);
    expect(superSkip).toHaveBeenCalledOnce();
  });
});
