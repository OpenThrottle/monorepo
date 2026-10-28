import type { SettingsKeysActionData } from '~/routing/settings/utils/settings-keys-action';

/** The create-credential slice of the settings/keys action payload. */
export type SettingsKeysCreateCredentialActionData = Extract<
  SettingsKeysActionData,
  { intent: 'createCredential' }
>;
