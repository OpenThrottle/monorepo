import type { ServiceAccountCredentialFieldsFragment } from '~/__generated__/graphql';
import { optionalTrimmedString } from '~/routing/settings/utils/workspace-settings-action';

/** URL search param for the selected service account on Settings → Keys. */
export const SETTINGS_KEYS_ACCOUNT_SEARCH_PARAM = 'account';

/** Probe id when no account is selected; credentials for unknown accounts return []. */
export const SETTINGS_KEYS_PROBE_SERVICE_ACCOUNT_ID =
  '00000000-0000-0000-0000-000000000000';

export type SettingsKeysActionData =
  | { ok: true }
  | { error: string }
  | {
      credential: ServiceAccountCredentialFieldsFragment;
      intent: 'createCredential';
      token: string;
    };

type ServiceAccountPickerItem = {
  readonly disabledAt?: string | null;
  readonly id: string;
};

/**
 * @description Resolves which service account id to load credentials for.
 */
export const resolveSelectedServiceAccountId = (
  accounts: readonly ServiceAccountPickerItem[],
  searchParamAccountId: string | null,
): string | null => {
  const enabled = accounts.filter((account) => account.disabledAt == null);
  if (enabled.length === 0) {
    return null;
  }
  if (searchParamAccountId) {
    const match = enabled.find(
      (account) => account.id === searchParamAccountId,
    );
    if (match) {
      return match.id;
    }
  }
  return enabled[0]?.id ?? null;
};

/**
 * @description Parses optional credential expiry from form data (ISO date string).
 */
export const parseExpiresAtFromFormData = (
  value: FormDataEntryValue | null,
): Date | null => {
  const trimmed = optionalTrimmedString(value);
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};
