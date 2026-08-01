/**
 * Skill usage capture — shared helpers (Phase 1 + 2b).
 *
 * Event shape (one JSONL line / GraphQL input source):
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
 *
 * Phase 2b sink: POST recordSkillUsage to OT GraphQL (system of record).
 * On post failure/timeout → append local JSONL. Never throw; never block.
 * Future (not built): drain buffered JSONL to the server when it returns.
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
/** Short enough that a dead server never stalls Skill tool use. */
const DEFAULT_POST_TIMEOUT_MS = 750;

const RECORD_SKILL_USAGE_MUTATION = `
mutation RecordSkillUsage($input: RecordSkillUsageInput!) {
  recordSkillUsage(input: $input) {
    id
    skillName
  }
}
`;

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

/**
 * Parse repo `.env` into a plain object (no process.env mutation).
 * @param {string} repoRoot
 * @returns {Record<string, string>}
 */
const readRepoEnvFile = (repoRoot) => {
  /** @type {Record<string, string>} */
  const out = {};
  try {
    const envPath = path.join(repoRoot, '.env');
    if (!fs.existsSync(envPath)) {
      return out;
    }
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const eq = trimmed.indexOf('=');
      if (eq <= 0) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      if (!key) {
        continue;
      }
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }
  } catch (err) {
    logHookError('readRepoEnvFile failed', err);
  }
  return out;
};

/**
 * Load KEY=VALUE pairs from repo `.env` into process.env without overriding
 * keys that are already set (generic fill-in for missing keys only).
 * @param {string} repoRoot
 */
