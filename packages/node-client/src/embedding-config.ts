/**
 * @description Embedding configuration for OpenThrottle semantic search, resolved from env.
 * One model at one dimension (OT plan 165e86ef): nomic-embed-text-v1.5 at 768 dims, run either
 * in-process (`local`, the default) or through Ollama (`ollama`, the same model). Every other
 * value is refused with a reason rather than silently skipped.
 */

import os from 'node:os';
import path from 'node:path';

/** @description Providers the server can embed with today. */
export const EMBEDDING_PROVIDERS = ['local', 'ollama'] as const;

export type EmbeddingProvider = (typeof EMBEDDING_PROVIDERS)[number];

/**
 * @description Provider names reserved for a follow-up plan (hosted providers at 768 dims).
 * They are recognised so the refusal says "not implemented" instead of "unknown".
 */
export const RESERVED_EMBEDDING_PROVIDERS = ['gemini', 'openai'] as const;

export const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text-v1.5';

export const DEFAULT_EMBEDDING_DIMS = 768;

export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';

/**
 * @description What the embedder needs to know about a model: where its weights live for the
 * local provider, what Ollama calls it, its native dimension, and the task prefixes it was
 * trained with. Prefixes are model-specific, so an unknown model is refused rather than guessed.
 */
export interface EmbeddingModelSpec {
  readonly dims: number;
  readonly documentPrefix: string;
  readonly huggingFaceId: string;
  readonly localWeightsFile: string;
  readonly ollamaName: string;
  readonly queryPrefix: string;
}

export const EMBEDDING_MODEL_SPECS: Readonly<
  Record<string, EmbeddingModelSpec>
> = {
  'nomic-embed-text-v1.5': {
    dims: 768,
    documentPrefix: 'search_document: ',
    huggingFaceId: 'nomic-ai/nomic-embed-text-v1.5',
    localWeightsFile: 'onnx/model_quantized.onnx',
    ollamaName: 'nomic-embed-text',
    queryPrefix: 'search_query: ',
  },
};

export interface EmbeddingConfig {
  readonly dims: number;
  /** Name recorded as `embedding_model` on every row this config writes. */
  readonly model: string;
  readonly modelsDir: string;
  readonly ollamaBaseUrl: string;
  readonly provider: EmbeddingProvider;
  readonly spec: EmbeddingModelSpec;
}

export type EmbeddingConfigResult =
  | { readonly config: EmbeddingConfig; readonly ok: true }
  | {
      readonly detail: string;
      readonly ok: false;
      readonly provider: string;
      readonly reason: 'unconfigured';
    };

/** @description Default shared weights cache: `~/.openthrottle/models`. */
export function defaultEmbeddingModelsDir(): string {
  return path.join(os.homedir(), '.openthrottle', 'models');
}

function isEmbeddingProvider(value: string): value is EmbeddingProvider {
  return EMBEDDING_PROVIDERS.some((provider) => {
    return provider === value;
  });
}

function isReservedProvider(value: string): boolean {
  return RESERVED_EMBEDDING_PROVIDERS.some((provider) => {
    return provider === value;
  });
}

function readEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: string,
): string {
  const raw = env[name]?.trim();

  return raw ? raw : fallback;
}

/**
 * @description Resolves the embedding config from env (`EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`,
 * `EMBEDDING_DIMS`, `EMBEDDING_MODELS_DIR`, `OLLAMA_BASE_URL`). Returns `ok: false` with a
 * human-readable `detail` for a reserved or unknown provider, an unknown model, or a dimension
 * the model does not produce.
 */
export function resolveEmbeddingConfig(
  env: NodeJS.ProcessEnv = process.env,
): EmbeddingConfigResult {
  const provider = readEnv(env, 'EMBEDDING_PROVIDER', 'local').toLowerCase();

  if (!isEmbeddingProvider(provider)) {
    const detail = isReservedProvider(provider)
      ? `EMBEDDING_PROVIDER=${provider} is not implemented yet; use local or ollama.`
      : `EMBEDDING_PROVIDER=${provider} is unknown; use local or ollama.`;

    return { detail, ok: false, provider, reason: 'unconfigured' };
  }

  const model = readEnv(env, 'EMBEDDING_MODEL', DEFAULT_EMBEDDING_MODEL);
  const spec = EMBEDDING_MODEL_SPECS[model];

  if (!spec) {
    return {
      detail: `EMBEDDING_MODEL=${model} is not supported; supported: ${Object.keys(EMBEDDING_MODEL_SPECS).join(', ')}.`,
      ok: false,
      provider,
      reason: 'unconfigured',
    };
  }

  const dimsRaw = readEnv(
    env,
    'EMBEDDING_DIMS',
    String(DEFAULT_EMBEDDING_DIMS),
  );
  const dims = Number(dimsRaw);

  if (!Number.isInteger(dims) || dims !== spec.dims) {
    return {
      detail: `EMBEDDING_DIMS=${dimsRaw} does not match ${model}, which produces ${spec.dims} dimensions.`,
      ok: false,
      provider,
      reason: 'unconfigured',
    };
  }

  return {
    config: {
      dims,
      model,
      modelsDir: readEnv(
        env,
        'EMBEDDING_MODELS_DIR',
        defaultEmbeddingModelsDir(),
      ),
      ollamaBaseUrl: readEnv(
        env,
        'OLLAMA_BASE_URL',
        DEFAULT_OLLAMA_BASE_URL,
      ).replace(/\/$/, ''),
      provider,
      spec,
    },
    ok: true,
  };
}
