/**
 * @description Whether source code may be embedded under the configured provider (OT plan
 * 1c8b9a90). Plan and task text embeds through whichever provider is configured, but code is a much
 * larger privacy and cost surface: under a hosted provider (`openai`, `gemini`) every chunk of every
 * indexed repository would leave the machine. So code indexing refuses a hosted provider unless
 * `CODE_EMBEDDINGS_ALLOW_HOSTED=true` says the owner accepts that. Self-hosted providers (`local`,
 * `ollama`) are always allowed.
 */

import type { EmbeddingProvider } from './embedding-config.ts';
import { HOSTED_EMBEDDING_PROVIDERS } from './embedding-config.ts';

/** @description The env var that opts source code into a hosted embedding provider. */
export const CODE_EMBEDDINGS_ALLOW_HOSTED_ENV = 'CODE_EMBEDDINGS_ALLOW_HOSTED';

export type CodeEmbeddingPolicy =
  | { readonly allowed: false; readonly detail: string }
  | { readonly allowed: true };

/**
 * @description Decides whether code may embed through `provider`. Only the exact value `true`
 * (case-insensitive, trimmed) opts in, so a typo keeps code local rather than sending it.
 */
export function resolveCodeEmbeddingPolicy(
  provider: EmbeddingProvider,
  env: NodeJS.ProcessEnv = process.env,
): CodeEmbeddingPolicy {
  const isHosted = HOSTED_EMBEDDING_PROVIDERS.some((hosted) => {
    return hosted === provider;
  });

  if (!isHosted) {
    return { allowed: true };
  }

  const optIn = env[CODE_EMBEDDINGS_ALLOW_HOSTED_ENV]?.trim().toLowerCase();

  if (optIn === 'true') {
    return { allowed: true };
  }

  return {
    allowed: false,
    detail: `Code indexing is off under EMBEDDING_PROVIDER=${provider}: it would send every source chunk to that hosted API. Set ${CODE_EMBEDDINGS_ALLOW_HOSTED_ENV}=true to allow it, or use EMBEDDING_PROVIDER=local or ollama.`,
  };
}
