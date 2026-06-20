import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * @description One entry of a workspace snapshot: a tracked file's workspace-relative POSIX path
 * and its sha256 content fingerprint. Mirrors the `@openthrottle/openthrottle-ide` engine's
 * `WorkspaceFileHash`; the `snapshot` JSONB column is an array of these.
 */
export interface CodeIndexSnapshotEntry {
  /** sha256 hex fingerprint of the file's contents. */
  readonly hash: string;
  /** Workspace-relative POSIX path. */
  readonly path: string;
}

/**
 * @description TypeORM entity for the code_index_snapshots table (databases/migrations 054). Stores
 * the `@openthrottle/openthrottle-ide` engine's `hashWorkspace` output per workspace so the next
 * index can `diffSnapshots` and re-embed only added/changed files. Like CodeEmbedding, the concrete
 * read/write path is raw SQL (CodeSnapshotStore in @openthrottle/nestjs-vector-search); this entity
 * registers the table with TypeORM and documents its shape. Scoped by `workspaceRoot`.
 */
@Entity('code_index_snapshots')
export class CodeIndexSnapshot {
  /** Absolute filesystem path of the registered repository; one snapshot per workspace. */
  @PrimaryColumn({ name: 'workspace_root', type: 'text' })
  workspaceRoot!: string;

  /** Engine hashWorkspace() output: array of { path, hash } for every tracked file. */
  @Column({ name: 'snapshot', type: 'jsonb' })
  snapshot!: CodeIndexSnapshotEntry[];

  /** Timestamp of the last successful index that persisted this snapshot. */
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
