import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { WorkArtifact } from './work-artifact.entity';
import { WorkLedgerService } from './work-ledger.service';
import { WorkSession } from './work-session.entity';
import { WorkSessionSubject } from './work-session-subject.entity';

@Module({
  controllers: [],
  exports: [WorkLedgerService],
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([WorkArtifact, WorkSession, WorkSessionSubject]),
  ],
  providers: [WorkLedgerService],
})
export class WorkLedgerModule {}
