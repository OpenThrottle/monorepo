import { NestjsSlackError } from './nestjs-slack.error';

/**
 * Injection token for NestjsSlackModuleOptions. Use when registering the module with forRoot() so the service can send to Slack.
 */
export const NESTJS_SLACK_OPTIONS = 'NESTJS_SLACK_OPTIONS' as const;

/**
 * @description Options for NestjsSlackModule. Only required keys; no optional config that could hide misconfiguration.
 */
export interface NestjsSlackModuleOptions {
  readonly webhookUrl: string;
}

/**
 * @description Validates options at module init. Throws immediately if webhookUrl is missing or invalid (fail-fast).
 * @throws NestjsSlackError when options are null/undefined, webhookUrl is missing, or webhookUrl is not a valid URL.
 */
export function validateNestjsSlackOptions(
  options: unknown,
): asserts options is NestjsSlackModuleOptions {
  if (options === null || options === undefined) {
    const message =
      'options are required. Pass NestjsSlackModuleOptions (e.g. { webhookUrl }) to forRoot().';

    throw new NestjsSlackError(message);
  }

  // FIXME: Swap out eventually
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const opts = options as Record<string, unknown>;
  const webhookUrl = opts.webhookUrl;
  if (typeof webhookUrl !== 'string' || webhookUrl.trim() === '') {
    const message =
      'webhookUrl is required and must be a non-empty string. Pass it in NestjsSlackModuleOptions.';

    throw new NestjsSlackError(message);
  }

  try {
    const url = new URL(webhookUrl);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      const message = `webhookUrl must use http or https. Got: ${url.protocol}`;

      throw new NestjsSlackError(message);
    }
  } catch (err) {
    if (err instanceof TypeError && err.message?.includes('Invalid URL')) {
      const value = String(webhookUrl).slice(0, 80);
      const message = `webhookUrl is not a valid URL. Got: ${value}`;

      throw new NestjsSlackError(message);
    }

    if (err instanceof Error) {
      throw err;
    }

    throw new NestjsSlackError(`invalid webhookUrl. ${String(err)}`);
  }
}
