import { describe, expect, test, vi } from 'vitest';

import type { SelfHostedEmbeddingConfig } from '../embedding-config.ts';
import { resolveEmbeddingConfig } from '../embedding-config.ts';
import type {
  EmbeddingWorkerHandle,
  LocalEmbeddingRequest,
  LocalEmbeddingWorkerData,
} from '../local-embedding.ts';
import { createLocalEmbeddingBackend } from '../local-embedding.ts';
import type { LocalEmbeddingTuning } from '../local-embedding-tuning.ts';

const TUNING: LocalEmbeddingTuning = {
  maxTokens: 512,
  slicePauseMs: 0,
  sliceSize: 2,
  threads: 3,
};

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

/**
 * A worker double the test answers by hand: `answer()` replies to the oldest posted request with
 * one vector per text, so a test controls exactly when each message finishes.
 */
function manualWorker(): {
  readonly answer: () => Promise<void>;
  readonly handle: EmbeddingWorkerHandle;
  readonly posted: (readonly string[])[];
} {
  const listeners: ((message: unknown) => void)[] = [];
  const unanswered: LocalEmbeddingRequest[] = [];
  const posted: (readonly string[])[] = [];

  const handle: EmbeddingWorkerHandle = {
    on: (event, listener) => {
      if (event === 'message') {
        listeners.push(listener);
      }
    },
    postMessage: (request) => {
      posted.push(request.texts);
      unanswered.push(request);
    },
    terminate: () => {
      return Promise.resolve(0);
    },
  };

  const answer = async (): Promise<void> => {
    const request = unanswered.shift();

    if (!request) {
      throw new Error('nothing in flight');
    }

    for (const listener of listeners) {
      listener({
        id: request.id,
        ok: true,
        vectors: request.texts.map(() => {
          return [1];
        }),
      });
    }

    // Let the awaiting callers enqueue their next slice before the test looks again.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  };

  return { answer, handle, posted };
}

describe('createLocalEmbeddingBackend', () => {
  describe('when the weights are missing', () => {
    test('returns unconfigured without starting a worker', async () => {
      const createWorker = vi.fn();
      const backend = createLocalEmbeddingBackend(config(), {
        createWorker,
        tuning: TUNING,
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
        tuning: TUNING,
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
        maxTokens: 512,
        modelId: 'nomic-ai/nomic-embed-text-v1.5',
        modelsDir: '/models',
        threads: 3,
      });
    });
  });

  describe('when a document embed is larger than one slice', () => {
    test('sends one slice at a time and keeps input order', async () => {
      const posted: LocalEmbeddingRequest[] = [];
      const worker = fakeWorker((request) => {
        posted.push(request);
        return {
          id: request.id,
          ok: true,
          vectors: request.texts.map((text) => {
            return [text.length];
          }),
        };
      });
      const backend = createLocalEmbeddingBackend(config(), {
        createWorker: () => {
          return worker.handle;
        },
        tuning: TUNING,
        weightsExist: () => {
          return true;
        },
      });

      const result = await backend.embed(
        ['a', 'bb', 'ccc', 'dddd', 'eeeee'],
        'document',
      );

      expect(
        posted.map((request) => {
          return request.texts;
        }),
      ).toEqual([['a', 'bb'], ['ccc', 'dddd'], ['eeeee']]);
      expect(result).toEqual({
        ok: true,
        vectors: [[1], [2], [3], [4], [5]],
      });
    });

    test('lets another caller in between slices', async () => {
      const posted: (readonly string[])[] = [];
      const worker = fakeWorker((request) => {
        posted.push(request.texts);
        return {
          id: request.id,
          ok: true,
          vectors: request.texts.map(() => {
            return [0];
          }),
        };
      });
      const backend = createLocalEmbeddingBackend(config(), {
        createWorker: () => {
          return worker.handle;
        },
        tuning: TUNING,
        weightsExist: () => {
          return true;
        },
      });

      await Promise.all([
        backend.embed(['d1', 'd2', 'd3', 'd4'], 'document'),
        backend.embed(['q'], 'query'),
      ]);

      expect(posted).toEqual([['d1', 'd2'], ['q'], ['d3', 'd4']]);
    });

    test('stops at the first failed slice', async () => {
      const worker = fakeWorker((request) => {
        return { detail: 'oom', id: request.id, ok: false };
      });
      const backend = createLocalEmbeddingBackend(config(), {
        createWorker: () => {
          return worker.handle;
        },
        tuning: TUNING,
        weightsExist: () => {
          return true;
        },
      });

      const result = await backend.embed(['a', 'b', 'c'], 'document');

      expect(result).toMatchObject({ ok: false, reason: 'provider_error' });
    });
  });

  describe('when a query arrives behind background work', () => {
    function backendFor(worker: ReturnType<typeof manualWorker>) {
      return createLocalEmbeddingBackend(config(), {
        createWorker: () => {
          return worker.handle;
        },
        tuning: TUNING,
        weightsExist: () => {
          return true;
        },
      });
    }

    test('runs next, ahead of every waiting background slice', async () => {
      const worker = manualWorker();
      const backend = backendFor(worker);

      const first = backend.embed(['a1', 'a2', 'a3', 'a4'], 'document');
      const second = backend.embed(['b1', 'b2', 'b3', 'b4'], 'document');
      const query = backend.embed(['q'], 'query');

      await worker.answer();

      // The query was queued behind a whole slice of `second`, yet it goes straight after the
      // slice that was already in flight.
      expect(worker.posted).toEqual([['a1', 'a2'], ['q']]);

      await worker.answer();
      await expect(query).resolves.toEqual({ ok: true, vectors: [[1]] });

      await worker.answer();
      await worker.answer();
      await worker.answer();

      expect(worker.posted).toEqual([
        ['a1', 'a2'],
        ['q'],
        ['b1', 'b2'],
        ['a3', 'a4'],
        ['b3', 'b4'],
      ]);
      await expect(first).resolves.toMatchObject({ ok: true });
      await expect(second).resolves.toMatchObject({ ok: true });
    });

    test('waits for at most the one slice in flight', async () => {
      const worker = manualWorker();
      const backend = backendFor(worker);

      void backend.embed(['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], 'document');

      await worker.answer();

      const query = backend.embed(['q'], 'query');

      // Nothing new is sent while a slice is in flight.
      expect(worker.posted).toEqual([
        ['a1', 'a2'],
        ['a3', 'a4'],
      ]);

      await worker.answer();

      expect(worker.posted.at(-1)).toEqual(['q']);
      await worker.answer();
      await expect(query).resolves.toMatchObject({ ok: true });
    });

    test('still finishes the background work once queries stop', async () => {
      const worker = manualWorker();
      const backend = backendFor(worker);

      const backfill = backend.embed(['a1', 'a2', 'a3', 'a4'], 'document');
      const queries = [
        backend.embed(['q1'], 'query'),
        backend.embed(['q2'], 'query'),
      ];

      await worker.answer();
      await worker.answer();
      await worker.answer();
      await worker.answer();

      expect(worker.posted).toEqual([
        ['a1', 'a2'],
        ['q1'],
        ['q2'],
        ['a3', 'a4'],
      ]);
      await expect(Promise.all(queries)).resolves.toHaveLength(2);
      await expect(backfill).resolves.toEqual({
        ok: true,
        vectors: [[1], [1], [1], [1]],
      });
    });
  });

  describe('when a query embed has several texts', () => {
    test('sends them as one message', async () => {
      const posted: (readonly string[])[] = [];
      const worker = fakeWorker((request) => {
        posted.push(request.texts);
        return {
          id: request.id,
          ok: true,
          vectors: request.texts.map(() => {
            return [0];
          }),
        };
      });
      const backend = createLocalEmbeddingBackend(config(), {
        createWorker: () => {
          return worker.handle;
        },
        tuning: TUNING,
        weightsExist: () => {
          return true;
        },
      });

      await backend.embed(['a', 'b', 'c'], 'query');

      expect(posted).toEqual([['a', 'b', 'c']]);
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
        tuning: TUNING,
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
        tuning: TUNING,
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
        tuning: TUNING,
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
