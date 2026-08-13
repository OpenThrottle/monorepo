/**
 * @description NestJS module for per-user agent-CLI enablement preferences.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { AgentCliPreferencesService } from './agent-cli-preferences.service';
import { UserDisabledAgentCli } from './user-disabled-agent-cli.entity';
import { UserFavoriteAgentModel } from './user-favorite-agent-model.entity';

@Module({
  controllers: [],
  exports: [AgentCliPreferencesService, TypeOrmModule],
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([UserDisabledAgentCli, UserFavoriteAgentModel]),
  ],
  providers: [AgentCliPreferencesService],
})
export class AgentCliPreferencesModule {}
