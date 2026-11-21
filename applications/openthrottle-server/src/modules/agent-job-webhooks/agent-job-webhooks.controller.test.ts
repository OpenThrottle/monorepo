import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, it, vi } from 'vitest';

import { AgentJobWebhooksController } from './agent-job-webhooks.controller.ts';
import type { AgentJobWebhooksService } from './agent-job-webhooks.service.ts';
import type { WebhookIngressResponse } from './agent-job-webhooks.types.ts';

describe('AgentJobWebhooksController', () => {
  const build = (
    answer: WebhookIngressResponse = {
      body: { runId: 'run-1', status: 'accepted' },
      httpStatus: 202,
    },
  ) => {
    const handle = vi.fn().mockResolvedValue(answer);
    const service = createMock<AgentJobWebhooksService>({ handle });
    const res = { status: vi.fn() };

    return { controller: new AgentJobWebhooksController(service), handle, res };
  };

  it('hands the token, headers (Node lowercases them; array values collapse to the first), content type and raw bytes to the service', async () => {
    const { controller, handle, res } = build();
    const rawBody = Buffer.from('{}');

    await controller.receive(
      'tok',
      {
        'content-type': 'application/json',
        'x-ot-signature': ['abc', 'ignored'],
      },
      { rawBody },
      res,
    );

    expect(handle).toHaveBeenCalledWith({
      contentType: 'application/json',
      headers: { 'content-type': 'application/json', 'x-ot-signature': 'abc' },
      rawBody,
      token: 'tok',
    });
  });

  it('sets the answer status and returns its body', async () => {
    const { controller, res } = build({
      body: { status: 'not_found' },
      httpStatus: 404,
    });

    const body = await controller.receive('tok', {}, {}, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(body).toStrictEqual({ status: 'not_found' });
  });

  it('passes an absent raw body through as undefined', async () => {
    const { controller, handle, res } = build();

    await controller.receive('tok', {}, {}, res);

    expect(handle).toHaveBeenCalledWith(
      expect.objectContaining({ rawBody: undefined }),
    );
  });
});
