import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, test, vi } from 'vitest';

import type { DownloadProgress, ModelFile } from '../embedding-model.ts';
import {
  createDownloadProgressLogger,
  fetchModelFiles,
  HUGGING_FACE_ID,
  resolveEmbeddingProvider,
  resolveModelsDir,
} from '../embedding-model.ts';

const BODY = 'weights';

const sha256 = (text: string): string => {
  return createHash('sha256').update(text).digest('hex');
};

const FILE: ModelFile = { path: 'onnx/model.onnx', sha256: sha256(BODY) };

const newRoot = (): string => {
  return mkdtempSync(join(tmpdir(), 'ot-embedding-model-'));
};

const targetOf = (root: string): string => {
  return join(root, HUGGING_FACE_ID, FILE.path);
};

const answering = (text: string, status = 200): typeof fetch => {
  return vi.fn(async () => {
    return new Response(text, {
      headers: { 'content-length': String(text.length) },
      status,
    });
  });
};

const run = (root: string, fetchImpl: typeof fetch) => {
  return fetchModelFiles({
    fetchImpl,
    files: [FILE],
    onFile: () => {},
    onProgress: () => {},
    root,
  });
};

describe('fetchModelFiles', () => {
  describe('when the file is cached with the pinned hash', () => {
    test('does not touch the network', async () => {
      const root = newRoot();
      const fetchImpl = answering(BODY);

      await mkdir(dirname(targetOf(root)), { recursive: true });
      await writeFile(targetOf(root), BODY);

      const result = await run(root, fetchImpl);

      expect(result).toEqual({ cached: 1, downloaded: 0, ok: true });
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });

  describe('when the file is missing', () => {
    test('downloads it into place', async () => {
      const root = newRoot();

      const result = await run(root, answering(BODY));

      expect(result).toEqual({ cached: 0, downloaded: 1, ok: true });
      expect(await readFile(targetOf(root), 'utf8')).toBe(BODY);
    });
  });

  describe('when the cached file is corrupted', () => {
    test('re-fetches it', async () => {
      const root = newRoot();

      await mkdir(dirname(targetOf(root)), { recursive: true });
      await writeFile(targetOf(root), 'torn');

      const result = await run(root, answering(BODY));

      expect(result).toEqual({ cached: 0, downloaded: 1, ok: true });
      expect(await readFile(targetOf(root), 'utf8')).toBe(BODY);
    });
  });

  describe('when the download does not match the pinned hash', () => {
    test('fails and leaves neither the file nor a partial behind', async () => {
      const root = newRoot();

      const result = await run(root, answering('tampered'));

      expect(result.ok).toBe(false);
      expect(existsSync(targetOf(root))).toBe(false);
      expect(readdirSync(dirname(targetOf(root)))).toEqual([]);
    });
  });

  describe('when the server answers an error', () => {
    test('fails with the status', async () => {
      const result = await run(newRoot(), answering('', 503));

      expect(result).toEqual({
        ok: false,
        reason: expect.stringContaining('503'),
      });
    });
  });

  describe('when the network is down', () => {
    test('fails instead of throwing', async () => {
      const fetchImpl: typeof fetch = async () => {
        throw new TypeError('fetch failed');
      };

      const result = await run(newRoot(), fetchImpl);

      expect(result).toEqual({ ok: false, reason: 'fetch failed' });
    });
  });
});

describe('createDownloadProgressLogger', () => {
  test('writes one line per quarter, not one per chunk', () => {
    const write = vi.fn();
    const log = createDownloadProgressLogger(write);
    const event = (receivedBytes: number): DownloadProgress => {
      return { path: 'model.onnx', receivedBytes, totalBytes: 100_000_000 };
    };

    [1, 10, 26_000_000, 27_000_000, 60_000_000, 100_000_000].forEach(
      (bytes) => {
        log(event(bytes));
      },
    );

    expect(write.mock.calls.map(([line]) => line)).toEqual([
      'model.onnx: 25% of 100 MB',
      'model.onnx: 50% of 100 MB',
      'model.onnx: 100% of 100 MB',
    ]);
  });

  test('stays quiet for files under 1 MB', () => {
    const write = vi.fn();

    createDownloadProgressLogger(write)({
      path: 'config.json',
      receivedBytes: 900,
      totalBytes: 900,
    });

    expect(write).not.toHaveBeenCalled();
  });

  test('stays quiet when the size is unknown', () => {
    const write = vi.fn();

    createDownloadProgressLogger(write)({
      path: 'model.onnx',
      receivedBytes: 10,
      totalBytes: undefined,
    });

    expect(write).not.toHaveBeenCalled();
  });
});

describe('resolveModelsDir', () => {
  test('prefers the flag, then the env, then ~/.openthrottle/models', () => {
    expect(resolveModelsDir({ EMBEDDING_MODELS_DIR: '/env' }, '/flag')).toBe(
      '/flag',
    );
    expect(resolveModelsDir({ EMBEDDING_MODELS_DIR: '/env' }, undefined)).toBe(
      '/env',
    );
    expect(resolveModelsDir({ EMBEDDING_MODELS_DIR: '  ' }, undefined)).toBe(
      join(homedir(), '.openthrottle', 'models'),
    );
  });
});

describe('resolveEmbeddingProvider', () => {
  test('lower-cases the provider and defaults a blank one to local', () => {
    expect(resolveEmbeddingProvider({ EMBEDDING_PROVIDER: 'Ollama' })).toBe(
      'ollama',
    );
    expect(resolveEmbeddingProvider({})).toBe('local');
  });
});
