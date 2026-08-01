import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import type { ScheduledJobRunDetailFragment } from '~/__generated__/graphql';
import { RUN_DETAIL_COPY } from '~/routing/scheduled-jobs/data/data.run-detail';
import { RUN_STATUS_VARIANT } from '~/routing/scheduled-jobs/data/data.run-status';
import { formatDuration } from '~/routing/scheduled-jobs/utils/format-duration';
import { formatWhen } from '~/routing/scheduled-jobs/utils/format-when';

export interface RunDetailProps {
  run: ScheduledJobRunDetailFragment;
}

interface RunDetailRow {
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
        <Badge variant={RUN_STATUS_VARIANT[run.status] ?? 'outline'}>
          {run.status}
        </Badge>
      ),
    },
    { label: fields.trigger, value: run.trigger },
    {
      label: fields.driver,
      mono: true,
      value: run.model ? `${run.driverId} · ${run.model}` : run.driverId,
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
          </div>
        ))}
      </dl>

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
