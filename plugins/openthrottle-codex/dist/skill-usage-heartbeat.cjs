#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/codex/heartbeat.ts
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

// packages/agentic-hooks/src/adapters/codex/heartbeat.ts
var import_node_os2 = __toESM(require("node:os"), 1);
var import_node_path6 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/data/jsonl.ts
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

// packages/agentic-hooks/src/utils/normalizeRemoteUrl.ts
var normalizeRemoteUrl = (raw) => {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }
  let url = trimmed.replace(/^git@([^:/]+):/, "https://$1/").replace(/^ssh:\/\/(?:[^@/]+@)?/, "https://").replace(/^http:\/\//, "https://").replace(/^https:\/\/[^@/]+@/, "https://");
  if (!/^https:\/\/[^/]+\/.+/.test(url)) {
    return null;
  }
  url = url.replace(/\.git$/, "").replace(/\/+$/, "");
  const withoutScheme = url.slice("https://".length);
  const slashIndex = withoutScheme.indexOf("/");
  if (slashIndex === -1) {
    return null;
  }
  const host = withoutScheme.slice(0, slashIndex).toLowerCase();
  const path7 = withoutScheme.slice(slashIndex);
  return `https://${host}${path7}`;
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
var repoIdentityCache = /* @__PURE__ */ new Map();
var resolveRepoIdentity = (repoRoot) => {
  const cached = repoIdentityCache.get(repoRoot);
  if (cached !== void 0) {
    return cached;
  }
  let identity = null;
  try {
    const remote = (0, import_node_child_process.execFileSync)(
      "git",
      ["config", "--get", "remote.origin.url"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 1e3
      }
    );
    identity = normalizeRemoteUrl(remote);
  } catch {
    identity = null;
  }
  repoIdentityCache.set(repoRoot, identity);
  return identity;
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
var resolveOtEnv = (repoRoot, key, options) => {
  return resolveConcern(repoRoot, options, [key], (values) => {
    return pickTrimmed(values, key);
  }) ?? "";
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
var EVENTS_JSONL_BASENAME = "events.jsonl";
var OUTCOMES_JSONL_BASENAME = "outcomes.jsonl";
var TOKEN_USAGE_JSONL_BASENAME = "token-usage.jsonl";
var TRAJECTORIES_JSONL_BASENAME = "trajectories.jsonl";
var resolveTelemetryDir = () => {
  return process.env.OPENTHROTTLE_TELEMETRY_DIR?.trim() || import_node_path2.default.join(userConfigDir(), TELEMETRY_DIR_BASENAME);
};
var defaultJsonlPath = () => {
  return import_node_path2.default.join(resolveTelemetryDir(), EVENTS_JSONL_BASENAME);
};
var defaultOutcomesJsonlPath = () => {
  return import_node_path2.default.join(resolveTelemetryDir(), OUTCOMES_JSONL_BASENAME);
};
var defaultTokenUsageJsonlPath = () => {
  return import_node_path2.default.join(resolveTelemetryDir(), TOKEN_USAGE_JSONL_BASENAME);
};
var defaultTrajectoriesJsonlPath = () => {
  return import_node_path2.default.join(resolveTelemetryDir(), TRAJECTORIES_JSONL_BASENAME);
};
var deadLetterPathFor = (filePath) => {
  return filePath.replace(/\.jsonl$/, "") + ".dead-letter.jsonl";
};

// packages/nodejs-utils/src/utils/errors.ts
var toErrorMessage = (error, fallback = void 0) => {
  const message = error instanceof Error ? error.message : String(error);
  const isBlank = message.trim().length === 0;
  return fallback !== void 0 && isBlank ? fallback : message;
};

// packages/nodejs-utils/src/utils/guards.ts
var isRecord = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

// packages/agentic-hooks/src/config/isTelemetryDisabled.ts
var TELEMETRY_DISABLED_ENV_KEY = "OPENTHROTTLE_SKILL_USAGE_DISABLED";
var isTruthy = (value) => {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
};
var isTelemetryDisabled = () => {
  if (isTruthy(process.env[TELEMETRY_DISABLED_ENV_KEY])) {
    return true;
  }
  try {
    return isTruthy(readUserEnvFile()[TELEMETRY_DISABLED_ENV_KEY]);
  } catch {
    return false;
  }
};

// packages/agentic-hooks/src/data/graphql.ts
var PERMANENT_GRAPHQL_CODES = [
  "BAD_REQUEST",
  "BAD_USER_INPUT",
  "GRAPHQL_PARSE_FAILED",
  "GRAPHQL_VALIDATION_FAILED"
];
var SCHEMA_SKEW_MESSAGE_PATTERNS = [
  /Field "[^"]+" is not defined by type "[^"]+"/,
  /Cannot query field "[^"]+" on type "[^"]+"/,
  /Unknown argument "[^"]+" on field "[^"]+"/,
  /Unknown type "[^"]+"/,
  /Value "[^"]+" does not exist in "[^"]+" enum/
];
var isSchemaSkewMessage = (message) => {
  return SCHEMA_SKEW_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));
};
var TRANSIENT_CLIENT_STATUSES = [401, 403, 408, 429];
var isPermanentHttpStatus = (status) => {
  return status >= 400 && status < 500 && !TRANSIENT_CLIENT_STATUSES.includes(status);
};
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
    const message = typeof error.message === "string" ? error.message : "";
    messages.push(message);
    if (isSchemaSkewMessage(message)) {
      continue;
    }
    const extensions = isRecord(error.extensions) ? error.extensions : {};
    const code = typeof extensions.code === "string" ? extensions.code : "";
    const status = readStatusCode(extensions);
    if (PERMANENT_GRAPHQL_CODES.includes(code) || status !== null && isPermanentHttpStatus(status)) {
      permanent = true;
    }
  }
  return { message: messages.join("; "), permanent };
};
var readMutationData = (payload, field) => {
  return isRecord(payload) && isRecord(payload.data) ? payload.data[field] : void 0;
};
var transient = (reason) => {
  return {
    ok: false,
    permanent: false,
    reason
  };
};
var UNKNOWN_INPUT_FIELD = /Field "[^"]+" is not defined by type/;
var postMutationOnce = async ({
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
    if (err instanceof Error && err.name === "TimeoutError") {
      return transient("timeout");
    }
    if (err instanceof Error) {
      return transient(err.message);
    }
    return transient(String(err));
  }
  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    return {
      ok: false,
      permanent: isPermanentHttpStatus(response.status),
      reason: `invalid json (${response.status}): ${toErrorMessage(err)}`
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
var postMutation = async (args) => {
  const posted = await postMutationOnce(args);
  const { legacyVariables } = args;
  if (posted.ok || legacyVariables === void 0 || !UNKNOWN_INPUT_FIELD.test(posted.reason)) {
    return posted;
  }
  return postMutationOnce({ ...args, variables: legacyVariables });
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

// packages/agentic-hooks/src/utils/checkout-root.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
var findGitAncestor = (dir) => {
  if (import_node_fs2.default.existsSync(import_node_path3.default.join(dir, ".git"))) {
    return dir;
  }
  const parent = import_node_path3.default.dirname(dir);
  if (parent === dir) {
    return null;
  }
  return findGitAncestor(parent);
};
var resolveCheckoutRoot = (dir) => {
  if (dir === null || dir === "" || !import_node_path3.default.isAbsolute(dir)) {
    return null;
  }
  try {
    return findGitAncestor(import_node_path3.default.resolve(dir));
  } catch {
    return null;
  }
};
var resolveHookRepoRoot = ({
  payloadCwd,
  projectDir
}) => {
  return resolveCheckoutRoot(projectDir) ?? resolveCheckoutRoot(payloadCwd) ?? projectDir;
};

// packages/agentic-hooks/src/data/heartbeat.ts
var import_node_crypto = __toESM(require("node:crypto"), 1);
var import_node_fs4 = __toESM(require("node:fs"), 1);
var import_node_path4 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/data/persist.ts
var DEFAULT_POST_TIMEOUT_MS = 750;
var DEFAULT_ABANDONED_MS = 6 * 60 * 60 * 1e3;

// packages/agentic-hooks/src/data/readBufferStats.ts
var import_node_fs3 = __toESM(require("node:fs"), 1);
var COUNT_CHUNK_BYTES = 64 * 1024;
var HEAD_CAP_BYTES = 64 * 1024;
var TIMESTAMP_FIELDS = [
  "occurred_at",
  "started_at",
  "received_at",
  "created_at",
  "timestamp"
];
var readFileHead = (fd) => {
  const buf = Buffer.alloc(HEAD_CAP_BYTES);
  const read = import_node_fs3.default.readSync(fd, buf, 0, HEAD_CAP_BYTES, 0);
  return buf.toString("utf8", 0, read);
};
var scanFile = (filePath) => {
  try {
    const fd = import_node_fs3.default.openSync(filePath, "r");
    try {
      const buf = Buffer.alloc(COUNT_CHUNK_BYTES);
      let lines = 0;
      let lineHasContent = false;
      let position = 0;
      for (; ; ) {
        const read = import_node_fs3.default.readSync(fd, buf, 0, COUNT_CHUNK_BYTES, position);
        if (read === 0) {
          break;
        }
        position += read;
        for (let i = 0; i < read; i += 1) {
          const byte = buf[i];
          if (byte === 10) {
            if (lineHasContent) {
              lines += 1;
            }
            lineHasContent = false;
          } else if (byte !== 13 && byte !== 32 && byte !== 9) {
            lineHasContent = true;
          }
        }
      }
      if (lineHasContent) {
        lines += 1;
      }
      if (lines === 0) {
        return { firstLine: null, lines: 0 };
      }
      const firstLine = readFileHead(fd).split("\n").find((line) => line.trim() !== "") ?? null;
      return { firstLine, lines };
    } finally {
      import_node_fs3.default.closeSync(fd);
    }
  } catch {
    return { firstLine: null, lines: 0 };
  }
};
var timestampOfLine = (line) => {
  if (line === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(line);
    if (!isRecord(parsed)) {
      return null;
    }
    for (const field of TIMESTAMP_FIELDS) {
      const value = parsed[field];
      if (typeof value === "string" || typeof value === "number") {
        const ms = new Date(value).getTime();
        return Number.isNaN(ms) ? null : new Date(ms).toISOString();
      }
    }
    return null;
  } catch {
    return null;
  }
};
var statsForFile = (label, filePath) => {
  const live = scanFile(filePath);
  const dead = scanFile(deadLetterPathFor(filePath));
  return {
    deadLetterLines: dead.lines,
    label,
    lines: live.lines,
    oldestAt: timestampOfLine(live.firstLine)
  };
};
var readBufferStats = () => {
  const files = [
    statsForFile("events", defaultJsonlPath()),
    statsForFile("outcomes", defaultOutcomesJsonlPath()),
    statsForFile("token-usage", defaultTokenUsageJsonlPath()),
    statsForFile("trajectories", defaultTrajectoriesJsonlPath())
  ];
  const stamps = files.map((file) => file.oldestAt).filter((at) => at !== null).sort();
  return {
    files,
    oldestAt: stamps[0] ?? null,
    totalDeadLetterLines: files.reduce((n, f) => n + f.deadLetterLines, 0),
    totalLines: files.reduce((n, f) => n + f.lines, 0)
  };
};

// packages/agentic-hooks/src/data/heartbeat.ts
var RECORD_TELEMETRY_HEARTBEAT_MUTATION = `
mutation RecordTelemetryHeartbeat($input: RecordTelemetryHeartbeatInput!) {
  recordTelemetryHeartbeat(input: $input) {
    id
  }
}
`;
var MAX_MACHINE_LABEL_LENGTH = 64;
var MACHINE_ID_BASENAME = "machine-id";
var LAST_HEARTBEAT_BASENAME = "last-heartbeat.json";
var SAFE_MACHINE_ID = /^[A-Za-z0-9-]{8,64}$/;
var HOOK_DELIVERY_ENV = "OPENTHROTTLE_HOOK_DELIVERY";
var UNKNOWN_MARKETPLACE_INSTALL = Object.freeze({
  installed: null,
  version: null
});
var isPathInside = (parent, child) => {
  const relative = import_node_path4.default.relative(import_node_path4.default.resolve(parent), import_node_path4.default.resolve(child));
  return relative !== "" && !relative.startsWith("..") && !import_node_path4.default.isAbsolute(relative);
};
var detectDeliveryLeg = ({
  env,
  marketplaceCacheDir,
  pluginRoot
}) => {
  if (env[HOOK_DELIVERY_ENV]?.trim() === "plugin-dir") {
    return "plugin-dir";
  }
  const root = pluginRoot?.trim();
  if (!root) {
    return "repo";
  }
  if (marketplaceCacheDir !== null && isPathInside(marketplaceCacheDir, root)) {
    return "marketplace";
  }
  return "plugin-dir";
};
var detectDeliveryLegFromScript = ({
  env,
  marketplaceCacheDir,
  repoRoot,
  scriptPath
}) => {
  const outsideRepo = scriptPath !== void 0 && !isPathInside(repoRoot, scriptPath);
  return detectDeliveryLeg({
    env,
    marketplaceCacheDir,
    pluginRoot: outsideRepo ? import_node_path4.default.dirname(scriptPath) : null
  });
};
var readHookPayloadCwd = (stdin) => {
  try {
    const parsed = JSON.parse(stdin);
    if (isRecord(parsed) && typeof parsed.cwd === "string" && parsed.cwd) {
      return parsed.cwd;
    }
  } catch {
  }
  return null;
};
var readHookStdin = () => {
  try {
    return import_node_fs4.default.readFileSync(0, "utf8");
  } catch {
    return "";
  }
};
var sanitizeMachineLabel = (raw) => {
  const trimmed = raw.trim().slice(0, MAX_MACHINE_LABEL_LENGTH).trim();
  return trimmed === "" ? null : trimmed;
};
var readVersionField = (rawJson) => {
  try {
    const parsed = JSON.parse(rawJson);
    if (!isRecord(parsed) || typeof parsed.version !== "string") {
      return null;
    }
    return parsed.version.trim() || null;
  } catch {
    return null;
  }
};
var readTextOrNull = (filePath) => {
  try {
    return import_node_fs4.default.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
};
var readFirstManifestVersion = (manifestPaths) => {
  for (const manifest of manifestPaths) {
    const raw = readTextOrNull(manifest);
    const version = raw === null ? null : readVersionField(raw);
    if (version !== null) {
      return version;
    }
  }
  return null;
};
var listSubdirectoriesNewestFirst = (dirPath) => {
  let names;
  try {
    names = import_node_fs4.default.readdirSync(dirPath);
  } catch {
    return [];
  }
  const dirs = [];
  for (const name of names) {
    const dir = import_node_path4.default.join(dirPath, name);
    try {
      const stat = import_node_fs4.default.statSync(dir);
      if (stat.isDirectory()) {
        dirs.push({ dir, mtimeMs: stat.mtimeMs });
      }
    } catch {
    }
  }
  return dirs.sort((left, right) => right.mtimeMs - left.mtimeMs).map((entry) => entry.dir);
};
var buildHeartbeatInput = ({
  bufferStats,
  deliveryLeg,
  machineId,
  machineLabel,
  marketplace,
  now,
  pluginVersion,
  repoIdentity,
  source
}) => {
  const countFor = (label) => {
    return bufferStats.files.find((file) => file.label === label)?.lines ?? 0;
  };
  return {
    bufferedEvents: countFor("events"),
    bufferedOutcomes: countFor("outcomes"),
    bufferedTokenUsage: countFor("token-usage"),
    bufferedTrajectories: countFor("trajectories"),
    deadLetterCount: bufferStats.totalDeadLetterLines,
    deliveryLeg,
    machineId,
    machineLabel,
    marketplacePluginInstalled: marketplace.installed,
    marketplacePluginVersion: marketplace.version,
    occurredAt: now.toISOString(),
    oldestBufferedAt: bufferStats.oldestAt,
    pluginVersion,
    repoIdentity,
    source
  };
};
var resolveMachineId = () => {
  const idPath = import_node_path4.default.join(userConfigDir(), MACHINE_ID_BASENAME);
  const existing = readTextOrNull(idPath)?.trim() ?? "";
  if (SAFE_MACHINE_ID.test(existing)) {
    return existing;
  }
  try {
    import_node_fs4.default.mkdirSync(import_node_path4.default.dirname(idPath), { recursive: true });
    const created = import_node_crypto.default.randomUUID();
    import_node_fs4.default.writeFileSync(idPath, `${created}
`, { mode: 384 });
    return created;
  } catch {
    return null;
  }
};
var writeReceipt = (receipt) => {
  try {
    const receiptPath = import_node_path4.default.join(
      resolveTelemetryDir(),
      LAST_HEARTBEAT_BASENAME
    );
    import_node_fs4.default.mkdirSync(import_node_path4.default.dirname(receiptPath), { recursive: true });
    import_node_fs4.default.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}
`);
  } catch {
  }
};
var sendHeartbeat = async ({
  deliveryLeg,
  env = process.env,
  fetchImpl = globalThis.fetch,
  marketplace,
  now = () => /* @__PURE__ */ new Date(),
  pluginVersion,
  repoRoot,
  resolveRepoIdentity: resolveIdentity = resolveRepoIdentity,
  source,
  timeoutMs = DEFAULT_POST_TIMEOUT_MS
}) => {
  try {
    const machineId = resolveMachineId();
    if (machineId === null) {
      return null;
    }
    const attemptedAt = now();
    const payload = buildHeartbeatInput({
      bufferStats: readBufferStats(),
      deliveryLeg,
      machineId,
      machineLabel: sanitizeMachineLabel(
        resolveOtEnv(repoRoot, "OPENTHROTTLE_MACHINE_LABEL")
      ),
      marketplace,
      now: attemptedAt,
      pluginVersion,
      repoIdentity: resolveIdentity(repoRoot),
      source
    });
    const receiptBase = { attemptedAt: attemptedAt.toISOString(), payload };
    if (env.OPENTHROTTLE_TELEMETRY_OFFLINE === "1") {
      const receipt2 = { ...receiptBase, delivered: false, error: "offline" };
      writeReceipt(receipt2);
      return receipt2;
    }
    const graphqlUrl = resolveGraphqlUrl(repoRoot);
    if (!graphqlUrl) {
      const receipt2 = {
        ...receiptBase,
        delivered: false,
        error: "no endpoint"
      };
      writeReceipt(receipt2);
      return receipt2;
    }
    const result = await postGraphqlMutation({
      authToken: resolveAuthToken(repoRoot),
      fetchImpl,
      field: "recordTelemetryHeartbeat",
      graphqlUrl,
      query: RECORD_TELEMETRY_HEARTBEAT_MUTATION,
      timeoutMs,
      variables: { input: payload }
    });
    if (result.ok) {
      const receipt2 = { ...receiptBase, delivered: true, error: null };
      writeReceipt(receipt2);
      return receipt2;
    }
    logHookError("heartbeat not delivered", result.reason);
    const receipt = { ...receiptBase, delivered: false, error: result.reason };
    writeReceipt(receipt);
    return receipt;
  } catch (err) {
    logHookError("heartbeat failed", err);
    return null;
  }
};

// packages/agentic-hooks/src/adapters/codex/marketplace-install.ts
var import_node_path5 = __toESM(require("node:path"), 1);
var MARKETPLACE_NAME = "openthrottle";
var PLUGIN_NAME = "openthrottle";
var PLUGIN_TABLE_HEADER = /^\s*\[\s*plugins\s*\.\s*(["'])openthrottle@openthrottle\1\s*\]\s*(#.*)?$/;
var ANY_TABLE_HEADER = /^\s*\[/;
var ENABLED_LINE = /^\s*enabled\s*=\s*(true|false)\s*(#.*)?$/;
var resolveCodexHome = (env, homeDir) => {
  const configured = env.CODEX_HOME?.trim();
  return configured ? import_node_path5.default.resolve(configured) : import_node_path5.default.join(homeDir, ".codex");
};
var resolveCodexMarketplaceCacheDir = (codexHome) => {
  return import_node_path5.default.join(codexHome, "plugins", "cache");
};
var parseCodexPluginEnabled = (configToml) => {
  if (configToml === null) {
    return null;
  }
  const lines = configToml.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => {
    return PLUGIN_TABLE_HEADER.test(line);
  });
  if (headerIndex === -1) {
    return false;
  }
  for (const line of lines.slice(headerIndex + 1)) {
    if (ANY_TABLE_HEADER.test(line)) {
      break;
    }
    const match = ENABLED_LINE.exec(line);
    if (match !== null) {
      return match[1] === "true";
    }
  }
  return true;
};
var readCodexMarketplaceInstall = ({
  cacheDir,
  configToml
}) => {
  const enabled = parseCodexPluginEnabled(configToml);
  if (enabled === null) {
    return UNKNOWN_MARKETPLACE_INSTALL;
  }
  if (!enabled) {
    return { installed: false, version: null };
  }
  const [newest] = listSubdirectoriesNewestFirst(
    import_node_path5.default.join(cacheDir, MARKETPLACE_NAME, PLUGIN_NAME)
  );
  if (newest === void 0) {
    return { installed: true, version: null };
  }
  return {
    installed: true,
    version: readFirstManifestVersion([
      import_node_path5.default.join(newest, ".codex-plugin", "plugin.json"),
      import_node_path5.default.join(newest, ".claude-plugin", "plugin.json"),
      import_node_path5.default.join(newest, "plugin.json")
    ])
  };
};

// packages/agentic-hooks/src/adapters/codex/payload.ts
var CODEX_SOURCE = "codex";

// packages/agentic-hooks/src/adapters/codex/heartbeat.ts
var main = async () => {
  try {
    if (isTelemetryDisabled()) {
      return;
    }
    const repoRoot = resolveHookRepoRoot({
      payloadCwd: readHookPayloadCwd(readHookStdin()),
      projectDir: process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd()
    });
    const codexHome = resolveCodexHome(process.env, import_node_os2.default.homedir());
    const marketplaceCacheDir = resolveCodexMarketplaceCacheDir(codexHome);
    await sendHeartbeat({
      deliveryLeg: detectDeliveryLegFromScript({
        env: process.env,
        marketplaceCacheDir,
        repoRoot,
        scriptPath: process.argv[1]
      }),
      marketplace: readCodexMarketplaceInstall({
        cacheDir: marketplaceCacheDir,
        configToml: readTextOrNull(import_node_path6.default.join(codexHome, "config.toml"))
      }),
      pluginVersion: null,
      repoRoot,
      source: CODEX_SOURCE
    });
  } catch (err) {
    logHookError("heartbeat failed", err);
  }
};
main().finally(() => {
  process.exit(0);
});
