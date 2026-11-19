/**
 * @description TypeORM entity for the openthrottle `skill_availability_rule_sets` table. Extends
 * `BaseModel`, so a delete is a soft delete; soft deleting a rule set soft deletes its live rules
 * in the same transaction (it replaces the foreign key cascade, which a soft delete never fires)
 * and frees the project's single live rule set slot. At most one live row per project (unique
 * project_id among live rows); it carries the single per-project posture and owns zero or more
 * SkillAvailabilityRule rows. Matches databases/openthrottle/migrations (062, 179).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import type { Project } from '../projects/project.entity.ts';
import type { SkillAvailabilityRule } from '../skill-availability-rules/skill-availability-rule.entity.ts';

@Entity('skill_availability_rule_sets')
export class SkillAvailabilityRuleSet extends BaseModel {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @ManyToOne('Project', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Column({ default: 'allow', name: 'posture', type: 'text' })
  posture!: string;

  @OneToMany('SkillAvailabilityRule', 'ruleSet')
  rules?: SkillAvailabilityRule[];
}
