import { describe, expect, test } from 'vitest';
import {
  DOCS_FEATURE_FLAG_DEFAULTS,
  DOCS_FEATURE_FLAG_KEYS,
  isDocsFeatureFlags,
} from '~/global/config/docs-feature-flags';

describe('docs-feature-flags', () => {
  test('every upgrade defaults on', () => {
    expect(Object.values(DOCS_FEATURE_FLAG_DEFAULTS).every(Boolean)).toBe(true);
  });

  test('keys cover exactly the default object', () => {
    expect([...DOCS_FEATURE_FLAG_KEYS].sort()).toEqual(
      Object.keys(DOCS_FEATURE_FLAG_DEFAULTS).sort(),
    );
  });

  describe('isDocsFeatureFlags', () => {
    test('accepts a fully-populated boolean object', () => {
      expect(isDocsFeatureFlags(DOCS_FEATURE_FLAG_DEFAULTS)).toBe(true);
      expect(
        isDocsFeatureFlags({
          codeCopy: false,
          landing: true,
          prevNext: false,
          search: true,
          toc: false,
        }),
      ).toBe(true);
    });

    test('ignores unknown extra keys (forward-compatible)', () => {
      expect(
        isDocsFeatureFlags({ ...DOCS_FEATURE_FLAG_DEFAULTS, future: true }),
      ).toBe(true);
    });

    test('rejects a missing key', () => {
      const { toc: _toc, ...withoutToc } = DOCS_FEATURE_FLAG_DEFAULTS;
      expect(isDocsFeatureFlags(withoutToc)).toBe(false);
    });

    test('rejects a non-boolean flag', () => {
      expect(
        isDocsFeatureFlags({ ...DOCS_FEATURE_FLAG_DEFAULTS, search: 'yes' }),
      ).toBe(false);
    });

    test('rejects non-objects', () => {
      expect(isDocsFeatureFlags(null)).toBe(false);
      expect(isDocsFeatureFlags('nope')).toBe(false);
      expect(isDocsFeatureFlags(42)).toBe(false);
    });
  });
});
