import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { CspReportsController } from './csp-reports.controller';

@Module({
  controllers: [CspReportsController],
  imports: [LoggerModule],
})
export class CspReportsModule {}
