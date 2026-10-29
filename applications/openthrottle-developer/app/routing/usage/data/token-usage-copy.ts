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
  { id: 'gemini', label: 'Gemini' },
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
    hint: `Reported cost, for backends that price a turn. Claude Code rows carry none.`,
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

/** Human label for a source id, falling back to the raw id for an unknown source. */
export const tokenUsageSourceLabel = (id: string): string =>
  TOKEN_USAGE_SOURCE_LABELS[id] ?? id;

export const TOKEN_USAGE_COPY = {
  emptyAllProviders: `No token usage recorded yet in this range. Usage is captured from persisted OpenThrottle chat turns (Private-mode turns are not recorded) and from interactive Claude Code sessions in this repository.`,
  emptyForProvider: (label: string): string =>
    `No ${label} token usage in this range.`,
  heading: `Model token usage`,
  intro: (rangeDays: number): string =>
    `Token accounting over the last ${rangeDays} days from two sources, normalized across every provider: persisted OpenThrottle chat turns (Private-mode turns are excluded) and interactive Claude Code sessions in this repository, read from the session transcript when a session stops, one row per API request. Chat turns report cost where the backend prices them; Claude Code transcripts carry no cost, so those rows show tokens only.`,
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
