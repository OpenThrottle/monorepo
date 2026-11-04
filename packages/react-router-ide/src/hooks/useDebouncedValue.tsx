import { useEffect, useState } from 'react';

import { DEFAULT_DEBOUNCE_MS } from '../config/debounce';

export interface UseDebouncedValueOptions<T> {
  /** Debounce interval in milliseconds. Defaults to {@link DEFAULT_DEBOUNCE_MS}. */
  delayMs?: number;
  /** The value to debounce. */
  value: T;
}

/**
 * Return a debounced copy of `value` that only updates after `delayMs` of quiet —
 * e.g. to throttle a file-palette filter or search input before it drives a query.
 *
 * @public
 */
export const useDebouncedValue = <T,>(
  options: UseDebouncedValueOptions<T>,
): T => {
  const { delayMs = DEFAULT_DEBOUNCE_MS, value } = options;

  // Hooks
  const [debounced, setDebounced] = useState<T>(value);

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);

    return () => clearTimeout(handle);
  }, [delayMs, value]);

  // 🔌 Short Circuit
  return debounced;
};
