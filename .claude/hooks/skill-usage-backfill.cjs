#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/backfill.ts
 * Regenerate: pnpm nx run @openthrottle/agentic-hooks:bundle-hooks
 * Authoring lives in @openthrottle/agentic-hooks; this file is a bundle.
 * ----------------------------------------------------------------------
 */

"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// packages/agentic-hooks/src/data/jsonl.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/config/env.ts
var import_node_child_process = require("node:child_process");
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_os = __toESM(require("node:os"), 1);
var import_node_path = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/utils/logging.ts
var logHookError = (message, err) => {
  try {
    const detail = err instanceof Error ? err.message : err != null ? String(err) : "";
    process.stderr.write(
      `[skill-usage-capture] ${message}${detail ? `: ${detail}` : ""}
`
    );
  } catch {
  }
};

// packages/agentic-hooks/src/config/env.ts
var userConfigDir = () => import_node_path.default.join(import_node_os.default.homedir(), ".openthrottle");
var OT_MARKER_REL = import_node_path.default.join(
  "applications",
  "openthrottle-server",
  "package.json"
);
var OT_MARKER_NAME = "openthrottle-server";
var checkoutCache = /* @__PURE__ */ new Map();
var isOpenThrottleCheckout = (repoRoot) => {
  if (!repoRoot) {
    return false;
  }
  const cached = checkoutCache.get(repoRoot);
  if (cached !== void 0) {
    return cached;
  }
  let match = false;
  try {
    const markerPath = import_node_path.default.join(repoRoot, OT_MARKER_REL);
    if (import_node_fs.default.existsSync(markerPath)) {
      const parsed = JSON.parse(import_node_fs.default.readFileSync(markerPath, "utf8"));
      match = typeof parsed === "object" && parsed !== null && "name" in parsed && parsed.name === OT_MARKER_NAME;
    }
  } catch {
    match = false;
  }
  checkoutCache.set(repoRoot, match);
  return match;
};
var resolveGitBranch = (repoRoot) => {
  try {
    return (0, import_node_child_process.execFileSync)("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2e3
    }).trim();
  } catch {
    return "";
  }
};
var readEnvFile = (envPath) => {
  const out = {};
  try {
    if (!import_node_fs.default.existsSync(envPath)) {
      return out;
    }
    const text = import_node_fs.default.readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq <= 0) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      if (!key) {
        continue;
      }
      let value = trimmed.slice(eq + 1).trim();
      if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }
  } catch (err) {
    logHookError("readEnvFile failed", err);
  }
  return out;
};
var readRepoEnvFile = (repoRoot) => isOpenThrottleCheckout(repoRoot) ? readEnvFile(import_node_path.default.join(repoRoot, ".env")) : {};
var readUserEnvFile = () => readEnvFile(import_node_path.default.join(userConfigDir(), ".env"));
var envLayers = (repoRoot, options) => [
  repoRoot ? readRepoEnvFile(repoRoot) : {},
  ...options?.includeProcessEnv === false ? [] : [process.env],
  readUserEnvFile()
];
var resolveOtEnv = (repoRoot, key, options) => {
  for (const layer of envLayers(repoRoot, options)) {
    const value = layer[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return "";
};
var LOOPBACK_AUTHORITY = /^([a-z][a-z0-9+.-]*:\/\/(?:[^/?#@]*@)?)localhost(?=[:/?#]|$)/i;
var normalizeLoopbackHost = (url) => url.replace(LOOPBACK_AUTHORITY, "$1127.0.0.1");
var graphqlUrlFromEnvMap = (env) => {
  const explicit = env.OPENTHROTTLE_GRAPHQL_URL?.trim() || env.OPENTHROTTLE_WORKER_GRAPHQL_URL?.trim();
  if (explicit) {
    return normalizeLoopbackHost(explicit.replace(/\/$/, ""));
  }
  const appUrl = env.OPENTHROTTLE_SERVER_APP_URL?.trim()?.replace(/\/$/, "");
  if (appUrl) {
    return normalizeLoopbackHost(`${appUrl}/graphql`);
  }
  return null;
};
var resolveGraphqlUrl = (repoRoot, options) => {
  for (const layer of envLayers(repoRoot, options)) {
    const url = graphqlUrlFromEnvMap(layer);
    if (url) {
      return url;
    }
  }
  return null;
};
var resolveAuthToken = (repoRoot, options) => resolveOtEnv(repoRoot, "OPENTHROTTLE_MCP_AUTH_TOKEN", options) || resolveOtEnv(repoRoot, "OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN", options) || "";

// packages/agentic-hooks/src/data/chunk.ts
var chunkByBudget = (items, {
  maxBytes,
  maxItems,
  sizeOf
}) => {
  const itemLimit = Math.max(1, maxItems);
  const out = [];
  let batch = [];
  let batchBytes = 0;
  for (const item of items) {
    const size = sizeOf(item);
    if (batch.length > 0 && (batch.length >= itemLimit || batchBytes + size > maxBytes)) {
      out.push(batch);
      batch = [];
      batchBytes = 0;
    }
    batch.push(item);
    batchBytes += size;
  }
  if (batch.length > 0) {
    out.push(batch);
  }
  return out;
};

// packages/agentic-hooks/src/data/jsonl.ts
var TELEMETRY_DIR_BASENAME = "skill-usage";
var EVENTS_JSONL_BASENAME = "events.jsonl";
var TOKEN_USAGE_JSONL_BASENAME = "token-usage.jsonl";
var resolveTelemetryDir = () => process.env.OPENTHROTTLE_TELEMETRY_DIR?.trim() || import_node_path2.default.join(userConfigDir(), TELEMETRY_DIR_BASENAME);
var appendJsonl = (jsonlPath, event) => {
  import_node_fs2.default.mkdirSync(import_node_path2.default.dirname(jsonlPath), { recursive: true });
  import_node_fs2.default.appendFileSync(jsonlPath, `${JSON.stringify(event)}
`, "utf8");
};
var defaultJsonlPath = () => import_node_path2.default.join(resolveTelemetryDir(), EVENTS_JSONL_BASENAME);
var defaultTokenUsageJsonlPath = () => import_node_path2.default.join(resolveTelemetryDir(), TOKEN_USAGE_JSONL_BASENAME);
var deadLetterPathFor = (filePath) => filePath.replace(/\.jsonl$/, "") + ".dead-letter.jsonl";
var toDeadLetterLine = (record, reason, nowMs) => JSON.stringify({
  dead_lettered_at: new Date(nowMs).toISOString(),
  line: record,
  reason
});
var appendDeadLetters = ({
  filePath,
  nowMs = Date.now(),
  reason,
  records
}) => {
  if (!records.length) {
    return;
  }
  const deadPath = deadLetterPathFor(filePath);
  import_node_fs2.default.mkdirSync(import_node_path2.default.dirname(deadPath), { recursive: true });
  import_node_fs2.default.appendFileSync(
    deadPath,
    `${records.map((record) => toDeadLetterLine(record, reason, nowMs)).join("\n")}
`,
    "utf8"
  );
};

// packages/agentic-hooks/src/config/describe.ts
var TELEMETRY_CONFIG_SOURCES = Object.freeze({
  /** No layer yielded an endpoint. */
  NONE: "none",
  /** The ambient shell. */
  PROCESS_ENV: "process_env",
  /** This checkout's own `.env` — only read in an OpenThrottle checkout. */
  REPO_ENV: "repo_env",
  /** `~/.openthrottle/.env`. */
  USER_ENV: "user_env"
});

// packages/nodejs-utils/src/utils/is-record.ts
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

// packages/agentic-hooks/src/data/checkpoints.ts
var DEFAULT_STALE_CHECKPOINT_MS = 6 * 60 * 60 * 1e3;

// packages/agentic-hooks/src/utils/privacy.ts
var PRIVACY_LEVELS = Object.freeze({
  FULL: "full",
  NAME_ONLY: "name-only",
  TRUNCATED: "truncated"
});
var DEFAULT_PRIVACY_LEVEL = PRIVACY_LEVELS.TRUNCATED;
var FOREIGN_PRIVACY_LEVEL = PRIVACY_LEVELS.NAME_ONLY;
var resolvePrivacyLevel = (repoRoot) => isOpenThrottleCheckout(repoRoot) ? DEFAULT_PRIVACY_LEVEL : FOREIGN_PRIVACY_LEVEL;
var DEFAULT_ARGS_MAX_LEN = 256;
var SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._\-+=/]+/gi,
  /\bsk-[A-Za-z0-9]{8,}/gi,
  /\b(password|passwd|pwd|secret|token|api[_-]?key)\s*[=:]\s*\S+/gi,
  /\bAIza[0-9A-Za-z\-_]{20,}/gi,
  /\bghp_[A-Za-z0-9]{20,}/gi,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/gi
];
var redactSecrets = (value) => {
  let out = value;
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
};
var applyPrivacy = (level, args, options = {}) => {
  const maxLen = options.maxLen ?? DEFAULT_ARGS_MAX_LEN;
  if (level === PRIVACY_LEVELS.NAME_ONLY) {
    return null;
  }
  const asString = args == null ? "" : typeof args === "string" ? args : (() => {
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
  if (redacted.length <= maxLen) {
    return redacted;
  }
  return `${redacted.slice(0, maxLen)}…`;
};

// packages/agentic-hooks/src/utils/scope.ts
var import_node_fs3 = __toESM(require("node:fs"), 1);
var import_node_os2 = __toESM(require("node:os"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
var PERSONAL_SKILLS_DIR_ENV = "OPENTHROTTLE_PERSONAL_SKILLS_DIR";
var SKILL_LINK_DIR = import_node_path3.default.join(".agents", "skills");
var resolvePersonalSkillsRoot = (env) => {
  const override = env[PERSONAL_SKILLS_DIR_ENV]?.trim();
  if (override !== void 0 && override !== "") {
    return override;
  }
  return import_node_path3.default.join(import_node_os2.default.homedir(), ".openthrottle", "skills");
};
var isPathInsideRoot = (root, candidate) => {
  try {
    const realRoot = import_node_fs3.default.realpathSync(root);
    return import_node_fs3.default.realpathSync(candidate).startsWith(`${realRoot}${import_node_path3.default.sep}`);
  } catch {
    return false;
  }
};
var isPersonalSkill = (skillName, repoRoot, env) => {
  const personalRoot = resolvePersonalSkillsRoot(env);
  return isPathInsideRoot(
    personalRoot,
    import_node_path3.default.join(repoRoot, SKILL_LINK_DIR, skillName)
  );
};
var detectScope = (skillName, repoRoot, env = process.env) => {
  if (!skillName || skillName.includes(":")) {
    return "third-party";
  }
  const authoredDir = import_node_path3.default.join(repoRoot, "skills", skillName);
  try {
    if (import_node_fs3.default.existsSync(authoredDir) && import_node_fs3.default.statSync(authoredDir).isDirectory()) {
      return "ours";
    }
  } catch {
  }
  try {
    if (isPersonalSkill(skillName, repoRoot, env)) {
      return "personal";
    }
  } catch {
  }
  return "third-party";
};

// packages/agentic-hooks/src/data/events.ts
var RECORD_SKILL_USAGE_MUTATION = `
mutation RecordSkillUsage($input: RecordSkillUsageInput!) {
  recordSkillUsage(input: $input) {
    id
    skillName
  }
}
`;
var SKILL_USAGE_OUTCOMES = Object.freeze({
  ABANDONED: "abandoned",
  ERROR: "error",
  SESSION_ENDED: "session_ended",
  SUCCESS: "success"
});
var SKILL_USAGE_QUALITY_OUTCOMES = Object.freeze([SKILL_USAGE_OUTCOMES.ERROR, SKILL_USAGE_OUTCOMES.SUCCESS]);
var buildUsageEvent = ({
  normalized,
  repoRoot,
  source,
  privacyLevel,
  timestamp = (/* @__PURE__ */ new Date()).toISOString(),
  gitBranch
}) => {
  if (!normalized || !normalized.skill_name) {
    return null;
  }
  const cwd = normalized.cwd || repoRoot;
  const scope = detectScope(normalized.skill_name, repoRoot);
  const level = privacyLevel ?? resolvePrivacyLevel(repoRoot);
  const args = applyPrivacy(level, normalized.args);
  const resolvedSource = source ?? normalized.source ?? void 0;
  const event = {
    args,
    cwd,
    git_branch: gitBranch ?? resolveGitBranch(repoRoot),
    invocation_path: normalized.invocation_path ?? null,
    privacy_level: level,
    scope,
    session_id: normalized.session_id ?? null,
    skill_name: normalized.skill_name,
    timestamp
  };
  if (resolvedSource) {
    event.source = resolvedSource;
  }
  if (normalized.agent_id) {
    event.agent_id = normalized.agent_id;
  }
  if (normalized.agent_type) {
    event.agent_type = normalized.agent_type;
  }
  if (normalized.tool_use_id) {
    event.tool_use_id = normalized.tool_use_id;
  }
  if (normalized.prompt_id) {
    event.prompt_id = normalized.prompt_id;
  }
  if (normalized.hook_event_name) {
    event.hook_event_name = normalized.hook_event_name;
  }
  return event;
};
var toRecordSkillUsageInput = (event) => {
  const input = {
    occurredAt: event.timestamp,
    scope: event.scope,
    skillName: event.skill_name
  };
  if (event.source != null) {
    input.source = event.source;
  }
  if (event.args !== void 0) {
    input.args = event.args;
  }
  if (event.cwd != null) {
    input.cwd = event.cwd;
  }
  if (event.git_branch != null && event.git_branch !== "") {
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

// packages/agentic-hooks/src/data/graphql.ts
var PERMANENT_GRAPHQL_CODES = [
  "BAD_REQUEST",
  "BAD_USER_INPUT",
  "GRAPHQL_PARSE_FAILED",
  "GRAPHQL_VALIDATION_FAILED"
];
var TRANSIENT_CLIENT_STATUSES = [401, 403, 408, 429];
var isPermanentHttpStatus = (status) => status >= 400 && status < 500 && !TRANSIENT_CLIENT_STATUSES.includes(status);
var readStatusCode = (extensions) => {
  const original = extensions.originalError;
  if (isRecord(original) && typeof original.statusCode === "number") {
    return original.statusCode;
  }
  return null;
};
var readGraphqlErrors = (payload) => {
  if (!isRecord(payload) || !Array.isArray(payload.errors) || !payload.errors.length) {
    return null;
  }
  let permanent = false;
  const messages = [];
  for (const error of payload.errors) {
    if (!isRecord(error)) {
      continue;
    }
    messages.push(typeof error.message === "string" ? error.message : "");
    const extensions = isRecord(error.extensions) ? error.extensions : {};
    const code = typeof extensions.code === "string" ? extensions.code : "";
    const status = readStatusCode(extensions);
    if (PERMANENT_GRAPHQL_CODES.includes(code) || status !== null && isPermanentHttpStatus(status)) {
      permanent = true;
    }
  }
  return { message: messages.join("; "), permanent };
};
var readMutationData = (payload, field) => isRecord(payload) && isRecord(payload.data) ? payload.data[field] : void 0;
var transient = (reason) => ({
  ok: false,
  permanent: false,
  reason
});
var postMutation = async ({
  authToken,
  fetchImpl,
  graphqlUrl,
  query,
  timeoutMs,
  variables,
  field
}) => {
  if (typeof fetchImpl !== "function") {
    return transient("fetch unavailable");
  }
  if (!graphqlUrl) {
    return transient("missing graphql url");
  }
  const headers = {
    "Content-Type": "application/json"
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  let response;
  try {
    response = await fetchImpl(graphqlUrl, {
      body: JSON.stringify({ query, variables }),
      headers,
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError" ? "timeout" : err instanceof Error ? err.message : String(err);
    return transient(reason);
  }
  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    return {
      ok: false,
      permanent: isPermanentHttpStatus(response.status),
      reason: `invalid json (${response.status}): ${err instanceof Error ? err.message : String(err)}`
    };
  }
  const errors = readGraphqlErrors(payload);
  if (errors !== null) {
    return { ok: false, permanent: errors.permanent, reason: errors.message };
  }
  if (!response.ok) {
    return {
      ok: false,
      permanent: isPermanentHttpStatus(response.status),
      reason: `http ${response.status}`
    };
  }
  return { data: readMutationData(payload, field), ok: true };
};
var postGraphqlMutation = async (args) => {
  const posted = await postMutation(args);
  if (!posted.ok) {
    return posted;
  }
  const node = posted.data;
  if (isRecord(node) && node.id != null && String(node.id)) {
    return { id: String(node.id), ok: true };
  }
  return transient(`missing ${args.field}.id`);
};
var postGraphqlMutationNode = async (args) => {
  const posted = await postMutation(args);
  if (!posted.ok) {
    return posted;
  }
  if (!isRecord(posted.data)) {
    return transient(`missing ${args.field}`);
  }
  return { node: posted.data, ok: true };
};

// packages/agentic-hooks/src/data/token-usage.ts
var MAX_TOKEN_USAGE_BATCH = 500;
var MAX_TOKEN_USAGE_BATCH_BYTES = 64 * 1024;
var RECORD_TOKEN_USAGE_MUTATION = `
mutation RecordTokenUsage($input: RecordTokenUsageInput!) {
  recordTokenUsage(input: $input) {
    inserted
    skipped
  }
}
`;
var toRecordTokenUsageRow = (record) => ({
  cacheReadTokens: record.cache_read_tokens,
  cacheWriteTokens: record.cache_write_tokens,
  costUsd: record.cost_usd,
  cwd: record.cwd,
  gitBranch: record.git_branch,
  inputTokens: record.input_tokens,
  model: record.model,
  occurredAt: record.occurred_at,
  outputTokens: record.output_tokens,
  provider: record.provider,
  rawUsageJson: record.raw_usage_json,
  reasoningTokens: record.reasoning_tokens,
  requestId: record.request_id,
  sessionId: record.session_id,
  source: record.source,
  totalTokens: record.total_tokens
});
var tokenUsageRowBytes = (record) => Buffer.byteLength(JSON.stringify(toRecordTokenUsageRow(record)), "utf8");
var chunkTokenUsage = (records, size = MAX_TOKEN_USAGE_BATCH, maxBytes = MAX_TOKEN_USAGE_BATCH_BYTES) => chunkByBudget(records, {
  maxBytes,
  maxItems: Math.min(size, MAX_TOKEN_USAGE_BATCH),
  sizeOf: tokenUsageRowBytes
});
var postTokenUsageBatch = async ({
  records,
  graphqlUrl,
  authToken = "",
  timeoutMs,
  fetchImpl = globalThis.fetch
}) => {
  if (!records.length) {
    return { inserted: 0, ok: true, skipped: 0 };
  }
  if (records.length > MAX_TOKEN_USAGE_BATCH) {
    return {
      ok: false,
      permanent: true,
      reason: `batch of ${records.length} exceeds ${MAX_TOKEN_USAGE_BATCH}`
    };
  }
  const posted = await postGraphqlMutationNode({
    authToken,
    fetchImpl,
    field: "recordTokenUsage",
    graphqlUrl,
    query: RECORD_TOKEN_USAGE_MUTATION,
    timeoutMs,
    variables: { input: { rows: records.map(toRecordTokenUsageRow) } }
  });
  if (!posted.ok) {
    return posted;
  }
  const { inserted, skipped } = posted.node;
  if (typeof inserted !== "number" || typeof skipped !== "number") {
    return {
      ok: false,
      permanent: false,
      reason: "malformed recordTokenUsage result"
    };
  }
  return { inserted, ok: true, skipped };
};

// packages/agentic-hooks/src/data/persist.ts
var forLog = (graphqlUrl) => graphqlUrl.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/?#]*@/i, "$1***@");
var DEFAULT_POST_TIMEOUT_MS = 750;
var DEFAULT_ABANDONED_MS = 6 * 60 * 60 * 1e3;
var postSkillUsageEvent = async ({
  event,
  graphqlUrl,
  authToken = "",
  timeoutMs = DEFAULT_POST_TIMEOUT_MS,
  fetchImpl = globalThis.fetch
}) => {
  return postGraphqlMutation({
    authToken,
    fetchImpl,
    field: "recordSkillUsage",
    graphqlUrl,
    query: RECORD_SKILL_USAGE_MUTATION,
    timeoutMs,
    variables: { input: toRecordSkillUsageInput(event) }
  });
};
var resolveTimeout = (timeoutMs) => timeoutMs ?? (Number(process.env.OPENTHROTTLE_TELEMETRY_TIMEOUT_MS) || DEFAULT_POST_TIMEOUT_MS);
var persistTokenUsage = async ({
  records,
  repoRoot,
  jsonlPath,
  timeoutMs,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride
}) => {
  const outPath = jsonlPath || defaultTokenUsageJsonlPath();
  const tally = { buffered: 0, deadLettered: 0, inserted: 0, skipped: 0 };
  let detail = null;
  const buffer = (unsent) => {
    try {
      for (const record of unsent) {
        appendJsonl(outPath, record);
      }
      tally.buffered += unsent.length;
    } catch (err) {
      logHookError("token usage jsonl append failed", err);
    }
  };
  try {
    const batches = chunkTokenUsage(records);
    if (!batches.length) {
      return { ...tally, detail };
    }
    const offline = process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === "1";
    const graphqlUrl = offline ? null : graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
    if (offline || !graphqlUrl) {
      buffer(records);
      return {
        ...tally,
        detail: offline ? "OPENTHROTTLE_TELEMETRY_OFFLINE=1" : "missing graphql url"
      };
    }
    const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);
    const resolvedTimeout = resolveTimeout(timeoutMs);
    let serverDown = false;
    for (const batch of batches) {
      if (serverDown) {
        buffer(batch);
        continue;
      }
      const res = await postTokenUsageBatch({
        authToken,
        fetchImpl,
        graphqlUrl,
        records: batch,
        timeoutMs: resolvedTimeout
      });
      if (res.ok) {
        tally.inserted += res.inserted;
        tally.skipped += res.skipped;
      } else if (res.permanent) {
        detail = res.reason;
        logHookError(
          `token usage batch rejected; moved to dead-letter (${res.reason}) [endpoint ${forLog(graphqlUrl)}]`
        );
        try {
          appendDeadLetters({
            filePath: outPath,
            reason: res.reason,
            records: batch
          });
          tally.deadLettered += batch.length;
        } catch (err) {
          logHookError("token usage dead-letter append failed", err);
        }
      } else {
        detail = res.reason;
        serverDown = true;
        logHookError(
          `token usage post failed; falling back to jsonl (${res.reason}) [endpoint ${forLog(graphqlUrl)}]`
        );
        buffer(batch);
      }
    }
    return { ...tally, detail };
  } catch (err) {
    logHookError("persistTokenUsage failed", err);
    return {
      ...tally,
      detail: err instanceof Error ? err.message : String(err)
    };
  }
};

// packages/agentic-hooks/src/data/plan-runs.ts
var import_node_path4 = __toESM(require("node:path"), 1);
var PLAN_RUNS_DIR_REL = import_node_path4.default.join(".cache", "plan-runs");
var PLAN_RUN_ABANDONED_MS = 6 * 60 * 60 * 1e3;

// packages/agentic-hooks/src/data/read-new-bytes.ts
var import_node_fs4 = __toESM(require("node:fs"), 1);
var NEWLINE = 10;
var readNewBytes = ({
  filePath,
  maxBytes,
  offset
}) => {
  const unchanged = { lines: [], nextOffset: offset };
  let fd = null;
  try {
    fd = import_node_fs4.default.openSync(filePath, "r");
    const { size } = import_node_fs4.default.fstatSync(fd);
    const start = offset > size || offset < 0 ? 0 : offset;
    if (size === start) {
      return { lines: [], nextOffset: start };
    }
    const remaining = size - start;
    let window = maxBytes !== void 0 && maxBytes > 0 ? Math.min(remaining, Math.floor(maxBytes)) : remaining;
    let buffer = Buffer.alloc(0);
    let lastNewline = -1;
    while (lastNewline < 0) {
      buffer = Buffer.alloc(window);
      const bytesRead = import_node_fs4.default.readSync(fd, buffer, 0, window, start);
      lastNewline = buffer.subarray(0, bytesRead).lastIndexOf(NEWLINE);
      if (window >= remaining) {
        break;
      }
      window = Math.min(remaining, window * 2);
    }
    if (lastNewline < 0) {
      return { lines: [], nextOffset: start };
    }
    const lines = buffer.subarray(0, lastNewline).toString("utf8").split("\n").map((line) => line.replace(/\r$/, "")).filter((line) => line.trim() !== "");
    return { lines, nextOffset: start + lastNewline + 1 };
  } catch (err) {
    if (!(err instanceof Error && "code" in err && err.code === "ENOENT")) {
      logHookError("readNewBytes failed", err);
    }
    return unchanged;
  } finally {
    if (fd !== null) {
      try {
        import_node_fs4.default.closeSync(fd);
      } catch {
      }
    }
  }
};

// packages/agentic-hooks/src/adapters/claude/backfill-args.ts
var import_node_path8 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/adapters/claude/transcript-backfill.ts
var import_node_fs7 = __toESM(require("node:fs"), 1);
var import_node_path7 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/adapters/claude/payload.ts
var CLAUDE_SOURCE = "claude-code";
var normalizeClaudePayload = (raw) => {
  if (!isRecord(raw)) {
    return null;
  }
  const payload = raw;
  const hookEvent = typeof payload.hook_event_name === "string" ? payload.hook_event_name : "";
  if (hookEvent === "PreToolUse" || payload.tool_name === "Skill") {
    const toolInput = isRecord(payload.tool_input) ? payload.tool_input : {};
    const skillName = typeof toolInput.skill === "string" ? toolInput.skill : typeof toolInput.name === "string" ? toolInput.name : null;
    if (!skillName) {
      return null;
    }
    const normalized = {
      args: toolInput.args ?? "",
      cwd: typeof payload.cwd === "string" ? payload.cwd : null,
      hook_event_name: hookEvent || "PreToolUse",
      invocation_path: "skill_tool",
      session_id: typeof payload.session_id === "string" ? payload.session_id : null,
      skill_name: skillName
    };
    if (typeof payload.agent_id === "string") {
      normalized.agent_id = payload.agent_id;
    }
    if (typeof payload.agent_type === "string") {
      normalized.agent_type = payload.agent_type;
    }
    if (typeof payload.tool_use_id === "string") {
      normalized.tool_use_id = payload.tool_use_id;
    }
    if (typeof payload.prompt_id === "string") {
      normalized.prompt_id = payload.prompt_id;
    }
    return normalized;
  }
  if (hookEvent === "UserPromptExpansion" || payload.expansion_type === "slash_command") {
    const skillName = typeof payload.command_name === "string" ? payload.command_name : null;
    if (!skillName) {
      return null;
    }
    const normalized = {
      args: typeof payload.command_args === "string" ? payload.command_args : "",
      cwd: typeof payload.cwd === "string" ? payload.cwd : null,
      hook_event_name: hookEvent || "UserPromptExpansion",
      invocation_path: "slash",
      session_id: typeof payload.session_id === "string" ? payload.session_id : null,
      skill_name: skillName
    };
    if (typeof payload.prompt_id === "string") {
      normalized.prompt_id = payload.prompt_id;
    }
    return normalized;
  }
  return null;
};

// packages/agentic-token-usage/src/usage.ts
var asFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value) ? value : void 0;
var asNonEmptyString = (value) => typeof value === "string" && value !== "" ? value : void 0;
var firstNumber = (...candidates) => {
  for (const candidate of candidates) {
    const parsed = asFiniteNumber(candidate);
    if (parsed !== void 0) {
      return parsed;
    }
  }
  return void 0;
};
var safeParseRecord = (json) => {
  if (json === "") {
    return null;
  }
  try {
    const parsed = JSON.parse(json);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
var normalizeUsage = (input) => {
  const meta = typeof input === "string" ? safeParseRecord(input) : isRecord(input) ? input : null;
  if (meta === null) {
    return {};
  }
  const usage = isRecord(meta.usage) ? meta.usage : {};
  const tokens = isRecord(meta.tokens) ? meta.tokens : {};
  const cache = isRecord(tokens.cache) ? tokens.cache : {};
  const inputTokens = firstNumber(
    usage.input_tokens,
    usage.inputTokens,
    usage.prompt_tokens,
    usage.promptTokens,
    tokens.input,
    meta.input_tokens,
    meta.inputTokens
  );
  const outputTokens = firstNumber(
    usage.output_tokens,
    usage.outputTokens,
    usage.completion_tokens,
    usage.completionTokens,
    tokens.output,
    meta.output_tokens,
    meta.outputTokens
  );
  const cacheReadTokens = firstNumber(
    usage.cache_read_input_tokens,
    usage.cacheReadInputTokens,
    usage.cacheReadTokens,
    usage.cached,
    cache.read
  );
  const cacheWriteTokens = firstNumber(
    usage.cache_creation_input_tokens,
    usage.cacheCreationInputTokens,
    usage.cacheWriteTokens,
    cache.write
  );
  const reasoningTokens = firstNumber(
    usage.reasoning_tokens,
    usage.reasoningTokens,
    tokens.reasoning
  );
  const explicitTotal = firstNumber(
    usage.total_tokens,
    usage.totalTokens,
    tokens.total,
    meta.total_tokens,
    meta.totalTokens
  );
  const costUsd = firstNumber(
    meta.totalCostUsd,
    meta.total_cost_usd,
    meta.cost,
    usage.costUsd,
    usage.costUSD,
    usage.cost
  );
  const model = asNonEmptyString(meta.model) ?? asNonEmptyString(usage.model) ?? (isRecord(meta.modelUsage) ? Object.keys(meta.modelUsage)[0] : void 0);
  const summable = [inputTokens, outputTokens].filter(
    (value) => value !== void 0
  );
  const totalTokens = explicitTotal ?? (summable.length > 0 ? summable.reduce((a, b) => a + b, 0) : void 0);
  return {
    ...cacheReadTokens !== void 0 ? { cacheReadTokens } : {},
    ...cacheWriteTokens !== void 0 ? { cacheWriteTokens } : {},
    ...costUsd !== void 0 ? { costUsd } : {},
    ...inputTokens !== void 0 ? { inputTokens } : {},
    ...model !== void 0 ? { model } : {},
    ...outputTokens !== void 0 ? { outputTokens } : {},
    ...reasoningTokens !== void 0 ? { reasoningTokens } : {},
    ...totalTokens !== void 0 ? { totalTokens } : {}
  };
};
var hasNoCounts = (usage) => usage.inputTokens === void 0 && usage.outputTokens === void 0 && usage.cacheReadTokens === void 0 && usage.cacheWriteTokens === void 0 && usage.reasoningTokens === void 0 && usage.totalTokens === void 0 && usage.costUsd === void 0;
var hasUsageCounts = (usage) => usage !== void 0 && !hasNoCounts(usage);

// packages/agentic-hooks/src/adapters/claude/transcript.ts
var CLAUDE_PROVIDER = "claude";
var SYNTHETIC_MODEL = "<synthetic>";
var nonEmptyString = (value) => typeof value === "string" && value !== "" ? value : null;
var finiteNumber = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
var thinkingTokens = (usage) => isRecord(usage.output_tokens_details) ? finiteNumber(usage.output_tokens_details.thinking_tokens) : null;
var parseJsonRecord = (line) => {
  try {
    const parsed = JSON.parse(line);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
var toRecord = (entry, fallbackSessionId) => {
  if (entry.type !== "assistant") {
    return null;
  }
  const requestId = nonEmptyString(entry.requestId);
  const { message } = entry;
  if (requestId === null || !isRecord(message) || !isRecord(message.usage)) {
    return null;
  }
  const model = nonEmptyString(message.model);
  if (model === null || model === SYNTHETIC_MODEL) {
    return null;
  }
  const { usage } = message;
  const counts = normalizeUsage({ model, usage });
  if (!hasUsageCounts(counts)) {
    return null;
  }
  const agentId = nonEmptyString(entry.agentId);
  return {
    cache_read_tokens: counts.cacheReadTokens ?? null,
    cache_write_tokens: counts.cacheWriteTokens ?? null,
    cost_usd: counts.costUsd ?? null,
    cwd: nonEmptyString(entry.cwd),
    git_branch: nonEmptyString(entry.gitBranch),
    input_tokens: counts.inputTokens ?? null,
    model,
    occurred_at: nonEmptyString(entry.timestamp) ?? (/* @__PURE__ */ new Date()).toISOString(),
    output_tokens: counts.outputTokens ?? null,
    provider: CLAUDE_PROVIDER,
    raw_usage_json: JSON.stringify(
      agentId === null ? usage : { ...usage, agentId, isSidechain: true }
    ),
    reasoning_tokens: counts.reasoningTokens ?? thinkingTokens(usage),
    request_id: requestId,
    session_id: nonEmptyString(entry.sessionId) ?? fallbackSessionId,
    source: CLAUDE_SOURCE,
    total_tokens: counts.totalTokens ?? null
  };
};
var parseTranscriptLines = ({
  fallbackSessionId,
  lines,
  seen
}) => {
  const records = [];
  for (const line of lines) {
    const entry = parseJsonRecord(line);
    if (entry === null) {
      continue;
    }
    const record = toRecord(entry, fallbackSessionId);
    if (record === null || record.request_id === null) {
      continue;
    }
    if (seen.has(record.request_id)) {
      continue;
    }
    seen.add(record.request_id);
    records.push(record);
  }
  return records;
};

// packages/agentic-hooks/src/adapters/claude/transcript-projects.ts
var import_node_child_process2 = require("node:child_process");
var import_node_fs5 = __toESM(require("node:fs"), 1);
var import_node_os3 = __toESM(require("node:os"), 1);
var import_node_path5 = __toESM(require("node:path"), 1);
var claudeProjectSlug = (absolutePath) => absolutePath.replace(/[^a-zA-Z0-9]/g, "-");
var narrowSlug = (absolutePath) => absolutePath.replace(/[/.]/g, "-");
var defaultClaudeProjectsDir = () => import_node_path5.default.join(import_node_os3.default.homedir(), ".claude", "projects");
var parseWorktreeList = (porcelain) => {
  const paths = [];
  for (const block of porcelain.split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r?\n/);
    const worktree = lines.find((line) => line.startsWith("worktree "));
    if (worktree === void 0 || lines.includes("bare") || lines.some((line) => line.startsWith("prunable"))) {
      continue;
    }
    paths.push(worktree.slice("worktree ".length));
  }
  return paths;
};
var listGitWorktrees = (repoRoot) => {
  try {
    return parseWorktreeList(
      (0, import_node_child_process2.execFileSync)("git", ["worktree", "list", "--porcelain"], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 5e3
      })
    );
  } catch {
    return [];
  }
};
var realpathOrNull = (target) => {
  try {
    return import_node_fs5.default.realpathSync(target);
  } catch {
    return null;
  }
};
var isInside = (child, parent) => {
  const relative = import_node_path5.default.relative(parent, child);
  return relative !== "" && !relative.startsWith("..") && !import_node_path5.default.isAbsolute(relative);
};
var resolveOwnedProjects = ({
  checkouts,
  projectsDir
}) => {
  const root = realpathOrNull(projectsDir);
  if (root === null) {
    return [];
  }
  const found = /* @__PURE__ */ new Map();
  for (const checkout of checkouts) {
    const absolute = import_node_path5.default.resolve(checkout);
    for (const slug of /* @__PURE__ */ new Set([
      claudeProjectSlug(absolute),
      narrowSlug(absolute)
    ])) {
      const dir = import_node_path5.default.join(projectsDir, slug);
      const real = realpathOrNull(dir);
      if (real === null || !isInside(real, root) || found.has(real)) {
        continue;
      }
      found.set(real, { checkout: absolute, dir: real, slug });
    }
  }
  return [...found.values()].sort(
    (left, right) => left.slug.localeCompare(right.slug)
  );
};
var resolveCheckouts = ({
  includeWorktrees,
  listWorktrees = listGitWorktrees,
  repoRoot
}) => [
  ...new Set(
    [repoRoot, ...includeWorktrees ? listWorktrees(repoRoot) : []].map(
      (checkout) => import_node_path5.default.resolve(checkout)
    )
  )
].sort();
var transcriptBelongsTo = ({
  checkouts,
  cwd
}) => {
  if (cwd === null) {
    return true;
  }
  const resolved = import_node_path5.default.resolve(cwd);
  const roots = checkouts.flatMap((checkout) => {
    const real = realpathOrNull(checkout);
    return real === null ? [checkout] : [checkout, real];
  });
  return roots.some((root) => resolved === root || isInside(resolved, root));
};

// packages/agentic-hooks/src/adapters/claude/transcript-skills.ts
var COMMAND_HEAD = /^\s*<command-(?:message|name)>/;
var COMMAND_NAME = /<command-name>\s*([^<]*?)\s*<\/command-name>/;
var COMMAND_ARGS = /<command-args>([\s\S]*?)<\/command-args>/;
var LOCAL_STDOUT = "<local-command-stdout>";
var createSkillScanState = () => ({
  candidates: [],
  commands: [],
  localReplies: /* @__PURE__ */ new Set()
});
var nonEmptyString2 = (value) => typeof value === "string" && value !== "" ? value : null;
var parseJsonRecord2 = (line) => {
  try {
    const parsed = JSON.parse(line);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
var userText = (entry) => {
  const { message } = entry;
  if (!isRecord(message)) {
    return "";
  }
  const { content } = message;
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content.map(
    (block) => isRecord(block) && typeof block.text === "string" ? block.text : ""
  ).join("\n");
};
var baseOf = (entry, fallbackSessionId) => ({
  gitBranch: nonEmptyString2(entry.gitBranch) ?? "",
  occurredAt: nonEmptyString2(entry.timestamp),
  session_id: nonEmptyString2(entry.sessionId) ?? fallbackSessionId
});
var fromSkillToolUse = (entry, fallbackSessionId) => {
  const { message } = entry;
  if (!isRecord(message) || !Array.isArray(message.content)) {
    return [];
  }
  const {
    gitBranch,
    occurredAt,
    session_id: sessionId
  } = baseOf(entry, fallbackSessionId);
  if (occurredAt === null) {
    return [];
  }
  const out = [];
  for (const block of message.content) {
    if (!isRecord(block) || block.type !== "tool_use" || block.name !== "Skill") {
      continue;
    }
    const toolUseId = nonEmptyString2(block.id);
    if (toolUseId === null) {
      continue;
    }
    const normalized = normalizeClaudePayload({
      agent_id: nonEmptyString2(entry.agentId),
      cwd: nonEmptyString2(entry.cwd),
      hook_event_name: "PreToolUse",
      prompt_id: nonEmptyString2(entry.promptId),
      session_id: sessionId,
      tool_input: block.input,
      tool_name: "Skill",
      tool_use_id: toolUseId
    });
    if (normalized !== null) {
      out.push({
        gitBranch,
        keyedByFallback: false,
        normalized,
        occurredAt
      });
    }
  }
  return out;
};
var fromSlashCommand = (entry, fallbackSessionId, text) => {
  const name = COMMAND_NAME.exec(text)?.[1]?.replace(/^\//, "") ?? "";
  const {
    gitBranch,
    occurredAt,
    session_id: sessionId
  } = baseOf(entry, fallbackSessionId);
  if (name === "" || occurredAt === null) {
    return null;
  }
  const uuid = nonEmptyString2(entry.uuid);
  const promptId = nonEmptyString2(entry.promptId);
  const normalized = normalizeClaudePayload({
    command_args: COMMAND_ARGS.exec(text)?.[1]?.trim() ?? "",
    command_name: name,
    cwd: nonEmptyString2(entry.cwd),
    expansion_type: "slash_command",
    hook_event_name: "UserPromptExpansion",
    prompt_id: promptId ?? uuid,
    session_id: sessionId
  });
  if (normalized === null) {
    return null;
  }
  return {
    candidate: {
      gitBranch,
      keyedByFallback: promptId === null,
      normalized,
      occurredAt
    },
    uuid
  };
};
var scanSkillLines = ({
  fallbackSessionId,
  lines,
  state
}) => {
  for (const line of lines) {
    const mightBeSkill = line.includes('"Skill"');
    const mightBeCommand = line.includes("command-") || line.includes(LOCAL_STDOUT);
    if (!mightBeSkill && !mightBeCommand) {
      continue;
    }
    const entry = parseJsonRecord2(line);
    if (entry === null) {
      continue;
    }
    if (entry.type === "assistant" && mightBeSkill) {
      state.candidates.push(...fromSkillToolUse(entry, fallbackSessionId));
      continue;
    }
    if (entry.type !== "user") {
      continue;
    }
    const text = userText(entry);
    if (text.includes(LOCAL_STDOUT)) {
      const parent = nonEmptyString2(entry.parentUuid);
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
var finishSkillScan = (state) => [
  ...state.candidates,
  ...state.commands.filter(({ uuid }) => uuid === null || !state.localReplies.has(uuid)).map(({ candidate }) => candidate)
];

// packages/agentic-hooks/src/adapters/claude/transcript-usage.ts
var import_node_fs6 = __toESM(require("node:fs"), 1);
var import_node_path6 = __toESM(require("node:path"), 1);
var MAX_TRANSCRIPT_BYTES_PER_FILE = 4 * 1024 * 1024;
var MAX_TRANSCRIPT_BYTES_PER_STOP = 16 * 1024 * 1024;
var SUBAGENT_FILE = /^agent-.+\.jsonl$/;
var listSubagentTranscripts = (transcriptPath) => {
  const { dir, name } = import_node_path6.default.parse(transcriptPath);
  const subagentsDir = import_node_path6.default.join(dir, name, "subagents");
  try {
    return import_node_fs6.default.readdirSync(subagentsDir).filter((entry) => SUBAGENT_FILE.test(entry)).sort().map((entry) => import_node_path6.default.join(subagentsDir, entry));
  } catch {
    return [];
  }
};

// packages/agentic-hooks/src/adapters/claude/transcript-backfill.ts
var BACKFILL_PATH_SUFFIX = ":backfill";
var DEFAULT_BACKFILL_SINCE = "2026-09-23T00:00:00.000Z";
var CHUNK_BYTES = 8 * 1024 * 1024;
var SKILL_CONCURRENCY = 8;
var MAIN_FILE = /\.jsonl$/;
var dayOf = (iso) => iso.slice(0, 10);
var bump = (counts, key) => {
  counts[key] = (counts[key] ?? 0) + 1;
};
var listMainTranscripts = (projectDir) => {
  try {
    return import_node_fs7.default.readdirSync(projectDir, { withFileTypes: true }).filter((entry) => entry.isFile() && MAIN_FILE.test(entry.name)).map((entry) => import_node_path7.default.join(projectDir, entry.name)).sort();
  } catch {
    return [];
  }
};
var sessionIdOf = (filePath) => {
  const { dir, name } = import_node_path7.default.parse(filePath);
  return import_node_path7.default.basename(dir) === "subagents" ? import_node_path7.default.basename(import_node_path7.default.dirname(dir)) : name;
};
var firstCwd = (lines) => {
  for (const line of lines.slice(0, 200)) {
    if (!line.includes('"cwd"')) {
      continue;
    }
    try {
      const parsed = JSON.parse(line);
      if (typeof parsed === "object" && parsed !== null && "cwd" in parsed && typeof parsed.cwd === "string" && parsed.cwd !== "") {
        return parsed.cwd;
      }
    } catch {
    }
  }
  return null;
};
var scanFile = ({
  checkouts,
  filePath,
  seenRequests
}) => {
  const fallbackSessionId = sessionIdOf(filePath);
  const state = createSkillScanState();
  const records = [];
  let offset = 0;
  let checked = false;
  for (; ; ) {
    const { lines, nextOffset } = readNewBytes({
      filePath,
      maxBytes: CHUNK_BYTES,
      offset
    });
    if (nextOffset === offset) {
      break;
    }
    if (!checked) {
      checked = true;
      if (!transcriptBelongsTo({ checkouts, cwd: firstCwd(lines) })) {
        return { candidates: [], records: [], refused: true };
      }
    }
    records.push(
      ...parseTranscriptLines({
        fallbackSessionId,
        lines,
        seen: seenRequests
      })
    );
    scanSkillLines({ fallbackSessionId, lines, state });
    offset = nextOffset;
  }
  return { candidates: finishSkillScan(state), records, refused: false };
};
var dedupeKey = (candidate) => {
  const { normalized } = candidate;
  const head = `${normalized.session_id ?? ""}|${normalized.hook_event_name ?? ""}`;
  return normalized.tool_use_id === void 0 ? `${head}|${normalized.prompt_id ?? ""}|${normalized.skill_name ?? ""}` : `${head}|${normalized.tool_use_id}`;
};
var scanBackfill = ({
  includeWorktrees,
  listWorktrees,
  projectsDir,
  repoRoot,
  since,
  until
}) => {
  const sinceMs = Date.parse(since);
  const untilMs = Date.parse(until);
  const checkouts = resolveCheckouts({
    includeWorktrees,
    listWorktrees,
    repoRoot
  });
  const projects = resolveOwnedProjects({ checkouts, projectsDir });
  const seenRequests = /* @__PURE__ */ new Set();
  const seenSkills = /* @__PURE__ */ new Set();
  const refusedFiles = [];
  const events = [];
  const records = [];
  const stats = {};
  const skillDays = {};
  const skillPaths = {};
  const skillProjects = {};
  const tokenDays = {};
  const tokenProjects = {};
  let duplicates = 0;
  let files = 0;
  let keyedByFallback = 0;
  let noTimestamp = 0;
  let outsideWindow = 0;
  for (const project of projects) {
    let projectFiles = 0;
    let projectSkills = 0;
    let projectTokens = 0;
    const targets = listMainTranscripts(project.dir).flatMap((main2) => [
      main2,
      ...listSubagentTranscripts(main2)
    ]);
    for (const filePath of targets) {
      const scan = scanFile({ checkouts, filePath, seenRequests });
      if (scan.refused) {
        refusedFiles.push(filePath);
        continue;
      }
      files += 1;
      projectFiles += 1;
      for (const record of scan.records) {
        records.push(record);
        projectTokens += 1;
        bump(tokenDays, dayOf(record.occurred_at));
        bump(tokenProjects, project.slug);
      }
      for (const candidate of scan.candidates) {
        const at = Date.parse(candidate.occurredAt);
        if (Number.isNaN(at)) {
          noTimestamp += 1;
          continue;
        }
        if (at < sinceMs || at >= untilMs) {
          outsideWindow += 1;
          continue;
        }
        const key = dedupeKey(candidate);
        if (seenSkills.has(key)) {
          duplicates += 1;
          continue;
        }
        seenSkills.add(key);
        const { normalized } = candidate;
        const invocationPath = `${normalized.invocation_path ?? "unknown"}${BACKFILL_PATH_SUFFIX}`;
        const event = buildUsageEvent({
          gitBranch: candidate.gitBranch,
          normalized: { ...normalized, invocation_path: invocationPath },
          repoRoot: project.checkout,
          source: CLAUDE_SOURCE,
          timestamp: new Date(at).toISOString()
        });
        if (event === null) {
          continue;
        }
        events.push(event);
        projectSkills += 1;
        if (candidate.keyedByFallback) {
          keyedByFallback += 1;
        }
        bump(skillDays, dayOf(event.timestamp));
        bump(skillPaths, invocationPath);
        bump(skillProjects, project.slug);
      }
    }
    stats[project.slug] = {
      files: projectFiles,
      skills: projectSkills,
      tokens: projectTokens
    };
  }
  return {
    checkouts,
    files,
    projects,
    refusedFiles,
    since,
    skills: {
      byDay: skillDays,
      byPath: skillPaths,
      byProject: skillProjects,
      duplicates,
      events,
      keyedByFallback,
      noTimestamp,
      outsideWindow
    },
    stats,
    tokens: { byDay: tokenDays, byProject: tokenProjects, records },
    until
  };
};
var resolveBackfillEndpoint = ({
  authToken,
  graphqlUrl,
  repoRoot
}) => {
  if (process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === "1") {
    return null;
  }
  const url = graphqlUrl ?? resolveGraphqlUrl(repoRoot);
  if (!url) {
    return null;
  }
  return {
    authToken: authToken ?? resolveAuthToken(repoRoot),
    graphqlUrl: url
  };
};
var sendSkillEvents = async ({
  authToken,
  events,
  fetchImpl,
  graphqlUrl,
  jsonlPath,
  timeoutMs
}) => {
  const tally = { accepted: 0, buffered: 0, rejected: 0 };
  let serverDown = false;
  for (let start = 0; start < events.length; start += SKILL_CONCURRENCY) {
    const group = events.slice(start, start + SKILL_CONCURRENCY);
    if (serverDown) {
      for (const event of group) {
        appendJsonl(jsonlPath, event);
        tally.buffered += 1;
      }
      continue;
    }
    const results = await Promise.all(
      group.map(async (event) => ({
        event,
        result: await postSkillUsageEvent({
          authToken,
          event,
          fetchImpl,
          graphqlUrl,
          timeoutMs
        })
      }))
    );
    for (const { event, result } of results) {
      if (result.ok) {
        tally.accepted += 1;
      } else if (result.permanent) {
        appendDeadLetters({
          filePath: jsonlPath,
          reason: result.reason,
          records: [event]
        });
        tally.rejected += 1;
      } else {
        serverDown = true;
        appendJsonl(jsonlPath, event);
        tally.buffered += 1;
      }
    }
  }
  return tally;
};
var sendBackfill = async ({
  authToken,
  fetchImpl,
  graphqlUrl,
  jsonlPath,
  plan,
  repoRoot,
  timeoutMs,
  tokenJsonlPath
}) => {
  const skills = await sendSkillEvents({
    authToken,
    events: plan.skills.events,
    fetchImpl,
    graphqlUrl,
    jsonlPath: jsonlPath ?? defaultJsonlPath(),
    timeoutMs
  });
  const tokens = await persistTokenUsage({
    authToken,
    fetchImpl,
    graphqlUrl,
    jsonlPath: tokenJsonlPath,
    records: plan.tokens.records,
    repoRoot,
    timeoutMs
  });
  return { skills, tokens };
};

// packages/agentic-hooks/src/adapters/claude/backfill-args.ts
var BACKFILL_USAGE = "node .claude/hooks/skill-usage-backfill.cjs [--dry-run] [--since <ISO>] [--until <ISO>] [--projects-dir <path>] [--repo-root <path>] [--no-worktrees] [--timeout-ms <n>]";
var DEFAULT_TIMEOUT_MS = 15e3;
var VALUE_FLAGS = /* @__PURE__ */ new Set([
  "--projects-dir",
  "--repo-root",
  "--since",
  "--timeout-ms",
  "--until"
]);
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set([
  "--dry-run",
  "--help",
  "--no-worktrees"
]);
var toIso = (label, raw) => {
  const ms = Date.parse(raw);
  return /^\d{4}-\d{2}-\d{2}/.test(raw) && !Number.isNaN(ms) ? new Date(ms).toISOString() : new Error(`${label} is not an ISO-8601 date: ${raw}`);
};
var parseBackfillArgs = ({
  argv,
  cwd,
  env,
  now
}) => {
  const flags = /* @__PURE__ */ new Map();
  const switches = /* @__PURE__ */ new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index] ?? "";
    const [name = "", inline] = token.startsWith("--") ? token.split(/=(.*)/s, 2) : [token];
    if (BOOLEAN_FLAGS.has(name) && inline === void 0) {
      switches.add(name);
    } else if (VALUE_FLAGS.has(name)) {
      const value = inline ?? argv[index + 1];
      if (value === void 0 || value === "" || value.startsWith("--")) {
        return { error: `${name} needs a value`, kind: "error" };
      }
      flags.set(name, value);
      if (inline === void 0) {
        index += 1;
      }
    } else {
      return { error: `unknown argument: ${token}`, kind: "error" };
    }
  }
  if (switches.has("--help")) {
    return { kind: "help" };
  }
  const since = toIso(
    "--since",
    flags.get("--since") ?? DEFAULT_BACKFILL_SINCE
  );
  if (since instanceof Error) {
    return { error: since.message, kind: "error" };
  }
  const until = toIso("--until", flags.get("--until") ?? now.toISOString());
  if (until instanceof Error) {
    return { error: until.message, kind: "error" };
  }
  if (Date.parse(since) >= Date.parse(until)) {
    return {
      error: `--since (${since}) must be before --until (${until})`,
      kind: "error"
    };
  }
  const timeoutRaw = flags.get("--timeout-ms");
  const timeoutMs = timeoutRaw === void 0 ? DEFAULT_TIMEOUT_MS : Number(timeoutRaw);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    return {
      error: `--timeout-ms must be a positive integer: ${timeoutRaw}`,
      kind: "error"
    };
  }
  return {
    kind: "options",
    options: {
      dryRun: switches.has("--dry-run"),
      includeWorktrees: !switches.has("--no-worktrees"),
      projectsDir: import_node_path8.default.resolve(
        flags.get("--projects-dir") ?? defaultClaudeProjectsDir()
      ),
      repoRoot: import_node_path8.default.resolve(
        flags.get("--repo-root") ?? env.CLAUDE_PROJECT_DIR ?? env.OPEN_THROTTLE_REPO_ROOT ?? cwd
      ),
      since,
      timeoutMs,
      until
    }
  };
};

// packages/agentic-hooks/src/adapters/claude/backfill-report.ts
var table = (counts, indent) => {
  const entries = Object.entries(counts).sort(
    ([left], [right]) => left.localeCompare(right)
  );
  return entries.length === 0 ? [`${indent}(none)`] : entries.map(([key, count]) => `${indent}${key}  ${count}`);
};
var formatBackfillPlan = ({
  dryRun,
  plan
}) => {
  const { skills, tokens } = plan;
  const lines = [
    dryRun ? "skill-usage-backfill: DRY RUN, nothing will be sent" : "skill-usage-backfill: about to send",
    `skill window: ${plan.since} (inclusive) to ${plan.until} (exclusive)`,
    `checkouts: ${plan.checkouts.length}; project directories: ${plan.projects.length}; transcript files read: ${plan.files}`
  ];
  for (const project of plan.projects) {
    const stat = plan.stats[project.slug];
    lines.push(
      `  ${project.slug}  files ${stat?.files ?? 0}  skill events ${stat?.skills ?? 0}  token rows ${stat?.tokens ?? 0}`
    );
  }
  if (plan.refusedFiles.length > 0) {
    lines.push(
      `refused ${plan.refusedFiles.length} transcript file(s) whose recorded cwd is outside this repository:`,
      ...plan.refusedFiles.map((file) => `  ${file}`)
    );
  }
  lines.push(
    "",
    `skill events to send: ${skills.events.length}`,
    ...table(skills.byPath, "  by path     "),
    `  outside window: ${skills.outsideWindow}; duplicate in transcripts: ${skills.duplicates}; no timestamp: ${skills.noTimestamp}`,
    `  slash commands keyed by line uuid (cannot match a live row): ${skills.keyedByFallback}`,
    "  by day:",
    ...table(skills.byDay, "    "),
    "  by project directory:",
    ...table(skills.byProject, "    "),
    "",
    `token rows to send (one per unique requestId): ${tokens.records.length}`,
    "  by day:",
    ...table(tokens.byDay, "    "),
    "  by project directory:",
    ...table(tokens.byProject, "    ")
  );
  return `${lines.join("\n")}
`;
};
var formatBackfillResult = (result) => {
  const { skills, tokens } = result;
  return `${[
    `skill events: accepted ${skills.accepted} (new or already present: the server answers with the surviving row), buffered ${skills.buffered}, rejected ${skills.rejected}`,
    `token rows: inserted ${tokens.inserted}, skipped as already present ${tokens.skipped}, buffered ${tokens.buffered}, dead-lettered ${tokens.deadLettered}${tokens.detail === null ? "" : ` (${tokens.detail})`}`,
    skills.buffered + tokens.buffered > 0 ? "buffered rows stay in ~/.openthrottle/skill-usage/; run skill-usage-drain.cjs once the server is reachable" : "nothing buffered"
  ].join("\n")}
`;
};

// packages/agentic-hooks/src/adapters/claude/backfill-run.ts
var runBackfill = async ({
  endpoint,
  fetchImpl,
  options,
  stderr,
  stdout
}) => {
  const plan = scanBackfill(options);
  stdout(formatBackfillPlan({ dryRun: options.dryRun, plan }));
  if (options.dryRun) {
    return 0;
  }
  const target = endpoint === void 0 ? resolveBackfillEndpoint({ repoRoot: options.repoRoot }) : endpoint;
  if (target === null) {
    stderr(
      "no OpenThrottle endpoint to send to (set OPENTHROTTLE_GRAPHQL_URL, and unset OPENTHROTTLE_TELEMETRY_OFFLINE); nothing was sent or buffered\n"
    );
    return 1;
  }
  const result = await sendBackfill({
    ...target,
    fetchImpl,
    plan,
    repoRoot: options.repoRoot,
    timeoutMs: options.timeoutMs
  });
  stdout(formatBackfillResult(result));
  return 0;
};

// packages/agentic-hooks/src/adapters/claude/backfill.ts
var main = async () => {
  const parsed = parseBackfillArgs({
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    env: process.env,
    now: /* @__PURE__ */ new Date()
  });
  if (parsed.kind === "help") {
    process.stdout.write(`${BACKFILL_USAGE}
`);
    return 0;
  }
  if (parsed.kind === "error") {
    process.stderr.write(`${parsed.error}
${BACKFILL_USAGE}
`);
    return 1;
  }
  return runBackfill({
    options: parsed.options,
    stderr: (text) => process.stderr.write(text),
    stdout: (text) => process.stdout.write(text)
  });
};
main().then((code) => {
  process.exitCode = code;
}).catch((err) => {
  logHookError("backfill failed", err);
  process.exitCode = 1;
});
