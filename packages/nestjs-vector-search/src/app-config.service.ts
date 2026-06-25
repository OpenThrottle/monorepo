import { Injectable } from '@nestjs/common';
import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_EMBEDDING_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_EMBEDDING_MODEL,
} from '@openthrottle/openthrottle-ide';
import type { EmbeddingsConfig } from '@openthrottle/openthrottle-ide';

/**
 * Ollama embedding models known to emit 1536-dimensional vectors (the pgvector column width), i.e. the
 * width the `code_embeddings.embedding` column requires. This is intentionally empty by default: the
 * common Ollama models do NOT match — `nomic-embed-text` emits 768 and `mxbai-embed-large` emits
 * 1024 — so indexing would fail the dimension guard in `CodeSearchService`. Operators who run a
 * custom or future Ollama model that emits the pgvector column width (1536) can opt it in via
 * `OLLAMA_VERIFIED_EMBEDDING_MODELS` (comma-separated), at which point the UI reports search as
 * available. Keeping this allowlist centralized means the UI's `available` state reflects whether
 * embedding will actually succeed, rather than optimistically reporting `true` for any Ollama config.
 */
const KNOWN_GOOD_OLLAMA_EMBEDDING_MODELS: ReadonlySet<string> = new Set();

/**
 * @description Owns embeddings configuration resolution — the single place that reads `process.env`
 * and applies precedence, so leaf code (the openthrottle-ide engine) stays a pure function of an
 * explicit {@link EmbeddingsConfig}. Today the precedence is `hardcoded default -> env seed`; Plan B
 * extends {@link AppConfigService.getEmbeddingsConfig} into a layered resolver
 * (`default -> env -> system_settings -> project_settings`) behind the same signature.
 *
 * Secrets (the OpenAI API key) are sourced ONLY here, from env — they never come from the DB or
 * traverse GraphQL.
 */
@Injectable()
export class AppConfigService {
  /**
   * Resolve the embeddings configuration. Provider is chosen explicitly: Ollama when either
   * `OLLAMA_BASE_URL` or `OLLAMA_EMBEDDING_MODEL` is set, otherwise OpenAI. `projectId` is accepted
   * for the Plan B per-project override layer; it is unused today (no DB access yet).
   */
  getEmbeddingsConfig(_projectId?: string): EmbeddingsConfig {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL?.trim();
    const ollamaModel = process.env.OLLAMA_EMBEDDING_MODEL?.trim();

    if (ollamaBaseUrl || ollamaModel) {
      return {
        baseUrl: ollamaBaseUrl || DEFAULT_OLLAMA_BASE_URL,
        kind: 'ollama',
        model: ollamaModel || DEFAULT_OLLAMA_EMBEDDING_MODEL,
      };
    }

    return {
      apiKey: process.env.OPENAI_API_KEY?.trim() || undefined,
      baseUrl: process.env.OPENAI_BASE_URL?.trim() || DEFAULT_OPENAI_BASE_URL,
      kind: 'openai',
      model:
        process.env.OPENAI_EMBEDDING_MODEL?.trim() ||
        DEFAULT_OPENAI_EMBEDDING_MODEL,
    };
  }

  /**
   * True when the resolved config can actually embed AND the resulting vectors will fit the
   * `code_embeddings.embedding` column (`vector(1536)`). OpenAI requires an API
   * key. Ollama additionally requires that the configured model is known to emit
   * the pgvector column width (1536)-dimensional vectors (see {@link KNOWN_GOOD_OLLAMA_EMBEDDING_MODELS});
   * the common defaults emit the wrong width, so reporting Ollama as configured without this check
   * made the UI show search as available right up until indexing failed the dimension guard. Drives
   * the UI's `unavailable` state.
   */
  isEmbeddingsConfigured(projectId?: string): boolean {
    const config = this.getEmbeddingsConfig(projectId);
    return config.kind === 'ollama'
      ? this.isOllamaModelDimensionVerified(config.model)
      : Boolean(config.apiKey);
  }

  /**
   * True when an Ollama embedding model is known to emit the pgvector column width (1536)-dimensional
   * vectors: either it is in the built-in {@link KNOWN_GOOD_OLLAMA_EMBEDDING_MODELS} allowlist, or an
   * operator has opted it in via the `OLLAMA_VERIFIED_EMBEDDING_MODELS` env var (comma-separated
   * model names). Matching is case-insensitive and trims surrounding whitespace.
   */
  private isOllamaModelDimensionVerified(model: string): boolean {
    const normalizedModel = model.trim().toLowerCase();
    if (normalizedModel.length === 0) {
      return false;
    }
    if (KNOWN_GOOD_OLLAMA_EMBEDDING_MODELS.has(normalizedModel)) {
      return true;
    }
    const verifiedFromEnv = (process.env.OLLAMA_VERIFIED_EMBEDDING_MODELS ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0);
    return verifiedFromEnv.includes(normalizedModel);
  }
}
