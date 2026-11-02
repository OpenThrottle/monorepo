/** The slice of a run row needed to tell which runs a later run continues. */
interface ResumableRun {
  readonly resumeOfRunId?: string | null;
}

/**
 * @description Ids of the runs that a later run in the same list continues (via its
 * `resumeOfRunId`), so a usage-limited row can say "resumes at …" rather than "not resumed
 * automatically".
 */
export const collectResumedRunIds = (
  runs: readonly ResumableRun[],
): ReadonlySet<string> => {
  const resumedRunIds = new Set<string>();

  for (const run of runs) {
    if (typeof run.resumeOfRunId === 'string') {
      resumedRunIds.add(run.resumeOfRunId);
    }
  }

  return resumedRunIds;
};
