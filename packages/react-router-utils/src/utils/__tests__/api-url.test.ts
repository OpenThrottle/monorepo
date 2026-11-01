import { describe, expect, test } from 'vitest';

import {
  getRequestOrigin,
  isRelativeApiUrl,
  resolveApiUrl,
  toGraphqlWsUrl,
} from '../api-url';

describe('isRelativeApiUrl', () => {
  test('a path on the page origin is relative', () => {
    expect(isRelativeApiUrl('/api')).toBe(true);
  });

  test('absolute and protocol-relative URLs are not', () => {
    expect(isRelativeApiUrl('http://localhost:6021')).toBe(false);
    expect(isRelativeApiUrl('//api.example.com')).toBe(false);
  });
});

describe('resolveApiUrl', () => {
  test('resolves a relative base against the origin', () => {
    expect(resolveApiUrl('/api', 'https://mac.tail1234.ts.net')).toBe(
      'https://mac.tail1234.ts.net/api',
    );
  });

  test('ignores the page path when resolving', () => {
    expect(resolveApiUrl('/api', 'http://localhost:6020/plans/abc')).toBe(
      'http://localhost:6020/api',
    );
  });

  test('passes an absolute base through and strips trailing slashes', () => {
    expect(
      resolveApiUrl('http://localhost:6021/', 'https://developer.example.com'),
    ).toBe('http://localhost:6021');
  });

  test('returns undefined when nothing absolute is available', () => {
    expect(resolveApiUrl('/api', '/api')).toBeUndefined();
  });
});

describe('toGraphqlWsUrl', () => {
  test('a relative base on an https page becomes wss on the same host', () => {
    expect(toGraphqlWsUrl('/api', 'https://mac.tail1234.ts.net')).toBe(
      'wss://mac.tail1234.ts.net/api/graphql',
    );
  });

  test('a relative base on an http page becomes ws', () => {
    expect(toGraphqlWsUrl('/api', 'http://localhost:6020')).toBe(
      'ws://localhost:6020/api/graphql',
    );
  });

  test('an absolute base keeps its own host', () => {
    expect(
      toGraphqlWsUrl('http://localhost:6021', 'http://localhost:6020'),
    ).toBe('ws://localhost:6021/graphql');
  });
});

describe('getRequestOrigin', () => {
  test('uses the request URL when no forwarding headers are set', () => {
    const request = new Request('http://localhost:6020/plans');

    expect(getRequestOrigin(request)).toBe('http://localhost:6020');
  });

  test('prefers the first X-Forwarded-Proto and X-Forwarded-Host values', () => {
    const request = new Request('http://openthrottle-developer:3000/plans', {
      headers: {
        'x-forwarded-host': 'developer.example.com, proxy.internal',
        'x-forwarded-proto': 'https, http',
      },
    });

    expect(getRequestOrigin(request)).toBe('https://developer.example.com');
  });

  test('ignores a forwarded protocol that is not http or https', () => {
    const request = new Request('http://localhost:6020/', {
      headers: { 'x-forwarded-proto': 'javascript' },
    });

    expect(getRequestOrigin(request)).toBe('http://localhost:6020');
  });
});
