/**
 * @description In-process embedding backend: quantized ONNX nomic-embed-text-v1.5 run by
 * transformers.js inside a dedicated worker thread, so inference never blocks the server's event
 * loop. Weights are read from `EMBEDDING_MODELS_DIR` only — remote downloads are disabled — and
 * missing weights are reported as `unconfigured`, never fetched at runtime.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { Worker } from 'node:worker_threads';

import type {
  EmbeddingBackend,
  EmbeddingBackendResult,
  EmbeddingInputType,
} from './embedding.ts';
import type { SelfHostedEmbeddingConfig } from './embedding-config.ts';
import type { LocalEmbeddingTuning } from './local-embedding-tuning.ts';
import { resolveLocalEmbeddingTuning } from './local-embedding-tuning.ts';

/** @description Message the main thread sends the worker. */
export interface LocalEmbeddingRequest {
  readonly id: number;
  readonly texts: readonly string[];
}

/** @description What the worker is started with. */
export interface LocalEmbeddingWorkerData {
  readonly dtype: 'q8';
  /** Tokenizer truncation length for every input. */
  readonly maxTokens: number;
  readonly modelId: string;
  readonly modelsDir: string;
  /** ONNX intra-op threads for the session. */
  readonly threads: number;
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
  /** Slice size and token cap; defaults to {@link resolveLocalEmbeddingTuning} over `process.env`. */
  readonly tuning: LocalEmbeddingTuning | undefined;
  readonly weightsExist: (config: SelfHostedEmbeddingConfig) => boolean;
}

/**
 * @description The worker's source, evaluated with `eval: true`. It is plain JavaScript on
 * purpose: an eval'd worker needs no file on disk, so it behaves the same under tsx, Vitest, the
 * tsc build and the pruned production image, none of which agree on where a sibling `.ts` file
 * would end up. transformers.js is imported by the absolute URL the main thread resolved.
 *
 * It tokenizes itself rather than calling the pipeline, because the pipeline truncates only at the
 * model's 8192-token context and takes no `max_length`. The steps are the pipeline's own
 * (`padding`, `truncation`, mean pooling over the attention mask, L2 normalisation).
 *
 * onnxruntime-node runs a session synchronously on this thread, so the worker handles one message
 * at a time; the main thread sends one at a time too, so it decides what runs next.
 */
const WORKER_SOURCE = `
const { parentPort, workerData } = require('node:worker_threads');
let extractorPromise;
let meanPooling;

async function load() {
  const { env, mean_pooling, pipeline } = await import(workerData.transformersUrl);
  meanPooling = mean_pooling;
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = workerData.modelsDir;
  env.cacheDir = workerData.modelsDir;
  return pipeline('feature-extraction', workerData.modelId, {
    dtype: workerData.dtype,
    session_options: { interOpNumThreads: 1, intraOpNumThreads: workerData.threads },
  });
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
    const inputs = extractor.tokenizer(message.texts, {
      max_length: workerData.maxTokens,
      padding: true,
      truncation: true,
    });
    const outputs = await extractor.model(inputs);
    const pooled = meanPooling(outputs.last_hidden_state, inputs.attention_mask).normalize(2, -1);
    parentPort.postMessage({ id: message.id, ok: true, vectors: pooled.tolist() });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    parentPort.postMessage({ detail, id: message.id, ok: false });
  }
});
`;

/** @description One worker message waiting to be sent, or the one in flight. */
interface QueuedSlice {
  readonly id: number;
  readonly resolve: (result: EmbeddingBackendResult) => void;
  readonly texts: readonly string[];
}

/** @description Waiting messages by lane; `interactive` always drains first. */
interface EmbeddingLanes {
  readonly background: QueuedSlice[];
  readonly interactive: QueuedSlice[];
}

/** @description Absolute path of the model's ONNX weights inside `modelsDir`. */
export function localEmbeddingWeightsPath(
  config: SelfHostedEmbeddingConfig,
): string {
  return path.join(
    config.modelsDir,
    config.spec.huggingFaceId,
    config.spec.localWeightsFile,
  );
}

