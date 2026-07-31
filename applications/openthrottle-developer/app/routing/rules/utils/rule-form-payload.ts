/**
 * @description Pure payload-string helpers for the rules form. Hoisted out of
 * RuleForm per component-primitive-shape R4 so they are discoverable and
 * independently testable.
 */

/** Reads a single string/list field out of an action-payload JSON string; '' when absent or unparsable. */
export const parsePayloadField = (json: string, field: string): string => {
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) return '';
    const record: Record<string, unknown> = { ...parsed };
    const value = record[field];
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(', ');
    return '';
  } catch {
    return '';
  }
};

/** Splits a comma-separated list into trimmed, non-empty entries. */
export const splitList = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
