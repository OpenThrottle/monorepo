import { IS_BROWSER } from '@openthrottle/react-router-utils';
import {
  buildInitialSubscriptions,
  type EventSubscriptionId,
} from '~/routing/settings/config/event-subscriptions';

/**
 * @description localStorage key for persisted event subscription toggles (developer app).
 */
export const EVENT_SUBSCRIPTIONS_STORAGE_KEY =
  'openthrottle-developer:settings:event-subscriptions:v1';

const isEventSubscriptionId = (
  id: string,
  defaults: Readonly<Record<EventSubscriptionId, boolean>>,
): id is EventSubscriptionId =>
  Object.prototype.hasOwnProperty.call(defaults, id);

/**
 * @description Reads an own property from a plain object as boolean if present and boolean.
 */
const readOwnBoolean = (obj: object, key: string): boolean | undefined => {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) {
    return undefined;
  }
  const value: unknown = Reflect.get(obj, key);
  return typeof value === 'boolean' ? value : undefined;
};

/**
 * @description Merges a parsed stored value with {@link buildInitialSubscriptions}:
 * non-objects, wrong shapes, and unknown keys are ignored; only known ids with boolean
 * values override defaults.
 */
export const mergeEventSubscriptionPreferencesFromUnknown = (
  stored: unknown,
  defaults: Readonly<Record<EventSubscriptionId, boolean>>,
): Record<EventSubscriptionId, boolean> => {
  const result: Record<EventSubscriptionId, boolean> = { ...defaults };

  if (stored === null || typeof stored !== 'object' || Array.isArray(stored)) {
    return result;
  }

  for (const id of Object.keys(defaults)) {
    if (!isEventSubscriptionId(id, defaults)) {
      continue;
    }
    const value = readOwnBoolean(stored, id);
    if (value !== undefined) {
      result[id] = value;
    }
  }

  return result;
};

/**
 * @description Reads and merges stored preferences with defaults; safe on SSR and invalid JSON.
 */
export const getEventSubscriptionsFromStorage = (): Record<
  EventSubscriptionId,
  boolean
> => {
  const defaults = buildInitialSubscriptions();

  if (!IS_BROWSER) {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(EVENT_SUBSCRIPTIONS_STORAGE_KEY);
    if (raw === null) {
      return defaults;
    }
    const parsed: unknown = JSON.parse(raw);
    return mergeEventSubscriptionPreferencesFromUnknown(parsed, defaults);
  } catch {
    return defaults;
  }
};

/**
 * @description Persists the full subscription map; no-op on SSR or when storage throws.
 */
export const setEventSubscriptionsInStorage = (
  next: Readonly<Record<EventSubscriptionId, boolean>>,
): void => {
  if (!IS_BROWSER) {
    return;
  }

  try {
    window.localStorage.setItem(
      EVENT_SUBSCRIPTIONS_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    // QuotaExceededError, private mode, etc.
  }
};

const storageListeners = new Set<() => void>();
let storageWindowListenerAttached = false;

function onEventSubscriptionsStorageEvent(e: StorageEvent): void {
  if (e.key !== EVENT_SUBSCRIPTIONS_STORAGE_KEY) {
    return;
  }
  for (const listener of storageListeners) {
    listener();
  }
}

/**
 * @description Registers `listener` for cross-tab `storage` updates to
 * {@link EVENT_SUBSCRIPTIONS_STORAGE_KEY}. Returns unsubscribe; when the last listener
 * removes, the window listener is detached.
 */
export const subscribeToEventSubscriptionsStorageEvents = (
  listener: () => void,
): (() => void) => {
  if (!IS_BROWSER) {
    return () => {};
  }

  storageListeners.add(listener);

  if (!storageWindowListenerAttached) {
    window.addEventListener('storage', onEventSubscriptionsStorageEvent);
    storageWindowListenerAttached = true;
  }

  return () => {
    storageListeners.delete(listener);
    if (storageListeners.size === 0 && storageWindowListenerAttached) {
      window.removeEventListener('storage', onEventSubscriptionsStorageEvent);
      storageWindowListenerAttached = false;
    }
  };
};
