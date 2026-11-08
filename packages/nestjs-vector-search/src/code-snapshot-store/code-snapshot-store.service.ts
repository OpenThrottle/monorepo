import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { WorkspaceFileHash } from '@openthrottle/openthrottle-ide';
import { DataSource } from 'typeorm';

/** Raw row shape returned when loading a snapshot from code_index_snapshots. */
interface CodeSnapshotRow {
  /** node-pg parses JSONB, so this is already the engine WorkspaceFileHash array. */
  readonly snapshot: WorkspaceFileHash[];
}

/**
 * @description Persists the `@openthrottle/openthrottle-ide` engine's `hashWorkspace` output (a
 * per-file content-hash snapshot) in the `code_index_snapshots` table (databases/migrations 054),
 * one row per `workspaceRoot`. {@link CodeSearchService} loads the prior snapshot before an index to
 * compute the incremental delta (engine `diffSnapshots`) and saves the fresh snapshot after a
 * successful index. Uses raw SQL via the injected TypeORM {@link DataSource} — the same approach as
 * {@link CodeVectorStore}.
 */
@Injectable()
export class CodeSnapshotStore {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Load the prior snapshot for a workspace, or `null` when none has been persisted yet (the caller
   * then performs a FULL index rather than a diff).
   */
  async load(workspaceRoot: string): Promise<WorkspaceFileHash[] | null> {
    const rows = await this.dataSource.query<CodeSnapshotRow[]>(
      'SELECT snapshot FROM code_index_snapshots WHERE workspace_root = $1',
      [workspaceRoot],
    );
    return rows[0]?.snapshot ?? null;
  }

  /**
   * Upsert the workspace snapshot (one row per `workspaceRoot`). Called only after a successful
   * index so a failed run never advances the baseline.
   */
  async save(
    workspaceRoot: string,
    snapshot: WorkspaceFileHash[],
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO code_index_snapshots (workspace_root, snapshot, updated_at)
         VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (workspace_root) DO UPDATE SET
         snapshot = EXCLUDED.snapshot,
         updated_at = EXCLUDED.updated_at`,
      [workspaceRoot, JSON.stringify(snapshot)],
    );
  }
}
