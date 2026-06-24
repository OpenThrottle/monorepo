import type { AddressInfo } from 'node:net';
import { type INestApplication, Module } from '@nestjs/common';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule, Query, Resolver } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { NestjsThrottlerModule } from './nestjs-throttler.module';

/**
 * GraphQL integration coverage for the wired global {@link NestjsThrottlerModule}.
 *
 * Regression guard for the GraphQL/throttler gap: the stock `ThrottlerGuard`
 * resolves the request via `context.switchToHttp()`, which is `undefined` under
 * GraphQL, so `getTracker` threw `Cannot read properties of undefined (reading
 * 'ip')` on every GraphQL operation. {@link GqlThrottlerGuard} reads the request
 * from the GraphQL context instead, so queries succeed and are throttled by IP.
 *
 * The HTTP-only suite ({@link ./nestjs-throttler.integration.test.ts}) cannot
 * exercise this path — these tests boot a real Apollo GraphQL server.
 */

@Resolver()
class HealthResolver {
  @Query(() => String)
  serverHealth(): string {
    return 'ok';
  }
}

const LIMIT = 3;
const TTL_MS = 60_000;

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: true,
      // Mirror the server: HTTP requests carry identity on `req`.
      context: (ctx: { req?: unknown }) => ({ req: ctx.req }),
      driver: ApolloDriver,
      path: '/graphql',
    }),
    HealthResolver,
    NestjsThrottlerModule.forRoot({
      throttlers: [{ limit: LIMIT, ttl: TTL_MS }],
    }),
  ],
  providers: [HealthResolver],
})
class GqlModule {}

interface BootedApp {
  readonly app: INestApplication;
  readonly url: string;
}

const bootApp = async (): Promise<BootedApp> => {
  const moduleRef = await Test.createTestingModule({
    imports: [GqlModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  await app.init();
  await app.listen(0);

  const address: string | AddressInfo | null = app.getHttpServer().address();

  if (address === null || typeof address === 'string') {
    throw new Error('Expected the throttler test server to bind a TCP port.');
  }

  return { app, url: `http://127.0.0.1:${address.port}` };
};

interface GraphqlResult {
  readonly data?: { readonly serverHealth?: string } | null;
  readonly errors?: ReadonlyArray<{ readonly message: string }>;
}

const isGraphqlResult = (value: unknown): value is GraphqlResult =>
  typeof value === 'object' && value !== null;

const queryHealth = async (
  url: string,
): Promise<{ readonly body: GraphqlResult; readonly status: number }> => {
  const response = await fetch(`${url}/graphql`, {
    body: JSON.stringify({ query: '{ serverHealth }' }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  const body: unknown = await response.json();

  if (!isGraphqlResult(body)) {
    throw new Error('Expected a GraphQL JSON response body.');
  }

  return { body, status: response.status };
};

describe('NestjsThrottlerModule (GraphQL integration)', () => {
  let booted: BootedApp | undefined;

  afterEach(async () => {
    if (booted !== undefined) {
      await booted.app.close();
      booted = undefined;
    }
  });

  it('resolves a GraphQL query without the undefined-req crash', async () => {
    booted = await bootApp();

    const { body } = await queryHealth(booted.url);

    // The pre-fix bug surfaced here as: "Cannot read properties of undefined
    // (reading 'ip')". The guard must read `req` from the GraphQL context.
    expect(body.errors).toBeUndefined();
    expect(body.data?.serverHealth).toBe('ok');
  });

  it('throttles GraphQL operations once the limit is exceeded', async () => {
    booted = await bootApp();

    const messages: string[] = [];
    for (let i = 0; i < LIMIT * 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const { body } = await queryHealth(booted.url);
      messages.push(body.errors?.[0]?.message ?? body.data?.serverHealth ?? '');
    }

    // Early calls succeed, later ones are throttled — and never with the
    // undefined-`ip` TypeError.
    expect(messages[0]).toBe('ok');
    expect(messages.some((message) => /Too Many Requests/i.test(message))).toBe(
      true,
    );
    expect(messages.some((message) => /reading 'ip'/.test(message))).toBe(
      false,
    );
  });
});
