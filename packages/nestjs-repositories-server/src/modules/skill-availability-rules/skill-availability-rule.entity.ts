/**
 * @description TypeORM entity for the openthrottle `skill_availability_rules` table. Extends
 * `BaseModel`, so a delete is a soft delete (also when its rule set is soft deleted). Each rule
 * matches skills by tag/slug allow/deny lists, optionally scoped to an environment.
 * `editor`/`role` are reserved-inert nullable columns: the v1 resolver ignores them.
 * Matches databases/openthrottle/migrations (062, 179).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { SkillAvailabilityRuleSet } from '../skill-availability-rule-sets/skill-availability-rule-set.entity.ts';

@Entity('skill_availability_rules')
export class SkillAvailabilityRule extends BaseModel {
  @Column({ name: 'rule_set_id', type: 'uuid' })
  ruleSetId!: string;

  @ManyToOne('SkillAvailabilityRuleSet', 'rules', { onDelete: 'CASCADE' })
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
}
