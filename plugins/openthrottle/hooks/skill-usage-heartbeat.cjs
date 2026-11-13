#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/heartbeat.ts
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

// packages/agentic-hooks/src/adapters/claude/heartbeat.ts
var import_node_fs6 = __toESM(require("node:fs"), 1);

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

// packages/nodejs-utils/src/utils/isRecord.ts
var isRecord = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
var isRecord2 = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};
var timestampOfLine = (line) => {
  if (line === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(line);
    if (!isRecord2(parsed)) {
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

// packages/agentic-hooks/src/adapters/claude/heartbeat-run.ts
var import_node_crypto = __toESM(require("node:crypto"), 1);
var import_node_fs4 = __toESM(require("node:fs"), 1);
var import_node_os2 = __toESM(require("node:os"), 1);
var import_node_path5 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/adapters/claude/heartbeat-payload.ts
var import_node_path4 = __toESM(require("node:path"), 1);
var RECORD_TELEMETRY_HEARTBEAT_MUTATION = `
mutation RecordTelemetryHeartbeat($input: RecordTelemetryHeartbeatInput!) {
  recordTelemetryHeartbeat(input: $input) {
    id
  }
}
`;
var MARKETPLACE_PLUGIN_KEY = "openthrottle@openthrottle";
var MAX_MACHINE_LABEL_LENGTH = 64;
var resolveClaudeConfigDir = (env, homeDir) => {
  const configured = env.CLAUDE_CONFIG_DIR?.trim();
  return configured ? import_node_path4.default.resolve(configured) : import_node_path4.default.join(homeDir, ".claude");
};
var isInside = (parent, child) => {
  const relative = import_node_path4.default.relative(parent, child);
  return relative !== "" && !relative.startsWith("..") && !import_node_path4.default.isAbsolute(relative);
};
var detectDeliveryLeg = ({
  env,
  homeDir
}) => {
  if (env.OPENTHROTTLE_HOOK_DELIVERY?.trim() === "plugin-dir") {
    return "plugin-dir";
  }
  const pluginRoot = env.CLAUDE_PLUGIN_ROOT?.trim();
  if (!pluginRoot) {
    return "repo";
  }
  const cacheDir = import_node_path4.default.join(
    resolveClaudeConfigDir(env, homeDir),
    "plugins",
    "cache"
  );
  return isInside(cacheDir, import_node_path4.default.resolve(pluginRoot)) ? "marketplace" : "plugin-dir";
};
var parseMarketplaceInstall = (rawJson) => {
  const unknown = { installed: null, version: null };
  if (rawJson === null) {
    return unknown;
  }
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return unknown;
  }
  if (!isRecord(parsed) || !isRecord(parsed.plugins)) {
    return unknown;
  }
  const entries = parsed.plugins[MARKETPLACE_PLUGIN_KEY];
  if (entries === void 0) {
    return { installed: false, version: null };
  }
  if (!Array.isArray(entries)) {
    return unknown;
  }
  const [first] = entries;
  if (first === void 0) {
    return { installed: false, version: null };
  }
  const entryVersion = isRecord(first) ? first.version : null;
  const hasVersion = typeof entryVersion === "string" && entryVersion !== "";
  return { installed: true, version: hasVersion ? entryVersion : null };
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

// packages/agentic-hooks/src/adapters/claude/payload.ts
var CLAUDE_SOURCE = "claude-code";

// packages/agentic-hooks/src/adapters/claude/heartbeat-run.ts
var MACHINE_ID_BASENAME = "machine-id";
var LAST_HEARTBEAT_BASENAME = "last-heartbeat.json";
var SAFE_MACHINE_ID = /^[A-Za-z0-9-]{8,64}$/;
var readTextOrNull = (filePath) => {
  try {
    return import_node_fs4.default.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
};
var resolveMachineId = () => {
  const idPath = import_node_path5.default.join(userConfigDir(), MACHINE_ID_BASENAME);
  const existing = readTextOrNull(idPath)?.trim() ?? "";
  if (SAFE_MACHINE_ID.test(existing)) {
    return existing;
  }
  try {
    import_node_fs4.default.mkdirSync(import_node_path5.default.dirname(idPath), { recursive: true });
    const created = import_node_crypto.default.randomUUID();
    import_node_fs4.default.writeFileSync(idPath, `${created}
`, { mode: 384 });
    return created;
  } catch {
    return null;
  }
};
var resolvePluginVersion = (env) => {
  const pluginRoot = env.CLAUDE_PLUGIN_ROOT?.trim();
  if (!pluginRoot) {
    return null;
  }
  for (const manifest of [
    import_node_path5.default.join(pluginRoot, ".claude-plugin", "plugin.json"),
    import_node_path5.default.join(pluginRoot, "plugin.json")
  ]) {
    const raw = readTextOrNull(manifest);
    const version = raw === null ? null : readVersionField(raw);
    if (version !== null) {
      return version;
    }
  }
  return null;
};
var writeReceipt = (receipt) => {
  try {
    const receiptPath = import_node_path5.default.join(
      resolveTelemetryDir(),
      LAST_HEARTBEAT_BASENAME
    );
    import_node_fs4.default.mkdirSync(import_node_path5.default.dirname(receiptPath), { recursive: true });
    import_node_fs4.default.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}
`);
  } catch {
  }
};
var runHeartbeat = async ({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => /* @__PURE__ */ new Date(),
  repoRoot,
  timeoutMs = DEFAULT_POST_TIMEOUT_MS
}) => {
  try {
    const machineId = resolveMachineId();
    if (machineId === null) {
      return null;
    }
    const homeDir = import_node_os2.default.homedir();
    const marketplaceRaw = readTextOrNull(
      import_node_path5.default.join(
        resolveClaudeConfigDir(env, homeDir),
        "plugins",
        "installed_plugins.json"
      )
    );
    const attemptedAt = now();
    const payload = buildHeartbeatInput({
      bufferStats: readBufferStats(),
      deliveryLeg: detectDeliveryLeg({ env, homeDir }),
      machineId,
      machineLabel: sanitizeMachineLabel(
        resolveOtEnv(repoRoot, "OPENTHROTTLE_MACHINE_LABEL")
      ),
      marketplace: parseMarketplaceInstall(marketplaceRaw),
      now: attemptedAt,
      pluginVersion: resolvePluginVersion(env),
      repoIdentity: resolveRepoIdentity(repoRoot),
      source: CLAUDE_SOURCE
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

// packages/agentic-hooks/src/adapters/claude/shadow.ts
var import_node_fs5 = __toESM(require("node:fs"), 1);
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
var repoRegistersBundle = (repoRoot, bundle) => {
  try {
    const raw = import_node_fs5.default.readFileSync(
      import_node_path6.default.join(repoRoot, ".claude", "settings.json"),
      "utf8"
    );
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || !("hooks" in parsed)) {
      return false;
    }
    return JSON.stringify(parsed.hooks).includes(bundle);
  } catch {
    return false;
  }
};
var isShadowedByRepoHooks = ({
  bundle = CAPTURE_BUNDLE,
  env = process.env,
  repoRoot,
  scriptPath = process.argv[1]
}) => {
  return runningFromPlugin(env, scriptPath) && repoRegistersBundle(repoRoot, bundle);
};

// packages/agentic-hooks/src/adapters/claude/heartbeat.ts
var readPayloadCwd = (stdin) => {
  try {
    const parsed = JSON.parse(stdin);
    if (typeof parsed === "object" && parsed !== null && "cwd" in parsed) {
      return typeof parsed.cwd === "string" && parsed.cwd ? parsed.cwd : null;
    }
  } catch {
  }
  return null;
};
var readStdin = () => {
  try {
    return import_node_fs6.default.readFileSync(0, "utf8");
  } catch {
    return "";
  }
};
var main = async () => {
  try {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd();
    if (isShadowedByRepoHooks({
      bundle: "skill-usage-heartbeat",
      repoRoot: projectDir
    })) {
      return;
    }
    const repoRoot = resolveHookRepoRoot({
      payloadCwd: readPayloadCwd(readStdin()),
      projectDir
    });
    await runHeartbeat({ repoRoot });
  } catch (err) {
    logHookError("heartbeat failed", err);
  }
};
main().finally(() => {
  process.exit(0);
});
