import type { McpConnectorConnectionFieldsFragment } from '~/__generated__/graphql';
import { optionalTrimmedString } from '~/routing/settings/utils/workspace-settings-action';

/** Result of the settings.mcp.$connectorId route action, discriminated by shape. */
export type SettingsMcpActionData =
  | { ok: true }
  | { error: string }
  | {
      connection: McpConnectorConnectionFieldsFragment;
      intent: 'connect';
    };

/** Parses the required connector key from form data. */
export const parseConnectorKeyFromFormData = (
  value: FormDataEntryValue | null,
): string | null => {
  return optionalTrimmedString(value);
};

/** Parses the optional api token from form data (empty → null for oauth). */
export const parseApiTokenFromFormData = (
  value: FormDataEntryValue | null,
): string | null => {
  return optionalTrimmedString(value);
};

/** Parses the optional credential label from form data. */
export const parseLabelFromFormData = (
  value: FormDataEntryValue | null,
): string | null => {
  return optionalTrimmedString(value);
};

/** Parses the enabled flag from form data (`'true'` → true, else false). */
export const parseEnabledFromFormData = (
  value: FormDataEntryValue | null,
): boolean => {
  return optionalTrimmedString(value) === 'true';
};
