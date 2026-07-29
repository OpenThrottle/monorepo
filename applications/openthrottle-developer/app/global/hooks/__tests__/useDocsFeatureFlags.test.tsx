import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { DOCS_FEATURE_FLAG_DEFAULTS } from '~/global/config/docs-feature-flags';
import { buildPersistentSettingKey } from '~/global/config/persistent-setting-storage';
import { useDocsFeatureFlags } from '~/global/hooks/useDocsFeatureFlags';

const STORAGE_KEY = buildPersistentSettingKey('docs.featureFlags');

describe('useDocsFeatureFlags', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('resolves to defaults when nothing is stored', () => {
    const { result } = renderHook(() => useDocsFeatureFlags());

    expect(result.current[0]).toEqual(DOCS_FEATURE_FLAG_DEFAULTS);
  });

  test('reads a persisted per-user override', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DOCS_FEATURE_FLAG_DEFAULTS, search: false }),
    );

    const { result } = renderHook(() => useDocsFeatureFlags());

    expect(result.current[0].search).toBe(false);
    expect(result.current[0].toc).toBe(true);
  });

  test('setFlag merges one flag and persists it', () => {
    const { result } = renderHook(() => useDocsFeatureFlags());

    act(() => result.current[1]('toc', false));

    expect(result.current[0].toc).toBe(false);
    expect(result.current[0].search).toBe(true);

    const stored: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '{}',
    );
    expect(stored).toEqual({ ...DOCS_FEATURE_FLAG_DEFAULTS, toc: false });
  });

  test('falls back to defaults when the stored payload is malformed', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ search: 'nope' }),
    );

    const { result } = renderHook(() => useDocsFeatureFlags());

    expect(result.current[0]).toEqual(DOCS_FEATURE_FLAG_DEFAULTS);
  });
});
