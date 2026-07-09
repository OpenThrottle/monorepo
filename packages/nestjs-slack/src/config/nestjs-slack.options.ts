import { NestjsSlackError } from './nestjs-slack.error';

/**
 * Injection token for NestjsSlackModuleOptions. Use when registering the module with forRoot() so the service can send to Slack.
 */
export const NESTJS_SLACK_OPTIONS = 'NESTJS_SLACK_OPTIONS' as const;

/**
 * @description Default request timeout (ms) applied to the Slack webhook
 * request when timeoutMs is not configured. Keeps send() from hanging
 * indefinitely if Slack stalls.
 */
export const NESTJS_SLACK_DEFAULT_TIMEOUT_MS = 5000 as const;

/**
 * @description Default number of retry attempts on transient failures
 * (HTTP 429, 5xx, network errors) when maxRetries is not configured.
 * This is in addition to the initial attempt, so the total request count
 * is maxRetries + 1.
 */
export const NESTJS_SLACK_DEFAULT_MAX_RETRIES = 2 as const;

/**
 * @description Base delay (ms) for exponential backoff between retry
 * attempts when retryBaseDelayMs is not configured. Attempt n waits
 * roughly base * 2^(n-1) before retrying (unless a Retry-After header
 * overrides it on a 429).
 */
export const NESTJS_SLACK_DEFAULT_RETRY_BASE_DELAY_MS = 500 as const;

/**
 * @description Hostnames for which a cleartext `http:` webhookUrl is
 * permitted. Outside these loopback hosts, `http:` is rejected so message
 * contents are never sent in cleartext over a network. Lowercased for
 * case-insensitive comparison.
 */
export const NESTJS_SLACK_HTTP_ALLOWED_HOSTS = [
  '127.0.0.1',
  '::1',
  'localhost',
] as const;

/**
 * @description Decides whether `host` is matched by `pattern`. Supports an
 * exact match and a single leading `*.` wildcard (e.g. `*.slack.com` matches
 * `hooks.slack.com` but not the apex `slack.com`). All comparisons are
 * case-insensitive.
 */
function hostMatchesPattern(host: string, pattern: string): boolean {
  const normalizedHost = host.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();

  if (normalizedPattern.startsWith('*.')) {
    const suffix = normalizedPattern.slice(1); // keep leading dot: '.slack.com'

    return normalizedHost.endsWith(suffix);
  }

  return normalizedHost === normalizedPattern;
}

/**
 * @description Options for NestjsSlackModule. Only required keys plus an
 * optional host allowlist; no optional config that could hide misconfiguration.
 */
export interface NestjsSlackModuleOptions {
  /**
   * @description Optional allowlist of hostnames the webhookUrl may target.
   * When provided, validation rejects any webhookUrl whose host is not matched
   * (exact match, or a single leading `*.` wildcard such as `*.slack.com`).
   * This is the SSRF safety gate: set it (e.g. `['hooks.slack.com']`) whenever
   * webhookUrl can be influenced by semi-trusted config/env so it cannot be
   * repointed at internal services. When omitted, any host is permitted and
   * webhookUrl is treated as fully operator-trusted.
   */
  readonly allowedHosts?: readonly string[];
  /**
   * @description Optional number of retry attempts on transient failures
   * (HTTP 429, 5xx, network errors), in addition to the initial attempt.
   * Defaults to NESTJS_SLACK_DEFAULT_MAX_RETRIES (2) when omitted. Set to 0
   * to opt out of retries entirely. Non-transient failures (4xx other than
   * 429, e.g. invalid_payload) are never retried.
   */
  readonly maxRetries?: number;
  /**
   * @description Optional base delay in milliseconds for exponential backoff
   * between retry attempts. Defaults to
   * NESTJS_SLACK_DEFAULT_RETRY_BASE_DELAY_MS (500ms) when omitted. A 429
   * response's Retry-After header takes precedence over this backoff.
   */
  readonly retryBaseDelayMs?: number;
  /**
   * @description Optional per-request timeout in milliseconds for the webhook
   * request. Defaults to NESTJS_SLACK_DEFAULT_TIMEOUT_MS (5000ms) when omitted.
   */
  readonly timeoutMs?: number;
  /**
   * @description Slack incoming-webhook URL. SECRET-EQUIVALENT: the URL itself
   * is the credential — anyone holding it can post to the channel. It must
   * NEVER be logged, included in error messages, or otherwise surfaced in
   * diagnostics, even partially. Treat it like a password/token.
   */
  readonly webhookUrl: string;
}

/**
 * @description Validates options at module init. Throws immediately if webhookUrl is missing or invalid (fail-fast).
 * @throws NestjsSlackError when options are null/undefined, webhookUrl is missing, webhookUrl is not a valid URL,
 * webhookUrl uses cleartext `http:` against a non-loopback host, or allowedHosts is set and the host is not matched.
 */
export function validateNestjsSlackOptions(
  options: unknown,
): asserts options is NestjsSlackModuleOptions {
  if (
    options === null ||
    options === undefined ||
    typeof options !== 'object'
  ) {
    const message =
      'options are required. Pass NestjsSlackModuleOptions (e.g. { webhookUrl }) to forRoot().';

    throw new NestjsSlackError(message);
  }

  const opts: Record<string, unknown> = { ...options };
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

    const host = url.hostname.toLowerCase();
    const isLoopbackHost = NESTJS_SLACK_HTTP_ALLOWED_HOSTS.some(
      (loopback) => loopback === host,
    );

    if (url.protocol === 'http:' && !isLoopbackHost) {
      const message = `webhookUrl must use https for non-loopback hosts; cleartext http is only allowed for ${NESTJS_SLACK_HTTP_ALLOWED_HOSTS.join(
        ', ',
      )}. Got: ${host}`;

      throw new NestjsSlackError(message);
    }

    const allowedHosts = opts.allowedHosts;

    if (Array.isArray(allowedHosts) && allowedHosts.length > 0) {
      const matched = allowedHosts.some(
        (pattern) =>
          typeof pattern === 'string' && hostMatchesPattern(host, pattern),
      );

      if (!matched) {
        const message = `webhookUrl host is not allowed. Got: ${host}. Allowed: ${allowedHosts.join(
          ', ',
        )}`;

        throw new NestjsSlackError(message);
      }
    }
  } catch (error) {
    if (error instanceof TypeError && error.message?.includes('Invalid URL')) {
      const value = String(webhookUrl).slice(0, 80);
      const message = `webhookUrl is not a valid URL. Got: ${value}`;

      throw new NestjsSlackError(message);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new NestjsSlackError(`invalid webhookUrl. ${String(error)}`);
  }
}
