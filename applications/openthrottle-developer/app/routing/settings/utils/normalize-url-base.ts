/**
 * @description Strips a single trailing slash so origins and configured app
 * URLs compare equal. Hoisted out of SettingsEnvironmentDiagnostics per
 * component-primitive-shape R4.
 */

export const normalizeUrlBase = (url: string): string => {
  return url.replace(/\/$/, '');
};
