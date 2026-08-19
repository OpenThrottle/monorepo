import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import type { ScheduledJobRunDetailFragment } from '~/__generated__/graphql';
import { RUN_DETAIL_COPY } from '~/routing/schedule/data/data.run-detail';
import {
  RUN_STATUS_COLOR,
  RUN_STATUS_LABEL,
  RUN_STATUS_VARIANT,
} from '~/routing/schedule/data/data.run-status';
import { formatDuration } from '~/routing/schedule/utils/format-duration';
import {
  formatRunCost,
  formatSettingsSnapshot,
  hasRunUsage,
  runUsageRows,
} from '~/routing/schedule/utils/format-usage';
import { formatWhen } from '~/routing/schedule/utils/format-when';

export interface RunDetailProps {
  run: ScheduledJobRunDetailFragment;
}

interface RunDetailRow {
  /** Secondary monospace line under the value (e.g. the resolved on-disk path). */
  hint?: string | null;
  label: string;
  mono?: boolean;
  value: React.ReactNode;
}

export const RunDetail = (props: RunDetailProps): React.ReactElement => {
  const { run } = props;

  // Hooks

  // Setup
  const { fields } = RUN_DETAIL_COPY;
  const rows: RunDetailRow[] = [
    {
      label: fields.status,
      value: (
        <Badge
          color={RUN_STATUS_COLOR[run.status] ?? 'default'}
          variant={RUN_STATUS_VARIANT[run.status] ?? 'outline'}
        >
          {RUN_STATUS_LABEL[run.status] ?? run.status}
        </Badge>
      ),
    },
    { label: fields.trigger, value: run.trigger },
    {
      label: fields.driver,
      mono: true,
      value: run.model ? `${run.driverId} · ${run.model}` : run.driverId,
    },
    {
      // The checkout name reads as the target; the exact directory it resolved to is the proof.
      hint: run.resolvedCwd,
      label: fields.repository,
      value:
        run.repository?.displayName ?? RUN_DETAIL_COPY.repositoryWorkspaceRoot,
    },
    { label: fields.exitCode, value: run.exitCode ?? '—' },
    {
      label: fields.duration,
      value: formatDuration(run.startedAt, run.finishedAt),
    },
    {
      label: fields.bullmqJobId,
      mono: true,
      value: run.bullmqJobId ?? RUN_DETAIL_COPY.notEnqueued,
    },
    { label: fields.startedAt, value: formatWhen(run.startedAt) },
    { label: fields.finishedAt, value: formatWhen(run.finishedAt) },
    { label: fields.createdAt, value: formatWhen(run.createdAt) },
  ];

  const usageRows = runUsageRows(run);
  const showUsage = hasRunUsage(run);
  const snapshot = formatSettingsSnapshot(run.settingsSnapshotJson);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section className="bg-card rounded-md border p-4" data-testid="RunDetail">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {rows.map((row) => (
          <div className="flex flex-col gap-0.5" key={row.label}>
            <dt className="text-muted-foreground text-xs">{row.label}</dt>
            <dd className={row.mono ? 'font-mono text-sm' : 'text-sm'}>
              {row.value}
            </dd>
            {row.hint ? (
              <dd className="text-muted-foreground font-mono text-xs break-all">
                {row.hint}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>

      <p className="text-muted-foreground mt-2 text-xs">
        {RUN_DETAIL_COPY.repositoryNote}
      </p>

      <div className="mt-4">
        <p className="text-muted-foreground mb-1 text-xs">
          {RUN_DETAIL_COPY.usage.heading}
        </p>
        {showUsage ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {usageRows.map((row) => (
              <div className="flex flex-col gap-0.5" key={row.label}>
                <dt className="text-muted-foreground text-xs">{row.label}</dt>
                <dd className="text-sm tabular-nums">{row.value}</dd>
              </div>
            ))}
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs">
                {RUN_DETAIL_COPY.usage.cost}
              </dt>
              <dd className="text-sm tabular-nums">{formatRunCost(run)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">
            {RUN_DETAIL_COPY.usage.empty}
          </p>
        )}
      </div>

      <div className="mt-4">
        <p className="text-muted-foreground mb-1 text-xs">
          {RUN_DETAIL_COPY.settings.heading}
        </p>
        {snapshot ? (
          <pre className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-xs">
            {snapshot}
          </pre>
        ) : (
          <p className="text-muted-foreground text-sm">
            {RUN_DETAIL_COPY.settings.empty}
          </p>
        )}
      </div>

      {run.cancelRequestedAt ? (
        <p className="text-muted-foreground mt-4 text-xs" role="status">
          Cancellation requested {formatWhen(run.cancelRequestedAt)}.
        </p>
      ) : null}

      {run.errorMessage ? (
        <div className="mt-4">
          <p className="text-muted-foreground mb-1 text-xs">{fields.error}</p>
          <pre className="bg-muted text-destructive overflow-x-auto rounded-md p-3 text-sm whitespace-pre-wrap">
            {run.errorMessage}
          </pre>
        </div>
      ) : null}
    </section>
  );
};
