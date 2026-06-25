import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchJobTaskRunMetrics } from '../fetch-job-task-run-metrics';

interface MockResponseInit {
  readonly ok?: boolean;
  readonly status?: number;
  readonly statusText?: string;
  readonly text: string;
}

function mockFetchText({
  ok = true,
  status = 200,
  statusText = 'OK',
  text,
}: MockResponseInit): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Promise.resolve({
        ok,
        status,
        statusText,
        text: async () => Promise.resolve(text),
      }),
    ),
  );
}

describe('fetchJobTaskRunMetrics', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the job with taskRunMetrics on a valid response', async () => {
    const snapshot = {
      cpuSystemMs: 25,
      cpuUserMs: 350,
      externalMb: 2.5,
      heapTotalMb: 36,
      heapUsedMb: 28,
      rssMb: 55,
    };
    mockFetchText({
      text: JSON.stringify({
        data: {
          job: {
            id: 'job-1',
            taskRunMetrics: { atEnd: snapshot, atStart: snapshot },
          },
        },
      }),
    });

    const result = await fetchJobTaskRunMetrics(
      'http://localhost:3000',
      'job-1',
    );
    expect(result).toEqual({
      id: 'job-1',
      taskRunMetrics: { atEnd: snapshot, atStart: snapshot },
    });
  });

  it('returns null when the job is absent', async () => {
    mockFetchText({ text: JSON.stringify({ data: { job: null } }) });
    const result = await fetchJobTaskRunMetrics(
      'http://localhost:3000',
      'job-1',
    );
    expect(result).toBeNull();
  });

  it('throws GraphQL error <status> for a 5xx HTML error page instead of a SyntaxError', async () => {
    mockFetchText({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      text: '<html><body>502 Bad Gateway</body></html>',
    });
    await expect(
      fetchJobTaskRunMetrics('http://localhost:3000', 'job-1'),
    ).rejects.toThrow(/GraphQL error 502/);
  });

  it('throws GraphQL error <status> for an empty body on a non-ok response', async () => {
    mockFetchText({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: '',
    });
    await expect(
      fetchJobTaskRunMetrics('http://localhost:3000', 'job-1'),
    ).rejects.toThrow(/GraphQL error 500/);
  });

  it('throws GraphQL errors when the body carries a GraphQL errors array', async () => {
    mockFetchText({
      text: JSON.stringify({ errors: [{ message: 'boom' }] }),
    });
    await expect(
      fetchJobTaskRunMetrics('http://localhost:3000', 'job-1'),
    ).rejects.toThrow(/GraphQL errors: boom/);
  });
});
