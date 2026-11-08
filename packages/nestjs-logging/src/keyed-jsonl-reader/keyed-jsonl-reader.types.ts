import type { KeyedJsonlRunRecord } from '../keyed-jsonl-writer/keyed-jsonl-writer.types.ts';

/**
 * @description Streaming, cursor-based reader for the per-(queue,job) JSONL run
 * transcripts written by {@link KeyedJsonlWriter}. Resolves the same keyed file
 * path the writer uses (default, falling back to the collision-suffixed variant),
 * then reads it line-by-line so memory stays bounded by `limit` regardless of file
 * size — the counterpart needed to page/tail run output for the Phase 1 log tail
 * API (OT plan 3c397432).
 *
 * Pagination is by **physical line index** (0-based, stable because the files are
 * append-only): `afterLine` resumes after a prior page, `nextLine` is the cursor to
 * pass next. `sinceTimestamp` filters to records at/after an ISO instant. The two
 * are independent selectors; `nextLine` is always line-based so a `sinceTimestamp`
 * first page pages forward by cursor thereafter. Malformed lines are skipped but
 * still advance the line index so cursors stay aligned with physical lines.
 *
 * Level/message derivation and `levelIn` filtering are intentionally NOT done here
 * (the GraphQL layer owns that mapping); this stays a pure storage adapter.
 */

export interface ReadKeyedJsonlRunOptions {
  /**
   * @description Resume after this many physical lines from the start of the file
   * (the `nextLine` from a prior page). Defaults to 0 (start of file).
   */
  readonly afterLine?: number;
  /** @description Max records to return; the caller is responsible for capping it. */
  readonly limit: number;
  /**
   * @description Optional ISO-8601 lower bound (inclusive): only records whose
   * `timestamp >= sinceTimestamp` are returned. Applied as a filter (run files are
   * not guaranteed strictly time-sorted), so it scans from `afterLine`.
   */
  readonly sinceTimestamp?: string;
}

export interface KeyedJsonlRunLine {
  /** @description 0-based physical line index in the file (the pagination unit). */
  readonly lineNumber: number;
  readonly record: KeyedJsonlRunRecord;
}

export interface ReadKeyedJsonlRunResult {
  /** @description True when at least one further matching line exists after this page. */
  readonly hasMore: boolean;
  readonly lines: readonly KeyedJsonlRunLine[];
  /** @description Line index to resume from on the next page (the forward cursor). */
  readonly nextLine: number;
}

export interface ReadKeyedJsonlRunParams {
  readonly baseDirectory: string;
  readonly jobId: string;
  readonly options: ReadKeyedJsonlRunOptions;
  readonly queueName: string;
}
