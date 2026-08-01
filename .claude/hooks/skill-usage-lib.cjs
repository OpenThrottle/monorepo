/**
 * Skill usage capture — shared helpers (Phase 1).
 *
 * Event shape (one JSONL line):
 *   { timestamp, skill_name, args, session_id, cwd, git_branch, scope,
 *     invocation_path, privacy_level, …optional agent/tool ids }
 *
 * Scope rule (Phase 0):
 *   if name contains ":" → third-party
 *   else if skills/<name>/ exists → ours
 *   else → third-party (skills-lock installs + unknowns)
 *
 * Privacy seam: applyPrivacy(level, args) — default level is "truncated".
 * name-only / full are reachable for a future configurable-privacy plan.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PRIVACY_LEVELS = Object.freeze({
  FULL: 'full',
  NAME_ONLY: 'name-only',
  TRUNCATED: 'truncated',
});

const DEFAULT_PRIVACY_LEVEL = PRIVACY_LEVELS.TRUNCATED;
const DEFAULT_ARGS_MAX_LEN = 256;
const DEFAULT_JSONL_REL = path.join('.cache', 'skill-usage', 'events.jsonl');

const SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._\-+=/]+/gi,
  /\bsk-[A-Za-z0-9]{8,}/gi,
  /\b(password|passwd|pwd|secret|token|api[_-]?key)\s*[=:]\s*\S+/gi,
  /\bAIza[0-9A-Za-z\-_]{20,}/gi,
  /\bghp_[A-Za-z0-9]{20,}/gi,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/gi,
];

/**
 * @param {'name-only' | 'truncated' | 'full'} level
 * @param {unknown} args
 * @param {{ maxLen?: number }} [options]
 * @returns {string | null}
 */
const applyPrivacy = (level, args, options = {}) => {
  const maxLen = options.maxLen ?? DEFAULT_ARGS_MAX_LEN;
  if (level === PRIVACY_LEVELS.NAME_ONLY) {
    return null;
  }

  const asString =
    args == null
      ? ''
      : typeof args === 'string'
        ? args
        : (() => {
            try {
              return JSON.stringify(args);
            } catch {
              return String(args);
            }
          })();

  const redacted = redactSecrets(asString);

  if (level === PRIVACY_LEVELS.FULL) {
    return redacted;
  }

  // Default / truncated
  if (redacted.length <= maxLen) {
    return redacted;
  }
  return `${redacted.slice(0, maxLen)}…`;
};

/**
 * @param {string} value
 * @returns {string}
 */
const redactSecrets = (value) => {
  let out = value;
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    out = out.replace(pattern, '[REDACTED]');
  }
  return out;
};

/**
 * @param {string} skillName
 * @param {string} repoRoot
 * @returns {'ours' | 'third-party'}
 */
const detectScope = (skillName, repoRoot) => {
  if (!skillName || skillName.includes(':')) {
    return 'third-party';
  }

  const authoredDir = path.join(repoRoot, 'skills', skillName);
  try {
    if (fs.existsSync(authoredDir) && fs.statSync(authoredDir).isDirectory()) {
      return 'ours';
    }
  } catch {
    // fail-open → treat as third-party
  }

  return 'third-party';
};

/**
 * @param {unknown} raw
 * @returns {{
 *   skill_name: string | null,
 *   args: unknown,
 *   session_id: string | null,
 *   cwd: string | null,
 *   invocation_path: 'skill_tool' | 'slash' | null,
 *   agent_id?: string,
 *   agent_type?: string,
 *   tool_use_id?: string,
 *   prompt_id?: string,
 *   hook_event_name?: string,
 * } | null}
 */
const normalizeHookPayload = (raw) => {
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
 * @param {string} repoRoot
 * @returns {string}
 */
const resolveGitBranch = (repoRoot) => {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
    }).trim();
  } catch {
    return '';
  }
};

/**
 * @param {object} params
 * @param {ReturnType<typeof normalizeHookPayload>} params.normalized
 * @param {string} params.repoRoot
 * @param {'name-only' | 'truncated' | 'full'} [params.privacyLevel]
 * @param {string} [params.timestamp]
 * @param {string} [params.gitBranch]
 */
const buildUsageEvent = ({
  normalized,
  repoRoot,
  privacyLevel = DEFAULT_PRIVACY_LEVEL,
  timestamp = new Date().toISOString(),
  gitBranch,
}) => {
  if (!normalized || !normalized.skill_name) {
    return null;
  }

  const cwd = normalized.cwd || repoRoot;
  const scope = detectScope(normalized.skill_name, repoRoot);
  const args = applyPrivacy(privacyLevel, normalized.args);

  return {
    timestamp,
    skill_name: normalized.skill_name,
    args,
    session_id: normalized.session_id,
    cwd,
    git_branch: gitBranch ?? resolveGitBranch(repoRoot),
    scope,
    invocation_path: normalized.invocation_path,
    privacy_level: privacyLevel,
    ...(normalized.agent_id ? { agent_id: normalized.agent_id } : {}),
    ...(normalized.agent_type ? { agent_type: normalized.agent_type } : {}),
    ...(normalized.tool_use_id ? { tool_use_id: normalized.tool_use_id } : {}),
    ...(normalized.prompt_id ? { prompt_id: normalized.prompt_id } : {}),
    ...(normalized.hook_event_name
      ? { hook_event_name: normalized.hook_event_name }
      : {}),
  };
};

/**
 * @param {string} jsonlPath
 * @param {object} event
 */
const appendJsonl = (jsonlPath, event) => {
  fs.mkdirSync(path.dirname(jsonlPath), { recursive: true });
  fs.appendFileSync(jsonlPath, `${JSON.stringify(event)}\n`, 'utf8');
};

/**
 * @param {string} repoRoot
 * @returns {string}
 */
const defaultJsonlPath = (repoRoot) => path.join(repoRoot, DEFAULT_JSONL_REL);

/**
 * Best-effort stderr log; never throws.
 * @param {string} message
 * @param {unknown} [err]
 */
const logHookError = (message, err) => {
  try {
    const detail =
      err instanceof Error ? err.message : err != null ? String(err) : '';
    process.stderr.write(
      `[skill-usage-capture] ${message}${detail ? `: ${detail}` : ''}\n`,
    );
  } catch {
    // swallow
  }
};

module.exports = {
  DEFAULT_ARGS_MAX_LEN,
  DEFAULT_JSONL_REL,
  DEFAULT_PRIVACY_LEVEL,
  PRIVACY_LEVELS,
  appendJsonl,
  applyPrivacy,
  buildUsageEvent,
  defaultJsonlPath,
  detectScope,
  logHookError,
  normalizeHookPayload,
  redactSecrets,
  resolveGitBranch,
};
