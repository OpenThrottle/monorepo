import { formatRelativeChatTimestamp } from '@openthrottle/react-router-chat';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import clsx from 'clsx';
import * as React from 'react';

import type { UsageCaptureHealthRowFragment } from '~/__generated__/graphql';
import { CAPTURE_HEALTH_STALE_AFTER_MS } from '~/routing/usage/data/capture-health';
import {
  CAPTURE_HEALTH_COPY,
  captureHealthStreamLabel,
} from '~/routing/usage/data/capture-health-copy';
import { buildCaptureHealthEntries } from '~/routing/usage/utils/capture-health';

export interface UsageCaptureHealthProps {
  className?: string;
  /** Loader clock (ISO), so staleness and relative labels match across SSR and hydration. */
  nowIso: string;
  /** One row per (stream, source), as returned by `captureHealth`. */
  rows: readonly UsageCaptureHealthRowFragment[];
}

export const UsageCaptureHealth = (
  props: UsageCaptureHealthProps,
): React.ReactElement => {
  const { className, nowIso, rows } = props;

  // Hooks

  // Setup
  const nowMs = new Date(nowIso).getTime();
  const entries = buildCaptureHealthEntries(
    rows,
    nowMs,
    CAPTURE_HEALTH_STALE_AFTER_MS,
  );
  const staleEntries = entries.filter((entry) => entry.stale);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (entries.length === 0) {
    return (
      <div className={clsx('mt-8', className)} data-testid="UsageCaptureHealth">
        <GlobalHeading
          className="mb-4"
          heading="h2"
          title={CAPTURE_HEALTH_COPY.heading}
        />
        <Alert variant="destructive">
          <AlertTitle>{CAPTURE_HEALTH_COPY.noRowsTitle}</AlertTitle>
          <AlertDescription>
            {CAPTURE_HEALTH_COPY.noRowsDescription}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={clsx('mt-8', className)} data-testid="UsageCaptureHealth">
      <GlobalHeading
        className="mb-4"
        heading="h2"
        title={CAPTURE_HEALTH_COPY.heading}
      />
      <p className="text-muted-foreground mb-4 text-sm">
        {CAPTURE_HEALTH_COPY.intro}
      </p>

      {staleEntries.length > 0 ? (
        <div className="mb-4 flex flex-col gap-2">
          {staleEntries.map((entry) => {
            const streamLabel = captureHealthStreamLabel(entry.stream);

            return (
              <Alert key={entry.key} variant="destructive">
                <AlertTitle>
                  {CAPTURE_HEALTH_COPY.staleTitle(streamLabel, entry.source)}
                </AlertTitle>
                <AlertDescription>
                  {CAPTURE_HEALTH_COPY.staleDescription(
                    streamLabel,
                    entry.source,
                    formatRelativeChatTimestamp(entry.lastCapturedAt, nowMs),
                  )}
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{CAPTURE_HEALTH_COPY.columnStream}</TableHead>
              <TableHead>{CAPTURE_HEALTH_COPY.columnSource}</TableHead>
              <TableHead>{CAPTURE_HEALTH_COPY.columnLastCaptured}</TableHead>
              <TableHead>{CAPTURE_HEALTH_COPY.columnStatus}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow
                data-stale={entry.stale}
                data-testid="UsageCaptureHealthRow"
                key={entry.key}
              >
                <TableCell className="font-medium">
                  {captureHealthStreamLabel(entry.stream)}
                </TableCell>
                <TableCell>{entry.source}</TableCell>
                <TableCell className="tabular-nums">
                  <time dateTime={entry.lastCapturedAt}>
                    {formatRelativeChatTimestamp(entry.lastCapturedAt, nowMs)}
                  </time>
                </TableCell>
                <TableCell
                  className={clsx(
                    entry.stale && 'text-destructive font-medium',
                  )}
                >
                  {entry.stale
                    ? CAPTURE_HEALTH_COPY.staleStatus
                    : CAPTURE_HEALTH_COPY.freshStatus}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
