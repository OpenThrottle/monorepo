import type { NestExpressApplication } from '@nestjs/platform-express';

import { WEBHOOK_INGRESS_PATH } from '../modules/agent-job-webhooks/agent-job-webhooks.constants.ts';
import { readWebhookRawBody } from '../modules/agent-job-webhooks/raw-body/raw-body.utils.ts';

/**
 * @description Registers the HTTP body parsers, in order. Call it before `app.init()`/`listen()`
 * on an app created with `rawBody: true` (Stripe signature verification reads `req.rawBody`).
 *
 * 1. The webhook ingress route reads its own bytes ({@link readWebhookRawBody}). It must come first:
 *    once it has consumed the stream, the JSON parser below skips the request, so a malformed or
 *    oversized body reaches the ingress pipeline and gets a delivery row.
 * 2. Browsers deliver CSP violation reports with non-JSON content types the default body parser
 *    skips: `application/csp-report` (legacy report-uri) and `application/reports+json` (Reports
 *    API). Parse both as JSON so the public /csp-reports endpoint receives a body.
 *
 *    `application/json` must stay in this list: registering any custom json parser makes Nest skip
 *    its default one (both are named `jsonParser`, and registerParserMiddleware dedupes by
 *    middleware function name), so this parser becomes the ONLY json parser — omitting
 *    `application/json` leaves /graphql POST bodies unparsed and Apollo rejects them with 400.
 *
 *    `limit` replaces body-parser's 100 KB default, which answered 413 to any `recordTokenUsage`
 *    batch over ~80 rows although the mutation accepts 500 (~1.2 KB each). 1 MB fits that with
 *    headroom and matches a typical proxy's own cap; the hooks still send far smaller batches.
 */
export const configureBodyParsers = (app: NestExpressApplication): void => {
  app.use(WEBHOOK_INGRESS_PATH, readWebhookRawBody);

  app.useBodyParser('json', {
    limit: '1mb',
    type: [
      'application/csp-report',
      'application/json',
      'application/reports+json',
    ],
  });
};
