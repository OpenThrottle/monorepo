/**
 * @description TypeORM entity for the openthrottle `agent_conversation_groups` table: a
 * user-defined group that organises one user's chat conversations in the sidebar. A group is
 * removed for real (`BaseHardDeleteModel`), and the database clears `group_id` on its
 * conversations. Matches databases/openthrottle/migrations (207).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';

import type { User } from '../users/user.entity.ts';

@Entity('agent_conversation_groups')
export class AgentConversationGroup extends BaseHardDeleteModel {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ default: 0, name: 'sort_order', type: 'integer' })
  sortOrder!: number;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
