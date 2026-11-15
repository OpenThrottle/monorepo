import { describe, expect, test, vi } from 'vitest';

import type { SelfHostedEmbeddingConfig } from '../embedding-config.ts';
import { resolveEmbeddingConfig } from '../embedding-config.ts';
import type {
  EmbeddingWorkerHandle,
  LocalEmbeddingRequest,
  LocalEmbeddingWorkerData,
} from '../local-embedding.ts';
import { createLocalEmbeddingBackend } from '../local-embedding.ts';

function config(): SelfHostedEmbeddingConfig {
  const result = resolveEmbeddingConfig({ EMBEDDING_MODELS_DIR: '/models' });

  if (!result.ok) {
    throw new Error(result.detail);
  }

  if (result.config.provider !== 'local') {
    throw new Error('expected the local provider');
  }

  return result.config;
}

/** A worker double that answers each request with `reply(request)`. */
function fakeWorker(reply: (request: LocalEmbeddingRequest) => unknown): {
  readonly crash: (code: number) => void;
  readonly handle: EmbeddingWorkerHandle;
  readonly started: LocalEmbeddingWorkerData[];
  readonly terminate: ReturnType<typeof vi.fn<() => Promise<number>>>;
} {
  const messageListeners: ((message: unknown) => void)[] = [];
  const exitListeners: ((code: unknown) => void)[] = [];
  const started: LocalEmbeddingWorkerData[] = [];
  const terminate = vi.fn(() => {
    return Promise.resolve(0);
  });

  const on = (
    event: 'error' | 'exit' | 'message',
    listener: (value: unknown) => void,
  ): void => {
    if (event === 'message') {
      messageListeners.push(listener);
    }

    if (event === 'exit') {
      exitListeners.push(listener);
    }
  };

  const handle: EmbeddingWorkerHandle = {
    on,
    postMessage: (request) => {
      queueMicrotask(() => {
        for (const listener of messageListeners) {
          listener(reply(request));
        }
      });
    },
    terminate,
  };

  return {
    crash: (code) => {
      for (const listener of exitListeners) {
        listener(code);
      }
    },
    handle,
    started,
    terminate,
  };
}

describe('createLocalEmbeddingBackend', () => {
  describe('when the weights are missing', () => {
    test('returns unconfigured without starting a worker', async () => {
      const createWorker = vi.fn();
      const backend = createLocalEmbeddingBackend(config(), {
        createWorker,
        weightsExist: () => {
          return false;
        },
      });

      const result = await backend.embed(['a'], 'document');

      expect(result).toMatchObject({ ok: false, reason: 'unconfigured' });
      expect(!result.ok && result.detail).toContain(
        '/models/nomic-ai/nomic-embed-text-v1.5/onnx/model_quantized.onnx',
      );
      expect(createWorker).not.toHaveBeenCalled();
    });
  });

  describe('when the worker answers', () => {
    test('starts one worker with the model id and returns its vectors', async () => {
      const worker = fakeWorker((request) => {
        return { id: request.id, ok: true, vectors: [[0.1, 0.2]] };
      });
      const createWorker = vi.fn((data: LocalEmbeddingWorkerData) => {
        worker.started.push(data);
        return worker.handle;
      });
      const backend = createLocalEmbeddingBackend(config(), {
        createWorker,
        weightsExist: () => {
          return true;
        },
      });

      const [first, second] = await Promise.all([
        backend.embed(['a'], 'document'),
        backend.embed(['b'], 'document'),
      ]);

      expect(first).toEqual({ ok: true, vectors: [[0.1, 0.2]] });
      expect(second).toEqual({ ok: true, vectors: [[0.1, 0.2]] });
      expect(createWorker).toHaveBeenCalledTimes(1);
      expect(worker.started[0]).toMatchObject({
        dtype: 'q8',
        modelId: 'nomic-ai/nomic-embed-text-v1.5',
        modelsDir: '/models',
      });
    });
  });

  describe('when the worker reports a failure', () => {
    test('returns provider_error with its detail', async () => {
      const worker = fakeWorker((request) => {
        return { detail: 'bad onnx', id: request.id, ok: false };
      });
      const backend = createLocalEmbeddingBackend(config(), {
        createWorker: () => {
          return worker.handle;
        },
        weightsExist: () => {
          return true;
        },
      });

      const result = await backend.embed(['a'], 'document');

      expect(result).toMatchObject({ ok: false, reason: 'provider_error' });
      expect(!result.ok && result.detail).toContain('bad onnx');
    });
  });

  describe('when the worker crashes mid-request', () => {
    test('fails pending requests and respawns on the next call', async () => {
      const crashing = fakeWorker(() => {
        return undefined;
      });
      const healthy = fakeWorker((request) => {
        return { id: request.id, ok: true, vectors: [[1]] };
      });
      const workers = [crashing, healthy];
      const backend = createLocalEmbeddingBackend(config(), {
        createWorker: () => {
          const next = workers.shift();

          if (!next) throw new Error('no more workers');
          return next.handle;
        },
        weightsExist: () => {
          return true;
        },
      });

      const pending = backend.embed(['a'], 'document');

      crashing.crash(1);

      await expect(pending).resolves.toMatchObject({
        ok: false,
        reason: 'provider_error',
      });
      await expect(backend.embed(['b'], 'document')).resolves.toEqual({
        ok: true,
        vectors: [[1]],
      });
    });
  });

  describe('close', () => {
    test('terminates the worker', async () => {
      const worker = fakeWorker((request) => {
        return { id: request.id, ok: true, vectors: [[1]] };
      });
      const backend = createLocalEmbeddingBackend(config(), {
        createWorker: () => {
          return worker.handle;
        },
        weightsExist: () => {
          return true;
        },
      });

      await backend.embed(['a'], 'document');
      await backend.close();

      expect(worker.terminate).toHaveBeenCalledTimes(1);
    });
  });
});
