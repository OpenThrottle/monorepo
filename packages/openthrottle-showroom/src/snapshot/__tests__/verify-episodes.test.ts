import { describe, expect, test } from 'vitest';

import { EPISODES } from '../../episodes/registry';
import type { VideoEpisode } from '../../episodes/types';
import type { EpisodeRequirements } from '../verify-episodes';
import { formatFailure, verifyEpisodeData } from '../verify-episodes';
import type { QueryRunner } from '../schema';

/** A runner that answers each SQL string with a canned `value`. */
const runnerReturning = (values: Record<string, number>): QueryRunner => ({
  query: (sql: string) =>
    Promise.resolve({ rows: [{ value: values[sql] ?? 0 }] }),
});

const episode = (
  id: string,
  dataRequirements: VideoEpisode['dataRequirements'],
): EpisodeRequirements => ({ dataRequirements, id });

describe('verifyEpisodeData', () => {
  const requirement = {
    atLeast: 3,
    describe: 'plans on the plans page',
    sql: 'SELECT count(*) AS value FROM plans',
  };

  test('satisfied when the value meets the floor', async () => {
    const results = await verifyEpisodeData(
      runnerReturning({ [requirement.sql]: 3 }),
      [episode('21-dashboard-tour', [requirement])],
    );

    expect(results).toHaveLength(1);
    expect(results[0].satisfied).toBe(true);
  });

  test('fails when the value is below the floor', async () => {
    const results = await verifyEpisodeData(
      runnerReturning({ [requirement.sql]: 2 }),
      [episode('21-dashboard-tour', [requirement])],
    );

    expect(results[0].satisfied).toBe(false);
    expect(results[0].actual).toBe(2);
  });

  test('the failure names the episode, the requirement and the actual value', () => {
    expect(
      formatFailure({
        actual: 0,
        episodeId: '09-tags-and-rules',
        requirement,
        satisfied: false,
      }),
    ).toBe(
      '09-tags-and-rules: expected plans on the plans page (at least 3), got 0',
    );
  });

  test('episodes without requirements contribute nothing', async () => {
    expect(
      await verifyEpisodeData(runnerReturning({}), [
        episode('02-one-command-boot', undefined),
      ]),
    ).toEqual([]);
  });

  test('SQL that does not return a `value` column fails loudly', async () => {
    await expect(
      verifyEpisodeData(
        { query: () => Promise.resolve({ rows: [{ n: 1 }] }) },
        [episode('07-semantic-search', [requirement])],
      ),
    ).rejects.toThrow(/must return one row with a column named 'value'/);
  });
});

describe('the committed episode requirements', () => {
  const withRequirements = Object.values(EPISODES).filter(
    (entry) => (entry.dataRequirements ?? []).length > 0,
  );

  test('the episodes this snapshot unblocks all declare requirements', () => {
    const ids = new Set(withRequirements.map((entry) => entry.id));

    for (const id of [
      '07-semantic-search',
      '09-tags-and-rules',
      '13-plan-id-traceability',
      '14-scheduled-runs',
      '16-worktrees',
      '17-chat-any-cli',
      '19-skills',
      '21-dashboard-tour',
    ]) {
      expect(ids).toContain(id);
    }
  });

  test('every requirement is a single-row SELECT aliased to `value`', () => {
    for (const entry of withRequirements) {
      for (const requirement of entry.dataRequirements ?? []) {
        expect(requirement.sql).toMatch(/^SELECT /);
        expect(requirement.sql).toContain('AS value');
        expect(requirement.describe.length).toBeGreaterThan(0);
        expect(requirement.atLeast).toBeGreaterThan(0);
      }
    }
  });
});
