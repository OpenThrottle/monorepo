#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/plan-auto-close.ts
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

// packages/agentic-hooks/src/adapters/claude/plan-auto-close.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);

// packages/agentic-hooks/src/config/env.ts
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
var userConfigDir = () => {
  return import_node_path.default.join(import_node_os.default.homedir(), ".openthrottle");
};
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
var readRepoEnvFile = (repoRoot) => {
  return isOpenThrottleCheckout(repoRoot) ? readEnvFile(import_node_path.default.join(repoRoot, ".env")) : {};
};
var readUserEnvFile = () => {
  return readEnvFile(import_node_path.default.join(userConfigDir(), ".env"));
};
var envLayers = (repoRoot, options) => {
  return [
    repoRoot ? readRepoEnvFile(repoRoot) : {},
    ...options?.includeProcessEnv === false ? [] : [process.env],
    readUserEnvFile()
  ];
};
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
var normalizeLoopbackHost = (url) => {
  return url.replace(LOOPBACK_AUTHORITY, "$1127.0.0.1");
};
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
var resolveAuthToken = (repoRoot, options) => {
  return resolveOtEnv(repoRoot, "OPENTHROTTLE_MCP_AUTH_TOKEN", options) || resolveOtEnv(repoRoot, "OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN", options) || "";
};

// packages/nodejs-utils/src/utils/is-record.ts
var isRecord = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

// packages/agentic-hooks/src/data/plan-auto-close.ts
var LOOKUP_QUERY = `
query PlanAutoCloseLookup($id: ID!) {
  task(id: $id) { id title planId plan { id status } }
}
`;
var isCompletedStatus = (status) => {
  return typeof status === "string" && status.toUpperCase() === "COMPLETED";
};
var lookupTaskPlan = async ({
  authToken,
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  taskId,
  timeoutMs
}) => {
  if (!graphqlUrl || typeof fetchImpl !== "function") return null;
  try {
    const response = await fetchImpl(graphqlUrl, {
      body: JSON.stringify({ query: LOOKUP_QUERY, variables: { id: taskId } }),
      headers: {
        "Content-Type": "application/json",
        ...authToken ? { Authorization: `Bearer ${authToken}` } : {}
      },
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!isRecord(payload) || !isRecord(payload.data)) return null;
    const { task } = payload.data;
    if (!isRecord(task) || !isRecord(task.plan)) return null;
    const { plan } = task;
    if (typeof plan.id !== "string" || typeof plan.status !== "string" || typeof task.title !== "string") {
      return null;
    }
    return { planId: plan.id, planStatus: plan.status, taskTitle: task.title };
  } catch (err) {
    logHookError("plan-auto-close: OT lookup failed", err);
    return null;
  }
};
var decidePlanAutoClose = async ({
  lookup,
  status,
  taskId
}) => {
  if (taskId === null || !isCompletedStatus(status)) return null;
  const found = await lookup(taskId);
  if (found === null || !isCompletedStatus(found.planStatus)) return null;
  return `Completing "${found.taskTitle}" closed plan ${found.planId}. If this run has follow-up work, reopen the plan (update_plan IN_PROGRESS) before create_tasks.`;
};

// packages/agentic-hooks/src/adapters/claude/plan-auto-close-output.ts
var UPDATE_TASK_SUFFIX = "__update_task";
var readUpdateTaskCall = (raw) => {
  if (!isRecord(raw) || typeof raw.tool_name !== "string") return null;
  if (!raw.tool_name.endsWith(UPDATE_TASK_SUFFIX)) return null;
  if (!isRecord(raw.tool_input)) return null;
  const { id, status } = raw.tool_input;
  const taskId = typeof id === "string" && id.trim() !== "" ? id : null;
  return { status, taskId };
};
var decideClaudePlanAutoClose = async (raw, lookup) => {
  const call = readUpdateTaskCall(raw);
  if (call === null) return null;
  const message = await decidePlanAutoClose({ lookup, ...call });
  if (message === null) return null;
  const hookSpecificOutput = {
    additionalContext: message,
    hookEventName: "PostToolUse"
  };
  return `${JSON.stringify({ hookSpecificOutput })}
`;
};

// packages/agentic-hooks/src/adapters/claude/plan-auto-close.ts
var LOOKUP_TIMEOUT_MS = 1500;
var main = async () => {
  try {
    const repoRoot = process.env.CLAUDE_PROJECT_DIR || process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd();
    const stdinBuf = import_node_fs2.default.readFileSync(0, "utf8");
    if (!stdinBuf || !stdinBuf.trim()) return;
    let raw;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError("plan-auto-close: invalid JSON stdin", err);
      return;
    }
    const output = await decideClaudePlanAutoClose(
      raw,
      (taskId) => lookupTaskPlan({
        authToken: resolveAuthToken(repoRoot),
        graphqlUrl: resolveGraphqlUrl(repoRoot),
        taskId,
        timeoutMs: LOOKUP_TIMEOUT_MS
      })
    );
    if (output !== null) process.stdout.write(output);
  } catch (err) {
    logHookError("plan-auto-close failed", err);
  }
};
main().finally(() => {
  process.exit(0);
});
