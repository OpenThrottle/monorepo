/**
 * @description TypeORM entity for OpenThrottle user_disabled_agent_clis table. Matches
 * databases/migrations/091 + 092. Presence-as-disabled: a row means the user turned something off;
 * the absence of a row means it is enabled (the default all-enabled posture). The nullable `model`
 * discriminates granularity: `model` null = the WHOLE agent (backend) is disabled; a non-null `model`
 * = that single model is disabled within an otherwise-enabled agent. Rows are only ever inserted
 * (disable) or deleted (enable), so there is no updated_at column.
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
  'backend' | 'createdAt' | 'id' | 'model' | 'userId'
>;

@Entity('user_disabled_agent_clis')
export class UserDisabledAgentCli {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'backend', type: 'text' })
  backend!: string;

  /**
   * Which model this disable row targets. `null` = the whole agent (backend) is disabled — the
   * original agent-level semantics; a non-null value is a single disabled model within an
   * otherwise-enabled agent.
   */
  @Column({ name: 'model', nullable: true, type: 'text' })
  model!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
