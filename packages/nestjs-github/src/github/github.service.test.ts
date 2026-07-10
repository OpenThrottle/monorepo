import { describe, expect, test, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { createMock } from '@golevelup/ts-vitest';
import { asMock } from '@openthrottle/nestjs-testing';
import {
  GITHUB_REQUEST_TIMEOUT_DEFAULT_MS,
  GitHubService,
} from './github.service';

describe('GitHubService', () => {
  const mockConfig = createMock<ConfigService>({
    get: vi.fn((key: string) =>
      key === 'GITHUB_TOKEN' ? undefined : undefined,
    ),
  });

  test('listPulls returns mapped DTOs from GitHub API response', async () => {
    const mockPulls = [
      {
        base: { ref: 'main' },
        created_at: '2025-01-01T00:00:00Z',
        head: {
          ref: 'feat/add-thing',
          sha: 'abc123def456abc123def456abc123def456abcd',
        },
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
      baseRef: 'main',
      createdAt: '2025-01-01T00:00:00Z',
      headRef: 'feat/add-thing',
      headSha: 'abc123def456abc123def456abc123def456abcd',
      htmlUrl: 'https://github.com/owner/repo/pull/1',
      mergedAt: null,
      number: 1,
      state: 'open',
      title: 'feat: add thing',
      updatedAt: '2025-01-02T00:00:00Z',
    });

    vi.unstubAllGlobals();
  });

  test('listAllPulls paginates until a short page and concatenates results', async () => {
    const makePull = (n: number, mergedAt: string | null) => ({
      base: { ref: 'main' },
      created_at: '2025-01-01T00:00:00Z',
      head: { ref: `feat/${n}`, sha: 'a'.repeat(40) },
      html_url: `https://github.com/owner/repo/pull/${n}`,
      merged_at: mergedAt,
      number: n,
      state: 'closed' as const,
      title: `feat: ${n}`,
      updated_at: '2025-01-02T00:00:00Z',
      user: { login: 'octocat' },
    });
    const page1 = Array.from({ length: 100 }, (_, i) =>
      makePull(i + 1, '2025-02-01T00:00:00Z'),
    );
    const page2 = [makePull(101, '2025-02-02T00:00:00Z')];
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({ json: () => Promise.resolve(page1), ok: true })
      .mockResolvedValueOnce({ json: () => Promise.resolve(page2), ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const service = new GitHubService(mockConfig);
    const result = await service.listAllPulls('owner', 'repo', {
      state: 'closed',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('page=1');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('page=2');
    expect(result).toHaveLength(101);
    expect(result[100]?.number).toBe(101);

    vi.unstubAllGlobals();
  });

  test('listAllPulls stops at the page cap (does not loop unbounded)', async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({
      base: { ref: 'main' },
      created_at: '2025-01-01T00:00:00Z',
      head: { ref: `feat/${i}`, sha: 'b'.repeat(40) },
      html_url: `https://github.com/owner/repo/pull/${i}`,
      merged_at: '2025-02-01T00:00:00Z',
      number: i,
      state: 'closed' as const,
      title: `feat: ${i}`,
      updated_at: '2025-01-02T00:00:00Z',
      user: { login: 'octocat' },
    }));
    // Always return a full page so only the cap can stop pagination.
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve(fullPage), ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const service = new GitHubService(mockConfig);
    const result = await service.listAllPulls('owner', 'repo', {
      state: 'closed',
    });

    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(result).toHaveLength(1000);

    vi.unstubAllGlobals();
  });

  test('listAllPulls applies the merged filter across pages', async () => {
    const makePull = (n: number, mergedAt: string | null) => ({
      base: { ref: 'main' },
      created_at: '2025-01-01T00:00:00Z',
      head: { ref: `feat/${n}`, sha: 'c'.repeat(40) },
      html_url: `https://github.com/owner/repo/pull/${n}`,
      merged_at: mergedAt,
      number: n,
      state: 'closed' as const,
      title: `feat: ${n}`,
      updated_at: '2025-01-02T00:00:00Z',
      user: { login: 'octocat' },
    });
    const page = [makePull(1, '2025-02-01T00:00:00Z'), makePull(2, null)];
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ json: () => Promise.resolve(page), ok: true }),
    );

    const service = new GitHubService(mockConfig);
    const result = await service.listAllPulls('owner', 'repo', {
      merged: true,
      state: 'closed',
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.number).toBe(1);

    vi.unstubAllGlobals();
  });

  test('getPullListItem returns null when GitHub returns 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 404,
      }),
    );

    const service = new GitHubService(mockConfig);
    const result = await service.getPullListItem('owner', 'repo', 99);

    expect(result).toBeNull();

    vi.unstubAllGlobals();
  });

  test('getPullListItem returns mapped DTO from single PR endpoint', async () => {
    const mockPull = {
      base: { ref: 'develop' },
      created_at: '2025-01-01T00:00:00Z',
      head: {
        ref: 'fix/thing',
        sha: '1111111111111111111111111111111111111111',
      },
      html_url: 'https://github.com/owner/repo/pull/2',
      merged_at: null,
      number: 2,
      state: 'open' as const,
      title: 'fix: thing',
      updated_at: '2025-01-02T00:00:00Z',
      user: { login: 'dev' },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockPull),
        ok: true,
        status: 200,
      }),
    );

    const service = new GitHubService(mockConfig);
    const result = await service.getPullListItem('owner', 'repo', 2);

    expect(result).toEqual({
      author: 'dev',
      baseRef: 'develop',
      createdAt: '2025-01-01T00:00:00Z',
      headRef: 'fix/thing',
      headSha: '1111111111111111111111111111111111111111',
      htmlUrl: 'https://github.com/owner/repo/pull/2',
      mergedAt: null,
      number: 2,
      state: 'open',
      title: 'fix: thing',
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

  test('listIssues stops at the page cap (does not loop unbounded)', async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({
      labels: [],
      number: i + 1,
      pull_request: {},
      state: 'open' as const,
    }));
    // Always return a full page so only the cap can stop pagination.
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve(fullPage), ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const service = new GitHubService(mockConfig);
    const result = await service.listIssues('owner', 'repo', { state: 'all' });

    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(result).toHaveLength(1000);

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

  test('getPullCommitCount stops at the page cap (does not loop unbounded)', async () => {
    const fullPage = Array.from({ length: 100 }, () => ({
      commit: {},
      sha: 'abc',
    }));
    // Always return a full page so only the cap can stop pagination.
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve(fullPage), ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const service = new GitHubService(mockConfig);
    const result = await service.getPullCommitCount('owner', 'repo', 7);

    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(result).toBe(1000);

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

  test('getPullReviews stops at the page cap (does not loop unbounded)', async () => {
    const fullPage = Array.from({ length: 100 }, () => ({
      state: 'COMMENT' as const,
      submitted_at: '2026-01-03T00:00:00Z',
    }));
    // Always return a full page so only the cap can stop pagination.
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve(fullPage), ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const service = new GitHubService(mockConfig);
    const result = await service.getPullReviews('owner', 'repo', 42);

    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(result).toHaveLength(1000);

    vi.unstubAllGlobals();
  });

  test('passes an AbortSignal to fetch (default timeout when unconfigured)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve([]), ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const service = new GitHubService(mockConfig);
    await service.listPulls('owner', 'repo', { state: 'open' });

    const init = asMock<RequestInit | undefined>(fetchMock.mock.calls[0]?.[1]);
    expect(init?.signal).toBeInstanceOf(AbortSignal);

    vi.unstubAllGlobals();
  });

  test('honors a configured GITHUB_REQUEST_TIMEOUT_MS', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    const configWithTimeout = createMock<ConfigService>({
      get: vi.fn((key: string) =>
        key === 'GITHUB_REQUEST_TIMEOUT_MS' ? 2500 : undefined,
      ),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: () => Promise.resolve([]), ok: true }),
    );

    const service = new GitHubService(configWithTimeout);
    await service.listPulls('owner', 'repo', { state: 'open' });

    expect(timeoutSpy).toHaveBeenCalledWith(2500);

    timeoutSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  test('falls back to the default timeout when configured value is invalid', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    const configWithBadTimeout = createMock<ConfigService>({
      get: vi.fn((key: string) =>
        key === 'GITHUB_REQUEST_TIMEOUT_MS' ? -1 : undefined,
      ),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: () => Promise.resolve([]), ok: true }),
    );

    const service = new GitHubService(configWithBadTimeout);
    await service.listPulls('owner', 'repo', { state: 'open' });

    expect(timeoutSpy).toHaveBeenCalledWith(GITHUB_REQUEST_TIMEOUT_DEFAULT_MS);

    timeoutSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  test('translates a fetch TimeoutError into a GatewayTimeoutException', async () => {
    const timeoutError = new Error('The operation timed out.');
    timeoutError.name = 'TimeoutError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError));

    const service = new GitHubService(mockConfig);

    await expect(
      service.listPulls('owner', 'repo', { state: 'open' }),
    ).rejects.toBeInstanceOf(GatewayTimeoutException);

    vi.unstubAllGlobals();
  });

  test('rethrows non-timeout fetch errors unchanged', async () => {
    const networkError = new Error('ECONNRESET');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError));

    const service = new GitHubService(mockConfig);

    await expect(
      service.listPulls('owner', 'repo', { state: 'open' }),
    ).rejects.toBe(networkError);

    vi.unstubAllGlobals();
  });

  test('retries a 429 honoring Retry-After then succeeds', async () => {
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      // Run the backoff callback immediately so the test does not actually wait.
      .mockImplementation((cb: () => void) => {
        cb();
        return asMock<ReturnType<typeof setTimeout>>(0);
      });

    const rateLimited = {
      headers: new Headers({ 'retry-after': '1' }),
      json: () => Promise.resolve([]),
      ok: false,
      status: 429,
    };
    const success = {
      headers: new Headers(),
      json: () => Promise.resolve([]),
      ok: true,
      status: 200,
    };
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(success);
    vi.stubGlobal('fetch', fetchMock);

    const service = new GitHubService(mockConfig);
    const result = await service.listPulls('owner', 'repo', { state: 'open' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual([]);

    setTimeoutSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  test('retries transient 5xx up to the bounded retry count then surfaces the error', async () => {
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((cb: () => void) => {
        cb();
        return asMock<ReturnType<typeof setTimeout>>(0);
      });

    const serverError = {
      headers: new Headers(),
      json: () => Promise.resolve([]),
      ok: false,
      status: 503,
      text: () => Promise.resolve('service unavailable'),
    };
    const fetchMock = vi.fn().mockResolvedValue(serverError);
    vi.stubGlobal('fetch', fetchMock);

    const service = new GitHubService(mockConfig);

    await expect(
      service.listPulls('owner', 'repo', { state: 'open' }),
    ).rejects.toThrow('GitHub API error 503');

    // initial attempt + GITHUB_MAX_RETRIES_DEFAULT (3) retries.
    expect(fetchMock).toHaveBeenCalledTimes(4);

    setTimeoutSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  test('does not retry a non-retryable 4xx (e.g. 404)', async () => {
    const notFound = {
      headers: new Headers(),
      status: 404,
    };
    const fetchMock = vi.fn().mockResolvedValue(notFound);
    vi.stubGlobal('fetch', fetchMock);

    const service = new GitHubService(mockConfig);
    const result = await service.getPullListItem('owner', 'repo', 99);

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  test('readRateLimit parses X-RateLimit-* headers', () => {
    const service = new GitHubService(mockConfig);
    const res = asMock<Response>({
      headers: new Headers({
        'x-ratelimit-remaining': '7',
        'x-ratelimit-reset': '1718000000',
      }),
    });

    expect(service.readRateLimit(res)).toEqual({
      remaining: 7,
      resetEpochSeconds: 1718000000,
    });
  });

  test('readRateLimit returns nulls when headers are absent', () => {
    const service = new GitHubService(mockConfig);
    const res = asMock<Response>({ headers: new Headers() });

    expect(service.readRateLimit(res)).toEqual({
      remaining: null,
      resetEpochSeconds: null,
    });
  });

  test('listPulls raises a typed 502 when the response is not an array', async () => {
    // A GitHub error object (e.g. { message: 'Not Found' }) would previously
    // crash with `data.map is not a function`; it now surfaces as a 502.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ message: 'Bad credentials' }),
        ok: true,
      }),
    );

    const service = new GitHubService(mockConfig);

    await expect(
      service.listPulls('owner', 'repo', { state: 'open' }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    vi.unstubAllGlobals();
  });

  test('getPullDetail raises a typed 502 when diff-stat fields are missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ number: 42 }),
        ok: true,
      }),
    );

    const service = new GitHubService(mockConfig);

    await expect(
      service.getPullDetail('owner', 'repo', 42),
    ).rejects.toBeInstanceOf(BadGatewayException);

    vi.unstubAllGlobals();
  });

  test('listPulls throws "GitHub API error" with status and truncated body on a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Bad credentials'),
      }),
    );

    const service = new GitHubService(mockConfig);

    await expect(
      service.listPulls('owner', 'repo', { state: 'open' }),
    ).rejects.toThrow('GitHub API error 401: Bad credentials');

    vi.unstubAllGlobals();
  });

  test('listAllPulls propagates a non-OK response as a GitHub API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: () => Promise.resolve('Unprocessable'),
      }),
    );

    const service = new GitHubService(mockConfig);

    await expect(
      service.listAllPulls('owner', 'repo', { state: 'closed' }),
    ).rejects.toThrow('GitHub API error 422');

    vi.unstubAllGlobals();
  });

  test('listIssues propagates a non-OK response as a GitHub API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      }),
    );

    const service = new GitHubService(mockConfig);

    await expect(
      service.listIssues('owner', 'repo', { state: 'all' }),
    ).rejects.toThrow('GitHub API error 403');

    vi.unstubAllGlobals();
  });

  test('getPullCommitCount propagates a non-OK response as a GitHub API error', async () => {
    // 422 is non-retryable, so this exercises the error branch without backoff.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        headers: new Headers(),
        ok: false,
        status: 422,
        text: () => Promise.resolve('boom'),
      }),
    );

    const service = new GitHubService(mockConfig);

    await expect(
      service.getPullCommitCount('owner', 'repo', 7),
    ).rejects.toThrow('GitHub API error 422');

    vi.unstubAllGlobals();
  });

  test('getPullReviews propagates a non-OK response as a GitHub API error', async () => {
    // 422 is non-retryable, so this exercises the error branch without backoff.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        headers: new Headers(),
        ok: false,
        status: 422,
        text: () => Promise.resolve('bad request'),
      }),
    );

    const service = new GitHubService(mockConfig);

    await expect(service.getPullReviews('owner', 'repo', 42)).rejects.toThrow(
      'GitHub API error 422',
    );

    vi.unstubAllGlobals();
  });

  test('truncates the error body to 200 characters', async () => {
    const longBody = 'x'.repeat(500);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 418,
        text: () => Promise.resolve(longBody),
      }),
    );

    const service = new GitHubService(mockConfig);

    await expect(
      service.listPulls('owner', 'repo', { state: 'open' }),
    ).rejects.toThrow(`GitHub API error 418: ${'x'.repeat(200)}`);

    vi.unstubAllGlobals();
  });

  test('getPullListItem distinguishes a non-404 error from the 404 null case', async () => {
    // 404 returns null (covered elsewhere); a 500 must surface as an error,
    // not be swallowed into null. 500 is retryable, so run backoff synchronously.
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((cb: () => void) => {
        cb();
        return asMock<ReturnType<typeof setTimeout>>(0);
      });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        headers: new Headers(),
        ok: false,
        status: 500,
        text: () => Promise.resolve('server error'),
      }),
    );

    const service = new GitHubService(mockConfig);

    await expect(service.getPullListItem('owner', 'repo', 99)).rejects.toThrow(
      'GitHub API error 500',
    );

    setTimeoutSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  test('getPullDetail surfaces a 404 as a GitHub API error (no null short-circuit)', async () => {
    // Unlike getPullListItem, getPullDetail has no 404 special case; a missing
    // PR must propagate as an error rather than returning a partial DTO.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      }),
    );

    const service = new GitHubService(mockConfig);

    await expect(service.getPullDetail('owner', 'repo', 99)).rejects.toThrow(
      'GitHub API error 404',
    );

    vi.unstubAllGlobals();
  });
});
