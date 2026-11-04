/**
 * Claude Code transcript parsing for SKILL invocations — the counterpart of
 * `transcript.ts` (token usage) used by the operator-run backfill. Turns
 * complete transcript lines into the same `NormalizedInvocation`s the live
 * capture hook produces, by building the hook payload the live hook would have
 * received and handing it to `normalizeClaudePayload`. No files, no network.
 *
 * Shape facts (the transcript carries no hook events, so each is read off the
 * conversation lines):
 *   - A Skill tool call is an `assistant` line whose `message.content` holds a
 *     `tool_use` block named `Skill`. Its block `id` is the live hook's
 *     `tool_use_id`, which is what makes a backfilled row collide with a live
 *     one on the server's unique index.
 *   - A slash command is a `user` line whose text STARTS with
 *     `<command-message>` / `<command-name>` tags. Built-in local commands
 *     (`/clear`, `/model`, …) leave the same tags, but are answered by a
 *     `<local-command-stdout>` user line whose `parentUuid` is the command's
 *     `uuid`; a skill or custom command is answered by an expansion instead.
 *     Commands with a stdout reply are dropped, so built-ins are not counted as
 *     skills.
 *   - `promptId` on a user line is the live hook's `prompt_id`. When a line has
 *     none, its own `uuid` stands in: still a stable key, so a re-run dedupes,
 *     but it cannot match a live row — see `keyedByFallback`.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import type { NormalizedInvocation } from '../../types.ts';
import { normalizeClaudePayload } from './payload.ts';

const COMMAND_HEAD = /^\s*<command-(?:message|name)>/;
const COMMAND_NAME = /<command-name>\s*([^<]*?)\s*<\/command-name>/;
const COMMAND_ARGS = /<command-args>([\s\S]*?)<\/command-args>/;
const LOCAL_STDOUT = '<local-command-stdout>';

/**
 * One skill invocation read off a transcript.
 *
 * @public
 */
export interface SkillCandidate {
  /** The transcript line's `gitBranch`, or '' when it carried none. */
  readonly gitBranch: string;
  /** True when a slash command had no `promptId` and its line uuid stands in. */
  readonly keyedByFallback: boolean;
  /** The neutral event, exactly as the live hook would have normalized it. */
  readonly normalized: NormalizedInvocation;
  /** ISO-8601 time of the transcript line. */
  readonly occurredAt: string;
}

interface PendingCommand {
  readonly candidate: SkillCandidate;
  readonly uuid: string | null;
}

/**
 * Accumulator for one transcript file. A command is only confirmed once its
 * reply (or the lack of one) is known, so slash candidates wait here until
 * `finishSkillScan`.
 *
 * @public
 */
export interface SkillScanState {
  readonly candidates: SkillCandidate[];
  readonly commands: PendingCommand[];
  /** `parentUuid`s of `<local-command-stdout>` lines: built-in commands. */
  readonly localReplies: Set<string>;
}

/**
 * A fresh accumulator for one transcript file.
 *
 * @public
 */
export const createSkillScanState = (): SkillScanState => ({
  candidates: [],
  commands: [],
  localReplies: new Set<string>(),
});

const nonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null;

