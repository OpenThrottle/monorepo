/**
 * @description JSON shape returned by the `ide.files` resource route to the composer's
 * `@`-mention file provider. Declared in the domain rather than in the route module so
 * domain code never imports from `~/routes/*` — see OT plan 88f747ff task 8ab97f22.
 * The route module's loader declares this as its return type, so the two cannot drift.
 */
export interface IdeFilesResponse {
  /** Workspace-relative POSIX paths (filtered + capped when `q` is present). */
  readonly paths: readonly string[];
  /** The `q` echoed back (empty for an unfiltered listing). */
  readonly query: string;
  /** The resolved repository id (server-validated, not the raw client value). */
  readonly repositoryId: string;
  /** True when matches were dropped by the `MAX_FILE_MENTION_RESULTS` cap. */
  readonly truncated: boolean;
}
