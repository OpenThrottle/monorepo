import { afterEach, describe, expect, it } from 'vitest';
import {
  resolvePlansWorkerGraphqlAuthTokenFromEnv,
  resolvePlansWorkerGraphqlUrlOverrideFromEnv,
  resolvePlansWorkerWorkflowGraphqlConfigFromEnv,
} from './worker-graphql-auth';

describe('resolvePlansWorkerGraphqlAuthTokenFromEnv', () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...snapshot };
  });

  it('prefers OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN', () => {
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN = 'worker-token';
    process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN = 'wf-token';
    process.env.MCP_DEVELOPER_AUTH_TOKEN = 'mcp-token';

    expect(resolvePlansWorkerGraphqlAuthTokenFromEnv()).toBe('worker-token');
  });

  it('falls back to OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN', () => {
    process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN = 'wf-token';
    process.env.MCP_DEVELOPER_AUTH_TOKEN = 'mcp-token';

    expect(resolvePlansWorkerGraphqlAuthTokenFromEnv()).toBe('wf-token');
  });

  it('falls back to MCP_DEVELOPER_AUTH_TOKEN', () => {
    process.env.MCP_DEVELOPER_AUTH_TOKEN = 'mcp-token';

    expect(resolvePlansWorkerGraphqlAuthTokenFromEnv()).toBe('mcp-token');
  });

  it('uses OPENTHROTTLE_WORKER_GRAPHQL_PLACEHOLDER_TOKEN when non-production and no primary', () => {
    process.env.NODE_ENV = 'development';
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_PLACEHOLDER_TOKEN = 'placeholder';

    expect(resolvePlansWorkerGraphqlAuthTokenFromEnv()).toBe('placeholder');
  });

  it('ignores OPENTHROTTLE_WORKER_GRAPHQL_PLACEHOLDER_TOKEN in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_PLACEHOLDER_TOKEN = 'placeholder';

    expect(resolvePlansWorkerGraphqlAuthTokenFromEnv()).toBeUndefined();
  });
});

describe('resolvePlansWorkerGraphqlUrlOverrideFromEnv', () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...snapshot };
  });

  it('prefers OPENTHROTTLE_WORKER_GRAPHQL_URL', () => {
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL = 'http://worker/graphql';
    process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL = 'http://wf/graphql';

    expect(resolvePlansWorkerGraphqlUrlOverrideFromEnv()).toBe(
      'http://worker/graphql',
    );
  });

  it('falls back to OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL', () => {
    process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL = 'http://wf/graphql';

    expect(resolvePlansWorkerGraphqlUrlOverrideFromEnv()).toBe(
      'http://wf/graphql',
    );
  });
});

describe('resolvePlansWorkerWorkflowGraphqlConfigFromEnv', () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...snapshot };
  });

  it('combines token and url overrides', () => {
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN = 't';
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL = 'http://localhost/g';

    expect(resolvePlansWorkerWorkflowGraphqlConfigFromEnv()).toEqual({
      graphqlUrl: 'http://localhost/g',
      token: 't',
    });
  });
});
