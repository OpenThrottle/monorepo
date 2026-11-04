import * as React from 'react';
import { useSearchParams } from 'react-router';

import { coerceTab } from '../utils/coerce-tab';

export interface UseUrlSyncedTabValueOptions<TTab extends string = string> {
  readonly defaultValue: TTab;
  readonly param: string;
  readonly parse?: (raw: string | null) => TTab | undefined;
}

export interface UseUrlSyncedTabValueResult<TTab extends string = string> {
  readonly onValueChange: (next: string) => void;
  readonly value: TTab;
}

/**
 * @description Syncs a Radix/shadcn tab `value` with a URL search param on the same route.
 * Deletes the param when the active tab equals `defaultValue` (canonical URL for the default tab).
 */
export function useUrlSyncedTabValue<TTab extends string = string>(
  options: UseUrlSyncedTabValueOptions<TTab>,
): UseUrlSyncedTabValueResult<TTab> {
  const { param, defaultValue, parse } = options;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup
  const value = React.useMemo((): TTab => {
    const raw = searchParams.get(param);
    if (parse) {
      return parse(raw) ?? defaultValue;
    }
    if (raw === null || raw === '') {
      return defaultValue;
    }
    return coerceTab<TTab>(raw);
  }, [defaultValue, param, parse, searchParams]);

  // Handlers
  const onValueChange = React.useCallback(
    (next: string): void => {
      const resolved: TTab = parse
        ? (parse(next) ?? defaultValue)
        : coerceTab<TTab>(next || defaultValue);

      const nextParams = new URLSearchParams(searchParams);
      if (resolved === defaultValue) {
        nextParams.delete(param);
      } else {
        nextParams.set(param, resolved);
      }
      setSearchParams(nextParams, { preventScrollReset: true });
    },
    [defaultValue, param, parse, searchParams, setSearchParams],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return { onValueChange, value };
}
