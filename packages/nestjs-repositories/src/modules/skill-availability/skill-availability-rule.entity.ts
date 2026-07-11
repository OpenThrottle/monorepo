/**
 * @description TypeORM entity for skill_availability_rules. Matches databases/migrations/062.
 * Each rule matches skills by tag/slug allow/deny lists, optionally scoped to an environment.
 * `editor`/`role` are reserved-inert nullable columns — the v1 resolver ignores them.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SkillAvailabilityRuleSet } from './skill-availability-rule-set.entity';

/** Scalar/column fields of SkillAvailabilityRule (no relations). */
export type SkillAvailabilityRuleData = Omit<SkillAvailabilityRule, 'ruleSet'>;

@Entity('skill_availability_rules')
export class SkillAvailabilityRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'rule_set_id', type: 'uuid' })
  ruleSetId!: string;

  @ManyToOne(() => SkillAvailabilityRuleSet, (ruleSet) => ruleSet.rules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rule_set_id' })
  ruleSet?: SkillAvailabilityRuleSet;

  @Column({
    array: true,
    default: () => "'{}'",
    name: 'tag_allow',
    type: 'text',
  })
  tagAllow!: string[];

  @Column({
    array: true,
    default: () => "'{}'",
    name: 'tag_deny',
    type: 'text',
  })
  tagDeny!: string[];

  @Column({
    array: true,
    default: () => "'{}'",
    name: 'slug_allow',
    type: 'text',
  })
  slugAllow!: string[];

  @Column({
    array: true,
    default: () => "'{}'",
    name: 'slug_deny',
    type: 'text',
  })
  slugDeny!: string[];

  @Column({ name: 'environment', nullable: true, type: 'text' })
  environment!: string | null;

  @Column({ name: 'editor', nullable: true, type: 'text' })
  editor!: string | null;

  @Column({ name: 'role', nullable: true, type: 'text' })
  role!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
