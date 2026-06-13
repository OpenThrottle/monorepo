/**
 * @description Unit tests for {@link GqlLocalCredentialsGuard}: credential shape/length
 * validation, copying valid credentials onto the request body, and rejecting malformed
 * input before it reaches Passport's LocalStrategy (without logging the values).
 */

import { createMock } from '@golevelup/ts-vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import { GqlLocalCredentialsGuard } from './gql-local-credentials.guard';

interface FakeRequest {
  body?: Record<string, unknown>;
}

const buildContext = (input: unknown, req: FakeRequest): ExecutionContext => {
  vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
    getArgs: () => ({ input }),
    getContext: () => ({ req }),
  } as unknown as GqlExecutionContext);

  return {} as ExecutionContext;
};

describe('GqlLocalCredentialsGuard', () => {
  let guard: GqlLocalCredentialsGuard;
  let logger: LoggerService;

  beforeEach(() => {
    logger = createMock<LoggerService>();
    guard = new GqlLocalCredentialsGuard(logger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('copies valid credentials onto the request body as username/password', () => {
    const req: FakeRequest = { body: {} };
    const context = buildContext(
      { email: 'user@example.com', password: 's3cret-pass' },
      req,
    );

    expect(guard.canActivate(context)).toBe(true);
    expect(req.body).toEqual({
      password: 's3cret-pass',
      username: 'user@example.com',
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('initializes request.body when it is absent', () => {
    const req: FakeRequest = {};
    const context = buildContext(
      { email: 'user@example.com', password: 's3cret-pass' },
      req,
    );

    guard.canActivate(context);

    expect(req.body).toEqual({
      password: 's3cret-pass',
      username: 'user@example.com',
    });
  });

  it('rejects missing input and does not touch the request body', () => {
    const req: FakeRequest = {};
    const context = buildContext(undefined, req);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(req.body).toBeUndefined();
  });

  it('rejects non-string credentials', () => {
    const req: FakeRequest = { body: {} };
    const context = buildContext({ email: 123, password: true }, req);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(req.body).toEqual({});
  });

  it('rejects empty credentials', () => {
    const req: FakeRequest = { body: {} };
    const context = buildContext({ email: '', password: '' }, req);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects an over-length email', () => {
    const req: FakeRequest = { body: {} };
    const context = buildContext(
      { email: `${'a'.repeat(321)}@x.com`, password: 'ok' },
      req,
    );

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects an over-length password', () => {
    const req: FakeRequest = { body: {} };
    const context = buildContext(
      { email: 'user@example.com', password: 'p'.repeat(257) },
      req,
    );

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('logs the rejection without including the credential values', () => {
    const req: FakeRequest = { body: {} };
    // An over-length email forces rejection while a real password value is present.
    const context = buildContext(
      { email: `${'a'.repeat(400)}@example.com`, password: 'do-not-log-me' },
      req,
    );

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const serialized = JSON.stringify(vi.mocked(logger.warn).mock.calls[0]);
    expect(serialized).not.toContain('do-not-log-me');
    expect(serialized).not.toContain('@example.com');
  });
});
