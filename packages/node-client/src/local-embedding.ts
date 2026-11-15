/**
 * @description In-process embedding backend: quantized ONNX nomic-embed-text-v1.5 run by
 * transformers.js inside a dedicated worker thread, so inference never blocks the server's event
 * loop. Weights are read from `EMBEDDING_MODELS_DIR` only — remote downloads are disabled — and
 * missing weights are reported as `unconfigured`, never fetched at runtime.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { Worker } from 'node:worker_threads';

import type { EmbeddingBackend, EmbeddingBackendResult } from './embedding.ts';
import type { EmbeddingConfig } from './embedding-config.ts';

/** @description Message the main thread sends the worker. */
export interface LocalEmbeddingRequest {
  readonly id: number;
  readonly texts: readonly string[];
}

/** @description What the worker is started with. */
export interface LocalEmbeddingWorkerData {
  readonly dtype: 'q8';
  readonly modelId: string;
  readonly modelsDir: string;
  readonly transformersUrl: string;
}

/** @description The slice of `node:worker_threads` Worker the backend uses (tests fake it). */
export interface EmbeddingWorkerHandle {
  on(
    event: 'error' | 'exit' | 'message',
    listener: (value: unknown) => void,
  ): unknown;
  postMessage(message: LocalEmbeddingRequest): void;
  terminate(): Promise<number>;
}

export interface LocalEmbeddingBackendOptions {
  readonly createWorker: (
    data: LocalEmbeddingWorkerData,
  ) => EmbeddingWorkerHandle;
  readonly weightsExist: (config: EmbeddingConfig) => boolean;
}

/**
 * @description The worker's source, evaluated with `eval: true`. It is plain JavaScript on
 * purpose: an eval'd worker needs no file on disk, so it behaves the same under tsx, Vitest, the
 * tsc build and the pruned production image, none of which agree on where a sibling `.ts` file
 * would end up. transformers.js is imported by the absolute URL the main thread resolved.
 */
const WORKER_SOURCE = `
const { parentPort, workerData } = require('node:worker_threads');
let extractorPromise;

async function load() {
  const { env, pipeline } = await import(workerData.transformersUrl);
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = workerData.modelsDir;
  env.cacheDir = workerData.modelsDir;
  return pipeline('feature-extraction', workerData.modelId, { dtype: workerData.dtype });
}

parentPort.on('message', async (message) => {
  try {
    if (!extractorPromise) {
      extractorPromise = load().catch((error) => {
        extractorPromise = undefined;
        throw error;
      });
    }
    const extractor = await extractorPromise;
    const output = await extractor(message.texts, { normalize: true, pooling: 'mean' });
    parentPort.postMessage({ id: message.id, ok: true, vectors: output.tolist() });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    parentPort.postMessage({ detail, id: message.id, ok: false });
  }
});
`;

interface PendingRequest {
  readonly resolve: (result: EmbeddingBackendResult) => void;
}

/** @description Absolute path of the model's ONNX weights inside `modelsDir`. */
export function localEmbeddingWeightsPath(config: EmbeddingConfig): string {
  return path.join(
    config.modelsDir,
    config.spec.huggingFaceId,
    config.spec.localWeightsFile,
  );
}

function defaultWeightsExist(config: EmbeddingConfig): boolean {
  const tokenizer = path.join(
    config.modelsDir,
    config.spec.huggingFaceId,
    'tokenizer.json',
  );

  return existsSync(localEmbeddingWeightsPath(config)) && existsSync(tokenizer);
}

function defaultCreateWorker(
  data: LocalEmbeddingWorkerData,
): EmbeddingWorkerHandle {
  const worker = new Worker(WORKER_SOURCE, { eval: true, workerData: data });

  // An idle embedder must never keep the process alive on its own.
  worker.unref();

  return worker;
}

function isWorkerReply(value: unknown): value is {
  readonly detail?: unknown;
  readonly id: number;
  readonly ok: boolean;
  readonly vectors?: unknown;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    'ok' in value &&
    typeof value.ok === 'boolean'
  );
}

function isNumberMatrix(value: unknown): value is number[][] {
  return (
    Array.isArray(value) &&
    value.every((row) => {
      return Array.isArray(row);
    })
  );
}

/**
 * @description Creates the local backend. The worker is spawned on first use and respawned
 * after a crash; a weights check runs before every request so downloading the model fixes a
 * running server without a restart.
 */
export function createLocalEmbeddingBackend(
  config: EmbeddingConfig,
  options: LocalEmbeddingBackendOptions | undefined,
): EmbeddingBackend {
  const createWorker = options?.createWorker ?? defaultCreateWorker;
  const weightsExist = options?.weightsExist ?? defaultWeightsExist;
  const pending = new Map<number, PendingRequest>();
  let worker: EmbeddingWorkerHandle | undefined;
  let nextId = 1;

  const failAll = (source: EmbeddingWorkerHandle, detail: string): void => {
    // A late exit from a worker already replaced (or closed) must not fail the new one's work.
    if (worker !== source) {
      return;
    }

    for (const request of pending.values()) {
      request.resolve({ detail, ok: false, reason: 'provider_error' });
    }

    pending.clear();
    worker = undefined;
  };

  const handleMessage = (message: unknown): void => {
    if (!isWorkerReply(message)) {
      return;
    }

    const request = pending.get(message.id);

    if (!request) {
      return;
    }

    pending.delete(message.id);

    if (message.ok && isNumberMatrix(message.vectors)) {
      request.resolve({ ok: true, vectors: message.vectors });
      return;
    }

    const hasDetail = typeof message.detail === 'string';
    const detail = hasDetail
      ? String(message.detail)
      : 'local embedding worker returned no vectors';

    request.resolve({
      detail: `Local ${config.model}: ${detail}`,
      ok: false,
      reason: 'provider_error',
    });
  };

  const ensureWorker = (): EmbeddingWorkerHandle => {
    if (worker) {
      return worker;
    }

    const started = createWorker({
      dtype: 'q8',
      modelId: config.spec.huggingFaceId,
      modelsDir: config.modelsDir,
      transformersUrl: import.meta.resolve('@huggingface/transformers'),
    });

    started.on('message', handleMessage);
    started.on('error', (error) => {
      const message = error instanceof Error ? error.message : String(error);

      failAll(started, `Local embedding worker crashed: ${message}`);
    });
    started.on('exit', (code) => {
      failAll(
        started,
        `Local embedding worker exited with code ${String(code)}`,
      );
    });
    worker = started;

    return started;
  };

  const embed = (texts: readonly string[]): Promise<EmbeddingBackendResult> => {
    if (!weightsExist(config)) {
      return Promise.resolve({
        detail: `No ${config.model} weights at ${localEmbeddingWeightsPath(config)}. Run \`pnpm run embeddings:download-model\` (or set EMBEDDING_MODELS_DIR).`,
        ok: false,
        reason: 'unconfigured',
      });
    }

    const id = nextId;

    nextId += 1;

    return new Promise((resolve) => {
      pending.set(id, { resolve });
      ensureWorker().postMessage({ id, texts });
    });
  };

  const close = async (): Promise<void> => {
    const current = worker;

    if (current) {
      failAll(current, 'Local embedding worker was closed');
      await current.terminate();
    }
  };

  return { close, embed };
}
