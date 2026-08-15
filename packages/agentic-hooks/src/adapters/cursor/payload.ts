/**
 * Cursor adapter — turns a Cursor agent hook payload into the tool-neutral
 * NormalizedInvocation. Cursor's skill-invocation payload shape is still
 * settling, so this normalizer is intentionally permissive: it accepts either a
 * Skill-tool-style payload (`skill`/`skill_name`) or a slash-command-style one
 * (`command`/`command_name`), and resolves the session from Cursor's
 * `conversationId`/`session_id` and cwd from `cwd`/`workspaceRoots[0]`.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import type { NormalizedInvocation } from '../../types';

/** Producer id stamped onto every event this adapter emits. @public */
export const CURSOR_SOURCE = 'cursor';

const firstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value) {
      return value;
    }
  }
  return null;
};

const resolveCwd = (payload: Record<string, unknown>): string | null => {
  if (typeof payload.cwd === 'string') {
    return payload.cwd;
  }
  if (
    Array.isArray(payload.workspaceRoots) &&
    typeof payload.workspaceRoots[0] === 'string'
  ) {
    return payload.workspaceRoots[0];
  }
  return null;
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

  const skillFromTool = firstString(raw.skill, raw.skill_name);
  const commandName = firstString(raw.command, raw.command_name);
  const skillName = skillFromTool ?? commandName;
  if (!skillName) {
    return null;
  }

  const sessionId = firstString(raw.conversationId, raw.session_id);

  const normalized: NormalizedInvocation = {
    args: raw.args ?? raw.command_args ?? '',
    cwd: resolveCwd(raw),
    hook_event_name:
      typeof raw.hook_event_name === 'string' ? raw.hook_event_name : 'cursor',
    invocation_path: skillFromTool ? 'skill_tool' : 'slash',
    session_id: sessionId,
    skill_name: skillName,
  };
  return normalized;
};
