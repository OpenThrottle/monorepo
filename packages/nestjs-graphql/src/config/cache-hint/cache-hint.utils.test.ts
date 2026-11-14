import type { GraphQLResolveInfo } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import { CACHE_HINT_EXTENSION_KEY } from './cache-hint.constants.ts';
import type { CacheHint } from './cache-hint.types.ts';
import { createCacheHintPlugin, setCacheHint } from './cache-hint.utils.ts';

const HINT: CacheHint = { maxAge: 60, scope: 'PRIVATE' };

function buildInfo(extra: Record<string, unknown>): GraphQLResolveInfo {
  const info: GraphQLResolveInfo = Object.assign(Object.create(null), extra);
  return info;
}

/** An info for field `field` whose definition carries `extensions`. */
function buildFieldInfo(
  extensions: Record<string, unknown>,
  cacheControl: unknown,
): GraphQLResolveInfo {
  return buildInfo({
    cacheControl,
    fieldName: 'field',
    parentType: {
      getFields: () => {
        return { field: { extensions } };
      },
    },
  });
}

/** Drive the plugin's willResolveField hook for one field. */
async function resolveFieldThroughPlugin(
  info: GraphQLResolveInfo,
): Promise<void> {
  const plugin = createCacheHintPlugin();
  const request = await Reflect.apply(
    plugin.requestDidStart ?? (() => undefined),
    plugin,
    [{}],
  );
  const execution = await request?.executionDidStart?.(Object.create(null));

  execution?.willResolveField?.({
    args: {},
    contextValue: {},
    info,
    source: undefined,
  });
}

describe('setCacheHint', () => {
  it('forwards the hint to Apollo cacheControl when the plugin is present', () => {
    const setHint = vi.fn();
    const info = buildInfo({ cacheControl: { setCacheHint: setHint } });

    setCacheHint(info, HINT);

    expect(setHint).toHaveBeenCalledWith(HINT);
  });

  it('is a no-op without the cache-control plugin', () => {
    const info = buildInfo({});

    expect(() => {
      setCacheHint(info, HINT);
    }).not.toThrow();
  });
});

describe('createCacheHintPlugin', () => {
  describe('when the field declares a hint', () => {
    it('makes the same setCacheHint call the function makes for that hint', async () => {
      const viaPlugin = vi.fn();
      const viaFunction = vi.fn();

      await resolveFieldThroughPlugin(
        buildFieldInfo(
          { [CACHE_HINT_EXTENSION_KEY]: HINT },
          { setCacheHint: viaPlugin },
        ),
      );
      setCacheHint(
        buildInfo({ cacheControl: { setCacheHint: viaFunction } }),
        HINT,
      );

      expect(viaPlugin).toHaveBeenCalledTimes(1);
      expect(viaPlugin.mock.calls).toEqual(viaFunction.mock.calls);
    });

    it('is a no-op without the cache-control plugin', async () => {
      const info = buildFieldInfo(
        { [CACHE_HINT_EXTENSION_KEY]: HINT },
        undefined,
      );

      await expect(resolveFieldThroughPlugin(info)).resolves.toBeUndefined();
    });
  });

  describe('when the field declares no hint', () => {
    it('leaves the field untouched', async () => {
      const setHint = vi.fn();

      await resolveFieldThroughPlugin(
        buildFieldInfo({}, { setCacheHint: setHint }),
      );

      expect(setHint).not.toHaveBeenCalled();
    });

    it('ignores a malformed extension value', async () => {
      const setHint = vi.fn();

      await resolveFieldThroughPlugin(
        buildFieldInfo(
          { [CACHE_HINT_EXTENSION_KEY]: { maxAge: '60', scope: 'PRIVATE' } },
          { setCacheHint: setHint },
        ),
      );

      expect(setHint).not.toHaveBeenCalled();
    });
  });
});
