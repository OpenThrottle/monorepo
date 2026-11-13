import { describe, expect, test } from 'vitest';

import { skillUsageCwdLabel, skillUsageRepoLabel } from '../skill-usage-labels';

describe('skillUsageRepoLabel', () => {
  test('shows the path after the host', () => {
    expect(skillUsageRepoLabel('https://github.com/org/repo')).toBe('org/repo');
  });

  test('falls back to the input when there is no path', () => {
    expect(skillUsageRepoLabel('not-a-remote')).toBe('not-a-remote');
  });
});

describe('skillUsageCwdLabel', () => {
  test('shows the basename', () => {
    expect(skillUsageCwdLabel('/work/openthrottle')).toBe('openthrottle');
  });
});
