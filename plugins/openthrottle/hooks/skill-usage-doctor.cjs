#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/doctor.ts
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

// packages/agentic-hooks/src/adapters/claude/doctor.ts
var import_node_fs5 = __toESM(require("node:fs"), 1);
var import_node_os3 = __toESM(require("node:os"), 1);

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

// packages/agentic-hooks/src/data/jsonl.ts
var import_node_path2 = __toESM(require("node:path"), 1);
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

// packages/agentic-hooks/src/adapters/claude/doctor-checks.ts
var PLUGIN_ID = "openthrottle@openthrottle";
var STALE_BUFFER_MS = 24 * 60 * 60 * 1e3;
var CHECK_STATUS = {
  FAIL: "FAIL",
  PASS: "PASS",
  WARN: "WARN"
};
var ENV_LAYER_LABELS = {
  "process-env": "process env",
  "repo-env": "repo .env",
  "user-env": "~/.openthrottle/.env"
};
var formatAge = (ageMs) => {
  const minutes = Math.max(0, Math.floor(ageMs / 6e4));
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
};
var parseVersion = (version) => {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (match === null) {
    return null;
  }
  return match.slice(1, 4).map(Number);
};
var isOlderVersion = (installed, payload) => {
  const left = parseVersion(installed);
  const right = parseVersion(payload);
  if (left === null || right === null) {
    return false;
  }
  for (let i = 0; i < 3; i += 1) {
    const a = left[i] ?? 0;
    const b = right[i] ?? 0;
    if (a !== b) {
      return a < b;
    }
  }
  return false;
};
var parseHeartbeatReceipt = (raw) => {
  if (raw === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.attemptedAt !== "string" || typeof parsed.delivered !== "boolean") {
      return null;
    }
    const error = typeof parsed.error === "string" ? parsed.error : null;
    return {
      attemptedAt: parsed.attemptedAt,
      delivered: parsed.delivered,
      error
    };
  } catch {
    return null;
  }
};
var checkPlugin = ({
  install,
  payloadVersion
}) => {
  if (install.installed !== true) {
    return {
      detail: `${PLUGIN_ID} is not installed`,
      fix: [
        "claude plugin marketplace add OpenThrottle/monorepo",
        "claude plugin install openthrottle@openthrottle",
        "(run in a shell, then restart Claude Code; inside a session, /plugin does the same)"
      ].join("\n"),
      id: "plugin",
      status: CHECK_STATUS.WARN
    };
  }
  if (install.version === null) {
    return {
      detail: `${PLUGIN_ID} installed (version unknown)`,
      fix: null,
      id: "plugin",
      status: CHECK_STATUS.PASS
    };
  }
  if (payloadVersion !== null && isOlderVersion(install.version, payloadVersion)) {
    return {
      detail: `${PLUGIN_ID} ${install.version} installed, ${payloadVersion} is current`,
      fix: [
        `claude plugin update ${PLUGIN_ID}`,
        "(run in a shell, then restart Claude Code)"
      ].join("\n"),
      id: "plugin",
      status: CHECK_STATUS.WARN
    };
  }
  return {
    detail: `${PLUGIN_ID} ${install.version} installed`,
    fix: null,
    id: "plugin",
    status: CHECK_STATUS.PASS
  };
};
var checkEndpoint = ({
  layer,
  url
}) => {
  if (url === null) {
    return {
      detail: "no GraphQL endpoint resolves",
      fix: [
        "Add this line to ~/.openthrottle/.env:",
        "OPENTHROTTLE_GRAPHQL_URL=https://your-openthrottle-server/graphql"
      ].join("\n"),
      id: "endpoint",
      status: CHECK_STATUS.FAIL
    };
  }
  const source = layer === null ? "unknown layer" : ENV_LAYER_LABELS[layer];
  return {
    detail: `${url} (from ${source})`,
    fix: null,
    id: "endpoint",
    status: CHECK_STATUS.PASS
  };
};
var checkToken = ({
  layer,
  present
}) => {
  if (!present) {
    return {
      detail: "no auth token resolves",
      fix: [
        "Add this line to ~/.openthrottle/.env:",
        "OPENTHROTTLE_MCP_AUTH_TOKEN=<your token>"
      ].join("\n"),
      id: "token",
      status: CHECK_STATUS.FAIL
    };
  }
  const source = layer === null ? "unknown layer" : ENV_LAYER_LABELS[layer];
  return {
    detail: `present (from ${source})`,
    fix: null,
    id: "token",
    status: CHECK_STATUS.PASS
  };
};
var SERVER_FIX = [
  "Start the OpenThrottle server (pnpm nx run openthrottle-server:dev),",
  "or point OPENTHROTTLE_GRAPHQL_URL in ~/.openthrottle/.env at one that is running."
].join("\n");
var checkReachability = ({
  origin,
  probe
}) => {
  const target = origin === null ? "the server" : origin;
  switch (probe.kind) {
    case "ok":
      return {
        detail: `${target}/health answered ${probe.status} in ${probe.ms}ms`,
        fix: null,
        id: "reachability",
        status: CHECK_STATUS.PASS
      };
    case "http":
      return {
        detail: `${target}/health answered ${probe.status}`,
        fix: `${SERVER_FIX}
If it is running, check that the URL is an OpenThrottle server and not a proxy.`,
        id: "reachability",
        status: CHECK_STATUS.FAIL
      };
    case "timeout":
      return {
        detail: `${target}/health timed out`,
        fix: SERVER_FIX,
        id: "reachability",
        status: CHECK_STATUS.FAIL
      };
    case "error":
      return {
        detail: `${target}/health unreachable: ${probe.reason}`,
        fix: SERVER_FIX,
        id: "reachability",
        status: CHECK_STATUS.FAIL
      };
    case "skipped":
      return {
        detail: "skipped: no endpoint to probe",
        fix: null,
        id: "reachability",
        status: CHECK_STATUS.WARN
      };
  }
};
var checkBuffer = ({
  drainCommand,
  nowMs,
  serverHealthy,
  stats
}) => {
  const oldestMs = stats.oldestAt === null ? Number.NaN : new Date(stats.oldestAt).getTime();
  const ageMs = nowMs - oldestMs;
  const isStale = !Number.isNaN(ageMs) && ageMs > STALE_BUFFER_MS;
  const hasLines = stats.totalLines > 0;
  const hasDead = stats.totalDeadLetterLines > 0;
  if (!hasLines && !hasDead) {
    return {
      detail: "buffer empty",
      fix: null,
      id: "buffer",
      status: CHECK_STATUS.PASS
    };
  }
  const counts = stats.files.filter((file) => file.lines > 0 || file.deadLetterLines > 0).map((file) => `${file.label}=${file.lines}`).join(" ");
  const parts = [`${stats.totalLines} buffered (${counts})`];
  if (hasDead) {
    parts.push(`${stats.totalDeadLetterLines} dead-lettered`);
  }
  if (!Number.isNaN(ageMs) && hasLines) {
    parts.push(`oldest ${formatAge(ageMs)} ago${isStale ? " (over 24h)" : ""}`);
  }
  const fixes = [];
  if (hasLines && serverHealthy) {
    fixes.push(`node ${drainCommand}`);
  }
  if (hasLines && !serverHealthy) {
    fixes.push(
      "Fix the server connection first; the buffer then drains itself."
    );
  }
  if (hasDead) {
    fixes.push(`node ${drainCommand} --replay-dead-letter`);
  }
  return {
    detail: parts.join(", "),
    fix: fixes.join("\n"),
    id: "buffer",
    status: CHECK_STATUS.WARN
  };
};
var checkHeartbeat = ({
  nowMs,
  receipt
}) => {
  if (receipt === null) {
    return {
      detail: "no session has started since the heartbeat hook was installed",
      fix: null,
      id: "heartbeat",
      status: CHECK_STATUS.WARN
    };
  }
  const attemptedMs = new Date(receipt.attemptedAt).getTime();
  const age = Number.isNaN(attemptedMs) ? "at an unknown time" : `${formatAge(nowMs - attemptedMs)} ago`;
  if (!receipt.delivered) {
    const reason = receipt.error ?? "unknown error";
    return {
      detail: `last heartbeat ${age} was not delivered: ${reason}`,
      fix: null,
      id: "heartbeat",
      status: CHECK_STATUS.WARN
    };
  }
  return {
    detail: `last heartbeat delivered ${age}`,
    fix: null,
    id: "heartbeat",
    status: CHECK_STATUS.PASS
  };
};
var checkOffline = ({
  offline
}) => {
  if (!offline) {
    return {
      detail: "OPENTHROTTLE_TELEMETRY_OFFLINE is not set",
      fix: null,
      id: "offline",
      status: CHECK_STATUS.PASS
    };
  }
  return {
    detail: `OPENTHROTTLE_TELEMETRY_OFFLINE=1: nothing is sent, records only buffer`,
    fix: "unset OPENTHROTTLE_TELEMETRY_OFFLINE (and remove it from your shell profile or ~/.openthrottle/.env)",
    id: "offline",
    status: CHECK_STATUS.WARN
  };
};
var summarizeChecks = (checks) => {
  const count = (status) => {
    return checks.filter((check) => check.status === status).length;
  };
  return {
    fail: count(CHECK_STATUS.FAIL),
    pass: count(CHECK_STATUS.PASS),
    warn: count(CHECK_STATUS.WARN)
  };
};

