import type { PullRequestCardFragment } from '@openthrottle/openthrottle-developer-codegen';
import { describe, expect, test } from 'vitest';
import { getPullRequestsTableRowId } from '../pull-requests-table-columns';

describe('getPullRequestsTableRowId', () => {
  test('returns stringified pull number as stable row id', () => {
    const pull: PullRequestCardFragment = {
      author: 'a',
      createdAt: '2026-01-01T00:00:00.000Z',
      htmlUrl: 'https://github.com/o/r/pull/7',
      number: 7,
      state: 'open',
      title: 't',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    expect(getPullRequestsTableRowId(pull, 0)).toBe('7');
  });
});
