import { describe, expect, test, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { createMock } from '@golevelup/ts-vitest';
import { GitHubService } from './github.service';

describe('GitHubService', () => {
  const mockConfig = createMock<ConfigService>({
    get: vi.fn((key: string) =>
      key === 'GITHUB_TOKEN' ? undefined : undefined,
    ),
  });

  test('listPulls returns mapped DTOs from GitHub API response', async () => {
    const mockPulls = [
      {
        created_at: '2025-01-01T00:00:00Z',
        html_url: 'https://github.com/owner/repo/pull/1',
        merged_at: null,
        number: 1,
        state: 'open' as const,
        title: 'feat: add thing',
        updated_at: '2025-01-02T00:00:00Z',
        user: { login: 'octocat' },
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockPulls),
        ok: true,
      }),
    );

    const service = new GitHubService(mockConfig);
    const result = await service.listPulls('owner', 'repo', { state: 'open' });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      author: 'octocat',
      createdAt: '2025-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/owner/repo/pull/1',
      mergedAt: null,
      number: 1,
      state: 'open',
      title: 'feat: add thing',
      updatedAt: '2025-01-02T00:00:00Z',
    });

    vi.unstubAllGlobals();
  });

  test('getPullDetail returns additions, deletions, changed_files from single PR endpoint', async () => {
    const mockPull = {
      additions: 50,
      changed_files: 4,
      deletions: 10,
      merged_at: '2026-01-15T12:00:00Z',
      number: 42,
      user: { login: 'alice' },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockPull),
        ok: true,
      }),
    );

    const service = new GitHubService(mockConfig);
    const result = await service.getPullDetail('owner', 'repo', 42);

    expect(result).toEqual({
      additions: 50,
      author: 'alice',
      changedFiles: 4,
      deletions: 10,
      mergedAt: '2026-01-15T12:00:00Z',
      number: 42,
    });

    vi.unstubAllGlobals();
  });

  test('listIssues returns only PRs with labels and paginates', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      labels: i === 0 ? [{ name: 'bug' }, { name: 'feature' }] : [],
      number: i + 1,
      pull_request: {},
      state: 'open' as const,
    }));
    const page2 = [
      {
        labels: [{ name: 'docs' }],
        number: 101,
        pull_request: {},
        state: 'closed' as const,
      },
    ];
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({
        json: () => Promise.resolve(page1),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve(page2),
        ok: true,
      });
    vi.stubGlobal('fetch', fetchMock);

    const service = new GitHubService(mockConfig);
    const result = await service.listIssues('owner', 'repo', { state: 'all' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('page=1');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('page=2');
    expect(result).toHaveLength(101);
    expect(result[0]).toEqual({
      labels: ['bug', 'feature'],
      number: 1,
      state: 'open',
    });
    expect(result[100]).toEqual({
      labels: ['docs'],
      number: 101,
      state: 'closed',
    });

    vi.unstubAllGlobals();
  });

  test('getPullCommitCount returns total commit count and paginates', async () => {
    const page1 = Array.from({ length: 100 }, () => ({
      commit: {},
      sha: 'abc',
    }));
    const page2 = [{ commit: {}, sha: 'def' }];
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({
        json: () => Promise.resolve(page1),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve(page2),
        ok: true,
      });
    vi.stubGlobal('fetch', fetchMock);

    const service = new GitHubService(mockConfig);
    const result = await service.getPullCommitCount('owner', 'repo', 7);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/pulls/7/commits');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('page=1');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('page=2');
    expect(result).toBe(101);

    vi.unstubAllGlobals();
  });

  test('getPullCommitCount returns zero when PR has no commits', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve([]),
        ok: true,
      }),
    );

    const service = new GitHubService(mockConfig);
    const result = await service.getPullCommitCount('owner', 'repo', 1);

    expect(result).toBe(0);
    vi.unstubAllGlobals();
  });

  test('getPullReviews returns reviews with state and submittedAt and paginates', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) =>
      i === 0
        ? {
            state: 'CHANGES_REQUESTED' as const,
            submitted_at: '2026-01-02T00:00:00Z',
          }
        : { state: 'COMMENT' as const, submitted_at: '2026-01-03T00:00:00Z' },
    );
    const page2 = [
      { state: 'APPROVED' as const, submitted_at: '2026-01-05T00:00:00Z' },
    ];
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({
        json: () => Promise.resolve(page1),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve(page2),
        ok: true,
      });
    vi.stubGlobal('fetch', fetchMock);

    const service = new GitHubService(mockConfig);
    const result = await service.getPullReviews('owner', 'repo', 42);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/pulls/42/reviews');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('page=1');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('page=2');
    expect(result).toHaveLength(101);
    expect(result[0]).toEqual({
      state: 'CHANGES_REQUESTED',
      submittedAt: '2026-01-02T00:00:00Z',
    });
    expect(result[100]).toEqual({
      state: 'APPROVED',
      submittedAt: '2026-01-05T00:00:00Z',
    });

    vi.unstubAllGlobals();
  });
});
