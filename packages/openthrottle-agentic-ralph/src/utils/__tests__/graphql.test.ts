import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GraphqlV2Failure } from '../graphql.ts';
import {
  buildWorkflowExecuteGraphqlV2Options,
  resolveWorkflowAuthTokenFromEnv,
  resolveWorkflowGraphqlConfigFromEnv,
  resolveWorkflowGraphqlUrlOverrideFromEnv,
  unwrapWorkflowGraphqlResult,
  WorkflowGraphqlError,
} from '../graphql.ts';

const INTERNAL_BASE = 'http://localhost:6021';

beforeEach(() => {
  process.env.API_URL_INTERNAL = INTERNAL_BASE;
  delete process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN;
  delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  delete process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL;
});

afterEach(() => {
  delete process.env.API_URL_INTERNAL;
  delete process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN;
  delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  delete process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL;
});

describe('buildWorkflowExecuteGraphqlV2Options', () => {
  it('uses graphqlUrl override when set', () => {
    const opts = buildWorkflowExecuteGraphqlV2Options({
      graphqlUrl: 'https://custom.example/graphql',
      token: 'abc',
    });

    expect(opts).toEqual({
      token: 'abc',
      url: 'https://custom.example/graphql',
    });
  });

  it('uses getGraphQLUrl when graphqlUrl is unset', () => {
    const opts = buildWorkflowExecuteGraphqlV2Options({
      token: undefined,
    });

    expect(opts).toEqual({ url: `${INTERNAL_BASE}/graphql` });
  });

  it('merges additionalHeaders and token', () => {
    const opts = buildWorkflowExecuteGraphqlV2Options({
      additionalHeaders: { 'X-Custom': '1' },
      token: 'abc',
    });

    expect(opts).toEqual({
      headers: { 'X-Custom': '1' },
      token: 'abc',
      url: `${INTERNAL_BASE}/graphql`,
    });
  });

  it('omits token when undefined or whitespace-only', () => {
    expect(
      buildWorkflowExecuteGraphqlV2Options({
        additionalHeaders: {},
        token: undefined,
      }),
    ).toEqual({ url: `${INTERNAL_BASE}/graphql` });

    expect(
      buildWorkflowExecuteGraphqlV2Options({
        token: '   ',
      }),
    ).toEqual({ url: `${INTERNAL_BASE}/graphql` });
  });

  it('omits headers when additionalHeaders is empty or absent', () => {
    expect(
      buildWorkflowExecuteGraphqlV2Options({
        additionalHeaders: {},
        token: 't',
      }),
    ).toEqual({
      token: 't',
      url: `${INTERNAL_BASE}/graphql`,
    });
  });
});

describe('resolveWorkflowAuthTokenFromEnv', () => {
  it('prefers OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN over OPENTHROTTLE_MCP_AUTH_TOKEN', () => {
    process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN = '  primary  ';
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'secondary';

    expect(resolveWorkflowAuthTokenFromEnv()).toBe('primary');
  });

  it('falls back to OPENTHROTTLE_MCP_AUTH_TOKEN when workflows token unset', () => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = ' mcp ';

    expect(resolveWorkflowAuthTokenFromEnv()).toBe('mcp');
  });

  it('returns undefined when no token or whitespace-only', () => {
    expect(resolveWorkflowAuthTokenFromEnv()).toBeUndefined();

    process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN = '   ';

    expect(resolveWorkflowAuthTokenFromEnv()).toBeUndefined();
  });
});

describe('resolveWorkflowGraphqlUrlOverrideFromEnv', () => {
  it('returns trimmed URL when set', () => {
    process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL = '  https://g.example/q  ';

    expect(resolveWorkflowGraphqlUrlOverrideFromEnv()).toBe(
      'https://g.example/q',
    );
  });

  it('returns undefined when unset or blank', () => {
    expect(resolveWorkflowGraphqlUrlOverrideFromEnv()).toBeUndefined();

    process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL = '  ';

    expect(resolveWorkflowGraphqlUrlOverrideFromEnv()).toBeUndefined();
  });
});

describe('resolveWorkflowGraphqlConfigFromEnv', () => {
  it('combines token and graphql URL override from env', () => {
    process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN = 'tok';
    process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL = 'https://x/graphql';

    expect(resolveWorkflowGraphqlConfigFromEnv()).toEqual({
      graphqlUrl: 'https://x/graphql',
      token: 'tok',
    });
  });

  it('omits graphqlUrl when env override blank', () => {
    process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL = '';

    expect(resolveWorkflowGraphqlConfigFromEnv()).toEqual({
      graphqlUrl: undefined,
      token: undefined,
    });
  });
});

const httpFailure: GraphqlV2Failure = {
  cause: undefined,
  graphqlErrors: [{ message: 'Unauthorized' }],
  graphqlPath: undefined,
  httpStatus: 401,
  kind: 'http',
  message: 'Unauthorized',
};

describe('unwrapWorkflowGraphqlResult', () => {
  it('returns data on an ok result', () => {
    expect(
      unwrapWorkflowGraphqlResult({ data: { serverHealth: 'ok' }, ok: true }),
    ).toEqual({ serverHealth: 'ok' });
  });

  it('throws WorkflowGraphqlError preserving the structured failure on an err result', () => {
    try {
      unwrapWorkflowGraphqlResult({ error: httpFailure, ok: false });
      expect.unreachable('unwrap should have thrown on an err result');
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowGraphqlError);

      if (error instanceof WorkflowGraphqlError) {
        expect(error.failure.kind).toBe('http');
        expect(error.failure.httpStatus).toBe(401);
        expect(error.failure.graphqlErrors).toEqual([
          { message: 'Unauthorized' },
        ]);
        expect(error.message).toBe('Unauthorized');
      }
    }
  });
});

describe('WorkflowGraphqlError', () => {
  it('defaults message to the failure message and keeps the failure inspectable', () => {
    const error = new WorkflowGraphqlError(httpFailure);

    expect(error.name).toBe('WorkflowGraphqlError');
    expect(error.message).toBe('Unauthorized');
    expect(error.failure).toBe(httpFailure);
  });

  it('uses the override message when provided while preserving the failure', () => {
    const error = new WorkflowGraphqlError(httpFailure, 'preflight failed');

    expect(error.message).toBe('preflight failed');
    expect(error.failure.kind).toBe('http');
  });
});
