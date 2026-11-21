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
export const splitList = (value: string): string[] => {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

export interface AttachPromptPayloadInput {
  /** Kept only for a rule that referenced a file path and was not re-pointed. */
  readonly filePath: string;
  readonly placement: string;
  readonly promptId: string;
  readonly promptType: string;
}

/**
 * @description Serializes the `attach-prompt` action payload. A chosen prompt
 * is referenced by `promptId`; the legacy `filePath` reference is written only
 * when no prompt was chosen, because the server schema accepts exactly one.
 */
export const buildAttachPromptPayloadJson = (
  input: AttachPromptPayloadInput,
): string => {
  const { filePath, placement, promptId, promptType } = input;

  if (promptId !== '') {
    return JSON.stringify({ placement, promptId, promptType });
  }

  return JSON.stringify({ filePath, placement, promptType });
};
