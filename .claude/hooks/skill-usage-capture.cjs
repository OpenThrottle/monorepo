#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/capture.ts
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

// packages/agentic-hooks/src/adapters/claude/capture.ts
var import_node_fs4 = __toESM(require("node:fs"), 1);
var import_node_path4 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/config/env.ts
var import_node_child_process = require("node:child_process");
var import_node_fs = __toESM(require("node:fs"), 1);
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
var readRepoEnvFile = (repoRoot) => {
  const out = {};
  try {
    const envPath = import_node_path.default.join(repoRoot, ".env");
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
    logHookError("readRepoEnvFile failed", err);
  }
  return out;
};
var resolveOtEnv = (repoRoot, key) => {
  const skillOverride = key === "OPENTHROTTLE_GRAPHQL_URL" ? process.env.SKILL_USAGE_GRAPHQL_URL : key === "OPENTHROTTLE_MCP_AUTH_TOKEN" ? process.env.SKILL_USAGE_AUTH_TOKEN : void 0;
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
  return fromProcess && fromProcess.trim() ? fromProcess.trim() : "";
};
var graphqlUrlFromEnvMap = (env) => {
  const explicit = env.OPENTHROTTLE_GRAPHQL_URL?.trim() || env.OPENTHROTTLE_WORKER_GRAPHQL_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const appUrl = env.OPENTHROTTLE_SERVER_APP_URL?.trim()?.replace(/\/$/, "");
  if (appUrl) {
    return `${appUrl}/graphql`;
  }
  return null;
};
var resolveGraphqlUrl = (repoRoot) => {
  const skillOverride = process.env.SKILL_USAGE_GRAPHQL_URL?.trim();
  if (skillOverride) {
    return skillOverride.replace(/\/$/, "");
  }
  if (repoRoot) {
    const fromFile = graphqlUrlFromEnvMap(readRepoEnvFile(repoRoot));
    if (fromFile) {
      return fromFile;
    }
  }
  return graphqlUrlFromEnvMap(process.env);
};
var resolveAuthToken = (repoRoot) => resolveOtEnv(repoRoot, "OPENTHROTTLE_MCP_AUTH_TOKEN") || resolveOtEnv(repoRoot, "OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN") || "";

