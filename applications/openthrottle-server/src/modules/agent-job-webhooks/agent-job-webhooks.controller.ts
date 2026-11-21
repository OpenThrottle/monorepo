import { Controller, Headers, Param, Post, Req, Res } from '@nestjs/common';
import { Public } from '@openthrottle/nestjs-auth';

import { AgentJobWebhooksService } from './agent-job-webhooks.service.ts';
import type { WebhookIngressResponseBody } from './agent-job-webhooks.types.ts';

/** The slice of the Express response the controller sets the status on. */
interface StatusSettableResponse {
  status(code: number): unknown;
}

/** Request carrying the raw bytes the sender signed (Nest `rawBody: true`). */
interface RequestWithRawBody {
  readonly rawBody?: Buffer;
}

/**
 * @description Public ingress for webhook-triggered scheduled agent jobs:
 * `POST /webhooks/agent-jobs/:token`. Public by design: senders carry no OpenThrottle session, and
 * authenticity comes from the URL token plus an HMAC over the raw bytes. A thin HTTP adapter: it
 * unpacks the request and hands it to {@link AgentJobWebhooksService}, which owns the pipeline.
 */
@Public()
@Controller('webhooks/agent-jobs')
export class AgentJobWebhooksController {
  constructor(private readonly service: AgentJobWebhooksService) {}

  @Post(':token')
  async receive(
    @Param('token') token: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: RequestWithRawBody,
    @Res({ passthrough: true }) res: StatusSettableResponse,
  ): Promise<WebhookIngressResponseBody> {
    const answer = await this.service.handle({
      contentType: firstHeader(headers['content-type']),
      headers: flattenHeaders(headers),
      rawBody: req.rawBody,
      token,
    });

    res.status(answer.httpStatus);

    return answer.body;
  }
}

const firstHeader = (
  value: string | string[] | undefined,
): string | undefined => {
  return Array.isArray(value) ? value[0] : value;
};

const flattenHeaders = (
  headers: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> => {
  const flat: Record<string, string | undefined> = {};

  for (const [name, value] of Object.entries(headers)) {
    flat[name.toLowerCase()] = firstHeader(value);
  }

  return flat;
};
