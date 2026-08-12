import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  buildPersistentSettingKey,
  getPersistentSettingSnapshot,
  subscribePersistentSetting,
  writePersistentSetting,
} from './persistent-setting-storage';

type View = 'list' | 'table';
const isView = (value: unknown): value is View =>
  value === 'list' || value === 'table';

describe('persistent-setting-storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('buildPersistentSettingKey namespaces the setting name', () => {
    expect(buildPersistentSettingKey('plans.tasksView')).toBe(
      'openthrottle-developer:setting:plans.tasksView',
    );
  });

  test('getPersistentSettingSnapshot returns the fallback when unset', () => {
    expect(getPersistentSettingSnapshot('t.unset', isView, 'list')).toBe(
      'list',
    );
  });

  test('reads and validates a stored value, falling back on invalid data', () => {
    writePersistentSetting<View>('t.stored', 'table');
    expect(getPersistentSettingSnapshot('t.stored', isView, 'list')).toBe(
      'table',
    );

    window.localStorage.setItem(
      buildPersistentSettingKey('t.bad'),
      JSON.stringify('nope'),
    );
    expect(getPersistentSettingSnapshot('t.bad', isView, 'list')).toBe('list');

    window.localStorage.setItem(
      buildPersistentSettingKey('t.malformed'),
      '{not json',
    );
    expect(getPersistentSettingSnapshot('t.malformed', isView, 'list')).toBe(
      'list',
    );
  });

  test('returns a referentially-stable snapshot for object values', () => {
    const isObj = (value: unknown): value is { open: boolean } =>
      typeof value === 'object' && value !== null && 'open' in value;
    writePersistentSetting('t.obj', { open: true });

    const first = getPersistentSettingSnapshot('t.obj', isObj, { open: false });
    const second = getPersistentSettingSnapshot('t.obj', isObj, {
      open: false,
    });

    expect(first).toBe(second);
  });

  test('subscribePersistentSetting notifies on same-tab writes until unsubscribed', () => {
    const listener = vi.fn();
    const unsubscribe = subscribePersistentSetting('t.sub', listener);

    writePersistentSetting<View>('t.sub', 'table');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    writePersistentSetting<View>('t.sub', 'list');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
