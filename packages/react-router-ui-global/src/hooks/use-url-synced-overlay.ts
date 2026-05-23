import * as React from 'react';
import type { NavigateOptions } from 'react-router';
import { useSearchParams } from 'react-router';

/**
 * Options for {@link useUrlSyncedOverlay}. Prefer **feature-prefixed** `param` keys in app code.
 */
export interface UseUrlSyncedOverlayOptions {
  /** Extra keys removed when closing (nested child params). */
  readonly clearParamsOnClose?: readonly string[];
  /** Substring match for open state: `open` when `searchParams.get(param) === openValue`. */
  readonly openValue?: string;
  /** Search param key whose value signals “open”. */
  readonly param: string;
  /** Options forwarded to `setSearchParams`. Defaults preserve scroll position for param-only updates. */
  readonly setSearchParamsOptions?: NavigateOptions;
}

/**
 * Return value of {@link useUrlSyncedOverlay}.
 */
export interface UseUrlSyncedOverlayResult {
  /** Radix overlay root `onOpenChange`. */
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  /**
   * Imperatively open or close. When opening, optionally set extra params in one atomic update.
   */
  readonly setOpen: (
    open: boolean,
    extraParamsWhenOpen?: Readonly<Record<string, string>>,
  ) => void;
}

const DEFAULT_OPEN_TOKEN = 'open';

/**
 * @description Binds overlay open state to a search param (`param` === `openValue`), with optional child-param cleanup on close. Pair with controlled `Dialog` / `Sheet` / `Drawer` roots.
 */
export const useUrlSyncedOverlay = (
  options: UseUrlSyncedOverlayOptions,
): UseUrlSyncedOverlayResult => {
  const {
    clearParamsOnClose = [],
    openValue = DEFAULT_OPEN_TOKEN,
    param,
    setSearchParamsOptions,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  const navigateOpts = React.useMemo((): NavigateOptions => {
    const base: NavigateOptions = { preventScrollReset: true };
    if (setSearchParamsOptions === undefined) {
      return base;
    }
    return { ...base, ...setSearchParamsOptions };
  }, [setSearchParamsOptions]);

  const open = searchParams.get(param) === openValue;

  const applyParams = React.useCallback(
    (nextOpen: boolean, extra?: Readonly<Record<string, string>>) => {
      const next = new URLSearchParams(searchParams);
      if (nextOpen) {
        next.set(param, openValue);
        if (extra !== undefined) {
          for (const [extraKey, extraValue] of Object.entries(extra)) {
            next.set(extraKey, extraValue);
          }
        }
      } else {
        next.delete(param);
        for (const key of clearParamsOnClose) {
          next.delete(key);
        }
      }
      setSearchParams(next, navigateOpts);
    },
    [
      clearParamsOnClose,
      navigateOpts,
      openValue,
      param,
      searchParams,
      setSearchParams,
    ],
  );

  const setOpen = React.useCallback(
    (
      nextOpen: boolean,
      extraParamsWhenOpen?: Readonly<Record<string, string>>,
    ) => {
      applyParams(nextOpen, extraParamsWhenOpen);
    },
    [applyParams],
  );

  const onOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen === open) {
        return;
      }
      applyParams(nextOpen);
    },
    [applyParams, open],
  );

  return {
    onOpenChange,
    open,
    setOpen,
  };
};
