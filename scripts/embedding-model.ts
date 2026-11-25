/**
 * @description The semantic-search embedding model (quantized nomic-embed-text-v1.5 ONNX + tokenizer,
 * OT plan 165e86ef) as one checksum-pinned set of files, and the fetch + verify core every caller shares:
 * the `embeddings:download-model` CLI, `./scripts/setup.sh`, worktree provisioning and the
 * `monorepo:ensure-embedding-model` boot gate (OT plan 7803080c). Idempotent: a file already present with
 * its pinned sha256 is left alone, a mismatched one is re-fetched, and nothing lands in place until its hash
 * matches. Each file is written to `<target>.<pid>.partial` and renamed, so two worktrees fetching into the
 * shared cache at once can only ever download a file twice, never leave a torn one.
 *
 * Imports nothing from the workspace at module scope: the Docker `embedding-model` stage copies only this
 * file, its CLI and the logger, with no workspace package built. {@link verifyEmbedder} imports
 * `@openthrottle/node-client` lazily for that reason.
 */

import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { toErrorMessage } from '@openthrottle/nodejs-utils';

export interface ModelFile {
  readonly path: string;
  readonly sha256: string;
}

export type ModelFileOutcome = 'cached' | 'downloaded';

export interface DownloadProgress {
  readonly path: string;
  readonly receivedBytes: number;
  readonly totalBytes: number | undefined;
}

export interface FetchModelFilesOptions {
  readonly fetchImpl: typeof fetch;
  readonly files: readonly ModelFile[];
  readonly onFile: (path: string, outcome: ModelFileOutcome) => void;
  readonly onProgress: (progress: DownloadProgress) => void;
  readonly root: string;
}

export type FetchModelFilesResult =
  | {
      readonly cached: number;
      readonly downloaded: number;
      readonly ok: true;
    }
  | {
      readonly ok: false;
      readonly reason: string;
    };

export type VerifyEmbedderResult =
  | {
      readonly dims: number;
      readonly model: string;
      readonly ok: true;
    }
  | {
      readonly ok: false;
      readonly reason: string;
    };

export const HUGGING_FACE_ID = 'nomic-ai/nomic-embed-text-v1.5';

/** Pinned Hugging Face commit: a moved `main` can never change the bytes this verifies. */
export const REVISION = 'e9b6763023c676ca8431644204f50c2b100d9aab';

export const MODEL_FILES: readonly ModelFile[] = [
  {
    path: 'config.json',
    sha256: '9ab00bd92cee80a569f708140b7b6c1661a65891ff3765b1519e181ba2f2c92b',
  },
  {
    path: 'onnx/model_quantized.onnx',
    sha256: 'b4342336debaea79de872370664b0aaeb67dea4605513d00ee236ea871a81f27',
  },
  {
    path: 'special_tokens_map.json',
    sha256: '5d5b662e421ea9fac075174bb0688ee0d9431699900b90662acd44b2a350503a',
  },
  {
    path: 'tokenizer.json',
    sha256: 'd241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66',
  },
  {
    path: 'tokenizer_config.json',
    sha256: 'd7e0000bcc80134debd2222220427e6bf5fa20a669f40a0d0d1409cc18e0a9bc',
  },
];

/**
 * @description The weights cache directory: `--dir`, else `EMBEDDING_MODELS_DIR`, else
 * `~/.openthrottle/models` — the same fallback the server's `resolveEmbeddingConfig` uses. A blank
 * value counts as unset.
 */
export const resolveModelsDir = (
  env: NodeJS.ProcessEnv,
  dirFlag: string | undefined,
): string => {
  const fromFlag = dirFlag?.trim();
  const fromEnv = env.EMBEDDING_MODELS_DIR?.trim();

  if (fromFlag) {
    return fromFlag;
  }

  if (fromEnv) {
    return fromEnv;
  }

  return join(homedir(), '.openthrottle', 'models');
};

/**
 * @description The provider the server will run, normalized as `resolveEmbeddingConfig` does: blank
 * means `local`. Only `local` reads the weights from disk; `ollama` and the hosted providers do not.
 */
export const resolveEmbeddingProvider = (env: NodeJS.ProcessEnv): string => {
  const raw = env.EMBEDDING_PROVIDER?.trim().toLowerCase();

  return raw ? raw : 'local';
};

/** @description Files smaller than this get no progress lines. */
const MIN_PROGRESS_BYTES = 1_000_000;

/**
 * @description A `onProgress` handler that writes one line per 25% of each file whose size is known and at least 1 MB,
 * instead of one per chunk: Nx streams a gate's output line by line, so `\r` redraws do not work.
 */
