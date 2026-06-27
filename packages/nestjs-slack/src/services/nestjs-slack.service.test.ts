import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { NestjsSlackError } from '../config/nestjs-slack.error';
import { NESTJS_SLACK_OPTIONS } from '../config/nestjs-slack.options';
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
      await expect(service.send({ text: 'hi' })).rejects.toThrow(
        NestjsSlackError,
      );
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
        signal: expect.any(AbortSignal),
      });

      vi.unstubAllGlobals();
    });

    it('send() serializes a blocks-only payload into the request body', async () => {
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
      const blocks = [
        { text: { text: 'Hello', type: 'mrkdwn' }, type: 'section' },
      ];
      await service.send({ blocks });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(webhookUrl, {
        body: JSON.stringify({ blocks }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        signal: expect.any(AbortSignal),
      });

      vi.unstubAllGlobals();
    });

    it('send() throws when response is not ok and never retries a 4xx', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('invalid_payload'),
      });
      vi.stubGlobal('fetch', fetchMock);

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
      // 4xx is non-transient: exactly one attempt, no retries.
      expect(fetchMock).toHaveBeenCalledTimes(1);

      vi.unstubAllGlobals();
    });

    it('send() rethrows fetch timeout as NestjsSlackError', async () => {
      const timeoutError = new Error('The operation timed out.');
      timeoutError.name = 'TimeoutError';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError));

      const app = await Test.createTestingModule({
        providers: [
          NestjsSlackService,
          { provide: LoggerService, useValue: createMock<LoggerService>() },
          {
            provide: NESTJS_SLACK_OPTIONS,
            useValue: { maxRetries: 0, webhookUrl },
          },
        ],
      }).compile();

      const service = app.get<NestjsSlackService>(NestjsSlackService);

      await expect(service.send({ text: 'x' })).rejects.toThrow(
        NestjsSlackError,
      );
      await expect(service.send({ text: 'x' })).rejects.toThrow(
        /webhook request timed out after 5000ms/,
      );

      vi.unstubAllGlobals();
    });

    it('send() passes a configured timeoutMs through to the timeout error', async () => {
      const timeoutError = new Error('The operation timed out.');
      timeoutError.name = 'TimeoutError';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError));

      const app = await Test.createTestingModule({
        providers: [
          NestjsSlackService,
          { provide: LoggerService, useValue: createMock<LoggerService>() },
          {
            provide: NESTJS_SLACK_OPTIONS,
            useValue: { maxRetries: 0, timeoutMs: 1234, webhookUrl },
          },
        ],
      }).compile();

      const service = app.get<NestjsSlackService>(NestjsSlackService);

      await expect(service.send({ text: 'x' })).rejects.toThrow(
        /webhook request timed out after 1234ms/,
      );

      vi.unstubAllGlobals();
    });

    it('send() rethrows non-timeout fetch errors unchanged', async () => {
      const networkError = new Error('network down');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError));

      const app = await Test.createTestingModule({
        providers: [
          NestjsSlackService,
          { provide: LoggerService, useValue: createMock<LoggerService>() },
          {
            provide: NESTJS_SLACK_OPTIONS,
            useValue: { maxRetries: 0, webhookUrl },
          },
        ],
      }).compile();

      const service = app.get<NestjsSlackService>(NestjsSlackService);

      await expect(service.send({ text: 'x' })).rejects.toThrow(/network down/);

      vi.unstubAllGlobals();
    });
  });

  describe('retry / backoff on transient failures', () => {
    const webhookUrl = 'https://hooks.slack.com/services/T00/B00/xxx';

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    const buildService = async (
      options: Record<string, unknown>,
    ): Promise<NestjsSlackService> => {
      const app = await Test.createTestingModule({
        providers: [
          NestjsSlackService,
          { provide: LoggerService, useValue: createMock<LoggerService>() },
          {
            provide: NESTJS_SLACK_OPTIONS,
            useValue: { webhookUrl, ...options },
          },
        ],
      }).compile();

      return app.get<NestjsSlackService>(NestjsSlackService);
    };

    it('retries a 429 then succeeds on the second attempt', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          headers: { get: () => null },
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: () => Promise.resolve('rate_limited'),
        })
        .mockResolvedValueOnce({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      const service = await buildService({ retryBaseDelayMs: 10 });
      const sendPromise = service.send({ text: 'x' });

      await vi.runAllTimersAsync();
      await expect(sendPromise).resolves.toBeUndefined();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('honors the Retry-After header on a 429', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          headers: {
            get: (name: string) => (name === 'retry-after' ? '3' : null),
          },
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: () => Promise.resolve('rate_limited'),
        })
        .mockResolvedValueOnce({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      const service = await buildService({ retryBaseDelayMs: 10 });
      const sendPromise = service.send({ text: 'x' });

      // Less than Retry-After (3s): no retry yet.
      await vi.advanceTimersByTimeAsync(2000);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Past 3s: the retry fires.
      await vi.advanceTimersByTimeAsync(1500);
      await expect(sendPromise).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('retries a 5xx then succeeds', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          headers: { get: () => null },
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: () => Promise.resolve('unavailable'),
        })
        .mockResolvedValueOnce({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      const service = await buildService({ retryBaseDelayMs: 10 });
      const sendPromise = service.send({ text: 'x' });

      await vi.runAllTimersAsync();
      await expect(sendPromise).resolves.toBeUndefined();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('retries a network error then succeeds', async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      const service = await buildService({ retryBaseDelayMs: 10 });
      const sendPromise = service.send({ text: 'x' });

      await vi.runAllTimersAsync();
      await expect(sendPromise).resolves.toBeUndefined();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('exhausts retries on persistent 5xx and throws after maxRetries + 1 attempts', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        headers: { get: () => null },
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('boom'),
      });
      vi.stubGlobal('fetch', fetchMock);

      const service = await buildService({
        maxRetries: 2,
        retryBaseDelayMs: 10,
      });
      const sendPromise = service.send({ text: 'x' });
      const assertion = expect(sendPromise).rejects.toThrow(
        /webhook request failed: 500 Internal Server Error/,
      );

      await vi.runAllTimersAsync();
      await assertion;

      // initial attempt + 2 retries
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('retries a persistent network rejection (e.g. DNS failure / connection refused) and rethrows it unchanged after retries are exhausted', async () => {
      // A connection-level fetch rejection (DNS failure, ECONNREFUSED) is a
      // plain Error, not a TimeoutError. It is treated as transient and
      // retried; once attempts are exhausted the raw rejection propagates
      // unchanged (it is intentionally NOT wrapped in NestjsSlackError).
      const networkError = new Error('getaddrinfo ENOTFOUND hooks.slack.com');
      const fetchMock = vi.fn().mockRejectedValue(networkError);
      vi.stubGlobal('fetch', fetchMock);

      const service = await buildService({
        maxRetries: 2,
        retryBaseDelayMs: 10,
      });
      const sendPromise = service.send({ text: 'x' });
      const assertion = expect(sendPromise).rejects.toBe(networkError);

      await vi.runAllTimersAsync();
      await assertion;

      // The raw rejection is propagated unchanged, not wrapped.
      expect(networkError).not.toBeInstanceOf(NestjsSlackError);
      // initial attempt + 2 retries
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('does not retry when maxRetries is 0 (opt-out)', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        headers: { get: () => null },
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: () => Promise.resolve('rate_limited'),
      });
      vi.stubGlobal('fetch', fetchMock);

      const service = await buildService({ maxRetries: 0 });

      await expect(service.send({ text: 'x' })).rejects.toThrow(
        /webhook request failed: 429 Too Many Requests/,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
