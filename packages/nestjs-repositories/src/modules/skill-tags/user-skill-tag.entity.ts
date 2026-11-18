/**
 * @description TypeORM entity for user_skill_tags. Matches databases/openthrottle/migrations/060 + 063.
 */

import { User } from '@openthrottle/nestjs-repositories-server';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface UserSkillTagData {
  readonly dimension: string;
  readonly id: string;
  readonly tag: string;
  readonly userId: string;
}

@Entity('user_skill_tags')
export class UserSkillTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'tag', type: 'text' })
  tag!: string;

  @Column({ default: 'domain', name: 'dimension', type: 'text' })
  dimension!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
