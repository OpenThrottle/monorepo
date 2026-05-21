import { afterEach, describe, expect, it } from 'vitest';
import { resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv } from './agentic-ralph-worker-graphql-auth';

describe('resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv (auth token)', () => {
  const snapshot = { ...process.env };

  const clearAuthTokenEnv = (): void => {
    delete process.env.OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN;
    delete process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN;
    delete process.env.MCP_DEVELOPER_AUTH_TOKEN;
    delete process.env.OPENTHROTTLE_WORKER_GRAPHQL_PLACEHOLDER_TOKEN;
  };

  afterEach(() => {
    process.env = { ...snapshot };
  });

  it('prefers OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN', () => {
    clearAuthTokenEnv();
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN = 'worker-token';
    process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN = 'wf-token';
    process.env.MCP_DEVELOPER_AUTH_TOKEN = 'mcp-token';

    expect(resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv().token).toBe(
      'worker-token',
    );
  });

  it('falls back to OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN', () => {
    clearAuthTokenEnv();
    process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN = 'wf-token';
    process.env.MCP_DEVELOPER_AUTH_TOKEN = 'mcp-token';

    expect(resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv().token).toBe(
      'wf-token',
    );
  });

  it('falls back to MCP_DEVELOPER_AUTH_TOKEN', () => {
    clearAuthTokenEnv();
    process.env.MCP_DEVELOPER_AUTH_TOKEN = 'mcp-token';

    expect(resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv().token).toBe(
      'mcp-token',
    );
  });

  it('uses OPENTHROTTLE_WORKER_GRAPHQL_PLACEHOLDER_TOKEN when non-production and no primary', () => {
    clearAuthTokenEnv();
    process.env.NODE_ENV = 'development';
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_PLACEHOLDER_TOKEN = 'placeholder';

    expect(resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv().token).toBe(
      'placeholder',
    );
  });

  it('ignores OPENTHROTTLE_WORKER_GRAPHQL_PLACEHOLDER_TOKEN in production', () => {
    clearAuthTokenEnv();
    process.env.NODE_ENV = 'production';
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_PLACEHOLDER_TOKEN = 'placeholder';

    expect(
      resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv().token,
    ).toBeUndefined();
  });
});

describe('resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv (graphql url)', () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...snapshot };
  });

  it('prefers OPENTHROTTLE_WORKER_GRAPHQL_URL', () => {
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL = 'http://worker/graphql';
    process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL = 'http://wf/graphql';

    expect(
      resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv().graphqlUrl,
    ).toBe('http://worker/graphql');
  });

  it('falls back to OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL', () => {
    process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL = 'http://wf/graphql';

    expect(
      resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv().graphqlUrl,
    ).toBe('http://wf/graphql');
  });
});

describe('resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv', () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...snapshot };
  });

  it('combines token and url overrides', () => {
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN = 't';
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL = 'http://localhost/g';

    expect(resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv()).toEqual({
      graphqlUrl: 'http://localhost/g',
      token: 't',
    });
  });
});
