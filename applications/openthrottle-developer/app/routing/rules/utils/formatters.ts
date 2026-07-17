/**
 * Formatters for the rules routing area — simple, testable pure functions.
 */

export const formatRulesDate = (date: string): string => {
  return new Date(date).toLocaleString();
};

const countList = (value: unknown): number =>
  Array.isArray(value) ? value.length : 0;

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

/**
 * Builds a concise, human-readable one-line summary of a rule's action payload
 * for the rules table, so each row communicates the effect at a glance without
 * expanding the raw JSON. Falls back gracefully when the payload can't be
 * parsed.
 */
export const summarizeRuleAction = (
  actionType: string,
  actionPayloadJson: string,
): string => {
  let payload: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(actionPayloadJson);
    if (typeof parsed === 'object' && parsed !== null) {
      payload = { ...parsed };
    }
  } catch {
    return 'unparseable payload';
  }

  if (actionType === 'inject-task') {
    const skillSlug = asString(payload.skillSlug) || '(no skill)';
    const placement = asString(payload.placement) || 'first';
    return `${skillSlug} · ${placement}`;
  }

  if (actionType === 'availability-exception') {
    const allow = countList(payload.tagAllow) + countList(payload.slugAllow);
    const deny = countList(payload.tagDeny) + countList(payload.slugDeny);
    return `allow ${allow} · deny ${deny}`;
  }

  return actionType;
};
