/**
 * @description TypeORM entity for OpenThrottle user_disabled_agent_clis table. Matches
 * databases/migrations/091. Presence-as-disabled: a row (userId, backend) means the user turned that
 * agent CLI off; the absence of a row means it is enabled (the default all-enabled posture). Rows are
 * only ever inserted (disable) or deleted (enable), so there is no updated_at column.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Scalar/column fields of UserDisabledAgentCli (no relations). */
export type UserDisabledAgentCliData = Pick<
  UserDisabledAgentCli,
  'backend' | 'createdAt' | 'id' | 'userId'
>;

@Entity('user_disabled_agent_clis')
export class UserDisabledAgentCli {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'backend', type: 'text' })
  backend!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
