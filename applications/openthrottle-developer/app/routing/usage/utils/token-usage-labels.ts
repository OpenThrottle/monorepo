import {
  TOKEN_USAGE_PROVIDERS,
  TOKEN_USAGE_SOURCE_LABELS,
} from '~/routing/usage/data/data.token-usage-copy';

/** Human label for a provider id, falling back to the raw id. */
export const tokenUsageProviderLabel = (id: string): string => {
  return (
    TOKEN_USAGE_PROVIDERS.find((provider) => provider.id === id)?.label ?? id
  );
};

/** Human label for a source id, falling back to the raw id for an unknown source. */
export const tokenUsageSourceLabel = (id: string): string => {
  return TOKEN_USAGE_SOURCE_LABELS[id] ?? id;
};
