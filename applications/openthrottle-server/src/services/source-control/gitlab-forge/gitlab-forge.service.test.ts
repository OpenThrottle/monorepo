import { createMock } from '@golevelup/ts-vitest';
import type { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GitLabForgeService } from './gitlab-forge.service.ts';

const jsonResponse = (body: unknown, status = 200) => {
  return {
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
};

const makeForge = (env: Record<string, string> = {}): GitLabForgeService => {
  const config = createMock<ConfigService>({
    get: vi.fn((key: string) => env[key]),
  });

  return new GitLabForgeService(config);
};

const stubFetch = (...responses: ReturnType<typeof jsonResponse>[]) => {
  const fetchMock = vi.fn();

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
};

describe('GitLabForgeService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('requests', () => {
    it('encodes a nested project path and uses the default base URL', async () => {
      const fetchMock = stubFetch(jsonResponse({ default_branch: 'main' }));

      await expect(
        makeForge().getDefaultBranch('group/sub/project'),
      ).resolves.toBe('main');
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'https://gitlab.com/api/v4/projects/group%2Fsub%2Fproject',
      );
    });

    it('strips a trailing slash from a self-hosted base URL', async () => {
      const fetchMock = stubFetch(jsonResponse({ default_branch: 'main' }));

      await makeForge({
        GITLAB_BASE_URL: 'https://git.example.com/',
      }).getDefaultBranch('a/b');

      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'https://git.example.com/api/v4/projects/a%2Fb',
      );
    });

    it('sends PRIVATE-TOKEN only when a token is set', async () => {
      const withToken = stubFetch(jsonResponse({ default_branch: 'main' }));
      await makeForge({ GITLAB_TOKEN: 'secret' }).getDefaultBranch('a/b');
      expect(withToken.mock.calls[0]?.[1]?.headers).toEqual({
        'PRIVATE-TOKEN': 'secret',
      });

      const without = stubFetch(jsonResponse({ default_branch: 'main' }));
      await makeForge().getDefaultBranch('a/b');
      expect(without.mock.calls[0]?.[1]?.headers).toEqual({});
    });

    it('exposes the hostname of the configured base URL', () => {
      expect(makeForge().host).toBe('gitlab.com');
      expect(
        makeForge({ GITLAB_BASE_URL: 'https://git.example.com' }).host,
      ).toBe('git.example.com');
    });
  });

  describe('errors', () => {
    it('resolves a 404 to null or an empty list', async () => {
      stubFetch(jsonResponse({}, 404));
      await expect(makeForge().getDefaultBranch('a/b')).resolves.toBeNull();

      stubFetch(jsonResponse({}, 404));
      await expect(makeForge().getCommit('a/b', 'abc')).resolves.toBeNull();

      stubFetch(jsonResponse({}, 404));
      await expect(
        makeForge().listCommits('a/b', 'main', null),
      ).resolves.toEqual([]);

      stubFetch(jsonResponse({}, 404));
      await expect(
        makeForge().compareCommits('a/b', 'x', 'y'),
      ).resolves.toBeNull();
    });

    it('throws on a non-404 error', async () => {
      stubFetch(jsonResponse({ message: 'boom' }, 500));

      await expect(makeForge().getDefaultBranch('a/b')).rejects.toThrow(
        /GitLab API error 500/,
      );
    });

    it('throws when getPullRequest meets a 404', async () => {
      stubFetch(jsonResponse({}, 404));

      await expect(makeForge().getPullRequest('a/b', 3)).rejects.toThrow(
        /GitLab API error 404/,
      );
    });
  });

  describe('merge requests', () => {
    it.each([
      ['opened', 'open'],
      ['locked', 'open'],
      ['merged', 'closed'],
      ['closed', 'closed'],
    ])('maps state %s to %s', async (gitlabState, expected) => {
      stubFetch(jsonResponse({ iid: 4, state: gitlabState }));

      const pull = await makeForge().getPullRequest('a/b', 4);

      expect(pull.state).toBe(expected);
      expect(pull.number).toBe(4);
    });

    it('prefers merge_commit_sha and falls back to squash_commit_sha', async () => {
      stubFetch(
        jsonResponse({
          iid: 1,
          merge_commit_sha: 'merge',
          merged_at: '2026-11-01T00:00:00Z',
          squash_commit_sha: 'squash',
          state: 'merged',
        }),
      );
      const withMerge = await makeForge().getPullRequest('a/b', 1);
      expect(withMerge.mergeCommitSha).toBe('merge');
      expect(withMerge.mergedAt).toBe('2026-11-01T00:00:00Z');

      stubFetch(
        jsonResponse({
          iid: 2,
          merge_commit_sha: null,
          squash_commit_sha: 'squash',
          state: 'merged',
        }),
      );
      const squashed = await makeForge().getPullRequest('a/b', 2);
      expect(squashed.mergeCommitSha).toBe('squash');
      expect(squashed.mergedAt).toBeNull();
    });

    it('finds the newest request for a branch', async () => {
      const fetchMock = stubFetch(
        jsonResponse([{ iid: 9, merge_commit_sha: null, state: 'opened' }]),
      );

      const pull = await makeForge().findPullRequestForBranch('a/b', 'feat/x');

      expect(pull).toEqual({
        mergeCommitSha: null,
        mergedAt: null,
        number: 9,
        state: 'open',
      });
      expect(fetchMock.mock.calls[0]?.[0]).toContain('source_branch=feat%2Fx');
      expect(fetchMock.mock.calls[0]?.[0]).toContain('per_page=1');
    });

    it('returns null when a branch has no request', async () => {
      stubFetch(jsonResponse([]));

      await expect(
        makeForge().findPullRequestForBranch('a/b', 'feat/x'),
      ).resolves.toBeNull();
    });

    it('returns the landed commit of the first merged request for a commit', async () => {
      stubFetch(
        jsonResponse([
          { merge_commit_sha: 'ignored', state: 'opened' },
          { merge_commit_sha: null, squash_commit_sha: 'sq', state: 'merged' },
        ]),
      );

      await expect(
        makeForge().getMergeCommitShaForCommit('a/b', 'abc'),
      ).resolves.toBe('sq');
    });

    it('returns null when no request merged the commit', async () => {
      stubFetch(jsonResponse([{ state: 'opened' }]));

      await expect(
        makeForge().getMergeCommitShaForCommit('a/b', 'abc'),
      ).resolves.toBeNull();
    });
  });

  describe('compareCommits', () => {
    it('is identical without a request when base equals head', async () => {
      const fetchMock = stubFetch();

      await expect(makeForge().compareCommits('a/b', 'x', 'x')).resolves.toBe(
        'identical',
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('is behind when the compare has no commits', async () => {
      const fetchMock = stubFetch(jsonResponse({ commits: [] }));

      await expect(
        makeForge().compareCommits('a/b', 'base', 'head'),
      ).resolves.toBe('behind');
      expect(fetchMock.mock.calls[0]?.[0]).toContain('from=base');
      expect(fetchMock.mock.calls[0]?.[0]).toContain('to=head');
      expect(fetchMock.mock.calls[0]?.[0]).toContain('straight=false');
    });

    it('is ahead when the compare has commits', async () => {
      stubFetch(jsonResponse({ commits: [{ id: 'c1' }] }));

      await expect(
        makeForge().compareCommits('a/b', 'base', 'head'),
      ).resolves.toBe('ahead');
    });
  });

  describe('getCommit', () => {
    it('maps stats and diff entries', async () => {
      stubFetch(
        jsonResponse({
          id: 'abc',
          message: 'feat: x',
          stats: { additions: 3, deletions: 1 },
        }),
        jsonResponse([
          {
            deleted_file: false,
            diff: '--- a/f\n+++ b/f\n@@\n-old\n+new\n+more\n',
            new_file: false,
            new_path: 'f.ts',
            renamed_file: false,
          },
          { diff: '', new_file: true, new_path: 'g.ts' },
          { deleted_file: true, diff: '', new_path: 'h.ts' },
          { diff: '', new_path: 'i.ts', renamed_file: true },
        ]),
      );

      const commit = await makeForge().getCommit('a/b', 'abc');

      expect(commit).toMatchObject({
        additions: 3,
        deletions: 1,
        message: 'feat: x',
        sha: 'abc',
      });
      expect(commit?.files[0]).toMatchObject({
        additions: 2,
        deletions: 1,
        filename: 'f.ts',
        status: 'modified',
      });
      expect(commit?.files.map((file) => file.status)).toEqual([
        'modified',
        'added',
        'removed',
        'renamed',
      ]);
    });
  });

  describe('listCommits', () => {
    it('stops before stopAtSha', async () => {
      stubFetch(
        jsonResponse([
          { id: 'c3', message: 'three' },
          { id: 'c2', message: 'two' },
          { id: 'c1', message: 'one' },
        ]),
      );

      const commits = await makeForge().listCommits('a/b', 'main', 'c2');

      expect(commits).toEqual([
        { authorLogin: null, message: 'three', sha: 'c3' },
      ]);
    });

    it('pages until a short page', async () => {
      const fullPage = Array.from({ length: 100 }, (_, index) => ({
        id: `p1-${index}`,
        message: 'm',
      }));
      const fetchMock = stubFetch(
        jsonResponse(fullPage),
        jsonResponse([{ id: 'last', message: 'm' }]),
      );

      const commits = await makeForge().listCommits('a/b', 'main', null);

      expect(commits).toHaveLength(101);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1]?.[0]).toContain('page=2');
    });
  });

  describe('web URLs', () => {
    it('builds merge request and commit URLs', () => {
      const forge = makeForge();

      expect(forge.pullRequestUrl('group/sub/project', 7)).toBe(
        'https://gitlab.com/group/sub/project/-/merge_requests/7',
      );
      expect(forge.commitUrl('group/sub/project', 'abc')).toBe(
        'https://gitlab.com/group/sub/project/-/commit/abc',
      );
    });
  });
});
