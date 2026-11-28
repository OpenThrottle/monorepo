import { describe, expect, test } from 'vitest';

import { parseTrajectoryScoreFilter, parseTrajectoryVerdict } from '../parsers';

describe('parseTrajectoryVerdict', () => {
  test.each(['pass', 'fail'])('accepts %s', (value) => {
    expect(parseTrajectoryVerdict(value)).toBe(value);
  });

  test.each(['', 'error', null, 1])('rejects %s', (value) => {
    expect(parseTrajectoryVerdict(value)).toBeNull();
  });
});

describe('parseTrajectoryScoreFilter', () => {
  test.each(['unscored', 'scored', 'all'])('accepts %s', (value) => {
    expect(parseTrajectoryScoreFilter(value)).toBe(value);
  });

  test.each([null, '', 'ALL', 'bogus'])(
    'falls back to unscored for %s',
    (value) => {
      expect(parseTrajectoryScoreFilter(value)).toBe('unscored');
    },
  );
});
