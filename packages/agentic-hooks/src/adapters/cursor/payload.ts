/**
 * Cursor adapter — turns a Cursor agent hook payload into the tool-neutral
 * NormalizedInvocation.
 *
 * Written against payloads captured from `cursor-agent 2026.09.10-fd3934a`;
 * see `docs/monorepo/cursor-agent-hook-probe.md` and the committed fixtures in
 * `__tests__/fixtures/`. Two things follow from that measurement and shape
 * everything here:
 *
 * 1. **Cursor has no `Skill` tool.** A skill invocation is observable only as a
 *    `preToolUse` `Read` of the skill's `SKILL.md`. The skill name is that
 *    file's parent directory.
 * 2. **`beforeSubmitPrompt` does not fire in headless `-p` runs at all**, and
 *    where it does fire it carries only `{prompt, attachments, …}`. The slash
 *    branch below is therefore interactive-only, and deliberately narrow.
 *
 * Anything that is not one of those two shapes returns `null`. The previous
 * version guessed at four field names that exist on no Cursor event, which
 * meant it could not distinguish "not a skill invocation" from "the payload
 * changed underneath us" — it always reported the former.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import { SKILL_USAGE_OUTCOMES } from '../../data/events.ts';
import type { NormalizedInvocation, SkillUsageOutcome } from '../../types.ts';

/** Producer id stamped onto every event this adapter emits. @public */
export const CURSOR_SOURCE = 'cursor';

/**
 * Reading a `SKILL.md` is the only signal Cursor gives, and it is weaker than
 * Claude's `Skill` tool call — an agent editing skills reads them too. Recorded
 * under its own `invocation_path` rather than reusing `skill_tool` so the two
 * producers' data stays separable instead of silently comparable.
 *
 * @public
 */
export const CURSOR_INVOCATION_PATHS = Object.freeze({
  SKILL_READ: 'skill_read',
  SLASH: 'slash',
} as const);

/** Matches `<anything>/<skill-name>/SKILL.md`, capturing the skill name. */
const SKILL_FILE_PATTERN = /(?:^|\/)([^/]+)\/SKILL\.md$/;

/** Matches a prompt that opens with `/<command-name>`, capturing the name. */
const SLASH_COMMAND_PATTERN = /^\s*\/([A-Za-z0-9][\w.:-]*)\s*([\s\S]*)$/;

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null;

/**
 * Cursor's envelope is identical on every event: a `session_id` plus a
 * `workspace_roots` array. `cwd` is NOT an envelope field — it appears only on
 * the Shell tool's events — so the workspace root is the general answer.
 */
const resolveSessionId = (payload: Record<string, unknown>): string | null =>
  readString(payload.session_id) ?? readString(payload.conversation_id);

const resolveCwd = (payload: Record<string, unknown>): string | null => {
  const cwd = readString(payload.cwd);
  if (cwd) {
    return cwd;
  }
  if (Array.isArray(payload.workspace_roots)) {
    const [first] = payload.workspace_roots;
    return readString(first);
  }
  return null;
};

/** Skill name from a `SKILL.md` path, or null when the path is not one. */
const skillNameFromPath = (filePath: string): string | null => {
  const match = SKILL_FILE_PATTERN.exec(filePath.split('\\').join('/'));
  return match?.[1] ?? null;
};

const normalizeSkillRead = (
  payload: Record<string, unknown>,
): NormalizedInvocation | null => {
  if (payload.tool_name !== 'Read' || !isRecord(payload.tool_input)) {
    return null;
  }
  const filePath = readString(payload.tool_input.file_path);
  if (!filePath) {
    return null;
  }
  const skillName = skillNameFromPath(filePath);
  if (!skillName) {
    return null;
  }

  const normalized: NormalizedInvocation = {
    args: '',
    cwd: resolveCwd(payload),
    hook_event_name: 'preToolUse',
    invocation_path: CURSOR_INVOCATION_PATHS.SKILL_READ,
    session_id: resolveSessionId(payload),
    skill_name: skillName,
  };
  const toolUseId = readString(payload.tool_use_id);
  if (toolUseId) {
    normalized.tool_use_id = toolUseId;
  }
  return normalized;
};

const normalizeSlashCommand = (
  payload: Record<string, unknown>,
): NormalizedInvocation | null => {
  const prompt = readString(payload.prompt);
  if (!prompt) {
    return null;
  }
  const match = SLASH_COMMAND_PATTERN.exec(prompt);
  const skillName = match?.[1];
  if (!skillName) {
    return null;
  }

  return {
    args: match?.[2] ?? '',
    cwd: resolveCwd(payload),
    hook_event_name: 'beforeSubmitPrompt',
    invocation_path: CURSOR_INVOCATION_PATHS.SLASH,
    session_id: resolveSessionId(payload),
    skill_name: skillName,
  };
};

/**
 * Parse a Cursor hook payload into a NormalizedInvocation, or null when the
 * payload is not a skill invocation this adapter handles.
 *
 * @public
 */
export const normalizeCursorPayload = (
  raw: unknown,
): NormalizedInvocation | null => {
  if (!isRecord(raw)) {
    return null;
  }

  switch (raw.hook_event_name) {
    case 'beforeSubmitPrompt':
      return normalizeSlashCommand(raw);
    case 'preToolUse':
      return normalizeSkillRead(raw);
    default:
      return null;
  }
};

/**
 * Parse a Cursor `sessionEnd` payload into the fields the completion emitter
 * needs. `sessionEnd` is the completion signal rather than `stop`: `stop` is
 * Cursor's per-turn event and does not fire in headless runs at all, while
 * `sessionEnd` fires once per session and carries a duration and a final
 * status. Returns null when there is no usable session id.
 *
 * @public
 */
export const normalizeCursorSessionEndPayload = (
  raw: unknown,
): {
  cwd: string | null;
  final_status: string | null;
  hook_event_name: string;
  session_id: string;
} | null => {
  if (!isRecord(raw) || raw.hook_event_name !== 'sessionEnd') {
    return null;
  }
  const sessionId = resolveSessionId(raw);
  if (!sessionId) {
    return null;
  }
  return {
    cwd: resolveCwd(raw),
    final_status: readString(raw.final_status) ?? readString(raw.reason),
    hook_event_name: 'sessionEnd',
    session_id: sessionId,
  };
};

/**
 * Map Cursor's `sessionEnd` final status onto a skill outcome.
 *
 * Only `completed` was observed in the probe; the shipped bundle also raises
 * `aborted`, `error`, `failed`, `cancelled` and `timeout`. `error`/`failed`
 * are the only ones that mean the work itself went wrong — everything else is
 * a session that stopped before finishing, which is exactly what `abandoned`
 * records. An unknown future status therefore lands on `abandoned` rather than
 * on `success`, so a status we have never seen can never be mistaken for one
 * we have.
 *
 * @public
 */
export const cursorOutcomeForFinalStatus = (
  finalStatus: string | null,
): SkillUsageOutcome => {
  if (finalStatus === 'completed') {
    return SKILL_USAGE_OUTCOMES.SUCCESS;
  }
  if (finalStatus === 'error' || finalStatus === 'failed') {
    return SKILL_USAGE_OUTCOMES.ERROR;
  }
  return SKILL_USAGE_OUTCOMES.ABANDONED;
};
