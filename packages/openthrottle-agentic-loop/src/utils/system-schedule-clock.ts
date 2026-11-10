import type { ScheduleClock } from '../contract/index.ts';

/**
 * @description `ScheduleClock` over `setTimeout`; the timer never keeps the process alive.
 * @public
 */
export const systemScheduleClock: ScheduleClock = {
  schedule: (callback, delayMs) => {
    const handle = setTimeout(callback, delayMs);

    handle.unref();

    return () => {
      clearTimeout(handle);
    };
  },
};
