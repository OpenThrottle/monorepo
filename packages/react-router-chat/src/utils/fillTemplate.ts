/** Replaces each `{token}` in a copy template with its value. */
export const fillTemplate = (
  template: string,
  values: Readonly<Record<string, string>>,
): string => {
  return Object.entries(values).reduce((text, [token, value]) => {
    return text.replaceAll(`{${token}}`, value);
  }, template);
};
