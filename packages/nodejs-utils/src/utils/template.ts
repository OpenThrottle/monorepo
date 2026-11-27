/**
 * @description Replaces every `{token}` in a copy template with its value.
 * @public
 */
export const fillTemplate = (
  template: string,
  values: Readonly<Record<string, string>>,
): string => {
  return Object.entries(values).reduce((text, [token, value]) => {
    return text.split(`{${token}}`).join(value);
  }, template);
};