const parseJsonRecord = (line: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(line);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/** The text of a user line: a string, or the joined `text` blocks of an array. */
const userText = (entry: Record<string, unknown>): string => {
  const { message } = entry;
  if (!isRecord(message)) {
    return '';
  }
  const { content } = message;
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .map((block: unknown) =>
      isRecord(block) && typeof block.text === 'string' ? block.text : '',
    )
    .join('\n');
};

const baseOf = (
  entry: Record<string, unknown>,
  fallbackSessionId: string | null,
): {
  gitBranch: string;
  occurredAt: string | null;
  session_id: string | null;
} => ({
  gitBranch: nonEmptyString(entry.gitBranch) ?? '',
  occurredAt: nonEmptyString(entry.timestamp),
  session_id: nonEmptyString(entry.sessionId) ?? fallbackSessionId,
});

const fromSkillToolUse = (
  entry: Record<string, unknown>,
  fallbackSessionId: string | null,
): SkillCandidate[] => {
  const { message } = entry;
  if (!isRecord(message) || !Array.isArray(message.content)) {
    return [];
  }
  const {
    gitBranch,
    occurredAt,
    session_id: sessionId,
  } = baseOf(entry, fallbackSessionId);
  if (occurredAt === null) {
    return [];
  }

  const out: SkillCandidate[] = [];
  for (const block of message.content) {
    if (
      !isRecord(block) ||
      block.type !== 'tool_use' ||
      block.name !== 'Skill'
    ) {
      continue;
    }
    // No block id means no idempotency key: a row the server cannot dedupe is
    // worse than a missing one in a command that promises a safe re-run.
    const toolUseId = nonEmptyString(block.id);
    if (toolUseId === null) {
      continue;
    }
    const normalized = normalizeClaudePayload({
      agent_id: nonEmptyString(entry.agentId),
      cwd: nonEmptyString(entry.cwd),
      hook_event_name: 'PreToolUse',
      prompt_id: nonEmptyString(entry.promptId),
      session_id: sessionId,
      tool_input: block.input,
      tool_name: 'Skill',
      tool_use_id: toolUseId,
    });
    if (normalized !== null) {
      out.push({
        gitBranch,
        keyedByFallback: false,
        normalized,
        occurredAt,
      });
    }
  }
  return out;
};

const fromSlashCommand = (
  entry: Record<string, unknown>,
  fallbackSessionId: string | null,
  text: string,
): PendingCommand | null => {
  const name = COMMAND_NAME.exec(text)?.[1]?.replace(/^\//, '') ?? '';
  const {
    gitBranch,
    occurredAt,
    session_id: sessionId,
  } = baseOf(entry, fallbackSessionId);
  if (name === '' || occurredAt === null) {
    return null;
  }
  const uuid = nonEmptyString(entry.uuid);
  const promptId = nonEmptyString(entry.promptId);
  const normalized = normalizeClaudePayload({
    command_args: COMMAND_ARGS.exec(text)?.[1]?.trim() ?? '',
    command_name: name,
    cwd: nonEmptyString(entry.cwd),
    expansion_type: 'slash_command',
    hook_event_name: 'UserPromptExpansion',
    prompt_id: promptId ?? uuid,
    session_id: sessionId,
  });
  if (normalized === null) {
    return null;
  }
  return {
    candidate: {
      gitBranch,
      keyedByFallback: promptId === null,
      normalized,
      occurredAt,
    },
    uuid,
  };
};

/**
 * Fold complete transcript lines into `state`. Malformed lines and lines that
 * are not skill invocations are skipped silently.
 *
 * A cheap substring test runs before `JSON.parse`, so the great majority of
 * lines (tool results, plain assistant text) are never parsed here.
 *
 * @public
 */
export const scanSkillLines = ({
  fallbackSessionId,
  lines,
  state,
}: {
  fallbackSessionId: string | null;
  lines: readonly string[];
  state: SkillScanState;
}): void => {
  for (const line of lines) {
    const mightBeSkill = line.includes('"Skill"');
    const mightBeCommand =
      line.includes('command-') || line.includes(LOCAL_STDOUT);
    if (!mightBeSkill && !mightBeCommand) {
      continue;
    }
    const entry = parseJsonRecord(line);
    if (entry === null) {
      continue;
    }

    if (entry.type === 'assistant' && mightBeSkill) {
      state.candidates.push(...fromSkillToolUse(entry, fallbackSessionId));
      continue;
    }
    if (entry.type !== 'user') {
      continue;
    }

    const text = userText(entry);
    if (text.includes(LOCAL_STDOUT)) {
      const parent = nonEmptyString(entry.parentUuid);
      if (parent !== null) {
        state.localReplies.add(parent);
      }
      continue;
    }
    if (COMMAND_HEAD.test(text)) {
      const command = fromSlashCommand(entry, fallbackSessionId, text);
      if (command !== null) {
        state.commands.push(command);
      }
    }
  }
};

/**
 * Close a file's scan: keep the slash commands no local reply claimed (so
 * built-ins are dropped) and return every candidate in transcript order, tool
 * calls before commands.
 *
 * @public
 */
export const finishSkillScan = (
  state: SkillScanState,
): readonly SkillCandidate[] => [
  ...state.candidates,
  ...state.commands
    .filter(({ uuid }) => uuid === null || !state.localReplies.has(uuid))
    .map(({ candidate }) => candidate),
];
