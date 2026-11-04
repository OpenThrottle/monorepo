/**
 * @description A collision-resistant id for client-minted rows: `crypto.randomUUID()`
 * when available, else `<prefix>-<timestamp>-<random>`.
 */
export const createUniqueId = (prefix: string): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};
