#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/require-ot-plan-kickoff.ts
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

// packages/agentic-hooks/src/adapters/claude/require-ot-plan-kickoff.ts
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
var import_node_path2 = __toESM(require("node:path"), 1);
var SKILL_LINK_DIR = import_node_path2.default.join(".agents", "skills");

// packages/agentic-hooks/src/data/events.ts
var SKILL_USAGE_OUTCOMES = Object.freeze({
  ABANDONED: "abandoned",
  ERROR: "error",
  SESSION_ENDED: "session_ended",
  SUCCESS: "success"
});
var SKILL_USAGE_QUALITY_OUTCOMES = Object.freeze([SKILL_USAGE_OUTCOMES.ERROR, SKILL_USAGE_OUTCOMES.SUCCESS]);

// packages/agentic-hooks/src/data/kickoff.ts
var OT_LOOP_LINE = /^\/ot-loop\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/i;
var LOOKUP_QUERY = `
query KickoffGuardLookup($id: ID!) {
  plan(id: $id) { id }
  task(id: $id) { id }
}
`;
var REMEDIATION = "Create the plan first (create_plan + create_tasks, status PENDING, tagged follow-up), then re-issue this call with a brief whose first line is `/ot-loop <planId>`. See skills/ot-plans/SKILL.md § Follow-ups and session kickoff.";
var KICKOFF_ALLOW = { decision: "allow" };
var parseKickoffPlanId = (brief) => {
  const firstLine = brief.split("\n").find((line) => line.trim() !== "");
  const match = firstLine?.trim().match(OT_LOOP_LINE);
  return match?.[1] ?? null;
};
var lookupOtId = async ({
  authToken,
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  id,
  timeoutMs
}) => {
  if (!graphqlUrl || typeof fetchImpl !== "function") return "unknown";
  try {
    const response = await fetchImpl(graphqlUrl, {
      body: JSON.stringify({ query: LOOKUP_QUERY, variables: { id } }),
      headers: {
        "Content-Type": "application/json",
        ...authToken ? { Authorization: `Bearer ${authToken}` } : {}
      },
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) return "unknown";
    const payload = await response.json();
    if (!isRecord(payload) || !isRecord(payload.data)) return "unknown";
    const { plan, task } = payload.data;
    if (isRecord(plan) || isRecord(task)) return "found";
    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      return "unknown";
    }
    return "missing";
  } catch (err) {
    logHookError("kickoff-guard: OT lookup failed", err);
    return "unknown";
  }
};
var decideKickoffBrief = async (brief, lookup) => {
  if (brief === null || brief.trim() === "") return KICKOFF_ALLOW;
  const planId = parseKickoffPlanId(brief);
  if (planId === null) {
    return {
      decision: "deny",
      reason: `Session kickoffs in this repo run from an OpenThrottle plan, and this brief does not start with \`/ot-loop <planUuid>\`. ${REMEDIATION}`
    };
  }
  if (await lookup(planId) === "missing") {
    return {
      decision: "deny",
      reason: `\`/ot-loop ${planId}\` names no OpenThrottle plan or task. ${REMEDIATION}`
    };
  }
  return KICKOFF_ALLOW;
};

// packages/agentic-hooks/src/data/token-usage.ts
var MAX_TOKEN_USAGE_BATCH_BYTES = 64 * 1024;

// packages/agentic-hooks/src/data/persist.ts
var DEFAULT_ABANDONED_MS = 6 * 60 * 60 * 1e3;

// packages/agentic-hooks/src/data/plan-runs.ts
var import_node_path3 = __toESM(require("node:path"), 1);
var PLAN_RUNS_DIR_REL = import_node_path3.default.join(".cache", "plan-runs");
var PLAN_RUN_ABANDONED_MS = 6 * 60 * 60 * 1e3;

// packages/agentic-hooks/src/adapters/claude/kickoff-guard.ts
var KICKOFF_TOOL_SUFFIXES = [
  "__start_session",
  "__hand_off_to_session"
];
var BRIEF_KEYS = ["prompt", "remaining_plan"];
var isKickoffTool = (raw) => isRecord(raw) && typeof raw.tool_name === "string" && KICKOFF_TOOL_SUFFIXES.some(
  (suffix) => String(raw.tool_name).endsWith(suffix)
);
var readKickoffBrief = (raw) => {
  if (!isRecord(raw) || !isRecord(raw.tool_input)) return null;
  const toolInput = raw.tool_input;
  for (const key of BRIEF_KEYS) {
    const value = toolInput[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
};
var decideKickoff = async (raw, lookup) => isKickoffTool(raw) ? decideKickoffBrief(readKickoffBrief(raw), lookup) : KICKOFF_ALLOW;

// packages/agentic-hooks/src/adapters/claude/require-ot-plan-kickoff.ts
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
      logHookError("require-ot-plan-kickoff: invalid JSON stdin", err);
      return;
    }
    const result = await decideKickoff(
      raw,
      (id) => lookupOtId({
        authToken: resolveAuthToken(repoRoot),
        graphqlUrl: resolveGraphqlUrl(repoRoot),
        id,
        timeoutMs: LOOKUP_TIMEOUT_MS
      })
    );
    if (result.decision !== "deny") return;
    process.stdout.write(
      `${JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: result.reason
        }
      })}
`
    );
  } catch (err) {
    logHookError("require-ot-plan-kickoff failed", err);
  }
};
main().finally(() => {
  process.exit(0);
});
