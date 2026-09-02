/**
 * @description Run every episode's declared `dataRequirements` against the
 * seeded demo database.
 *
 * This is the step that turns the video pipeline into an E2E suite: the
 * assertions are the test and the recording is the byproduct. A missing row
 * fails here, naming the episode and the requirement, instead of being
 * discovered as an empty state halfway through a take.
 */

import type { DataRequirement, VideoEpisode } from '../episodes/types';
import type { QueryRunner } from './schema';

export interface RequirementResult {
  /** The value the SQL actually returned, for the failure message. */
  actual: number;
  episodeId: string;
  requirement: DataRequirement;
  satisfied: boolean;
}

/** Format one failure the way it should read in a terminal. */
export const formatFailure = (result: RequirementResult): string =>
  `${result.episodeId}: expected ${result.requirement.describe} (at least ${result.requirement.atLeast}), got ${result.actual}`;

/** Only the fields this check reads, so a caller need not build a full episode. */
export type EpisodeRequirements = Pick<VideoEpisode, 'dataRequirements' | 'id'>;

export const verifyEpisodeData = async (
  runner: QueryRunner,
  episodes: readonly EpisodeRequirements[],
): Promise<RequirementResult[]> => {
  const results: RequirementResult[] = [];

  /* eslint-disable no-await-in-loop -- sequential reads on one connection */
  for (const episode of episodes) {
    for (const requirement of episode.dataRequirements ?? []) {
      const result = await runner.query(requirement.sql);
      const row = result.rows[0];

      if (row === undefined || !('value' in row)) {
        throw new Error(
          `${episode.id}: requirement SQL must return one row with a column named 'value' — ${requirement.describe}`,
        );
      }

      const actual = Number(row.value);

      results.push({
        actual,
        episodeId: episode.id,
        requirement,
        satisfied: Number.isFinite(actual) && actual >= requirement.atLeast,
      });
    }
  }
  /* eslint-enable no-await-in-loop */

  return results;
};
