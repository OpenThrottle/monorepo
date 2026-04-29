import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { NestjsSlackError } from '../config/nestjs-slack.error';
import type { NestjsSlackModuleOptions } from '../config/nestjs-slack.options';
import { NESTJS_SLACK_OPTIONS } from '../config/nestjs-slack.options';

/**
 * @description Minimal payload for Slack incoming webhooks. At least one of
 * text or blocks is required by Slack.
 * @see https://api.slack.com/messaging/webhooks
 */
export interface SlackWebhookPayload {
  readonly blocks?: readonly unknown[];
  readonly text?: string;
}

@Injectable()
export class NestjsSlackService {
  private readonly name = 'nestjs-slack';

  constructor(
    @Optional()
    @Inject(NESTJS_SLACK_OPTIONS)
    private readonly options: NestjsSlackModuleOptions | null,
    private readonly logger: LoggerService,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description Sends a message to the configured Slack channel via the incoming webhook URL (native fetch, no extra deps).
   * @throws NestjsSlackError if module was not configured with forRoot(options), or if the webhook request fails.
   */
  async send(payload: SlackWebhookPayload): Promise<void> {
    if (this.options === null || this.options === undefined) {
      const message = `cannot send: module not configured. Use NestjsSlackModule.forRoot({ webhookUrl }) so the service has a webhook URL.`;

      throw new NestjsSlackError(message);
    }

    const body = JSON.stringify(payload);
    const res = await fetch(this.options.webhookUrl, {
      body,
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (!res.ok) {
      const snippet = (await res.text()).slice(0, 200);
      const message = `webhook request failed: ${res.status} ${res.statusText}. ${snippet}`;

      throw new NestjsSlackError(message);
    }
  }
}
