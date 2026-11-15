/**
 * @description Embedding configuration for OpenThrottle semantic search, resolved from env.
 * One dimension for every provider (768, OT plan 165e86ef): nomic-embed-text-v1.5 run in-process
 * (`local`, the default) or through Ollama (`ollama`, the same model), or a hosted API asked for
 * 768-dim output from its own model (`openai`, `gemini`; OT plan 7a18c91d). Each model writes its own
 * `embedding_model`, so switching provider re-embeds everything rather than mixing vector spaces.
 * Every other value is refused with a reason rather than silently skipped.
 */

import os from 'node:os';
import path from 'node:path';

/** @description Providers that run nomic-embed-text-v1.5 on hardware you control. */
export const SELF_HOSTED_EMBEDDING_PROVIDERS = ['local', 'ollama'] as const;

/** @description Hosted APIs, each asked for 768-dim output from its own model. */
export const HOSTED_EMBEDDING_PROVIDERS = ['gemini', 'openai'] as const;

/** @description Providers the server can embed with today. */
export const EMBEDDING_PROVIDERS = [
  ...HOSTED_EMBEDDING_PROVIDERS,
  ...SELF_HOSTED_EMBEDDING_PROVIDERS,
] as const;

export type SelfHostedEmbeddingProvider =
  (typeof SELF_HOSTED_EMBEDDING_PROVIDERS)[number];

export type HostedEmbeddingProvider =
  (typeof HOSTED_EMBEDDING_PROVIDERS)[number];

export type EmbeddingProvider = (typeof EMBEDDING_PROVIDERS)[number];

export const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text-v1.5';

/** @description The model each provider uses when `EMBEDDING_MODEL` is unset. */
export const DEFAULT_EMBEDDING_MODELS: Readonly<
  Record<EmbeddingProvider, string>
> = {
  gemini: 'gemini-embedding-001',
  local: DEFAULT_EMBEDDING_MODEL,
  ollama: DEFAULT_EMBEDDING_MODEL,
  openai: 'text-embedding-3-small',
};

export const DEFAULT_EMBEDDING_DIMS = 768;

export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';

/** @description Where each hosted provider's API lives when its `*_BASE_URL` is unset. */
export const DEFAULT_HOSTED_BASE_URLS: Readonly<
  Record<HostedEmbeddingProvider, string>
> = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  openai: 'https://api.openai.com/v1',
};

/** @description The env var each hosted provider reads its API key from. */
export const HOSTED_API_KEY_ENV: Readonly<
  Record<HostedEmbeddingProvider, string>
> = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
};

/** @description The env var that overrides each hosted provider's API base URL. */
export const HOSTED_BASE_URL_ENV: Readonly<
  Record<HostedEmbeddingProvider, string>
> = {
  gemini: 'GEMINI_BASE_URL',
  openai: 'OPENAI_BASE_URL',
};

interface EmbeddingModelSpecBase {
  /** The dimension stored; for a hosted model, the output size it is asked for. */
  readonly dims: number;
  readonly documentPrefix: string;
  readonly queryPrefix: string;
}

/**
 * @description An open-weights model: where its weights live for the local provider, what
 * Ollama calls it, and the task prefixes it was trained with. Prefixes are model-specific, so an
 * unknown model is refused rather than guessed.
 */
export interface OpenWeightsEmbeddingModelSpec extends EmbeddingModelSpecBase {
  readonly huggingFaceId: string;
  readonly kind: 'open-weights';
  readonly localWeightsFile: string;
  readonly ollamaName: string;
}

/**
 * @description A model behind a hosted API. It takes no text prefix: the API is told the
 * output dimension (and, where supported, the task) as request parameters instead.
 */
export interface HostedEmbeddingModelSpec extends EmbeddingModelSpecBase {
  readonly kind: 'hosted';
  readonly provider: HostedEmbeddingProvider;
}

export type EmbeddingModelSpec =
  HostedEmbeddingModelSpec | OpenWeightsEmbeddingModelSpec;

export const EMBEDDING_MODEL_SPECS: Readonly<
  Record<string, EmbeddingModelSpec>
> = {
  'gemini-embedding-001': {
    dims: 768,
    documentPrefix: '',
    kind: 'hosted',
    provider: 'gemini',
    queryPrefix: '',
  },
  'nomic-embed-text-v1.5': {
    dims: 768,
    documentPrefix: 'search_document: ',
    huggingFaceId: 'nomic-ai/nomic-embed-text-v1.5',
    kind: 'open-weights',
    localWeightsFile: 'onnx/model_quantized.onnx',
    ollamaName: 'nomic-embed-text',
    queryPrefix: 'search_query: ',
  },
  'text-embedding-3-large': {
    dims: 768,
    documentPrefix: '',
    kind: 'hosted',
    provider: 'openai',
    queryPrefix: '',
  },
  'text-embedding-3-small': {
    dims: 768,
    documentPrefix: '',
    kind: 'hosted',
    provider: 'openai',
    queryPrefix: '',
  },
};

