/**
 * Codex adapter — turns a Codex CLI hook payload into the tool-neutral
 * NormalizedInvocation.
 *
 * Written against payloads captured from `codex-cli 0.145.0`; see
 * `docs/monorepo/codex-cli-hook-probe.md` and the committed fixtures in
 * `__tests__/fixtures/`.
 *
 * Codex's hook payloads are Claude-shaped — `hook_event_name`, `session_id`,
 * `cwd`, `transcript_path`, plus a Codex-only `turn_id` — and its event names
 * are Claude's (`PreToolUse`, `UserPromptSubmit`, `SessionStart`, `SessionEnd`,
 * …). The config that wires them is TOML in `~/.codex/config.toml` rather than
 * JSON in the repo, which is a delivery difference, not a payload one.
 *
 * **Capture is the slash-command path only, deliberately.** Codex's
 * `PreToolUse` payload carries `tool_name` and `tool_input`, so a tool-shaped
 * skill invocation would be observable in principle — but which `tool_name` a
 * skill actually produces has NOT been captured, and a normalizer written
 * against a guessed tool name cannot tell "not a skill invocation" from "the
 * shape changed underneath us". That is the exact bug the Cursor adapter had.
 * The branch is omitted until a real payload can be captured rather than
 * shipped on a guess. See the probe doc for what is still open.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import type { NormalizedInvocation } from '../../types';

/** Producer id stamped onto every event this adapter emits. @public */
export const CODEX_SOURCE = 'codex';

/** Matches a prompt that opens with `/<command-name>`, capturing the name. */
const SLASH_COMMAND_PATTERN = /^\s*\/([A-Za-z0-9][\w.:-]*)\s*([\s\S]*)$/;

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null;

/**
 * Parse a Codex hook payload into a NormalizedInvocation, or null when the
 * payload is not a skill invocation this adapter handles.
 *
 * @public
 */
export const normalizeCodexPayload = (
  raw: unknown,
): NormalizedInvocation | null => {
  if (!isRecord(raw) || raw.hook_event_name !== 'UserPromptSubmit') {
    return null;
  }

  const prompt = readString(raw.prompt);
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
    cwd: readString(raw.cwd),
    hook_event_name: 'UserPromptSubmit',
    invocation_path: 'slash',
    session_id: readString(raw.session_id),
    skill_name: skillName,
  };
  const turnId = readString(raw.turn_id);
  if (turnId) {
    // Codex's per-turn id is the closest analogue to a tool_use_id and is what
    // makes a start correlatable with its outcome inside one session.
    normalized.tool_use_id = turnId;
  }
  return normalized;
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
