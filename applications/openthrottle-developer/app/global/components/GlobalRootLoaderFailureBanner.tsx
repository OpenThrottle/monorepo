import { Button, cn } from '@openthrottle/react-router-shadcn';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import * as React from 'react';

import { ROOT_LOADER_FAILURE_SNIPPET_MAX } from '~/global/config/root-loader-failure-banner';
import { buildRootLoaderFailureBannerCopy } from '~/global/utils/buildRootLoaderFailureBannerCopy';
import type {
  RootLoaderDiagnostics,
  RootLoaderFailure,
} from '~/global/utils/root-loader-diagnostics';

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
): React.ReactElement | null => {
  const { diagnostics, failure, isRevalidating, onRetry, userLoadOk } = props;

  // Hooks
  const [dismissed, setDismissed] = React.useState(false);
  const wasRevalidating = React.useRef(false);

  // Setup
  const { detail, failureKey, stepLine, title } =
    buildRootLoaderFailureBannerCopy(failure);
  const userSessionAmbiguous = !userLoadOk;
  const visible = (failure != null || userSessionAmbiguous) && !dismissed;

  const rawMessage = failure?.message ?? '';
  const isTruncated =
    rawMessage.trim().length > ROOT_LOADER_FAILURE_SNIPPET_MAX;

  const timingParts: string[] = [];
  if (diagnostics?.healthLatencyMs != null) {
    timingParts.push(`Health: ${diagnostics.healthLatencyMs.toString()} ms`);
  }
  if (diagnostics?.userLatencyMs != null) {
    timingParts.push(`User: ${diagnostics.userLatencyMs.toString()} ms`);
  }

  const graphqlBase = diagnostics?.graphQlRequestBaseUrl?.trim();
  const httpStatusText = failure?.httpStatus?.toString();
  const hasFullError = failure != null && isTruncated;
  const hasTiming = timingParts.length > 0;

  // Handlers
  const handleDismiss = React.useCallback(() => {
    setDismissed(true);
  }, []);

  // Markup
  const httpStatusBadge = (
    <span className="border-border/80 bg-muted/50 text-muted-foreground rounded border px-1.5 py-0 font-mono text-[11px] font-normal">
      HTTP {httpStatusText}
    </span>
  );
  const stepLineMarkup = (
    <span className="text-muted-foreground text-xs">{stepLine}</span>
  );
  const graphqlBaseMarkup = (
    <span className="text-muted-foreground text-xs">
      GraphQL base (server):{' '}
      <code className="bg-muted/50 rounded px-1 py-0 text-[11px]">
        {graphqlBase}
      </code>
    </span>
  );
  const fullErrorMarkup = (
    <details className="text-muted-foreground text-xs">
      <summary className="cursor-pointer underline decoration-dotted select-none">
        Full error message
      </summary>
      <pre className="border-border/60 bg-muted/40 mt-1 max-h-40 overflow-auto rounded border p-2 font-mono text-[11px] leading-snug break-words whitespace-pre-wrap">
        {rawMessage}
      </pre>
    </details>
  );
  const timingMarkup = (
    <span className="text-muted-foreground text-xs">
      {timingParts.join(' · ')}
    </span>
  );

  // Life Cycle
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

  // 🔌 Short Circuit
  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        'border-destructive/40 bg-destructive/15 text-destructive-foreground flex w-full flex-wrap items-center justify-center gap-2 border-b px-4 py-2 text-sm',
      )}
      data-testid="GlobalRootLoaderFailureBanner"
      role="alert"
    >
      <AlertTriangle
        aria-hidden={true}
        className="text-destructive size-4 shrink-0"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{title}</span>
          {httpStatusText ? httpStatusBadge : null}
        </span>
        {stepLine ? stepLineMarkup : null}
        {graphqlBase ? graphqlBaseMarkup : null}
        <span className="text-muted-foreground break-words">{detail}</span>
        {hasFullError ? fullErrorMarkup : null}
        {hasTiming ? timingMarkup : null}
      </span>
      <Button
        className="shrink-0 gap-1"
        disabled={isRevalidating === true}
        onClick={onRetry}
        type="button"
        variant="secondary"
      >
        <RefreshCw
          className={cn('size-4', {
            'animate-spin': isRevalidating === true,
          })}
        />
        {isRevalidating === true ? 'Retrying…' : 'Retry'}
      </Button>
      <Button
        aria-label="Dismiss banner"
        className="text-destructive-foreground hover:bg-destructive/20 size-8 shrink-0 p-0"
        onClick={handleDismiss}
        type="button"
        variant="ghost"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
};
