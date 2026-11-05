import { isRecord } from '@openthrottle/nodejs-utils';

import type { NotificationInstance } from '../types';

export { isRecord };

/** @public */
export function isStoredNotification(
  item: unknown,
): item is NotificationInstance {
  if (!isRecord(item)) return false;

  const o = item;
  if (!isRecord(o.payload)) return false;

  const payload = o.payload;
  const hasValidLink =
    payload.link === undefined || typeof payload.link === 'string';

  return (
    typeof o.id === 'string' &&
    typeof o.event === 'string' &&
    typeof payload.message === 'string' &&
    hasValidLink &&
    typeof o.read === 'boolean' &&
    typeof o.dismissed === 'boolean' &&
    typeof o.createdAt === 'string'
  );
}
