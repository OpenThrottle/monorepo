/**
 * @description TypeORM entity for the OpenThrottle eval_datasets table (a versioned, per-repository
 * case set). Matches databases/openthrottle/migrations (147).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { Repository } from '../repositories/repository.entity.ts';
import type { EvalCase } from './eval-case.entity.ts';
import type { EvalDatasetTarget } from './eval-datasets.types.ts';

@Entity('eval_datasets')
export class EvalDataset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne('Repository', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'repository_id' })
  repository?: Repository;

  @OneToMany('EvalCase', 'dataset')
  cases?: EvalCase[];
}
