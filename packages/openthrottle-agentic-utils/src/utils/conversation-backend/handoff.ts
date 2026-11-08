/**
 * @description Portable handoff for a conversation that switches backend
 * mid-way. Session-based backends only see the latest user message, so turns
 * another backend handled are replayed as a budgeted preamble (whole messages,
 * newest first, no summarization).
 */

import type { ChatCompletionMessage } from '../chat-completions/index.ts';
import { resolveChatBackendCapabilities } from './capabilities.ts';

/**
 * Env var overriding the handoff token budget.
 *
 * @public
 */
export const CHAT_HANDOFF_TOKEN_BUDGET_ENV = `OPENTHROTTLE_CHAT_HANDOFF_TOKEN_BUDGET`;

/**
 * Default handoff budget in estimated tokens.
 *
 * @public
 */
export const CHAT_HANDOFF_DEFAULT_TOKEN_BUDGET = 16000;

const CHARS_PER_TOKEN = 4;

/**
 * Result of {@link selectHandoffMessages}.
 *
 * @public
 */
export interface HandoffSelection {
  /** Messages that fit the budget, in chronological order. */
  readonly included: ChatCompletionMessage[];
  /** How many older messages did not fit. */
  readonly omittedCount: number;
}

const estimateTokens = (message: ChatCompletionMessage): number => {
  return Math.ceil(message.content.length / CHARS_PER_TOKEN);
};

/**
 * Resolve the handoff budget from the env, falling back to the default for a
 * missing or non-positive-integer value.
 *
 * @public
 */
export function resolveHandoffTokenBudget(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const parsed = Number.parseInt(env[CHAT_HANDOFF_TOKEN_BUDGET_ENV] ?? '', 10);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return CHAT_HANDOFF_DEFAULT_TOKEN_BUDGET;
}

/**
 * Walk newest to oldest taking whole messages while they fit the budget; stop
 * at the first that does not. Never truncates a message.
 *
 * @public
 */
export function selectHandoffMessages(
  missed: readonly ChatCompletionMessage[],
  budgetTokens: number,
): HandoffSelection {
  const included: ChatCompletionMessage[] = [];
  let used = 0;

  for (let index = missed.length - 1; index >= 0; index -= 1) {
    const message = missed[index];
    if (message === undefined) {
      continue;
    }
    const cost = estimateTokens(message);
    if (used + cost > budgetTokens) {
      break;
    }
    used += cost;
    included.unshift(message);
  }

  return { included, omittedCount: missed.length - included.length };
}

const ROLE_LABELS: Record<ChatCompletionMessage['role'], string> = {
  assistant: 'Assistant',
  system: 'System',
  user: 'User',
};

/**
 * Render a selection as a preamble for the next user message; '' when nothing
 * was included.
 *
 * @public
 */
export function formatHandoffPreamble(selection: HandoffSelection): string {
  if (selection.included.length === 0) {
    return '';
  }

  const lines = [
    `The following turns happened earlier in this conversation with a different agent. Use them as context.`,
  ];
  if (selection.omittedCount > 0) {
    lines.push(`(${selection.omittedCount} earlier messages omitted)`);
  }
  const blocks = selection.included.map((message) => {
    return `${ROLE_LABELS[message.role]}: ${message.content}`;
  });

  return [...lines, '', blocks.join('\n\n')].join('\n');
}

/**
 * True when the backend is handed the full message history on every turn (so a
 * handoff would duplicate it). Reads {@link resolveChatBackendCapabilities}.
 *
 * @public
 */
export function backendReplaysFullHistory(
  backend: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return resolveChatBackendCapabilities(backend, env).replaysFullHistory;
}
