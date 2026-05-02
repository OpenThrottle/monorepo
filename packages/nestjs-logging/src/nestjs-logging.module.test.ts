import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import type { LogJsonlSink, LogStreamHub } from './ports/logging-ports';
import { NestjsLoggingModule } from './nestjs-logging.module';
import { NestjsLoggingService } from './nestjs-logging.service';
import { LOG_JSONL_SINK, LOG_STREAM_HUB } from './tokens/nestjs-logging.tokens';

describe('NestjsLoggingModule', () => {
  it('forRoot wires sink and hub tokens', async () => {
    const app = await Test.createTestingModule({
      imports: [
        NestjsLoggingModule.forRoot({ logDirectory: '/tmp/nestjs-logging' }),
      ],
    }).compile();

    expect(app.get<LogJsonlSink>(LOG_JSONL_SINK)).toBeDefined();
    expect(app.get<LogStreamHub>(LOG_STREAM_HUB)).toBeDefined();
    expect(app.get(NestjsLoggingService)).toBeDefined();
  });

  it('forRootAsync resolves options from factory', async () => {
    const app = await Test.createTestingModule({
      imports: [
        NestjsLoggingModule.forRootAsync({
          useFactory: async () => ({
            fileBasename: 'async-app',
            logDirectory: '/tmp/nestjs-logging-async',
          }),
        }),
      ],
    }).compile();

    const svc = app.get(NestjsLoggingService);

    expect(svc.getResolvedOptions().logDirectory).toBe(
      '/tmp/nestjs-logging-async',
    );
    expect(svc.getResolvedOptions().fileBasename).toBe('async-app');
  });
});
