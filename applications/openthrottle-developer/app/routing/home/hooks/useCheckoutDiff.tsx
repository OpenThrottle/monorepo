import type { ChatSessionDrawerChangesProps } from '@openthrottle/react-router-chat';
import * as React from 'react';
import { useFetcher } from 'react-router';

import { CHECKOUT_DIFF_PATH } from '~/routing/home/config/checkout-diff';
import { CHANGES_LOAD_FAILED_DIFF } from '~/routing/home/data/checkout-diff';
import type { CheckoutDiffResourceData } from '~/routing/home/types';
import { toChatSessionDiff } from '~/routing/home/utils/toChatSessionDiff';

export interface UseCheckoutDiffOptions {
  /** The selected checkout's registered id; undefined until the composer reports one. */
  readonly checkoutId: string | undefined;
  /** Whether the Changes section is on screen; nothing is fetched while it is not. */
  readonly isEnabled: boolean;
  /** True while a turn streams; its end refetches, because the agent may have edited files. */
  readonly isStreaming: boolean;
}

export interface UseCheckoutDiffResult extends ChatSessionDrawerChangesProps {}

/**
 * @description Client state for the session drawer's Changes section: the checkout's diff
 * against its base branch, fetched through `/resources/checkout-diff` while the section is
 * visible, refetched when a turn finishes streaming or on refresh, plus the selected file and
 * its patch, loaded lazily on select. A response for a checkout or file that is no longer the
 * requested one is ignored, and changing checkout clears the selection.
 */
export const useCheckoutDiff = (
  options: UseCheckoutDiffOptions,
): UseCheckoutDiffResult => {
  const { checkoutId, isEnabled, isStreaming } = options;

  // Hooks
  const diffFetcher = useFetcher<CheckoutDiffResourceData>();
  const fileFetcher = useFetcher<CheckoutDiffResourceData>();
  const [selectedFile, setSelectedFile] = React.useState<string>();
  const [refreshTick, setRefreshTick] = React.useState(0);
  // `load` changes identity every render, so effects key on their inputs and
  // read the latest loader through a ref.
  const loadDiffRef = React.useRef(diffFetcher.load);
  const loadFileRef = React.useRef(fileFetcher.load);
  const wasStreamingRef = React.useRef(false);

  // Setup
  const canLoad = isEnabled && checkoutId !== undefined;
  const diffData = diffFetcher.data;
  const fileData = fileFetcher.data;
  const isDiffCurrent =
    checkoutId !== undefined && diffData?.checkoutId === checkoutId;
  const isFileCurrent =
    selectedFile !== undefined &&
    fileData !== undefined &&
    fileData.checkoutId === checkoutId &&
    fileData.kind !== 'diff' &&
    fileData.path === selectedFile;
  const diffSummary =
    isDiffCurrent && diffData?.kind === 'diff' ? diffData.diff : undefined;
  const diff = React.useMemo(() => {
    if (diffSummary !== undefined) {
      return toChatSessionDiff(diffSummary);
    }

    return isDiffCurrent ? CHANGES_LOAD_FAILED_DIFF : undefined;
  }, [diffSummary, isDiffCurrent]);
  const file =
    isFileCurrent && fileData.kind === 'file' ? fileData.file : undefined;
  const isLoading = diffFetcher.state !== 'idle' || (canLoad && !isDiffCurrent);

  // Handlers
  const onRefresh = React.useCallback((): void => {
    setRefreshTick((tick) => tick + 1);
  }, []);

  const onSelectFile = React.useCallback((path: string): void => {
    setSelectedFile(path);
  }, []);

  // Markup

  // Life Cycle
  React.useEffect(() => {
    loadDiffRef.current = diffFetcher.load;
    loadFileRef.current = fileFetcher.load;
  }, [diffFetcher.load, fileFetcher.load]);

  React.useEffect(() => {
    setSelectedFile(undefined);
  }, [checkoutId]);

  React.useEffect(() => {
    if (wasStreamingRef.current && !isStreaming) {
      setRefreshTick((tick) => tick + 1);
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  React.useEffect(() => {
    if (!canLoad) {
      return;
    }
    const params = new URLSearchParams({ checkoutId });
    loadDiffRef.current(`${CHECKOUT_DIFF_PATH}?${params.toString()}`);
  }, [canLoad, checkoutId, refreshTick]);

  React.useEffect(() => {
    if (!canLoad || selectedFile === undefined) {
      return;
    }
    const params = new URLSearchParams({ checkoutId, path: selectedFile });
    loadFileRef.current(`${CHECKOUT_DIFF_PATH}?${params.toString()}`);
  }, [canLoad, checkoutId, refreshTick, selectedFile]);

  // 🔌 Short Circuit

  return {
    diff,
    isLoading,
    isPatchTruncated: file?.truncated ?? false,
    onRefresh,
    onSelectFile,
    selectedFile,
    selectedPatch: file?.patch,
  };
};
