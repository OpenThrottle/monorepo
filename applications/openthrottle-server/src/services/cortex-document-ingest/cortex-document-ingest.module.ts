import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { CortexDocumentParseModule } from '../cortex-document-parse/cortex-document-parse.module';
import { PlanCreationModule } from '../plan-creation/plan-creation.module';
import { CortexDocumentIngestService } from './cortex-document-ingest.service';

@Module({
  exports: [CortexDocumentIngestService],
  imports: [
    CortexDocumentParseModule,
    LoggerModule,
    NestjsRepositoriesModule,
    PlanCreationModule,
  ],
  providers: [CortexDocumentIngestService],
})
export class CortexDocumentIngestModule {}