// packages/agentic-hooks/src/adapters/claude/doctor-render.ts
var MIN_SCRUBBED_TOKEN_LENGTH = 6;
var MIN_SCRUBBED_HOSTNAME_LENGTH = 4;
var EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
var ID_COLUMN_WIDTH = 14;
var STATUS_COLUMN_WIDTH = 4;
var scrubText = (text, scrubber) => {
  let out = text;
  if (scrubber.token !== null && scrubber.token.length >= MIN_SCRUBBED_TOKEN_LENGTH) {
    out = out.split(scrubber.token).join("<token>");
  }
  const homes = [...scrubber.homeDirs].filter((home) => home.length > 1).sort((a, b) => b.length - a.length);
  for (const home of homes) {
    out = out.split(home).join("~");
  }
  out = out.replace(EMAIL_PATTERN, "<email>");
  const host = scrubber.hostname;
  if (host !== null && host.length >= MIN_SCRUBBED_HOSTNAME_LENGTH && host !== "localhost") {
    out = out.split(host).join("<host>");
  }
  return out;
};
var scrubCheck = (check, scrubber) => {
  return {
    detail: scrubText(check.detail, scrubber),
    fix: check.fix === null ? null : scrubText(check.fix, scrubber),
    id: check.id,
    status: check.status
  };
};
var renderDoctorJson = (checks, scrubber) => {
  const clean = checks.map((check) => scrubCheck(check, scrubber));
  return `${JSON.stringify({ checks: clean, summary: summarizeChecks(clean) }, null, 2)}
`;
};
var renderDoctorHuman = (checks, scrubber) => {
  const clean = checks.map((check) => scrubCheck(check, scrubber));
  const lines = clean.map((check) => {
    const status = check.status.padEnd(STATUS_COLUMN_WIDTH);
    return `${status}  ${check.id.padEnd(ID_COLUMN_WIDTH)}${check.detail}`;
  });
  const withFix = clean.filter((check) => check.fix !== null);
  const fixes = withFix.flatMap((check) => {
    const body = (check.fix ?? "").split("\n").map((line) => `    ${line}`);
    return [`  ${check.id}`, ...body];
  });
  const summary = summarizeChecks(clean);
  const tally = `${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail`;
  const tail = fixes.length === 0 ? [] : ["", "Fixes", ...fixes];
  return `${[...lines, "", tally, ...tail].join("\n")}
`;
};

