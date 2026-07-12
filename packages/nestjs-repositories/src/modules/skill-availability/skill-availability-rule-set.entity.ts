/**
 * @description TypeORM entity for skill_availability_rule_sets. Matches databases/migrations/062.
 * At most one row per project (unique project_id); carries the single per-project posture and
 * owns zero or more SkillAvailabilityRule rows.
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
import { Project } from '../projects/project.entity';
import { SkillAvailabilityRule } from './skill-availability-rule.entity';

/** Scalar/column fields of SkillAvailabilityRuleSet (no relations). */
export type SkillAvailabilityRuleSetData = Omit<
  SkillAvailabilityRuleSet,
  'project' | 'rules'
>;

@Entity('skill_availability_rule_sets')
export class SkillAvailabilityRuleSet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Column({ default: 'allow', name: 'posture', type: 'text' })
  posture!: string;

  @OneToMany(() => SkillAvailabilityRule, (rule) => rule.ruleSet)
  rules?: SkillAvailabilityRule[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
