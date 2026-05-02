import { Injectable } from '@nestjs/common';
import type { LogStreamHub } from '../ports/logging-ports';
import type { StructuredLogRecord } from '../ports/logging-ports';

/**
 * @description Placeholder hub until fan-out + replay wiring lands.
 */
@Injectable()
export class StubLogStreamHub implements LogStreamHub {
  subscribe(_listener: (record: StructuredLogRecord) => void): () => void {
    void _listener;

    return () => {
      // no-op unsubscribe
    };
  }
}
