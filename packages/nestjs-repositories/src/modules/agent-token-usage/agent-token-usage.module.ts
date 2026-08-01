import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { AgentTokenUsage } from './agent-token-usage.entity';
import { AgentTokenUsageService } from './agent-token-usage.service';

@Module({
  controllers: [],
  exports: [AgentTokenUsageService],
  imports: [LoggerModule, TypeOrmModule.forFeature([AgentTokenUsage])],
  providers: [AgentTokenUsageService],
})
export class AgentTokenUsageModule {}
