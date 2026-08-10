#!/usr/bin/env node
/**
 * GENERATED — DO NOT EDIT.
 * Source: packages/agentic-hooks/src/adapters/claude/drain.ts
 * Regenerate: pnpm nx run @openthrottle/agentic-hooks:bundle-hooks
 * Authoring lives in @openthrottle/agentic-hooks; this file is a bundle.
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

// packages/agentic-hooks/src/config/env.ts
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
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);
var DEFAULT_JSONL_REL = import_node_path2.default.join(
  ".cache",
  "skill-usage",
  "events.jsonl"
);
var DEFAULT_OUTCOMES_JSONL_REL = import_node_path2.default.join(
  ".cache",
  "skill-usage",
  "outcomes.jsonl"
);
var DEFAULT_STARTS_DIR_REL = import_node_path2.default.join(
  ".cache",
  "skill-usage",
  "starts"
);
var defaultJsonlPath = (repoRoot) => import_node_path2.default.join(repoRoot, DEFAULT_JSONL_REL);
var defaultOutcomesJsonlPath = (repoRoot) => import_node_path2.default.join(repoRoot, DEFAULT_OUTCOMES_JSONL_REL);
var drainJsonlFile = async ({
  filePath,
  post,
  deadlineMs,
  nowFn = Date.now
}) => {
  const result = { retained: 0, sent: 0, skipped: 0 };
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
  try {
    let stopped = false;
    const lines = import_node_fs2.default.readFileSync(snapshotPath, "utf8").split("\n");
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
    import_node_fs2.default.rmSync(snapshotPath, { force: true });
  } catch (err) {
    logHookError("drain: finalize failed", err);
  }
  return result;
};

// packages/agentic-hooks/src/data/persist.ts
var isRecord = (value) => value != null && typeof value === "object";
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

// packages/agentic-hooks/src/adapters/claude/drain.ts
var parseArg = (flag) => {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : void 0;
};
var main = async () => {
  try {
    const repoRoot = process.env.CLAUDE_PROJECT_DIR || process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd();
    const budgetRaw = parseArg("--budget-ms") || process.env.SKILL_USAGE_DRAIN_BUDGET_MS || "";
    const budgetMs = budgetRaw === "" ? null : Number(budgetRaw) || null;
    const summary = await drainBufferedUsage({ budgetMs, repoRoot });
    process.stderr.write(
      `[skill-usage-drain] events sent=${summary.events.sent} retained=${summary.events.retained} skipped=${summary.events.skipped}; outcomes sent=${summary.outcomes.sent} retained=${summary.outcomes.retained} skipped=${summary.outcomes.skipped}
`
    );
  } catch (err) {
    logHookError("drain CLI failed", err);
  }
};
main().finally(() => {
  process.exit(0);
});
