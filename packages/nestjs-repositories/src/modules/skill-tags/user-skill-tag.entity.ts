/**
 * @description TypeORM entity for user_skill_tags. Matches databases/migrations/060 + 063.
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
import { User } from '../users/user.entity';

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