function defaultWeightsExist(config: SelfHostedEmbeddingConfig): boolean {
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sliceTexts(
  texts: readonly string[],
  size: number,
): (readonly string[])[] {
  const slices: (readonly string[])[] = [];

  for (let start = 0; start < texts.length; start += size) {
    slices.push(texts.slice(start, start + size));
  }

  return slices;
}

/**
 * @description Creates the local backend. The worker is spawned on first use and respawned
 * after a crash; a weights check runs before every request so downloading the model fixes a
 * running server without a restart.
 *
 * Exactly one message is in flight at a time and the rest wait here in two lanes, so the main
 * thread decides what the worker runs next (OT plan ca13e543). A `query` embed — a search a person
 * is waiting on — goes as one message in the interactive lane. A `document` embed — the queue
 * processor, the reconciler's backfill — goes in the background lane as slices of
 * `tuning.sliceSize`, one at a time. The interactive lane always drains first, so a query waits at
 * most for the one slice already in flight; the background lane runs whenever it is empty, so a
 * backfill still completes, just behind interactive work.
 */
export function createLocalEmbeddingBackend(
  config: SelfHostedEmbeddingConfig,
  options: LocalEmbeddingBackendOptions | undefined,
): EmbeddingBackend {
  const createWorker = options?.createWorker ?? defaultCreateWorker;
  const weightsExist = options?.weightsExist ?? defaultWeightsExist;
  const tuning = options?.tuning ?? resolveLocalEmbeddingTuning();
  const lanes: EmbeddingLanes = { background: [], interactive: [] };
  let inFlight: QueuedSlice | undefined;
  let worker: EmbeddingWorkerHandle | undefined;
  let nextId = 1;

  const failAll = (source: EmbeddingWorkerHandle, detail: string): void => {
    // A late exit from a worker already replaced (or closed) must not fail the new one's work.
    if (worker !== source) {
      return;
    }

    const failed = [
      ...(inFlight ? [inFlight] : []),
      ...lanes.interactive,
      ...lanes.background,
    ];

    inFlight = undefined;
    lanes.interactive.length = 0;
    lanes.background.length = 0;
    worker = undefined;

    for (const slice of failed) {
      slice.resolve({ detail, ok: false, reason: 'provider_error' });
    }
  };

  const ensureWorker = (): EmbeddingWorkerHandle => {
    if (worker) {
      return worker;
    }

    const started = createWorker({
      dtype: 'q8',
      maxTokens: tuning.maxTokens,
      modelId: config.spec.huggingFaceId,
      modelsDir: config.modelsDir,
      threads: tuning.threads,
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

  const pump = (): void => {
    if (inFlight) {
      return;
    }

    const next = lanes.interactive.shift() ?? lanes.background.shift();

    if (!next) {
      return;
    }

    inFlight = next;
    ensureWorker().postMessage({ id: next.id, texts: next.texts });
  };

  function handleMessage(message: unknown): void {
    if (!isWorkerReply(message) || inFlight?.id !== message.id) {
      return;
    }

    const slice = inFlight;

    inFlight = undefined;

    if (message.ok && isNumberMatrix(message.vectors)) {
      slice.resolve({ ok: true, vectors: message.vectors });
    } else {
      const hasDetail = typeof message.detail === 'string';
      const detail = hasDetail
        ? String(message.detail)
        : 'local embedding worker returned no vectors';

      slice.resolve({
        detail: `Local ${config.model}: ${detail}`,
        ok: false,
        reason: 'provider_error',
      });
    }

    pump();
  }

  const send = (
    texts: readonly string[],
    lane: keyof EmbeddingLanes,
  ): Promise<EmbeddingBackendResult> => {
    const id = nextId;

    nextId += 1;

    return new Promise((resolve) => {
      lanes[lane].push({ id, resolve, texts });
      pump();
    });
  };

  const embed = async (
    texts: readonly string[],
    inputType: EmbeddingInputType,
  ): Promise<EmbeddingBackendResult> => {
    if (!weightsExist(config)) {
      return {
        detail: `No ${config.model} weights at ${localEmbeddingWeightsPath(config)}. Run \`pnpm run embeddings:download-model\` (or set EMBEDDING_MODELS_DIR).`,
        ok: false,
        reason: 'unconfigured',
      };
    }

    const isQuery = inputType === 'query';
    const lane = isQuery ? 'interactive' : 'background';
    const slices = isQuery ? [texts] : sliceTexts(texts, tuning.sliceSize);
    const vectors: number[][] = [];

    for (const [index, slice] of slices.entries()) {
      if (index > 0 && tuning.slicePauseMs > 0) {
        // eslint-disable-next-line no-await-in-loop -- the pause between slices is the point
        await delay(tuning.slicePauseMs);
      }

      // eslint-disable-next-line no-await-in-loop -- one slice at a time is the point: other callers interleave between them
      const result = await send(slice, lane);

      if (!result.ok) {
        return result;
      }

      vectors.push(...result.vectors);
    }

    return { ok: true, vectors };
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
