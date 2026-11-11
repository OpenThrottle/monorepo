const inFlightExplains = new Set<Promise<void>>();

/**
 * @description Registers a background explain so `flushPostgresProfiling` can wait for it.
 * The entry removes itself when the promise settles, and a rejection is swallowed here
 * so the tracker itself can never produce an unhandled rejection.
 */
export const trackPostgresProfiling = (explain: Promise<void>): void => {
  const tracked: Promise<void> = explain
    .catch(() => undefined)
    .finally(() => {
      inFlightExplains.delete(tracked);
    });

  inFlightExplains.add(tracked);
};

/**
 * @public
 * @description Resolves once every background explain started so far, and any started
 * while waiting, has settled. Never rejects. Mainly useful in tests and on shutdown.
 */
export const flushPostgresProfiling = async (): Promise<void> => {
  if (inFlightExplains.size === 0) {
    return;
  }

  await Promise.allSettled([...inFlightExplains]);
  await flushPostgresProfiling();
};
