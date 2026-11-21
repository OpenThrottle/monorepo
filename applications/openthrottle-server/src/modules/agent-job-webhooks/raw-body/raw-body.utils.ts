import type { IncomingMessage } from 'node:http';

import {
  WEBHOOK_MAX_BODY_BYTES,
  WEBHOOK_MAX_DRAIN_BYTES,
} from '../agent-job-webhooks.constants.ts';

/** The request as this middleware sees it: Node's message plus the slot Nest's `rawBody` uses. */
interface RequestWithRawBodySlot extends IncomingMessage {
  rawBody?: Buffer;
}

/**
 * @description Express middleware for `POST /webhooks/agent-jobs/:token`, mounted ahead of the
 * app-wide JSON parser. It reads the body itself, never parses it, and stores the bytes on
 * `req.rawBody`, so the ingress pipeline sees every request: a body that is not JSON is recorded as
 * `invalid_json` after the signature check, and one over {@link WEBHOOK_MAX_BODY_BYTES} as
 * `payload_too_large`, instead of the generic parser answering 400/413 before any delivery row is
 * written.
 *
 * Only the first `WEBHOOK_MAX_BODY_BYTES + 1` bytes are kept, which is enough for the pipeline to
 * see the body is too large; the rest is read and discarded so the stream ends and the later
 * parsers skip the request (body-parser leaves a finished request alone). A body past
 * {@link WEBHOOK_MAX_DRAIN_BYTES} is not worth draining: the connection is dropped and nothing is
 * recorded.
 */
export const readWebhookRawBody = (
  req: RequestWithRawBodySlot,
  _res: unknown,
  next: (error?: unknown) => void,
): void => {
  if (req.method !== 'POST') {
    next();

    return;
  }

  const chunks: Buffer[] = [];
  let kept = 0;
  let seen = 0;

  req.on('data', (chunk: unknown) => {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    seen += bytes.length;

    if (seen > WEBHOOK_MAX_DRAIN_BYTES) {
      req.destroy();

      return;
    }

    const room = WEBHOOK_MAX_BODY_BYTES + 1 - kept;
    if (room > 0) {
      const slice = bytes.subarray(0, room);
      chunks.push(slice);
      kept += slice.length;
    }
  });

  req.once('end', () => {
    req.rawBody = Buffer.concat(chunks);
    next();
  });

  req.once('error', (error: unknown) => {
    next(error);
  });
};
