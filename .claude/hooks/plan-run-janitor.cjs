#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/plan-run-janitor.ts
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

// packages/agentic-hooks/src/adapters/claude/plan-run-janitor.ts
var import_node_fs3 = __toESM(require("node:fs"), 1);

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
var SKILL_USAGE_OUTCOMES = Object.freeze({
  ABANDONED: "abandoned",
  ERROR: "error",
  SUCCESS: "success"
});

// packages/agentic-hooks/src/data/jsonl.ts
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

// packages/nodejs-utils/dist/src/utils/is-record.js
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

// packages/agentic-hooks/src/data/persist.ts
var DEFAULT_ABANDONED_MS = 6 * 60 * 60 * 1e3;

// packages/agentic-hooks/src/data/plan-runs.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
var PLAN_RUNS_DIR_REL = import_node_path3.default.join(".cache", "plan-runs");
var PLAN_RUN_ABANDONED_MS = 6 * 60 * 60 * 1e3;
var SETTLE_CLI_PLAN_RUN_MUTATION = `
mutation SettlePlanRunFromHook($input: SettleCliPlanRunInput!) {
  settleCliPlanRun(input: $input) {
    id
    status
  }
}
`;
var planRunsDir = (repoRoot) => import_node_path3.default.join(repoRoot, PLAN_RUNS_DIR_REL);
var sanitizeSessionId2 = (sessionId) => String(sessionId).replace(/[^A-Za-z0-9._-]/g, "-");
var readPlanRunRecord = (filePath) => {
  try {
    const parsed = JSON.parse(import_node_fs2.default.readFileSync(filePath, "utf8"));
    if (!isRecord(parsed) || typeof parsed.planRunId !== "string" || parsed.planRunId.trim() === "") {
      return null;
    }
    return {
      planId: typeof parsed.planId === "string" ? parsed.planId : "",
      planRunId: parsed.planRunId,
      recordedAt: typeof parsed.recordedAt === "string" ? parsed.recordedAt : "",
      sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : ""
    };
  } catch {
    return null;
  }
};
var postSettle = async ({
  authToken,
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  planRunId,
  timeoutMs
}) => {
  if (typeof fetchImpl !== "function") return false;
  try {
    const response = await fetchImpl(graphqlUrl, {
      body: JSON.stringify({
        query: SETTLE_CLI_PLAN_RUN_MUTATION,
        variables: { input: { planRunId, status: "FAILED" } }
      }),
      headers: {
        "Content-Type": "application/json",
        ...authToken ? { Authorization: `Bearer ${authToken}` } : {}
      },
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs)
    });
    const payload = await response.json();
    if (isRecord(payload) && Array.isArray(payload.errors)) return false;
    return response.ok;
  } catch (err) {
    logHookError("plan-run janitor: settle post failed", err);
    return false;
  }
};
var settleAbandonedPlanRuns = async ({
  authToken: authTokenOverride,
  currentSessionId,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  maxAgeMs = PLAN_RUN_ABANDONED_MS,
  now = Date.now(),
  repoRoot,
  timeoutMs = 750
}) => {
  const dir = planRunsDir(repoRoot);
  let files;
  try {
    files = import_node_fs2.default.readdirSync(dir);
  } catch {
    return { settled: 0 };
  }
  const currentFile = typeof currentSessionId === "string" && currentSessionId.trim() !== "" ? `${sanitizeSessionId2(currentSessionId.trim())}.json` : null;
  const graphqlUrl = graphqlUrlOverride === void 0 ? resolveGraphqlUrl(repoRoot) : graphqlUrlOverride;
  if (!graphqlUrl) return { settled: 0 };
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);
  const candidates = [];
  for (const file of files) {
    if (!file.endsWith(".json") || file === currentFile) continue;
    const filePath = import_node_path3.default.join(dir, file);
    let mtimeMs;
    try {
      mtimeMs = import_node_fs2.default.statSync(filePath).mtimeMs;
    } catch {
      continue;
    }
    if (now - mtimeMs < maxAgeMs) continue;
    const record = readPlanRunRecord(filePath);
    if (record === null) {
      import_node_fs2.default.rmSync(filePath, { force: true });
      continue;
    }
    candidates.push({ filePath, record });
  }
  const outcomes = await Promise.all(
    candidates.map(async ({ filePath, record }) => {
      const ok = await postSettle({
        authToken,
        fetchImpl,
        graphqlUrl,
        planRunId: record.planRunId,
        timeoutMs
      });
      if (ok) import_node_fs2.default.rmSync(filePath, { force: true });
      return ok;
    })
  );
  return { settled: outcomes.filter(Boolean).length };
};

// packages/agentic-hooks/src/adapters/claude/payload.ts
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

// packages/agentic-hooks/src/adapters/claude/plan-run-janitor.ts
var main = async () => {
  try {
    const repoRoot = process.env.CLAUDE_PROJECT_DIR || process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd();
    const stdinBuf = import_node_fs3.default.readFileSync(0, "utf8");
    if (!stdinBuf || !stdinBuf.trim()) {
      return;
    }
    let raw;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError("plan-run-janitor: invalid JSON stdin", err);
      return;
    }
    const normalized = normalizeClaudeStopPayload(raw);
    if (!normalized) {
      return;
    }
    await settleAbandonedPlanRuns({
      currentSessionId: normalized.session_id,
      repoRoot
    });
  } catch (err) {
    logHookError("plan-run-janitor failed", err);
  }
};
main().finally(() => {
  process.exit(0);
});
