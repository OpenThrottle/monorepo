import type { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { GqlExecutionContext } from '@nestjs/graphql';
import { asMock } from '@openthrottle/nestjs-testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from '../auth-principal';
import type { JwtPayload } from '../strategies/jwt.strategy';
import {
  CurrentUser,
  type CurrentUserProperty,
} from './current-user.decorator';

type ParamFactory = (
  data: CurrentUserProperty | undefined,
  ctx: ExecutionContext,
) => unknown;

/**
 * `createParamDecorator` does not expose its factory directly, so apply the
 * decorator to a throwaway method parameter and read the factory back out of
 * the route-args metadata Nest writes.
 */
const getCurrentUserFactory = (): ParamFactory => {
  class Probe {
    handler(@CurrentUser() _principal: unknown): void {
      void _principal;
    }
  }

  const args = asMock<Record<string, { factory: ParamFactory }>>(
    Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, 'handler'),
  );
  const [first] = Object.values(args);

  return first.factory;
};

const createHttpContext = (httpReq: { user?: unknown }): ExecutionContext =>
  asMock<ExecutionContext>({
    getType: vi.fn().mockReturnValue('http'),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: () => httpReq,
    }),
  });

describe('CurrentUser', () => {
  const factory = getCurrentUserFactory();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const jwtUser: JwtPayload = {
    email: 'user@example.com',
    sub: 'user-uuid-1',
  };

  it('returns undefined when the request has no principal', () => {
    const ctx = createHttpContext({});

    expect(factory(undefined, ctx)).toBeUndefined();
  });

  it('returns the normalized principal when no property is selected', () => {
    const ctx = createHttpContext({ user: jwtUser });

    expect(factory(undefined, ctx)).toEqual({
      email: 'user@example.com',
      kind: AUTH_PRINCIPAL_KIND_USER,
      sub: 'user-uuid-1',
    });
  });

  it("returns the subject id when 'sub' is selected", () => {
    const ctx = createHttpContext({ user: jwtUser });

    expect(factory('sub', ctx)).toBe('user-uuid-1');
  });

  it("returns the principal kind when 'kind' is selected", () => {
    const ctx = createHttpContext({
      user: { kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT, sub: 'svc-1' },
    });

    expect(factory('kind', ctx)).toBe(AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT);
  });

  it('reads the request from the GraphQL context', () => {
    const gqlReq = { user: jwtUser };
    const ctx = asMock<ExecutionContext>({
      getType: vi.fn().mockReturnValue('graphql'),
      switchToHttp: vi.fn(),
    });

    vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(
      asMock<GqlExecutionContext>({
        getContext: () => ({ req: gqlReq }),
      }),
    );

    expect(factory('sub', ctx)).toBe('user-uuid-1');
  });
});
