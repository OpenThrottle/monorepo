import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentAccount } from './agent-account.entity.ts';
import { AgentAccountsRepository } from './agent-accounts.repository.ts';

/**
 * @description Registers {@link AgentAccount} on the default connection and provides
 * {@link AgentAccountsRepository}.
 * @public
 */
@Module({
  exports: [AgentAccountsRepository],
  imports: [TypeOrmModule.forFeature([AgentAccount])],
  providers: [AgentAccountsRepository],
})
export class AgentAccountsModule {}
