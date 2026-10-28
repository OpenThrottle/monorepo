/** Narrows a setter argument to the functional-updater form. */
export const isUpdaterFn = <T>(
  value: T | ((prev: T) => T),
): value is (prev: T) => T => typeof value === 'function';
