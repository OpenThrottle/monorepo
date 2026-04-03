import { describe, expect, it } from 'vitest';
import { buildWorkflowGraphqlHeaders } from './execute.js';

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
