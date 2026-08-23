import * as React from 'react';
import { Link, useFetcher } from 'react-router';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import type { ScheduleInFlightRunFragment } from '~/__generated__/graphql';
import {
  RUN_STATUS_COLOR,
  RUN_STATUS_LABEL,
  RUN_STATUS_VARIANT,
} from '~/routing/schedule/data/data.run-status';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { formatDuration } from '~/routing/schedule/utils/format-duration';
import { useElapsedTicker } from '~/routing/schedule/hooks/useElapsedTicker';
import { CalendarDaysIcon } from 'lucide-react';

export interface ScheduleActiveRunsProps {
  className?: string;
  runs: ScheduleInFlightRunFragment[];
}

export const ScheduleActiveRuns = (
  props: ScheduleActiveRunsProps,
): React.ReactElement | null => {
  const { className, runs } = props;

  // Hooks
  const fetcher = useFetcher();
  // Only a started run has an elapsed time to count; a purely queued panel is static.
  const now = useElapsedTicker(runs.some((run) => run.startedAt != null));

  // Setup
  const isSubmitting = fetcher.state !== 'idle';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  // Nothing in flight — the stats row already says so, so stay out of the way.
  if (runs.length === 0) {
    return null;
  }

  return (
    <section className={className} data-testid="ScheduleActiveRuns">
      <GlobalHeading
        className="mb-4"
        icon={CalendarDaysIcon}
        title={SCHEDULE_COPY.activeRunsHeading}
      />
      <Table className="bg-card">
        <TableHeader>
          <TableRow>
            <TableHead>Schedule</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Elapsed</TableHead>
            <TableHead>
              <span className="sr-only">{SCHEDULE_COPY.activeRunsCancel}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const cancelRequested = run.cancelRequestedAt != null;

            return (
              <TableRow key={run.id}>
                <TableCell>
                  <Link
                    className="font-medium underline-offset-4 hover:underline"
                    to={`/schedule/${run.scheduledAgentJobId}`}
                  >
                    {run.job?.name ?? run.scheduledAgentJobId}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    color={RUN_STATUS_COLOR[run.status] ?? 'default'}
                    variant={RUN_STATUS_VARIANT[run.status] ?? 'outline'}
                  >
                    {RUN_STATUS_LABEL[run.status] ?? run.status}
                  </Badge>
                </TableCell>
                <TableCell>{run.trigger}</TableCell>
                <TableCell>
                  {run.driverId}
                  {run.model ? ` · ${run.model}` : ''}
                </TableCell>
                <TableCell className="tabular-nums">
                  {run.startedAt === null ? (
                    <span className="text-muted-foreground">
                      {SCHEDULE_COPY.activeRunsQueued}
                    </span>
                  ) : (
                    formatDuration(run.startedAt, now)
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <fetcher.Form method="post">
                    <input name="intent" type="hidden" value="cancel-run" />
                    <input name="runId" type="hidden" value={run.id} />
                    <Button
                      disabled={cancelRequested || isSubmitting}
                      size="sm"
                      type="submit"
                      variant="outline"
                    >
                      {cancelRequested
                        ? SCHEDULE_COPY.activeRunsCancelRequested
                        : SCHEDULE_COPY.activeRunsCancel}
                    </Button>
                  </fetcher.Form>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
};
