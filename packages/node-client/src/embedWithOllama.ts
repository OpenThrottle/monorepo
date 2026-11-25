/**
 * @description Ollama embedding backend. Calls the batch endpoint `POST /api/embed` with the
 * same model the local provider runs (`nomic-embed-text` is nomic-embed-text v1.5), so vectors
 * from either provider are comparable. Failures are returned, never swallowed.
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md#generate-embeddings
 */

import { toErrorMessage } from '@openthrottle/nodejs-utils';

import type { EmbeddingBackendResult } from './embedding.ts';

export interface OllamaEmbeddingTarget {
  readonly baseUrl: string;
  readonly model: string;
}

function isNumberMatrix(value: unknown): value is number[][] {
  return (
    Array.isArray(value) &&
    value.every((row) => {
      return (
        Array.isArray(row) &&
        row.every((cell) => {
          return typeof cell === 'number';
        })
      );
    })
  );
}

function readEmbeddings(data: unknown): number[][] | undefined {
  if (typeof data !== 'object' || data === null || !('embeddings' in data)) {
    return undefined;
  }

  return isNumberMatrix(data.embeddings) ? data.embeddings : undefined;
}

/**
 * @description Embeds already-prefixed texts through Ollama. A connection error or non-2xx is a
 * `provider_error` (Ollama is down or the model is not pulled); a malformed body is too.
 */
export async function embedWithOllama(
  texts: readonly string[],
  target: OllamaEmbeddingTarget,
): Promise<EmbeddingBackendResult> {
  const url = `${target.baseUrl}/api/embed`;

  try {
    const response = await fetch(url, {
      body: JSON.stringify({ input: texts, model: target.model }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (!response.ok) {
      return {
        detail: `Ollama ${url} answered ${response.status} for model ${target.model} (is it pulled? \`ollama pull ${target.model}\`).`,
        ok: false,
        reason: 'provider_error',
      };
    }

    const embeddings = readEmbeddings(await response.json());

    if (!embeddings || embeddings.length !== texts.length) {
      return {
        detail: `Ollama ${url} returned no usable embeddings for ${texts.length} input(s).`,
        ok: false,
        reason: 'provider_error',
      };
    }

    return { ok: true, vectors: embeddings };
  } catch (error) {
    const message = toErrorMessage(error);

    return {
      detail: `Ollama ${url} is unreachable: ${message}`,
      ok: false,
      reason: 'provider_error',
    };
  }
}
