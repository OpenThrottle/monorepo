/**
 * @description OpenAI embedding backend (OT plan 7a18c91d). Calls `POST /embeddings` with
 * `dimensions` set to the configured 768, so text-embedding-3-small/large return vectors that fit
 * the same `vector(768)` columns as the local model. Rate limits and 5xx back off and retry;
 * every other failure is returned, never thrown.
 * @see https://platform.openai.com/docs/api-reference/embeddings/create
 */

import { sleep } from '@openthrottle/nodejs-utils';

import type { EmbeddingBackendResult } from './embedding.ts';
import type { HostedEmbeddingConfig } from './embedding-config.ts';
import {
  isNumberArray,
  l2Normalize,
  postJsonWithRetry,
} from './hosted-embedding-request.ts';

export interface EmbedWithOpenAIOptions {
  readonly sleep: (ms: number) => Promise<void>;
}

interface OpenAIEmbeddingRow {
  readonly embedding: number[];
  readonly index: number;
}

function isEmbeddingRow(value: unknown): value is OpenAIEmbeddingRow {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const index: unknown = Reflect.get(value, 'index');

  return (
    typeof index === 'number' && isNumberArray(Reflect.get(value, 'embedding'))
  );
}

/** @description The vectors from an OpenAI body, in input order, or undefined when malformed. */
function readEmbeddings(data: unknown, count: number): number[][] | undefined {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  const rows: unknown = Reflect.get(data, 'data');

  if (!Array.isArray(rows) || rows.length !== count) {
    return undefined;
  }

  const vectors: number[][] = [];

  for (const row of rows) {
    if (!isEmbeddingRow(row) || row.index < 0 || row.index >= count) {
      return undefined;
    }

    vectors[row.index] = row.embedding;
  }

  // A repeated index leaves a hole; holes are not vectors.
  const isComplete = vectors.filter(Array.isArray).length === count;

  return isComplete ? vectors : undefined;
}

/**
 * @description Embeds texts with OpenAI at `config.dims`. Text is sent as-is: OpenAI models take
 * no task prefix. Vectors are L2-normalised (OpenAI already normalises; this keeps the guarantee
 * local to us).
 */
export async function embedWithOpenAI(
  texts: readonly string[],
  config: HostedEmbeddingConfig,
  options: EmbedWithOpenAIOptions = { sleep },
): Promise<EmbeddingBackendResult> {
  const label = `OpenAI ${config.model}`;
  const response = await postJsonWithRetry({
    body: {
      dimensions: config.dims,
      encoding_format: 'float',
      input: texts,
      model: config.model,
    },
    headers: { Authorization: `Bearer ${config.apiKey}` },
    label,
    sleep: options.sleep,
    url: `${config.apiBaseUrl}/embeddings`,
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
