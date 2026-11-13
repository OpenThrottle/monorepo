import { data } from 'react-router';

/**
 * @description Returns `record`, or throws a 404 when it is null or undefined. The payload is a
 * plain string because `GlobalErrorBoundary` renders a route error's `data` as its body text.
 */
export const requireRecord = <T>(
  record: T | null | undefined,
  label: string,
): T => {
  if (record === null || record === undefined) {
    throw data(`${label} not found`, { status: 404, statusText: 'Not Found' });
  }

  return record;
};
