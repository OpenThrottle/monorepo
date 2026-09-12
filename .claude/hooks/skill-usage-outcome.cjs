#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/outcome.ts
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

// packages/agentic-hooks/src/adapters/claude/outcome.ts
var import_node_path6 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/config/env.ts
var import_node_child_process2 = require("node:child_process");
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/config/profile.ts
var import_node_child_process = require("node:child_process");
var import_node_crypto = require("node:crypto");
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_os = __toESM(require("node:os"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var REPO_PROFILES = Object.freeze({
  FOREIGN: "foreign",
  HOME: "home"
});
var HOME_MARKER = ".openthrottle.mjs";
var resolveRepoProfile = (repoRoot) => {
  try {
    return import_node_fs.default.existsSync(import_node_path.default.join(repoRoot, HOME_MARKER)) ? REPO_PROFILES.HOME : REPO_PROFILES.FOREIGN;
  } catch {
    return REPO_PROFILES.FOREIGN;
  }
};
var normalizeRemoteUrl = (remote) => {
  let rest = remote.trim();
  if (!rest) {
    return null;
  }
  const schemeEnd = rest.indexOf("://");
  if (schemeEnd !== -1) {
    rest = rest.slice(schemeEnd + 3);
  }
  const at = rest.lastIndexOf("@");
  if (at !== -1) {
    rest = rest.slice(at + 1);
  }
  const colon = rest.indexOf(":");
  if (colon !== -1) {
    const after = rest.slice(colon + 1);
    rest = /^\d+(\/|$)/.test(after) ? `${rest.slice(0, colon)}${after.replace(/^\d+/, "")}` : `${rest.slice(0, colon)}/${after}`;
  }
  rest = rest.replace(/\.git$/, "").replace(/\/+$/, "");
  const slash = rest.indexOf("/");
  if (slash === -1) {
    return rest.toLowerCase() || null;
  }
  return `${rest.slice(0, slash).toLowerCase()}${rest.slice(slash)}`;
};
var identityCache = /* @__PURE__ */ new Map();
var resolveRepoIdentity = (repoRoot) => {
  const cached = identityCache.get(repoRoot);
  if (cached !== void 0) {
    return cached;
  }
  const resolved = readRepoIdentity(repoRoot);
  identityCache.set(repoRoot, resolved);
  return resolved;
};
var readRepoIdentity = (repoRoot) => {
  try {
    const remote = (0, import_node_child_process.execFileSync)(
      "git",
      ["config", "--get", "remote.origin.url"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 2e3
      }
    ).trim();
    return remote ? normalizeRemoteUrl(remote) : null;
  } catch {
    return null;
  }
};
var openThrottleHome = () => import_node_path.default.join(import_node_os.default.homedir(), ".openthrottle");
var foreignStateDir = (repoRoot) => {
  const key = resolveRepoIdentity(repoRoot) ?? repoRoot;
  const hash = (0, import_node_crypto.createHash)("sha256").update(key).digest("hex").slice(0, 32);
  return import_node_path.default.join(openThrottleHome(), "skill-usage", hash);
};
var OPERATOR_CONFIG_PATH_REL = "hooks.json";
var readOperatorConfig = () => {
  try {
    const raw = import_node_fs.default.readFileSync(
      import_node_path.default.join(openThrottleHome(), OPERATOR_CONFIG_PATH_REL),
      "utf8"
    );
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? { ...parsed } : {};
  } catch {
    return {};
  }
};

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
    return (0, import_node_child_process2.execFileSync)("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
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
    const envPath = import_node_path2.default.join(repoRoot, ".env");
    if (!import_node_fs2.default.existsSync(envPath)) {
      return out;
    }
    const text = import_node_fs2.default.readFileSync(envPath, "utf8");
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
var OPERATOR_CONFIG_KEYS = Object.freeze({
  OPENTHROTTLE_GRAPHQL_URL: "graphqlUrl",
  OPENTHROTTLE_MCP_AUTH_TOKEN: "authToken",
  OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN: "authToken"
});
var operatorConfigValue = (key) => {
  const field = OPERATOR_CONFIG_KEYS[key];
  if (field === void 0) {
    return "";
  }
  const value = readOperatorConfig()[field];
  return typeof value === "string" && value.trim() ? value.trim() : "";
};
var resolveOtEnv = (repoRoot, key) => {
  const skillOverride = key === "OPENTHROTTLE_GRAPHQL_URL" ? process.env.SKILL_USAGE_GRAPHQL_URL : key === "OPENTHROTTLE_MCP_AUTH_TOKEN" ? process.env.SKILL_USAGE_AUTH_TOKEN : void 0;
  if (skillOverride && skillOverride.trim()) {
    return skillOverride.trim();
  }
  if (repoRoot && resolveRepoProfile(repoRoot) === REPO_PROFILES.HOME) {
    const fromFile = readRepoEnvFile(repoRoot)[key];
    if (fromFile && fromFile.trim()) {
      return fromFile.trim();
    }
  }
  const fromProcess = process.env[key];
  if (fromProcess && fromProcess.trim()) {
    return fromProcess.trim();
  }
  return operatorConfigValue(key);
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
  if (repoRoot && resolveRepoProfile(repoRoot) === REPO_PROFILES.HOME) {
    const fromFile = graphqlUrlFromEnvMap(readRepoEnvFile(repoRoot));
    if (fromFile) {
      return fromFile;
    }
  }
  const fromProcess = graphqlUrlFromEnvMap(process.env);
  if (fromProcess) {
    return fromProcess;
  }
  const fromOperator = operatorConfigValue("OPENTHROTTLE_GRAPHQL_URL");
  return fromOperator ? fromOperator.replace(/\/$/, "") : null;
};
var resolveAuthToken = (repoRoot) => resolveOtEnv(repoRoot, "OPENTHROTTLE_MCP_AUTH_TOKEN") || resolveOtEnv(repoRoot, "OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN") || "";

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
var import_node_path3 = __toESM(require("node:path"), 1);
var detectScope = (skillName, repoRoot) => {
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
  return "third-party";
};

// packages/agentic-hooks/src/data/events.ts
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
  cwd,
  source
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

// packages/agentic-hooks/src/data/jsonl.ts
var import_node_fs4 = __toESM(require("node:fs"), 1);
var import_node_path4 = __toESM(require("node:path"), 1);
var BUFFER_DIR_REL = import_node_path4.default.join(".cache", "skill-usage");
var OUTCOMES_LEAF = "outcomes.jsonl";
var DEFAULT_JSONL_REL = import_node_path4.default.join(
  ".cache",
  "skill-usage",
  "events.jsonl"
);
var DEFAULT_OUTCOMES_JSONL_REL = import_node_path4.default.join(
  ".cache",
  "skill-usage",
  "outcomes.jsonl"
);
var DEFAULT_STARTS_DIR_REL = import_node_path4.default.join(
  ".cache",
  "skill-usage",
  "starts"
);
var appendJsonl = (jsonlPath, event) => {
  import_node_fs4.default.mkdirSync(import_node_path4.default.dirname(jsonlPath), { recursive: true });
  import_node_fs4.default.appendFileSync(jsonlPath, `${JSON.stringify(event)}
`, "utf8");
};
var bufferPath = (repoRoot, leaf) => resolveRepoProfile(repoRoot) === REPO_PROFILES.FOREIGN ? import_node_path4.default.join(foreignStateDir(repoRoot), leaf) : import_node_path4.default.join(repoRoot, BUFFER_DIR_REL, leaf);
var defaultOutcomesJsonlPath = (repoRoot) => bufferPath(repoRoot, OUTCOMES_LEAF);

// packages/nodejs-utils/dist/src/utils/is-record.js
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

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

// packages/agentic-hooks/src/data/plan-runs.ts
var import_node_path5 = __toESM(require("node:path"), 1);
var PLAN_RUNS_DIR_REL = import_node_path5.default.join(".cache", "plan-runs");
var PLAN_RUN_ABANDONED_MS = 6 * 60 * 60 * 1e3;

// packages/agentic-hooks/src/adapters/claude/payload.ts
var CLAUDE_SOURCE = "claude-code";

// packages/agentic-hooks/src/adapters/claude/outcome.ts
var parseArgs = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token || !token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next != null && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = "1";
    }
  }
  return out;
};
var main = async () => {
  try {
    const args = parseArgs(process.argv.slice(2));
    const repoRoot = process.env.CLAUDE_PROJECT_DIR || process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd();
    const skillName = args.skill || process.env.SKILL_USAGE_SKILL_NAME || "";
    const outcome = args.outcome || process.env.SKILL_USAGE_OUTCOME || "";
    const sessionId = args.session || process.env.SKILL_USAGE_SESSION_ID || process.env.CLAUDE_SESSION_ID || null;
    const toolUseId = args["tool-use-id"] || process.env.SKILL_USAGE_TOOL_USE_ID || null;
    const durationRaw = args["duration-ms"] || process.env.SKILL_USAGE_DURATION_MS || "";
    const durationMs = durationRaw === "" ? null : Number(durationRaw);
    if (outcome !== SKILL_USAGE_OUTCOMES.SUCCESS && outcome !== SKILL_USAGE_OUTCOMES.ABANDONED && outcome !== SKILL_USAGE_OUTCOMES.ERROR) {
      logHookError(
        `invalid --outcome (want ${Object.values(SKILL_USAGE_OUTCOMES).join("|")})`
      );
      return;
    }
    const event = buildOutcomeEvent({
      durationMs,
      outcome,
      repoRoot,
      sessionId,
      skillName,
      source: CLAUDE_SOURCE,
      toolUseId
    });
    if (!event) {
      logHookError("could not build outcome event (missing --skill?)");
      return;
    }
    const outPath = process.env.SKILL_USAGE_OUTCOMES_JSONL_PATH || defaultOutcomesJsonlPath(repoRoot);
    await persistOutcomeEvent({
      event,
      jsonlPath: import_node_path6.default.resolve(outPath),
      repoRoot
    });
  } catch (err) {
    logHookError("outcome helper failed", err);
  }
};
main().finally(() => {
  process.exit(0);
});
