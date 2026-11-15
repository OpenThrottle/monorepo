/**
 * @description Downloads the semantic-search embedding model (quantized nomic-embed-text-v1.5 ONNX + tokenizer,
 * OT plan 165e86ef) into the shared weights cache, so openthrottle-server can embed without ever downloading at
 * runtime. Idempotent and checksum-verified: a file already present with the pinned sha256 is skipped, a mismatched
 * one is re-fetched, and nothing lands in place until its hash matches. Every worktree shares one cache, so only the
 * first run on a machine fetches the ~137 MB of weights.
 *
 * Usage: `pnpm run embeddings:download-model [-- --dir <path>] [-- --verify]`
 *   --dir     Target directory (default: EMBEDDING_MODELS_DIR, else ~/.openthrottle/models). The Docker build uses it.
 *   --verify  After downloading, load the model and embed one string; fail unless it returns a 768-dim vector.
 */

import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { createLogger } from './utils/logger.ts';

interface ModelFile {
  readonly path: string;
  readonly sha256: string;
}

const logger = createLogger();

const HUGGING_FACE_ID = 'nomic-ai/nomic-embed-text-v1.5';

/** Pinned Hugging Face commit: a moved `main` can never change the bytes this verifies. */
const REVISION = 'e9b6763023c676ca8431644204f50c2b100d9aab';

const FILES: readonly ModelFile[] = [
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

const readFlag = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);

  return index === -1 ? undefined : process.argv[index + 1];
};

const sha256OfFile = async (path: string): Promise<string> => {
  const hash = createHash('sha256');

  await pipeline(createReadStream(path), hash);

  return hash.digest('hex');
};

const fetchFile = async (
  root: string,
  file: ModelFile,
): Promise<'cached' | 'downloaded'> => {
  const target = join(root, HUGGING_FACE_ID, file.path);

  if (existsSync(target) && (await sha256OfFile(target)) === file.sha256) {
    return 'cached';
  }

  const url = `https://huggingface.co/${HUGGING_FACE_ID}/resolve/${REVISION}/${file.path}`;
  const response = await fetch(url);

  if (!response.ok || !response.body) {
    throw new Error(`GET ${url} answered ${response.status}`);
  }

  const partial = `${target}.partial`;

  await mkdir(dirname(target), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));

  const actual = await sha256OfFile(partial);

  if (actual !== file.sha256) {
    await rm(partial, { force: true });
    throw new Error(
      `${file.path}: sha256 ${actual} does not match the pinned ${file.sha256}`,
    );
  }

  await rename(partial, target);

  return 'downloaded';
};

const verify = async (root: string): Promise<void> => {
  // Imported here, not at the top: downloading needs no workspace package, so the Docker
  // embedding-model stage (which has none built) can run this script without --verify.
  const { createEmbedder, resolveEmbeddingConfig } =
    await import('@openthrottle/node-client');
  const resolved = resolveEmbeddingConfig({
    ...process.env,
    EMBEDDING_MODELS_DIR: root,
    EMBEDDING_PROVIDER: 'local',
  });

  if (!resolved.ok) {
    throw new Error(resolved.detail);
  }

  const embedder = createEmbedder(resolved.config);

  try {
    const result = await embedder.embed(
      ['OpenThrottle embedder setup check'],
      'document',
    );

    if (!result.ok) {
      throw new Error(`${result.reason}: ${result.detail}`);
    }

    logger.success(`Embedder answers: ${result.model}, ${result.dims} dims`);
  } finally {
    await embedder.close();
  }
};

const main = async (): Promise<void> => {
  const root =
    readFlag('--dir') ??
    process.env.EMBEDDING_MODELS_DIR?.trim() ??
    join(homedir(), '.openthrottle', 'models');

  logger.heading(
    `Embedding model ${HUGGING_FACE_ID}@${REVISION.slice(0, 8)} → ${root}`,
  );

  const outcomes = await Promise.all(
    FILES.map(async (file) => {
      const outcome = await fetchFile(root, file);

      logger.step(`${file.path}: ${outcome}`);

      return outcome;
    }),
  );
  const downloaded = outcomes.filter((outcome) => {
    return outcome === 'downloaded';
  }).length;

  logger.success(
    `${FILES.length} file(s) verified (${downloaded} downloaded, ${FILES.length - downloaded} cached).`,
  );

  if (process.argv.includes('--verify')) {
    await verify(root);
  }
};

await main();
