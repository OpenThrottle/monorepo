/**
 * @description Downloads the semantic-search embedding model into the shared weights cache, so
 * openthrottle-server can embed without ever downloading at runtime. A thin CLI over
 * {@link fetchModelFiles} in `./embedding-model.ts`; it fails (exit 1) on any error, which is what
 * `./scripts/setup.sh`, worktree provisioning and the Docker build want. Every worktree shares one cache,
 * so only the first run on a machine fetches the ~137 MB of weights. Server boots run the forgiving
 * `monorepo:ensure-embedding-model` gate instead, which warns and lets the server boot when offline.
 *
 * Usage: `pnpm run embeddings:download-model [-- --dir <path>] [-- --verify]`
 *   --dir     Target directory (default: EMBEDDING_MODELS_DIR, else ~/.openthrottle/models). The Docker build uses it.
 *   --verify  After downloading, load the model and embed one string; fail unless it answers.
 */

import {
  createDownloadProgressLogger,
  fetchModelFiles,
  HUGGING_FACE_ID,
  MODEL_FILES,
  resolveModelsDir,
  REVISION,
  verifyEmbedder,
} from './embedding-model.ts';
import { createLogger } from './utils/logger.ts';

const logger = createLogger();

const readFlag = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);

  return index === -1 ? undefined : process.argv[index + 1];
};

const main = async (): Promise<void> => {
  const root = resolveModelsDir(process.env, readFlag('--dir'));

  logger.heading(
    `Embedding model ${HUGGING_FACE_ID}@${REVISION.slice(0, 8)} → ${root}`,
  );

  const fetched = await fetchModelFiles({
    fetchImpl: fetch,
    files: MODEL_FILES,
    onFile: (path, outcome) => {
      logger.step(`${path}: ${outcome}`);
    },
    onProgress: createDownloadProgressLogger(logger.step),
    root,
  });

  if (!fetched.ok) {
    logger.fail(`Embedding model download failed: ${fetched.reason}`);
    process.exit(1);
  }

  logger.success(
    `${MODEL_FILES.length} file(s) verified (${fetched.downloaded} downloaded, ${fetched.cached} cached).`,
  );

  if (!process.argv.includes('--verify')) {
    return;
  }

  const verified = await verifyEmbedder(root);

  if (!verified.ok) {
    logger.fail(`Embedder check failed: ${verified.reason}`);
    process.exit(1);
  }

  logger.success(`Embedder answers: ${verified.model}, ${verified.dims} dims`);
};

await main();
