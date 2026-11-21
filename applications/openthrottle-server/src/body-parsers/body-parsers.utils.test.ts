import type { AddressInfo } from 'node:net';

import { Controller, Module, Post, Req } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  WEBHOOK_MAX_BODY_BYTES,
  WEBHOOK_MAX_DRAIN_BYTES,
} from '../modules/agent-job-webhooks/agent-job-webhooks.constants.ts';
import { configureBodyParsers } from './body-parsers.utils.ts';

interface EchoRequest {
  readonly body?: unknown;
  readonly rawBody?: Buffer;
}

interface Echo {
  readonly body: unknown;
  readonly rawLength: number | null;
}

const echo = (req: EchoRequest): Echo => {
  return { body: req.body ?? null, rawLength: req.rawBody?.length ?? null };
};

@Controller()
class EchoController {
  @Post('webhooks/agent-jobs/:token')
  webhook(@Req() req: EchoRequest): Echo {
    return echo(req);
  }

  @Post('graphql')
  graphql(@Req() req: EchoRequest): Echo {
    return echo(req);
  }

  @Post('csp-reports')
  csp(@Req() req: EchoRequest): Echo {
    return echo(req);
  }
}

@Module({ controllers: [EchoController] })
class EchoModule {}

describe('configureBodyParsers', () => {
  let app: NestExpressApplication;
  let baseUrl = '';

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(EchoModule, {
      logger: false,
      rawBody: true,
    });
    configureBodyParsers(app);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address();
    if (address === null || typeof address === 'string') {
      throw new Error('expected a TCP address');
    }
    const { port }: AddressInfo = address;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  const post = async (
    path: string,
    body: string,
    contentType = 'application/json',
  ): Promise<{ readonly json: unknown; readonly status: number }> => {
    const response = await fetch(`${baseUrl}${path}`, {
      body,
      headers: { 'content-type': contentType },
      method: 'POST',
    });

    return { json: await response.json(), status: response.status };
  };

  describe('the webhook ingress route', () => {
    it('hands a malformed JSON body through as raw bytes, unparsed', async () => {
      const result = await post('/webhooks/agent-jobs/tok', '{nope');

      expect(result).toStrictEqual({
        json: { body: null, rawLength: 5 },
        status: 201,
      });
    });

    it('hands an over-cap body through, kept to one byte past the cap', async () => {
      const result = await post(
        '/webhooks/agent-jobs/tok',
        `"${'a'.repeat(WEBHOOK_MAX_BODY_BYTES * 2)}"`,
      );

      expect(result).toStrictEqual({
        json: { body: null, rawLength: WEBHOOK_MAX_BODY_BYTES + 1 },
        status: 201,
      });
    });

    it('drops the connection for a body past the drain ceiling', async () => {
      await expect(
        post(
          '/webhooks/agent-jobs/tok',
          'a'.repeat(WEBHOOK_MAX_DRAIN_BYTES + 1),
        ),
      ).rejects.toThrow();
    });

    it('keeps a valid body byte for byte without parsing it', async () => {
      const result = await post('/webhooks/agent-jobs/tok', '{"a":1}');

      expect(result).toStrictEqual({
        json: { body: null, rawLength: 7 },
        status: 201,
      });
    });
  });

  describe('every other route', () => {
    it('still parses JSON and keeps rawBody (graphql, Stripe)', async () => {
      const result = await post('/graphql', '{"query":"{ x }"}');

      expect(result).toStrictEqual({
        json: { body: { query: '{ x }' }, rawLength: 17 },
        status: 201,
      });
    });

    it('still parses CSP report content types', async () => {
      const result = await post(
        '/csp-reports',
        '{"csp-report":{}}',
        'application/csp-report',
      );

      expect(result.json).toMatchObject({ body: { 'csp-report': {} } });
    });

    it('still rejects malformed JSON with the generic 400', async () => {
      const result = await post('/graphql', '{nope');

      expect(result.status).toBe(400);
    });
  });
});
