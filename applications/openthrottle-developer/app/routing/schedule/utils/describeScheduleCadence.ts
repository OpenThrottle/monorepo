import type { ScheduledJobCardFragment } from '~/__generated__/graphql';
import { SCHEDULE_CADENCE_COPY } from '~/routing/schedule/data/data.copy';
import { SCHEDULE_KIND } from '~/routing/schedule/data/data.schedule-kind';

/** The schedule fields that decide when it fires. */
export type ScheduleCadenceFields = Pick<
  ScheduledJobCardFragment,
  'cronPattern' | 'intervalMs' | 'runAt' | 'scheduleKind' | 'timezone'
>;

/**
 * @description A schedule's cadence as one line: the cron pattern and its timezone, "Every N
 * minutes", or "Once at <ISO time>". The once time stays in ISO form (with its offset) so the text is
 * identical on the server render and in the browser.
 */
export const describeScheduleCadence = (job: ScheduleCadenceFields): string => {
  if (job.scheduleKind === SCHEDULE_KIND.interval && job.intervalMs != null) {
    return SCHEDULE_CADENCE_COPY.interval(Math.round(job.intervalMs / 60_000));
  }

  if (
    job.scheduleKind === SCHEDULE_KIND.once &&
    typeof job.runAt === 'string'
  ) {
    return SCHEDULE_CADENCE_COPY.once(job.runAt);
  }

  if (job.cronPattern != null) {
    return SCHEDULE_CADENCE_COPY.cron(job.cronPattern, job.timezone ?? null);
  }

  return SCHEDULE_CADENCE_COPY.unknown;
};
