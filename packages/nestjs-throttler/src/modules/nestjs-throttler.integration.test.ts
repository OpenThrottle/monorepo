import type { AddressInfo } from 'node:net';
import { Controller, Get, type INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { NestjsThrottlerModule } from './nestjs-throttler.module';

/**
 * Integration coverage for the wired global {@link NestjsThrottlerModule}.
 *
 * These tests boot a real NestJS application (default Express adapter) so the
 * `APP_GUARD` binding actually runs the `ThrottlerGuard` on every request —
 * behaviour that the unit-level module-compilation tests cannot exercise.
 *
 * The guard's default `getTracker` returns `req.ip`, so the client key is
 * derived from Express's IP resolution. Whether `X-Forwarded-For` is honoured
 * is therefore governed entirely by the app's `trust proxy` setting, which the
 * IP-derivation tests below pin down (the core IP-spoofing concern).
 */

@Controller()
class PingController {
  @Get('ping')
  ping(): { ok: true } {
    return { ok: true };
  }
}

const LIMIT = 3;
const TTL_MS = 60_000;

@Module({
  controllers: [PingController],
  imports: [
    NestjsThrottlerModule.forRoot({
      throttlers: [{ limit: LIMIT, ttl: TTL_MS }],
    }),
  ],
})
class PingModule {}

interface BootedApp {
  readonly app: INestApplication;
  readonly url: string;
}

const bootApp = async (trustProxy: boolean): Promise<BootedApp> => {
  const moduleRef = await Test.createTestingModule({
    imports: [PingModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  if (trustProxy) {
    // Honour X-Forwarded-For: req.ip becomes the left-most forwarded address.
    const express: { set(key: string, value: unknown): void } = app
      .getHttpAdapter()
      .getInstance();
    express.set('trust proxy', true);
  }

  await app.listen(0);

  const address: string | AddressInfo | null = app.getHttpServer().address();

  if (address === null || typeof address === 'string') {
    throw new Error('Expected the throttler test server to bind a TCP port.');
  }

  return { app, url: `http://127.0.0.1:${address.port}` };
};

const getPing = async (url: string, forwardedFor?: string): Promise<number> => {
  const headers: Record<string, string> =
    forwardedFor === undefined ? {} : { 'X-Forwarded-For': forwardedFor };

  const response = await fetch(`${url}/ping`, { headers });

  // Drain the body so the socket can be reused / closed cleanly.
  await response.text();

  return response.status;
};

describe('NestjsThrottlerModule (HTTP integration)', () => {
  let booted: BootedApp | undefined;

  afterEach(async () => {
    if (booted !== undefined) {
      await booted.app.close();
      booted = undefined;
    }
  });

  it('allows requests up to the limit, then returns 429', async () => {
    booted = await bootApp(false);

    // Send well past the limit so a 429 is guaranteed regardless of how many
    // hits the guard records per request.
    const statuses: number[] = [];
    for (let i = 0; i < LIMIT * 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      statuses.push(await getPing(booted.url));
    }

    // The window opens allowing traffic, then closes.
    expect(statuses[0]).toBe(200);
    expect(statuses).toContain(429);

    // Once throttling kicks in it stays throttled within the window: every
    // status after the first 429 is also 429 (no gaps back to 200).
    const firstThrottled = statuses.indexOf(429);
    expect(statuses.slice(0, firstThrottled)).toEqual(
      Array.from({ length: firstThrottled }, () => 200),
    );
    expect(statuses.slice(firstThrottled)).toEqual(
      Array.from({ length: statuses.length - firstThrottled }, () => 429),
    );
  });

  it('sets a Retry-After header on the throttled response', async () => {
    booted = await bootApp(false);

    let throttled: Response | undefined;

    for (let i = 0; i < LIMIT + 1; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(`${booted.url}/ping`);
      // eslint-disable-next-line no-await-in-loop
      await response.text();

      if (response.status === 429) {
        throttled = response;
      }
    }

    expect(throttled).toBeDefined();
    expect(throttled?.headers.get('retry-after')).not.toBeNull();
  });

  describe('client-key / IP derivation (X-Forwarded-For / trust proxy)', () => {
    it('with trust proxy enabled, distinct X-Forwarded-For clients get independent buckets', async () => {
      booted = await bootApp(true);

      // Client A exhausts its own bucket.
      const clientA: number[] = [];
      for (let i = 0; i < LIMIT * 4; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        clientA.push(await getPing(booted.url, '203.0.113.1'));
      }
      expect(clientA).toContain(429);

      // A different forwarded client is NOT affected — separate tracker key.
      const clientB = await getPing(booted.url, '203.0.113.2');
      expect(clientB).toBe(200);
    });

    it('without trust proxy, X-Forwarded-For is ignored so spoofed clients share one bucket', async () => {
      booted = await bootApp(false);

      const statuses: number[] = [];

      // Every request spoofs a different X-Forwarded-For, but because the app
      // does not trust the proxy header the tracker falls back to the socket
      // IP — so all of these requests share a single bucket and still get
      // throttled. This is the core anti-spoofing guarantee.
      for (let i = 0; i < LIMIT * 4; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        statuses.push(await getPing(booted.url, `198.51.100.${i + 1}`));
      }

      expect(statuses).toContain(429);
    });
  });
});
