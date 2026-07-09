import * as React from 'react';
import { useSearchParams } from 'react-router';
import type {
  UseUrlSyncedTabValueOptions,
  UseUrlSyncedTabValueResult,
} from '../tabs/open-throttle-tabs.api';

export type {
  UseUrlSyncedTabValueOptions,
  UseUrlSyncedTabValueResult,
} from '../tabs/open-throttle-tabs.api';

/**
 * Boundary helper: without a `parse` validator the raw URL string is trusted as
 * a `TTab`. The generic overload gives callers the narrow type while the
 * implementation just returns the string it was handed.
 */
function coerceTab<TTab extends string>(raw: string): TTab;
function coerceTab(raw: string): string {
  return raw;
}

/**
 * @description Syncs a Radix/shadcn tab `value` with a URL search param on the same route.
 * Deletes the param when the active tab equals `defaultValue` (canonical URL for the default tab).
 */
export function useUrlSyncedTabValue<TTab extends string = string>(
  options: UseUrlSyncedTabValueOptions<TTab>,
): UseUrlSyncedTabValueResult<TTab> {
  const { param, defaultValue, parse } = options;
  const [searchParams, setSearchParams] = useSearchParams();

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

  return { onValueChange, value };
}
