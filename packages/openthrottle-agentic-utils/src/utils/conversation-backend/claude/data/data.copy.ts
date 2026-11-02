/**
 * User-facing copy for the Claude auth-status report. Single-sourced so the
 * parser, its tests and any UI read the same wording.
 */

/**
 * Shown when no credential at all (no login, no API key) is available.
 */
export const CLAUDE_NOT_LOGGED_IN_WARNING =
  'Claude is not logged in and no API key is set. Run `claude auth login` (or set ANTHROPIC_API_KEY) before starting a Claude run.';

/**
 * Shown when an API key would override a logged-in subscription.
 *
 * @param subscriptionType - The reported plan, e.g. `team`; null when unknown.
 * @param keySource - Where the key comes from, e.g. `ANTHROPIC_API_KEY`.
 */
export function claudeApiKeyOverrideWarning(
  subscriptionType: string | null,
  keySource: string,
): string {
  const typedPlan = `${subscriptionType} subscription`;
  const plan = subscriptionType === null ? 'subscription' : typedPlan;
  return `${keySource} is set, so Claude runs bill the API key, not your ${plan}. Unset it to use the subscription.`;
}
