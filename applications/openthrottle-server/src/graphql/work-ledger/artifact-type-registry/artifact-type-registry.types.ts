import type { ARTIFACT_IDENTITY } from './artifact-type-registry.constants.ts';
export type ArtifactIdentity =
  (typeof ARTIFACT_IDENTITY)[keyof typeof ARTIFACT_IDENTITY];

export interface ResolvedArtifact {
  readonly externalKey: string;
  readonly identity: ArtifactIdentity;
  readonly initialLifecycle: string | null;
  readonly payload: Record<string, unknown>;
}

/** @description Inputs to the lifecycle-trigger decision. */
export interface LifecycleTriggerContext {
  /**
   * Explicit caller override. `false` suppresses unconditionally (a bulk write that knows it is
   * one); `true` forces firing; `undefined` defers to the source rule.
   */
  readonly fireTriggers: boolean | undefined;
  /** The lifecycle state just entered. */
  readonly lifecycle: string;
  /** The artifact's `source` column. */
  readonly source: string;
  /** The artifact's registered `type`. */
  readonly type: string;
}
