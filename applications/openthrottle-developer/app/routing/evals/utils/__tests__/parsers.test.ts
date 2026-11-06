import { describe, expect, test } from 'vitest';

import { parseTrajectoryVerdict } from '../parsers';

describe('parseTrajectoryVerdict', () => {
  test.each(['pass', 'fail'])('accepts %s', (value) => {
    expect(parseTrajectoryVerdict(value)).toBe(value);
  });

  test.each(['', 'error', null, 1])('rejects %s', (value) => {
    expect(parseTrajectoryVerdict(value)).toBeNull();
  });
});
