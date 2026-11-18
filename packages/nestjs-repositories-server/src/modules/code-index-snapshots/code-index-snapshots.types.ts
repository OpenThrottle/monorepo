/**
 * @description One entry of a workspace snapshot: a tracked file's workspace-relative POSIX path
 * and its sha256 content fingerprint. Mirrors the `@openthrottle/openthrottle-ide` engine's
 * `WorkspaceFileHash`; the `snapshot` JSONB column is an array of these.
 * @public
 */
export interface CodeIndexSnapshotEntry {
  /** sha256 hex fingerprint of the file's contents. */
  readonly hash: string;
  /** Workspace-relative POSIX path. */
  readonly path: string;
}
