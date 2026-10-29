#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/complete.ts
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

// packages/agentic-hooks/src/adapters/claude/complete.ts
var import_node_fs7 = __toESM(require("node:fs"), 1);

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

// packages/agentic-hooks/src/data/jsonl.ts
var TELEMETRY_DIR_BASENAME = "skill-usage";
var EVENTS_JSONL_BASENAME = "events.jsonl";
var OUTCOMES_JSONL_BASENAME = "outcomes.jsonl";
var TOKEN_USAGE_JSONL_BASENAME = "token-usage.jsonl";
var STARTS_DIR_BASENAME = "starts";
var resolveTelemetryDir = () => process.env.OPENTHROTTLE_TELEMETRY_DIR?.trim() || import_node_path2.default.join(userConfigDir(), TELEMETRY_DIR_BASENAME);
var appendJsonl = (jsonlPath, event) => {
  import_node_fs2.default.mkdirSync(import_node_path2.default.dirname(jsonlPath), { recursive: true });
  import_node_fs2.default.appendFileSync(jsonlPath, `${JSON.stringify(event)}
`, "utf8");
};
var defaultJsonlPath = () => import_node_path2.default.join(resolveTelemetryDir(), EVENTS_JSONL_BASENAME);
var defaultOutcomesJsonlPath = () => import_node_path2.default.join(resolveTelemetryDir(), OUTCOMES_JSONL_BASENAME);
var defaultTokenUsageJsonlPath = () => import_node_path2.default.join(resolveTelemetryDir(), TOKEN_USAGE_JSONL_BASENAME);
var deadLetterPathFor = (filePath) => filePath.replace(/\.jsonl$/, "") + ".dead-letter.jsonl";
var toDeadLetterLine = (record, reason, nowMs) => JSON.stringify({
  dead_lettered_at: new Date(nowMs).toISOString(),
  line: record,
  reason
});
var defaultStartsDir = () => import_node_path2.default.join(resolveTelemetryDir(), STARTS_DIR_BASENAME);
var sanitizeSessionId = (sessionId) => String(sessionId).replace(/[^A-Za-z0-9._-]/g, "-");
var startsFilePathForSession = (startsDir, sessionId) => import_node_path2.default.join(startsDir, `${sanitizeSessionId(sessionId)}.jsonl`);
var startCorrelationKey = (entry) => {
  const sid = typeof entry?.session_id === "string" ? entry.session_id : "";
  const skill = typeof entry?.skill_name === "string" ? entry.skill_name : "";
  const toolUseId = typeof entry?.tool_use_id === "string" ? entry.tool_use_id : "";
  const startedAt = typeof entry?.started_at === "string" ? entry.started_at : "";
  const disc = toolUseId || startedAt;
  return `${sid}::${skill}::${disc}`;
};
var drainSnapshot = async ({
  batchSize,
  deadlineMs,
  filePath,
  nowFn,
  postBatch
}) => {
  const result = {
    deadLettered: 0,
    reasons: {},
    retained: 0,
    sent: 0,
    skipped: 0
  };
  const tally = (reason, count) => {
    result.reasons[reason] = (result.reasons[reason] ?? 0) + count;
  };
  if (!import_node_fs2.default.existsSync(filePath)) {
    return result;
  }
  const snapshotPath = `${filePath}.draining.${process.pid}`;
  try {
    import_node_fs2.default.renameSync(filePath, snapshotPath);
  } catch {
    return result;
  }
  const retain = [];
  const deadLetter = [];
  try {
    const parsed = [];
    for (const line of import_node_fs2.default.readFileSync(snapshotPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      try {
        parsed.push({ event: JSON.parse(trimmed), raw: trimmed });
      } catch {
        result.skipped += 1;
        logHookError("drain: skipping malformed jsonl line");
      }
    }
    let stopped = false;
    for (let start = 0; start < parsed.length; start += Math.max(1, batchSize)) {
      const batch = parsed.slice(start, start + Math.max(1, batchSize));
      if (!stopped && deadlineMs != null && nowFn() > deadlineMs) {
        stopped = true;
      }
      if (stopped) {
        retain.push(...batch.map((entry) => entry.raw));
        continue;
      }
      let res;
      try {
        res = await postBatch(batch.map((entry) => entry.event));
      } catch (err) {
        logHookError("drain: post threw", err);
        res = { ok: false, permanent: false, reason: "post threw" };
      }
      if (res.ok) {
        result.sent += batch.length;
      } else if (res.permanent) {
        tally(res.reason, batch.length);
        deadLetter.push(
          ...batch.map(
            (entry) => toDeadLetterLine(entry.event, res.reason, nowFn())
          )
        );
      } else {
        tally(res.reason, batch.length);
        retain.push(...batch.map((entry) => entry.raw));
      }
    }
  } catch (err) {
    logHookError("drainJsonlFile read failed", err);
    try {
      const leftover = import_node_fs2.default.readFileSync(snapshotPath, "utf8");
      if (leftover.trim()) {
        import_node_fs2.default.appendFileSync(
          filePath,
          leftover.endsWith("\n") ? leftover : `${leftover}
`,
          "utf8"
        );
      }
      import_node_fs2.default.rmSync(snapshotPath, { force: true });
    } catch (foldErr) {
      logHookError("drain: fold-back failed", foldErr);
    }
    return result;
  }
  try {
    if (retain.length) {
      import_node_fs2.default.appendFileSync(filePath, `${retain.join("\n")}
`, "utf8");
      result.retained = retain.length;
    }
    if (deadLetter.length) {
      import_node_fs2.default.appendFileSync(
        deadLetterPathFor(filePath),
        `${deadLetter.join("\n")}
`,
        "utf8"
      );
      result.deadLettered = deadLetter.length;
    }
    import_node_fs2.default.rmSync(snapshotPath, { force: true });
  } catch (err) {
    logHookError("drain: finalize failed", err);
  }
  return result;
};
var drainJsonlFile = async ({
  filePath,
  post,
  deadlineMs,
  nowFn = Date.now
}) => drainSnapshot({
  batchSize: 1,
  deadlineMs,
  filePath,
  nowFn,
  postBatch: async ([event]) => event === void 0 ? { ok: true } : post(event)
});
var drainJsonlFileBatched = async ({
  batchSize,
  filePath,
  postBatch,
  deadlineMs,
  nowFn = Date.now
}) => drainSnapshot({ batchSize, deadlineMs, filePath, nowFn, postBatch });

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
var RECORD_SKILL_USAGE_OUTCOME_MUTATION = `
mutation RecordSkillUsageOutcome($input: RecordSkillUsageOutcomeInput!) {
  recordSkillUsageOutcome(input: $input) {
    id
    skillName
    outcome
    source
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
var buildOutcomeEvent = ({
  skillName,
  outcome,
  repoRoot,
  sessionId = null,
  toolUseId = null,
  durationMs = null,
  timestamp = (/* @__PURE__ */ new Date()).toISOString(),
  gitBranch,
  cwd,
  source
}) => {
  const name = typeof skillName === "string" ? skillName.trim() : "";
  if (!name) {
    return null;
  }
  if (outcome !== "success" && outcome !== "abandoned" && outcome !== "error" && outcome !== "session_ended") {
    return null;
  }
  const scope = detectScope(name, repoRoot);
  const resolvedCwd = cwd || repoRoot;
  const resolvedDuration = durationMs == null || Number.isNaN(Number(durationMs)) ? null : Math.max(0, Math.round(Number(durationMs)));
  const event = {
    cwd: resolvedCwd,
    duration_ms: resolvedDuration,
    event_kind: "outcome",
    git_branch: gitBranch ?? resolveGitBranch(repoRoot),
    outcome,
    scope,
    session_id: sessionId,
    skill_name: name,
    timestamp,
    tool_use_id: toolUseId
  };
  if (source != null) {
    event.source = source;
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
var toRecordSkillUsageOutcomeInput = (event) => {
  const input = {
    occurredAt: event.timestamp,
    outcome: event.outcome,
    skillName: event.skill_name
  };
  if (event.source != null) {
    input.source = event.source;
  }
  if (event.scope != null) {
    input.scope = event.scope;
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
  if (event.tool_use_id != null) {
    input.toolUseId = event.tool_use_id;
  }
  if (event.duration_ms != null) {
    input.durationMs = event.duration_ms;
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

// packages/agentic-hooks/src/data/persist.ts
var import_node_fs5 = __toESM(require("node:fs"), 1);
var import_node_path4 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/data/starts.ts
var import_node_fs4 = __toESM(require("node:fs"), 1);
var listStartsForSession = ({
  sessionId,
  startsDir
}) => {
  try {
    const sid = typeof sessionId === "string" ? sessionId.trim() : "";
    if (!sid) {
      return [];
    }
    const dir = startsDir || defaultStartsDir();
    const filePath = startsFilePathForSession(dir, sid);
    if (!import_node_fs4.default.existsSync(filePath)) {
      return [];
    }
    const text = import_node_fs4.default.readFileSync(filePath, "utf8");
    const out = [];
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      try {
        const parsed = JSON.parse(trimmed);
        if (isRecord(parsed)) {
          out.push(parsed);
        }
      } catch {
      }
    }
    return out;
  } catch (err) {
    logHookError("listStartsForSession failed", err);
    return [];
  }
};
var drainStartsForSession = ({
  sessionId,
  resolvedKeys,
  startsDir
}) => {
  try {
    const sid = typeof sessionId === "string" ? sessionId.trim() : "";
    if (!sid) {
      return 0;
    }
    const dir = startsDir || defaultStartsDir();
    const filePath = startsFilePathForSession(dir, sid);
    if (!import_node_fs4.default.existsSync(filePath)) {
      return 0;
    }
    const entries = listStartsForSession({
      sessionId: sid,
      startsDir: dir
    });
    if (!resolvedKeys) {
      import_node_fs4.default.rmSync(filePath, { force: true });
      return entries.length;
    }
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
      import_node_fs4.default.rmSync(filePath, { force: true });
    } else {
      import_node_fs4.default.writeFileSync(
        filePath,
        `${keep.map((e) => JSON.stringify(e)).join("\n")}
`,
        "utf8"
      );
    }
    return drained;
  } catch (err) {
    logHookError("drainStartsForSession failed", err);
    return 0;
  }
};

// packages/agentic-hooks/src/data/token-usage.ts
var MAX_TOKEN_USAGE_BATCH = 500;
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
var postSkillUsageOutcome = async ({
  event,
  graphqlUrl,
  authToken = "",
  timeoutMs = DEFAULT_POST_TIMEOUT_MS,
  fetchImpl = globalThis.fetch
}) => {
  return postGraphqlMutation({
    authToken,
    fetchImpl,
    field: "recordSkillUsageOutcome",
    graphqlUrl,
    query: RECORD_SKILL_USAGE_OUTCOME_MUTATION,
    timeoutMs,
    variables: { input: toRecordSkillUsageOutcomeInput(event) }
  });
};
var resolveTimeout = (timeoutMs) => timeoutMs ?? (Number(process.env.OPENTHROTTLE_TELEMETRY_TIMEOUT_MS) || DEFAULT_POST_TIMEOUT_MS);
var persistOutcomeEvent = async ({
  event,
  repoRoot,
  jsonlPath,
  timeoutMs,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride
}) => {
  const outPath = jsonlPath || defaultOutcomesJsonlPath();
  if (process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === "1") {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError("outcome jsonl append failed", err);
    }
    return { detail: "OPENTHROTTLE_TELEMETRY_OFFLINE=1", sink: "jsonl" };
  }
  const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);
  if (!graphqlUrl) {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError("outcome jsonl append failed", err);
    }
    return { detail: "missing graphql url", sink: "jsonl" };
  }
  try {
    const result = await postSkillUsageOutcome({
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
      `outcome server post failed; falling back to jsonl (${result.reason}) [endpoint ${forLog(graphqlUrl)}]`
    );
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError("outcome jsonl append failed", err);
    }
    return { detail: result.reason, sink: "jsonl" };
  } catch (err) {
    logHookError("persistOutcomeEvent failed", err);
    try {
      appendJsonl(outPath, event);
    } catch (appendErr) {
      logHookError("outcome jsonl append failed", appendErr);
    }
    return {
      detail: err instanceof Error ? err.message : String(err),
      sink: "jsonl"
    };
  }
};
var completeOpenStartsForSession = async ({
  repoRoot,
  sessionId,
  outcome = SKILL_USAGE_OUTCOMES.SESSION_ENDED,
  finishedAt = (/* @__PURE__ */ new Date()).toISOString(),
  startsDir,
  jsonlPath,
  fetchImpl,
  graphqlUrl,
  authToken,
  timeoutMs,
  source
}) => {
  const starts = listStartsForSession({ sessionId, startsDir });
  if (!starts.length) {
    return { resolved: 0, results: [] };
  }
  const seen = /* @__PURE__ */ new Set();
  const unique = [];
  for (const start of starts) {
    const key = startCorrelationKey(start);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(start);
  }
  const maybeResults = await Promise.all(
    unique.map(async (start) => {
      const key = startCorrelationKey(start);
      const durationMs = null;
      const event = buildOutcomeEvent({
        durationMs,
        outcome,
        repoRoot,
        sessionId: typeof start.session_id === "string" ? start.session_id : sessionId,
        skillName: typeof start.skill_name === "string" ? start.skill_name : "",
        source,
        timestamp: finishedAt,
        toolUseId: typeof start.tool_use_id === "string" ? start.tool_use_id : null
      });
      if (!event) {
        return null;
      }
      let sink = "error";
      try {
        const res = await persistOutcomeEvent({
          authToken,
          event,
          fetchImpl,
          graphqlUrl,
          jsonlPath,
          repoRoot,
          timeoutMs
        });
        sink = res.sink;
      } catch (err) {
        logHookError("completeOpenStartsForSession persist failed", err);
      }
      return { durationMs, key, sink, skillName: event.skill_name };
    })
  );
  const results = maybeResults.filter((r) => r !== null);
  const resolvedKeys = new Set(results.map((r) => r.key));
  drainStartsForSession({ resolvedKeys, sessionId, startsDir });
  return { resolved: resolvedKeys.size, results };
};
var sweepAbandonedStarts = async ({
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
  source
}) => {
  const dir = startsDir || defaultStartsDir();
  let files;
  try {
    files = import_node_fs5.default.readdirSync(dir);
  } catch {
    return { swept: 0 };
  }
  const currentFile = typeof currentSessionId === "string" && currentSessionId.trim() ? `${sanitizeSessionId(currentSessionId.trim())}.jsonl` : null;
  const abandoned = [];
  const staleSessions = [];
  for (const file of files) {
    if (!file.endsWith(".jsonl") || file === currentFile) {
      continue;
    }
    const filePath = import_node_path4.default.join(dir, file);
    let mtimeMs;
    try {
      mtimeMs = import_node_fs5.default.statSync(filePath).mtimeMs;
    } catch {
      continue;
    }
    if (now - mtimeMs < maxAgeMs) {
      continue;
    }
    const sessionId = file.replace(/\.jsonl$/, "");
    const starts = listStartsForSession({ sessionId, startsDir: dir });
    const detectedAt = new Date(now).toISOString();
    const seen = /* @__PURE__ */ new Set();
    for (const start of starts) {
      const key = startCorrelationKey(start);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const event = buildOutcomeEvent({
        // Null for the same reason as the completion path: mtime − started_at
        // is how long the SESSION ran before going silent, not how long this
        // skill's work took. Averaged into `avgDurationMs` it would keep the
        // column reporting session length under an honest-looking label.
        durationMs: null,
        outcome: SKILL_USAGE_OUTCOMES.ABANDONED,
        repoRoot,
        sessionId: typeof start.session_id === "string" ? start.session_id : sessionId,
        skillName: typeof start.skill_name === "string" ? start.skill_name : "",
        source,
        timestamp: detectedAt,
        toolUseId: typeof start.tool_use_id === "string" ? start.tool_use_id : null
      });
      if (!event) {
        continue;
      }
      abandoned.push(event);
    }
    staleSessions.push(sessionId);
  }
  await Promise.all(
    abandoned.map(async (event) => {
      try {
        await persistOutcomeEvent({
          authToken,
          event,
          fetchImpl,
          graphqlUrl,
          jsonlPath,
          repoRoot,
          timeoutMs
        });
      } catch (err) {
        logHookError("sweepAbandonedStarts persist failed", err);
      }
    })
  );
  for (const sessionId of staleSessions) {
    drainStartsForSession({ sessionId, startsDir: dir });
  }
  return { swept: abandoned.length };
};
var drainBufferedUsage = async ({
  repoRoot,
  eventsPath,
  outcomesPath,
  tokenUsagePath,
  budgetMs = 500,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride,
  timeoutMs,
  nowFn = Date.now
}) => {
  const empty = () => ({
    deadLettered: 0,
    reasons: {},
    retained: 0,
    sent: 0,
    skipped: 0
  });
  if (process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === "1") {
    return { events: empty(), outcomes: empty(), tokenUsage: empty() };
  }
  const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
  if (!graphqlUrl) {
    return { events: empty(), outcomes: empty(), tokenUsage: empty() };
  }
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);
  const resolvedTimeout = resolveTimeout(timeoutMs);
  const deadlineMs = budgetMs == null ? void 0 : nowFn() + budgetMs;
  const events = await drainJsonlFile({
    deadlineMs,
    filePath: eventsPath || defaultJsonlPath(),
    nowFn,
    post: (event) => postSkillUsageEvent({
      authToken,
      event,
      fetchImpl,
      graphqlUrl,
      timeoutMs: resolvedTimeout
    })
  });
  const outcomes = await drainJsonlFile({
    deadlineMs,
    filePath: outcomesPath || defaultOutcomesJsonlPath(),
    nowFn,
    post: (event) => postSkillUsageOutcome({
      authToken,
      event,
      fetchImpl,
      graphqlUrl,
      timeoutMs: resolvedTimeout
    })
  });
  const tokenUsage = await drainJsonlFileBatched({
    batchSize: MAX_TOKEN_USAGE_BATCH,
    deadlineMs,
    filePath: tokenUsagePath || defaultTokenUsageJsonlPath(),
    nowFn,
    postBatch: (batch) => postTokenUsageBatch({
      authToken,
      fetchImpl,
      graphqlUrl,
      records: batch,
      timeoutMs: resolvedTimeout
    })
  });
  reportDeadLetters("events", events);
  reportDeadLetters("outcomes", outcomes);
  reportDeadLetters("token usage", tokenUsage);
  return { events, outcomes, tokenUsage };
};
var reportDeadLetters = (label, tally) => {
  if (tally.deadLettered > 0) {
    logHookError(
      `drain: ${tally.deadLettered} ${label} line(s) rejected by the server and moved to dead-letter — ${formatDrainReasons(tally)}`
    );
  }
};
var formatDrainReasons = (tally) => {
  const entries = Object.entries(tally.reasons).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries.map(([reason, count]) => `${reason} ×${count}`).join("; ") : "none";
};

// packages/agentic-hooks/src/data/plan-runs.ts
var import_node_path5 = __toESM(require("node:path"), 1);
var PLAN_RUNS_DIR_REL = import_node_path5.default.join(".cache", "plan-runs");
var PLAN_RUN_ABANDONED_MS = 6 * 60 * 60 * 1e3;

// packages/agentic-hooks/src/adapters/claude/payload.ts
var CLAUDE_SOURCE = "claude-code";
var normalizeClaudeStopPayload = (raw) => {
  if (!isRecord(raw)) {
    return null;
  }
  const sessionId = typeof raw.session_id === "string" ? raw.session_id.trim() : "";
  if (!sessionId) {
    return null;
  }
  return {
    hook_event_name: typeof raw.hook_event_name === "string" ? raw.hook_event_name : "Stop",
    session_id: sessionId
  };
};

// packages/agentic-hooks/src/adapters/claude/shadow.ts
var import_node_fs6 = __toESM(require("node:fs"), 1);
var import_node_path6 = __toESM(require("node:path"), 1);
var CAPTURE_BUNDLE = "skill-usage-capture";
var runningFromPlugin = (env, scriptPath) => {
  const pluginRoot = env.CLAUDE_PLUGIN_ROOT?.trim();
  if (!pluginRoot || !scriptPath) {
    return false;
  }
  const relative = import_node_path6.default.relative(import_node_path6.default.resolve(pluginRoot), scriptPath);
  return relative !== "" && !relative.startsWith("..");
};
var repoRegistersCapture = (repoRoot) => {
  try {
    const raw = import_node_fs6.default.readFileSync(
      import_node_path6.default.join(repoRoot, ".claude", "settings.json"),
      "utf8"
    );
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || !("hooks" in parsed)) {
      return false;
    }
    return JSON.stringify(parsed.hooks).includes(CAPTURE_BUNDLE);
  } catch {
    return false;
  }
};
var isShadowedByRepoHooks = ({
  env = process.env,
  repoRoot,
  scriptPath = process.argv[1]
}) => runningFromPlugin(env, scriptPath) && repoRegistersCapture(repoRoot);

// packages/agentic-hooks/src/adapters/claude/complete.ts
var main = async () => {
  try {
    const repoRoot = process.env.CLAUDE_PROJECT_DIR || process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd();
    if (isShadowedByRepoHooks({ repoRoot })) {
      return;
    }
    const stdinBuf = import_node_fs7.default.readFileSync(0, "utf8");
    if (!stdinBuf || !stdinBuf.trim()) {
      return;
    }
    let raw;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError("complete: invalid JSON stdin", err);
      return;
    }
    const normalized = normalizeClaudeStopPayload(raw);
    if (!normalized) {
      await sweepAbandonedStarts({ repoRoot, source: CLAUDE_SOURCE }).catch(
        () => {
        }
      );
      return;
    }
    await completeOpenStartsForSession({
      repoRoot,
      sessionId: normalized.session_id,
      source: CLAUDE_SOURCE
    });
    await sweepAbandonedStarts({
      currentSessionId: normalized.session_id,
      repoRoot,
      source: CLAUDE_SOURCE
    });
    await drainBufferedUsage({ budgetMs: 500, repoRoot });
  } catch (err) {
    logHookError("complete failed", err);
  }
};
main().finally(() => {
  process.exit(0);
});