export const createDownloadProgressLogger = (
  write: (line: string) => void,
): ((progress: DownloadProgress) => void) => {
  const lastQuarter = new Map<string, number>();

  return (progress) => {
    // Small files (config, tokenizer) land in one chunk: a progress line would only be noise.
    if (
      progress.totalBytes === undefined ||
      progress.totalBytes < MIN_PROGRESS_BYTES
    ) {
      return;
    }

    const quarter = Math.floor(
      (progress.receivedBytes / progress.totalBytes) * 4,
    );

    if (quarter === (lastQuarter.get(progress.path) ?? 0)) {
      return;
    }

    lastQuarter.set(progress.path, quarter);

    const megabytes = (progress.totalBytes / 1_000_000).toFixed(0);

    write(`${progress.path}: ${quarter * 25}% of ${megabytes} MB`);
  };
};

const sha256OfFile = async (path: string): Promise<string> => {
  const hash = createHash('sha256');

  await pipeline(createReadStream(path), hash);

  return hash.digest('hex');
};

const countBytes = (
  path: string,
  totalBytes: number | undefined,
  onProgress: (progress: DownloadProgress) => void,
): Transform => {
  let receivedBytes = 0;

  return new Transform({
    transform(chunk: Buffer, _encoding, callback): void {
      receivedBytes += chunk.length;
      onProgress({ path, receivedBytes, totalBytes });
      callback(null, chunk);
    },
  });
};

const readContentLength = (response: Response): number | undefined => {
  const total = Number(response.headers.get('content-length'));

  return Number.isFinite(total) && total > 0 ? total : undefined;
};

const fetchModelFile = async (
  options: FetchModelFilesOptions,
  file: ModelFile,
): Promise<ModelFileOutcome> => {
  const target = join(options.root, HUGGING_FACE_ID, file.path);

  if (existsSync(target) && (await sha256OfFile(target)) === file.sha256) {
    return 'cached';
  }

  const url = `https://huggingface.co/${HUGGING_FACE_ID}/resolve/${REVISION}/${file.path}`;
  const response = await options.fetchImpl(url);

  if (!response.ok || !response.body) {
    throw new Error(`GET ${url} answered ${response.status}`);
  }

  const partial = `${target}.${process.pid}.partial`;

  await mkdir(dirname(target), { recursive: true });

  try {
    await pipeline(
      Readable.fromWeb(response.body),
      countBytes(file.path, readContentLength(response), options.onProgress),
      createWriteStream(partial),
    );

    const actual = await sha256OfFile(partial);

    if (actual !== file.sha256) {
      throw new Error(
        `${file.path}: sha256 ${actual} does not match the pinned ${file.sha256}`,
      );
    }

    await rename(partial, target);
  } finally {
    await rm(partial, { force: true });
  }

  return 'downloaded';
};

/**
 * @description Make every pinned file present and checksum-verified under `root`, fetching only what is
 * missing or mismatched. Never throws: a network or checksum failure comes back as `{ ok: false }`.
 */
export const fetchModelFiles = async (
  options: FetchModelFilesOptions,
): Promise<FetchModelFilesResult> => {
  try {
    const outcomes = await Promise.all(
      options.files.map(async (file) => {
        const outcome = await fetchModelFile(options, file);

        options.onFile(file.path, outcome);

        return outcome;
      }),
    );
    const downloaded = outcomes.filter((outcome) => {
      return outcome === 'downloaded';
    }).length;

    return {
      cached: outcomes.length - downloaded,
      downloaded,
      ok: true,
    };
  } catch (error) {
    return { ok: false, reason: toErrorMessage(error) };
  }
};

/**
 * @description Load the model from `root` and embed one string, the way the server will. Never throws.
 */
export const verifyEmbedder = async (
  root: string,
): Promise<VerifyEmbedderResult> => {
  try {
    const { createEmbedder, resolveEmbeddingConfig } =
      await import('@openthrottle/node-client');
    const resolved = resolveEmbeddingConfig({
      ...process.env,
      EMBEDDING_MODELS_DIR: root,
      EMBEDDING_PROVIDER: 'local',
    });

    if (!resolved.ok) {
      return { ok: false, reason: resolved.detail };
    }

    const embedder = createEmbedder(resolved.config);

    try {
      const result = await embedder.embed(
        ['OpenThrottle embedder setup check'],
        'document',
      );

      if (!result.ok) {
        return { ok: false, reason: `${result.reason}: ${result.detail}` };
      }

      return { dims: result.dims, model: result.model, ok: true };
    } finally {
      await embedder.close();
    }
  } catch (error) {
    return { ok: false, reason: toErrorMessage(error) };
  }
};
