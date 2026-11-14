import { isRecord } from '@openthrottle/nodejs-utils';

/** What a legacy codex `tool_result` chunk means for its tool card. */
export interface LegacyCodexItem {
  /** The card's Arguments as display text, or null when the kind has none. */
  readonly argsJson: string | null;
  readonly callId: string | null;
  readonly isError: boolean;
  /** The card's Result (or, when `isError`, its error text) as display text. */
  readonly resultJson: string | null;
}

/**
 * @description Reads a codex `tool_result` chunk persisted before the codex
 * mapper emitted `tool_call`/`tool_result` pairs, whose metadata is only
 * `{ item, itemType, toolName }`, into the fields the fold needs — so those
 * conversations render without a data migration. Mirrors the per-kind readers
 * in `openthrottle-agentic-utils` `codex/tool-items.ts`, which this client
 * package cannot import. Returns null when `metadata` is not that legacy shape
 * (it has a `toolCall`, or no `item` record).
 */
export const readLegacyCodexItem = (
  metadata: Readonly<Record<string, unknown>>,
): LegacyCodexItem | null => {
  const item = metadata.item;

  if (metadata.toolCall !== undefined || !isRecord(item)) {
    return null;
  }

  const kind = item.item_type ?? item.type ?? metadata.itemType;
  const callId = typeof item.id === 'string' ? item.id : null;
  const text = (value: unknown): string | null => {
    if (value === undefined || value === null) {
      return null;
    }

    return typeof value === 'string' ? value : JSON.stringify(value);
  };

  if (kind === 'command_execution') {
    const rawCommand = typeof item.command === 'string' ? item.command : null;
    const shell =
      /^\S*\b(?:ba|z)?sh\s+-l?c\s+(?:'([\s\S]*)'|"((?:[^"\\]|\\[\s\S])*)"|(\S+))$/.exec(
        rawCommand?.trim() ?? '',
      );
    const singleQuoted = shell?.[1]?.replace(/'\\''/g, `'`);
    const doubleQuoted = shell?.[2]?.replace(/\\(["\\$`])/g, '$1');
    const command = singleQuoted ?? doubleQuoted ?? shell?.[3] ?? rawCommand;
    const exitCode = typeof item.exit_code === 'number' ? item.exit_code : null;
    const isNonZeroExit = exitCode !== null && exitCode !== 0;
    const isError = item.status === 'failed' || isNonZeroExit;
    const output = text(item.aggregated_output) ?? '';
    const exitText = exitCode === null ? null : `Exited with code ${exitCode}.`;
    const isOutputEmpty = output === '';

    return {
      argsJson: command === null ? null : JSON.stringify({ command }),
      callId,
      isError,
      resultJson: isOutputEmpty && isError ? exitText : output,
    };
  }

  if (kind === 'mcp_tool_call') {
    const error = isRecord(item.error) ? text(item.error.message) : null;
    const isError = item.status === 'failed' || error !== null;
    const args = {
      arguments: item.arguments ?? null,
      server: item.server ?? null,
      tool: item.tool ?? null,
    };

    return {
      argsJson: JSON.stringify(args),
      callId,
      isError,
      resultJson: isError
        ? (error ?? 'MCP tool call failed.')
        : text(item.result),
    };
  }

  // Any other kind: the raw item is the result, so the card is never empty.
  return {
    argsJson: null,
    callId,
    isError: item.status === 'failed',
    resultJson: JSON.stringify(item),
  };
};
