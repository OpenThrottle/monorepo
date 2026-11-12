/**
 * @description NestJS module for agent_accounts (the agent-CLI logins usage is billed to).
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentAccount } from './agent-accounts.entity.ts';
import { AgentAccountsService } from './agent-accounts.service.ts';

@Module({
  controllers: [],
  exports: [AgentAccountsService],
  imports: [TypeOrmModule.forFeature([AgentAccount])],
  providers: [AgentAccountsService],
})
export class AgentAccountsModule {}
