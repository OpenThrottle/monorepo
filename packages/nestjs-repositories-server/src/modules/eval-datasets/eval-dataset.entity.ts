/**
 * @description TypeORM entity for the openthrottle `eval_datasets` table: a versioned,
 * per-repository case set. Extends `BaseModel`, so a delete is a soft delete through
 * `deleted_at`. The unique index on (repository_id, name, version) deliberately still covers
 * soft-deleted rows: a new version takes `max(version) + 1` over every row, so a version number
 * is never reused. Matches databases/openthrottle/migrations (147, 181).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import type { EvalCase } from '../eval-cases/eval-case.entity.ts';
import type { Repository } from '../repositories/repository.entity.ts';
import type { EvalDatasetTarget } from './eval-datasets.types.ts';

@Entity('eval_datasets')
export class EvalDataset extends BaseModel {
  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'target', type: 'text' })
  target!: EvalDatasetTarget;

  @Column({ default: 1, name: 'version', type: 'integer' })
  version!: number;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @Column({ name: 'created_by', type: 'text' })
  createdBy!: string;

  @ManyToOne('Repository', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'repository_id' })
  repository?: Repository;

  @OneToMany('EvalCase', 'dataset')
  cases?: EvalCase[];
}
