/**
 * Codex adapter — turns a Codex CLI hook payload into the tool-neutral
 * NormalizedInvocation.
 *
 * Written against payloads captured from `codex-cli 0.145.0` (session and
 * prompt events) and `codex-cli 0.167.0` (`PreToolUse`); see
 * `docs/monorepo/codex-cli-hook-probe.md` and the committed fixtures in
 * `__tests__/fixtures/`.
 *
 * Codex's hook payloads are Claude-shaped — `hook_event_name`, `session_id`,
 * `cwd`, `transcript_path`, plus a Codex-only `turn_id` — and its event names
 * are Claude's (`PreToolUse`, `UserPromptSubmit`, `SessionStart`, `SessionEnd`,
 * …). The config that wires them is TOML in `~/.codex/config.toml` rather than
 * JSON in the repo, which is a delivery difference, not a payload one.
 *
 * Two capture branches, both measured:
 *
 * 1. **`PreToolUse` skill read.** Codex has no `Skill` tool. Measured on
 *    0.167.0, a filesystem skill is loaded by its `Bash` tool running
 *    `cat <path>/SKILL.md` (a 700-line `SKILL.md` was read the same way, not
 *    paged), so the skill name is the file's parent directory — the same signal
 *    Cursor gives, recorded under the same `skill_read` path. Only that exact
 *    shape matches: one `cat` of one path, no pipes, chains or redirects.
 *    Any other command returns null rather than guessing at what it read.
 * 2. **`UserPromptSubmit` slash command**, parsed from the prompt.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import type { NormalizedInvocation } from '../types.ts';
import {
  SKILL_READ_INVOCATION_PATH,
  skillNameFromSkillFilePath,
} from './skill-file.ts';

/** Producer id stamped onto every event this adapter emits. @public */
export const CODEX_SOURCE = 'codex';

/**
 * The session id Codex exports to its shell tool, or null outside one.
 * Measured on `codex-cli 0.167.0`: every shell command sees `CODEX_SESSION_ID`
 * and `CODEX_THREAD_ID`, both equal to the thread id, which is the hook
 * payload's `session_id` (the rollout file is named for it). That equality is
 * what lets the reporter claim the start `UserPromptSubmit` recorded.
 *
 * @public
 */
export const readCodexShellSessionId = (
  env: NodeJS.ProcessEnv,
): string | null => {
  return env.CODEX_SESSION_ID || env.CODEX_THREAD_ID || null;
};

/** Matches a prompt that opens with `/<command-name>`, capturing the name. */
const SLASH_COMMAND_PATTERN = /^\s*\/([A-Za-z0-9][\w.:-]*)\s*([\s\S]*)$/;

const readString = (value: unknown): string | null => {
  return typeof value === 'string' && value ? value : null;
};

/**
 * `cat <path>` with exactly one path argument, optionally quoted, and nothing
 * else on the line — the only command shape Codex was measured using to load a
 * skill. Shell metacharacters anywhere mean a compound command, which this
 * deliberately does not try to read.
 */
const SKILL_CAT_PATTERN = /^\s*cat\s+(?:'([^']+)'|"([^"]+)"|([^\s'"]+))\s*$/;
const SHELL_METACHARACTERS = /[;&|<>`$\n]/;

/** The path a Codex `Bash` command reads with a bare `cat`, or null. */
const catTargetPath = (command: string): string | null => {
  if (SHELL_METACHARACTERS.test(command)) {
    return null;
  }
  const match = SKILL_CAT_PATTERN.exec(command);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
};

const normalizeSkillRead = (
  payload: Record<string, unknown>,
): NormalizedInvocation | null => {
  if (payload.tool_name !== 'Bash' || !isRecord(payload.tool_input)) {
    return null;
  }
  const command = readString(payload.tool_input.command);
  const filePath = command ? catTargetPath(command) : null;
  const skillName = filePath ? skillNameFromSkillFilePath(filePath) : null;
  if (!skillName) {
    return null;
  }

  const normalized: NormalizedInvocation = {
    args: '',
    cwd: readString(payload.cwd),
    hook_event_name: 'PreToolUse',
    invocation_path: SKILL_READ_INVOCATION_PATH,
    session_id: readString(payload.session_id),
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

  const normalized: NormalizedInvocation = {
    args: match?.[2] ?? '',
    cwd: readString(payload.cwd),
    hook_event_name: 'UserPromptSubmit',
    invocation_path: 'slash',
    session_id: readString(payload.session_id),
    skill_name: skillName,
  };
  const turnId = readString(payload.turn_id);
  if (turnId) {
    // Codex's per-turn id is the closest analogue to a tool_use_id and is what
    // makes a start correlatable with its outcome inside one session.
    normalized.tool_use_id = turnId;
  }
  return normalized;
};

/**
 * Parse a Codex hook payload into a NormalizedInvocation, or null when the
 * payload is not a skill invocation this adapter handles.
 *
 * @public
 */
export const normalizeCodexPayload = (
  raw: unknown,
): NormalizedInvocation | null => {
  if (!isRecord(raw)) {
    return null;
  }

  switch (raw.hook_event_name) {
    case 'PreToolUse':
      return normalizeSkillRead(raw);
    case 'UserPromptSubmit':
      return normalizeSlashCommand(raw);
    default:
      return null;
  }
};

/**
 * Parse a Codex `SessionEnd` payload into the fields the completion emitter
 * needs. `SessionEnd` rather than `Stop`: Codex has both, and `Stop` is the
 * per-turn event. Returns null when there is no usable session id.
 *
 * @public
 */
export const normalizeCodexSessionEndPayload = (
  raw: unknown,
): {
  hook_event_name: string;
  reason: string | null;
  session_id: string;
} | null => {
  if (!isRecord(raw) || raw.hook_event_name !== 'SessionEnd') {
    return null;
  }
  const sessionId = readString(raw.session_id);
  if (!sessionId) {
    return null;
  }
  return {
    hook_event_name: 'SessionEnd',
    reason: readString(raw.reason),
    session_id: sessionId,
  };
};