// packages/agentic-hooks/src/utils/privacy.ts
var PRIVACY_LEVELS = Object.freeze({
  FULL: "full",
  NAME_ONLY: "name-only",
  TRUNCATED: "truncated"
});
var DEFAULT_PRIVACY_LEVEL = PRIVACY_LEVELS.TRUNCATED;
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
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);
var detectScope = (skillName, repoRoot) => {
  if (!skillName || skillName.includes(":")) {
    return "third-party";
  }
  const authoredDir = import_node_path2.default.join(repoRoot, "skills", skillName);
  try {
    if (import_node_fs2.default.existsSync(authoredDir) && import_node_fs2.default.statSync(authoredDir).isDirectory()) {
      return "ours";
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
  SUCCESS: "success"
});
var buildUsageEvent = ({
  normalized,
  repoRoot,
  source,
  privacyLevel = DEFAULT_PRIVACY_LEVEL,
  timestamp = (/* @__PURE__ */ new Date()).toISOString(),
  gitBranch
}) => {
  if (!normalized || !normalized.skill_name) {
    return null;
  }
  const cwd = normalized.cwd || repoRoot;
  const scope = detectScope(normalized.skill_name, repoRoot);
  const args = applyPrivacy(privacyLevel, normalized.args);
  const resolvedSource = source ?? normalized.source ?? void 0;
  const event = {
    args,
    cwd,
    git_branch: gitBranch ?? resolveGitBranch(repoRoot),
    invocation_path: normalized.invocation_path ?? null,
    privacy_level: privacyLevel,
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

// packages/agentic-hooks/src/data/jsonl.ts
var import_node_fs3 = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
var DEFAULT_JSONL_REL = import_node_path3.default.join(
  ".cache",
  "skill-usage",
  "events.jsonl"
);
var DEFAULT_OUTCOMES_JSONL_REL = import_node_path3.default.join(
  ".cache",
  "skill-usage",
  "outcomes.jsonl"
);
var DEFAULT_STARTS_DIR_REL = import_node_path3.default.join(
  ".cache",
  "skill-usage",
  "starts"
);
var appendJsonl = (jsonlPath, event) => {
  import_node_fs3.default.mkdirSync(import_node_path3.default.dirname(jsonlPath), { recursive: true });
  import_node_fs3.default.appendFileSync(jsonlPath, `${JSON.stringify(event)}
`, "utf8");
};
var defaultJsonlPath = (repoRoot) => import_node_path3.default.join(repoRoot, DEFAULT_JSONL_REL);
var defaultStartsDir = (repoRoot) => import_node_path3.default.join(repoRoot, DEFAULT_STARTS_DIR_REL);
var sanitizeSessionId = (sessionId) => String(sessionId).replace(/[^A-Za-z0-9._-]/g, "-");
var startsFilePathForSession = (startsDir, sessionId) => import_node_path3.default.join(startsDir, `${sanitizeSessionId(sessionId)}.jsonl`);

// packages/nodejs-utils/dist/src/utils/is-record.js
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

// packages/agentic-hooks/src/data/starts.ts
var recordSkillStart = ({
  repoRoot,
  sessionId,
  skillName,
  toolUseId = null,
  scope = null,
  startedAt = (/* @__PURE__ */ new Date()).toISOString(),
  startsDir
}) => {
  try {
    const sid = typeof sessionId === "string" ? sessionId.trim() : "";
    const name = typeof skillName === "string" ? skillName.trim() : "";
    if (!sid || !name) {
      return { ok: false, reason: "missing session_id or skill_name" };
    }
    const dir = startsDir || defaultStartsDir(repoRoot);
    const filePath = startsFilePathForSession(dir, sid);
    appendJsonl(filePath, {
      scope: scope ?? null,
      session_id: sid,
      skill_name: name,
      started_at: startedAt,
      tool_use_id: toolUseId ?? null
    });
    return { ok: true, path: filePath };
  } catch (err) {
    logHookError("recordSkillStart failed", err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err)
    };
  }
};

// packages/agentic-hooks/src/data/persist.ts
var readGraphqlErrors = (payload) => {
  if (!isRecord(payload) || !Array.isArray(payload.errors) || !payload.errors.length) {
    return null;
  }
  return payload.errors.map((e) => isRecord(e) && typeof e.message === "string" ? e.message : "").join("; ");
};
var readMutationId = (payload, field) => {
  if (isRecord(payload) && isRecord(payload.data)) {
    const node = payload.data[field];
    if (isRecord(node) && node.id != null) {
      return String(node.id);
    }
  }
  return null;
};
var DEFAULT_POST_TIMEOUT_MS = 750;
var DEFAULT_ABANDONED_MS = 6 * 60 * 60 * 1e3;
var postSkillUsageEvent = async ({
  event,
  graphqlUrl,
  authToken = "",
  timeoutMs = DEFAULT_POST_TIMEOUT_MS,
  fetchImpl = globalThis.fetch
}) => {
  if (typeof fetchImpl !== "function") {
    return { ok: false, reason: "fetch unavailable" };
  }
  if (!graphqlUrl) {
    return { ok: false, reason: "missing graphql url" };
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
      body: JSON.stringify({
        query: RECORD_SKILL_USAGE_MUTATION,
        variables: { input: toRecordSkillUsageInput(event) }
      }),
      headers,
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError" ? "timeout" : err instanceof Error ? err.message : String(err);
    return { ok: false, reason };
  }
  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    return {
      ok: false,
      reason: `invalid json (${response.status}): ${err instanceof Error ? err.message : String(err)}`
    };
  }
  const errorMsg = readGraphqlErrors(payload);
  if (errorMsg !== null) {
    return { ok: false, reason: errorMsg };
  }
  if (!response.ok) {
    return { ok: false, reason: `http ${response.status}` };
  }
  const id = readMutationId(payload, "recordSkillUsage");
  if (!id) {
    return { ok: false, reason: "missing recordSkillUsage.id" };
  }
  return { id, ok: true };
};
var resolveTimeout = (timeoutMs) => timeoutMs ?? (Number(process.env.SKILL_USAGE_POST_TIMEOUT_MS) || DEFAULT_POST_TIMEOUT_MS);
var persistUsageEvent = async ({
  event,
  repoRoot,
  jsonlPath,
  timeoutMs,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride
}) => {
  const outPath = jsonlPath || defaultJsonlPath(repoRoot);
  if (process.env.SKILL_USAGE_DISABLE_SERVER === "1") {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError("jsonl append failed", err);
    }
    return { detail: "SKILL_USAGE_DISABLE_SERVER=1", sink: "jsonl" };
  }
  const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);
  if (!graphqlUrl) {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError("jsonl append failed", err);
    }
    return { detail: "missing graphql url", sink: "jsonl" };
  }
  try {
    const result = await postSkillUsageEvent({
      authToken,
      event,
      fetchImpl,
      graphqlUrl,
      timeoutMs: resolveTimeout(timeoutMs)
    });
    if (result.ok) {
      return { id: result.id, sink: "server" };
    }
    logHookError(
      `server post failed; falling back to jsonl (${result.reason})`
    );
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError("jsonl append failed", err);
    }
    return { detail: result.reason, sink: "jsonl" };
  } catch (err) {
    logHookError("persistUsageEvent failed", err);
    try {
      appendJsonl(outPath, event);
    } catch (appendErr) {
      logHookError("jsonl append failed", appendErr);
    }
    return {
      detail: err instanceof Error ? err.message : String(err),
      sink: "jsonl"
    };
  }
};

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

// packages/agentic-hooks/src/adapters/claude/capture.ts
var main = async () => {
  try {
    const repoRoot = process.env.CLAUDE_PROJECT_DIR || process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd();
    const stdinBuf = import_node_fs4.default.readFileSync(0, "utf8");
    if (!stdinBuf || !stdinBuf.trim()) {
      return;
    }
    let raw;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError("invalid JSON stdin", err);
      return;
    }
    const normalized = normalizeClaudePayload(raw);
    if (!normalized) {
      return;
    }
    const event = buildUsageEvent({
      normalized,
      privacyLevel: DEFAULT_PRIVACY_LEVEL,
      repoRoot,
      source: CLAUDE_SOURCE
    });
    if (!event) {
      return;
    }
    recordSkillStart({
      repoRoot,
      scope: event.scope,
      sessionId: event.session_id,
      skillName: event.skill_name,
      startedAt: event.timestamp,
      toolUseId: event.tool_use_id ?? null
    });
    const outPath = process.env.SKILL_USAGE_JSONL_PATH || defaultJsonlPath(repoRoot);
    await persistUsageEvent({
      event,
      jsonlPath: import_node_path4.default.resolve(outPath),
      repoRoot
    });
  } catch (err) {
    logHookError("capture failed", err);
  }
};
main().finally(() => {
  process.exit(0);
});
