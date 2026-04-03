import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildWorkflowExecuteGraphqlV2Options,
  resolveWorkflowAuthTokenFromEnv,
  resolveWorkflowGraphqlConfigFromEnv,
  resolveWorkflowGraphqlUrlOverrideFromEnv,
} from './workflow-graphql.js';

const INTERNAL_BASE = 'http://localhost:6021';

beforeEach(() => {
  process.env.API_URL_INTERNAL = INTERNAL_BASE;
  delete process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN;
  delete process.env.MCP_DEVELOPER_AUTH_TOKEN;
  delete process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL;
});

afterEach(() => {
  delete process.env.API_URL_INTERNAL;
  delete process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN;
  delete process.env.MCP_DEVELOPER_AUTH_TOKEN;
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
  it('prefers OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN over MCP_DEVELOPER_AUTH_TOKEN', () => {
    process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN = '  primary  ';
    process.env.MCP_DEVELOPER_AUTH_TOKEN = 'secondary';

    expect(resolveWorkflowAuthTokenFromEnv()).toBe('primary');
  });

  it('falls back to MCP_DEVELOPER_AUTH_TOKEN when workflows token unset', () => {
    process.env.MCP_DEVELOPER_AUTH_TOKEN = ' mcp ';

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
