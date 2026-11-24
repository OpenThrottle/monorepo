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

// packages/agentic-hooks/src/data/jsonl.ts
var import_node_path2 = __toESM(require("node:path"), 1);

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
var parseEnvLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }
  const eq = trimmed.indexOf("=");
  if (eq <= 0) {
    return null;
  }
  const key = trimmed.slice(0, eq).trim();
  if (!key) {
    return null;
  }
  let value = trimmed.slice(eq + 1).trim();
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    value = value.slice(1, -1);
  }
  return { key, value };
};
var readEnvFile = (envPath) => {
  const out = {};
  try {
    if (!import_node_fs.default.existsSync(envPath)) {
      return out;
    }
    const text = import_node_fs.default.readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const assignment = parseEnvLine(line);
      if (assignment) {
        out[assignment.key] = assignment.value;
      }
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
var GRAPHQL_ENDPOINT_ENV_KEYS = [
  "OPENTHROTTLE_GRAPHQL_URL",
  "OPENTHROTTLE_WORKER_GRAPHQL_URL",
  "OPENTHROTTLE_SERVER_APP_URL"
];
var AUTH_TOKEN_ENV_KEYS = [
  "OPENTHROTTLE_MCP_AUTH_TOKEN",
  "OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN"
];
var envLayers = (repoRoot, options) => {
  const excludeProcessEnv = options?.includeProcessEnv === false;
  const processLayer = excludeProcessEnv ? [] : [{ blankIsTerminal: true, values: process.env }];
  return [
    {
      blankIsTerminal: false,
      values: repoRoot ? readRepoEnvFile(repoRoot) : {}
    },
    ...processLayer,
    { blankIsTerminal: false, values: readUserEnvFile() }
  ];
};
var isExplicitlyBlank = (layer, keys) => {
  return layer.blankIsTerminal && keys.some((key) => {
    const value = layer.values[key];
    return value !== void 0 && value.trim() === "";
  });
};
var resolveConcern = (repoRoot, options, keys, pick) => {
  for (const layer of envLayers(repoRoot, options)) {
    const answer = pick(layer.values);
    if (answer !== null) {
      return answer;
    }
    if (isExplicitlyBlank(layer, keys)) {
      return null;
    }
  }
  return null;
};
var pickTrimmed = (values, key) => {
  const value = values[key]?.trim();
  return value ? value : null;
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
  return resolveConcern(
    repoRoot,
    options,
    GRAPHQL_ENDPOINT_ENV_KEYS,
    graphqlUrlFromEnvMap
  );
};
var resolveAuthToken = (repoRoot, options) => {
  return resolveConcern(repoRoot, options, AUTH_TOKEN_ENV_KEYS, (values) => {
    for (const key of AUTH_TOKEN_ENV_KEYS) {
      const value = pickTrimmed(values, key);
      if (value !== null) {
        return value;
      }
    }
    return null;
  }) ?? "";
};

// packages/agentic-hooks/src/data/jsonl.ts
var TELEMETRY_DIR_BASENAME = "skill-usage";
var resolveTelemetryDir = () => {
  return process.env.OPENTHROTTLE_TELEMETRY_DIR?.trim() || import_node_path2.default.join(userConfigDir(), TELEMETRY_DIR_BASENAME);
};

// packages/nodejs-utils/src/utils/isRecord.ts
var isRecord = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

// packages/agentic-hooks/src/data/plan-runs.ts
var import_node_crypto = require("node:crypto");
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_os2 = __toESM(require("node:os"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
var PLAN_RUNS_DIR_BASENAME = "plan-runs";
var PLAN_RUN_ABANDONED_MS = 6 * 60 * 60 * 1e3;
var FORCE_SETTLE_PLAN_RUN_MUTATION = `
mutation ForceSettlePlanRunFromHook($input: ForceSettlePlanRunInput!) {
  forceSettlePlanRun(input: $input) {
    id
    status
  }
}
`;
var PLAN_RUN_JANITOR_SETTLED_REASON = `Claude Code Stop janitor: the session's run record was untouched past the abandonment threshold and its MCP process was gone.`;
var planRunsDir = (repoRoot) => {
  const repoKey = (0, import_node_crypto.createHash)("sha256").update(import_node_path3.default.resolve(repoRoot)).digest("hex").slice(0, 16);
  return import_node_path3.default.join(resolveTelemetryDir(), PLAN_RUNS_DIR_BASENAME, repoKey);
};
var sanitizeSessionId = (sessionId) => {
  return String(sessionId).replace(/[^A-Za-z0-9._-]/g, "-");
};
var planRunFilePath = (repoRoot, sessionId) => {
  return import_node_path3.default.join(
    planRunsDir(repoRoot),
    `${sanitizeSessionId(sessionId)}.json`
  );
};
var touchPlanRunForSession = ({
  now = Date.now(),
  repoRoot,
  sessionId
}) => {
  const sid = sessionId.trim();
  if (sid === "") return false;
  const filePath = planRunFilePath(repoRoot, sid);
  try {
    const at = new Date(now);
    import_node_fs2.default.utimesSync(filePath, at, at);
    return true;
  } catch {
    return false;
  }
};
var defaultIsProcessAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return isRecord(err) && err.code === "EPERM";
  }
};
var readPid = (value) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
};
var readPlanRunRecord = (filePath) => {
  try {
    const parsed = JSON.parse(import_node_fs2.default.readFileSync(filePath, "utf8"));
    if (!isRecord(parsed) || typeof parsed.planRunId !== "string" || parsed.planRunId.trim() === "") {
      return null;
    }
    return {
      hostname: typeof parsed.hostname === "string" ? parsed.hostname : null,
      pid: readPid(parsed.pid),
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
        query: FORCE_SETTLE_PLAN_RUN_MUTATION,
        variables: {
          input: { planRunId, reason: PLAN_RUN_JANITOR_SETTLED_REASON }
        }
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
  hostname = import_node_os2.default.hostname(),
  isProcessAlive = defaultIsProcessAlive,
  maxAgeMs = PLAN_RUN_ABANDONED_MS,
  now = Date.now(),
  repoRoot,
  timeoutMs = 750
}) => {
  if (typeof currentSessionId === "string") {
    touchPlanRunForSession({ now, repoRoot, sessionId: currentSessionId });
  }
  const dir = planRunsDir(repoRoot);
  let files;
  try {
    files = import_node_fs2.default.readdirSync(dir);
  } catch {
    return { settled: 0 };
  }
  let currentFile = null;
  if (typeof currentSessionId === "string" && currentSessionId.trim() !== "") {
    currentFile = `${sanitizeSessionId(currentSessionId.trim())}.json`;
  }
  let graphqlUrl = graphqlUrlOverride;
  if (graphqlUrlOverride === void 0) {
    graphqlUrl = resolveGraphqlUrl(repoRoot);
  }
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
    const isOwnerAlive = record.pid !== null && record.hostname === hostname && isProcessAlive(record.pid);
    if (isOwnerAlive) continue;
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
var nonEmptyString = (value) => {
  return typeof value === "string" && value.trim() !== "" ? value : null;
};
var normalizeClaudeStopPayload = (raw) => {
  if (!isRecord(raw)) {
    return null;
  }
  const sessionId = typeof raw.session_id === "string" ? raw.session_id.trim() : "";
  if (!sessionId) {
    return null;
  }
  return {
    agent_transcript_path: nonEmptyString(raw.agent_transcript_path),
    cwd: nonEmptyString(raw.cwd),
    hook_event_name: typeof raw.hook_event_name === "string" ? raw.hook_event_name : "Stop",
    session_id: sessionId,
    transcript_path: nonEmptyString(raw.transcript_path)
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