interface EmbeddingConfigBase {
  readonly dims: number;
  /** Name recorded as `embedding_model` on every row this config writes. */
  readonly model: string;
  readonly modelsDir: string;
  readonly ollamaBaseUrl: string;
}

/** @description nomic-embed-text-v1.5, in-process or through Ollama. */
export interface SelfHostedEmbeddingConfig extends EmbeddingConfigBase {
  readonly provider: SelfHostedEmbeddingProvider;
  readonly spec: OpenWeightsEmbeddingModelSpec;
}

/** @description A hosted API, with the key and base URL it is called with. */
export interface HostedEmbeddingConfig extends EmbeddingConfigBase {
  readonly apiBaseUrl: string;
  /** Never logged or exposed through `health`. */
  readonly apiKey: string;
  readonly provider: HostedEmbeddingProvider;
  readonly spec: HostedEmbeddingModelSpec;
}

export type EmbeddingConfig = HostedEmbeddingConfig | SelfHostedEmbeddingConfig;

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

function isHostedProvider(
  value: EmbeddingProvider,
): value is HostedEmbeddingProvider {
  return HOSTED_EMBEDDING_PROVIDERS.some((provider) => {
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

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function refuse(provider: string, detail: string): EmbeddingConfigResult {
  return { detail, ok: false, provider, reason: 'unconfigured' };
}

function supportedModels(provider: EmbeddingProvider): string {
  const hosted = isHostedProvider(provider);

  return Object.entries(EMBEDDING_MODEL_SPECS)
    .filter(([, spec]) => {
      return hosted
        ? spec.kind === 'hosted' && spec.provider === provider
        : spec.kind === 'open-weights';
    })
    .map(([name]) => {
      return name;
    })
    .join(', ');
}

/**
 * @description Resolves the embedding config from env (`EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`,
 * `EMBEDDING_DIMS`, `EMBEDDING_MODELS_DIR`, `OLLAMA_BASE_URL`, and for a hosted provider its API
 * key and optional base URL — `OPENAI_API_KEY` / `OPENAI_BASE_URL`, `GEMINI_API_KEY` /
 * `GEMINI_BASE_URL`). Returns `ok: false` with a human-readable `detail` for an unknown
 * provider, a model the provider does not serve, a dimension the model does not produce, or a
 * hosted provider with no API key.
 */
export function resolveEmbeddingConfig(
  env: NodeJS.ProcessEnv = process.env,
): EmbeddingConfigResult {
  const provider = readEnv(env, 'EMBEDDING_PROVIDER', 'local').toLowerCase();
  const providerList = EMBEDDING_PROVIDERS.join(', ');

  if (!isEmbeddingProvider(provider)) {
    return refuse(
      provider,
      `EMBEDDING_PROVIDER=${provider} is unknown; use one of ${providerList}.`,
    );
  }

  const model = readEnv(
    env,
    'EMBEDDING_MODEL',
    DEFAULT_EMBEDDING_MODELS[provider],
  );
  const spec = EMBEDDING_MODEL_SPECS[model];
  const unsupported = `EMBEDDING_MODEL=${model} is not supported by ${provider}; supported: ${supportedModels(provider)}.`;

  if (!spec) {
    return refuse(provider, unsupported);
  }

  const dimsRaw = readEnv(
    env,
    'EMBEDDING_DIMS',
    String(DEFAULT_EMBEDDING_DIMS),
  );
  const dims = Number(dimsRaw);

  if (!Number.isInteger(dims) || dims !== spec.dims) {
    return refuse(
      provider,
      `EMBEDDING_DIMS=${dimsRaw} does not match ${model}, which produces ${spec.dims} dimensions.`,
    );
  }

  const base = {
    dims,
    model,
    modelsDir: readEnv(
      env,
      'EMBEDDING_MODELS_DIR',
      defaultEmbeddingModelsDir(),
    ),
    ollamaBaseUrl: trimTrailingSlash(
      readEnv(env, 'OLLAMA_BASE_URL', DEFAULT_OLLAMA_BASE_URL),
    ),
  };

  if (!isHostedProvider(provider)) {
    if (spec.kind !== 'open-weights') {
      return refuse(provider, unsupported);
    }

    return { config: { ...base, provider, spec }, ok: true };
  }

  if (spec.kind !== 'hosted' || spec.provider !== provider) {
    return refuse(provider, unsupported);
  }

  const keyEnv = HOSTED_API_KEY_ENV[provider];
  const apiKey = readEnv(env, keyEnv, '');

  if (!apiKey) {
    return refuse(
      provider,
      `EMBEDDING_PROVIDER=${provider} needs ${keyEnv}; set it or use local.`,
    );
  }

  return {
    config: {
      ...base,
      apiBaseUrl: trimTrailingSlash(
        readEnv(
          env,
          HOSTED_BASE_URL_ENV[provider],
          DEFAULT_HOSTED_BASE_URLS[provider],
        ),
      ),
      apiKey,
      provider,
      spec,
    },
    ok: true,
  };
}
