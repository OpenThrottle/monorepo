/**
 * @description Repro and benchmark for search latency during a code-chunk re-embed (OT plan
 * ca13e543). Simulates the embeddings queue draining a `code_embeddings` backfill — jobs of
 * `--job-size` chunk texts, `--concurrency` jobs in flight, each one `embedder.embed(texts,
 * 'document')` exactly as the processor calls it — while a search-like loop embeds one query
 * every `--query-interval-ms`. Uses the real embedder (`resolveEmbeddingConfig` + `createEmbedder`,
 * so the local nomic worker thread), and real chunk texts read from Postgres, so the numbers are
 * the ones a server pulling a big re-embed would see, without booting the server.
 *
 * Writes nothing: chunk texts are read with one SELECT, vectors are discarded.
 *
 * Usage:
 *   pnpm run embeddings:bench-backfill -- --database-url postgresql://user:pass@localhost:6010/openthrottle
 *     [--chunks 400] [--job-size 100] [--concurrency 2] [--query-interval-ms 1000]
 *
 * Reports backfill throughput (chunks/s), query-embed latency (p50/p95/max), peak process RSS
 * (the worker thread shares the process) and average CPU over the run.
 */

import { performance } from 'node:perf_hooks';

import {
  createEmbedder,
  resolveEmbeddingConfig,
} from '@openthrottle/node-client';
import pg from 'pg';

import { createLogger } from './utils/logger.ts';

interface Sample {
  readonly cpuMicros: number;
  readonly rss: number;
}

const logger = createLogger();

const QUERIES = [
  'ci pipelines',
  'how are worktrees provisioned',
  'embedding reconciler',
  'graphql schema codegen',
  'plan run settle',
];

const readFlag = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);

  return index === -1 ? undefined : process.argv[index + 1];
};

const readNumberFlag = (name: string, fallback: number): number => {
  const raw = readFlag(name);
  const value = raw === undefined ? Number.NaN : Number(raw);

  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const percentile = (values: readonly number[], p: number): number => {
  const sorted = [...values].sort((a, b) => {
    return a - b;
  });
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );

  return sorted[Math.max(0, index)] ?? 0;
};

const megabytes = (bytes: number): string => {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
};

const readChunks = async (
  databaseUrl: string,
  limit: number,
): Promise<string[]> => {
  const client = new pg.Client({ connectionString: databaseUrl });

  await client.connect();

  try {
    const result = await client.query<{ content: string }>(
      'SELECT content FROM code_embeddings ORDER BY id LIMIT $1',
      [limit],
    );

    return result.rows.map((row) => {
      return row.content;
    });
  } finally {
    await client.end();
  }
};

const main = async (): Promise<void> => {
  const databaseUrl = readFlag('--database-url') ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.fail('Pass --database-url (or DATABASE_URL) to read code chunks.');
    process.exitCode = 1;
    return;
  }

  const chunkLimit = readNumberFlag('--chunks', 400);
  const jobSize = readNumberFlag('--job-size', 100);
  const concurrency = readNumberFlag('--concurrency', 2);
  const queryIntervalMs = readNumberFlag('--query-interval-ms', 1000);
  const configResult = resolveEmbeddingConfig();

  if (!configResult.ok) {
    logger.fail(`Embedder unconfigured: ${configResult.detail}`);
    process.exitCode = 1;
    return;
  }

  const chunks = await readChunks(databaseUrl, chunkLimit);
  const embedder = createEmbedder(configResult.config);

  logger.heading('Embedding backfill bench');
  logger.detail(
    `${chunks.length} chunks, job size ${jobSize}, concurrency ${concurrency}, query every ${queryIntervalMs}ms`,
  );

  // Load the model before timing anything, so the first query does not pay for it.
  const warm = await embedder.embed(['warm up'], 'query');

  if (!warm.ok) {
    logger.fail(`Warm-up embed failed: ${warm.reason}: ${warm.detail}`);
    await embedder.close();
    process.exitCode = 1;
    return;
  }

  const jobs: string[][] = [];

  for (let start = 0; start < chunks.length; start += jobSize) {
    jobs.push(chunks.slice(start, start + jobSize));
  }

  const samples: Sample[] = [];
  const queryLatencies: number[] = [];
  let embedded = 0;
  let backfillDone = false;
  const cpuStart = process.cpuUsage();
  const sampler = setInterval(() => {
    const cpu = process.cpuUsage(cpuStart);

    samples.push({
      cpuMicros: cpu.user + cpu.system,
      rss: process.memoryUsage().rss,
    });
  }, 500);

  const runWorker = async (): Promise<void> => {
    for (;;) {
      const job = jobs.shift();

      if (!job) {
        return;
      }

      // eslint-disable-next-line no-await-in-loop -- a queue worker takes one job at a time
      const result = await embedder.embed(job, 'document');

      if (!result.ok) {
        throw new Error(
          `Backfill embed failed: ${result.reason}: ${result.detail}`,
        );
      }

      embedded += job.length;
      logger.step(`backfill ${embedded}/${chunks.length}`);
    }
  };

  const runQueries = async (): Promise<void> => {
    let index = 0;

    while (!backfillDone) {
      const query = QUERIES[index % QUERIES.length] ?? 'search';
      const started = performance.now();

      // eslint-disable-next-line no-await-in-loop -- one query at a time, like a user typing
      const result = await embedder.embed([query], 'query');
      const elapsed = performance.now() - started;

      if (!result.ok) {
        throw new Error(
          `Query embed failed: ${result.reason}: ${result.detail}`,
        );
      }

      queryLatencies.push(elapsed);
      logger.detail(`query "${query}" ${Math.round(elapsed)}ms`);
      index += 1;

      // eslint-disable-next-line no-await-in-loop -- paced on purpose
      await new Promise((resolve) => {
        setTimeout(resolve, queryIntervalMs);
      });
    }
  };

  const backfillStarted = performance.now();
  const queries = runQueries();
  const workers = Array.from({ length: concurrency }, () => {
    return runWorker();
  });

  await Promise.all(workers);

  const backfillSeconds = (performance.now() - backfillStarted) / 1000;

  backfillDone = true;
  await queries;
  clearInterval(sampler);
  await embedder.close();

  const peakRss = Math.max(
    ...samples.map((sample) => {
      return sample.rss;
    }),
  );
  const lastSample = samples.at(-1);
  const cpuPercent = lastSample
    ? (lastSample.cpuMicros / 1_000_000 / backfillSeconds) * 100
    : 0;

  logger.success('Done');
  logger.detail(
    `backfill: ${embedded} chunks in ${backfillSeconds.toFixed(1)}s = ${(embedded / backfillSeconds).toFixed(2)} chunks/s`,
  );
  logger.detail(
    `query embed (n=${queryLatencies.length}): p50 ${Math.round(percentile(queryLatencies, 50))}ms, p95 ${Math.round(percentile(queryLatencies, 95))}ms, max ${Math.round(Math.max(0, ...queryLatencies))}ms`,
  );
  logger.detail(
    `peak RSS ${megabytes(peakRss)}, avg CPU ${Math.round(cpuPercent)}%`,
  );
};

await main();
