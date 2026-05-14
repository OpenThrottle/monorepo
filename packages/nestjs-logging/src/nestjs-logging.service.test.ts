import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, it } from 'vitest';
import { NestjsLoggingModule } from './nestjs-logging.module';
import { NestjsLoggingService } from './nestjs-logging.service';

describe('NestjsLoggingService', () => {
  let service: NestjsLoggingService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      imports: [
        NestjsLoggingModule.forRoot({
          logDirectory: '/tmp/nestjs-logging-test',
        }),
      ],
    })
      .overrideProvider(LoggerService)
      .useValue(createMock<LoggerService>())
      .compile();

    service = app.get<NestjsLoggingService>(NestjsLoggingService);
  });

  describe('getResolvedOptions', () => {
    it('returns merged options including defaults', () => {
      const opts = service.getResolvedOptions();

      expect(opts.logDirectory).toBe('/tmp/nestjs-logging-test');
      expect(opts.fileBasename).toBe('application');
      expect(opts.rotation).toEqual({ type: 'none' });
    });
  });
});
