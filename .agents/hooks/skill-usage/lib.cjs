/**
 * Skill usage capture — tool-neutral shared core.
 *
 * This library knows nothing about any specific agent/editor. Each tool ships
 * a thin adapter (see .agents/hooks/skill-usage/README.md + adapter.template.cjs
 * and .claude/hooks/skill-usage-capture.cjs) that:
 *   1. parses ITS OWN native hook payload into a NormalizedInvocation, and
 *   2. calls buildUsageEvent({ normalized, source, repoRoot }) → persistUsageEvent.
 * `source` is the producer id (e.g. "claude-code", "cursor") so events stay
 * attributable per tool.
 *
 * NormalizedInvocation (the producer contract — what an adapter must supply):
 *   { skill_name, args, session_id, cwd, invocation_path,
 *     …optional agent_id/agent_type/tool_use_id/prompt_id/hook_event_name }
 *
 * Event shape (one JSONL line / GraphQL input source):
 *   { timestamp, source, skill_name, args, session_id, cwd, git_branch, scope,
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
 * Buffered JSONL is drained back to the server by drainBufferedUsage /
 * drainJsonlFile (triggered opportunistically from the Stop hook and via the
 * skill-usage-drain.cjs CLI).
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
const DEFAULT_OUTCOMES_JSONL_REL = path.join(
  '.cache',
  'skill-usage',
  'outcomes.jsonl',
);
/**
 * Session-scoped start-correlation store. One file per session; each line is an
 * identifiers-only start entry (NO args) the completion hook reads to compute
 * duration and to mark unresolved starts as abandoned.
 */
const DEFAULT_STARTS_DIR_REL = path.join('.cache', 'skill-usage', 'starts');
/** Short enough that a dead server never stalls Skill tool use. */
const DEFAULT_POST_TIMEOUT_MS = 750;
/**
 * A start-correlation file older than this whose session is not the current one
 * is considered abandoned (its session ended without a Stop, e.g. a killed run).
 * Default 6h; override via SKILL_USAGE_ABANDONED_MS.
 */
const DEFAULT_ABANDONED_MS = 6 * 60 * 60 * 1000;

const SKILL_USAGE_OUTCOMES = Object.freeze({
  ABANDONED: 'abandoned',
  ERROR: 'error',
  SUCCESS: 'success',
});

const RECORD_SKILL_USAGE_MUTATION = `
mutation RecordSkillUsage($input: RecordSkillUsageInput!) {
  recordSkillUsage(input: $input) {
    id
    skillName
  }
}
`;

