import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { buildPersistentSettingKey } from '~/global/config/persistent-setting-storage';
import { usePersistentSetting } from '~/global/hooks/usePersistentSetting';

type View = 'list' | 'table';
const isView = (value: unknown): value is View =>
  value === 'list' || value === 'table';

describe('usePersistentSetting', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('returns the default when nothing is stored', () => {
    const { result } = renderHook(() =>
      usePersistentSetting<View>('t.default', 'list', isView),
    );

    expect(result.current[0]).toBe('list');
  });

  test('persists under a namespaced key and restores across mounts', () => {
    const { result, unmount } = renderHook(() =>
      usePersistentSetting<View>('t.persist', 'list', isView),
    );

    act(() => result.current[1]('table'));

    expect(result.current[0]).toBe('table');
    expect(
      window.localStorage.getItem(buildPersistentSettingKey('t.persist')),
    ).toBe('"table"');

    unmount();

    const second = renderHook(() =>
      usePersistentSetting<View>('t.persist', 'list', isView),
    );
    expect(second.result.current[0]).toBe('table');
  });

  test('falls back to the default when the stored value fails validation', () => {
    window.localStorage.setItem(
      buildPersistentSettingKey('t.invalid'),
      JSON.stringify('nope'),
    );

    const { result } = renderHook(() =>
      usePersistentSetting<View>('t.invalid', 'list', isView),
    );

    expect(result.current[0]).toBe('list');
  });

  test('supports a functional updater', () => {
    const { result } = renderHook(() =>
      usePersistentSetting<number>('t.count', 0),
    );

    act(() => result.current[1]((prev) => prev + 1));
    act(() => result.current[1]((prev) => prev + 1));

    expect(result.current[0]).toBe(2);
  });

  test('reacts to a cross-tab storage event', () => {
    const { result } = renderHook(() =>
      usePersistentSetting<View>('t.cross', 'list', isView),
    );
    const key = buildPersistentSettingKey('t.cross');

    act(() => {
      window.localStorage.setItem(key, JSON.stringify('table'));
      window.dispatchEvent(
        new StorageEvent('storage', {
          key,
          newValue: JSON.stringify('table'),
        }),
      );
    });

    expect(result.current[0]).toBe('table');
  });
});
