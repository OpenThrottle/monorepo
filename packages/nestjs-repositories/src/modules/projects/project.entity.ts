/**
 * @description TypeORM entity for OpenThrottle projects table. Matches databases/migrations (024).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Plan } from '../plans/plan.entity';
import type { Task } from '../tasks/task.entity';

/** Scalar/column fields of Project (no relations). Use to type GraphQL objects or DTOs that mirror the entity. */
export type ProjectData = Omit<Project, 'plans' | 'tasks'>;

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @Column({ name: 'nx_project_name', nullable: true, type: 'text' })
  nxProjectName!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @OneToMany('Plan', 'projectRelation')
  plans!: Plan[];

  @OneToMany('Task', 'projectRelation')
  tasks!: Task[];
}
