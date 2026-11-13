/**
 * @description Shape the server's per-account usage buckets into display rows
 * for the Usage route's "By account" table: a label and detail line, the
 * `?account=` value that filters to the bucket, its share of the range's
 * tokens, and whether its cost is a list-price estimate.
 */

import type { UsageTokenUsageByAccountFragment } from '~/__generated__/graphql';
import {
  TOKEN_USAGE_COPY,
  TOKEN_USAGE_CREDENTIAL_KINDS,
  TOKEN_USAGE_CREDENTIAL_LABELS,
  TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID,
} from '~/routing/usage/data/data.token-usage-copy';
import { tokenUsageProviderLabel } from '~/routing/usage/utils/token-usage-labels';

/** One row of the "By account" table. */
export interface TokenUsageAccountRow {
  /** Cost to show, or null when nothing in the bucket was priced. */
  readonly costUsd: number | null;
  /** Credential kind, or null for the unattributed bucket. */
  readonly credentialKind: string | null;
  /** Credential badge label, or null for the unattributed bucket. */
  readonly credentialLabel: string | null;
  /** Secondary line: organization (when known) and provider. */
  readonly detail: string;
  /** `?account=` value that narrows the route to this bucket. */
  readonly filterAccountId: string;
  /** True when `costUsd` is a list-price estimate rather than a billed amount. */
  readonly isEstimate: boolean;
  /** Stable React key (account id, or `unattributed:<provider>`). */
  readonly key: string;
  readonly label: string;
  readonly plan: string | null;
  readonly provider: string;
  /** Share of the range's total tokens, 0–100. */
  readonly sharePercent: number;
  readonly totalTokens: number;
  readonly turnCount: number;
}

const { accounts: copy } = TOKEN_USAGE_COPY;

const toRow = (
  bucket: UsageTokenUsageByAccountFragment,
  rangeTotalTokens: number,
): TokenUsageAccountRow => {
  const { account, provider, totals } = bucket;
  const providerLabel = tokenUsageProviderLabel(provider);
  const sharePercent =
    rangeTotalTokens > 0 ? (totals.totalTokens / rangeTotalTokens) * 100 : 0;
  const costUsd = totals.costUsd > 0 ? totals.costUsd : null;
  const shared = {
    costUsd,
    plan: account?.plan ?? null,
    provider,
    sharePercent,
    totalTokens: totals.totalTokens,
    turnCount: totals.turnCount,
  };

  if (account === null || account === undefined) {
    return {
      ...shared,
      credentialKind: null,
      credentialLabel: null,
      detail: providerLabel,
      filterAccountId: TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID,
      isEstimate: false,
      key: `${TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID}:${provider}`,
      label: copy.unattributedLabel,
    };
  }

  const isApiKey =
    account.credentialKind === TOKEN_USAGE_CREDENTIAL_KINDS.API_KEY;
  const fallbackLabel = isApiKey
    ? copy.apiKeyLabel
    : copy.fallbackLabel(providerLabel);
  // A personal Claude login's org is named after its email; repeating it adds nothing.
  const isOrgNamedAfterEmail =
    account.email !== null &&
    account.email !== undefined &&
    account.orgName?.includes(account.email) === true;
  const orgName = isOrgNamedAfterEmail ? null : account.orgName;
  const detailParts = [orgName, providerLabel].filter(
    (part): part is string =>
      part !== null && part !== undefined && part !== '',
  );

  return {
    ...shared,
    credentialKind: account.credentialKind,
    credentialLabel:
      TOKEN_USAGE_CREDENTIAL_LABELS[account.credentialKind] ?? null,
    detail: detailParts.join(' · '),
    filterAccountId: account.id,
    isEstimate:
      account.credentialKind === TOKEN_USAGE_CREDENTIAL_KINDS.SUBSCRIPTION,
    key: account.id,
    label: account.email ?? fallbackLabel,
  };
};

/** Display rows for the server's per-account buckets, in server order (costliest first). */
export const toTokenUsageAccountRows = (
  buckets: readonly UsageTokenUsageByAccountFragment[],
  rangeTotalTokens: number,
): TokenUsageAccountRow[] => {
  return buckets.map((bucket) => toRow(bucket, rangeTotalTokens));
};
