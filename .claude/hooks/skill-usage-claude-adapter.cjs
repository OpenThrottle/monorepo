/**
 * Claude Code adapter for tool-neutral skill-usage capture.
 *
 * Owns the ONE Claude-specific concern: turning a Claude Code hook payload
 * (PreToolUse/Skill + UserPromptExpansion) into the tool-neutral
 * NormalizedInvocation the shared core understands. Everything downstream
 * (scope, privacy, build, persist, GraphQL/JSONL) lives in the shared lib at
 * .agents/hooks/skill-usage/lib.cjs.
 *
 * To add another producer (Cursor, a git hook, …), copy
 * .agents/hooks/skill-usage/adapter.template.cjs — do NOT fork the shared lib.
 */
'use strict';

/** Producer id stamped onto every event this adapter emits. */
const CLAUDE_SOURCE = 'claude-code';

/**
 * Parse a Claude Code hook payload into a NormalizedInvocation (or null when
 * the payload is not a skill invocation this adapter handles).
 *
 * @param {unknown} raw
 * @returns {{
 *   skill_name: string,
 *   args: unknown,
 *   session_id: string | null,
 *   cwd: string | null,
 *   invocation_path: 'skill_tool' | 'slash',
 *   agent_id?: string,
 *   agent_type?: string,
 *   tool_use_id?: string,
 *   prompt_id?: string,
 *   hook_event_name?: string,
 * } | null}
 */
const normalizeClaudePayload = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const payload = /** @type {Record<string, unknown>} */ (raw);
  const hookEvent =
    typeof payload.hook_event_name === 'string' ? payload.hook_event_name : '';

  if (hookEvent === 'PreToolUse' || payload.tool_name === 'Skill') {
    const toolInput =
      payload.tool_input && typeof payload.tool_input === 'object'
        ? /** @type {Record<string, unknown>} */ (payload.tool_input)
        : {};
    const skillName =
      typeof toolInput.skill === 'string'
        ? toolInput.skill
        : typeof toolInput.name === 'string'
          ? toolInput.name
          : null;
    if (!skillName) {
      return null;
    }
    return {
      skill_name: skillName,
      args: toolInput.args ?? '',
      session_id:
        typeof payload.session_id === 'string' ? payload.session_id : null,
      cwd: typeof payload.cwd === 'string' ? payload.cwd : null,
      invocation_path: 'skill_tool',
      ...(typeof payload.agent_id === 'string'
        ? { agent_id: payload.agent_id }
        : {}),
      ...(typeof payload.agent_type === 'string'
        ? { agent_type: payload.agent_type }
        : {}),
      ...(typeof payload.tool_use_id === 'string'
        ? { tool_use_id: payload.tool_use_id }
        : {}),
      ...(typeof payload.prompt_id === 'string'
        ? { prompt_id: payload.prompt_id }
        : {}),
      hook_event_name: hookEvent || 'PreToolUse',
    };
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
    return {
      skill_name: skillName,
      args:
        typeof payload.command_args === 'string' ? payload.command_args : '',
      session_id:
        typeof payload.session_id === 'string' ? payload.session_id : null,
      cwd: typeof payload.cwd === 'string' ? payload.cwd : null,
      invocation_path: 'slash',
      ...(typeof payload.prompt_id === 'string'
        ? { prompt_id: payload.prompt_id }
        : {}),
      hook_event_name: hookEvent || 'UserPromptExpansion',
    };
  }

  return null;
};

/**
 * Parse a Claude Code `Stop` (or `SubagentStop`) hook payload into the fields
 * the completion emitter needs. These events carry `session_id` but no
 * `tool_use_id`/`skill_name` — correlation is session-scoped, resolved against
 * the start store. Returns null when there is no usable session id.
 *
 * @param {unknown} raw
 * @returns {{ session_id: string, hook_event_name: string } | null}
 */
const normalizeClaudeStopPayload = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const payload = /** @type {Record<string, unknown>} */ (raw);
  const sessionId =
    typeof payload.session_id === 'string' ? payload.session_id.trim() : '';
  if (!sessionId) {
    return null;
  }
  return {
    hook_event_name:
      typeof payload.hook_event_name === 'string'
        ? payload.hook_event_name
        : 'Stop',
    session_id: sessionId,
  };
};

module.exports = {
  CLAUDE_SOURCE,
  normalizeClaudePayload,
  normalizeClaudeStopPayload,
};
