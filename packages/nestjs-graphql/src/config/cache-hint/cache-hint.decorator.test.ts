import type { AddressInfo } from 'node:net';

import { ApolloServerPluginCacheControlDisabled } from '@apollo/server/plugin/disabled';
import type { ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloDriver } from '@nestjs/apollo';
import type { INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import {
  Field,
  GraphQLModule,
  Int,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { buildCachePlugins } from '../../nestjs-graphql.utils.ts';
import { CacheHint } from './cache-hint.decorator.ts';
import { createCacheHintPlugin } from './cache-hint.utils.ts';

/**
 * Boots a real Nest + Apollo app and reads the `cache-control` response header,
 * because the two ways this breaks are both silent: the hint plugin ordered
 * after the cache-control plugin, and a hint Nest drops while building the
 * schema. Either one serves `no-store` with no error.
 */

const HINT: CacheHint = { maxAge: 60, scope: 'PRIVATE' };

@ObjectType()
class CacheHintLeaf {
  @Field(() => Int)
  value!: number;
}

@ObjectType()
class CacheHintRoot {
  @Field(() => [CacheHintLeaf])
  @CacheHint(HINT)
  hinted!: CacheHintLeaf[];

  @Field(() => [CacheHintLeaf])
  unhinted!: CacheHintLeaf[];

  /** Declared here AND resolved by a hinted `@ResolveField` below. */
  @Field(() => [CacheHintLeaf])
  shadowed!: CacheHintLeaf[];
}

const LEAVES: CacheHintLeaf[] = [{ value: 1 }];

@Resolver(() => CacheHintRoot)
class CacheHintRootResolver {
  @Query(() => CacheHintRoot)
  @CacheHint(HINT)
  cacheHintRoot(): CacheHintRoot {
    return { hinted: LEAVES, shadowed: LEAVES, unhinted: LEAVES };
  }

  @Query(() => CacheHintRoot)
  cacheHintUndecorated(): CacheHintRoot {
    return { hinted: LEAVES, shadowed: LEAVES, unhinted: LEAVES };
  }

  /** A field only this resolver declares, so its extensions survive. */
  @ResolveField(() => [CacheHintLeaf])
  @CacheHint(HINT)
  resolved(): CacheHintLeaf[] {
    return LEAVES;
  }

  @ResolveField(() => [CacheHintLeaf])
  @CacheHint(HINT)
  shadowed(@Parent() root: CacheHintRoot): CacheHintLeaf[] {
    return root.shadowed;
  }
}

interface BootedApp {
  readonly app: INestApplication;
  readonly url: string;
}

interface GraphqlReply {
  readonly body: unknown;
  readonly cacheControl: string | null;
}

const bootApp = async (
  plugins: NonNullable<ApolloDriverConfig['plugins']>,
): Promise<BootedApp> => {
  @Module({
    imports: [
      GraphQLModule.forRoot<ApolloDriverConfig>({
        autoSchemaFile: true,
        driver: ApolloDriver,
        plugins,
      }),
    ],
    providers: [CacheHintRootResolver],
  })
  class CacheHintFixtureModule {}

  const moduleRef = await Test.createTestingModule({
    imports: [CacheHintFixtureModule],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });

  await app.listen(0);

  const address: string | AddressInfo | null = app.getHttpServer().address();

  if (address === null || typeof address === 'string') {
    throw new Error('Expected the cache-hint test server to bind a TCP port.');
  }

  return { app, url: `http://127.0.0.1:${address.port}/graphql` };
};

const query = async (url: string, document: string): Promise<GraphqlReply> => {
  const response = await fetch(url, {
    body: JSON.stringify({ query: document }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  const body: unknown = await response.json();

  return { body, cacheControl: response.headers.get('cache-control') };
};

describe('@CacheHint', () => {
  let booted: BootedApp | undefined;

  afterEach(async () => {
    await booted?.app.close();
    booted = undefined;
  });

  describe('with cachePlugins.cacheControl', () => {
    const boot = async (): Promise<BootedApp> => {
      booted = await bootApp(buildCachePlugins({ cacheControl: true }));
      return booted;
    };

    it('applies on a Query and on its hinted object-typed @Field', async () => {
      const { url } = await boot();

      const reply = await query(url, '{ cacheHintRoot { hinted { value } } }');

      expect(reply.cacheControl).toBe('max-age=60, private');
    });

    it('applies on a @ResolveField the object type does not declare', async () => {
      const { url } = await boot();

      const reply = await query(
        url,
        '{ cacheHintRoot { resolved { value } } }',
      );

      expect(reply.cacheControl).toBe('max-age=60, private');
    });

    it('leaves an undecorated root field at the uncacheable default', async () => {
      const { url } = await boot();

      const reply = await query(
        url,
        '{ cacheHintUndecorated { hinted { value } } }',
      );

      expect(reply.cacheControl).toBe('no-store');
    });

    it('leaves an undecorated object-typed child at the uncacheable default', async () => {
      const { url } = await boot();

      const reply = await query(
        url,
        '{ cacheHintRoot { unhinted { value } } }',
      );

      expect(reply.cacheControl).toBe('no-store');
    });

    // Pins the @nestjs/graphql >= 14.2 behavior: when the model already declares
    // the @Field, the resolver method's extensions now win over the model's
    // (empty) ones. Before 14.2 Nest dropped them and this served `no-store`. If
    // this regresses to `no-store`, restore the "hint the @Field instead"
    // guidance on CacheHint.
    it('applies on a @ResolveField whose object type declares the @Field', async () => {
      const { url } = await boot();

      const reply = await query(
        url,
        '{ cacheHintRoot { shadowed { value } } }',
      );

      expect(reply.cacheControl).toBe('max-age=60, private');
    });
  });

  describe('without the cache-control plugin', () => {
    it('resolves normally and sets no cache policy', async () => {
      booted = await bootApp([
        createCacheHintPlugin(),
        ApolloServerPluginCacheControlDisabled(),
      ]);

      const reply = await query(
        booted.url,
        '{ cacheHintRoot { hinted { value } } }',
      );

      expect(reply.body).toEqual({
        data: { cacheHintRoot: { hinted: [{ value: 1 }] } },
      });
      expect(reply.cacheControl).toBeNull();
    });
  });
});
