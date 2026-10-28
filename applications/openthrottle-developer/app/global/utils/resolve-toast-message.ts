import type { ToastMessage } from '~/global/types';

/**
 * @description Resolves a {@link ToastMessage} against an action result into a
 * non-empty string, or `null` when there is nothing to show.
 */
export const resolveToastMessage = <TResult>(
  message: ToastMessage<TResult> | undefined,
  result: TResult,
): string | null => {
  if (message == null) {
    return null;
  }
  const value = typeof message === 'function' ? message(result) : message;
  return typeof value === 'string' && value.length > 0 ? value : null;
};
