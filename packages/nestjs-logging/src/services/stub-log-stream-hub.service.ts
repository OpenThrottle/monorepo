import { Injectable } from '@nestjs/common';
import type {
  LogReplayChunk,
  LogStreamHub,
  StructuredLogRecord,
} from '../ports/logging-ports';

/**
 * @description No-op hub for tests or apps that disable streaming while keeping the token.
 */
@Injectable()
export class StubLogStreamHub implements LogStreamHub {
  publish(_record: StructuredLogRecord): void {
    void _record;
  }

  readReplayTailLines(): Promise<ReadonlyArray<StructuredLogRecord>> {
    return Promise.resolve([]);
  }

  readReplayFromByteOffset(byteOffset: number): Promise<LogReplayChunk> {
    return Promise.resolve({
      nextByteOffset: byteOffset,
      records: [],
    });
  }

  subscribe(_listener: (record: StructuredLogRecord) => void): () => void {
    void _listener;

    return () => {
      // no-op unsubscribe
    };
  }
}
