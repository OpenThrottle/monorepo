import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchServerMetrics } from '../fetch-server-metrics';

const VALID_SNAPSHOT = {
  cpuSystemMs: 25,
  cpuUserMs: 350,
  externalMb: 2.5,
  heapTotalMb: 36,
  heapUsedMb: 28,
  rssMb: 55,
};

function mockFetchJson(body: unknown, ok = true): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Promise.resolve({
        json: async () => Promise.resolve(body),
        ok,
        status: ok ? 200 : 500,
        statusText: ok ? 'OK' : 'Internal Server Error',
      }),
    ),
  );
}

describe('fetchServerMetrics', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the snapshot when all six numeric fields are present', async () => {
    mockFetchJson(VALID_SNAPSHOT);
    const result = await fetchServerMetrics('http://localhost:3000');
    expect(result).toEqual(VALID_SNAPSHOT);
  });

  it('throws on a partial response missing heapTotalMb', async () => {
    const { heapTotalMb, ...partial } = VALID_SNAPSHOT;
    void heapTotalMb;
    mockFetchJson(partial);
    await expect(fetchServerMetrics('http://localhost:3000')).rejects.toThrow(
      /Invalid metrics response shape/,
    );
  });

  it('throws on a partial response missing externalMb', async () => {
    const { externalMb, ...partial } = VALID_SNAPSHOT;
    void externalMb;
    mockFetchJson(partial);
    await expect(fetchServerMetrics('http://localhost:3000')).rejects.toThrow(
      /Invalid metrics response shape/,
    );
  });

  it('throws on a partial response missing cpuSystemMs', async () => {
    const { cpuSystemMs, ...partial } = VALID_SNAPSHOT;
    void cpuSystemMs;
    mockFetchJson(partial);
    await expect(fetchServerMetrics('http://localhost:3000')).rejects.toThrow(
      /Invalid metrics response shape/,
    );
  });

  it('throws when a numeric field is non-finite (NaN)', async () => {
    mockFetchJson({ ...VALID_SNAPSHOT, rssMb: Number.NaN });
    await expect(fetchServerMetrics('http://localhost:3000')).rejects.toThrow(
      /Invalid metrics response shape/,
    );
  });

  it('throws when the response is not an object', async () => {
    mockFetchJson(null);
    await expect(fetchServerMetrics('http://localhost:3000')).rejects.toThrow(
      /Invalid metrics response shape/,
    );
  });

  it('throws when the HTTP response is not ok', async () => {
    mockFetchJson(VALID_SNAPSHOT, false);
    await expect(fetchServerMetrics('http://localhost:3000')).rejects.toThrow(
      /Metrics fetch failed 500/,
    );
  });
});
