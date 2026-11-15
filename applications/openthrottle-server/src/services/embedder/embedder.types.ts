/**
 * @description Types for the server's embedder (OT plan 165e86ef).
 */

/**
 * @description Live state of the embedder. `starting` until the boot probe finishes; `ok` once a
 * probe or a real embed succeeded; every other value names why search is lexical-only.
 */
export type EmbedderState =
  'dimension_mismatch' | 'ok' | 'provider_error' | 'starting' | 'unconfigured';

export interface EmbedderStatus {
  /** When the state last changed from a probe or a real embed; null before the first. */
  readonly checkedAt: Date | null;
  /** Human-readable reason for any non-ok state. */
  readonly detail: string | null;
  readonly dims: number | null;
  readonly model: string | null;
  /** `EMBEDDING_PROVIDER` as configured, even when it was refused. */
  readonly provider: string;
  readonly state: EmbedderState;
}

/** @description One embedding column and the dimension Postgres declares for it. */
export interface EmbeddingColumnDims {
  readonly dims: number | null;
  readonly table: string;
}
