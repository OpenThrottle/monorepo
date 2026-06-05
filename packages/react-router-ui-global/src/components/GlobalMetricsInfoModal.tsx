import * as React from 'react';
import classnames from 'classnames';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@openthrottle/react-router-shadcn';
import { Info } from 'lucide-react';
import { GLOBAL_METRICS_STAT_CARD_DOCS } from '../config';
import { useUrlSyncedOverlay } from '../hooks/use-url-synced-overlay';
import { GlobalModal } from './GlobalModal';

export interface GlobalMetricsInfoModalProps {
  /**
   * @description Optional deep link to a persistent definitions panel (e.g. Settings → Debug).
   */
  readonly definitionsHref?: string;
}

export interface GlobalMetricsInfoTriggerProps {
  readonly className?: string;
}

const MODAL_KEY = 'ServerMetricsInfo' as const;
const MODAL_PARAM = 'modal' as const;

export const GlobalMetricsInfoModal = (
  props: GlobalMetricsInfoModalProps,
): React.ReactElement => {
  const { definitionsHref } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalModal param={MODAL_PARAM} value={MODAL_KEY}>
      <div data-testid="GlobalMetricsInfoModal">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-card-foreground">
            What you are looking at
          </DialogTitle>
          <DialogDescription className="text-sm font-normal leading-snug text-muted-foreground">
            Each poll calls the{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-foreground">
              serverMetrics
            </code>{' '}
            field on{' '}
            <strong className="text-card-foreground">
              openthrottle-server
            </strong>{' '}
            via GraphQL. Numbers describe the API process on the server, not RAM
            or CPU for this browser tab.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 text-sm text-muted-foreground">
          <p className="mb-2 text-sm font-semibold text-card-foreground">
            Stat cards
          </p>
          <ul className="mb-3 list-disc space-y-2 pl-4 font-normal">
            {GLOBAL_METRICS_STAT_CARD_DOCS.map((doc) => (
              <li key={doc.title}>
                <strong className="text-card-foreground">{doc.title}</strong> —{' '}
                {doc.body}
              </li>
            ))}
          </ul>
          <p className="mb-2 text-sm font-semibold text-card-foreground">
            Poll &amp; chart
          </p>
          <ul className="list-disc space-y-2 pl-4 font-normal">
            <li>
              <strong className="text-card-foreground">Poll interval</strong> —
              How often the browser refetches metrics after the first load.{' '}
              <strong className="text-card-foreground">Off</strong> keeps the
              last fetch only (no timer).
            </li>
            <li>
              <strong className="text-card-foreground">
                Metrics over time
              </strong>{' '}
              — X axis is sample index (order of polls in this tab session).
              Lines: RSS (MB), heap used (MB), CPU user (ms); colors match the
              legend under the chart.
            </li>
          </ul>
          {definitionsHref ? (
            <p className="mt-3 border-t border-border pt-3 text-xs font-normal leading-snug">
              <a
                className="font-medium text-primary underline underline-offset-2"
                data-testid="GlobalMetricsInfoModal-definitions-link"
                href={definitionsHref}
              >
                Open full definitions in Settings
              </a>{' '}
              (stable reference for support tickets).
            </p>
          ) : null}
        </div>
      </div>
    </GlobalModal>
  );
};

GlobalMetricsInfoModal.key = MODAL_KEY;

/**
 * @description Click-to-open trigger button that sets `modal=ServerMetricsInfo` in the URL
 * (preserving any other params). Pair with {@link GlobalMetricsInfoModal} rendered elsewhere
 * in the tree; the URL is the source of truth, so the trigger and the dialog do not need to
 * share React state.
 */
export const GlobalMetricsInfoTrigger = (
  props: GlobalMetricsInfoTriggerProps,
): React.ReactElement => {
  const { className } = props;

  const { setOpen } = useUrlSyncedOverlay({
    // clearParamsOnClose: ['keep'],
    openValue: MODAL_KEY,
    param: MODAL_PARAM,
    setSearchParamsOptions: {
      preventScrollReset: true,
    },
  });

  const handleClick = React.useCallback((): void => {
    setOpen(true);
  }, [setOpen]);

  return (
    <button
      aria-label="Metrics interpretation help"
      className={classnames(
        'text-muted-foreground hover:text-foreground transition-colors',
        className,
      )}
      data-testid="GlobalMetrics-info-trigger"
      onClick={handleClick}
      type="button"
    >
      <Info className="h-4 w-4" />
    </button>
  );
};

GlobalMetricsInfoTrigger.key = MODAL_KEY;
