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

/** Human label for a provider id, falling back to the raw id. */
export const tokenUsageProviderLabel = (id: string): string =>
  TOKEN_USAGE_PROVIDERS.find((provider) => provider.id === id)?.label ?? id;

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
    field: 'totalTokens',
    hint: 'Input + output across every turn in range.',
    kind: 'tokens',
    label: 'Total tokens',
  },
  {
    field: 'inputTokens',
    hint: 'Prompt tokens sent to the model.',
    kind: 'tokens',
    label: 'Input',
  },
  {
    field: 'outputTokens',
    hint: 'Completion tokens generated.',
    kind: 'tokens',
    label: 'Output',
  },
  {
    field: 'cacheReadTokens',
    hint: 'Tokens served from the prompt cache.',
    kind: 'tokens',
    label: 'Cache read',
  },
  {
    field: 'reasoningTokens',
    hint: 'Reasoning tokens, when a backend accounts them separately.',
    kind: 'tokens',
    label: 'Reasoning',
  },
  {
    field: 'costUsd',
    hint: 'Reported cost, for backends that price a turn.',
    kind: 'cost',
    label: 'Cost',
  },
];

export const TOKEN_USAGE_COPY = {
  emptyAllProviders:
    'No token usage recorded yet in this range. Usage is captured from persisted chat turns (Private-mode turns are not recorded).',
  emptyForProvider: (label: string): string =>
    `No ${label} token usage in this range.`,
  heading: 'Model token usage',
  intro: (rangeDays: number): string =>
    `Per-turn token and cost accounting from persisted agent chat over the last ${rangeDays} days, normalized across every provider. Private-mode turns are excluded.`,
} as const;
