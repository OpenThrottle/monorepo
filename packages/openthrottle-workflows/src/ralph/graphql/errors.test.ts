import { describe, expect, it } from 'vitest';
import { mapUnknownToWorkflowGraphqlError } from './errors.js';

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
