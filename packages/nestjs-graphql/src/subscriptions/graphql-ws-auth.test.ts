import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import {
  createGraphqlWsOnConnect,
  extractConnectionToken,
  isGraphqlWsContext,
  resolveGraphqlWsUserId,
  verifyConnectionToken,
  type GraphqlWsConnectionContext,
} from './graphql-ws-auth';

const SECRET = 'test-secret';
const sign = (
  payload: Record<string, unknown>,
  opts?: jwt.SignOptions,
): string => jwt.sign(payload, SECRET, { algorithm: 'HS256', ...opts });

describe('extractConnectionToken', () => {
  it('returns null when params are absent or empty', () => {
    expect(extractConnectionToken(undefined)).toBeNull();
    expect(extractConnectionToken({})).toBeNull();
    expect(extractConnectionToken({ authToken: '' })).toBeNull();
  });

  it('reads the preferred authToken param', () => {
    expect(extractConnectionToken({ authToken: 'abc' })).toBe('abc');
  });

  it('falls back to an Authorization header, stripping Bearer (any case)', () => {
    expect(extractConnectionToken({ Authorization: 'Bearer xyz' })).toBe('xyz');
    expect(extractConnectionToken({ authorization: 'bearer xyz' })).toBe('xyz');
  });
});

describe('verifyConnectionToken', () => {
  it('returns the sub for a valid token', () => {
    const token = sign({ sub: 'user-1' });
    expect(verifyConnectionToken(token, { jwtSecret: SECRET })).toBe('user-1');
  });

  it('throws when the secret is missing', () => {
    expect(() => verifyConnectionToken('x', { jwtSecret: '' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('throws on a bad signature', () => {
    const token = jwt.sign({ sub: 'user-1' }, 'other-secret', {
      algorithm: 'HS256',
    });
    expect(() => verifyConnectionToken(token, { jwtSecret: SECRET })).toThrow();
  });

  it('throws on an expired token', () => {
    const token = sign({ sub: 'user-1' }, { expiresIn: '-1s' });
    expect(() => verifyConnectionToken(token, { jwtSecret: SECRET })).toThrow();
  });

  it('enforces the issuer when configured', () => {
    const token = sign({ sub: 'user-1' }, { issuer: 'openthrottle' });
    expect(
      verifyConnectionToken(token, {
        jwtIssuer: 'openthrottle',
        jwtSecret: SECRET,
      }),
    ).toBe('user-1');
    expect(() =>
      verifyConnectionToken(token, { jwtIssuer: 'other', jwtSecret: SECRET }),
    ).toThrow();
  });

  it('rejects a token whose sub is not a string', () => {
    const token = sign({ sub: 42 });
    expect(() => verifyConnectionToken(token, { jwtSecret: SECRET })).toThrow(
      /sub/,
    );
  });
});

describe('createGraphqlWsOnConnect', () => {
  const ctxWith = (
    params?: Record<string, unknown>,
  ): GraphqlWsConnectionContext => ({ connectionParams: params, extra: {} });

  it('accepts a valid token and stashes userId on extra', () => {
    const onConnect = createGraphqlWsOnConnect({ jwtSecret: SECRET });
    const ctx = ctxWith({ authToken: sign({ sub: 'user-7' }) });
    expect(onConnect(ctx)).toBe(true);
    expect(resolveGraphqlWsUserId(ctx)).toBe('user-7');
  });

  it('rejects a missing token when required (default)', () => {
    const onConnect = createGraphqlWsOnConnect({ jwtSecret: SECRET });
    expect(onConnect(ctxWith({}))).toBe(false);
  });

  it('allows a missing token when required is false, with no userId', () => {
    const onConnect = createGraphqlWsOnConnect({
      jwtSecret: SECRET,
      required: false,
    });
    const ctx = ctxWith({});
    expect(onConnect(ctx)).toBe(true);
    expect(resolveGraphqlWsUserId(ctx)).toBeUndefined();
  });

  it('always rejects an invalid token, even when not required', () => {
    const onConnect = createGraphqlWsOnConnect({
      jwtSecret: SECRET,
      required: false,
    });
    expect(onConnect(ctxWith({ authToken: 'not-a-jwt' }))).toBe(false);
  });
});

describe('isGraphqlWsContext / resolveGraphqlWsUserId', () => {
  it('distinguishes a ws context from an http context', () => {
    expect(isGraphqlWsContext({ connectionParams: {}, extra: {} })).toBe(true);
    expect(isGraphqlWsContext({ req: {} })).toBe(false);
    expect(isGraphqlWsContext(null)).toBe(false);
  });

  it('returns undefined when no userId is stashed', () => {
    expect(resolveGraphqlWsUserId({ extra: {} })).toBeUndefined();
    expect(resolveGraphqlWsUserId(undefined)).toBeUndefined();
  });
});
