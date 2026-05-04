import * as React from 'react';
import classnames from 'classnames';
import { Button } from '@openthrottle/react-router-shadcn';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import type {
  RootLoaderDiagnostics,
  RootLoaderFailure,
} from '~/global/utils/root-loader-diagnostics';
import {
  rootLoaderFailureKindLabel,
  truncateForBanner,
} from '~/global/utils/root-loader-diagnostics';

const SNIPPET_MAX = 360;

export interface GlobalRootLoaderFailureBannerProps {
  readonly diagnostics?: RootLoaderDiagnostics | null;
  readonly failure: RootLoaderFailure | null;
  readonly onRetry: () => void;
  readonly userLoadOk: boolean;
}

/**
 * @description Shown when the root loader could not load health or the current
 * user (e.g. API down, GraphQL errors). Offers retry, last error text, and timing.
 */
export const GlobalRootLoaderFailureBanner = (
  props: GlobalRootLoaderFailureBannerProps,
) => {
  const { diagnostics, failure, onRetry, userLoadOk } = props;

  // Hooks
  const [dismissed, setDismissed] = React.useState(false);

  // Setup
  const userSessionAmbiguous = !userLoadOk;
  const visible = (failure != null || userSessionAmbiguous) && !dismissed;

  // Handlers
  const handleDismiss = React.useCallback(() => {
    setDismissed(true);
  }, []);

  // 🔌 Short Circuit
  if (!visible) {
    return null;
  }

  const title = failure
    ? rootLoaderFailureKindLabel(failure.kind)
    : 'Session could not be verified';
  const detail = failure
    ? truncateForBanner(failure.message, SNIPPET_MAX)
    : 'The request to load your account failed. You may be offline or the API may be unreachable. Retry after checking the network and server.';

  const timingParts: string[] = [];
  if (diagnostics?.healthLatencyMs != null) {
    timingParts.push(`Health: ${diagnostics.healthLatencyMs.toString()} ms`);
  }
  if (diagnostics?.userLatencyMs != null) {
    timingParts.push(`User: ${diagnostics.userLatencyMs.toString()} ms`);
  }

  return (
    <div
      className={classnames(
        'flex w-full flex-wrap items-center justify-center gap-2 border-b border-destructive/40 bg-destructive/15 px-4 py-2 text-sm text-destructive-foreground',
      )}
      data-testid="GlobalRootLoaderFailureBanner"
      role="alert"
    >
      <AlertTriangle
        aria-hidden={true}
        className="size-4 shrink-0 text-destructive"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span className="font-semibold">{title}</span>
        <span className="break-words text-muted-foreground">{detail}</span>
        {timingParts.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {timingParts.join(' · ')}
          </span>
        ) : null}
      </span>
      <Button
        className="shrink-0 gap-1"
        onClick={onRetry}
        type="button"
        variant="secondary"
      >
        <RefreshCw className="size-4" />
        Retry
      </Button>
      <Button
        aria-label="Dismiss banner"
        className="shrink-0 size-8 p-0 text-destructive-foreground hover:bg-destructive/20"
        onClick={handleDismiss}
        type="button"
        variant="ghost"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
};
