/**
 * Claude Code adapter — the ONE Claude-specific concern: turning a Claude Code
 * hook payload (PreToolUse/Skill + UserPromptExpansion, or a Stop/SubagentStop)
 * into the tool-neutral shapes the shared core understands. Everything
 * downstream lives in the package core.
 */
import type { NormalizedInvocation } from '../../types';

/** Producer id stamped onto every event this adapter emits. @public */
export const CLAUDE_SOURCE = 'claude-code';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object';

/**
 * Parse a Claude Code hook payload into a NormalizedInvocation, or null when
 * the payload is not a skill invocation this adapter handles.
 *
 * @public
 */
export const normalizeClaudePayload = (
  raw: unknown,
): NormalizedInvocation | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const payload = raw;
  const hookEvent =
    typeof payload.hook_event_name === 'string' ? payload.hook_event_name : '';

  if (hookEvent === 'PreToolUse' || payload.tool_name === 'Skill') {
    const toolInput = isRecord(payload.tool_input) ? payload.tool_input : {};
    const skillName =
      typeof toolInput.skill === 'string'
        ? toolInput.skill
        : typeof toolInput.name === 'string'
          ? toolInput.name
          : null;
    if (!skillName) {
      return null;
    }
    const normalized: NormalizedInvocation = {
      args: toolInput.args ?? '',
      cwd: typeof payload.cwd === 'string' ? payload.cwd : null,
      hook_event_name: hookEvent || 'PreToolUse',
      invocation_path: 'skill_tool',
      session_id:
        typeof payload.session_id === 'string' ? payload.session_id : null,
      skill_name: skillName,
    };
    if (typeof payload.agent_id === 'string') {
      normalized.agent_id = payload.agent_id;
    }
    if (typeof payload.agent_type === 'string') {
      normalized.agent_type = payload.agent_type;
    }
    if (typeof payload.tool_use_id === 'string') {
      normalized.tool_use_id = payload.tool_use_id;
    }
    if (typeof payload.prompt_id === 'string') {
      normalized.prompt_id = payload.prompt_id;
    }
    return normalized;
  }

  if (
    hookEvent === 'UserPromptExpansion' ||
    payload.expansion_type === 'slash_command'
  ) {
    const skillName =
      typeof payload.command_name === 'string' ? payload.command_name : null;
    if (!skillName) {
      return null;
    }
    const normalized: NormalizedInvocation = {
      args:
        typeof payload.command_args === 'string' ? payload.command_args : '',
      cwd: typeof payload.cwd === 'string' ? payload.cwd : null,
      hook_event_name: hookEvent || 'UserPromptExpansion',
      invocation_path: 'slash',
      session_id:
        typeof payload.session_id === 'string' ? payload.session_id : null,
      skill_name: skillName,
    };
    if (typeof payload.prompt_id === 'string') {
      normalized.prompt_id = payload.prompt_id;
    }
    return normalized;
  }

  return null;
};

/**
 * Parse a Claude Code `Stop`/`SubagentStop` payload into the fields the
 * completion emitter needs (session-scoped correlation). Returns null when
 * there is no usable session id.
 *
 * @public
 */
export const normalizeClaudeStopPayload = (
  raw: unknown,
): { hook_event_name: string; session_id: string } | null => {
  if (!isRecord(raw)) {
    return null;
  }
  const sessionId =
    typeof raw.session_id === 'string' ? raw.session_id.trim() : '';
  if (!sessionId) {
    return null;
  }
  return {
    hook_event_name:
      typeof raw.hook_event_name === 'string' ? raw.hook_event_name : 'Stop',
    session_id: sessionId,
  };
};
