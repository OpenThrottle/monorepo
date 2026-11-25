#!/usr/bin/env node

/**
 * @description Server boot gate (`monorepo:ensure-embedding-model`, OT plan 7803080c): makes sure the
 * semantic-search model is in the weights cache before openthrottle-server's `dev`, `dev-api`, `worker` or
 * `start` boots, so nobody has to know `pnpm run embeddings:download-model` exists.
 *
 * Behaviour:
 *  1. `EMBEDDING_PROVIDER` other than `local` (ollama, openai, gemini) → skip; those never read the weights.
 *  2. Every pinned file is re-hashed on every boot (~0.5s for the 137 MB): a cached, intact model is a
 *     no-op, and a corrupted one is caught and re-fetched.
 *  3. Anything missing or mismatched is downloaded, with a progress line, then the embedder is loaded and
 *     asked for one vector — only after a download, never on a cached boot.
 *  4. Any failure (offline, Hugging Face down, bad checksum, embedder refuses) prints a loud warning and
 *     still exits 0: a dev server that will not start offline is worse than lexical-only search, and the
 *     next boot with network heals it. `./scripts/setup.sh` keeps failing hard through the CLI.
 *
 * The Nx target runs this with the server's `.env` (when present), so it sees the same
 * `EMBEDDING_PROVIDER` and `EMBEDDING_MODELS_DIR` the server will.
 */

import { toErrorMessage } from '@openthrottle/nodejs-utils';

import type {
  FetchModelFilesResult,
  VerifyEmbedderResult,
} from './embedding-model.ts';
import {
  createDownloadProgressLogger,
  fetchModelFiles,
  MODEL_FILES,
  resolveEmbeddingProvider,
  resolveModelsDir,
  verifyEmbedder,
} from './embedding-model.ts';
import type { Logger } from './utils/logger.ts';
import { createLogger } from './utils/logger.ts';

export type EnsureEmbeddingModelOutcome =
  | {
      readonly kind: 'cached';
      readonly root: string;
    }
  | {
      readonly downloaded: number;
      readonly kind: 'downloaded';
      readonly root: string;
    }
  | {
      readonly kind: 'failed';
      readonly reason: string;
      readonly root: string;
    }
  | {
      readonly kind: 'skipped';
      readonly provider: string;
    };

export interface EnsureEmbeddingModelDeps {
  readonly env: NodeJS.ProcessEnv;
  readonly fetchFiles: (root: string) => Promise<FetchModelFilesResult>;
  readonly verify: (root: string) => Promise<VerifyEmbedderResult>;
}

/**
 * @description The gate's decision, with fetching and verifying injected so every branch is testable
 * without a network or the ONNX runtime. Never throws.
 */
export const ensureEmbeddingModel = async (
  deps: EnsureEmbeddingModelDeps,
): Promise<EnsureEmbeddingModelOutcome> => {
  const provider = resolveEmbeddingProvider(deps.env);

  if (provider !== 'local') {
    return { kind: 'skipped', provider };
  }

  const root = resolveModelsDir(deps.env, undefined);
  const fetched = await deps.fetchFiles(root);

  if (!fetched.ok) {
    return { kind: 'failed', reason: fetched.reason, root };
  }

  if (fetched.downloaded === 0) {
    return { kind: 'cached', root };
  }

  const verified = await deps.verify(root);

  if (!verified.ok) {
    return {
      kind: 'failed',
      reason: `downloaded, but the embedder would not load: ${verified.reason}`,
      root,
    };
  }

  return { downloaded: fetched.downloaded, kind: 'downloaded', root };
};

/**
 * @description The warning a failed gate prints. Several lines on purpose: one dim line among the
 * hundreds a dev boot prints is how a missing model went unnoticed in the first place.
 */
export const formatMissingModelWarning = (
  outcome: Extract<EnsureEmbeddingModelOutcome, { kind: 'failed' }>,
): readonly string[] => {
  return [
    '',
    '⚠  Semantic search is OFF: the embedding model could not be fetched.',
    `   Reason: ${outcome.reason}`,
    `   Cache:  ${outcome.root}`,
    '   The server will still boot; search answers by keyword only until the model is in place.',
    '   It is retried on every boot. To fetch it now: pnpm run embeddings:download-model -- --verify',
    '',
  ];
};

const report = (logger: Logger, outcome: EnsureEmbeddingModelOutcome): void => {
  if (outcome.kind === 'skipped') {
    logger.info(
      `Embedding model: EMBEDDING_PROVIDER=${outcome.provider} needs no local weights, skipping.`,
    );

    return;
  }

  if (outcome.kind === 'cached') {
    logger.success(`Embedding model present and verified (${outcome.root}).`);

    return;
  }

  if (outcome.kind === 'downloaded') {
    logger.success(
      `Embedding model fetched (${outcome.downloaded} file(s)) and verified (${outcome.root}).`,
    );

    return;
  }

  formatMissingModelWarning(outcome).forEach((line) => {
    process.stderr.write(`${line}\n`);
  });
};

const main = async (): Promise<void> => {
  const logger = createLogger();
  let announced = false;
  const announce = (): void => {
    if (!announced) {
      announced = true;
      logger.heading(
        'Fetching the semantic-search embedding model (one-time, ~137 MB)',
      );
    }
  };
  const progress = createDownloadProgressLogger(logger.step);

  const outcome = await ensureEmbeddingModel({
    env: process.env,
    fetchFiles: (root) => {
      return fetchModelFiles({
        fetchImpl: fetch,
        files: MODEL_FILES,
        onFile: (path, fileOutcome) => {
          if (fileOutcome === 'downloaded') {
            logger.step(`${path}: downloaded`);
          }
        },
        onProgress: (event) => {
          announce();
          progress(event);
        },
        root,
      });
    },
    verify: verifyEmbedder,
  });

  report(logger, outcome);
};

// Only run when invoked directly (not when imported by tests).
// A crash here must not block the boot either (behaviour 4): warn and exit 0.
if (process.argv[1]?.endsWith('ensure-embedding-model.ts')) {
  try {
    await main();
  } catch (error) {
    formatMissingModelWarning({
      kind: 'failed',
      reason: toErrorMessage(error),
      root: resolveModelsDir(process.env, undefined),
    }).forEach((line) => {
      process.stderr.write(`${line}\n`);
    });
  }
}
