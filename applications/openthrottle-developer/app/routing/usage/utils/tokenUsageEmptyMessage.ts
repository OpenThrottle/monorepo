import { TOKEN_USAGE_COPY } from '~/routing/usage/data/data.token-usage-copy';
import { tokenUsageProviderLabel } from '~/routing/usage/utils/token-usage-labels';

/** Empty-state copy for the token-usage table: all providers, or one provider. */
export const tokenUsageEmptyMessage = (
  selectedProvider: string | null,
): string => {
  if (selectedProvider === null) {
    return TOKEN_USAGE_COPY.emptyAllProviders;
  }

  return TOKEN_USAGE_COPY.emptyForProvider(
    tokenUsageProviderLabel(selectedProvider),
  );
};
