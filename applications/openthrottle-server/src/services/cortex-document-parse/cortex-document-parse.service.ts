import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { parseCortexUploadDocument } from './cortex-document-parse.pipeline';
import type { CortexDocumentParseResult } from './cortex-document-parse.types';
import type { DocumentParseHints } from './cortex-document-parse.types';

@Injectable()
export class CortexDocumentParseService {
  private readonly logContext = CortexDocumentParseService.name;

  constructor(private readonly logger: LoggerService) {
    this.logger.debug('Cortex document parse service ready', this.logContext);
  }

  /**
   * @description Parses an uploaded buffer into a neutral {@link CortexDocumentParseResult} tree.
   */
  parseUpload(
    buffer: Buffer,
    hints: DocumentParseHints,
  ): CortexDocumentParseResult {
    const result = parseCortexUploadDocument(buffer, hints);
    if (!result.ok) {
      this.logger.warn(result.error.message, this.logContext);
    }
    return result;
  }
}
