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
var import_node_fs14 = __toESM(require("node:fs"), 1);

// packages/agentic-hooks/src/data/jsonl.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);
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

// packages/agentic-hooks/src/data/chunk.ts
var chunkByBudget = (items, {
  maxBytes,
  maxItems,
  sizeOf
}) => {
  const itemLimit = Math.max(1, maxItems);
  const out = [];
  let batch = [];
  let batchBytes = 0;
  for (const item of items) {
    const size = sizeOf(item);
    if (batch.length > 0 && (batch.length >= itemLimit || batchBytes + size > maxBytes)) {
      out.push(batch);
      batch = [];
      batchBytes = 0;
    }
    batch.push(item);
    batchBytes += size;
  }
  if (batch.length > 0) {
    out.push(batch);
  }
  return out;
};

// packages/agentic-hooks/src/data/jsonl.ts
var TELEMETRY_DIR_BASENAME = "skill-usage";
var EVENTS_JSONL_BASENAME = "events.jsonl";
var OUTCOMES_JSONL_BASENAME = "outcomes.jsonl";
var TOKEN_USAGE_JSONL_BASENAME = "token-usage.jsonl";
var TRAJECTORIES_JSONL_BASENAME = "trajectories.jsonl";
var TRAJECTORY_UPLOADS_DIR_BASENAME = "trajectory-uploads";
var STARTS_DIR_BASENAME = "starts";
var CHECKPOINTS_DIR_BASENAME = "checkpoints";
var resolveTelemetryDir = () => {
  return process.env.OPENTHROTTLE_TELEMETRY_DIR?.trim() || import_node_path2.default.join(userConfigDir(), TELEMETRY_DIR_BASENAME);
};
var appendJsonl = (jsonlPath, event) => {
  import_node_fs2.default.mkdirSync(import_node_path2.default.dirname(jsonlPath), { recursive: true });
  import_node_fs2.default.appendFileSync(jsonlPath, `${JSON.stringify(event)}
`, "utf8");
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
var defaultTrajectoryUploadsDir = () => {
  return import_node_path2.default.join(resolveTelemetryDir(), TRAJECTORY_UPLOADS_DIR_BASENAME);
};
var defaultCheckpointsDir = () => {
  return import_node_path2.default.join(resolveTelemetryDir(), CHECKPOINTS_DIR_BASENAME);
};
var deadLetterPathFor = (filePath) => {
  return filePath.replace(/\.jsonl$/, "") + ".dead-letter.jsonl";
};
var toDeadLetterLine = (record, reason, nowMs) => {
  return JSON.stringify({
    dead_lettered_at: new Date(nowMs).toISOString(),
    line: record,
    reason
  });
};
var appendDeadLetters = ({
  filePath,
  nowMs = Date.now(),
  reason,
  records
}) => {
  if (!records.length) {
    return;
  }
  const deadPath = deadLetterPathFor(filePath);
  import_node_fs2.default.mkdirSync(import_node_path2.default.dirname(deadPath), { recursive: true });
  import_node_fs2.default.appendFileSync(
    deadPath,
    `${records.map((record) => toDeadLetterLine(record, reason, nowMs)).join("\n")}
`,
    "utf8"
  );
};
var defaultStartsDir = () => {
  return import_node_path2.default.join(resolveTelemetryDir(), STARTS_DIR_BASENAME);
};
var sanitizeSessionId = (sessionId) => {
  return String(sessionId).replace(/[^A-Za-z0-9._-]/g, "-");
};
var startsFilePathForSession = (startsDir, sessionId) => {
  return import_node_path2.default.join(startsDir, `${sanitizeSessionId(sessionId)}.jsonl`);
};
var startCorrelationKey = (entry) => {
  const sid = typeof entry?.session_id === "string" ? entry.session_id : "";
  const skill = typeof entry?.skill_name === "string" ? entry.skill_name : "";
  const toolUseId = typeof entry?.tool_use_id === "string" ? entry.tool_use_id : "";
  const startedAt = typeof entry?.started_at === "string" ? entry.started_at : "";
  const disc = toolUseId || startedAt;
  return `${sid}::${skill}::${disc}`;
};
var drainSnapshot = async ({
  batchBytes,
  batchSize,
  deadlineMs,
  filePath,
  nowFn,
  postBatch
}) => {
  const result = {
    deadLettered: 0,
    reasons: {},
    retained: 0,
    sent: 0,
    skipped: 0
  };
  const tally = (reason, count) => {
    result.reasons[reason] = (result.reasons[reason] ?? 0) + count;
  };
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
  const deadLetter = [];
  try {
    const parsed = [];
    for (const line of import_node_fs2.default.readFileSync(snapshotPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      try {
        parsed.push({ event: JSON.parse(trimmed), raw: trimmed });
      } catch {
        result.skipped += 1;
        logHookError("drain: skipping malformed jsonl line");
      }
    }
    const batches = chunkByBudget(parsed, {
      maxBytes: batchBytes,
      maxItems: batchSize,
      sizeOf: (entry) => Buffer.byteLength(entry.raw, "utf8")
    });
    let stopped = false;
    for (const batch of batches) {
      if (!stopped && deadlineMs != null && nowFn() > deadlineMs) {
        stopped = true;
      }
      if (stopped) {
        retain.push(...batch.map((entry) => entry.raw));
        continue;
      }
      let res;
      try {
        res = await postBatch(batch.map((entry) => entry.event));
      } catch (err) {
        logHookError("drain: post threw", err);
        res = { ok: false, permanent: false, reason: "post threw" };
      }
      if (res.ok) {
        result.sent += batch.length;
      } else if (res.permanent) {
        tally(res.reason, batch.length);
        deadLetter.push(
          ...batch.map(
            (entry) => toDeadLetterLine(entry.event, res.reason, nowFn())
          )
        );
      } else {
        tally(res.reason, batch.length);
        retain.push(...batch.map((entry) => entry.raw));
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
    if (deadLetter.length) {
      import_node_fs2.default.appendFileSync(
        deadLetterPathFor(filePath),
        `${deadLetter.join("\n")}
`,
        "utf8"
      );
      result.deadLettered = deadLetter.length;
    }
    import_node_fs2.default.rmSync(snapshotPath, { force: true });
  } catch (err) {
    logHookError("drain: finalize failed", err);
  }
  return result;
};
var drainJsonlFile = async ({
  filePath,
  post,
  deadlineMs,
  nowFn = Date.now
}) => {
  return drainSnapshot({
    batchBytes: Number.POSITIVE_INFINITY,
    batchSize: 1,
    deadlineMs,
    filePath,
    nowFn,
    postBatch: async ([event]) => event === void 0 ? { ok: true } : post(event)
  });
};
var drainJsonlFileBatched = async ({
  batchBytes,
  batchSize,
  filePath,
  postBatch,
  deadlineMs,
  nowFn = Date.now
}) => {
  return drainSnapshot({
    batchBytes,
    batchSize,
    deadlineMs,
    filePath,
    nowFn,
    postBatch
  });
};

// packages/nodejs-utils/src/utils/is-record.ts
var isRecord = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

// packages/agentic-hooks/src/data/checkpoints.ts
var import_node_fs3 = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
var DEFAULT_STALE_CHECKPOINT_MS = 6 * 60 * 60 * 1e3;
var checkpointFilePath = (dir, sessionId) => {
  return import_node_path3.default.join(dir, `${sanitizeSessionId(sessionId)}.json`);
};
var isCheckpoint = (value) => {
  return isRecord(value) && typeof value.path === "string" && typeof value.offset === "number" && Number.isFinite(value.offset) && value.offset >= 0 && typeof value.updated_at === "string";
};
var readSessionFile = (dir, sessionId) => {
  try {
    const parsed = JSON.parse(
      import_node_fs3.default.readFileSync(checkpointFilePath(dir, sessionId), "utf8")
    );
    return isRecord(parsed) && Array.isArray(parsed.files) ? parsed.files.filter(isCheckpoint) : [];
  } catch {
    return [];
  }
};
var hasSessionId = (sessionId) => {
  return typeof sessionId === "string" && sessionId.trim() !== "";
};
var readCheckpoint = ({
  checkpointsDir,
  filePath,
  sessionId
}) => {
  try {
    if (!hasSessionId(sessionId)) {
      return null;
    }
    const dir = checkpointsDir || defaultCheckpointsDir();
    return readSessionFile(dir, sessionId.trim()).find(
      (entry) => entry.path === filePath
    ) ?? null;
  } catch (err) {
    logHookError("readCheckpoint failed", err);
    return null;
  }
};
var writeCheckpoint = ({
  checkpointsDir,
  filePath,
  now = Date.now(),
  offset,
  sessionId
}) => {
  try {
    if (!hasSessionId(sessionId) || !Number.isFinite(offset) || offset < 0) {
      return false;
    }
    const dir = checkpointsDir || defaultCheckpointsDir();
    const sid = sessionId.trim();
    const files = [
      ...readSessionFile(dir, sid).filter((entry) => entry.path !== filePath),
      { offset, path: filePath, updated_at: new Date(now).toISOString() }
    ];
    const target = checkpointFilePath(dir, sid);
    const temp = `${target}.tmp.${process.pid}`;
    import_node_fs3.default.mkdirSync(dir, { recursive: true });
    import_node_fs3.default.writeFileSync(temp, `${JSON.stringify({ files })}
`, "utf8");
    import_node_fs3.default.renameSync(temp, target);
    return true;
  } catch (err) {
    logHookError("writeCheckpoint failed", err);
    return false;
  }
};
var sweepStaleCheckpoints = ({
  checkpointsDir,
  currentSessionId,
  maxAgeMs = DEFAULT_STALE_CHECKPOINT_MS,
  now = Date.now()
}) => {
  const dir = checkpointsDir || defaultCheckpointsDir();
  let names;
  try {
    names = import_node_fs3.default.readdirSync(dir);
  } catch {
    return 0;
  }
  const currentName = hasSessionId(currentSessionId) ? `${sanitizeSessionId(currentSessionId.trim())}.json` : null;
  let swept = 0;
  for (const name of names) {
    if (!name.endsWith(".json") || name === currentName) {
      continue;
    }
    const filePath = import_node_path3.default.join(dir, name);
    try {
      if (now - import_node_fs3.default.statSync(filePath).mtimeMs < maxAgeMs) {
        continue;
      }
      import_node_fs3.default.rmSync(filePath, { force: true });
      swept += 1;
    } catch (err) {
      logHookError("sweepStaleCheckpoints failed", err);
    }
  }
  return swept;
};

// packages/agentic-hooks/src/utils/scope.ts
var import_node_fs5 = __toESM(require("node:fs"), 1);
var import_node_os2 = __toESM(require("node:os"), 1);
var import_node_path5 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/utils/checkout-root.ts
var import_node_fs4 = __toESM(require("node:fs"), 1);
var import_node_path4 = __toESM(require("node:path"), 1);
var findGitAncestor = (dir) => {
  if (import_node_fs4.default.existsSync(import_node_path4.default.join(dir, ".git"))) {
    return dir;
  }
  const parent = import_node_path4.default.dirname(dir);
  if (parent === dir) {
    return null;
  }
  return findGitAncestor(parent);
};
var resolveCheckoutRoot = (dir) => {
  if (dir === null || dir === "" || !import_node_path4.default.isAbsolute(dir)) {
    return null;
  }
  try {
    return findGitAncestor(import_node_path4.default.resolve(dir));
  } catch {
    return null;
  }
};

// packages/agentic-hooks/src/utils/scope.ts
var PERSONAL_SKILLS_DIR_ENV = "OPENTHROTTLE_PERSONAL_SKILLS_DIR";
var SKILL_LINK_DIR = import_node_path5.default.join(".agents", "skills");
var resolvePersonalSkillsRoot = (env) => {
  const override = env[PERSONAL_SKILLS_DIR_ENV]?.trim();
  if (override !== void 0 && override !== "") {
    return override;
  }
  return import_node_path5.default.join(import_node_os2.default.homedir(), ".openthrottle", "skills");
};
var isPathInsideRoot = (root, candidate) => {
  try {
    const realRoot = import_node_fs5.default.realpathSync(root);
    return import_node_fs5.default.realpathSync(candidate).startsWith(`${realRoot}${import_node_path5.default.sep}`);
  } catch {
    return false;
  }
};
var isPersonalSkill = (skillName, repoRoot, env) => {
  const personalRoot = resolvePersonalSkillsRoot(env);
  return isPathInsideRoot(
    personalRoot,
    import_node_path5.default.join(repoRoot, SKILL_LINK_DIR, skillName)
  );
};
var isInjectedSkill = (skillName, repoRoot) => {
  const target = import_node_fs5.default.realpathSync(
    import_node_path5.default.join(repoRoot, SKILL_LINK_DIR, skillName)
  );
  const sourceRoot = resolveCheckoutRoot(target);
  if (sourceRoot === null) {
    return false;
  }
  const isAuthoredDir = target === import_node_path5.default.join(sourceRoot, "skills", skillName);
  const ownRoot = resolveCheckoutRoot(import_node_fs5.default.realpathSync(repoRoot));
  return isAuthoredDir && sourceRoot !== ownRoot;
};
var detectScope = (skillName, repoRoot, env = process.env) => {
  if (!skillName || skillName.includes(":")) {
    return "third-party";
  }
  const authoredDir = import_node_path5.default.join(repoRoot, "skills", skillName);
  try {
    if (import_node_fs5.default.existsSync(authoredDir) && import_node_fs5.default.statSync(authoredDir).isDirectory()) {
      return "ours";
    }
  } catch {
  }
  try {
    if (isPersonalSkill(skillName, repoRoot, env)) {
      return "personal";
    }
  } catch {
  }
  try {
    if (isInjectedSkill(skillName, repoRoot)) {
      return "injected";
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
    source
  }
}
`;
var SKILL_USAGE_OUTCOMES = Object.freeze({
  ABANDONED: "abandoned",
  ERROR: "error",
  SESSION_ENDED: "session_ended",
  SUCCESS: "success"
});
var SKILL_USAGE_QUALITY_OUTCOMES = Object.freeze([SKILL_USAGE_OUTCOMES.ERROR, SKILL_USAGE_OUTCOMES.SUCCESS]);
var buildOutcomeEvent = ({
  skillName,
  outcome,
  repoRoot,
  deliberate = false,
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
  if (outcome !== "success" && outcome !== "abandoned" && outcome !== "error" && outcome !== "session_ended") {
    return null;
  }
  const scope = detectScope(name, repoRoot);
  const resolvedCwd = cwd || repoRoot;
  const hasDuration = durationMs != null && !Number.isNaN(Number(durationMs));
  const roundedDuration = Math.max(0, Math.round(Number(durationMs)));
  const resolvedDuration = hasDuration ? roundedDuration : null;
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
  if (deliberate) {
    event.deliberate = true;
  }
  return event;
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
  if (event.deliberate === true) {
    input.deliberate = true;
  }
  return input;
};

// packages/agentic-hooks/src/data/graphql.ts
var PERMANENT_GRAPHQL_CODES = [
  "BAD_REQUEST",
  "BAD_USER_INPUT",
  "GRAPHQL_PARSE_FAILED",
  "GRAPHQL_VALIDATION_FAILED"
];
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
    messages.push(typeof error.message === "string" ? error.message : "");
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
var postMutation = async ({
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
var postGraphqlMutationNode = async (args) => {
  const posted = await postMutation(args);
  if (!posted.ok) {
    return posted;
  }
  if (!isRecord(posted.data)) {
    return transient(`missing ${args.field}`);
  }
  return { node: posted.data, ok: true };
};

// packages/agentic-hooks/src/data/persist.ts
var import_node_fs7 = __toESM(require("node:fs"), 1);
var import_node_path6 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/data/starts.ts
var import_node_fs6 = __toESM(require("node:fs"), 1);
var listStartsForSession = ({
  sessionId,
  startsDir
}) => {
  try {
    const sid = typeof sessionId === "string" ? sessionId.trim() : "";
    if (!sid) {
      return [];
    }
    const dir = startsDir || defaultStartsDir();
    const filePath = startsFilePathForSession(dir, sid);
    if (!import_node_fs6.default.existsSync(filePath)) {
      return [];
    }
    const text = import_node_fs6.default.readFileSync(filePath, "utf8");
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
  sessionId,
  resolvedKeys,
  startsDir
}) => {
  try {
    const sid = typeof sessionId === "string" ? sessionId.trim() : "";
    if (!sid) {
      return 0;
    }
    const dir = startsDir || defaultStartsDir();
    const filePath = startsFilePathForSession(dir, sid);
    if (!import_node_fs6.default.existsSync(filePath)) {
      return 0;
    }
    const entries = listStartsForSession({
      sessionId: sid,
      startsDir: dir
    });
    if (!resolvedKeys) {
      import_node_fs6.default.rmSync(filePath, { force: true });
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
      import_node_fs6.default.rmSync(filePath, { force: true });
    } else {
      import_node_fs6.default.writeFileSync(
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

// packages/agentic-hooks/src/data/token-usage.ts
var MAX_TOKEN_USAGE_BATCH = 500;
var MAX_TOKEN_USAGE_BATCH_BYTES = 64 * 1024;
var RECORD_TOKEN_USAGE_MUTATION = `
mutation RecordTokenUsage($input: RecordTokenUsageInput!) {
  recordTokenUsage(input: $input) {
    inserted
    skipped
  }
}
`;
var toRecordTokenUsageRow = (record) => {
  return {
    cacheReadTokens: record.cache_read_tokens,
    cacheWriteTokens: record.cache_write_tokens,
    costUsd: record.cost_usd,
    cwd: record.cwd,
    gitBranch: record.git_branch,
    inputTokens: record.input_tokens,
    model: record.model,
    occurredAt: record.occurred_at,
    outputTokens: record.output_tokens,
    provider: record.provider,
    rawUsageJson: record.raw_usage_json,
    reasoningTokens: record.reasoning_tokens,
    requestId: record.request_id,
    sessionId: record.session_id,
    source: record.source,
    totalTokens: record.total_tokens
  };
};
var tokenUsageRowBytes = (record) => {
  return Buffer.byteLength(
    JSON.stringify(toRecordTokenUsageRow(record)),
    "utf8"
  );
};
var chunkTokenUsage = (records, size = MAX_TOKEN_USAGE_BATCH, maxBytes = MAX_TOKEN_USAGE_BATCH_BYTES) => {
  return chunkByBudget(records, {
    maxBytes,
    maxItems: Math.min(size, MAX_TOKEN_USAGE_BATCH),
    sizeOf: tokenUsageRowBytes
  });
};
var postTokenUsageBatch = async ({
  records,
  graphqlUrl,
  authToken = "",
  timeoutMs,
  fetchImpl = globalThis.fetch
}) => {
  if (!records.length) {
    return { inserted: 0, ok: true, skipped: 0 };
  }
  if (records.length > MAX_TOKEN_USAGE_BATCH) {
    return {
      ok: false,
      permanent: true,
      reason: `batch of ${records.length} exceeds ${MAX_TOKEN_USAGE_BATCH}`
    };
  }
  const posted = await postGraphqlMutationNode({
    authToken,
    fetchImpl,
    field: "recordTokenUsage",
    graphqlUrl,
    query: RECORD_TOKEN_USAGE_MUTATION,
    timeoutMs,
    variables: { input: { rows: records.map(toRecordTokenUsageRow) } }
  });
  if (!posted.ok) {
    return posted;
  }
  const { inserted, skipped } = posted.node;
  if (typeof inserted !== "number" || typeof skipped !== "number") {
    return {
      ok: false,
      permanent: false,
      reason: "malformed recordTokenUsage result"
    };
  }
  return { inserted, ok: true, skipped };
};

// packages/agentic-hooks/src/data/persist.ts
var forLog = (graphqlUrl) => {
  return graphqlUrl.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/?#]*@/i, "$1***@");
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
  return postGraphqlMutation({
    authToken,
    fetchImpl,
    field: "recordSkillUsage",
    graphqlUrl,
    query: RECORD_SKILL_USAGE_MUTATION,
    timeoutMs,
    variables: { input: toRecordSkillUsageInput(event) }
  });
};
var postSkillUsageOutcome = async ({
  event,
  graphqlUrl,
  authToken = "",
  timeoutMs = DEFAULT_POST_TIMEOUT_MS,
  fetchImpl = globalThis.fetch
}) => {
  return postGraphqlMutation({
    authToken,
    fetchImpl,
    field: "recordSkillUsageOutcome",
    graphqlUrl,
    query: RECORD_SKILL_USAGE_OUTCOME_MUTATION,
    timeoutMs,
    variables: { input: toRecordSkillUsageOutcomeInput(event) }
  });
};
var resolveTimeout = (timeoutMs) => {
  return timeoutMs ?? (Number(process.env.OPENTHROTTLE_TELEMETRY_TIMEOUT_MS) || DEFAULT_POST_TIMEOUT_MS);
};
var persistOutcomeEvent = async ({
  event,
  repoRoot,
  jsonlPath,
  timeoutMs,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride
}) => {
  const outPath = jsonlPath || defaultOutcomesJsonlPath();
  if (process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === "1") {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError("outcome jsonl append failed", err);
    }
    return { detail: "OPENTHROTTLE_TELEMETRY_OFFLINE=1", sink: "jsonl" };
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
      `outcome server post failed; falling back to jsonl (${result.reason}) [endpoint ${forLog(graphqlUrl)}]`
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
var persistTokenUsage = async ({
  records,
  repoRoot,
  jsonlPath,
  timeoutMs,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride
}) => {
  const outPath = jsonlPath || defaultTokenUsageJsonlPath();
  const tally = { buffered: 0, deadLettered: 0, inserted: 0, skipped: 0 };
  let detail = null;
  const buffer = (unsent) => {
    try {
      for (const record of unsent) {
        appendJsonl(outPath, record);
      }
      tally.buffered += unsent.length;
    } catch (err) {
      logHookError("token usage jsonl append failed", err);
    }
  };
  try {
    const batches = chunkTokenUsage(records);
    if (!batches.length) {
      return { ...tally, detail };
    }
    const offline = process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === "1";
    const graphqlUrl = offline ? null : graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
    if (offline || !graphqlUrl) {
      buffer(records);
      return {
        ...tally,
        detail: offline ? "OPENTHROTTLE_TELEMETRY_OFFLINE=1" : "missing graphql url"
      };
    }
    const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);
    const resolvedTimeout = resolveTimeout(timeoutMs);
    let serverDown = false;
    for (const batch of batches) {
      if (serverDown) {
        buffer(batch);
        continue;
      }
      const res = await postTokenUsageBatch({
        authToken,
        fetchImpl,
        graphqlUrl,
        records: batch,
        timeoutMs: resolvedTimeout
      });
      if (res.ok) {
        tally.inserted += res.inserted;
        tally.skipped += res.skipped;
      } else if (res.permanent) {
        detail = res.reason;
        logHookError(
          `token usage batch rejected; moved to dead-letter (${res.reason}) [endpoint ${forLog(graphqlUrl)}]`
        );
        try {
          appendDeadLetters({
            filePath: outPath,
            reason: res.reason,
            records: batch
          });
          tally.deadLettered += batch.length;
        } catch (err) {
          logHookError("token usage dead-letter append failed", err);
        }
      } else {
        detail = res.reason;
        serverDown = true;
        logHookError(
          `token usage post failed; falling back to jsonl (${res.reason}) [endpoint ${forLog(graphqlUrl)}]`
        );
        buffer(batch);
      }
    }
    return { ...tally, detail };
  } catch (err) {
    logHookError("persistTokenUsage failed", err);
    return {
      ...tally,
      detail: err instanceof Error ? err.message : String(err)
    };
  }
};
var completeOpenStartsForSession = async ({
  repoRoot,
  sessionId,
  outcome = SKILL_USAGE_OUTCOMES.SESSION_ENDED,
  finishedAt = (/* @__PURE__ */ new Date()).toISOString(),
  startsDir,
  jsonlPath,
  fetchImpl,
  graphqlUrl,
  authToken,
  timeoutMs,
  source
}) => {
  const starts = listStartsForSession({ sessionId, startsDir });
  if (!starts.length) {
    return { resolved: 0, results: [] };
  }
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
      const durationMs = null;
      const event = buildOutcomeEvent({
        // `error` here is a harness-observed failure relayed by an adapter
        // (e.g. a final_status), an honest signal, so it declares itself.
        // `session_ended` makes no quality claim and needs no declaration.
        deliberate: outcome === SKILL_USAGE_OUTCOMES.ERROR,
        durationMs,
        outcome,
        repoRoot,
        sessionId: typeof start.session_id === "string" ? start.session_id : sessionId,
        skillName: typeof start.skill_name === "string" ? start.skill_name : "",
        source,
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
  drainStartsForSession({ resolvedKeys, sessionId, startsDir });
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
  jsonlPath,
  source
}) => {
  const dir = startsDir || defaultStartsDir();
  let files;
  try {
    files = import_node_fs7.default.readdirSync(dir);
  } catch {
    return { swept: 0 };
  }
  let currentFile = null;
  if (typeof currentSessionId === "string" && currentSessionId.trim()) {
    currentFile = `${sanitizeSessionId(currentSessionId.trim())}.jsonl`;
  }
  const abandoned = [];
  const staleSessions = [];
  for (const file of files) {
    if (!file.endsWith(".jsonl") || file === currentFile) {
      continue;
    }
    const filePath = import_node_path6.default.join(dir, file);
    let mtimeMs;
    try {
      mtimeMs = import_node_fs7.default.statSync(filePath).mtimeMs;
    } catch {
      continue;
    }
    if (now - mtimeMs < maxAgeMs) {
      continue;
    }
    const sessionId = file.replace(/\.jsonl$/, "");
    const starts = listStartsForSession({ sessionId, startsDir: dir });
    const detectedAt = new Date(now).toISOString();
    const seen = /* @__PURE__ */ new Set();
    for (const start of starts) {
      const key = startCorrelationKey(start);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const event = buildOutcomeEvent({
        // Null for the same reason as the completion path: mtime − started_at
        // is how long the SESSION ran before going silent, not how long this
        // skill's work took. Averaged into `avgDurationMs` it would keep the
        // column reporting session length under an honest-looking label.
        durationMs: null,
        outcome: SKILL_USAGE_OUTCOMES.ABANDONED,
        repoRoot,
        sessionId: typeof start.session_id === "string" ? start.session_id : sessionId,
        skillName: typeof start.skill_name === "string" ? start.skill_name : "",
        source,
        timestamp: detectedAt,
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
    drainStartsForSession({ sessionId, startsDir: dir });
  }
  return { swept: abandoned.length };
};
var drainBufferedUsage = async ({
  repoRoot,
  eventsPath,
  outcomesPath,
  tokenUsagePath,
  budgetMs = 500,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride,
  timeoutMs,
  nowFn = Date.now
}) => {
  const empty = () => {
    return {
      deadLettered: 0,
      reasons: {},
      retained: 0,
      sent: 0,
      skipped: 0
    };
  };
  if (process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === "1") {
    return { events: empty(), outcomes: empty(), tokenUsage: empty() };
  }
  const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
  if (!graphqlUrl) {
    return { events: empty(), outcomes: empty(), tokenUsage: empty() };
  }
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);
  const resolvedTimeout = resolveTimeout(timeoutMs);
  const deadlineMs = budgetMs == null ? void 0 : nowFn() + budgetMs;
  const events = await drainJsonlFile({
    deadlineMs,
    filePath: eventsPath || defaultJsonlPath(),
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
    filePath: outcomesPath || defaultOutcomesJsonlPath(),
    nowFn,
    post: (event) => postSkillUsageOutcome({
      authToken,
      event,
      fetchImpl,
      graphqlUrl,
      timeoutMs: resolvedTimeout
    })
  });
  const tokenUsage = await drainJsonlFileBatched({
    batchBytes: MAX_TOKEN_USAGE_BATCH_BYTES,
    batchSize: MAX_TOKEN_USAGE_BATCH,
    deadlineMs,
    filePath: tokenUsagePath || defaultTokenUsageJsonlPath(),
    nowFn,
    postBatch: (batch) => postTokenUsageBatch({
      authToken,
      fetchImpl,
      graphqlUrl,
      records: batch,
      timeoutMs: resolvedTimeout
    })
  });
  reportDeadLetters("events", events);
  reportDeadLetters("outcomes", outcomes);
  reportDeadLetters("token usage", tokenUsage);
  return { events, outcomes, tokenUsage };
};
var reportDeadLetters = (label, tally) => {
  if (tally.deadLettered > 0) {
    logHookError(
      `drain: ${tally.deadLettered} ${label} line(s) rejected by the server and moved to dead-letter — ${formatDrainReasons(tally)}`
    );
  }
};
var formatDrainReasons = (tally) => {
  const entries = Object.entries(tally.reasons).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries.map(([reason, count]) => `${reason} ×${count}`).join("; ") : "none";
};

// packages/agentic-hooks/src/data/plan-runs.ts
var import_node_fs8 = __toESM(require("node:fs"), 1);
var import_node_path7 = __toESM(require("node:path"), 1);
var PLAN_RUNS_DIR_REL = import_node_path7.default.join(".cache", "plan-runs");
var PLAN_RUN_ABANDONED_MS = 6 * 60 * 60 * 1e3;
var planRunsDir = (repoRoot) => {
  return import_node_path7.default.join(repoRoot, PLAN_RUNS_DIR_REL);
};
var sanitizeSessionId2 = (sessionId) => {
  return String(sessionId).replace(/[^A-Za-z0-9._-]/g, "-");
};
var planRunFilePath = (repoRoot, sessionId) => {
  return import_node_path7.default.join(
    planRunsDir(repoRoot),
    `${sanitizeSessionId2(sessionId)}.json`
  );
};
var readPlanRunRecord = (filePath) => {
  try {
    const parsed = JSON.parse(import_node_fs8.default.readFileSync(filePath, "utf8"));
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
var readPlanRunIdForSession = ({
  repoRoot,
  sessionId
}) => {
  const sid = sessionId.trim();
  if (sid === "") {
    return void 0;
  }
  return readPlanRunRecord(planRunFilePath(repoRoot, sid))?.planRunId;
};

// packages/agentic-hooks/src/data/read-new-bytes.ts
var import_node_fs9 = __toESM(require("node:fs"), 1);
var NEWLINE = 10;
var readNewBytes = ({
  filePath,
  maxBytes,
  offset
}) => {
  const unchanged = { lines: [], nextOffset: offset };
  let fd = null;
  try {
    fd = import_node_fs9.default.openSync(filePath, "r");
    const { size } = import_node_fs9.default.fstatSync(fd);
    const start = offset > size || offset < 0 ? 0 : offset;
    if (size === start) {
      return { lines: [], nextOffset: start };
    }
    const remaining = size - start;
    const hasMaxBytes = maxBytes !== void 0 && maxBytes > 0;
    let window = remaining;
    if (hasMaxBytes) {
      window = Math.min(remaining, Math.floor(maxBytes));
    }
    let buffer = Buffer.alloc(0);
    let lastNewline = -1;
    while (lastNewline < 0) {
      buffer = Buffer.alloc(window);
      const bytesRead = import_node_fs9.default.readSync(fd, buffer, 0, window, start);
      lastNewline = buffer.subarray(0, bytesRead).lastIndexOf(NEWLINE);
      if (window >= remaining) {
        break;
      }
      window = Math.min(remaining, window * 2);
    }
    if (lastNewline < 0) {
      return { lines: [], nextOffset: start };
    }
    const lines = buffer.subarray(0, lastNewline).toString("utf8").split("\n").map((line) => line.replace(/\r$/, "")).filter((line) => line.trim() !== "");
    return { lines, nextOffset: start + lastNewline + 1 };
  } catch (err) {
    if (!(err instanceof Error && "code" in err && err.code === "ENOENT")) {
      logHookError("readNewBytes failed", err);
    }
    return unchanged;
  } finally {
    if (fd !== null) {
      try {
        import_node_fs9.default.closeSync(fd);
      } catch {
      }
    }
  }
};

// packages/agentic-hooks/src/data/read-new-lines.ts
var import_node_fs10 = __toESM(require("node:fs"), 1);
var NEWLINE2 = 10;
var readNewLines = ({
  filePath,
  maxBytes,
  offset
}) => {
  const unchanged = {
    capped: false,
    lines: [],
    nextOffset: offset
  };
  let fd = null;
  try {
    fd = import_node_fs10.default.openSync(filePath, "r");
    const { size } = import_node_fs10.default.fstatSync(fd);
    const start = offset > size || offset < 0 ? 0 : offset;
    if (size === start) {
      return { capped: false, lines: [], nextOffset: start };
    }
    const remaining = size - start;
    let window = Math.min(remaining, Math.max(1, Math.floor(maxBytes)));
    let buffer = Buffer.alloc(0);
    let lastNewline = -1;
    while (lastNewline < 0) {
      buffer = Buffer.alloc(window);
      const bytesRead = import_node_fs10.default.readSync(fd, buffer, 0, window, start);
      lastNewline = buffer.subarray(0, bytesRead).lastIndexOf(NEWLINE2);
      if (window >= remaining) {
        break;
      }
      window = Math.min(remaining, window * 2);
    }
    if (lastNewline < 0) {
      return { capped: false, lines: [], nextOffset: start };
    }
    const lines = [];
    let lineStart = 0;
    while (lineStart <= lastNewline) {
      const lineEnd = buffer.indexOf(NEWLINE2, lineStart);
      const text = buffer.subarray(lineStart, lineEnd).toString("utf8").replace(/\r$/, "");
      if (text.trim() !== "") {
        lines.push({ offset: start + lineStart, text });
      }
      lineStart = lineEnd + 1;
    }
    const nextOffset = start + lastNewline + 1;
    return { capped: nextOffset < size, lines, nextOffset };
  } catch (err) {
    if (!(err instanceof Error && "code" in err && err.code === "ENOENT")) {
      logHookError("readNewLines failed", err);
    }
    return unchanged;
  } finally {
    if (fd !== null) {
      try {
        import_node_fs10.default.closeSync(fd);
      } catch {
      }
    }
  }
};

// packages/agentic-hooks/src/data/trajectories.ts
var DEFAULT_TRAJECTORY_POST_TIMEOUT_MS = 3e3;
var RECORD_AGENT_TRAJECTORY_MUTATION = `
mutation RecordAgentTrajectoryFromHook($input: RecordAgentTrajectoryInput!) {
  recordAgentTrajectory(input: $input) {
    id
  }
}
`;
var resolveTrajectoryTimeout = (timeoutMs) => {
  return timeoutMs ?? (Number(process.env.OPENTHROTTLE_TELEMETRY_TIMEOUT_MS) || DEFAULT_TRAJECTORY_POST_TIMEOUT_MS);
};
var postTrajectory = async ({
  authToken = "",
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  input,
  timeoutMs = DEFAULT_TRAJECTORY_POST_TIMEOUT_MS
}) => {
  return postGraphqlMutation({
    authToken,
    fetchImpl,
    field: "recordAgentTrajectory",
    graphqlUrl,
    query: RECORD_AGENT_TRAJECTORY_MUTATION,
    timeoutMs,
    variables: { input }
  });
};
var bufferTrajectory = (input, jsonlPath, reason) => {
  try {
    appendJsonl(jsonlPath, input);
    return { reason, sink: "buffered" };
  } catch (err) {
    logHookError("trajectory jsonl append failed", err);
    return { reason: `buffer failed: ${reason}`, sink: "dropped" };
  }
};
var persistTrajectory = async (input, {
  authToken: authTokenOverride,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  jsonlPath,
  repoRoot,
  timeoutMs
}) => {
  const outPath = jsonlPath || defaultTrajectoriesJsonlPath();
  try {
    const offline = process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === "1";
    const graphqlUrl = offline ? null : graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
    if (offline || !graphqlUrl) {
      return bufferTrajectory(
        input,
        outPath,
        offline ? "OPENTHROTTLE_TELEMETRY_OFFLINE=1" : "missing graphql url"
      );
    }
    const res = await postTrajectory({
      authToken: authTokenOverride ?? resolveAuthToken(repoRoot),
      fetchImpl,
      graphqlUrl,
      input,
      timeoutMs: resolveTrajectoryTimeout(timeoutMs)
    });
    if (res.ok) {
      return { id: res.id, sink: "server" };
    }
    if (!res.permanent) {
      logHookError(
        `trajectory post failed; falling back to jsonl (${res.reason})`
      );
      return bufferTrajectory(input, outPath, res.reason);
    }
    logHookError(`trajectory rejected; moved to dead-letter (${res.reason})`);
    try {
      appendDeadLetters({
        filePath: outPath,
        reason: res.reason,
        records: [input]
      });
      return { reason: res.reason, sink: "dead-letter" };
    } catch (err) {
      logHookError("trajectory dead-letter append failed", err);
      return { reason: `dead-letter failed: ${res.reason}`, sink: "dropped" };
    }
  } catch (err) {
    logHookError("persistTrajectory failed", err);
    return {
      reason: err instanceof Error ? err.message : String(err),
      sink: "dropped"
    };
  }
};
var emptyDrain = () => {
  return { deadLettered: 0, reasons: {}, retained: 0, sent: 0, skipped: 0 };
};
var drainBufferedTrajectories = async ({
  authToken: authTokenOverride,
  budgetMs = 500,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  jsonlPath,
  nowFn = Date.now,
  repoRoot,
  timeoutMs
}) => {
  try {
    if (process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === "1") {
      return emptyDrain();
    }
    const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
    if (!graphqlUrl) {
      return emptyDrain();
    }
    const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);
    const resolvedTimeout = resolveTrajectoryTimeout(timeoutMs);
    return await drainJsonlFile({
      deadlineMs: budgetMs == null ? void 0 : nowFn() + budgetMs,
      filePath: jsonlPath || defaultTrajectoriesJsonlPath(),
      nowFn,
      post: (input) => {
        return postTrajectory({
          authToken,
          fetchImpl,
          graphqlUrl,
          input,
          timeoutMs: resolvedTimeout
        });
      }
    });
  } catch (err) {
    logHookError("drainBufferedTrajectories failed", err);
    return emptyDrain();
  }
};

// packages/agentic-hooks/src/data/trajectory-uploads.ts
var import_node_fs11 = __toESM(require("node:fs"), 1);
var import_node_path8 = __toESM(require("node:path"), 1);
var stateFilePath = (dir, sessionId) => {
  return import_node_path8.default.join(dir, `${sanitizeSessionId(sessionId)}.json`);
};
var readTrajectoryUploadState = ({
  dir,
  sessionId
}) => {
  const fresh = {
    planRunId: void 0,
    scanOffset: 0,
    uploaded: []
  };
  try {
    const parsed = JSON.parse(
      import_node_fs11.default.readFileSync(
        stateFilePath(dir || defaultTrajectoryUploadsDir(), sessionId),
        "utf8"
      )
    );
    if (!isRecord(parsed)) {
      return fresh;
    }
    const isOffset = typeof parsed.scanOffset === "number" && Number.isFinite(parsed.scanOffset) && parsed.scanOffset >= 0;
    const hasPlanRun = typeof parsed.planRunId === "string" && parsed.planRunId !== "";
    const uploaded = Array.isArray(parsed.uploaded) ? parsed.uploaded : [];
    return {
      planRunId: hasPlanRun ? String(parsed.planRunId) : void 0,
      scanOffset: isOffset ? Number(parsed.scanOffset) : 0,
      uploaded: uploaded.filter((key) => {
        return typeof key === "string";
      })
    };
  } catch {
    return fresh;
  }
};
var writeTrajectoryUploadState = ({
  dir,
  sessionId,
  state
}) => {
  try {
    const target = stateFilePath(
      dir || defaultTrajectoryUploadsDir(),
      sessionId
    );
    const temp = `${target}.tmp.${process.pid}`;
    import_node_fs11.default.mkdirSync(import_node_path8.default.dirname(target), { recursive: true });
    import_node_fs11.default.writeFileSync(
      temp,
      `${JSON.stringify({
        planRunId: state.planRunId,
        scanOffset: state.scanOffset,
        uploaded: state.uploaded
      })}
`,
      "utf8"
    );
    import_node_fs11.default.renameSync(temp, target);
    return true;
  } catch (err) {
    logHookError("writeTrajectoryUploadState failed", err);
    return false;
  }
};
var DEFAULT_TRAJECTORY_STATE_TTL_DAYS = 30;
var SWEEP_MARKER_BASENAME = ".last-sweep";
var MS_PER_DAY = 24 * 60 * 60 * 1e3;
var resolveTrajectoryStateTtlDays = () => {
  const raw = Number(
    process.env.OPENTHROTTLE_SESSION_TRAJECTORY_STATE_TTL_DAYS
  );
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TRAJECTORY_STATE_TTL_DAYS;
};
var deleteIfOlder = async (filePath, cutoffMs) => {
  try {
    const stat = await import_node_fs11.default.promises.stat(filePath);
    if (!stat.isFile() || stat.mtimeMs >= cutoffMs) {
      return false;
    }
    await import_node_fs11.default.promises.unlink(filePath);
    return true;
  } catch {
    return false;
  }
};
var sweepTrajectoryUploadState = async ({
  dir,
  nowMs = Date.now(),
  ttlDays = resolveTrajectoryStateTtlDays()
} = {}) => {
  try {
    const target = dir || defaultTrajectoryUploadsDir();
    const marker = import_node_path8.default.join(target, SWEEP_MARKER_BASENAME);
    try {
      const { mtimeMs } = await import_node_fs11.default.promises.stat(marker);
      if (nowMs - mtimeMs < MS_PER_DAY) {
        return { deleted: 0, skipped: true };
      }
    } catch {
    }
    const names = await import_node_fs11.default.promises.readdir(target);
    const cutoffMs = nowMs - ttlDays * MS_PER_DAY;
    const results = await Promise.all(
      names.filter((name) => name.endsWith(".json")).map((name) => deleteIfOlder(import_node_path8.default.join(target, name), cutoffMs))
    );
    await import_node_fs11.default.promises.writeFile(marker, `${new Date(nowMs).toISOString()}
`);
    await import_node_fs11.default.promises.utimes(marker, new Date(nowMs), new Date(nowMs));
    return { deleted: results.filter(Boolean).length, skipped: false };
  } catch (err) {
    if (!(err instanceof Error && "code" in err && err.code === "ENOENT")) {
      logHookError("sweepTrajectoryUploadState failed", err);
    }
    return { deleted: 0, skipped: false };
  }
};

// packages/agentic-hooks/src/adapters/claude/payload.ts
var CLAUDE_SOURCE = "claude-code";
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

// packages/agentic-hooks/src/adapters/claude/session-trajectory.ts
var import_node_path9 = __toESM(require("node:path"), 1);

// packages/openthrottle-drivers/src/registry/index.ts
var DRIVERS = {
  antigravity: "antigravity",
  claude: "claude",
  codex: "codex",
  cursor: "cursor",
  gemini: "gemini",
  grok: "grok",
  opencode: "opencode"
};
var DRIVER_IDS = Object.values(DRIVERS);
var DRIVER_ID_SET = new Set(DRIVER_IDS);

// packages/openthrottle-drivers/src/utils/usage-limit.ts
var isRecord2 = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};
var epochSecondsToIso = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const date = new Date(value * 1e3);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
var parseClaudeRateLimitInfo = (value) => {
  if (!isRecord2(value) || value.status !== "rejected") {
    return null;
  }
  return {
    rateLimitType: typeof value.rateLimitType === "string" ? value.rateLimitType : null,
    resetsAt: epochSecondsToIso(value.resetsAt)
  };
};
var isClaudeUsageLimitResult = (event) => {
  return isRecord2(event) && event.type === "result" && event.is_error === true && event.api_error_status === 429;
};

// packages/openthrottle-agentic-utils/src/utils/conversation-backend/types.ts
var CONVERSATION_STREAM_CHUNK_KINDS = {
  keepalive: "keepalive",
  permissionRequest: "permission_request",
  session: "session",
  text: "text",
  thinking: "thinking",
  toolCall: "tool_call",
  toolResult: "tool_result",
  usage: "usage",
  usageLimit: "usage_limit"
};

// packages/openthrottle-agentic-utils/src/utils/conversation-backend/cursor-agent/events.ts
var asString = (value) => {
  const isString = typeof value === "string";
  return isString ? value : void 0;
};
function messageText(message) {
  if (!isRecord(message)) {
    return "";
  }
  const content = message.content;
  if (!Array.isArray(content) || !isRecord(content[0])) {
    return "";
  }
  return asString(content[0].text) ?? "";
}
function mapSystem(event) {
  if (event.subtype !== "init") {
    return null;
  }
  return {
    delta: "",
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.session,
    metadata: { sessionId: asString(event.session_id) ?? null }
  };
}
function mapAssistant(event) {
  if (event.timestamp_ms === void 0 || event.model_call_id !== void 0) {
    return null;
  }
  return {
    delta: messageText(event.message),
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.text
  };
}
function mapThinking(event) {
  if (event.subtype !== "delta") {
    return null;
  }
  return {
    delta: asString(event.text) ?? "",
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.thinking
  };
}
var TOOL_CALL_RESERVED_KEYS = /* @__PURE__ */ new Set([
  "hookAdditionalContexts",
  "toolCallId"
]);
function toolKeyOf(toolCall) {
  if (!isRecord(toolCall)) {
    return null;
  }
  const key = Object.keys(toolCall).find(
    (candidate) => !TOOL_CALL_RESERVED_KEYS.has(candidate) && isRecord(toolCall[candidate])
  );
  return key ?? null;
}
function toolNameOf(toolCall) {
  const key = toolKeyOf(toolCall);
  return key === null ? null : key.replace(/ToolCall$/, "");
}
function toolPayloadOf(toolCall) {
  const key = toolKeyOf(toolCall);
  if (key === null || !isRecord(toolCall)) {
    return null;
  }
  const payload = toolCall[key];
  return isRecord(payload) ? payload : null;
}
var REJECTED_WITHOUT_REASON = "Rejected by cursor permissions";
var asNonEmptyString = (value) => {
  const text = asString(value);
  return text === void 0 || text.trim() === "" ? void 0 : text;
};
function toolFailureOf(payload) {
  const result = payload?.result;
  if (!isRecord(result)) {
    return null;
  }
  if (isRecord(result.error)) {
    return asNonEmptyString(result.error.errorMessage) ?? asNonEmptyString(result.error.message) ?? "Tool call failed";
  }
  if (isRecord(result.rejected)) {
    return asNonEmptyString(result.rejected.reason) ?? REJECTED_WITHOUT_REASON;
  }
  return null;
}
var TOOL_ARGS_INTERNAL_KEYS = /* @__PURE__ */ new Set([
  "adminCommandDenylist",
  "argumentsRepaired",
  "closeStdin",
  "conversationId",
  "fileOutputThresholdBytes",
  "hardTimeout",
  "hasInputRedirect",
  "hasOutputRedirect",
  "parsingResult",
  "requestId",
  "simpleCommands",
  "skipApproval",
  "smartModeApprovalOnly",
  "smartModeClassifierAllowed",
  "symbolicPathArguments",
  "timeoutBehavior",
  "toolCallId"
]);
function toolArgsOf(payload) {
  const args = payload.args;
  if (!isRecord(args)) {
    return args ?? null;
  }
  return Object.fromEntries(
    Object.entries(args).filter(([key]) => !TOOL_ARGS_INTERNAL_KEYS.has(key))
  );
}
function toolSuccessOf(payload) {
  const result = payload.result;
  const success = isRecord(result) ? result.success : void 0;
  if (!isRecord(success)) {
    return success ?? null;
  }
  return asString(success.content) ?? success;
}
function mapToolCall(event) {
  const callId = asString(event.call_id) ?? null;
  const toolName = toolNameOf(event.tool_call);
  const payload = toolPayloadOf(event.tool_call);
  const envelope = event.tool_call ?? null;
  if (event.subtype === "started") {
    const toolCall = payload === null ? envelope : toolArgsOf(payload);
    return {
      delta: "",
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
      metadata: { callId, toolCall, toolName }
    };
  }
  if (event.subtype !== "completed") {
    return null;
  }
  const failure = toolFailureOf(payload);
  const success = payload === null ? envelope : toolSuccessOf(payload);
  const failedMetadata = { callId, isError: true, toolCall: failure, toolName };
  const succeededMetadata = { callId, toolCall: success, toolName };
  return {
    delta: "",
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
    metadata: failure === null ? succeededMetadata : failedMetadata
  };
}
function mapResult(event) {
  const isError = event.is_error === true;
  return {
    delta: "",
    done: true,
    error: isError ? asString(event.result) ?? "cursor-agent reported an error" : null,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
    metadata: {
      result: asString(event.result) ?? null,
      usage: event.usage ?? null
    }
  };
}
function mapCursorEvent(event) {
  if (!isRecord(event)) {
    return null;
  }
  switch (event.type) {
    case "assistant":
      return mapAssistant(event);
    case "result":
      return mapResult(event);
    case "system":
      return mapSystem(event);
    case "thinking":
      return mapThinking(event);
    case "tool_call":
      return mapToolCall(event);
    default:
      return null;
  }
}

// packages/openthrottle-agentic-utils/src/utils/conversation-backend/gemini/events.ts
var asString2 = (value) => {
  return typeof value === "string" ? value : void 0;
};
function createGeminiEventMapper() {
  let model;
  const toolNameByCallId = /* @__PURE__ */ new Map();
  return (event) => {
    if (!isRecord(event)) {
      return [];
    }
    switch (event.type) {
      case "init": {
        model = asString2(event.model) ?? model;
        return [];
      }
      case "message": {
        if (event.role !== "assistant") {
          return [];
        }
        return [
          {
            delta: asString2(event.content) ?? "",
            done: false,
            kind: CONVERSATION_STREAM_CHUNK_KINDS.text
          }
        ];
      }
      case "tool_use": {
        const callId = asString2(event.tool_id) ?? "";
        const toolName = asString2(event.tool_name) ?? null;
        if (toolName !== null) {
          toolNameByCallId.set(callId, toolName);
        }
        return [
          {
            delta: "",
            done: false,
            kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
            metadata: {
              // `parameters` is already the tool's own flat argument record (verified against
              // gemini-cli-core's shipped `ToolUseEvent`), so it IS the payload — wrapping it
              // beside the name would just repeat what `toolName` carries.
              callId,
              toolCall: event.parameters ?? null,
              toolName
            }
          }
        ];
      }
      case "tool_result": {
        const callId = asString2(event.tool_id) ?? "";
        return [
          {
            delta: "",
            done: false,
            kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
            metadata: {
              callId,
              toolCall: {
                error: event.error ?? null,
                output: asString2(event.output) ?? null,
                status: asString2(event.status) ?? null
              },
              toolName: toolNameByCallId.get(callId) ?? null
            }
          }
        ];
      }
      case "result": {
        const failed = event.status === "error";
        const errorMessage = isRecord(event.error) ? asString2(event.error.message) : void 0;
        return [
          {
            delta: "",
            done: true,
            error: failed ? errorMessage ?? "gemini reported an error" : null,
            kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
            metadata: {
              model: model ?? null,
              usage: event.stats ?? null
            }
          }
        ];
      }
      // Non-fatal `error` events (loop detection, max turns) precede the
      // terminal `result`, which carries the authoritative status — skip them.
      default:
        return [];
    }
  };
}

// packages/openthrottle-agentic-utils/src/utils/conversation-backend/antigravity/events.ts
var TERMINAL_STEP_STATES = /* @__PURE__ */ new Set(["DONE", "ERROR"]);
var asString3 = (value) => {
  return typeof value === "string" ? value : void 0;
};
var toolArgumentsOf = (toolInfo) => {
  if (isRecord(toolInfo) && isRecord(toolInfo.parameters)) {
    return toolInfo.parameters;
  }
  return toolInfo ?? null;
};
var toolOutputOf = (toolInfo) => {
  if (isRecord(toolInfo) && toolInfo.output !== void 0) {
    return toolInfo.output;
  }
  return toolArgumentsOf(toolInfo);
};
function createAntigravityEventMapper() {
  let model;
  const toolNameByStep = /* @__PURE__ */ new Map();
  const mapStepUpdate = (payload) => {
    const stepType = asString3(payload.step_type);
    const state = asString3(payload.state) ?? "";
    if (stepType === "user_input") {
      return [];
    }
    if (stepType === "agent_response") {
      const delta = asString3(payload.text_delta);
      if (delta === void 0 || delta === "") {
        return [];
      }
      return [
        { delta, done: false, kind: CONVERSATION_STREAM_CHUNK_KINDS.text }
      ];
    }
    if (stepType === "tool") {
      const stepIndex = typeof payload.step_index === "number" ? payload.step_index : -1;
      const toolName = asString3(payload.tool_name);
      if (toolName !== void 0) {
        toolNameByStep.set(stepIndex, toolName);
      }
      const callId = String(stepIndex);
      const name = toolNameByStep.get(stepIndex) ?? null;
      if (!TERMINAL_STEP_STATES.has(state)) {
        return [
          {
            delta: "",
            done: false,
            kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
            metadata: {
              callId,
              toolCall: toolArgumentsOf(payload.tool_info),
              toolName: name
            }
          }
        ];
      }
      return [
        {
          delta: "",
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
          metadata: {
            callId,
            toolCall: {
              // A step-level ERROR is not a turn failure (see rule 3) — surface it on the tool
              // result and let `result.status` decide the turn.
              error: state === "ERROR" ? state : null,
              output: toolOutputOf(payload.tool_info),
              status: state
            },
            toolName: name
          }
        }
      ];
    }
    return [];
  };
  return (event) => {
    if (!isRecord(event)) {
      return [];
    }
    const name = asString3(event.event);
    const payload = isRecord(event[name ?? ""]) ? event[name ?? ""] : void 0;
    if (name === "init") {
      const init = isRecord(payload) ? payload : {};
      model = asString3(init.model) ?? model;
      const conversationId = asString3(event.conversation_id);
      if (conversationId === void 0 || conversationId === "") {
        return [];
      }
      return [
        {
          delta: "",
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.session,
          metadata: { sessionId: conversationId }
        }
      ];
    }
    if (name === "step_update" && isRecord(payload)) {
      return mapStepUpdate(payload);
    }
    if (name === "result" && isRecord(payload)) {
      const failed = asString3(payload.status) !== "SUCCESS";
      const errorMessage = asString3(payload.error);
      return [
        {
          delta: "",
          done: true,
          error: failed ? errorMessage ?? "antigravity reported an error" : null,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
          metadata: { model: model ?? null, usage: payload.usage ?? null }
        }
      ];
    }
    return [];
  };
}

// packages/openthrottle-agentic-utils/src/utils/conversation-backend/claude/events.ts
var asString4 = (value) => {
  const isString = typeof value === "string";
  return isString ? value : void 0;
};
function mapSystem2(event) {
  if (event.subtype !== "init") {
    return null;
  }
  return {
    delta: "",
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.session,
    metadata: { sessionId: asString4(event.session_id) ?? null }
  };
}
function mapStreamEvent(inner) {
  if (!isRecord(inner)) {
    return null;
  }
  if (inner.type === "content_block_delta" && isRecord(inner.delta)) {
    const delta = inner.delta;
    if (delta.type === "text_delta") {
      return {
        delta: asString4(delta.text) ?? "",
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text
      };
    }
    if (delta.type === "thinking_delta") {
      return {
        delta: asString4(delta.thinking) ?? "",
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.thinking
      };
    }
    return null;
  }
  if (inner.type === "content_block_start" && isRecord(inner.content_block)) {
    const block = inner.content_block;
    if (block.type === "tool_use") {
      return {
        delta: "",
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
        metadata: {
          callId: asString4(block.id) ?? null,
          index: inner.index ?? null,
          name: asString4(block.name) ?? null,
          toolName: asString4(block.name) ?? null
        }
      };
    }
  }
  return null;
}
function mapAssistant2(event) {
  const message = event.message;
  if (!isRecord(message) || !Array.isArray(message.content)) {
    return [];
  }
  return message.content.filter(
    (block) => isRecord(block) && block.type === "tool_use"
  ).map((block) => ({
    delta: "",
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
    metadata: {
      callId: asString4(block.id) ?? null,
      name: asString4(block.name) ?? null,
      toolCall: block.input ?? null,
      toolName: asString4(block.name) ?? null
    }
  }));
}
function toolResultText(content) {
  if (!Array.isArray(content)) {
    return content ?? null;
  }
  return content.map((part) => {
    if (!isRecord(part)) {
      return "";
    }
    return part.type === "text" ? asString4(part.text) ?? "" : `[${asString4(part.type) ?? "content"}]`;
  }).join("\n");
}
function mapUser(event) {
  const message = event.message;
  if (!isRecord(message) || !Array.isArray(message.content)) {
    return [];
  }
  return message.content.filter(
    (block) => isRecord(block) && block.type === "tool_result"
  ).map((block) => ({
    delta: "",
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
    metadata: {
      callId: asString4(block.tool_use_id) ?? null,
      isError: block.is_error === true,
      toolCall: toolResultText(block.content)
    }
  }));
}
function mapRateLimit(event) {
  const usageLimit = parseClaudeRateLimitInfo(event.rate_limit_info);
  if (usageLimit === null) {
    return null;
  }
  return {
    delta: "",
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.usageLimit,
    metadata: {
      rateLimitType: usageLimit.rateLimitType,
      resetsAt: usageLimit.resetsAt
    }
  };
}
function mapResult2(event) {
  const isError = event.is_error === true;
  const hitUsageLimit = isClaudeUsageLimitResult(event);
  const unknownUsageLimit = {
    usageLimit: { rateLimitType: null, resetsAt: null }
  };
  return {
    delta: "",
    done: true,
    error: isError ? asString4(event.result) ?? "claude reported an error" : null,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
    metadata: {
      apiErrorStatus: event.api_error_status ?? null,
      modelUsage: event.modelUsage ?? null,
      result: asString4(event.result) ?? null,
      totalCostUsd: event.total_cost_usd ?? null,
      usage: event.usage ?? null,
      ...hitUsageLimit ? unknownUsageLimit : {}
    }
  };
}
var listOf = (chunk) => {
  return chunk === null ? [] : [chunk];
};
function mapClaudeEvent(event) {
  if (!isRecord(event)) {
    return [];
  }
  switch (event.type) {
    case "assistant":
      return mapAssistant2(event);
    case "rate_limit_event":
      return listOf(mapRateLimit(event));
    case "result":
      return [mapResult2(event)];
    case "stream_event":
      return listOf(mapStreamEvent(event.event));
    case "system":
      return listOf(mapSystem2(event));
    case "user":
      return mapUser(event);
    default:
      return [];
  }
}

// packages/openthrottle-agentic-utils/src/utils/conversation-backend/codex/events.ts
var asString5 = (value) => {
  const isString = typeof value === "string";
  return isString ? value : void 0;
};
var itemType = (item) => {
  return asString5(item.item_type) ?? asString5(item.type);
};
function mapItemCompleted(event) {
  const item = event.item;
  if (!isRecord(item)) {
    return null;
  }
  const kind = itemType(item);
  if (kind === "agent_message") {
    return {
      delta: asString5(item.text) ?? "",
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.text
    };
  }
  if (kind === "reasoning") {
    return {
      delta: asString5(item.text) ?? "",
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.thinking
    };
  }
  if (kind === void 0) {
    return null;
  }
  return {
    delta: "",
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
    // codex has no tool name of its own — the item kind (`command_execution`,
    // `file_change`, …) IS what the activity was, so it doubles as the name.
    metadata: { item, itemType: kind, toolName: kind }
  };
}
function mapCodexEvent(event) {
  if (!isRecord(event)) {
    return null;
  }
  switch (event.type) {
    case "thread.started":
      return {
        delta: "",
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.session,
        metadata: { sessionId: asString5(event.thread_id) ?? null }
      };
    case "item.completed":
      return mapItemCompleted(event);
    case "turn.completed":
      return {
        delta: "",
        done: true,
        error: null,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
        metadata: { usage: event.usage ?? null }
      };
    case "turn.failed": {
      const error = isRecord(event.error) ? event.error : void 0;
      return {
        delta: "",
        done: true,
        error: asString5(error?.message) ?? "codex reported a failed turn",
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text
      };
    }
    case "error":
      return {
        delta: "",
        done: true,
        error: asString5(event.message) ?? "codex reported an error",
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text
      };
    default:
      return null;
  }
}

// packages/openthrottle-agentic-utils/src/utils/conversation-backend/grok/events.ts
var asString6 = (value) => {
  const isString = typeof value === "string";
  return isString ? value : void 0;
};
function mapGrokEvent(event) {
  if (!isRecord(event)) {
    return [];
  }
  switch (event.type) {
    case "thought":
      return [
        {
          delta: asString6(event.data) ?? "",
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.thinking
        }
      ];
    case "text":
      return [
        {
          delta: asString6(event.data) ?? "",
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.text
        }
      ];
    case "end": {
      const chunks = [];
      const sessionId = asString6(event.sessionId);
      if (sessionId !== void 0 && sessionId !== "") {
        chunks.push({
          delta: "",
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.session,
          metadata: { sessionId }
        });
      }
      chunks.push({
        delta: "",
        done: true,
        error: null,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
        metadata: {
          modelUsage: event.modelUsage ?? null,
          numTurns: event.num_turns ?? null,
          stopReason: asString6(event.stopReason) ?? null,
          usage: event.usage ?? null
        }
      });
      return chunks;
    }
    case "error":
      return [
        {
          delta: "",
          done: true,
          error: asString6(event.message) ?? "grok reported an error",
          kind: CONVERSATION_STREAM_CHUNK_KINDS.text
        }
      ];
    default:
      return [];
  }
}

// packages/openthrottle-agentic-utils/src/utils/conversation-backend/opencode/events.ts
var asString7 = (value) => {
  const isString = typeof value === "string";
  return isString ? value : void 0;
};
function mapText(part, emittedLen) {
  const id = asString7(part.id);
  const full = asString7(part.text);
  if (id === void 0 || full === void 0) {
    return null;
  }
  const prev = emittedLen.get(id) ?? 0;
  if (full.length <= prev) {
    return null;
  }
  emittedLen.set(id, full.length);
  return {
    delta: full.slice(prev),
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.text
  };
}
var TOOL_EVENT_TYPES = /* @__PURE__ */ new Set(["tool", "tool_use"]);
function mapTool(part, startedCallIds) {
  const state = isRecord(part.state) ? part.state : void 0;
  const status = asString7(state?.status);
  const callId = asString7(part.callID) ?? null;
  const toolName = asString7(part.tool) ?? null;
  const metadata = {
    callId,
    tool: toolName,
    toolName
  };
  const isTerminal = status === "completed" || status === "error";
  const isStarted = callId !== null && startedCallIds.has(callId);
  const chunks = [];
  if (!isTerminal || !isStarted) {
    if (callId !== null) {
      startedCallIds.add(callId);
    }
    chunks.push({
      delta: "",
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
      metadata: { ...metadata, toolCall: state?.input ?? null }
    });
  }
  if (isTerminal) {
    const isError = status === "error";
    const errorText = isError ? asString7(state?.error) ?? "tool error" : null;
    chunks.push({
      delta: "",
      done: false,
      error: errorText,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
      metadata: {
        ...metadata,
        isError,
        toolCall: errorText ?? state?.output ?? null
      }
    });
  }
  return chunks;
}
function mapStepFinish(part) {
  return {
    delta: "",
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
    metadata: { cost: part.cost ?? null, tokens: part.tokens ?? null }
  };
}
function createOpencodeEventMapper() {
  const emittedLen = /* @__PURE__ */ new Map();
  const startedCallIds = /* @__PURE__ */ new Set();
  let sessionEmitted = false;
  return {
    map(event) {
      if (!isRecord(event)) {
        return [];
      }
      const chunks = [];
      const sessionId = asString7(event.sessionID);
      if (!sessionEmitted && sessionId !== void 0 && sessionId !== "") {
        sessionEmitted = true;
        chunks.push({
          delta: "",
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.session,
          metadata: { sessionId }
        });
      }
      const part = isRecord(event.part) ? event.part : void 0;
      if (event.type === "text" && part !== void 0) {
        const chunk = mapText(part, emittedLen);
        if (chunk !== null) {
          chunks.push(chunk);
        }
      } else if (TOOL_EVENT_TYPES.has(event.type) && part !== void 0) {
        chunks.push(...mapTool(part, startedCallIds));
      } else if (event.type === "step_finish" && part !== void 0) {
        chunks.push(mapStepFinish(part));
      }
      return chunks;
    }
  };
}

// packages/openthrottle-agentic-utils/src/utils/structured-output/chunk-reader.ts
var listOf2 = (chunk) => {
  return chunk === null ? [] : [chunk];
};
var textChunk = (delta) => {
  return { delta, done: false, kind: CONVERSATION_STREAM_CHUNK_KINDS.text };
};
var consolidatedText = (event) => {
  if (!isRecord(event) || event.type !== "assistant") {
    return [];
  }
  const message = isRecord(event.message) ? event.message : void 0;
  const content = Array.isArray(message?.content) ? message.content : [];
  return content.flatMap((block) => {
    const isText = isRecord(block) && block.type === "text";
    const text = isText ? block.text : void 0;
    return typeof text === "string" && text !== "" ? [textChunk(text)] : [];
  });
};
var withConsolidatedText = (map) => {
  return (event) => {
    const isPartial = isRecord(event) && event.timestamp_ms !== void 0;
    const text = isPartial ? [] : consolidatedText(event);
    return [...text, ...map(event)];
  };
};
var opencodeErrorOf = (event) => {
  if (!isRecord(event) || event.type !== "error") {
    return void 0;
  }
  const error = isRecord(event.error) ? event.error : {};
  const data = isRecord(error.data) ? error.data : {};
  const message = data.message ?? error.message ?? error.name;
  return typeof message === "string" ? message : "opencode reported an error";
};
var createStructuredChunkReader = (driverId) => {
  switch (driverId) {
    case DRIVERS.antigravity:
      return createAntigravityEventMapper();
    case DRIVERS.claude:
      return withConsolidatedText(mapClaudeEvent);
    case DRIVERS.codex:
      return (event) => {
        return listOf2(mapCodexEvent(event));
      };
    case DRIVERS.cursor:
      return withConsolidatedText((event) => {
        return listOf2(mapCursorEvent(event));
      });
    case DRIVERS.gemini:
      return createGeminiEventMapper();
    case DRIVERS.grok:
      return mapGrokEvent;
    case DRIVERS.opencode: {
      const mapper = createOpencodeEventMapper();
      return (event) => {
        const error = opencodeErrorOf(event);
        if (error === void 0) {
          return mapper.map(event);
        }
        return [
          {
            delta: "",
            done: true,
            error,
            kind: CONVERSATION_STREAM_CHUNK_KINDS.usage
          }
        ];
      };
    }
    default:
      return void 0;
  }
};

// packages/openthrottle-agentic-utils/src/utils/trajectory/cap-trajectory.ts
var DEFAULT_TRAJECTORY_LIMITS = {
  observationBytes: 16 * 1024,
  totalBytes: 4 * 1024 * 1024
};
var MARKER_RESERVE_BYTES = 40;
var encoder = new TextEncoder();
var decoder = new TextDecoder("utf-8", { fatal: false });
var byteLength = (value) => {
  return encoder.encode(value).length;
};
var elisionMarker = (elidedBytes) => {
  return `
…[${elidedBytes} bytes elided]…
`;
};
var decodeWhole = (bytes) => {
  return decoder.decode(bytes).replace(/^�+|�+$/g, "");
};
var capContent = (content, limit) => {
  const bytes = encoder.encode(content);
  if (bytes.length <= limit) return content;
  const half = Math.max(0, Math.floor((limit - MARKER_RESERVE_BYTES) / 2));
  const head = decodeWhole(bytes.subarray(0, half));
  const tail = decodeWhole(bytes.subarray(bytes.length - half));
  const elided = bytes.length - byteLength(head) - byteLength(tail);
  return `${head}${elisionMarker(elided)}${tail}`;
};
var mapResults = (steps, transform) => {
  return steps.map((step) => {
    if (!step.observation) return step;
    return {
      ...step,
      observation: { results: step.observation.results.map(transform) }
    };
  });
};
var withSteps = (trajectory, steps) => {
  return { ...trajectory, steps };
};
var serializedBytes = (trajectory) => {
  return byteLength(JSON.stringify(trajectory));
};
var capTrajectory = (trajectory, limits = DEFAULT_TRAJECTORY_LIMITS) => {
  let truncated = false;
  const perObservation = mapResults(trajectory.steps, (result) => {
    const capped = capContent(result.content, limits.observationBytes);
    if (capped !== result.content) truncated = true;
    return capped === result.content ? result : { ...result, content: capped };
  });
  const current = withSteps(trajectory, perObservation);
  let size = serializedBytes(current);
  if (size <= limits.totalBytes) {
    return { byteSize: size, trajectory: current, truncated };
  }
  const jsonBytes = (value) => {
    return byteLength(JSON.stringify(value));
  };
  const elisions = /* @__PURE__ */ new Map();
  const keyOf = (stepIndex, resultIndex) => {
    return `${stepIndex}:${resultIndex}`;
  };
  current.steps.forEach((step, stepIndex) => {
    (step.observation?.results ?? []).forEach((result, resultIndex) => {
      if (size <= limits.totalBytes) return;
      const marker = elisionMarker(byteLength(result.content));
      const saved = jsonBytes(result.content) - jsonBytes(marker);
      if (saved <= 0) return;
      elisions.set(keyOf(stepIndex, resultIndex), marker);
      size -= saved;
    });
  });
  if (elisions.size === 0) {
    return { byteSize: size, trajectory: current, truncated };
  }
  const elidedSteps = current.steps.map((step, stepIndex) => {
    if (!step.observation) return step;
    return {
      ...step,
      observation: {
        results: step.observation.results.map((result, resultIndex) => {
          const marker = elisions.get(keyOf(stepIndex, resultIndex));
          return marker === void 0 ? result : { ...result, content: marker };
        })
      }
    };
  });
  const elided = withSteps(current, elidedSteps);
  return {
    byteSize: serializedBytes(elided),
    trajectory: elided,
    truncated: true
  };
};

// packages/openthrottle-agentic-utils/src/utils/trajectory/tool-metadata.ts
var CODEX_ITEM_BOOKKEEPING = /* @__PURE__ */ new Set([
  "aggregated_output",
  "exit_code",
  "id",
  "item_type",
  "status",
  "type"
]);
var metadataOf = (chunk) => {
  return chunk.metadata ?? {};
};
var stringOf = (value) => {
  return typeof value === "string" && value !== "" ? value : void 0;
};
var asText = (value) => {
  if (typeof value === "string") {
    return value;
  }
  return value === void 0 || value === null ? "" : JSON.stringify(value);
};
var cursorToolBody = (toolCall) => {
  if (!isRecord(toolCall)) {
    return void 0;
  }
  const key = Object.keys(toolCall).find((candidate) => {
    return candidate.endsWith("ToolCall") && isRecord(toolCall[candidate]);
  });
  const body = key === void 0 ? void 0 : toolCall[key];
  return isRecord(body) ? body : void 0;
};
var codexItem = (metadata) => {
  return isRecord(metadata.item) ? metadata.item : void 0;
};
var toolCallIdOf = (chunk) => {
  const metadata = metadataOf(chunk);
  return stringOf(metadata.callId) ?? stringOf(codexItem(metadata)?.id);
};
var toolNameOf2 = (chunk) => {
  const metadata = metadataOf(chunk);
  return stringOf(metadata.toolName) ?? stringOf(metadata.name) ?? stringOf(metadata.itemType) ?? "tool";
};
var toolArgumentsOf2 = (chunk) => {
  const metadata = metadataOf(chunk);
  const item = codexItem(metadata);
  if (item !== void 0) {
    return Object.fromEntries(
      Object.entries(item).filter(([key]) => {
        return !CODEX_ITEM_BOOKKEEPING.has(key);
      })
    );
  }
  const cursorBody = cursorToolBody(metadata.toolCall);
  const candidate = cursorBody?.args ?? metadata.toolCall;
  if (isRecord(candidate)) {
    return candidate;
  }
  return candidate === void 0 || candidate === null ? {} : { value: candidate };
};
var toolResultContentOf = (chunk) => {
  const metadata = metadataOf(chunk);
  const item = codexItem(metadata);
  if (item !== void 0) {
    return asText(item.aggregated_output);
  }
  const cursorBody = cursorToolBody(metadata.toolCall);
  if (cursorBody !== void 0) {
    return asText(cursorBody.result);
  }
  const toolCall = metadata.toolCall;
  if (isRecord(toolCall) && "output" in toolCall) {
    return asText(toolCall.output ?? toolCall.error);
  }
  return asText(toolCall);
};
var isToolResultError = (chunk) => {
  const metadata = metadataOf(chunk);
  const toolCall = isRecord(metadata.toolCall) ? metadata.toolCall : {};
  const hasChunkError = typeof chunk.error === "string" && chunk.error !== "";
  const exitCode = codexItem(metadata)?.exit_code;
  return hasChunkError || metadata.isError === true || typeof toolCall.error === "string" && toolCall.error !== "" || typeof exitCode === "number" && exitCode !== 0;
};

// packages/openthrottle-agentic-utils/src/utils/trajectory/usage-metrics.ts
var EXCLUSIVE_CACHE_DRIVERS = /* @__PURE__ */ new Set([
  DRIVERS.claude,
  DRIVERS.cursor,
  DRIVERS.opencode
]);
var numberAt = (record, keys) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
};
var flattenUsage = (usage) => {
  if (!isRecord(usage)) {
    return {};
  }
  const cache = isRecord(usage.cache) ? usage.cache : {};
  return { ...usage, cacheRead: cache.read, cacheWrite: cache.write };
};
var costOf = (metadata) => {
  const cost = metadata.totalCostUsd ?? metadata.cost;
  return typeof cost === "number" && Number.isFinite(cost) ? cost : void 0;
};
var normalizeUsage = (driverId, chunk) => {
  const metadata = chunk.metadata ?? {};
  const raw = metadata.usage ?? metadata.tokens;
  if (!isRecord(raw)) {
    return void 0;
  }
  const usage = flattenUsage(raw);
  const input = numberAt(usage, ["input_tokens", "inputTokens", "input"]);
  const output = numberAt(usage, ["output_tokens", "outputTokens", "output"]);
  const cacheRead = numberAt(usage, [
    "cache_read_input_tokens",
    "cached_input_tokens",
    "cache_read_tokens",
    "cacheReadTokens",
    "cacheRead"
  ]);
  const cacheWrite = numberAt(usage, [
    "cache_creation_input_tokens",
    "cacheWriteTokens",
    "cacheWrite"
  ]);
  const isExclusive = EXCLUSIVE_CACHE_DRIVERS.has(driverId);
  return {
    cachedTokens: cacheRead,
    completionTokens: output,
    costUsd: costOf(metadata),
    promptTokens: isExclusive ? input + cacheRead + cacheWrite : input,
    raw
  };
};

// packages/openthrottle-agentic-utils/src/utils/trajectory/chunks-to-atif.ts
var ATIF_SCHEMA_VERSION = "ATIF-v1.8";
var emptyDraft = () => {
  return { calls: [], message: "", reasoning: "", results: [] };
};
var isEmptyDraft = (draft) => {
  return draft.calls.length === 0 && draft.message === "" && draft.reasoning === "" && draft.results.length === 0;
};
var toAgentStep = (draft, stepId) => {
  const reasoning = draft.reasoning.trim();
  return {
    message: draft.message.trim(),
    ...draft.results.length > 0 ? { observation: { results: draft.results } } : {},
    ...reasoning === "" ? {} : { reasoning_content: reasoning },
    source: "agent",
    step_id: stepId,
    ...draft.calls.length > 0 ? { tool_calls: draft.calls } : {}
  };
};
var sumUsage = (usages) => {
  if (usages.length === 0) {
    return void 0;
  }
  const costs = usages.map((usage) => {
    return usage.costUsd;
  }).filter((cost) => {
    return cost !== void 0;
  });
  const totalCost = costs.reduce((sum, cost) => {
    return sum + cost;
  }, 0);
  const costField = costs.length > 0 ? { total_cost_usd: totalCost } : {};
  const total = (pick) => {
    return usages.reduce((sum, usage) => {
      return sum + pick(usage);
    }, 0);
  };
  return {
    extra: {
      raw_usage: usages.map((usage) => {
        return usage.raw;
      })
    },
    total_cached_tokens: total((usage) => {
      return usage.cachedTokens;
    }),
    total_completion_tokens: total((usage) => {
      return usage.completionTokens;
    }),
    ...costField,
    total_prompt_tokens: total((usage) => {
      return usage.promptTokens;
    })
  };
};
var chunksToAtif = (input) => {
  const drafts = [];
  const errors = [];
  const usages = [];
  let current = emptyDraft();
  let sessionId;
  let synthesized = 0;
  const draftForAction = () => {
    if (current.results.length > 0) {
      drafts.push(current);
      current = emptyDraft();
    }
    return current;
  };
  for (const chunk of input.chunks) {
    if (typeof chunk.error === "string" && chunk.error.trim() !== "") {
      errors.push(chunk.error.trim());
    }
    switch (chunk.kind) {
      case CONVERSATION_STREAM_CHUNK_KINDS.session: {
        const id = chunk.metadata?.sessionId;
        sessionId = typeof id === "string" && id !== "" ? id : sessionId;
        break;
      }
      case CONVERSATION_STREAM_CHUNK_KINDS.text:
        draftForAction().message += chunk.delta;
        break;
      case CONVERSATION_STREAM_CHUNK_KINDS.thinking:
        draftForAction().reasoning += chunk.delta;
        break;
      case CONVERSATION_STREAM_CHUNK_KINDS.toolCall: {
        const id = toolCallIdOf(chunk);
        const known = current.calls.some((call) => {
          return call.tool_call_id === id;
        });
        if (!known) {
          synthesized += id === void 0 ? 1 : 0;
          draftForAction().calls.push({
            arguments: toolArgumentsOf2(chunk),
            function_name: toolNameOf2(chunk),
            tool_call_id: id ?? `call-${synthesized}`
          });
        }
        break;
      }
      case CONVERSATION_STREAM_CHUNK_KINDS.toolResult: {
        let id = toolCallIdOf(chunk);
        const hasCall = current.calls.some((call) => {
          return call.tool_call_id === id;
        });
        if (id === void 0 || !hasCall) {
          synthesized += id === void 0 ? 1 : 0;
          id = id ?? `call-${synthesized}`;
          current.calls.push({
            arguments: toolArgumentsOf2(chunk),
            extra: { synthesized_from_result: true },
            function_name: toolNameOf2(chunk),
            tool_call_id: id
          });
        }
        current.results.push({
          content: toolResultContentOf(chunk),
          ...isToolResultError(chunk) ? { extra: { is_error: true } } : {},
          source_call_id: id
        });
        break;
      }
      case CONVERSATION_STREAM_CHUNK_KINDS.usage: {
        const usage = normalizeUsage(input.driverId, chunk);
        if (usage !== void 0) {
          usages.push(usage);
        }
        break;
      }
      default:
        break;
    }
  }
  if (!isEmptyDraft(current)) {
    drafts.push(current);
  }
  const userSteps = [];
  if (input.prompt !== void 0) {
    userSteps.push({ message: input.prompt, source: "user", step_id: 1 });
  }
  const steps = [
    ...userSteps,
    ...drafts.map((draft, index) => {
      return toAgentStep(draft, userSteps.length + index + 1);
    })
  ];
  const finalMetrics = sumUsage(usages);
  return {
    agent: {
      name: input.agentName,
      version: input.agentVersion,
      ...input.modelName === void 0 ? {} : { model_name: input.modelName }
    },
    extra: {
      openthrottle: {
        ...input.openthrottle,
        driver: input.driverId,
        errors,
        incomplete: !input.reportsToolCalls
      }
    },
    final_metrics: { ...finalMetrics, total_steps: steps.length },
    schema_version: ATIF_SCHEMA_VERSION,
    ...sessionId === void 0 ? {} : { session_id: sessionId },
    steps
  };
};

// packages/openthrottle-agentic-utils/src/utils/trajectory/redact-secrets.ts
var SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._\-+=/]+/gi,
  /\bsk-[A-Za-z0-9]{8,}/gi,
  /\b(password|passwd|pwd|secret|token|api[_-]?key)\s*[=:]\s*\S+/gi,
  /\bAIza[0-9A-Za-z\-_]{20,}/gi,
  /\bghp_[A-Za-z0-9]{20,}/gi,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/gi
];
var redactSecrets = (value) => {
  let out = value;
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
};

// packages/openthrottle-agentic-utils/src/utils/trajectory/trajectory-record.ts
var TRAJECTORY_TRANSPORT_BYTES = 640 * 1024;

// packages/openthrottle-agentic-utils/src/utils/trajectory/claude-session.ts
var BEGIN_TASK_TOOL = "__begin_task_session";
var CLAIM_MESSAGES_TOOL = "__claim_plan_messages";
var REGISTER_RUN_TOOL = "__register_plan_run";
var SETTLE_RUN_TOOL = "__settle_plan_run";
var UPDATE_TASK_TOOL = "__update_task";
var START_TASK_STATUS = "IN_PROGRESS";
var TERMINAL_TASK_STATUSES = /* @__PURE__ */ new Set([
  "BLOCKED",
  "COMPLETED",
  "SKIPPED"
]);
var GIT_COMMIT_COMMAND = /\bgit\s+commit\b/;
var SUBAGENT_TRANSPORT_BYTES = 160 * 1024;
var stringOf2 = (value) => {
  return typeof value === "string" && value !== "" ? value : void 0;
};
var isMainLine = (event) => {
  return isRecord(event) && event.isSidechain !== true;
};
var toolUsesOf = (event) => {
  if (!isRecord(event) || event.type !== "assistant") {
    return [];
  }
  const message = isRecord(event.message) ? event.message : void 0;
  const content = Array.isArray(message?.content) ? message.content : [];
  return content.flatMap((block) => {
    if (!isRecord(block) || block.type !== "tool_use") {
      return [];
    }
    const id = stringOf2(block.id);
    const name = stringOf2(block.name);
    const input = isRecord(block.input) ? block.input : {};
    return id === void 0 || name === void 0 ? [] : [{ id, input, name }];
  });
};
var toolResultText2 = (content) => {
  if (!Array.isArray(content)) {
    return content;
  }
  return content.map((part) => {
    const isText = isRecord(part) && typeof part.text === "string";
    return isText ? part.text : "";
  }).join("");
};
var toolResultsOf = (event) => {
  if (!isRecord(event) || event.type !== "user") {
    return [];
  }
  const message = isRecord(event.message) ? event.message : void 0;
  const content = Array.isArray(message?.content) ? message.content : [];
  return content.flatMap((block) => {
    if (!isRecord(block) || block.type !== "tool_result") {
      return [];
    }
    const toolUseId = stringOf2(block.tool_use_id);
    const text = toolResultText2(block.content);
    const isUsable = toolUseId !== void 0 && typeof text === "string";
    return isUsable ? [{ content: text, toolUseId }] : [];
  });
};
var isCommitBash = (use) => {
  if (use.name !== "Bash") {
    return false;
  }
  const command = stringOf2(use.input.command);
  return command !== void 0 && GIT_COMMIT_COMMAND.test(command);
};
var exclusiveEndAfterResults = (events, fromIndex, useIds, stopAt) => {
  if (useIds.size === 0) {
    return Math.min(fromIndex + 1, stopAt);
  }
  const pending = new Set(useIds);
  let end = Math.min(fromIndex + 1, stopAt);
  for (let index = fromIndex + 1; index < stopAt && pending.size > 0; index += 1) {
    if (!isMainLine(events[index])) {
      end = index + 1;
      continue;
    }
    for (const result of toolResultsOf(events[index])) {
      pending.delete(result.toolUseId);
    }
    end = index + 1;
  }
  return end;
};
var exclusiveEndAfterTerminal = (events, terminal, stopAt) => {
  let end = exclusiveEndAfterResults(
    events,
    terminal.index,
    /* @__PURE__ */ new Set([terminal.toolUseId]),
    stopAt
  );
  for (let index = end; index < stopAt; index += 1) {
    if (!isMainLine(events[index])) {
      continue;
    }
    const uses = toolUsesOf(events[index]);
    if (uses.length === 0) {
      continue;
    }
    if (!uses.every(isCommitBash)) {
      break;
    }
    end = exclusiveEndAfterResults(
      events,
      index,
      new Set(
        uses.map((use) => {
          return use.id;
        })
      ),
      stopAt
    );
    break;
  }
  return end;
};
var firstToolUseIdInRange = (events, startIndex, endIndex) => {
  for (let index = startIndex; index < endIndex; index += 1) {
    if (!isMainLine(events[index])) {
      continue;
    }
    const [use] = toolUsesOf(events[index]);
    if (use !== void 0) {
      return use.id;
    }
  }
  return void 0;
};
var planIdNear = (events, startIndex, fallback) => {
  if (fallback !== void 0) {
    return fallback;
  }
  for (let index = startIndex; index >= 0; index -= 1) {
    if (!isMainLine(events[index])) {
      continue;
    }
    for (const use of toolUsesOf(events[index])) {
      const planId = stringOf2(use.input.planId);
      if (planId !== void 0) {
        return planId;
      }
    }
  }
  return void 0;
};
var collectTaskBounds = (events) => {
  const byTask = /* @__PURE__ */ new Map();
  let settleIndex;
  let settleToolUseId;
  const touch = (taskId) => {
    const existing = byTask.get(taskId);
    if (existing !== void 0) {
      return existing;
    }
    const created = {
      begin: void 0,
      end: void 0,
      start: void 0
    };
    byTask.set(taskId, created);
    return created;
  };
  const noteStart = (taskId, marker, isBegin) => {
    const entry = touch(taskId);
    if (isBegin && entry.begin === void 0) {
      entry.begin = marker;
    }
    if (entry.start === void 0 || marker.index < entry.start.index) {
      entry.start = marker;
    }
  };
  events.forEach((event, index) => {
    if (!isMainLine(event)) {
      return;
    }
    for (const use of toolUsesOf(event)) {
      const planId = stringOf2(use.input.planId);
      const marker = { index, planId, toolUseId: use.id };
      if (use.name.endsWith(SETTLE_RUN_TOOL)) {
        settleIndex = index;
        settleToolUseId = use.id;
        continue;
      }
      if (use.name.endsWith(BEGIN_TASK_TOOL)) {
        const taskId2 = stringOf2(use.input.taskId);
        if (taskId2 !== void 0) {
          noteStart(taskId2, marker, true);
        }
        continue;
      }
      if (use.name.endsWith(CLAIM_MESSAGES_TOOL)) {
        const taskId2 = stringOf2(use.input.taskId);
        if (taskId2 !== void 0) {
          noteStart(taskId2, marker, false);
        }
        continue;
      }
      if (!use.name.endsWith(UPDATE_TASK_TOOL)) {
        continue;
      }
      const taskId = stringOf2(use.input.id);
      const status = stringOf2(use.input.status);
      if (taskId === void 0 || status === void 0) {
        continue;
      }
      if (status === START_TASK_STATUS) {
        noteStart(taskId, marker, false);
        continue;
      }
      if (TERMINAL_TASK_STATUSES.has(status)) {
        const entry = touch(taskId);
        if (entry.end === void 0 || index > entry.end.index) {
          entry.end = marker;
        }
      }
    }
  });
  const tasks = [...byTask.entries()].flatMap(([taskId, entry]) => {
    if (entry.start === void 0) {
      return [];
    }
    return [
      {
        begin: entry.begin,
        end: entry.end,
        start: entry.start,
        taskId
      }
    ];
  });
  tasks.sort((left, right) => {
    return left.start.index - right.start.index;
  });
  return { settleIndex, settleToolUseId, tasks };
};
var planLevelSegment = (events, startIndex, endIndex, closed, planId, toolUseId) => {
  if (startIndex >= endIndex) {
    return void 0;
  }
  return {
    closed,
    endIndex,
    planId: planIdNear(events, startIndex, planId),
    startIndex,
    taskId: null,
    toolUseId: firstToolUseIdInRange(events, startIndex, endIndex) ?? toolUseId
  };
};
var findClaudeSessionTaskSegments = (events) => {
  const { settleIndex, settleToolUseId, tasks } = collectTaskBounds(events);
  if (tasks.length === 0) {
    return [];
  }
  const taskSegments = tasks.map(
    (task, position) => {
      const nextStart = tasks[position + 1]?.start.index;
      const stopAt = nextStart ?? settleIndex ?? events.length;
      const terminal = task.end;
      let endIndex;
      if (terminal !== void 0) {
        endIndex = exclusiveEndAfterTerminal(events, terminal, stopAt);
      } else if (nextStart !== void 0) {
        endIndex = nextStart;
      } else if (settleIndex === void 0) {
        endIndex = events.length;
      } else {
        const settleIds = settleToolUseId === void 0 ? [] : [settleToolUseId];
        endIndex = exclusiveEndAfterResults(
          events,
          settleIndex,
          new Set(settleIds),
          events.length
        );
      }
      const closed = terminal !== void 0 || nextStart !== void 0 || settleIndex !== void 0;
      return {
        closed,
        endIndex,
        planId: task.begin?.planId ?? task.start.planId,
        startIndex: task.start.index,
        taskId: task.taskId,
        toolUseId: task.begin?.toolUseId ?? task.start.toolUseId
      };
    }
  );
  const segments = [];
  taskSegments.forEach((segment, position) => {
    const previous = taskSegments[position - 1];
    if (previous !== void 0) {
      const gap = planLevelSegment(
        events,
        previous.endIndex,
        segment.startIndex,
        true,
        previous.planId ?? segment.planId,
        `plan-gap:${previous.toolUseId}:${segment.toolUseId}`
      );
      if (gap !== void 0) {
        segments.push(gap);
      }
    }
    segments.push(segment);
  });
  const last = taskSegments[taskSegments.length - 1];
  if (last !== void 0 && last.closed && last.endIndex < events.length) {
    const wrapUpClosed = settleIndex !== void 0;
    let wrapUpEnd = events.length;
    if (settleIndex !== void 0) {
      const settleIds = settleToolUseId === void 0 ? [] : [settleToolUseId];
      wrapUpEnd = exclusiveEndAfterResults(
        events,
        settleIndex,
        new Set(settleIds),
        events.length
      );
    }
    const wrapUpToolUseId = settleToolUseId ?? `plan-wrap:${last.toolUseId}`;
    const wrapUp = planLevelSegment(
      events,
      last.endIndex,
      Math.max(wrapUpEnd, last.endIndex),
      wrapUpClosed,
      last.planId,
      wrapUpToolUseId
    );
    if (wrapUp !== void 0) {
      segments.push(wrapUp);
    }
  }
  return segments;
};
var findClaudeSessionPlanRunId = (events) => {
  const registerIds = /* @__PURE__ */ new Set();
  let planRunId;
  for (const event of events) {
    for (const use of toolUsesOf(event)) {
      if (use.name.endsWith(REGISTER_RUN_TOOL)) {
        registerIds.add(use.id);
      }
    }
    for (const result of toolResultsOf(event)) {
      if (registerIds.has(result.toolUseId)) {
        planRunId = runIdOf(result.content) ?? planRunId;
      }
    }
  }
  return planRunId;
};
function runIdOf(content) {
  try {
    const parsed = JSON.parse(content);
    const run = isRecord(parsed) && isRecord(parsed.run) ? parsed.run : {};
    return stringOf2(run.id);
  } catch {
    return void 0;
  }
}
var findClaudeSessionSubagentIds = (events) => {
  const ids = events.flatMap((event) => {
    const result = isRecord(event) ? event.toolUseResult : void 0;
    const agentId = isRecord(result) ? stringOf2(result.agentId) : void 0;
    return agentId === void 0 ? [] : [agentId];
  });
  return [...new Set(ids)];
};
var claudeSessionTaskOutcome = (events, taskId) => {
  if (taskId === null) {
    let settleOutcome = "unknown";
    for (const event of events) {
      for (const use of toolUsesOf(event)) {
        const status = stringOf2(use.input.status);
        if (use.name.endsWith(SETTLE_RUN_TOOL) && status !== void 0) {
          settleOutcome = status.toLowerCase();
        }
      }
    }
    return settleOutcome;
  }
  let outcome = "unknown";
  for (const event of events) {
    for (const use of toolUsesOf(event)) {
      const status = stringOf2(use.input.status);
      const isThisTask = stringOf2(use.input.id) === taskId;
      const isTerminal = status !== void 0 && TERMINAL_TASK_STATUSES.has(status);
      if (use.name.endsWith(UPDATE_TASK_TOOL) && isThisTask && isTerminal) {
        outcome = status.toLowerCase();
      }
    }
  }
  return outcome;
};
var claudeSessionEventsToChunks = (events) => {
  const reader = createStructuredChunkReader("claude");
  const countedRequests = /* @__PURE__ */ new Set();
  if (reader === void 0) {
    return [];
  }
  return events.flatMap((event) => {
    if (!isRecord(event) || event.type !== "assistant" && event.type !== "user") {
      return [];
    }
    const chunks = [...reader(event)];
    const requestId = stringOf2(event.requestId);
    const message = isRecord(event.message) ? event.message : void 0;
    const isNewRequest = requestId !== void 0 && !countedRequests.has(requestId);
    if (event.type === "assistant" && isNewRequest && isRecord(message?.usage)) {
      countedRequests.add(requestId);
      chunks.push({
        delta: "",
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
        metadata: { usage: message.usage }
      });
    }
    return chunks;
  });
};
var modelOf = (events) => {
  for (const event of events) {
    const message = isRecord(event) ? event.message : void 0;
    const model = isRecord(message) ? stringOf2(message.model) : void 0;
    if (model !== void 0 && model !== "<synthetic>") {
      return model;
    }
  }
  return void 0;
};
var timestampsOf = (events) => {
  return events.flatMap((event) => {
    const raw = isRecord(event) ? stringOf2(event.timestamp) : void 0;
    const time = raw === void 0 ? Number.NaN : Date.parse(raw);
    return Number.isNaN(time) ? [] : [time];
  });
};
var spawnedAgentByCallId = (events) => {
  const byCallId = /* @__PURE__ */ new Map();
  for (const event of events) {
    const result = isRecord(event) ? event.toolUseResult : void 0;
    const agentId = isRecord(result) ? stringOf2(result.agentId) : void 0;
    const [toolResult] = toolResultsOf(event);
    if (agentId !== void 0 && toolResult !== void 0) {
      byCallId.set(toolResult.toolUseId, agentId);
    }
  }
  return byCallId;
};
var withSubagentRefs = (trajectory, spawned, embeddedIds) => {
  const steps = trajectory.steps.map((step) => {
    if (step.observation === void 0) {
      return step;
    }
    const results = step.observation.results.map((result) => {
      const callId = result.source_call_id;
      const agentId = callId === void 0 ? void 0 : spawned.get(callId);
      const isEmbedded = agentId !== void 0 && embeddedIds.has(agentId);
      return isEmbedded ? { ...result, subagent_trajectory_ref: { trajectory_id: agentId } } : result;
    });
    return { ...step, observation: { results } };
  });
  return { ...trajectory, steps };
};
var HAND_BACK_EXCERPT_CHARS = 480;
var AGENT_MESSAGE_FROM = /<agent-message\s+from="([A-Za-z0-9_-]+)"/i;
var TASK_NOTIFICATION_SUMMARY = /<summary>([\s\S]*?)<\/summary>/i;
var TASK_NOTIFICATION_STATUS = /<status>([\s\S]*?)<\/status>/i;
var SYSTEM_REMINDER_INNER = /<system-reminder>([\s\S]*?)<\/system-reminder>/i;
var userTurnText = (event) => {
  const message = isRecord(event.message) ? event.message : void 0;
  const content = message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return void 0;
  }
  const texts = content.flatMap((block) => {
    if (typeof block === "string" && block !== "") {
      return [block];
    }
    if (isRecord(block) && block.type === "text") {
      const text = stringOf2(block.text);
      return text === void 0 ? [] : [text];
    }
    return [];
  });
  if (texts.length === 0) {
    return void 0;
  }
  return texts.join("\n");
};
var isToolResultOnlyUser = (event) => {
  const message = isRecord(event.message) ? event.message : void 0;
  const content = message?.content;
  if (!Array.isArray(content) || content.length === 0) {
    return false;
  }
  return content.every((block) => {
    return isRecord(block) && block.type === "tool_result";
  });
};
var timestampOf = (event) => {
  return stringOf2(event.timestamp);
};
var withStepId = (step, stepId) => {
  return { ...step, step_id: stepId };
};
var redactStepText = (value) => {
  return redactSecrets(value);
};
var handBackExcerpt = (text) => {
  const reportStart = text.indexOf("The report follows:");
  if (reportStart === -1) {
    return "";
  }
  const reportBody = text.slice(reportStart + "The report follows:".length).trim();
  if (reportBody === "") {
    return "";
  }
  if (reportBody.length <= HAND_BACK_EXCERPT_CHARS) {
    return reportBody;
  }
  return `${reportBody.slice(0, HAND_BACK_EXCERPT_CHARS)}…`;
};
var handBackStep = (text, timestamp) => {
  const agentId = AGENT_MESSAGE_FROM.exec(text)?.[1];
  const excerpt = handBackExcerpt(text);
  const hasAgentId = agentId !== void 0;
  const message = hasAgentId ? `Subagent hand-back (${agentId})` : "Subagent hand-back";
  return {
    extra: {
      openthrottle: {
        kind: "subagent_hand_back",
        ...hasAgentId ? { subagent_trajectory_id: agentId } : {}
      }
    },
    message: redactStepText(message),
    observation: {
      results: [
        {
          content: redactStepText(excerpt),
          ...hasAgentId ? { subagent_trajectory_ref: { trajectory_id: agentId } } : {}
        }
      ]
    },
    source: "system",
    ...timestamp === void 0 ? {} : { timestamp }
  };
};
var taskNotificationMessage = (text) => {
  const summary = TASK_NOTIFICATION_SUMMARY.exec(text)?.[1]?.trim();
  const status = TASK_NOTIFICATION_STATUS.exec(text)?.[1]?.trim();
  if (summary === void 0) {
    return "Background task notification";
  }
  if (status === void 0) {
    return summary;
  }
  return `${summary} (${status})`;
};
var taskNotificationStep = (text, timestamp) => {
  return {
    extra: { openthrottle: { kind: "task_notification" } },
    message: redactStepText(taskNotificationMessage(text)),
    source: "system",
    ...timestamp === void 0 ? {} : { timestamp }
  };
};
var systemReminderTagBody = (inner, tagName) => {
  return new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i").exec(inner)?.[1]?.trim();
};
var systemReminderMessage = (text) => {
  const inner = SYSTEM_REMINDER_INNER.exec(text)?.[1]?.trim() ?? text.trim();
  const tagName = /<([a-zA-Z][\w-]*)>/.exec(inner)?.[1];
  if (tagName === void 0) {
    return "System reminder";
  }
  const tagBody = systemReminderTagBody(inner, tagName);
  if (tagBody === void 0 || tagBody === "") {
    return `System reminder: ${tagName}`;
  }
  return `System reminder: ${tagName} (${tagBody})`;
};
var systemReminderStep = (text, timestamp) => {
  return {
    extra: { openthrottle: { kind: "system_reminder" } },
    message: redactStepText(systemReminderMessage(text)),
    source: "system",
    ...timestamp === void 0 ? {} : { timestamp }
  };
};
var harnessTurnStep = (text, timestamp, isMeta) => {
  if (/\[Subagent hand-back\]/i.test(text) || AGENT_MESSAGE_FROM.test(text)) {
    return handBackStep(text, timestamp);
  }
  if (/<task-notification>/i.test(text)) {
    return taskNotificationStep(text, timestamp);
  }
  if (/<system-reminder>/i.test(text)) {
    return systemReminderStep(text, timestamp);
  }
  if (isMeta) {
    const trimmed = text.trim();
    const isShort = trimmed.length <= 240;
    const summary = isShort ? trimmed : `${trimmed.slice(0, 240)}…`;
    return {
      extra: { openthrottle: { kind: "harness_message" } },
      message: redactStepText(summary),
      source: "system",
      ...timestamp === void 0 ? {} : { timestamp }
    };
  }
  return {
    message: redactStepText(text),
    source: "user",
    ...timestamp === void 0 ? {} : { timestamp }
  };
};
var redactAgentSteps = (steps) => {
  return steps.map((step) => {
    let observation;
    if (step.observation !== void 0) {
      observation = {
        results: step.observation.results.map((result) => {
          return {
            ...result,
            content: redactStepText(result.content)
          };
        })
      };
    }
    let next = {
      ...step,
      message: redactStepText(step.message)
    };
    if (observation !== void 0) {
      next = { ...next, observation };
    }
    if (step.reasoning_content !== void 0) {
      next = {
        ...next,
        reasoning_content: redactStepText(step.reasoning_content)
      };
    }
    return next;
  });
};
var stepsFromSessionEvents = (events, agentVersion, model, openthrottle) => {
  const steps = [];
  const agentBuffer = [];
  const flushAgent = () => {
    if (agentBuffer.length === 0) {
      return;
    }
    const buffered = agentBuffer.splice(0, agentBuffer.length);
    const chunks = claudeSessionEventsToChunks(buffered);
    if (chunks.length === 0) {
      return;
    }
    const partial = chunksToAtif({
      agentName: "claude",
      agentVersion,
      chunks,
      driverId: "claude",
      modelName: model,
      openthrottle,
      prompt: void 0,
      reportsToolCalls: true
    });
    for (const step of redactAgentSteps(partial.steps)) {
      steps.push({ ...step, step_id: steps.length + 1 });
    }
  };
  for (const event of events) {
    if (!isRecord(event)) {
      continue;
    }
    if (event.type === "assistant") {
      agentBuffer.push(event);
      continue;
    }
    if (event.type !== "user") {
      continue;
    }
    if (isToolResultOnlyUser(event)) {
      agentBuffer.push(event);
      continue;
    }
    const text = userTurnText(event);
    if (text === void 0) {
      continue;
    }
    flushAgent();
    steps.push(
      withStepId(
        harnessTurnStep(text, timestampOf(event), event.isMeta === true),
        steps.length + 1
      )
    );
  }
  flushAgent();
  if (steps.length === 0) {
    return void 0;
  }
  const shell = chunksToAtif({
    agentName: "claude",
    agentVersion,
    chunks: claudeSessionEventsToChunks(events),
    driverId: "claude",
    modelName: model,
    openthrottle,
    prompt: void 0,
    reportsToolCalls: true
  });
  return {
    ...shell,
    final_metrics: {
      ...shell.final_metrics,
      total_steps: steps.length
    },
    steps
  };
};
var subagentTrajectory = (subagent, agentVersion) => {
  const model = modelOf(subagent.events);
  const built = stepsFromSessionEvents(
    subagent.events.filter(isRecord),
    agentVersion,
    model,
    { agentId: subagent.agentId }
  );
  if (built === void 0) {
    const empty = chunksToAtif({
      agentName: "claude",
      agentVersion,
      chunks: [],
      driverId: "claude",
      modelName: model,
      openthrottle: { agentId: subagent.agentId },
      prompt: void 0,
      reportsToolCalls: true
    });
    const capped2 = capTrajectory(
      { ...empty, trajectory_id: subagent.agentId },
      { observationBytes: 16 * 1024, totalBytes: SUBAGENT_TRANSPORT_BYTES }
    );
    return { trajectory: capped2.trajectory, truncated: capped2.truncated };
  }
  const capped = capTrajectory(
    { ...built, trajectory_id: subagent.agentId },
    { observationBytes: 16 * 1024, totalBytes: SUBAGENT_TRANSPORT_BYTES }
  );
  return { trajectory: capped.trajectory, truncated: capped.truncated };
};
var buildClaudeSessionTrajectory = (input) => {
  const mainEvents = input.segmentEvents.filter(isMainLine);
  const model = modelOf(mainEvents);
  const main2 = stepsFromSessionEvents(
    mainEvents,
    input.agentVersion,
    model,
    input.openthrottle
  );
  if (main2 === void 0) {
    return void 0;
  }
  const subagents = input.subagents.map((subagent) => {
    return subagentTrajectory(subagent, input.agentVersion);
  });
  let embedded = main2;
  if (subagents.length > 0) {
    const embeddedIds = new Set(
      input.subagents.map((subagent) => {
        return subagent.agentId;
      })
    );
    embedded = {
      ...withSubagentRefs(main2, spawnedAgentByCallId(mainEvents), embeddedIds),
      subagent_trajectories: subagents.map((subagent) => {
        return subagent.trajectory;
      })
    };
  }
  const capped = capTrajectory(embedded, {
    observationBytes: 16 * 1024,
    totalBytes: TRAJECTORY_TRANSPORT_BYTES
  });
  const times = timestampsOf(mainEvents);
  const durationMs = times.length < 2 ? null : Math.max(...times) - Math.min(...times);
  return {
    durationMs,
    model,
    outcome: claudeSessionTaskOutcome(mainEvents, input.taskId),
    trajectory: capped.trajectory,
    trajectoryJson: JSON.stringify(capped.trajectory),
    truncated: capped.truncated || subagents.some((subagent) => {
      return subagent.truncated;
    })
  };
};

// packages/agentic-hooks/src/adapters/claude/session-trajectory.ts
var SESSION_TRAJECTORY_SOURCE = "session_upload";
var SESSION_TRAJECTORY_DRIVER = "claude";
var MAX_SESSION_SCAN_BYTES_PER_STOP = 32 * 1024 * 1024;
var MAX_SUBAGENT_TRANSCRIPT_BYTES = 4 * 1024 * 1024;
var DEFAULT_SESSION_TRAJECTORY_BUDGET_MS = 4e3;
var SAFE_AGENT_ID = /^[A-Za-z0-9_-]+$/;
var parseJsonLines = (lines) => {
  return lines.flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
};
var firstVersionOf = (events) => {
  for (const event of events) {
    if (isRecord(event) && typeof event.version === "string") {
      return event.version;
    }
  }
  return "unknown";
};
var loadSubagents = (transcriptPath, sessionId, agentIds) => {
  const subagentsDir = import_node_path9.default.join(
    import_node_path9.default.dirname(transcriptPath),
    sessionId,
    "subagents"
  );
  return agentIds.flatMap((agentId) => {
    if (!SAFE_AGENT_ID.test(agentId)) {
      return [];
    }
    const { lines } = readNewBytes({
      filePath: import_node_path9.default.join(subagentsDir, `agent-${agentId}.jsonl`),
      maxBytes: MAX_SUBAGENT_TRANSCRIPT_BYTES,
      offset: 0
    });
    return lines.length === 0 ? [] : [{ agentId, events: parseJsonLines(lines) }];
  });
};
var captureSessionTrajectories = async ({
  authToken,
  budgetMs = DEFAULT_SESSION_TRAJECTORY_BUDGET_MS,
  fetchImpl,
  graphqlUrl,
  jsonlPath,
  nowFn = Date.now,
  repoRoot,
  sessionId,
  timeoutMs,
  transcriptPath,
  uploadsDir
}) => {
  try {
    if (process.env.OPENTHROTTLE_SESSION_TRAJECTORIES === "0") {
      return { handled: 0, skipped: "OPENTHROTTLE_SESSION_TRAJECTORIES=0" };
    }
    if (transcriptPath === null) {
      return { handled: 0, skipped: "no transcript path" };
    }
    const state = readTrajectoryUploadState({ dir: uploadsDir, sessionId });
    const read = readNewLines({
      filePath: transcriptPath,
      maxBytes: MAX_SESSION_SCAN_BYTES_PER_STOP,
      offset: state.scanOffset
    });
    const scanned = read.lines.flatMap((line) => {
      return parseJsonLines([line.text]).map((event) => {
        return { event, offset: line.offset };
      });
    });
    const events = scanned.map((entry) => entry.event);
    const planRunId = findClaudeSessionPlanRunId(events) ?? state.planRunId ?? readPlanRunIdForSession({ repoRoot, sessionId });
    const agentVersion = firstVersionOf(events);
    const deadline = nowFn() + budgetMs;
    const uploaded = new Set(state.uploaded);
    let firstPendingOffset;
    let handled = 0;
    for (const segment of findClaudeSessionTaskSegments(events)) {
      if (uploaded.has(segment.toolUseId)) {
        continue;
      }
      const offset = scanned[segment.startIndex]?.offset ?? read.nextOffset;
      const isOversized = !segment.closed && read.capped && segment.startIndex === 0;
      if (isOversized) {
        logHookError(
          `trajectory segment ${segment.taskId ?? "plan"} exceeds scan window`
        );
        uploaded.add(segment.toolUseId);
        handled += 1;
        continue;
      }
      const segmentRunId = findClaudeSessionPlanRunId(events.slice(0, segment.startIndex)) ?? planRunId;
      const isReady = segment.closed && segmentRunId !== void 0 && nowFn() <= deadline;
      if (!isReady) {
        firstPendingOffset ??= offset;
        continue;
      }
      const segmentEvents = events.slice(segment.startIndex, segment.endIndex);
      const built = buildClaudeSessionTrajectory({
        agentVersion,
        openthrottle: {
          planId: segment.planId,
          planRunId: segmentRunId,
          sessionId,
          taskId: segment.taskId
        },
        segmentEvents,
        subagents: loadSubagents(
          transcriptPath,
          sessionId,
          findClaudeSessionSubagentIds(segmentEvents)
        ),
        taskId: segment.taskId
      });
      if (built === void 0) {
        uploaded.add(segment.toolUseId);
        handled += 1;
        continue;
      }
      const result = await persistTrajectory(
        {
          driver: SESSION_TRAJECTORY_DRIVER,
          durationMs: built.durationMs,
          exitCode: null,
          idempotencyKey: `session:${sessionId}:${segment.toolUseId}`,
          model: built.model ?? null,
          outcome: built.outcome,
          planRunId: segmentRunId,
          source: SESSION_TRAJECTORY_SOURCE,
          taskId: segment.taskId,
          trajectoryJson: built.trajectoryJson
        },
        { authToken, fetchImpl, graphqlUrl, jsonlPath, repoRoot, timeoutMs }
      );
      if (result.sink === "dropped") {
        firstPendingOffset ??= offset;
        continue;
      }
      uploaded.add(segment.toolUseId);
      handled += 1;
    }
    writeTrajectoryUploadState({
      dir: uploadsDir,
      sessionId,
      state: {
        planRunId,
        scanOffset: firstPendingOffset ?? read.nextOffset,
        uploaded: [...uploaded]
      }
    });
    return { handled, skipped: void 0 };
  } catch (err) {
    logHookError("captureSessionTrajectories failed", err);
    return { handled: 0, skipped: "error" };
  }
};

// packages/agentic-hooks/src/adapters/claude/shadow.ts
var import_node_fs12 = __toESM(require("node:fs"), 1);
var import_node_path10 = __toESM(require("node:path"), 1);
var CAPTURE_BUNDLE = "skill-usage-capture";
var runningFromPlugin = (env, scriptPath) => {
  const pluginRoot = env.CLAUDE_PLUGIN_ROOT?.trim();
  if (!pluginRoot || !scriptPath) {
    return false;
  }
  const relative = import_node_path10.default.relative(import_node_path10.default.resolve(pluginRoot), scriptPath);
  return relative !== "" && !relative.startsWith("..");
};
var repoRegistersCapture = (repoRoot) => {
  try {
    const raw = import_node_fs12.default.readFileSync(
      import_node_path10.default.join(repoRoot, ".claude", "settings.json"),
      "utf8"
    );
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || !("hooks" in parsed)) {
      return false;
    }
    return JSON.stringify(parsed.hooks).includes(CAPTURE_BUNDLE);
  } catch {
    return false;
  }
};
var isShadowedByRepoHooks = ({
  env = process.env,
  repoRoot,
  scriptPath = process.argv[1]
}) => {
  return runningFromPlugin(env, scriptPath) && repoRegistersCapture(repoRoot);
};

// packages/agentic-hooks/src/adapters/claude/transcript-usage.ts
var import_node_fs13 = __toESM(require("node:fs"), 1);
var import_node_path11 = __toESM(require("node:path"), 1);

// packages/agentic-token-usage/src/usage.ts
var asFiniteNumber = (value) => {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
};
var asNonEmptyString2 = (value) => {
  return typeof value === "string" && value !== "" ? value : void 0;
};
var firstNumber = (...candidates) => {
  for (const candidate of candidates) {
    const parsed = asFiniteNumber(candidate);
    if (parsed !== void 0) {
      return parsed;
    }
  }
  return void 0;
};
var safeParseRecord = (json) => {
  if (json === "") {
    return null;
  }
  try {
    const parsed = JSON.parse(json);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
var toMetaRecord = (input) => {
  if (typeof input === "string") {
    return safeParseRecord(input);
  }
  if (isRecord(input)) {
    return input;
  }
  return null;
};
var normalizeUsage2 = (input) => {
  const meta = toMetaRecord(input);
  if (meta === null) {
    return {};
  }
  const usage = isRecord(meta.usage) ? meta.usage : {};
  const tokens = isRecord(meta.tokens) ? meta.tokens : {};
  const cache = isRecord(tokens.cache) ? tokens.cache : {};
  const inputTokens = firstNumber(
    usage.input_tokens,
    usage.inputTokens,
    usage.prompt_tokens,
    usage.promptTokens,
    tokens.input,
    meta.input_tokens,
    meta.inputTokens
  );
  const outputTokens = firstNumber(
    usage.output_tokens,
    usage.outputTokens,
    usage.completion_tokens,
    usage.completionTokens,
    tokens.output,
    meta.output_tokens,
    meta.outputTokens
  );
  const cacheReadTokens = firstNumber(
    usage.cache_read_input_tokens,
    usage.cacheReadInputTokens,
    usage.cacheReadTokens,
    usage.cached,
    cache.read
  );
  const cacheWriteTokens = firstNumber(
    usage.cache_creation_input_tokens,
    usage.cacheCreationInputTokens,
    usage.cacheWriteTokens,
    cache.write
  );
  const reasoningTokens = firstNumber(
    usage.reasoning_tokens,
    usage.reasoningTokens,
    tokens.reasoning
  );
  const explicitTotal = firstNumber(
    usage.total_tokens,
    usage.totalTokens,
    tokens.total,
    meta.total_tokens,
    meta.totalTokens
  );
  const costUsd = firstNumber(
    meta.totalCostUsd,
    meta.total_cost_usd,
    meta.cost,
    usage.costUsd,
    usage.costUSD,
    usage.cost
  );
  const model = asNonEmptyString2(meta.model) ?? asNonEmptyString2(usage.model) ?? (isRecord(meta.modelUsage) ? Object.keys(meta.modelUsage)[0] : void 0);
  const summable = [inputTokens, outputTokens].filter(
    (value) => value !== void 0
  );
  const totalTokens = explicitTotal ?? (summable.length > 0 ? summable.reduce((a, b) => a + b, 0) : void 0);
  return {
    ...cacheReadTokens !== void 0 ? { cacheReadTokens } : {},
    ...cacheWriteTokens !== void 0 ? { cacheWriteTokens } : {},
    ...costUsd !== void 0 ? { costUsd } : {},
    ...inputTokens !== void 0 ? { inputTokens } : {},
    ...model !== void 0 ? { model } : {},
    ...outputTokens !== void 0 ? { outputTokens } : {},
    ...reasoningTokens !== void 0 ? { reasoningTokens } : {},
    ...totalTokens !== void 0 ? { totalTokens } : {}
  };
};
var hasNoCounts = (usage) => {
  return usage.inputTokens === void 0 && usage.outputTokens === void 0 && usage.cacheReadTokens === void 0 && usage.cacheWriteTokens === void 0 && usage.reasoningTokens === void 0 && usage.totalTokens === void 0 && usage.costUsd === void 0;
};
var hasUsageCounts = (usage) => {
  return usage !== void 0 && !hasNoCounts(usage);
};

// packages/agentic-hooks/src/adapters/claude/transcript.ts
var CLAUDE_PROVIDER = "claude";
var SYNTHETIC_MODEL = "<synthetic>";
var nonEmptyString2 = (value) => {
  return typeof value === "string" && value !== "" ? value : null;
};
var finiteNumber = (value) => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};
var thinkingTokens = (usage) => {
  return isRecord(usage.output_tokens_details) ? finiteNumber(usage.output_tokens_details.thinking_tokens) : null;
};
var parseJsonRecord = (line) => {
  try {
    const parsed = JSON.parse(line);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
var toRecord = (entry, fallbackSessionId) => {
  if (entry.type !== "assistant") {
    return null;
  }
  const requestId = nonEmptyString2(entry.requestId);
  const { message } = entry;
  if (requestId === null || !isRecord(message) || !isRecord(message.usage)) {
    return null;
  }
  const model = nonEmptyString2(message.model);
  if (model === null || model === SYNTHETIC_MODEL) {
    return null;
  }
  const { usage } = message;
  const counts = normalizeUsage2({ model, usage });
  if (!hasUsageCounts(counts)) {
    return null;
  }
  const agentId = nonEmptyString2(entry.agentId);
  return {
    cache_read_tokens: counts.cacheReadTokens ?? null,
    cache_write_tokens: counts.cacheWriteTokens ?? null,
    cost_usd: counts.costUsd ?? null,
    cwd: nonEmptyString2(entry.cwd),
    git_branch: nonEmptyString2(entry.gitBranch),
    input_tokens: counts.inputTokens ?? null,
    model,
    occurred_at: nonEmptyString2(entry.timestamp) ?? (/* @__PURE__ */ new Date()).toISOString(),
    output_tokens: counts.outputTokens ?? null,
    provider: CLAUDE_PROVIDER,
    raw_usage_json: JSON.stringify(
      agentId === null ? usage : { ...usage, agentId, isSidechain: true }
    ),
    reasoning_tokens: counts.reasoningTokens ?? thinkingTokens(usage),
    request_id: requestId,
    session_id: nonEmptyString2(entry.sessionId) ?? fallbackSessionId,
    source: CLAUDE_SOURCE,
    total_tokens: counts.totalTokens ?? null
  };
};
var parseTranscriptLines = ({
  fallbackSessionId,
  lines,
  seen
}) => {
  const records = [];
  for (const line of lines) {
    const entry = parseJsonRecord(line);
    if (entry === null) {
      continue;
    }
    const record = toRecord(entry, fallbackSessionId);
    if (record === null || record.request_id === null) {
      continue;
    }
    if (seen.has(record.request_id)) {
      continue;
    }
    seen.add(record.request_id);
    records.push(record);
  }
  return records;
};

// packages/agentic-hooks/src/adapters/claude/transcript-usage.ts
var MAX_TRANSCRIPT_BYTES_PER_FILE = 4 * 1024 * 1024;
var MAX_TRANSCRIPT_BYTES_PER_STOP = 16 * 1024 * 1024;
var SUBAGENT_FILE = /^agent-.+\.jsonl$/;
var listSubagentTranscripts = (transcriptPath) => {
  const { dir, name } = import_node_path11.default.parse(transcriptPath);
  const subagentsDir = import_node_path11.default.join(dir, name, "subagents");
  try {
    return import_node_fs13.default.readdirSync(subagentsDir).filter((entry) => SUBAGENT_FILE.test(entry)).sort().map((entry) => import_node_path11.default.join(subagentsDir, entry));
  } catch {
    return [];
  }
};
var accountedFor = (result, records) => {
  return result.buffered + result.deadLettered + result.inserted + result.skipped >= records;
};
var captureTranscriptUsage = async ({
  agentTranscriptPath,
  authToken,
  checkpointsDir,
  fetchImpl,
  graphqlUrl,
  jsonlPath,
  repoRoot,
  sessionId,
  timeoutMs,
  transcriptPath
}) => {
  const idle = {
    advanced: false,
    filesRead: 0,
    records: 0
  };
  try {
    const targets = [
      ...new Set(
        [
          transcriptPath,
          ...transcriptPath === null ? [] : listSubagentTranscripts(transcriptPath),
          agentTranscriptPath
        ].filter((entry) => entry !== null)
      )
    ];
    const seen = /* @__PURE__ */ new Set();
    const pending = [];
    const records = [];
    let budget = MAX_TRANSCRIPT_BYTES_PER_STOP;
    for (const filePath of targets) {
      if (budget <= 0) {
        break;
      }
      const prior = readCheckpoint({ checkpointsDir, filePath, sessionId })?.offset ?? 0;
      const { lines, nextOffset } = readNewBytes({
        filePath,
        maxBytes: Math.min(MAX_TRANSCRIPT_BYTES_PER_FILE, budget),
        offset: prior
      });
      budget -= nextOffset >= prior ? nextOffset - prior : nextOffset;
      if (nextOffset !== prior) {
        pending.push({ filePath, offset: nextOffset });
      }
      records.push(
        ...parseTranscriptLines({
          fallbackSessionId: sessionId,
          lines,
          seen
        })
      );
    }
    let advanced = true;
    if (records.length > 0) {
      const result = await persistTokenUsage({
        authToken,
        fetchImpl,
        graphqlUrl,
        jsonlPath,
        records,
        repoRoot,
        timeoutMs
      });
      advanced = accountedFor(result, records.length);
    }
    if (advanced) {
      for (const { filePath, offset } of pending) {
        writeCheckpoint({ checkpointsDir, filePath, offset, sessionId });
      }
    }
    sweepStaleCheckpoints({ checkpointsDir, currentSessionId: sessionId });
    return {
      advanced: advanced && pending.length > 0,
      filesRead: pending.length,
      records: records.length
    };
  } catch (err) {
    logHookError("captureTranscriptUsage failed", err);
    return idle;
  }
};

// packages/agentic-hooks/src/adapters/claude/complete.ts
var main = async () => {
  try {
    const repoRoot = process.env.CLAUDE_PROJECT_DIR || process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd();
    if (isShadowedByRepoHooks({ repoRoot })) {
      return;
    }
    const stdinBuf = import_node_fs14.default.readFileSync(0, "utf8");
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
      await sweepAbandonedStarts({ repoRoot, source: CLAUDE_SOURCE }).catch(
        () => {
        }
      );
      return;
    }
    await completeOpenStartsForSession({
      repoRoot,
      sessionId: normalized.session_id,
      source: CLAUDE_SOURCE
    });
    await sweepAbandonedStarts({
      currentSessionId: normalized.session_id,
      repoRoot,
      source: CLAUDE_SOURCE
    });
    await captureTranscriptUsage({
      agentTranscriptPath: normalized.agent_transcript_path,
      repoRoot,
      sessionId: normalized.session_id,
      transcriptPath: normalized.transcript_path
    });
    await captureSessionTrajectories({
      repoRoot,
      sessionId: normalized.session_id,
      transcriptPath: normalized.transcript_path
    });
    await sweepTrajectoryUploadState();
    await drainBufferedUsage({ budgetMs: 500, repoRoot });
    await drainBufferedTrajectories({ budgetMs: 500, repoRoot });
  } catch (err) {
    logHookError("complete failed", err);
  }
};
main().finally(() => {
  process.exit(0);
});
