/** @public */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
