import { isRenderableMessage } from '@openthrottle/react-router-shadcn';

import {
  NOTIFICATIONS_DEDUP_WINDOW_MS,
  NOTIFICATIONS_MAX_STORED,
} from '../config/index';
import type { NotificationsStoreAction } from '../data/data.notifications-store.context';
import type { NotificationInstance } from '../types';
import { generateId } from './generate-id';

/** @public */
export function reducer(
  state: readonly NotificationInstance[],
  action: NotificationsStoreAction,
): NotificationInstance[] {
  switch (action.type) {
    case 'add': {
      // Drop phantom content — a blank/whitespace/non-renderable message — before
      // it can reach the list, unread badge, screen-reader announcer, or
      // localStorage. This is the single chokepoint feeding all of those, and it
      // uses the same predicate as the Sonner toast guard so both surfaces stay
      // in lockstep. Return state unchanged (matching the no-op cases below).
      if (!isRenderableMessage(action.payload.message)) {
        return [...state];
      }

      const now = Date.now();

      // Coalesce identical re-emits (same event + message + link) that arrive
      // within NOTIFICATIONS_DEDUP_WINDOW_MS. The payload union has no stable id,
      // so dedup is content + time based; reconnect replays commonly re-deliver
      // the same events in a short window. Only the newest entry is compared —
      // older matches are intentional repeats the user already saw.
      const newest = state[0];
      if (
        newest !== undefined &&
        newest.event === action.event &&
        newest.payload.message === action.payload.message &&
        newest.payload.link === action.payload.link &&
        now - new Date(newest.createdAt).getTime() <
          NOTIFICATIONS_DEDUP_WINDOW_MS
      ) {
        return [...state];
      }

      const created: NotificationInstance = {
        createdAt: new Date(now).toISOString(),
        dismissed: false,
        event: action.event,
        id: generateId(),
        payload: action.payload,
        read: false,
      };

      const next = [created, ...state].slice(0, NOTIFICATIONS_MAX_STORED);

      return next;
    }

    case 'dismiss': {
      return state.map((n) =>
        n.id === action.id ? { ...n, dismissed: true, read: true } : n,
      );
    }

    case 'dismissAll': {
      return state.map((n) => ({ ...n, dismissed: true, read: true }));
    }

    case 'hydrate': {
      return action.notifications.slice(0, NOTIFICATIONS_MAX_STORED);
    }

    case 'markAllRead': {
      return state.map((n) => ({ ...n, read: true }));
    }

    case 'markRead': {
      return state.map((n) => (n.id === action.id ? { ...n, read: true } : n));
    }

    default:
      return [...state];
  }
}