// packages/agentic-hooks/src/adapters/claude/doctor-run.ts
var import_node_fs4 = __toESM(require("node:fs"), 1);
var import_node_os2 = __toESM(require("node:os"), 1);
var import_node_path5 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/adapters/claude/heartbeat-payload.ts
var import_node_path4 = __toESM(require("node:path"), 1);
var MARKETPLACE_PLUGIN_KEY = "openthrottle@openthrottle";
var resolveClaudeConfigDir = (env, homeDir) => {
  const configured = env.CLAUDE_CONFIG_DIR?.trim();
  return configured ? import_node_path4.default.resolve(configured) : import_node_path4.default.join(homeDir, ".claude");
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

// packages/agentic-hooks/src/adapters/claude/heartbeat-run.ts
var LAST_HEARTBEAT_BASENAME = "last-heartbeat.json";

// packages/agentic-hooks/src/adapters/claude/doctor-run.ts
var HEALTH_TIMEOUT_MS = 2e3;
var TOKEN_KEYS = [
  "OPENTHROTTLE_MCP_AUTH_TOKEN",
  "OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN"
];
var readTextOrNull = (filePath) => {
  try {
    return import_node_fs4.default.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
};
var resolveUrlLayer = (repoRoot) => {
  if (graphqlUrlFromEnvMap(readRepoEnvFile(repoRoot)) !== null) {
    return "repo-env";
  }
  if (graphqlUrlFromEnvMap(process.env) !== null) {
    return "process-env";
  }
  return graphqlUrlFromEnvMap(readUserEnvFile()) === null ? null : "user-env";
};
var hasTokenKey = (env) => {
  return TOKEN_KEYS.some((key) => (env[key] ?? "").trim() !== "");
};
var resolveTokenLayer = (repoRoot) => {
  if (hasTokenKey(readRepoEnvFile(repoRoot))) {
    return "repo-env";
  }
  if (hasTokenKey(process.env)) {
    return "process-env";
  }
  return hasTokenKey(readUserEnvFile()) ? "user-env" : null;
};
var isTimeoutError = (err) => {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
};
var probeHealth = async ({
  fetchImpl,
  now,
  origin,
  timeoutMs = HEALTH_TIMEOUT_MS
}) => {
  const startedAt = now();
  try {
    const response = await fetchImpl(`${origin}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (response.ok) {
      return { kind: "ok", ms: now() - startedAt, status: response.status };
    }
    return { kind: "http", status: response.status };
  } catch (err) {
    if (isTimeoutError(err)) {
      return { kind: "timeout" };
    }
    return {
      kind: "error",
      reason: err instanceof Error ? err.message : String(err)
    };
  }
};
var originOf = (graphqlUrl) => {
  try {
    return new URL(graphqlUrl).origin;
  } catch {
    return null;
  }
};
var displayUrl = (graphqlUrl) => {
  try {
    const url = new URL(graphqlUrl);
    return `${url.origin}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return graphqlUrl;
  }
};
var resolvePayloadVersion = (scriptPath) => {
  const scriptDir = import_node_path5.default.dirname(scriptPath);
  const candidates = [
    import_node_path5.default.join(scriptDir, "..", ".claude-plugin", "plugin.json"),
    import_node_path5.default.join(
      scriptDir,
      "..",
      "..",
      "plugins",
      "openthrottle",
      ".claude-plugin",
      "plugin.json"
    )
  ];
  for (const candidate of candidates) {
    const raw = readTextOrNull(candidate);
    const version = raw === null ? null : readVersionField(raw);
    if (version !== null) {
      return version;
    }
  }
  return null;
};
var drainCommandFor = (scriptPath) => {
  const drain = import_node_path5.default.join(import_node_path5.default.dirname(scriptPath), "skill-usage-drain.cjs");
  return /\s/.test(drain) ? `"${drain}"` : drain;
};
var resolveProbe = async ({
  fetchImpl,
  now,
  origin
}) => {
  if (origin === null) {
    return { kind: "skipped" };
  }
  return probeHealth({ fetchImpl, now, origin });
};
var collectChecks = async ({
  fetchImpl = globalThis.fetch,
  now = Date.now,
  repoRoot,
  scriptPath
}) => {
  const homeDir = import_node_os2.default.homedir();
  const registryRaw = readTextOrNull(
    import_node_path5.default.join(
      resolveClaudeConfigDir(process.env, homeDir),
      "plugins",
      "installed_plugins.json"
    )
  );
  const graphqlUrl = resolveGraphqlUrl(repoRoot);
  const origin = graphqlUrl === null ? null : originOf(graphqlUrl);
  const probe = await resolveProbe({ fetchImpl, now, origin });
  const receiptRaw = readTextOrNull(
    import_node_path5.default.join(resolveTelemetryDir(), LAST_HEARTBEAT_BASENAME)
  );
  return [
    checkPlugin({
      install: parseMarketplaceInstall(registryRaw),
      payloadVersion: resolvePayloadVersion(scriptPath)
    }),
    checkEndpoint({
      layer: resolveUrlLayer(repoRoot),
      url: graphqlUrl === null ? null : displayUrl(graphqlUrl)
    }),
    checkToken({
      layer: resolveTokenLayer(repoRoot),
      present: resolveAuthToken(repoRoot) !== ""
    }),
    checkReachability({ origin, probe }),
    checkBuffer({
      drainCommand: drainCommandFor(scriptPath),
      nowMs: now(),
      serverHealthy: probe.kind === "ok",
      stats: readBufferStats()
    }),
    checkHeartbeat({
      nowMs: now(),
      receipt: parseHeartbeatReceipt(receiptRaw)
    }),
    checkOffline({
      offline: process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === "1"
    })
  ];
};

// packages/agentic-hooks/src/adapters/claude/parseDoctorArgs.ts
var parseDoctorArgs = (argv) => {
  return {
    json: argv.includes("--json"),
    strict: argv.includes("--strict")
  };
};

// packages/agentic-hooks/src/adapters/claude/doctor.ts
var realpathOrNull = (target) => {
  try {
    return import_node_fs5.default.realpathSync(target);
  } catch {
    return null;
  }
};
var buildScrubber = (repoRoot) => {
  const home = import_node_os3.default.homedir();
  const homeDirs = [home, realpathOrNull(home)].filter(
    (dir) => dir !== null
  );
  return {
    homeDirs,
    hostname: import_node_os3.default.hostname(),
    token: resolveAuthToken(repoRoot) || null
  };
};
var main = async () => {
  try {
    const args = parseDoctorArgs(process.argv.slice(2));
    const repoRoot = resolveHookRepoRoot({
      payloadCwd: null,
      projectDir: process.env.CLAUDE_PROJECT_DIR || process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd()
    });
    const checks = await collectChecks({
      repoRoot,
      scriptPath: process.argv[1] ?? ""
    });
    const scrubber = buildScrubber(repoRoot);
    process.stdout.write(
      args.json ? renderDoctorJson(checks, scrubber) : renderDoctorHuman(checks, scrubber)
    );
    const hasFail = checks.some((check) => check.status === CHECK_STATUS.FAIL);
    return args.strict && hasFail ? 1 : 0;
  } catch (err) {
    logHookError("doctor failed", err);
    return 0;
  }
};
main().then((code) => {
  process.exit(code);
});
