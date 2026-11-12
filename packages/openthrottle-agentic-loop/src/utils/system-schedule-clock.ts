import type { ScheduleClock } from '../contract/index.ts';

/**
 * @description `ScheduleClock` over `setTimeout` and `Date.now`; the timer never keeps the process alive.
 * @public
 */
export const systemScheduleClock: ScheduleClock = {
  now: () => {
    return Date.now();
  },
  schedule: (callback, delayMs) => {
    const handle = setTimeout(callback, delayMs);

    handle.unref();

    return () => {
      clearTimeout(handle);
    };
  },
};
