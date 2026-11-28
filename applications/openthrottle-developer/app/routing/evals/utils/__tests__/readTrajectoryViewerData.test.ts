// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  MOCK_MY_LABEL,
  MOCK_OTHER_LABEL,
  MOCK_TRAJECTORY,
  MOCK_TRAJECTORY_SUMMARY,
} from '~/routing/evals/data/mock.trajectory';

import { readTrajectoryViewerData } from '../readTrajectoryViewerData';

const record = (trajectoryJson: string) => {
  return { ...MOCK_TRAJECTORY_SUMMARY, trajectoryJson };
};

describe('readTrajectoryViewerData', () => {
  describe('with a readable document and a signed-in user', () => {
    test('parses it, drops the raw JSON and splits your label out', async () => {
      const data = await readTrajectoryViewerData({
        labels: [MOCK_OTHER_LABEL, MOCK_MY_LABEL],
        me: { email: MOCK_MY_LABEL.rater, githubUsername: 'dev', id: 'u1' },
        record: record(JSON.stringify(MOCK_TRAJECTORY)),
      });

      expect(data.trajectory?.steps).toHaveLength(MOCK_TRAJECTORY.steps.length);
      expect(data.summary).not.toHaveProperty('trajectoryJson');
      expect(data.summary.id).toBe(MOCK_TRAJECTORY_SUMMARY.id);
      expect(data.labels.mine?.id).toBe(MOCK_MY_LABEL.id);
      expect(data.labels.others).toEqual([MOCK_OTHER_LABEL]);
    });
  });

  describe('without an identity', () => {
    test('treats every label as another rater’s', async () => {
      const data = await readTrajectoryViewerData({
        labels: [MOCK_MY_LABEL],
        me: null,
        record: record(JSON.stringify(MOCK_TRAJECTORY)),
      });

      expect(data.labels.mine).toBeNull();
      expect(data.labels.others).toEqual([MOCK_MY_LABEL]);
    });
  });

  describe('with a document that is not ATIF', () => {
    test('returns a null trajectory', async () => {
      const data = await readTrajectoryViewerData({
        labels: [],
        me: null,
        record: record('{"x":1}'),
      });

      expect(data.trajectory).toBeNull();
    });
  });
});
