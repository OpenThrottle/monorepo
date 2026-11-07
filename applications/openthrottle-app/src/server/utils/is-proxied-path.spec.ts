import { isGraphqlSocketPath, isProxiedPath } from './is-proxied-path.ts';

describe('isProxiedPath', () => {
  it.each(['/graphql', '/graphql?x=1', '/health', '/graphql/sub'])(
    'proxies %s',
    (url) => {
      expect(isProxiedPath(url)).toBe(true);
    },
  );

  it.each(['/', '/auth', '/graphql-docs', '/healthz', '/plans/graphql'])(
    'leaves %s to the developer app',
    (url) => {
      expect(isProxiedPath(url)).toBe(false);
    },
  );

  it('ignores a missing url', () => {
    expect(isProxiedPath(undefined)).toBe(false);
  });
});

describe('isGraphqlSocketPath', () => {
  it('accepts only /graphql', () => {
    expect(isGraphqlSocketPath('/graphql')).toBe(true);
    expect(isGraphqlSocketPath('/graphql?a=b')).toBe(true);
    expect(isGraphqlSocketPath('/health')).toBe(false);
    expect(isGraphqlSocketPath(undefined)).toBe(false);
  });
});
