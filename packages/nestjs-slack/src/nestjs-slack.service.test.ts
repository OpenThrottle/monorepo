import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { NestjsSlackError } from './nestjs-slack.error';
import { NESTJS_SLACK_OPTIONS } from './nestjs-slack.options';
import { NestjsSlackService } from './nestjs-slack.service';

describe('NestjsSlackService', () => {
  describe('when options are not provided', () => {
    let service: NestjsSlackService;

    beforeAll(async () => {
      const app = await Test.createTestingModule({
        providers: [
          NestjsSlackService,
          { provide: LoggerService, useValue: createMock<LoggerService>() },
        ],
      }).compile();

      service = app.get<NestjsSlackService>(NestjsSlackService);
    });

    it('send() throws NestjsSlackError', async () => {
      await expect(service.send({ text: 'hi' })).rejects.toThrow(NestjsSlackError);
    });

    it('send() throws a clear error', async () => {
      await expect(service.send({ text: 'hi' })).rejects.toThrow(
        /cannot send: module not configured/,
      );
    });
  });

  describe('when options are provided', () => {
    const webhookUrl = 'https://hooks.slack.com/services/T00/B00/xxx';

    it('send() POSTs payload to webhook URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      const app = await Test.createTestingModule({
        providers: [
          NestjsSlackService,
          { provide: LoggerService, useValue: createMock<LoggerService>() },
          { provide: NESTJS_SLACK_OPTIONS, useValue: { webhookUrl } },
        ],
      }).compile();

      const service = app.get<NestjsSlackService>(NestjsSlackService);
      await service.send({ text: 'Hello' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(webhookUrl, {
        body: '{"text":"Hello"}',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      vi.unstubAllGlobals();
    });

    it('send() throws when response is not ok', async () => {
      vi.stubGlobal('fetch', () =>
        Promise.resolve({ ok: false, status: 400, statusText: 'Bad Request', text: () => Promise.resolve('invalid_payload') }),
      );

      const app = await Test.createTestingModule({
        providers: [
          NestjsSlackService,
          { provide: LoggerService, useValue: createMock<LoggerService>() },
          { provide: NESTJS_SLACK_OPTIONS, useValue: { webhookUrl } },
        ],
      }).compile();

      const service = app.get<NestjsSlackService>(NestjsSlackService);

      await expect(service.send({ text: 'x' })).rejects.toThrow(
        /webhook request failed: 400 Bad Request/,
      );

      vi.unstubAllGlobals();
    });
  });
});
