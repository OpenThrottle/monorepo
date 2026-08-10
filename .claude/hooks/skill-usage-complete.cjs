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
var import_node_fs6 = __toESM(require("node:fs"), 1);

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
var RECORD_SKILL_USAGE_OUTCOME_MUTATION = `
mutation RecordSkillUsageOutcome($input: RecordSkillUsageOutcomeInput!) {
  recordSkillUsageOutcome(input: $input) {
    id
    skillName
    outcome
  }
}
`;
var SKILL_USAGE_OUTCOMES = Object.freeze({
  ABANDONED: "abandoned",
  ERROR: "error",
  SUCCESS: "success"
});
var buildOutcomeEvent = ({
  skillName,
  outcome,
  repoRoot,
  sessionId = null,
  toolUseId = null,
  durationMs = null,
  timestamp = (/* @__PURE__ */ new Date()).toISOString(),
  gitBranch,
  cwd
}) => {
  const name = typeof skillName === "string" ? skillName.trim() : "";
  if (!name) {
    return null;
  }
  if (outcome !== "success" && outcome !== "abandoned" && outcome !== "error") {
    return null;
  }
  const scope = detectScope(name, repoRoot);
  const resolvedCwd = cwd || repoRoot;
  const resolvedDuration = durationMs == null || Number.isNaN(Number(durationMs)) ? null : Math.max(0, Math.round(Number(durationMs)));
  return {
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
var defaultOutcomesJsonlPath = (repoRoot) => import_node_path3.default.join(repoRoot, DEFAULT_OUTCOMES_JSONL_REL);
var defaultStartsDir = (repoRoot) => import_node_path3.default.join(repoRoot, DEFAULT_STARTS_DIR_REL);
var sanitizeSessionId = (sessionId) => String(sessionId).replace(/[^A-Za-z0-9._-]/g, "-");
var startsFilePathForSession = (startsDir, sessionId) => import_node_path3.default.join(startsDir, `${sanitizeSessionId(sessionId)}.jsonl`);
var startCorrelationKey = (entry) => {
  const sid = typeof entry?.session_id === "string" ? entry.session_id : "";
  const skill = typeof entry?.skill_name === "string" ? entry.skill_name : "";
  const toolUseId = typeof entry?.tool_use_id === "string" ? entry.tool_use_id : "";
  const startedAt = typeof entry?.started_at === "string" ? entry.started_at : "";
  const disc = toolUseId || startedAt;
  return `${sid}::${skill}::${disc}`;
};
var drainJsonlFile = async ({
  filePath,
  post,
  deadlineMs,
  nowFn = Date.now
}) => {
  const result = { retained: 0, sent: 0, skipped: 0 };
  if (!import_node_fs3.default.existsSync(filePath)) {
    return result;
  }
  const snapshotPath = `${filePath}.draining.${process.pid}`;
  try {
    import_node_fs3.default.renameSync(filePath, snapshotPath);
  } catch {
    return result;
  }
  const retain = [];
  try {
    let stopped = false;
    const lines = import_node_fs3.default.readFileSync(snapshotPath, "utf8").split("\n");
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
        logHookError("drain: skipping malformed jsonl line");
        continue;
      }
      let ok = false;
      try {
        const res = await post(event);
        ok = Boolean(res && res.ok);
      } catch (err) {
        logHookError("drain: post threw", err);
      }
      if (ok) {
        result.sent += 1;
      } else {
        retain.push(trimmed);
      }
    }
  } catch (err) {
    logHookError("drainJsonlFile read failed", err);
    try {
      const leftover = import_node_fs3.default.readFileSync(snapshotPath, "utf8");
      if (leftover.trim()) {
        import_node_fs3.default.appendFileSync(
          filePath,
          leftover.endsWith("\n") ? leftover : `${leftover}
`,
          "utf8"
        );
      }
      import_node_fs3.default.rmSync(snapshotPath, { force: true });
    } catch (foldErr) {
      logHookError("drain: fold-back failed", foldErr);
    }
    return result;
  }
  try {
    if (retain.length) {
      import_node_fs3.default.appendFileSync(filePath, `${retain.join("\n")}
`, "utf8");
      result.retained = retain.length;
    }
    import_node_fs3.default.rmSync(snapshotPath, { force: true });
  } catch (err) {
    logHookError("drain: finalize failed", err);
  }
  return result;
};

