import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserDisabledAgentCli } from './user-disabled-agent-cli.entity.ts';
import { UserDisabledAgentClisRepository } from './user-disabled-agent-clis.repository.ts';

/**
 * @description Registers {@link UserDisabledAgentCli} on the default connection and provides
 * {@link UserDisabledAgentClisRepository}.
 * @public
 */
@Module({
  exports: [UserDisabledAgentClisRepository],
  imports: [TypeOrmModule.forFeature([UserDisabledAgentCli])],
  providers: [UserDisabledAgentClisRepository],
})
export class UserDisabledAgentClisModule {}
