/**
 * @description Resolve after `ms` milliseconds. A zero or negative `ms`
 * resolves on the next microtask instead of scheduling a timer. Tests should
 * use fake timers rather than call this for real.
 *
 * @public
 */
export const sleep = (ms: number): Promise<void> => {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
