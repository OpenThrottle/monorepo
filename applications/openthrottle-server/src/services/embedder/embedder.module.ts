import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { EmbedderService } from './embedder.service.ts';

/**
 * @description Provides the process-wide {@link EmbedderService}. Import it wherever text is
 * embedded; Nest keeps one instance per process, so the local model loads once.
 */
@Module({
  exports: [EmbedderService],
  imports: [LoggerModule],
  providers: [EmbedderService],
})
export class EmbedderModule {}
