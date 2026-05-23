import * as React from 'react';

export interface UseShareOptions {
  /**
   * @description Default {@link ShareData} passed to {@link UseShareResult.share} and {@link UseShareResult.canShare} when no override is provided.
   */
  readonly data?: ShareData;
}

export interface UseShareResult {
  /**
   * @description Whether {@link navigator.canShare} reports the payload as shareable (falls back to `true` when `canShare` is missing but {@link UseShareResult.isSupported}).
   */
  readonly canShare: (data?: ShareData) => boolean;
  readonly data: ShareData | undefined;
  readonly error: Error | null;
  readonly isSharing: boolean;
  /**
   * @description `true` when `navigator.share` is available (secure context required in browsers).
   */
  readonly isSupported: boolean;
  /**
   * @description Invokes the Web Share API; clears {@link UseShareResult.error} on success.
   */
  readonly share: (data?: ShareData) => Promise<void>;
}

const getIsShareSupported = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';

const resolveShareData = (
  override: ShareData | undefined,
  fallback: ShareData | undefined,
): ShareData | undefined => override ?? fallback;

/**
 * @description Wraps the Web Share API (`navigator.share` / `navigator.canShare`) with support detection and error state.
 */
export function useShare(options: UseShareOptions = {}): UseShareResult {
  const { data: defaultData } = options;

  const isSupported = getIsShareSupported();
  const [error, setError] = React.useState<Error | null>(null);
  const [isSharing, setIsSharing] = React.useState(false);

  const canShare = React.useCallback(
    (override?: ShareData): boolean => {
      const payload = resolveShareData(override, defaultData);
      if (!isSupported || payload === undefined) {
        return false;
      }

      if (typeof navigator.canShare === 'function') {
        return navigator.canShare(payload);
      }

      return true;
    },
    [defaultData, isSupported],
  );

  const share = React.useCallback(
    async (override?: ShareData): Promise<void> => {
      const payload = resolveShareData(override, defaultData);

      if (!isSupported) {
        const unsupported = new Error('Web Share API is not supported');
        setError(unsupported);
        throw unsupported;
      }

      if (payload === undefined) {
        const missingData = new Error('Share data is required');
        setError(missingData);
        throw missingData;
      }

      if (!canShare(payload)) {
        const notShareable = new Error('Share data cannot be shared');
        setError(notShareable);
        throw notShareable;
      }

      setIsSharing(true);
      setError(null);

      try {
        await navigator.share(payload);
      } catch (shareError) {
        if (
          shareError instanceof DOMException &&
          shareError.name === 'AbortError'
        ) {
          return;
        }

        const normalized =
          shareError instanceof Error
            ? shareError
            : new Error(String(shareError));
        setError(normalized);
        throw normalized;
      } finally {
        setIsSharing(false);
      }
    },
    [canShare, defaultData, isSupported],
  );

  return {
    canShare,
    data: defaultData,
    error,
    isSharing,
    isSupported,
    share,
  };
}
