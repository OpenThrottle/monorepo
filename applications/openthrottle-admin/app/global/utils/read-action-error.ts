/**
 * @description The `error` message of a fetcher's action data, or `null` when
 * the action has not run or returned something other than an error.
 */
export const readActionError = (data: unknown): string | null => {
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  if ('error' in data && typeof data.error === 'string') {
    return data.error;
  }

  return null;
};
