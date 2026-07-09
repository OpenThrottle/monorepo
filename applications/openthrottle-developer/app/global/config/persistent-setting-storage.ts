import { IS_BROWSER } from '@openthrottle/react-router-utils';

/**
 * @description Namespace prefix for persisted per-user UI settings in the
 * developer app. Keys are dotted feature paths (e.g. `plans.tasksView`,
 * `ui.theme`) so features partition cleanly and a future server-backed adapter
 * can sync a subset by prefix.
 */
const PERSISTENT_SETTING_KEY_PREFIX = 'openthrottle-developer:setting:';

/** Builds the namespaced localStorage key for a setting name. */
export const buildPersistentSettingKey = (name: string): string =>
  `${PERSISTENT_SETTING_KEY_PREFIX}${name}`;

/**
 * Per-key snapshot cache. `useSyncExternalStore` requires `getSnapshot` to
 * return a referentially-stable value when nothing changed; we key the cache on
 * the raw stored string so object values keep a stable identity across renders.
 */
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();

const listenersByKey = new Map<string, Set<() => void>>();
let windowListenerAttached = false;

const notify = (key: string): void => {
  const listeners = listenersByKey.get(key);
  if (listeners == null) {
    return;
  }
  for (const listener of listeners) {
    listener();
  }
};

const onStorageEvent = (event: StorageEvent): void => {
  if (event.key == null) {
    return;
  }
  // Drop the stale cache entry so the next snapshot re-reads the new value.
  snapshotCache.delete(event.key);
  notify(event.key);
};

/**
 * @description Reads and validates a persisted setting, returning a
 * referentially-stable snapshot. Returns `fallback` on the server, when unset,
 * on invalid JSON, or when the stored value fails `isValid`.
 */
export const getPersistentSettingSnapshot = <T>(
  name: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
): T => {
  if (!IS_BROWSER) {
    return fallback;
  }

  const key = buildPersistentSettingKey(name);

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }

  const cached = snapshotCache.get(key);
  if (cached != null && cached.raw === raw && isValid(cached.value)) {
    return cached.value;
  }

  let value: T = fallback;
  if (raw !== null) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isValid(parsed)) {
        value = parsed;
      }
    } catch {
      value = fallback;
    }
  }

  snapshotCache.set(key, { raw, value });
  return value;
};

/**
 * @description Persists a setting value (JSON) and notifies same-tab
 * subscribers. No-op on the server or when storage throws (quota, private mode).
 */
export const writePersistentSetting = <T>(name: string, value: T): void => {
  if (!IS_BROWSER) {
    return;
  }

  const key = buildPersistentSettingKey(name);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    snapshotCache.delete(key);
    notify(key);
  } catch {
    // QuotaExceededError, private mode, etc.
  }
};

/**
 * @description Subscribes `listener` to changes for a setting (same-tab writes
 * and cross-tab `storage` events). Returns an unsubscribe function; the window
 * listener detaches when the last subscriber leaves.
 */
export const subscribePersistentSetting = (
  name: string,
  listener: () => void,
): (() => void) => {
  if (!IS_BROWSER) {
    return () => {};
  }

  const key = buildPersistentSettingKey(name);
  let listeners = listenersByKey.get(key);
  if (listeners == null) {
    listeners = new Set();
    listenersByKey.set(key, listeners);
  }
  listeners.add(listener);

  if (!windowListenerAttached) {
    window.addEventListener('storage', onStorageEvent);
    windowListenerAttached = true;
  }

  return () => {
    const current = listenersByKey.get(key);
    if (current == null) {
      return;
    }
    current.delete(listener);
    if (current.size === 0) {
      listenersByKey.delete(key);
    }
    if (listenersByKey.size === 0 && windowListenerAttached) {
      window.removeEventListener('storage', onStorageEvent);
      windowListenerAttached = false;
    }
  };
};
