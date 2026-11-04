/**
 * Boundary helper: without a `parse` validator the raw URL string is trusted as
 * a `TTab`. The generic overload gives callers the narrow type while the
 * implementation just returns the string it was handed. Hoisted out of
 * `useUrlSyncedTabValue` per hook-primitive-shape H3.
 */
export function coerceTab<TTab extends string>(raw: string): TTab;
export function coerceTab(raw: string): string {
  return raw;
}
