import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { CortexDocumentParseService } from './cortex-document-parse.service';

@Module({
  controllers: [],
  exports: [CortexDocumentParseService],
  imports: [LoggerModule],
  providers: [CortexDocumentParseService],
})
export class CortexDocumentParseModule {}
