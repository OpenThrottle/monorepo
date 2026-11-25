/**
 * @description Dedupe identity of an artifact type.
 * - `idempotent`: re-reporting the same external_key upserts (git_commit, pull_request).
 * - `event`: every report is a distinct row; external_key carries a discriminator (status_change).
 */
export const ARTIFACT_IDENTITY = {
  EVENT: 'event',
  IDEMPOTENT: 'idempotent',
} as const;

export type ArtifactIdentityKey = keyof typeof ARTIFACT_IDENTITY;
export type ArtifactIdentityValue =
  (typeof ARTIFACT_IDENTITY)[ArtifactIdentityKey];
