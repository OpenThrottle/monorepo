import type { ScheduledJobCardFragment } from '~/__generated__/graphql';
import { describeScheduleCadence } from '~/routing/schedule/utils/describeScheduleCadence';

/** Client-side filter until the schedule list supports server-side search. */
export const filterJobsBySearch = (
  jobs: ScheduledJobCardFragment[],
  search: string,
): ScheduledJobCardFragment[] => {
  const q = search.trim().toLowerCase();

  if (q.length === 0) {
    return jobs;
  }

  return jobs.filter((job) => {
    const name = job.name.toLowerCase();
    const cadence = describeScheduleCadence(job).toLowerCase();
    const driverId = job.driverId.toLowerCase();
    const repository = job.repository?.displayName.trim().toLowerCase() ?? '';

    return (
      name.includes(q) ||
      cadence.includes(q) ||
      driverId.includes(q) ||
      repository.includes(q)
    );
  });
};
