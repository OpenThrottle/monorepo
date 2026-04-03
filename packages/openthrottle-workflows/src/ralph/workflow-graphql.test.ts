import { describe, expect, it } from 'vitest';
import {
  buildWorkflowGraphqlHeaders,
  mapUnknownToWorkflowGraphqlError,
} from './workflow-graphql.js';

describe('buildWorkflowGraphqlHeaders', () => {
  it('merges additional headers and Bearer token', () => {
    const headers = buildWorkflowGraphqlHeaders({
      additionalHeaders: { 'X-Custom': '1' },
      graphqlUrl: undefined,
      token: 'abc',
    });

    expect(headers).toEqual({
      Authorization: 'Bearer abc',
      'X-Custom': '1',
    });
  });

  it('lets configured token win over Authorization in additionalHeaders', () => {
    const headers = buildWorkflowGraphqlHeaders({
      additionalHeaders: { Authorization: 'Bearer old' },
      graphqlUrl: undefined,
      token: 'new',
    });

    expect(headers.Authorization).toBe('Bearer new');
  });

  it('omits Authorization when token is undefined', () => {
    const headers = buildWorkflowGraphqlHeaders({
      additionalHeaders: { 'X-Foo': 'bar' },
      graphqlUrl: undefined,
      token: undefined,
    });

    expect(headers).toEqual({ 'X-Foo': 'bar' });
  });

  it('treats whitespace-only token as absent', () => {
    const headers = buildWorkflowGraphqlHeaders({
      additionalHeaders: {},
      graphqlUrl: undefined,
      token: '   ',
    });

    expect(headers.Authorization).toBeUndefined();
  });
});

describe('mapUnknownToWorkflowGraphqlError', () => {
  it('maps GraphQL errors message to GRAPHQL_ERRORS code', () => {
    const err = new Error('GraphQL errors: not found');
    const mapped = mapUnknownToWorkflowGraphqlError(err);

    expect(mapped.code).toBe('WORKFLOW_GRAPHQL_GRAPHQL_ERRORS');
    expect(mapped.message).toBe('GraphQL errors: not found');
    expect(mapped.cause).toBe(err);
  });

  it('maps HTTP status line from nodejs-graphql message', () => {
    const err = new Error(
      'openthrottle-server GraphQL error 500: Internal Server Error',
    );
    const mapped = mapUnknownToWorkflowGraphqlError(err);

    expect(mapped.code).toBe('WORKFLOW_GRAPHQL_HTTP');
    expect(mapped.httpStatus).toBe(500);
  });

  it('maps missing data message', () => {
    const err = new Error('GraphQL response missing data');
    const mapped = mapUnknownToWorkflowGraphqlError(err);

    expect(mapped.code).toBe('WORKFLOW_GRAPHQL_MISSING_DATA');
  });

  it('maps non-Error values to UNKNOWN', () => {
    const mapped = mapUnknownToWorkflowGraphqlError(42);

    expect(mapped.code).toBe('WORKFLOW_GRAPHQL_UNKNOWN');
    expect(mapped.message).toBe('42');
    expect(mapped.cause).toBeUndefined();
  });
});