const RECORD_SKILL_USAGE_OUTCOME_MUTATION = `
mutation RecordSkillUsageOutcome($input: RecordSkillUsageOutcomeInput!) {
  recordSkillUsageOutcome(input: $input) {
    id
    skillName
    outcome
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
 * Build a tool-neutral usage event from an adapter's NormalizedInvocation.
 *
 * @param {object} params
 * @param {{
 *   skill_name: string | null,
 *   args?: unknown,
 *   session_id?: string | null,
 *   cwd?: string | null,
 *   invocation_path?: string | null,
 *   agent_id?: string,
 *   agent_type?: string,
 *   tool_use_id?: string,
 *   prompt_id?: string,
 *   hook_event_name?: string,
 *   source?: string,
 * } | null} params.normalized
 * @param {string} params.repoRoot
 * @param {string} [params.source] — producer id (e.g. "claude-code"); falls
 *   back to normalized.source when omitted.
 * @param {'name-only' | 'truncated' | 'full'} [params.privacyLevel]
 * @param {string} [params.timestamp]
 * @param {string} [params.gitBranch]
 */
const buildUsageEvent = ({
  normalized,
  repoRoot,
  source,
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
  const resolvedSource = source ?? normalized.source ?? null;

  return {
    args,
    cwd,
    git_branch: gitBranch ?? resolveGitBranch(repoRoot),
    invocation_path: normalized.invocation_path ?? null,
    privacy_level: privacyLevel,
    ...(resolvedSource ? { source: resolvedSource } : {}),
    ...(normalized.agent_id ? { agent_id: normalized.agent_id } : {}),
    ...(normalized.agent_type ? { agent_type: normalized.agent_type } : {}),
    ...(normalized.tool_use_id ? { tool_use_id: normalized.tool_use_id } : {}),
    ...(normalized.prompt_id ? { prompt_id: normalized.prompt_id } : {}),
    ...(normalized.hook_event_name
      ? { hook_event_name: normalized.hook_event_name }
      : {}),
    scope,
    session_id: normalized.session_id ?? null,
    skill_name: normalized.skill_name,
    timestamp,
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
 * @param {string} repoRoot
 * @returns {string}
 */
const defaultOutcomesJsonlPath = (repoRoot) =>
  path.join(repoRoot, DEFAULT_OUTCOMES_JSONL_REL);

/**
 * @param {string} repoRoot
 * @returns {string}
 */
const defaultStartsDir = (repoRoot) =>
  path.join(repoRoot, DEFAULT_STARTS_DIR_REL);

/**
 * A session id is used as a filename; keep it filesystem-safe.
 * @param {unknown} sessionId
 * @returns {string}
 */
const sanitizeSessionId = (sessionId) =>
  String(sessionId).replace(/[^A-Za-z0-9._-]/g, '-');

/**
 * @param {string} startsDir
 * @param {string} sessionId
 * @returns {string}
 */
const startsFilePathForSession = (startsDir, sessionId) =>
  path.join(startsDir, `${sanitizeSessionId(sessionId)}.jsonl`);

/**
 * Stable key for a start entry — the dedupe / drain unit. Prefers tool_use_id
 * (unique per Skill-tool invocation) and falls back to started_at so repeated
 * invocations of the same slash skill in one session stay distinct.
 * @param {{ session_id?: string, skill_name?: string, tool_use_id?: string | null, started_at?: string } | null | undefined} entry
 * @returns {string}
 */
const startCorrelationKey = (entry) => {
  const sid = entry?.session_id ?? '';
  const skill = entry?.skill_name ?? '';
  const disc = entry?.tool_use_id || entry?.started_at || '';
  return `${sid}::${skill}::${disc}`;
};

/**
 * Record a start-correlation entry so a later completion hook can compute
 * duration and correlate precisely. Persists identifiers + timestamp ONLY (no
 * args) under `.cache/skill-usage/starts/<session_id>.jsonl`. Fail-open; skips
 * (does not error) when session_id or skill_name is missing — a start with no
 * session can never be correlated by the session-scoped completion hook.
 *
 * @param {object} params
 * @param {string} params.repoRoot
 * @param {string | null | undefined} params.sessionId
 * @param {string | null | undefined} params.skillName
 * @param {string | null} [params.toolUseId]
 * @param {string | null} [params.scope]
 * @param {string} [params.startedAt]
 * @param {string} [params.startsDir] — override (tests)
 * @returns {{ ok: true, path: string } | { ok: false, reason: string }}
 */
const recordSkillStart = ({
  repoRoot,
  sessionId,
  skillName,
  toolUseId = null,
  scope = null,
  startedAt = new Date().toISOString(),
  startsDir,
}) => {
  try {
    const sid = typeof sessionId === 'string' ? sessionId.trim() : '';
    const name = typeof skillName === 'string' ? skillName.trim() : '';
    if (!sid || !name) {
      return { ok: false, reason: 'missing session_id or skill_name' };
    }
    const dir = startsDir || defaultStartsDir(repoRoot);
    const filePath = startsFilePathForSession(dir, sid);
    appendJsonl(filePath, {
      scope: scope ?? null,
      session_id: sid,
      skill_name: name,
      started_at: startedAt,
      tool_use_id: toolUseId ?? null,
    });
    return { ok: true, path: filePath };
  } catch (err) {
    logHookError('recordSkillStart failed', err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
};

/**
 * List open start-correlation entries for a session. Missing file → []; malformed
 * lines are skipped. Fail-open (never throws).
 *
 * @param {object} params
 * @param {string} params.repoRoot
 * @param {string | null | undefined} params.sessionId
 * @param {string} [params.startsDir]
 * @returns {Array<Record<string, unknown>>}
 */
const listStartsForSession = ({ repoRoot, sessionId, startsDir }) => {
  try {
    const sid = typeof sessionId === 'string' ? sessionId.trim() : '';
    if (!sid) {
      return [];
    }
    const dir = startsDir || defaultStartsDir(repoRoot);
    const filePath = startsFilePathForSession(dir, sid);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const text = fs.readFileSync(filePath, 'utf8');
    /** @type {Array<Record<string, unknown>>} */
    const out = [];
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          out.push(parsed);
        }
      } catch {
        // skip malformed correlation line
      }
    }
    return out;
  } catch (err) {
    logHookError('listStartsForSession failed', err);
    return [];
  }
};

/**
 * Drain resolved starts for a session. When `resolvedKeys` (a Set of
 * startCorrelationKey values) is provided, only matching entries are removed and
 * the rest are retained; when omitted, every entry is drained. The session file
 * is unlinked once no entries remain. Fail-open; returns the count drained.
 *
 * NOTE: the retain path is a read-modify-write; a start appended concurrently
 * between read and rewrite could be lost. Acceptable here — Stop fires at most
 * once per turn, so concurrent writers to a single session file are unlikely.
 *
 * @param {object} params
 * @param {string} params.repoRoot
 * @param {string | null | undefined} params.sessionId
 * @param {Set<string>} [params.resolvedKeys]
 * @param {string} [params.startsDir]
 * @returns {number}
 */
const drainStartsForSession = ({
  repoRoot,
  sessionId,
  resolvedKeys,
  startsDir,
}) => {
  try {
    const sid = typeof sessionId === 'string' ? sessionId.trim() : '';
    if (!sid) {
      return 0;
    }
    const dir = startsDir || defaultStartsDir(repoRoot);
    const filePath = startsFilePathForSession(dir, sid);
    if (!fs.existsSync(filePath)) {
      return 0;
    }
    const entries = listStartsForSession({
      repoRoot,
      sessionId: sid,
      startsDir: dir,
    });
    if (!resolvedKeys) {
      fs.rmSync(filePath, { force: true });
      return entries.length;
    }
    /** @type {Array<Record<string, unknown>>} */
    const keep = [];
    let drained = 0;
    for (const entry of entries) {
      if (resolvedKeys.has(startCorrelationKey(entry))) {
        drained += 1;
      } else {
        keep.push(entry);
      }
    }
    if (keep.length === 0) {
      fs.rmSync(filePath, { force: true });
    } else {
      fs.writeFileSync(
        filePath,
        `${keep.map((e) => JSON.stringify(e)).join('\n')}\n`,
        'utf8',
      );
    }
    return drained;
  } catch (err) {
    logHookError('drainStartsForSession failed', err);
    return 0;
  }
};

/**
 * Build an outcome enrichment event for our skills (Phase 4).
 * Opt-in / additive — never a replacement for harness start capture.
 *
 * @param {object} params
 * @param {string} params.skillName
 * @param {'success' | 'abandoned' | 'error'} params.outcome
 * @param {string} params.repoRoot
 * @param {string | null} [params.sessionId]
 * @param {string | null} [params.toolUseId]
 * @param {number | null} [params.durationMs]
 * @param {string} [params.timestamp]
 * @param {string} [params.gitBranch]
 * @param {string | null} [params.cwd]
 * @returns {object | null}
 */
const buildOutcomeEvent = ({
  skillName,
  outcome,
  repoRoot,
  sessionId = null,
  toolUseId = null,
  durationMs = null,
  timestamp = new Date().toISOString(),
  gitBranch,
  cwd,
}) => {
  const name = typeof skillName === 'string' ? skillName.trim() : '';
  if (!name) {
    return null;
  }
  if (
    outcome !== SKILL_USAGE_OUTCOMES.SUCCESS &&
    outcome !== SKILL_USAGE_OUTCOMES.ABANDONED &&
    outcome !== SKILL_USAGE_OUTCOMES.ERROR
  ) {
    return null;
  }

  const scope = detectScope(name, repoRoot);
  const resolvedCwd = cwd || repoRoot;
  const resolvedDuration =
    durationMs == null || Number.isNaN(Number(durationMs))
      ? null
      : Math.max(0, Math.round(Number(durationMs)));

  return {
    cwd: resolvedCwd,
    duration_ms: resolvedDuration,
    event_kind: 'outcome',
    git_branch: gitBranch ?? resolveGitBranch(repoRoot),
    outcome,
    scope,
    session_id: sessionId,
    skill_name: name,
    timestamp,
    tool_use_id: toolUseId,
  };
};

/**
 * Map outcome event → RecordSkillUsageOutcomeInput (camelCase).
 * @param {object} event
 * @returns {Record<string, unknown>}
 */
const toRecordSkillUsageOutcomeInput = (event) => {
  const input = {
    occurredAt: event.timestamp,
    outcome: event.outcome,
    skillName: event.skill_name,
  };

  if (event.scope != null) {
    input.scope = event.scope;
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
  if (event.tool_use_id != null) {
    input.toolUseId = event.tool_use_id;
  }
  if (event.duration_ms != null) {
    input.durationMs = event.duration_ms;
  }

  return input;
};

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

  if (event.source != null) {
    input.source = event.source;
  }
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

  return { id: String(id), ok: true };
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
    return { detail: 'SKILL_USAGE_DISABLE_SERVER=1', sink: 'jsonl' };
  }

  const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);

  if (!graphqlUrl) {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('jsonl append failed', err);
    }
    return { detail: 'missing graphql url', sink: 'jsonl' };
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
      return { id: result.id, sink: 'server' };
    }

    logHookError(
      `server post failed; falling back to jsonl (${result.reason})`,
    );
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('jsonl append failed', err);
    }
    return { detail: result.reason, sink: 'jsonl' };
  } catch (err) {
    logHookError('persistUsageEvent failed', err);
    try {
      appendJsonl(outPath, event);
    } catch (appendErr) {
      logHookError('jsonl append failed', appendErr);
    }
    return {
      detail: err instanceof Error ? err.message : String(err),
      sink: 'jsonl',
    };
  }
};

/**
 * POST one outcome to recordSkillUsageOutcome. Fail-open result object.
 *
 * @param {object} params
 * @param {object} params.event
 * @param {string} params.graphqlUrl
 * @param {string} [params.authToken]
 * @param {number} [params.timeoutMs]
 * @param {typeof fetch} [params.fetchImpl]
 * @returns {Promise<{ ok: true, id: string } | { ok: false, reason: string }>}
 */
const postSkillUsageOutcome = async ({
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
        query: RECORD_SKILL_USAGE_OUTCOME_MUTATION,
        variables: { input: toRecordSkillUsageOutcomeInput(event) },
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

  const id = payload?.data?.recordSkillUsageOutcome?.id;
  if (!id) {
    return { ok: false, reason: 'missing recordSkillUsageOutcome.id' };
  }

  return { id: String(id), ok: true };
};

/**
 * Persist outcome to OT server; on any failure append outcomes JSONL.
 * Always resolves; never throws.
 *
 * @param {object} params
 * @param {object} params.event
 * @param {string} params.repoRoot
 * @param {string} [params.jsonlPath]
 * @param {number} [params.timeoutMs]
 * @param {typeof fetch} [params.fetchImpl]
 * @param {string} [params.graphqlUrl]
 * @param {string} [params.authToken]
 * @returns {Promise<{ sink: 'server' | 'jsonl', detail?: string, id?: string }>}
 */
const persistOutcomeEvent = async ({
  event,
  repoRoot,
  jsonlPath,
  timeoutMs,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride,
}) => {
  const outPath = jsonlPath || defaultOutcomesJsonlPath(repoRoot);

  if (process.env.SKILL_USAGE_DISABLE_SERVER === '1') {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('outcome jsonl append failed', err);
    }
    return { detail: 'SKILL_USAGE_DISABLE_SERVER=1', sink: 'jsonl' };
  }

  const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);

  if (!graphqlUrl) {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('outcome jsonl append failed', err);
    }
    return { detail: 'missing graphql url', sink: 'jsonl' };
  }

  const resolvedTimeout =
    timeoutMs ??
    (Number(process.env.SKILL_USAGE_POST_TIMEOUT_MS) ||
      DEFAULT_POST_TIMEOUT_MS);

  try {
    const result = await postSkillUsageOutcome({
      authToken,
      event,
      fetchImpl,
      graphqlUrl,
      timeoutMs: resolvedTimeout,
    });

    if (result.ok) {
      return { id: result.id, sink: 'server' };
    }

    logHookError(
      `outcome server post failed; falling back to jsonl (${result.reason})`,
    );

    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('outcome jsonl append failed', err);
    }

    return { detail: result.reason, sink: 'jsonl' };
  } catch (err) {
    logHookError('persistOutcomeEvent failed', err);
    try {
      appendJsonl(outPath, event);
    } catch (appendErr) {
      logHookError('outcome jsonl append failed', appendErr);
    }

    return {
      detail: err instanceof Error ? err.message : String(err),
      sink: 'jsonl',
    };
  }
};

/**
 * Automatic completion: resolve the open starts for a session (recorded by the
 * capture path) into outcome events. For each open start compute
 * `duration_ms = finishedAt − started_at`, build a `success` outcome, persist it
 * (server → OT, else outcomes.jsonl), and drain the resolved starts so a repeated
 * Stop fire never double-emits. Deduped by startCorrelationKey. Fail-open —
 * always resolves; individual persist failures fall back to JSONL.
 *
 * @param {object} params
 * @param {string} params.repoRoot
 * @param {string | null | undefined} params.sessionId
 * @param {'success' | 'abandoned' | 'error'} [params.outcome] — classifier (default success)
 * @param {string} [params.finishedAt] — ISO completion time (default now)
 * @param {string} [params.startsDir]
 * @param {string} [params.jsonlPath] — outcomes JSONL override (tests)
 * @param {typeof fetch} [params.fetchImpl]
 * @param {string} [params.graphqlUrl]
 * @param {string} [params.authToken]
 * @param {number} [params.timeoutMs]
 * @returns {Promise<{ resolved: number, results: Array<{ key: string, sink: string, skillName: string, durationMs: number | null }> }>}
 */
const completeOpenStartsForSession = async ({
  repoRoot,
  sessionId,
  outcome = SKILL_USAGE_OUTCOMES.SUCCESS,
  finishedAt = new Date().toISOString(),
  startsDir,
  jsonlPath,
  fetchImpl,
  graphqlUrl,
  authToken,
  timeoutMs,
}) => {
  const starts = listStartsForSession({ repoRoot, sessionId, startsDir });
  if (!starts.length) {
    return { resolved: 0, results: [] };
  }

  const finishMs = Date.parse(finishedAt);
  /** @type {Set<string>} */
  const resolvedKeys = new Set();
  /** @type {Array<{ key: string, sink: string, skillName: string, durationMs: number | null }>} */
  const results = [];

  for (const start of starts) {
    const key = startCorrelationKey(start);
    if (resolvedKeys.has(key)) {
      // duplicate correlation line — count once
      continue;
    }

    const startedMs = Date.parse(String(start.started_at));
    const durationMs =
      Number.isFinite(startedMs) && Number.isFinite(finishMs)
        ? Math.max(0, finishMs - startedMs)
        : null;

    const event = buildOutcomeEvent({
      durationMs,
      outcome,
      repoRoot,
      sessionId:
        typeof start.session_id === 'string' ? start.session_id : sessionId,
      skillName: typeof start.skill_name === 'string' ? start.skill_name : '',
      timestamp: finishedAt,
      toolUseId:
        typeof start.tool_use_id === 'string' ? start.tool_use_id : null,
    });
    if (!event) {
      continue;
    }

    let sink = 'error';
    try {
      const res = await persistOutcomeEvent({
        authToken,
        event,
        fetchImpl,
        graphqlUrl,
        jsonlPath,
        repoRoot,
        timeoutMs,
      });
      sink = res.sink;
    } catch (err) {
      logHookError('completeOpenStartsForSession persist failed', err);
    }

    resolvedKeys.add(key);
    results.push({
      durationMs,
      key,
      sink,
      skillName: event.skill_name,
    });
  }

  drainStartsForSession({ repoRoot, resolvedKeys, sessionId, startsDir });
  return { resolved: resolvedKeys.size, results };
};

/**
 * Sweep abandoned starts: start-correlation files whose session is NOT the
 * current one and whose file mtime is older than `maxAgeMs` (their session
 * ended without a Stop). Emit one `abandoned` outcome (duration null) per open
 * start, then remove the file. Fail-open; returns the count swept.
 *
 * @param {object} params
 * @param {string} params.repoRoot
 * @param {string | null | undefined} [params.currentSessionId]
 * @param {number} [params.maxAgeMs]
 * @param {number} [params.now] — epoch ms (tests)
 * @param {string} [params.startsDir]
 * @param {typeof fetch} [params.fetchImpl]
 * @param {string} [params.graphqlUrl]
 * @param {string} [params.authToken]
 * @param {number} [params.timeoutMs]
 * @param {string} [params.jsonlPath]
 * @returns {Promise<{ swept: number }>}
 */
const sweepAbandonedStarts = async ({
  repoRoot,
  currentSessionId,
  maxAgeMs = DEFAULT_ABANDONED_MS,
  now = Date.now(),
  startsDir,
  fetchImpl,
  graphqlUrl,
  authToken,
  timeoutMs,
  jsonlPath,
}) => {
  const dir = startsDir || defaultStartsDir(repoRoot);
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch {
    return { swept: 0 };
  }

  const currentFile =
    typeof currentSessionId === 'string' && currentSessionId.trim()
      ? `${sanitizeSessionId(currentSessionId.trim())}.jsonl`
      : null;

  let swept = 0;
  for (const file of files) {
    if (!file.endsWith('.jsonl') || file === currentFile) {
      continue;
    }
    const filePath = path.join(dir, file);
    let mtimeMs;
    try {
      mtimeMs = fs.statSync(filePath).mtimeMs;
    } catch {
      continue;
    }
    if (now - mtimeMs < maxAgeMs) {
      continue;
    }

    const sessionId = file.replace(/\.jsonl$/, '');
    const starts = listStartsForSession({
      repoRoot,
      sessionId,
      startsDir: dir,
    });
    const abandonedAt = new Date(mtimeMs).toISOString();
    /** @type {Set<string>} */
    const seen = new Set();
    for (const start of starts) {
      const key = startCorrelationKey(start);
      if (seen.has(key)) {
        continue;
      }
      const event = buildOutcomeEvent({
        durationMs: null,
        outcome: SKILL_USAGE_OUTCOMES.ABANDONED,
        repoRoot,
        sessionId:
          typeof start.session_id === 'string' ? start.session_id : sessionId,
        skillName: typeof start.skill_name === 'string' ? start.skill_name : '',
        timestamp: abandonedAt,
        toolUseId:
          typeof start.tool_use_id === 'string' ? start.tool_use_id : null,
      });
      if (!event) {
        continue;
      }
      try {
        await persistOutcomeEvent({
          authToken,
          event,
          fetchImpl,
          graphqlUrl,
          jsonlPath,
          repoRoot,
          timeoutMs,
        });
      } catch (err) {
        logHookError('sweepAbandonedStarts persist failed', err);
      }
      seen.add(key);
      swept += 1;
    }
    // Remove the stale file whether or not any outcome persisted — its session
    // is over; leaving it would re-sweep forever.
    drainStartsForSession({ repoRoot, sessionId, startsDir: dir });
  }

  return { swept };
};

/**
 * Drain one buffered JSONL file to the server. Concurrent-writer safe via an
 * atomic rename: the live file is renamed to a private `.draining.<pid>`
 * snapshot (so writers immediately start a fresh file), the snapshot is posted
 * line-by-line, and any unsent/deadline-deferred lines are appended BACK to the
 * live file for the next attempt. Malformed lines are logged and dropped.
 * Nothing is lost on server-down (everything retained) and the operation is
 * idempotent — safe to re-run.
 *
 * @param {object} params
 * @param {string} params.filePath
 * @param {(event: object) => Promise<{ ok: boolean, reason?: string }>} params.post
 * @param {number} [params.deadlineMs] — absolute epoch ms; stop posting past it
 * @param {() => number} [params.nowFn]
 * @returns {Promise<{ sent: number, retained: number, skipped: number }>}
 */
const drainJsonlFile = async ({
  filePath,
  post,
  deadlineMs,
  nowFn = Date.now,
}) => {
  const result = { retained: 0, sent: 0, skipped: 0 };
  if (!fs.existsSync(filePath)) {
    return result;
  }

  const snapshotPath = `${filePath}.draining.${process.pid}`;
  try {
    fs.renameSync(filePath, snapshotPath);
  } catch {
    // File vanished or was claimed by a concurrent drainer — nothing to do.
    return result;
  }

  /** @type {string[]} */
  const retain = [];
  try {
    const lines = fs.readFileSync(snapshotPath, 'utf8').split('\n');
    let stopped = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      if (stopped) {
        retain.push(trimmed);
        continue;
      }
      if (deadlineMs != null && nowFn() > deadlineMs) {
        stopped = true;
        retain.push(trimmed);
        continue;
      }
      let event;
      try {
        event = JSON.parse(trimmed);
      } catch {
        result.skipped += 1;
        logHookError('drain: skipping malformed jsonl line');
        continue;
      }
      let ok = false;
      try {
        const res = await post(event);
        ok = Boolean(res && res.ok);
      } catch (err) {
        logHookError('drain: post threw', err);
      }
      if (ok) {
        result.sent += 1;
      } else {
        retain.push(trimmed);
      }
    }
  } catch (err) {
    // Read/parse of the snapshot failed before any post — fold it all back so
    // nothing is lost, then bail.
    logHookError('drainJsonlFile read failed', err);
    try {
      const leftover = fs.readFileSync(snapshotPath, 'utf8');
      if (leftover.trim()) {
        fs.appendFileSync(
          filePath,
          leftover.endsWith('\n') ? leftover : `${leftover}\n`,
          'utf8',
        );
      }
      fs.rmSync(snapshotPath, { force: true });
    } catch (foldErr) {
      logHookError('drain: fold-back failed', foldErr);
    }
    return result;
  }

  try {
    if (retain.length) {
      fs.appendFileSync(filePath, `${retain.join('\n')}\n`, 'utf8');
      result.retained = retain.length;
    }
    fs.rmSync(snapshotPath, { force: true });
  } catch (err) {
    logHookError('drain: finalize failed', err);
  }
  return result;
};

/**
 * Opportunistic/scheduled drain of both buffered files (events + outcomes) to
 * OT. Time-boxed across both files via `budgetMs` so a hook trigger never stalls
 * a turn. Respects SKILL_USAGE_DISABLE_SERVER and a missing GraphQL URL (both →
 * no-op, buffer left intact). Fail-open.
 *
 * @param {object} params
 * @param {string} params.repoRoot
 * @param {string} [params.eventsPath]
 * @param {string} [params.outcomesPath]
 * @param {number | null} [params.budgetMs] — total wall-clock budget (default 500; null = unbounded)
 * @param {typeof fetch} [params.fetchImpl]
 * @param {string} [params.graphqlUrl]
 * @param {string} [params.authToken]
 * @param {number} [params.timeoutMs]
 * @param {() => number} [params.nowFn]
 * @returns {Promise<{ events: { sent: number, retained: number, skipped: number }, outcomes: { sent: number, retained: number, skipped: number } }>}
 */
const drainBufferedUsage = async ({
  repoRoot,
  eventsPath,
  outcomesPath,
  budgetMs = 500,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride,
  timeoutMs,
  nowFn = Date.now,
}) => {
  const empty = () => ({ retained: 0, sent: 0, skipped: 0 });

  if (process.env.SKILL_USAGE_DISABLE_SERVER === '1') {
    return { events: empty(), outcomes: empty() };
  }

  const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
  if (!graphqlUrl) {
    return { events: empty(), outcomes: empty() };
  }
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);
  const resolvedTimeout =
    timeoutMs ??
    (Number(process.env.SKILL_USAGE_POST_TIMEOUT_MS) ||
      DEFAULT_POST_TIMEOUT_MS);
  const deadlineMs = budgetMs == null ? undefined : nowFn() + budgetMs;

  const events = await drainJsonlFile({
    deadlineMs,
    filePath: eventsPath || defaultJsonlPath(repoRoot),
    nowFn,
    post: (event) =>
      postSkillUsageEvent({
        authToken,
        event,
        fetchImpl,
        graphqlUrl,
        timeoutMs: resolvedTimeout,
      }),
  });

  const outcomes = await drainJsonlFile({
    deadlineMs,
    filePath: outcomesPath || defaultOutcomesJsonlPath(repoRoot),
    nowFn,
    post: (event) =>
      postSkillUsageOutcome({
        authToken,
        event,
        fetchImpl,
        graphqlUrl,
        timeoutMs: resolvedTimeout,
      }),
  });

  return { events, outcomes };
};

module.exports = {
  DEFAULT_ABANDONED_MS,
  DEFAULT_ARGS_MAX_LEN,
  DEFAULT_JSONL_REL,
  DEFAULT_OUTCOMES_JSONL_REL,
  DEFAULT_POST_TIMEOUT_MS,
  DEFAULT_PRIVACY_LEVEL,
  DEFAULT_STARTS_DIR_REL,
  PRIVACY_LEVELS,
  RECORD_SKILL_USAGE_MUTATION,
  RECORD_SKILL_USAGE_OUTCOME_MUTATION,
  SKILL_USAGE_OUTCOMES,
  appendJsonl,
  applyPrivacy,
  buildOutcomeEvent,
  buildUsageEvent,
  completeOpenStartsForSession,
  defaultJsonlPath,
  defaultOutcomesJsonlPath,
  defaultStartsDir,
  detectScope,
  drainBufferedUsage,
  drainJsonlFile,
  drainStartsForSession,
  graphqlUrlFromEnvMap,
  listStartsForSession,
  loadRepoEnv,
  logHookError,
  persistOutcomeEvent,
  persistUsageEvent,
  postSkillUsageEvent,
  postSkillUsageOutcome,
  readRepoEnvFile,
  recordSkillStart,
  redactSecrets,
  resolveAuthToken,
  resolveGitBranch,
  resolveGraphqlUrl,
  resolveOtEnv,
  sanitizeSessionId,
  startCorrelationKey,
  startsFilePathForSession,
  sweepAbandonedStarts,
  toRecordSkillUsageInput,
  toRecordSkillUsageOutcomeInput,
};
