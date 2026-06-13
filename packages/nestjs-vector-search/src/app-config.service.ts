import { Injectable } from '@nestjs/common';
import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_EMBEDDING_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_EMBEDDING_MODEL,
} from '@openthrottle/openthrottle-ide';
import type { EmbeddingsConfig } from '@openthrottle/openthrottle-ide';

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
   * True when the resolved config can actually embed: OpenAI requires an API key; Ollama only needs
   * its (always-defaulted) base URL. Drives the UI's `unavailable` state.
   */
  isEmbeddingsConfigured(projectId?: string): boolean {
    const config = this.getEmbeddingsConfig(projectId);
    return config.kind === 'ollama' ? true : Boolean(config.apiKey);
  }
}
