import type { ApolloDriverConfig } from '@nestjs/apollo';
import {
  HEADER_APP_NAME,
  HEADER_APP_VERSION,
} from '@openthrottle/nestjs-utils';
import type { ValidationRule } from 'graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCachePlugins, buildDriverConfig } from './nestjs-graphql.module';

/**
 * Read the graphql-ws block off a built driver config, asserting the
 * subscription block is shaped the way the secure default declares it.
 */
const getGraphqlWs = (
  config: ApolloDriverConfig,
): { onConnect?: unknown; path?: string } => {
  const subscriptions = config.subscriptions;

  if (typeof subscriptions !== 'object' || subscriptions === null) {
    throw new Error('expected subscriptions to be an object');
  }

  const ws = subscriptions['graphql-ws'];

  if (typeof ws !== 'object' || ws === null) {
    throw new Error('expected graphql-ws to be an object');
  }

  return ws;
};

const getOnConnect = (config: ApolloDriverConfig): unknown =>
  getGraphqlWs(config).onConnect;

describe('buildDriverConfig — secure-default preservation', () => {
  it('keeps every secure default when forRoot passes an empty options object', () => {
    const config = buildDriverConfig({});

    expect(config.autoSchemaFile).toBe('schema.gql');
    expect(config.driver).toBeDefined();
    expect(config.formatError).toBeInstanceOf(Function);
    // The default graphql-ws onConnect auth must survive (fail-closed default).
    expect(getOnConnect(config)).toBeInstanceOf(Function);
    // CSRF prevention default carries the app-name/version request headers.
    expect(config.csrfPrevention).toEqual({
      requestHeaders: [HEADER_APP_NAME, HEADER_APP_VERSION],
    });
    // Landing-page plugin is always present.
    expect(config.plugins).toHaveLength(1);
  });

  it('preserves the default graphql-ws onConnect auth when a caller sets subscriptions only to add a path', () => {
    const config = buildDriverConfig({
      subscriptions: {
        'graphql-ws': { path: '/graphql' },
      },
    });

    expect(getGraphqlWs(config).path).toBe('/graphql');
    // The caller only added a path; the secure default onConnect must remain.
    expect(getOnConnect(config)).toBeInstanceOf(Function);
  });

  it('merges csrfPrevention per-key rather than wholesale-replacing it', () => {
    const config = buildDriverConfig({
      csrfPrevention: { requestHeaders: ['x-custom'] },
    });

    expect(config.csrfPrevention).toEqual({ requestHeaders: ['x-custom'] });
  });

  it('lets a caller override a scalar default (autoSchemaFile) while keeping the rest', () => {
    const config = buildDriverConfig({ autoSchemaFile: 'custom.gql' });

    expect(config.autoSchemaFile).toBe('custom.gql');
    expect(getOnConnect(config)).toBeInstanceOf(Function);
  });
});

describe('buildDriverConfig — validation rules / maxDepth', () => {
  it('applies a default depth-limit rule when maxDepth is omitted', () => {
    const config = buildDriverConfig({});

    expect(config.validationRules).toHaveLength(1);
  });

  it('disables depth limiting when maxDepth <= 0', () => {
    const config = buildDriverConfig({ maxDepth: 0 });

    expect(config.validationRules).toHaveLength(0);
  });

  it('appends the depth-limit rule after caller-supplied validationRules', () => {
    const userRule: ValidationRule = () => ({});
    const config = buildDriverConfig({
      maxDepth: 5,
      validationRules: [userRule],
    });

    expect(config.validationRules).toHaveLength(2);
    expect(config.validationRules?.[0]).toBe(userRule);
  });
});

describe('buildDriverConfig — plugin assembly order', () => {
  it('keeps only the default landing-page plugin when no cache or user plugins are given', () => {
    const config = buildDriverConfig({});

    expect(config.plugins).toHaveLength(1);
  });

  it('appends user plugins after the default landing-page plugin', () => {
    const userPlugin = {};
    const config = buildDriverConfig({ plugins: [userPlugin] });

    expect(config.plugins).toHaveLength(2);
    // landing-page default first, user plugin last.
    expect(config.plugins?.[1]).toBe(userPlugin);
  });

  it('orders plugins as [default, ...cache, ...user] when cachePlugins and user plugins are both set', () => {
    const userPlugin = {};
    const config = buildDriverConfig({
      cachePlugins: { cacheControl: true, responseCache: true },
      plugins: [userPlugin],
    });

    // 1 landing-page default + 2 cache plugins + 1 user plugin.
    expect(config.plugins).toHaveLength(4);
    // User plugin is appended last, after the cache plugins.
    expect(config.plugins?.[config.plugins.length - 1]).toBe(userPlugin);
  });
});

describe('buildCachePlugins', () => {
  it('returns no plugins when nothing is enabled', () => {
    expect(buildCachePlugins({})).toHaveLength(0);
  });

  it('returns only the cache-control plugin when only cacheControl is enabled', () => {
    expect(buildCachePlugins({ cacheControl: true })).toHaveLength(1);
  });

  it('returns only the response-cache plugin when only responseCache is enabled', () => {
    expect(buildCachePlugins({ responseCache: true })).toHaveLength(1);
  });

  it('assembles cache-control before response-cache when both are enabled', () => {
    const plugins = buildCachePlugins({
      cacheControl: true,
      responseCache: true,
    });

    expect(plugins).toHaveLength(2);
  });
});

describe('introspection default — env gating (evaluated at module load)', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalIntrospection = process.env.GRAPHQL_INTROSPECTION;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalIntrospection === undefined) {
      delete process.env.GRAPHQL_INTROSPECTION;
    } else {
      process.env.GRAPHQL_INTROSPECTION = originalIntrospection;
    }
    vi.resetModules();
  });

  it('defaults introspection on outside production', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.GRAPHQL_INTROSPECTION;

    const mod = await import('./nestjs-graphql.module');
    const config = mod.buildDriverConfig({});

    expect(config.introspection).toBe(true);
  });

  it('defaults introspection off in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.GRAPHQL_INTROSPECTION;

    const mod = await import('./nestjs-graphql.module');
    const config = mod.buildDriverConfig({});

    expect(config.introspection).toBe(false);
  });

  it('force-enables introspection in production when GRAPHQL_INTROSPECTION=true', async () => {
    process.env.NODE_ENV = 'production';
    process.env.GRAPHQL_INTROSPECTION = 'true';

    const mod = await import('./nestjs-graphql.module');
    const config = mod.buildDriverConfig({});

    expect(config.introspection).toBe(true);
  });
});
