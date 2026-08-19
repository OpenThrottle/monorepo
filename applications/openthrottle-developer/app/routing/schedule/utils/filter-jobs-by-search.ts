import type { ScheduledJobCardFragment } from '~/__generated__/graphql';

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
    const cronPattern = job.cronPattern.toLowerCase();
    const driverId = job.driverId.toLowerCase();
    const repository = job.repository?.displayName.trim().toLowerCase() ?? '';

    return (
      name.includes(q) ||
      cronPattern.includes(q) ||
      driverId.includes(q) ||
      repository.includes(q)
    );
  });
};
