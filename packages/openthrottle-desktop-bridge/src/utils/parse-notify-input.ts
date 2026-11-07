import { DESKTOP_NOTIFY_MAX_LENGTH } from '../data/data.desktop-bridge.ts';
import type { DesktopNotifyInput } from '../types/desktop-bridge.ts';

export type ParseNotifyInputResult =
  | { readonly input: DesktopNotifyInput; readonly ok: true }
  | { readonly ok: false; readonly reason: string };

const readString = (value: object, key: string): string | undefined => {
  const field: unknown = Reflect.get(value, key);

  return typeof field === 'string' ? field : undefined;
};

/**
 * @description Validates an untrusted IPC argument as a notify request: a
 * non-empty title, a body and an optional link, each a bounded string.
 * Anything else is rejected, so main never builds a notification from garbage.
 *
 * @public
 */
export const parseNotifyInput = (value: unknown): ParseNotifyInputResult => {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, reason: 'Notification must be an object.' };
  }

  const title = readString(value, 'title');
  const body = readString(value, 'body') ?? '';
  const rawLink: unknown = Reflect.get(value, 'link');
  const link = typeof rawLink === 'string' ? rawLink : undefined;

  if (title === undefined || title.trim() === '') {
    return { ok: false, reason: 'Notification needs a title.' };
  }

  const isTooLong =
    title.length > DESKTOP_NOTIFY_MAX_LENGTH ||
    body.length > DESKTOP_NOTIFY_MAX_LENGTH ||
    (link?.length ?? 0) > DESKTOP_NOTIFY_MAX_LENGTH;

  if (isTooLong) {
    return { ok: false, reason: 'Notification text is too long.' };
  }

  return { input: { body, link, title }, ok: true };
};