const loadRepoEnv = (repoRoot) => {
  try {
    const fileEnv = readRepoEnvFile(repoRoot);
    for (const [key, value] of Object.entries(fileEnv)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (err) {
    logHookError('loadRepoEnv failed', err);
  }
};

/**
 * Prefer worktree `.env` for OT URL/auth so a stale parent shell (wrong port /
 * pre-mutation schema) cannot divert harness capture away from this repo.
 * Explicit SKILL_USAGE_* overrides still win when set.
 * @param {string | undefined} repoRoot
 * @param {string} key
 * @returns {string}
 */
const resolveOtEnv = (repoRoot, key) => {
  const skillOverride =
    key === 'OPENTHROTTLE_GRAPHQL_URL'
      ? process.env.SKILL_USAGE_GRAPHQL_URL
      : key === 'OPENTHROTTLE_MCP_AUTH_TOKEN'
        ? process.env.SKILL_USAGE_AUTH_TOKEN
        : undefined;
  if (skillOverride && skillOverride.trim()) {
    return skillOverride.trim();
  }

  if (repoRoot) {
    const fromFile = readRepoEnvFile(repoRoot)[key];
    if (fromFile && fromFile.trim()) {
      return fromFile.trim();
    }
  }

  const fromProcess = process.env[key];
  return fromProcess && fromProcess.trim() ? fromProcess.trim() : '';
};

/**
 * Build graphql URL from an env map (file or process).
 * @param {Record<string, string | undefined>} env
 * @returns {string | null}
 */
const graphqlUrlFromEnvMap = (env) => {
  const explicit =
    env.OPENTHROTTLE_GRAPHQL_URL?.trim() ||
    env.OPENTHROTTLE_WORKER_GRAPHQL_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const appUrl = env.OPENTHROTTLE_SERVER_APP_URL?.trim()?.replace(/\/$/, '');
  if (appUrl) {
    return `${appUrl}/graphql`;
  }
  return null;
};

/**
 * Resolve GraphQL endpoint from OT env conventions (same order as workflows).
 * Prefers the worktree `.env` chain as a whole so a stale parent
 * OPENTHROTTLE_GRAPHQL_URL cannot beat this worktree's APP_URL.
 * @param {string} [repoRoot]
 * @returns {string | null}
 */
const resolveGraphqlUrl = (repoRoot) => {
  const skillOverride = process.env.SKILL_USAGE_GRAPHQL_URL?.trim();
  if (skillOverride) {
    return skillOverride.replace(/\/$/, '');
  }

  if (repoRoot) {
    const fromFile = graphqlUrlFromEnvMap(readRepoEnvFile(repoRoot));
    if (fromFile) {
      return fromFile;
    }
  }

  return graphqlUrlFromEnvMap(process.env);
};

/**
 * Auth token for ingest (service account or worker token).
 * @param {string} [repoRoot]
 * @returns {string}
 */
const resolveAuthToken = (repoRoot) =>
  resolveOtEnv(repoRoot, 'OPENTHROTTLE_MCP_AUTH_TOKEN') ||
  resolveOtEnv(repoRoot, 'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN') ||
  '';

/**
 * Map JSONL/snake_case event → RecordSkillUsageInput (camelCase).
 * @param {object} event
 * @returns {Record<string, unknown>}
 */
const toRecordSkillUsageInput = (event) => {
  const input = {
    occurredAt: event.timestamp,
    scope: event.scope,
    skillName: event.skill_name,
  };

  if (event.args !== undefined) {
    input.args = event.args;
  }
  if (event.cwd != null) {
    input.cwd = event.cwd;
  }
  if (event.git_branch != null && event.git_branch !== '') {
    input.gitBranch = event.git_branch;
  }
  if (event.session_id != null) {
    input.sessionId = event.session_id;
  }
  if (event.privacy_level != null) {
    input.privacyLevel = event.privacy_level;
  }
  if (event.invocation_path != null) {
    input.invocationPath = event.invocation_path;
  }
  if (event.hook_event_name != null) {
    input.hookEventName = event.hook_event_name;
  }
  if (event.agent_id != null) {
    input.agentId = event.agent_id;
  }
  if (event.agent_type != null) {
    input.agentType = event.agent_type;
  }
  if (event.tool_use_id != null) {
    input.toolUseId = event.tool_use_id;
  }
  if (event.prompt_id != null) {
    input.promptId = event.prompt_id;
  }

  return input;
};

/**
 * POST one event to recordSkillUsage. Fail-open: never throws to callers
 * that prefer the result object (still may reject if fetch itself throws —
 * callers should catch).
 *
 * @param {object} params
 * @param {object} params.event
 * @param {string} params.graphqlUrl
 * @param {string} [params.authToken]
 * @param {number} [params.timeoutMs]
 * @param {typeof fetch} [params.fetchImpl] — injectable for tests
 * @returns {Promise<{ ok: true, id: string } | { ok: false, reason: string }>}
 */
const postSkillUsageEvent = async ({
  event,
  graphqlUrl,
  authToken = '',
  timeoutMs = DEFAULT_POST_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
}) => {
  if (typeof fetchImpl !== 'function') {
    return { ok: false, reason: 'fetch unavailable' };
  }
  if (!graphqlUrl) {
    return { ok: false, reason: 'missing graphql url' };
  }

  const headers = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response;
  try {
    response = await fetchImpl(graphqlUrl, {
      body: JSON.stringify({
        query: RECORD_SKILL_USAGE_MUTATION,
        variables: { input: toRecordSkillUsageInput(event) },
      }),
      headers,
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason =
      err instanceof Error && err.name === 'TimeoutError'
        ? 'timeout'
        : err instanceof Error
          ? err.message
          : String(err);
    return { ok: false, reason };
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    return {
      ok: false,
      reason: `invalid json (${response.status}): ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  if (payload?.errors?.length) {
    return {
      ok: false,
      reason: payload.errors.map((e) => e.message).join('; '),
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: `http ${response.status}`,
    };
  }

  const id = payload?.data?.recordSkillUsage?.id;
  if (!id) {
    return { ok: false, reason: 'missing recordSkillUsage.id' };
  }

  return { ok: true, id: String(id) };
};

/**
 * Persist to OT server; on any failure append JSONL.
 * Always resolves; never throws.
 *
 * @param {object} params
 * @param {object} params.event
 * @param {string} params.repoRoot
 * @param {string} [params.jsonlPath]
 * @param {number} [params.timeoutMs]
 * @param {typeof fetch} [params.fetchImpl]
 * @param {string} [params.graphqlUrl] — override env resolution (tests)
 * @param {string} [params.authToken] — override env resolution (tests)
 * @returns {Promise<{ sink: 'server' | 'jsonl', detail?: string, id?: string }>}
 */
const persistUsageEvent = async ({
  event,
  repoRoot,
  jsonlPath,
  timeoutMs,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride,
}) => {
  const outPath = jsonlPath || defaultJsonlPath(repoRoot);

  if (process.env.SKILL_USAGE_DISABLE_SERVER === '1') {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('jsonl append failed', err);
    }
    return { sink: 'jsonl', detail: 'SKILL_USAGE_DISABLE_SERVER=1' };
  }

  const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);

  if (!graphqlUrl) {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('jsonl append failed', err);
    }
    return { sink: 'jsonl', detail: 'missing graphql url' };
  }

  const resolvedTimeout =
    timeoutMs ??
    (Number(process.env.SKILL_USAGE_POST_TIMEOUT_MS) ||
      DEFAULT_POST_TIMEOUT_MS);

  try {
    const result = await postSkillUsageEvent({
      authToken,
      event,
      fetchImpl,
      graphqlUrl,
      timeoutMs: resolvedTimeout,
    });

    if (result.ok) {
      return { sink: 'server', id: result.id };
    }

    logHookError(`server post failed; falling back to jsonl (${result.reason})`);
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('jsonl append failed', err);
    }
    return { sink: 'jsonl', detail: result.reason };
  } catch (err) {
    logHookError('persistUsageEvent failed', err);
    try {
      appendJsonl(outPath, event);
    } catch (appendErr) {
      logHookError('jsonl append failed', appendErr);
    }
    return {
      sink: 'jsonl',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
};

module.exports = {
  DEFAULT_ARGS_MAX_LEN,
  DEFAULT_JSONL_REL,
  DEFAULT_POST_TIMEOUT_MS,
  DEFAULT_PRIVACY_LEVEL,
  PRIVACY_LEVELS,
  RECORD_SKILL_USAGE_MUTATION,
  appendJsonl,
  applyPrivacy,
  buildUsageEvent,
  defaultJsonlPath,
  detectScope,
  loadRepoEnv,
  logHookError,
  normalizeHookPayload,
  persistUsageEvent,
  postSkillUsageEvent,
  graphqlUrlFromEnvMap,
  readRepoEnvFile,
  redactSecrets,
  resolveAuthToken,
  resolveGitBranch,
  resolveGraphqlUrl,
  resolveOtEnv,
  toRecordSkillUsageInput,
};
