import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { createMock } from '@golevelup/ts-vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRequestFromExecutionContext } from './get-request-from-execution-context';

const createHttpContext = (httpReq: object): ExecutionContext =>
  createMock<ExecutionContext>({
    getType: vi.fn().mockReturnValue('http'),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: () => httpReq,
    }),
  });

const createGraphqlContext = (httpReq: object = {}): ExecutionContext =>
  createMock<ExecutionContext>({
    getType: vi.fn().mockReturnValue('graphql'),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: () => httpReq,
    }),
  });

describe('getRequestFromExecutionContext (openthrottle-server)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses switchToHttp for http execution', () => {
    const httpReq = { user: { sub: 'http-sub' } };
    const ctx = createHttpContext(httpReq);

    expect(getRequestFromExecutionContext(ctx)).toBe(httpReq);
  });

  it('uses GqlExecutionContext context.req for graphql, not switchToHttp', () => {
    const gqlReq = { user: { sub: 'gql-sub' } };
    const ctx = createGraphqlContext({});

    vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(
      createMock<GqlExecutionContext>({
        getContext: () => ({ req: gqlReq }),
      }),
    );

    expect(getRequestFromExecutionContext(ctx)).toBe(gqlReq);
    expect(ctx.switchToHttp).not.toHaveBeenCalled();
  });

  it('detects graphql via `${getType()}` string coercion (aligned with @CurrentUser)', () => {
    const gqlReq = { user: { sub: 'gql-sub' } };
    const ctx = createMock<ExecutionContext>({
      getType: vi.fn().mockReturnValue('graphql'),
      switchToHttp: vi.fn(),
    });

    vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(
      createMock<GqlExecutionContext>({
        getContext: () => ({ req: gqlReq }),
      }),
    );

    expect(getRequestFromExecutionContext(ctx)).toBe(gqlReq);
  });

  it('throws when GraphQL context is missing req', () => {
    const ctx = createGraphqlContext();

    vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(
      createMock<GqlExecutionContext>({
        getContext: () => ({}),
      }),
    );

    expect(() => getRequestFromExecutionContext(ctx)).toThrow(
      'GraphQL context missing req',
    );
  });
});
