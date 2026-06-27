import { LoggerService } from '@openthrottle/nestjs-modules';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { NestjsSlackError } from '../config/nestjs-slack.error';
import type { NestjsSlackModuleOptions } from '../config/nestjs-slack.options';
import {
  NESTJS_SLACK_DEFAULT_MAX_RETRIES,
  NESTJS_SLACK_DEFAULT_RETRY_BASE_DELAY_MS,
  NESTJS_SLACK_DEFAULT_TIMEOUT_MS,
  NESTJS_SLACK_OPTIONS,
} from '../config/nestjs-slack.options';

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
    // NOTE: options.webhookUrl is SECRET-EQUIVALENT (anyone with it can post
    // to the channel) and must NEVER be logged or embedded in error messages.
    @Optional()
    @Inject(NESTJS_SLACK_OPTIONS)
    private readonly options: NestjsSlackModuleOptions | null,
    private readonly logger: LoggerService,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description Sends a message to the configured Slack channel via the
   * incoming webhook URL (native fetch, no extra deps). Transient failures
   * (HTTP 429, 5xx, and network errors) are retried with bounded exponential
   * backoff; a 429 Retry-After header takes precedence over the backoff.
   * Non-transient failures (4xx other than 429, e.g. invalid_payload) throw
   * immediately without retrying. Retries are opt-out-able via maxRetries: 0.
   * @throws NestjsSlackError if module was not configured with forRoot(options), or if the webhook request fails after all retries are exhausted.
   */
  async send(payload: SlackWebhookPayload): Promise<void> {
    if (this.options === null || this.options === undefined) {
      const message = `cannot send: module not configured. Use NestjsSlackModule.forRoot({ webhookUrl }) so the service has a webhook URL.`;

      throw new NestjsSlackError(message);
    }

    const body = JSON.stringify(payload);
    const timeoutMs = this.options.timeoutMs ?? NESTJS_SLACK_DEFAULT_TIMEOUT_MS;
    const maxRetries =
      this.options.maxRetries ?? NESTJS_SLACK_DEFAULT_MAX_RETRIES;
    const baseDelayMs =
      this.options.retryBaseDelayMs ?? NESTJS_SLACK_DEFAULT_RETRY_BASE_DELAY_MS;

    // attempt 0 is the initial request; attempts 1..maxRetries are retries.
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const isLastAttempt = attempt === maxRetries;

      let res: Response;
      try {
        // eslint-disable-next-line no-await-in-loop -- attempts are intentionally sequential (retry with backoff)
        res = await fetch(this.options.webhookUrl, {
          body,
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        if (this.isTimeoutError(err)) {
          // A timeout is transient: retry it unless we're out of attempts.
          if (isLastAttempt) {
            const message = `webhook request timed out after ${timeoutMs}ms.`;

            throw new NestjsSlackError(message);
          }

          // eslint-disable-next-line no-await-in-loop -- backoff between attempts is intentionally sequential
          await this.delay(this.backoffDelayMs(attempt, baseDelayMs));
          continue;
        }

        // Other fetch rejections are network errors: also transient.
        if (isLastAttempt) {
          throw err;
        }

        // eslint-disable-next-line no-await-in-loop -- backoff between attempts is intentionally sequential
        await this.delay(this.backoffDelayMs(attempt, baseDelayMs));
        continue;
      }

      if (res.ok) {
        return;
      }

      // Non-transient (4xx other than 429): never retry, fail immediately.
      if (!this.isTransientStatus(res.status)) {
        // eslint-disable-next-line no-await-in-loop -- single terminal throw, reads the body once
        await this.throwResponseError(res);
      }

      // Transient (429 / 5xx): retry with backoff unless out of attempts.
      if (isLastAttempt) {
        // eslint-disable-next-line no-await-in-loop -- single terminal throw, reads the body once
        await this.throwResponseError(res);
      }

      const retryAfterMs = this.retryAfterMs(res);
      const delayMs = retryAfterMs ?? this.backoffDelayMs(attempt, baseDelayMs);
      // eslint-disable-next-line no-await-in-loop -- backoff between attempts is intentionally sequential
      await this.delay(delayMs);
    }
  }

  /**
   * @description Throws a NestjsSlackError describing a non-2xx webhook
   * response. The body snippet is bounded to 200 chars and is UNTRUSTED
   * remote text: webhookUrl is operator-supplied and may point anywhere, so
   * the body could be arbitrary content from a non-Slack host. It is labelled
   * accordingly and the response body never contains the secret webhookUrl
   * itself, so embedding the snippet cannot leak it. Callers should treat the
   * portion after the `untrusted body:` marker as such (e.g. when logging).
   */
  private async throwResponseError(res: Response): Promise<never> {
    const snippet = (await res.text()).slice(0, 200);
    const message = `webhook request failed: ${res.status} ${res.statusText}. untrusted body: ${snippet}`;

    throw new NestjsSlackError(message);
  }

  /**
   * @description True for HTTP statuses Slack may return transiently and that
   * are safe to retry: 429 (rate limited) and any 5xx server error.
   */
  private isTransientStatus(status: number): boolean {
    return status === 429 || (status >= 500 && status <= 599);
  }

  /**
   * @description Parses the Retry-After header (delay-seconds form) into
   * milliseconds, returning null when the header is absent or unparseable.
   * Slack sends Retry-After as an integer number of seconds on 429s.
   */
  private retryAfterMs(res: Response): number | null {
    const header = res.headers?.get?.('retry-after');
    if (header === null || header === undefined) {
      return null;
    }

    const seconds = Number.parseInt(header.trim(), 10);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return null;
    }

    return seconds * 1000;
  }

  /**
   * @description Exponential backoff for a given zero-based attempt index:
   * base * 2^attempt.
   */
  private backoffDelayMs(attempt: number, baseDelayMs: number): number {
    return baseDelayMs * 2 ** attempt;
  }

  /**
   * @description Resolves after the given number of milliseconds.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * @description Detects an AbortSignal.timeout() rejection. Native fetch
   * rejects with a DOMException/Error named 'TimeoutError' when the signal
   * fires. No body is inspected so nothing sensitive is leaked.
   */
  private isTimeoutError(err: unknown): boolean {
    return err instanceof Error && err.name === 'TimeoutError';
  }
}
