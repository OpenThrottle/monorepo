import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { NestjsAgenticWorkflowService } from './nestjs-agentic-workflow.service';

@Module({
  controllers: [],
  exports: [NestjsAgenticWorkflowService],
  imports: [LoggerModule],
  providers: [NestjsAgenticWorkflowService],
})
export class NestjsAgenticWorkflowModule {}
