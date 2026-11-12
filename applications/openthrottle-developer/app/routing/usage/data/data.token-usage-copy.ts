/**
 * @description Static copy + provider registry for the Usage-route token-usage
 * surface. Component files stay presentational; labels and the selectable
 * provider set live here (nearest `data/` folder).
 */

/** A selectable token-usage provider (driver id) + its display label. */
export interface TokenUsageProviderOption {
  readonly id: string;
  readonly label: string;
}

/**
 * The providers the token-usage surface can filter by, mirroring the server's
 * CONVERSATION_CLI_BACKENDS keys plus the openai HTTP backend. Rendered as the
 * provider selector; a provider with no usage in range shows an empty state.
 */
export const TOKEN_USAGE_PROVIDERS: readonly TokenUsageProviderOption[] = [
  { id: 'claude', label: 'Claude' },
  { id: 'codex', label: 'Codex' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'grok', label: 'Grok' },
  { id: 'opencode', label: 'opencode' },
  { id: 'openai', label: 'OpenAI' },
];

/** Which totals field a stat tile reads, and how to render it. */
export interface TokenUsageStatDefinition {
  readonly field:
    | 'cacheReadTokens'
    | 'cacheWriteTokens'
    | 'costUsd'
    | 'inputTokens'
    | 'outputTokens'
    | 'reasoningTokens'
    | 'totalTokens';
  readonly hint: string;
  readonly kind: 'cost' | 'tokens';
  readonly label: string;
}

/** The headline stat tiles, in display order. */
export const TOKEN_USAGE_STATS: readonly TokenUsageStatDefinition[] = [
  {
    field: `totalTokens`,
    hint: `Input + output across every request in range.`,
    kind: `tokens`,
    label: `Total tokens`,
  },
  {
    field: `inputTokens`,
    hint: `Prompt tokens sent to the model.`,
    kind: `tokens`,
    label: `Input`,
  },
  {
    field: `outputTokens`,
    hint: `Completion tokens generated.`,
    kind: `tokens`,
    label: `Output`,
  },
  {
    field: `cacheReadTokens`,
    hint: `Tokens served from the prompt cache.`,
    kind: `tokens`,
    label: `Cache read`,
  },
  {
    field: `reasoningTokens`,
    hint: `Reasoning tokens, when a backend accounts them separately.`,
    kind: `tokens`,
    label: `Reasoning`,
  },
  {
    field: `costUsd`,
    hint: `Reported cost where the backend prices a turn. Claude Code rows are an estimate at Anthropic list prices.`,
    kind: `cost`,
    label: `Cost`,
  },
];

/**
 * Producer ids of `TokenUsageRowObject.source`, mirroring the server's
 * `AGENT_TOKEN_USAGE_SOURCES` (`@openthrottle/nestjs-repositories`; the client
 * cannot import that server package).
 */
export const TOKEN_USAGE_SOURCES = {
  CHAT: 'openthrottle-chat',
  CLAUDE_CODE: 'claude-code',
} as const;

/** Display labels for the known source ids. */
export const TOKEN_USAGE_SOURCE_LABELS: Readonly<Record<string, string>> = {
  [TOKEN_USAGE_SOURCES.CHAT]: `OpenThrottle chat`,
  [TOKEN_USAGE_SOURCES.CLAUDE_CODE]: `Claude Code`,
};

/**
 * `?account=` value for rows no agent account was stamped on, mirroring the
 * server's `TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID`.
 */
export const TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID = 'unattributed';

/**
 * `TokenUsageAccountObject.credentialKind` values, mirroring the server's
 * `agent_accounts.credential_kind`.
 */
export const TOKEN_USAGE_CREDENTIAL_KINDS = {
  API_KEY: 'api_key',
  SUBSCRIPTION: 'subscription',
  UNKNOWN: 'unknown',
} as const;

/** Display labels for the credential kinds. */
export const TOKEN_USAGE_CREDENTIAL_LABELS: Readonly<Record<string, string>> = {
  [TOKEN_USAGE_CREDENTIAL_KINDS.API_KEY]: `API key`,
  [TOKEN_USAGE_CREDENTIAL_KINDS.SUBSCRIPTION]: `Subscription`,
  [TOKEN_USAGE_CREDENTIAL_KINDS.UNKNOWN]: `Unknown`,
};

/** Badge hue per credential kind on the "By account" table. */
export const TOKEN_USAGE_CREDENTIAL_BADGE_COLORS: Readonly<
  Record<string, 'amber' | 'sky' | 'slate'>
> = {
  [TOKEN_USAGE_CREDENTIAL_KINDS.API_KEY]: `amber`,
  [TOKEN_USAGE_CREDENTIAL_KINDS.SUBSCRIPTION]: `sky`,
  [TOKEN_USAGE_CREDENTIAL_KINDS.UNKNOWN]: `slate`,
};

export const TOKEN_USAGE_COPY = {
  accounts: {
    apiKeyLabel: `API key`,
    columnAccount: `Account`,
    columnCost: `Cost`,
    columnPlan: `Plan`,
    columnShare: `Share`,
    columnTotal: `Total`,
    columnTurns: `Turns`,
    estimatePrefix: `≈ `,
    estimateTitle: `List-price estimate. Subscription plans are not billed per token.`,
    fallbackLabel: (providerLabel: string): string => {
      return `${providerLabel} account`;
    },
    heading: `By account`,
    intro: `Which agent login each request was billed to. Subscription costs are list-price estimates; API-key costs are what the key was charged. Requests recorded before accounts were tracked, and drivers that report no account, are unattributed.`,
    showAll: `Show all accounts`,
    unattributedLabel: `Unattributed`,
  },
  emptyAllProviders: `No token usage recorded yet in this range. Usage is captured from persisted OpenThrottle chat turns (Private-mode turns are not recorded) and from interactive Claude Code sessions in this repository.`,
  emptyForProvider: (label: string): string =>
    `No ${label} token usage in this range.`,
  heading: `Model token usage`,
  intro: (rangeDays: number): string =>
    `Token accounting over the last ${rangeDays} days from two sources, normalized across every provider: persisted OpenThrottle chat turns (Private-mode turns are excluded) and interactive Claude Code sessions in this repository, read from the session transcript when a session stops, one row per API request. Chat turns report cost where the backend prices them. Claude Code transcripts carry no cost, so those rows are estimated at Anthropic's published list prices: subscription plans don't pay per token, and a request that can't be priced exactly shows no cost rather than $0.`,
  sources: {
    columnCost: `Cost`,
    columnInput: `Input`,
    columnOutput: `Output`,
    columnSource: `Source`,
    columnTotal: `Total`,
    columnTurns: `Turns`,
    heading: `By source`,
  },
} as const;
