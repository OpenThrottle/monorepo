import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { JwtPayload } from '../strategies/jwt.strategy';
import { getRequestFromExecutionContext } from './get-request-from-execution-context';

const jwtUser: JwtPayload = {
  email: 'user@example.com',
  sub: 'user-uuid-1',
};

const createHttpContext = (httpReq: { user?: JwtPayload }): ExecutionContext =>
  ({
    getType: vi.fn().mockReturnValue('http'),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: () => httpReq,
    }),
  }) as unknown as ExecutionContext;

const createGraphqlContext = (
  gqlReq: { user?: JwtPayload },
  httpReq: { user?: JwtPayload } = {},
): ExecutionContext =>
  ({
    getType: vi.fn().mockReturnValue('graphql'),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: () => httpReq,
    }),
  }) as unknown as ExecutionContext;

describe('getRequestFromExecutionContext', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when execution type is http', () => {
    it('returns switchToHttp().getRequest()', () => {
      const httpReq = { user: jwtUser };
      const ctx = createHttpContext(httpReq);

      expect(getRequestFromExecutionContext(ctx)).toBe(httpReq);
    });
  });

  describe('when execution type is graphql', () => {
    it('uses GqlExecutionContext context.req, not switchToHttp', () => {
      const gqlReq = { user: jwtUser };
      const httpReq = { user: undefined };
      const ctx = createGraphqlContext(gqlReq, httpReq);

      vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: () => ({ req: gqlReq }),
      } as GqlExecutionContext);

      expect(getRequestFromExecutionContext(ctx)).toBe(gqlReq);
      expect(ctx.switchToHttp).not.toHaveBeenCalled();
    });

    it('treats getType() as graphql via string coercion', () => {
      const gqlReq = { user: jwtUser };
      const ctx = {
        getType: vi.fn().mockReturnValue('graphql'),
        switchToHttp: vi.fn(),
      } as unknown as ExecutionContext;

      vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: () => ({ req: gqlReq }),
      } as GqlExecutionContext);

      expect(getRequestFromExecutionContext(ctx)).toBe(gqlReq);
    });

    it('throws when GraphQL context is missing req', () => {
      const ctx = createGraphqlContext({});

      vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: () => ({}),
      } as GqlExecutionContext);

      expect(() => getRequestFromExecutionContext(ctx)).toThrow(
        'GraphQL context missing req',
      );
    });
  });
});
