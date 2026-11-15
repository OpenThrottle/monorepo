/**
 * @description Pull the Ollama models we need for local workflows. Requires
 * the Ollama app (https://ollama.com/download) — we run Ollama via the app to
 * take full advantage of the GPU.
 *
 * Semantic search does not need Ollama: openthrottle-server embeds in-process
 * by default. To run its model through Ollama instead, set
 * EMBEDDING_PROVIDER=ollama and OLLAMA_BASE_URL (nomic-embed-text, pulled
 * below). When using Caddy (tools/caddy), set
 * OLLAMA_BASE_URL to the proxied URL and OLLAMA_ORIGINS so CORS allows
 * requests — see docs/monorepo/Ollama.md; for Caddy HTTPS without cert
 * errors, run `caddy trust` (see tools/caddy/README.md).
 */
import { fileURLToPath } from 'node:url';

import { run } from './utils/exec.ts';
import { createLogger } from './utils/logger.ts';

const logger = createLogger();

/**
 * The model catalog, by role. Semantic search uses nomic-embed-text (768
 * dims) only, and only with EMBEDDING_PROVIDER=ollama; the other embedding
 * models serve the code index (OLLAMA_EMBEDDING_MODEL). See
 * databases/openthrottle/README.md § Embedding dimension strategy.
 */
export const OLLAMA_MODELS = {
  chat: ['llama4'],
  coding: ['qwen3-coder-next'],
  embedding: ['all-minilm', 'mxbai-embed-large', 'nomic-embed-text'],
} as const;

const main = (): void => {
  const installed = run('which', ['ollama'], { allowFailure: true });

  if (installed.exitCode !== 0) {
    logger.fail('🦙 Ollama is not installed.');
    logger.detail('1. Please install it from https://ollama.com/download');
    logger.detail('2. Start the application and re-run this script');
    logger.detail("Note: we run Ollama using the app to take full advantage of our computer's GPU."); // prettier-ignore
    process.exit(1);
  }

  logger.heading('ollama 🦙 — pulling the models we need for local workflows');

  for (const models of Object.values(OLLAMA_MODELS)) {
    for (const model of models) {
      logger.step(`ollama pull ${model}`);
      run('ollama', ['pull', model], { stdio: 'inherit' });
    }
  }

  logger.success('ollama models ready');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
