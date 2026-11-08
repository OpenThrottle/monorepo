/**
 * @description Minimal payload for Slack incoming webhooks. At least one of
 * text or blocks is required by Slack.
 * @see https://api.slack.com/messaging/webhooks
 */
export interface SlackWebhookPayload {
  readonly blocks?: readonly unknown[];
  readonly text?: string;
}
