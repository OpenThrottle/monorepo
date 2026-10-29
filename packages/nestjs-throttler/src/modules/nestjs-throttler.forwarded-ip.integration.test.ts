import type { AddressInfo } from 'node:net';

import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { type INestApplication, Module } from '@nestjs/common';
import { GraphQLModule, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { Throttle } from '@nestjs/throttler';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveTrustProxy } from '../config/trust-proxy.ts';
import { NestjsThrottlerModule } from './nestjs-throttler.module.ts';

/**
 * Rate limiting behind a reverse proxy: the per-route `@Throttle` override a
 * login mutation uses, keyed on the client IP Express derives from
 * `X-Forwarded-For` under {@link resolveTrustProxy}'s default.
 *
 * The test client connects over loopback — exactly the peer a local proxy or
 * an SSR hop presents — so the default trusts it and the forwarded address
 * decides the bucket.
 */

const LOGIN_LIMIT = 2;

@Resolver()
class SignInResolver {
  @Query(() => String)
  serverHealth(): string {
    return 'ok';
  }

  @Throttle({
    default: { blockDuration: 60_000, limit: LOGIN_LIMIT, ttl: 60_000 },
  })
  @Mutation(() => String)
  signIn(): string {
    return 'signed-in';
  }
}

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: true,
      context: (ctx: { req?: unknown }) => ({ req: ctx.req }),
      driver: ApolloDriver,
      path: '/graphql',
    }),
    NestjsThrottlerModule.forRoot({
      throttlers: [{ limit: 1_000, ttl: 60_000 }],
    }),
  ],
  providers: [SignInResolver],
})
class SignInModule {}

interface ExpressSettings {
  set: (setting: string, value: unknown) => void;
}

/** The Express app is a function carrying `set`; narrow the adapter's untyped instance to it. */
const isExpressSettings = (value: unknown): value is ExpressSettings =>
  (typeof value === 'function' || typeof value === 'object') &&
  value !== null &&
  'set' in value &&
  typeof value.set === 'function';

const bootApp = async (
  trustProxy: boolean | number | string,
): Promise<{ readonly app: INestApplication; readonly url: string }> => {
  const moduleRef = await Test.createTestingModule({
    imports: [SignInModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  const express: unknown = app.getHttpAdapter().getInstance();

  if (!isExpressSettings(express)) {
    throw new Error('Expected the Express adapter.');
  }

  express.set('trust proxy', trustProxy);
  await app.init();
  await app.listen(0);

  const address: string | AddressInfo | null = app.getHttpServer().address();

  if (address === null || typeof address === 'string') {
    throw new Error('Expected the throttler test server to bind a TCP port.');
  }

  return { app, url: `http://127.0.0.1:${address.port}` };
};

const signIn = async (
  url: string,
  forwardedFor: string | undefined,
): Promise<string> => {
  const response = await fetch(`${url}/graphql`, {
    body: JSON.stringify({ query: 'mutation { signIn }' }),
    headers: {
      'Content-Type': 'application/json',
      ...(forwardedFor === undefined
        ? {}
        : { 'X-Forwarded-For': forwardedFor }),
    },
    method: 'POST',
  });
  const body: unknown = await response.json();

  if (typeof body !== 'object' || body === null) {
    throw new Error('Expected a GraphQL JSON response body.');
  }

  const errors =
    'errors' in body && Array.isArray(body.errors) ? body.errors : [];
  const first: unknown = errors[0];

  if (typeof first === 'object' && first !== null && 'message' in first) {
    return String(first.message);
  }

  return 'data' in body ? JSON.stringify(body.data) : '';
};

const signInTimes = async (
  url: string,
  count: number,
  forwardedFor: string | undefined,
): Promise<string[]> => {
  const results: string[] = [];

  for (let i = 0; i < count; i += 1) {
    // eslint-disable-next-line no-await-in-loop -- the order of attempts is the point
    results.push(await signIn(url, forwardedFor));
  }

  return results;
};

describe('Throttling behind a reverse proxy (GraphQL integration)', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('returns a Too Many Requests GraphQL error once a route limit is spent', async () => {
    const booted = await bootApp(resolveTrustProxy(undefined));
    app = booted.app;

    const results = await signInTimes(
      booted.url,
      LOGIN_LIMIT + 1,
      '203.0.113.7',
    );

    expect(results.slice(0, LOGIN_LIMIT)).toEqual(
      Array(LOGIN_LIMIT).fill('{"signIn":"signed-in"}'),
    );
    expect(results[LOGIN_LIMIT]).toMatch(/Too Many Requests/i);
  });

  it('keeps a separate budget per forwarded client IP', async () => {
    const booted = await bootApp(resolveTrustProxy(undefined));
    app = booted.app;

    await signInTimes(booted.url, LOGIN_LIMIT + 1, '203.0.113.7');

    // A different client behind the same proxy is unaffected.
    expect(await signIn(booted.url, '198.51.100.20')).toBe(
      '{"signIn":"signed-in"}',
    );
  });

  it('lumps every client into one bucket when the proxy is not trusted', async () => {
    const booted = await bootApp(resolveTrustProxy('false'));
    app = booted.app;

    await signInTimes(booted.url, LOGIN_LIMIT + 1, '203.0.113.7');

    // Without trust proxy, req.ip is the loopback peer for everyone, so the
    // "different" client is throttled too — the failure trust proxy prevents.
    expect(await signIn(booted.url, '198.51.100.20')).toMatch(
      /Too Many Requests/i,
    );
  });
});
