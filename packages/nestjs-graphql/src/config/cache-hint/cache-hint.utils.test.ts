import type { GraphQLResolveInfo } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import { setCacheHint } from './cache-hint.utils.ts';

function buildInfo(extra: Record<string, unknown>): GraphQLResolveInfo {
  const info: GraphQLResolveInfo = Object.assign(Object.create(null), extra);
  return info;
}

describe('setCacheHint', () => {
  it('forwards the hint to Apollo cacheControl when the plugin is present', () => {
    const setHint = vi.fn();
    const info = buildInfo({ cacheControl: { setCacheHint: setHint } });

    setCacheHint(info, { maxAge: 60, scope: 'PRIVATE' });

    expect(setHint).toHaveBeenCalledWith({ maxAge: 60, scope: 'PRIVATE' });
  });

  it('is a no-op without the cache-control plugin', () => {
    const info = buildInfo({});

    expect(() => {
      setCacheHint(info, { maxAge: 60, scope: 'PRIVATE' });
    }).not.toThrow();
  });
});
