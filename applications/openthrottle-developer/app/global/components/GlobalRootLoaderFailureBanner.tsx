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
  rootLoaderStepLabel,
  truncateForBanner,
} from '~/global/utils/root-loader-diagnostics';

const SNIPPET_MAX = 360;

export interface GlobalRootLoaderFailureBannerProps {
  readonly diagnostics?: RootLoaderDiagnostics | null;
  readonly failure: RootLoaderFailure | null;
  readonly isRevalidating?: boolean;
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
  const { diagnostics, failure, isRevalidating, onRetry, userLoadOk } = props;

  // Hooks
  const [dismissed, setDismissed] = React.useState(false);
  const failureKey = failure
    ? `${failure.step}:${failure.kind}:${failure.message}`
    : null;
  const wasRevalidating = React.useRef(false);

  // Reset dismiss when the failure payload changes (new diagnosis) or after a retry completes.
  React.useEffect(() => {
    setDismissed(false);
  }, [failureKey]);

  React.useEffect(() => {
    if (wasRevalidating.current && !isRevalidating) {
      setDismissed(false);
    }
    wasRevalidating.current = isRevalidating === true;
  }, [isRevalidating]);

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
  const rawMessage = failure?.message ?? '';
  const isTruncated = rawMessage.trim().length > SNIPPET_MAX;
  const detail = failure
    ? truncateForBanner(failure.message, SNIPPET_MAX)
    : 'The request to load your account failed. You may be offline or the API may be unreachable. Retry after checking the network and server.';

  const stepLine = failure
    ? `Failed while loading: ${rootLoaderStepLabel(failure.step)}.`
    : null;

  const timingParts: string[] = [];
  if (diagnostics?.healthLatencyMs != null) {
    timingParts.push(`Health: ${diagnostics.healthLatencyMs.toString()} ms`);
  }
  if (diagnostics?.userLatencyMs != null) {
    timingParts.push(`User: ${diagnostics.userLatencyMs.toString()} ms`);
  }

  const graphqlBase = diagnostics?.graphQlRequestBaseUrl?.trim();

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
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{title}</span>
          {failure?.httpStatus != null ? (
            <span className="rounded border border-border/80 bg-muted/50 px-1.5 py-0 font-mono text-[11px] font-normal text-muted-foreground">
              HTTP {failure.httpStatus.toString()}
            </span>
          ) : null}
        </span>
        {stepLine ? (
          <span className="text-xs text-muted-foreground">{stepLine}</span>
        ) : null}
        {graphqlBase ? (
          <span className="text-xs text-muted-foreground">
            GraphQL base (server):{' '}
            <code className="rounded bg-muted/50 px-1 py-0 text-[11px]">
              {graphqlBase}
            </code>
          </span>
        ) : null}
        <span className="break-words text-muted-foreground">{detail}</span>
        {failure && isTruncated ? (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none underline decoration-dotted">
              Full error message
            </summary>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded border border-border/60 bg-muted/40 p-2 font-mono text-[11px] leading-snug">
              {failure.message}
            </pre>
          </details>
        ) : null}
        {timingParts.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {timingParts.join(' · ')}
          </span>
        ) : null}
      </span>
      <Button
        className="shrink-0 gap-1"
        disabled={isRevalidating === true}
        onClick={onRetry}
        type="button"
        variant="secondary"
      >
        <RefreshCw
          className={classnames('size-4', {
            'animate-spin': isRevalidating === true,
          })}
        />
        {isRevalidating === true ? 'Retrying…' : 'Retry'}
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
