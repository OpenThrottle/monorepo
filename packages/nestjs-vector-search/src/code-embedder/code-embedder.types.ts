import type {
  EmbeddingConfig,
  EmbeddingInputType,
  EmbedResult,
} from '@openthrottle/node-client';

/**
 * @description Why the host's embedder can or cannot embed right now. Mirrors the server's
 * `EmbedderStatus` state, which this package does not import.
 */
export type CodeEmbedderState =
  'dimension_mismatch' | 'ok' | 'provider_error' | 'starting' | 'unconfigured';

/**
 * @description The embedder code search runs on — the host app's single, process-wide embedder
 * (in openthrottle-server, `EmbedderService` over `@openthrottle/node-client`). This package ships
 * no embedder of its own: it is handed one through {@link CODE_EMBEDDER}.
 *
 * @public
 */
export interface CodeEmbedder {
  /** Embeds with the configured model's task prefix and input cap. Never throws. */
  embed(
    texts: readonly string[],
    inputType: EmbeddingInputType,
  ): Promise<EmbedResult>;
  /** The resolved config, or undefined when the environment was refused. */
  getConfig(): EmbeddingConfig | undefined;
  getStatus(): {
    readonly detail: string | null;
    readonly state: CodeEmbedderState;
  };
}
