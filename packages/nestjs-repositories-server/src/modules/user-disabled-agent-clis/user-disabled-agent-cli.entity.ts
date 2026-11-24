/**
 * @description TypeORM entity for the openthrottle `user_disabled_agent_clis` table.
 * Presence-as-disabled: a row means the user turned something off; the absence of a row means it
 * is enabled (the default all-enabled posture). The nullable `model` discriminates granularity:
 * null = the WHOLE agent (driver) is disabled; a non-null `model` = that single model is disabled
 * within an otherwise-enabled agent. Rows are only ever inserted (disable) or deleted (enable), so
 * it extends `BaseHardDeleteModel` and has no `updated_at`. Matches
 * databases/openthrottle/migrations (091, 092, 171).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

@Entity('user_disabled_agent_clis')
export class UserDisabledAgentCli extends BaseHardDeleteModel {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'driver', type: 'text' })
  driver!: string;

  /**
   * Which model this disable row targets. `null` = the whole agent (driver) is disabled; a
   * non-null value is a single disabled model within an otherwise-enabled agent.
   */
  @Column({ name: 'model', nullable: true, type: 'text' })
  model!: string | null;
}
