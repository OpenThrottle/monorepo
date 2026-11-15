/**
 * @description Gemini embedding backend (OT plan 7a18c91d). Calls
 * `POST models/{model}:batchEmbedContents` with `outputDimensionality` set to the configured 768
 * and a retrieval task type per side — `RETRIEVAL_DOCUMENT` for stored content, `RETRIEVAL_QUERY`
 * for a search — in place of the text prefixes nomic uses. gemini-embedding-001 normalises only
 * its full 3072-dim output, so every vector is L2-normalised here. Rate limits and 5xx back off
 * and retry; every other failure is returned, never thrown.
 * @see https://ai.google.dev/gemini-api/docs/embeddings
 */

import type {
  EmbeddingBackendResult,
  EmbeddingInputType,
} from './embedding.ts';
import type { HostedEmbeddingConfig } from './embedding-config.ts';
import {
  isNumberArray,
  l2Normalize,
  postJsonWithRetry,
  sleepMs,
} from './hosted-embedding-request.ts';

export interface EmbedWithGeminiOptions {
  readonly sleep: (ms: number) => Promise<void>;
}

/** @description The Gemini task type for each side of a search. */
export const GEMINI_TASK_TYPES: Readonly<Record<EmbeddingInputType, string>> = {
  document: 'RETRIEVAL_DOCUMENT',
  query: 'RETRIEVAL_QUERY',
};

function readValues(embedding: unknown): number[] | undefined {
  if (typeof embedding !== 'object' || embedding === null) {
    return undefined;
  }

  const values: unknown = Reflect.get(embedding, 'values');

  return isNumberArray(values) ? values : undefined;
}

/** @description The vectors from a Gemini body, in input order, or undefined when malformed. */
function readEmbeddings(data: unknown, count: number): number[][] | undefined {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  const embeddings: unknown = Reflect.get(data, 'embeddings');

  if (!Array.isArray(embeddings) || embeddings.length !== count) {
    return undefined;
  }

  const vectors = embeddings.map(readValues);
  const isComplete = vectors.every((vector) => {
    return vector !== undefined;
  });

  return isComplete ? vectors.filter(isNumberArray) : undefined;
}

/**
 * @description Embeds texts with Gemini at `config.dims`, tagging each request with the task type
 * for `inputType`. The API key goes in the `x-goog-api-key` header, never the URL.
 */
export async function embedWithGemini(
  texts: readonly string[],
  inputType: EmbeddingInputType,
  config: HostedEmbeddingConfig,
  options: EmbedWithGeminiOptions = { sleep: sleepMs },
): Promise<EmbeddingBackendResult> {
  const label = `Gemini ${config.model}`;
  const modelName = `models/${config.model}`;
  const response = await postJsonWithRetry({
    body: {
      requests: texts.map((text) => {
        return {
          content: { parts: [{ text }] },
          model: modelName,
          outputDimensionality: config.dims,
          taskType: GEMINI_TASK_TYPES[inputType],
        };
      }),
    },
    headers: { 'x-goog-api-key': config.apiKey },
    label,
    sleep: options.sleep,
    url: `${config.apiBaseUrl}/${modelName}:batchEmbedContents`,
  });

  if (!response.ok) {
    return { detail: response.detail, ok: false, reason: 'provider_error' };
  }

  const vectors = readEmbeddings(response.data, texts.length);

  if (!vectors) {
    return {
      detail: `${label} returned no usable embeddings for ${texts.length} input(s).`,
      ok: false,
      reason: 'provider_error',
    };
  }

  return { ok: true, vectors: vectors.map(l2Normalize) };
}
