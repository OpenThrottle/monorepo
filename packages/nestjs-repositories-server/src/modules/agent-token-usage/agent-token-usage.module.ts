import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentTokenUsage } from './agent-token-usage.entity.ts';
import { AgentTokenUsageRepository } from './agent-token-usage.repository.ts';

/**
 * @description Registers {@link AgentTokenUsage} on the default connection and provides
 * {@link AgentTokenUsageRepository}.
 * @public
 */
@Module({
  exports: [AgentTokenUsageRepository],
  imports: [TypeOrmModule.forFeature([AgentTokenUsage])],
  providers: [AgentTokenUsageRepository],
})
export class AgentTokenUsageModule {}
