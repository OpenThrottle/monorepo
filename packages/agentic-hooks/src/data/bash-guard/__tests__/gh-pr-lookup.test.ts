import { describe, expect, it, vi } from 'vitest';

import {
  createGhPrLookup,
  ghPrViewArgs,
  parseGhPrView,
  type RunFile,
} from '../gh-pr-lookup.ts';

describe('ghPrViewArgs', () => {
  it('views the current branch PR when there is no selector', () => {
    expect(ghPrViewArgs({ cwd: '/r', repo: null, selector: null })).toEqual([
      'pr',
      'view',
      '--json',
      'closedAt,mergedAt,number,state',
    ]);
  });

  it('passes the selector and repository through', () => {
    expect(ghPrViewArgs({ cwd: '/r', repo: 'o/r', selector: '661' })).toEqual([
      'pr',
      'view',
      '661',
      '--repo',
      'o/r',
      '--json',
      'closedAt,mergedAt,number,state',
    ]);
  });
});

describe('parseGhPrView', () => {
  it('reads a merged PR with its merge time', () => {
    expect(
      parseGhPrView(
        '{"closedAt":"2026-11-05T18:22:41Z","mergedAt":"2026-11-05T18:22:40Z","number":661,"state":"MERGED"}',
      ),
    ).toEqual({
      changedAt: '2026-11-05T18:22:40Z',
      kind: 'found',
      number: 661,
      state: 'MERGED',
    });
  });

  it('reads a closed PR with its close time', () => {
    expect(
      parseGhPrView(
        '{"closedAt":"2026-11-01T00:00:00Z","mergedAt":null,"number":9,"state":"CLOSED"}',
      ),
    ).toMatchObject({ changedAt: '2026-11-01T00:00:00Z', state: 'CLOSED' });
  });

  it('reads an open PR with no change time', () => {
    expect(
      parseGhPrView(
        '{"closedAt":null,"mergedAt":null,"number":1,"state":"OPEN"}',
      ),
    ).toMatchObject({ changedAt: null, state: 'OPEN' });
  });

  it.each(['not json', '[]', '{"state":"OPEN"}'])(
    'is unknown for %s',
    (stdout) => {
      expect(parseGhPrView(stdout)).toEqual({ kind: 'unknown' });
    },
  );
});

describe('createGhPrLookup', () => {
  it('runs gh in the query directory with the timeout', async () => {
    const run = vi.fn<RunFile>(
      async () => '{"closedAt":null,"mergedAt":null,"number":3,"state":"OPEN"}',
    );
    const lookup = createGhPrLookup({ run, timeoutMs: 1234 });
    expect(
      await lookup({ cwd: '/r', repo: null, selector: '3' }),
    ).toMatchObject({ number: 3, state: 'OPEN' });
    expect(run).toHaveBeenCalledWith(
      'gh',
      ['pr', 'view', '3', '--json', 'closedAt,mergedAt,number,state'],
      { cwd: '/r', timeoutMs: 1234 },
    );
  });

  it('is unknown when gh fails', async () => {
    const run = vi.fn<RunFile>(async () => {
      throw new Error('no pull requests found');
    });
    const lookup = createGhPrLookup({ run });
    expect(await lookup({ cwd: '/r', repo: null, selector: null })).toEqual({
      kind: 'unknown',
    });
  });
});
