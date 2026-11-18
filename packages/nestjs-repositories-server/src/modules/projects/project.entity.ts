/**
 * @description TypeORM entity for the openthrottle `projects` table. Extends `BaseModel`, so a
 * delete is a soft delete: the project's plans and tasks keep their `project_id`, and the link
 * reads as no project while the project is soft deleted. Matches
 * databases/openthrottle/migrations (024, 173).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, OneToMany } from 'typeorm';

import type { Plan } from '../plans/plan.entity.ts';
import type { Task } from '../tasks/task.entity.ts';

@Entity('projects')
export class Project extends BaseModel {
  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @Column({ name: 'nx_project_name', nullable: true, type: 'text' })
  nxProjectName!: string | null;

  @OneToMany('Plan', 'projectRelation')
  plans!: Plan[];

  @OneToMany('Task', 'projectRelation')
  tasks!: Task[];
}
