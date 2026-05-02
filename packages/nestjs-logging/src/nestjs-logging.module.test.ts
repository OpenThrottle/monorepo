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

  it('forRoot registers the websocket gateway when websocket.enabled is true', async () => {
    const dynamic = NestjsLoggingModule.forRoot({
      logDirectory: '/tmp/nestjs-logging-ws',
      websocket: { enabled: true, namespace: '/test-logs' },
    });

    const isWebsocketGatewayProvider = (p: unknown): boolean =>
      typeof p === 'function' && p.name === 'NestjsLoggingWebsocketGatewayImpl';

    expect(dynamic.providers?.some(isWebsocketGatewayProvider)).toBe(true);
    expect(dynamic.exports?.some(isWebsocketGatewayProvider)).toBe(true);

    const app = await Test.createTestingModule({
      imports: [
        NestjsLoggingModule.forRoot({
          logDirectory: '/tmp/nestjs-logging-ws-runtime',
          websocket: { enabled: true },
        }),
      ],
    }).compile();

    expect(app.get(NestjsLoggingService)).toBeDefined();
  });

  it('forRootAsync can register the websocket gateway via registerWebsocketGateway', async () => {
    const dynamic = NestjsLoggingModule.forRootAsync({
      registerWebsocketGateway: true,
      useFactory: async () => ({
        logDirectory: '/tmp/nestjs-logging-ws-async',
        websocket: { enabled: true },
      }),
    });

    const isWebsocketGatewayProvider = (p: unknown): boolean =>
      typeof p === 'function' && p.name === 'NestjsLoggingWebsocketGatewayImpl';

    expect(dynamic.providers?.some(isWebsocketGatewayProvider)).toBe(true);

    const app = await Test.createTestingModule({
      imports: [
        NestjsLoggingModule.forRootAsync({
          registerWebsocketGateway: true,
          useFactory: async () => ({
            logDirectory: '/tmp/nestjs-logging-ws-async-runtime',
            websocket: { enabled: true },
          }),
        }),
      ],
    }).compile();

    expect(app.get(NestjsLoggingService)).toBeDefined();
  });
});
