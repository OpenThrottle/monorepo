import * as React from 'react';
import {
  getPersistentSettingSnapshot,
  subscribePersistentSetting,
  writePersistentSetting,
} from '~/global/config/persistent-setting-storage';

/** Accepts any parsed value as `T` — the permissive default validator. */
const acceptAny = <T>(_value: unknown): _value is T => true;

/** Narrows a setter argument to the functional-updater form. */
const isUpdaterFn = <T>(value: T | ((prev: T) => T)): value is (prev: T) => T =>
  typeof value === 'function';

export type PersistentSettingSetter<T> = (next: T | ((prev: T) => T)) => void;

/**
 * @public
 * @description Typed, SSR-safe persisted UI setting backed by localStorage.
 * `usePersistentSetting('plans.tasksView', 'list')` returns a `[value, setValue]`
 * tuple whose value survives reloads, navigation, and cross-tab writes.
 *
 * SSR: the value is `defaultValue` on the server and the first client render
 * (via `getServerSnapshot`), then reconciles to the stored value after mount —
 * so there is no hydration mismatch. Pass an optional `isValid` type guard to
 * reject malformed stored data (falls back to `defaultValue`). Keys are
 * namespaced by the store, so pass a dotted feature path as `name`.
 */
export const usePersistentSetting = <T>(
  name: string,
  defaultValue: T,
  isValid: (value: unknown) => value is T = acceptAny,
): readonly [T, PersistentSettingSetter<T>] => {
  const subscribe = React.useCallback(
    (onChange: () => void) => subscribePersistentSetting(name, onChange),
    [name],
  );

  const getSnapshot = React.useCallback(
    () => getPersistentSettingSnapshot(name, isValid, defaultValue),
    [name, isValid, defaultValue],
  );

  const getServerSnapshot = React.useCallback(
    () => defaultValue,
    [defaultValue],
  );

  const value = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setValue = React.useCallback<PersistentSettingSetter<T>>(
    (next) => {
      const resolved = isUpdaterFn(next)
        ? next(getPersistentSettingSnapshot(name, isValid, defaultValue))
        : next;
      writePersistentSetting(name, resolved);
    },
    [name, isValid, defaultValue],
  );

  return [value, setValue];
};
