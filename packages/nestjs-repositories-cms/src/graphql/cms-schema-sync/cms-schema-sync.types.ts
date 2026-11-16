/**
 * @description One generated block schema, read from a manifest and ready to sync.
 * @public
 */
export interface CmsSchemaSyncEntry {
  readonly jsonSchema: Readonly<Record<string, unknown>>;
  /** The schema file it was read from, for error messages. */
  readonly source: string;
  readonly typename: string;
  /** Content hash: the first 16 hex characters of the sha256 of the key-sorted schema. */
  readonly version: string;
}

/**
 * @description Outcome of reading every manifest under the manifests directory.
 * @public
 */
export type CmsSchemaManifestReadResult =
  | { readonly entries: readonly CmsSchemaSyncEntry[]; readonly ok: true }
  | { readonly error: string; readonly ok: false };

/**
 * @description What one sync changed, as sorted `typename@version` labels per kind of write.
 * `total` is how many generated schemas were read.
 * @public
 */
export interface CmsSchemaSyncResult {
  readonly activated: readonly string[];
  readonly disabled: readonly string[];
  readonly inserted: readonly string[];
  readonly total: number;
}

/**
 * @description Outcome of one sync. A failure carries a message and never throws, so a failed
 * boot sync cannot take the server down.
 * @public
 */
export type CmsSchemaSyncOutcome =
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly result: CmsSchemaSyncResult };
