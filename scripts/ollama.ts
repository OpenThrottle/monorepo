/**
 * @description Pull the Ollama models we need for local workflows. Requires
 * the Ollama app (https://ollama.com/download) — we run Ollama via the app to
 * take full advantage of the GPU.
 *
 * For local embeddings (node-client, openthrottle:import): set
 * OLLAMA_BASE_URL (default http://localhost:11434) and/or
 * OLLAMA_EMBEDDING_MODEL (e.g. nomic-embed-text). When set, Ollama is used;
 * when not set, OpenAI is used. When using Caddy (tools/caddy), set
 * OLLAMA_BASE_URL to the proxied URL and OLLAMA_ORIGINS so CORS allows
 * requests — see docs/monorepo/Ollama.md; for Caddy HTTPS without cert
 * errors, run `caddy trust` (see tools/caddy/README.md).
 */
import { fileURLToPath } from 'node:url';

import { createLogger, run } from './lib/index.ts';

const logger = createLogger();

/**
 * The model catalog, by role. Embedding models are used when
 * OLLAMA_EMBEDDING_MODEL / OLLAMA_BASE_URL are set for node-client and
 * openthrottle:import. For the OpenThrottle schema (vector 1536) use a model
 * that outputs 1536 dimensions; these output other sizes (all-minilm 384,
 * mxbai-embed-large 1024, nomic-embed-text 768) — for 1536-dim OpenThrottle
 * embeddings use OpenAI, or an Ollama model that outputs 1536 when available.
 * See databases/README.md § Embedding dimension strategy.
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