// packages/agentic-hooks/src/data/persist.ts
var import_node_fs5 = __toESM(require("node:fs"), 1);
var import_node_path4 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/data/starts.ts
var import_node_fs4 = __toESM(require("node:fs"), 1);
var isRecord = (value) => value != null && typeof value === "object";
var listStartsForSession = ({
  repoRoot,
  sessionId,
  startsDir
}) => {
  try {
    const sid = typeof sessionId === "string" ? sessionId.trim() : "";
    if (!sid) {
      return [];
    }
    const dir = startsDir || defaultStartsDir(repoRoot);
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
  repoRoot,
  sessionId,
  resolvedKeys,
  startsDir
}) => {
  try {
    const sid = typeof sessionId === "string" ? sessionId.trim() : "";
    if (!sid) {
      return 0;
    }
    const dir = startsDir || defaultStartsDir(repoRoot);
    const filePath = startsFilePathForSession(dir, sid);
    if (!import_node_fs4.default.existsSync(filePath)) {
      return 0;
    }
    const entries = listStartsForSession({
      repoRoot,
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

// packages/agentic-hooks/src/data/persist.ts
var isRecord2 = (value) => value != null && typeof value === "object";
var readGraphqlErrors = (payload) => {
  if (!isRecord2(payload) || !Array.isArray(payload.errors) || !payload.errors.length) {
    return null;
  }
  return payload.errors.map((e) => isRecord2(e) && typeof e.message === "string" ? e.message : "").join("; ");
};
var readMutationId = (payload, field) => {
  if (isRecord2(payload) && isRecord2(payload.data)) {
    const node = payload.data[field];
    if (isRecord2(node) && node.id != null) {
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
var postSkillUsageOutcome = async ({
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
        query: RECORD_SKILL_USAGE_OUTCOME_MUTATION,
        variables: { input: toRecordSkillUsageOutcomeInput(event) }
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
  const id = readMutationId(payload, "recordSkillUsageOutcome");
  if (!id) {
    return { ok: false, reason: "missing recordSkillUsageOutcome.id" };
  }
  return { id, ok: true };
};
var resolveTimeout = (timeoutMs) => timeoutMs ?? (Number(process.env.SKILL_USAGE_POST_TIMEOUT_MS) || DEFAULT_POST_TIMEOUT_MS);
var persistOutcomeEvent = async ({
  event,
  repoRoot,
  jsonlPath,
  timeoutMs,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride
}) => {
  const outPath = jsonlPath || defaultOutcomesJsonlPath(repoRoot);
  if (process.env.SKILL_USAGE_DISABLE_SERVER === "1") {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError("outcome jsonl append failed", err);
    }
    return { detail: "SKILL_USAGE_DISABLE_SERVER=1", sink: "jsonl" };
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
      `outcome server post failed; falling back to jsonl (${result.reason})`
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
  outcome = SKILL_USAGE_OUTCOMES.SUCCESS,
  finishedAt = (/* @__PURE__ */ new Date()).toISOString(),
  startsDir,
  jsonlPath,
  fetchImpl,
  graphqlUrl,
  authToken,
  timeoutMs
}) => {
  const starts = listStartsForSession({ repoRoot, sessionId, startsDir });
  if (!starts.length) {
    return { resolved: 0, results: [] };
  }
  const finishMs = Date.parse(finishedAt);
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
      const startedMs = Date.parse(String(start.started_at));
      const durationMs = Number.isFinite(startedMs) && Number.isFinite(finishMs) ? Math.max(0, finishMs - startedMs) : null;
      const event = buildOutcomeEvent({
        durationMs,
        outcome,
        repoRoot,
        sessionId: typeof start.session_id === "string" ? start.session_id : sessionId,
        skillName: typeof start.skill_name === "string" ? start.skill_name : "",
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
  drainStartsForSession({ repoRoot, resolvedKeys, sessionId, startsDir });
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
  jsonlPath
}) => {
  const dir = startsDir || defaultStartsDir(repoRoot);
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
    const starts = listStartsForSession({
      repoRoot,
      sessionId,
      startsDir: dir
    });
    const abandonedAt = new Date(mtimeMs).toISOString();
    const seen = /* @__PURE__ */ new Set();
    for (const start of starts) {
      const key = startCorrelationKey(start);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const event = buildOutcomeEvent({
        durationMs: null,
        outcome: SKILL_USAGE_OUTCOMES.ABANDONED,
        repoRoot,
        sessionId: typeof start.session_id === "string" ? start.session_id : sessionId,
        skillName: typeof start.skill_name === "string" ? start.skill_name : "",
        timestamp: abandonedAt,
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
    drainStartsForSession({ repoRoot, sessionId, startsDir: dir });
  }
  return { swept: abandoned.length };
};
var drainBufferedUsage = async ({
  repoRoot,
  eventsPath,
  outcomesPath,
  budgetMs = 500,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride,
  timeoutMs,
  nowFn = Date.now
}) => {
  const empty = () => ({ retained: 0, sent: 0, skipped: 0 });
  if (process.env.SKILL_USAGE_DISABLE_SERVER === "1") {
    return { events: empty(), outcomes: empty() };
  }
  const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
  if (!graphqlUrl) {
    return { events: empty(), outcomes: empty() };
  }
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);
  const resolvedTimeout = resolveTimeout(timeoutMs);
  const deadlineMs = budgetMs == null ? void 0 : nowFn() + budgetMs;
  const events = await drainJsonlFile({
    deadlineMs,
    filePath: eventsPath || defaultJsonlPath(repoRoot),
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
    filePath: outcomesPath || defaultOutcomesJsonlPath(repoRoot),
    nowFn,
    post: (event) => postSkillUsageOutcome({
      authToken,
      event,
      fetchImpl,
      graphqlUrl,
      timeoutMs: resolvedTimeout
    })
  });
  return { events, outcomes };
};

// packages/agentic-hooks/src/adapters/claude/payload.ts
var isRecord3 = (value) => value != null && typeof value === "object";
var normalizeClaudeStopPayload = (raw) => {
  if (!isRecord3(raw)) {
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

// packages/agentic-hooks/src/adapters/claude/complete.ts
var main = async () => {
  try {
    const repoRoot = process.env.CLAUDE_PROJECT_DIR || process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd();
    const stdinBuf = import_node_fs6.default.readFileSync(0, "utf8");
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
      await sweepAbandonedStarts({ repoRoot }).catch(() => {
      });
      return;
    }
    await completeOpenStartsForSession({
      repoRoot,
      sessionId: normalized.session_id
    });
    await sweepAbandonedStarts({
      currentSessionId: normalized.session_id,
      repoRoot
    });
    await drainBufferedUsage({ budgetMs: 500, repoRoot });
  } catch (err) {
    logHookError("complete failed", err);
  }
};
main().finally(() => {
  process.exit(0);
});
