/**
 * @description Marks deferred loader promises as handled WITHOUT swallowing them.
 *
 * A loader that starts deferred queries and then `await`s a critical one leaves
 * those deferred promises with no rejection handler until React Router takes
 * ownership of the returned object. If a deferred query rejects in that window —
 * or the critical `await` throws and the object is never returned at all — Node
 * sees an unhandled rejection and exits the server process.
 *
 * `.catch()` attaches a handler to the ORIGINAL promise and returns a new derived
 * one; only the derived promise absorbs the rejection. The original still rejects
 * for every later consumer, so React Router streams the error to the region's
 * `errorElement` exactly as before. Call it before the first `await`.
 */
export const markDeferredHandled = (
  promises: ReadonlyArray<Promise<unknown>>,
): void => {
  for (const promise of promises) {
    void promise.catch(() => undefined);
  }
};
