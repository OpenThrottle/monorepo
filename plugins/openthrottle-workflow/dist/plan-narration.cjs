#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/plan-narration.ts
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

// packages/agentic-hooks/src/adapters/claude/plan-narration.ts
var import_node_fs5 = __toESM(require("node:fs"), 1);

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
var sanitizeSessionId = (sessionId) => {
  return String(sessionId).replace(/[^A-Za-z0-9._-]/g, "-");
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

// packages/agentic-hooks/src/data/findPlanRunBinding.ts
var REGISTER_RUN_SUFFIX = "__register_plan_run";
var SETTLE_RUN_SUFFIX = "__settle_plan_run";
var UPDATE_TASK_SUFFIX = "__update_task";
var IN_PROGRESS = "IN_PROGRESS";
var nonEmptyString = (value) => {
  return typeof value === "string" && value !== "" ? value : null;
};
var applyTaskUpdate = (run, input) => {
  const rawStatus = nonEmptyString(input.status);
  if (rawStatus === null) return;
  const status = rawStatus.toUpperCase();
  run.latestStatus = status;
  const id = nonEmptyString(input.id);
  if (id === null) return;
  run.statusByTaskId.delete(id);
  run.statusByTaskId.set(id, status);
  if (status === IN_PROGRESS) {
    run.currentTaskId = id;
  } else if (id === run.currentTaskId) {
    run.currentTaskId = null;
  }
};
var toState = (run, events, adapter) => {
  const inProgressTaskIds = [...run.statusByTaskId].filter(([, status]) => status === IN_PROGRESS).map(([id]) => id);
  return {
    branch: run.branch,
    currentTaskId: run.currentTaskId,
    inProgressTaskIds,
    lastStatusByTaskId: new Map(run.statusByTaskId),
    latestStatus: run.latestStatus,
    planId: run.planId,
    planRunId: adapter.planRunIdOf(events.slice(run.registerEventIndex)),
    registerEventIndex: run.registerEventIndex
  };
};
var findPlanRunBinding = (events, adapter) => {
  let run = null;
  let isSettled = false;
  for (const [eventIndex, event] of events.entries()) {
    for (const use of adapter.toolUsesOf(event)) {
      if (use.name.endsWith(REGISTER_RUN_SUFFIX)) {
        run = {
          branch: nonEmptyString(use.input.branch),
          currentTaskId: null,
          latestStatus: null,
          planId: nonEmptyString(use.input.planId),
          registerEventIndex: eventIndex,
          statusByTaskId: /* @__PURE__ */ new Map()
        };
        isSettled = false;
      } else if (use.name.endsWith(SETTLE_RUN_SUFFIX)) {
        isSettled = run !== null;
      } else if (use.name.endsWith(UPDATE_TASK_SUFFIX)) {
        if (run !== null && !isSettled) applyTaskUpdate(run, use.input);
      }
    }
  }
  if (run === null) return { kind: "none" };
  const state = toState(run, events, adapter);
  return isSettled ? { ...state, kind: "settled" } : { ...state, kind: "active" };
};

// packages/agentic-hooks/src/data/plan-narration.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
var PLAN_NARRATION_LABEL = "[hook:narration]";
var CHUNK_KIND = "loop";
var APPEND_OUTPUT_SUFFIX = "__append_plan_output";
var UPDATE_TASK_SUFFIX2 = "__update_task";
var IN_PROGRESS2 = "IN_PROGRESS";
var NARRATED_STATUSES = /* @__PURE__ */ new Set([
  "BLOCKED",
  "COMPLETED",
  IN_PROGRESS2,
  "SKIPPED"
]);
var STATE_DIR_BASENAME = "plan-narration";
var APPEND_MUTATION = `
mutation AppendPlanOutputFromHook($input: AppendPlanOutputInput!) {
  appendPlanOutput(input: $input) { id }
}
`;
var nonEmptyString2 = (value) => {
  return typeof value === "string" && value !== "" ? value : null;
};
var newHistory = () => {
  return {
    inProgressAtMs: null,
    lastNarrationIndex: -1,
    lastTransitionIndex: -1,
    statuses: []
  };
};
var readTaskHistories = (events, adapter, fromIndex, skipToolUseId) => {
  const histories = /* @__PURE__ */ new Map();
  const historyOf = (taskId) => {
    const found = histories.get(taskId);
    if (found !== void 0) return found;
    const created = newHistory();
    histories.set(taskId, created);
    return created;
  };
  for (const [eventIndex, event] of events.entries()) {
    if (eventIndex < fromIndex) continue;
    for (const use of adapter.toolUsesOf(event)) {
      if (skipToolUseId !== null && use.id === skipToolUseId) continue;
      if (use.name.endsWith(APPEND_OUTPUT_SUFFIX)) {
        const taskId = nonEmptyString2(use.input.taskId);
        if (taskId !== null) historyOf(taskId).lastNarrationIndex = eventIndex;
      } else if (use.name.endsWith(UPDATE_TASK_SUFFIX2)) {
        const taskId = nonEmptyString2(use.input.id);
        const status = nonEmptyString2(use.input.status)?.toUpperCase() ?? null;
        if (taskId === null || status === null) continue;
        const history = historyOf(taskId);
        history.lastTransitionIndex = eventIndex;
        history.statuses.push(status);
        if (status === IN_PROGRESS2) {
          history.inProgressAtMs = adapter.timestampMsOf(event);
        }
      }
    }
  }
  return histories;
};
var formatElapsed = (ms) => {
  const totalSeconds = Math.max(0, Math.round(ms / 1e3));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};
var elapsedSuffixOf = (status, startedAtMs, nowMs) => {
  if (status === IN_PROGRESS2 || startedAtMs === null) return "";
  return ` after ${formatElapsed(nowMs - startedAtMs)}`;
};
var runKeyOf = (planId, planRunId) => {
  return planRunId ?? planId;
};
var describeTask = (taskId, title) => {
  return title === null ? `Task ${taskId}` : `Task "${title}" (${taskId})`;
};
var suffixOf = (branch, planRunId) => {
  const parts = [
    branch === null ? null : `branch ${branch}`,
    planRunId === null ? null : `run ${planRunId}`
  ].filter((part) => part !== null);
  return parts.length === 0 ? "" : ` · ${parts.join(" · ")}`;
};
var decideTransitionNarration = ({
  adapter,
  events,
  nowMs,
  status,
  taskId,
  taskTitle,
  toolUseId
}) => {
  const upperStatus = nonEmptyString2(status)?.toUpperCase() ?? null;
  if (taskId === null || upperStatus === null) return null;
  if (!NARRATED_STATUSES.has(upperStatus)) return null;
  const binding = findPlanRunBinding(events, adapter);
  if (binding.kind !== "active" || binding.planId === null) return null;
  const history = readTaskHistories(
    events,
    adapter,
    binding.registerEventIndex,
    toolUseId
  ).get(taskId);
  if (history !== void 0 && history.lastNarrationIndex > history.lastTransitionIndex) {
    return null;
  }
  const elapsed = elapsedSuffixOf(
    upperStatus,
    history?.inProgressAtMs ?? null,
    nowMs
  );
  const task = describeTask(taskId, taskTitle);
  const suffix = suffixOf(binding.branch, binding.planRunId);
  return {
    content: `${PLAN_NARRATION_LABEL} ${task} → ${upperStatus}${elapsed}${suffix}`,
    key: `${runKeyOf(binding.planId, binding.planRunId)}:${taskId}:${upperStatus}`,
    planId: binding.planId,
    taskId
  };
};
var decideStopNarration = ({
  adapter,
  events,
  narratedKeys
}) => {
  const binding = findPlanRunBinding(events, adapter);
  if (binding.kind !== "active" || binding.planId === null) return [];
  const { branch, planId, planRunId } = binding;
  const runKey = runKeyOf(planId, planRunId);
  const narrated = [...narratedKeys];
  const histories = readTaskHistories(
    events,
    adapter,
    binding.registerEventIndex,
    null
  );
  return [...histories].flatMap(([taskId, history]) => {
    const current = history.statuses.at(-1);
    if (current === void 0 || history.lastNarrationIndex >= 0) return [];
    const prefix = `${runKey}:${taskId}:`;
    if (narrated.some((key) => key.startsWith(prefix))) return [];
    const moves = history.statuses.join(" → ");
    return [
      {
        content: `${PLAN_NARRATION_LABEL} Turn summary for task ${taskId}: moved ${moves} with no narration written; now ${current}${suffixOf(branch, planRunId)}`,
        key: `${prefix}SUMMARY`,
        planId,
        taskId
      }
    ];
  });
};
var defaultNarrationStateDir = () => {
  return import_node_path3.default.join(resolveTelemetryDir(), STATE_DIR_BASENAME);
};
var stateFileOf = (stateDir, sessionId) => {
  return import_node_path3.default.join(stateDir, `${sanitizeSessionId(sessionId)}.json`);
};
var readNarratedKeys = (stateDir, sessionId) => {
  try {
    const parsed = JSON.parse(
      import_node_fs2.default.readFileSync(stateFileOf(stateDir, sessionId), "utf8")
    );
    if (!isRecord(parsed) || !Array.isArray(parsed.keys)) return /* @__PURE__ */ new Set();
    return new Set(
      parsed.keys.filter((key) => typeof key === "string")
    );
  } catch {
    return /* @__PURE__ */ new Set();
  }
};
var recordNarratedKeys = (stateDir, sessionId, keys) => {
  if (keys.length === 0) return;
  try {
    const merged = /* @__PURE__ */ new Set([...readNarratedKeys(stateDir, sessionId), ...keys]);
    import_node_fs2.default.mkdirSync(stateDir, { recursive: true });
    import_node_fs2.default.writeFileSync(
      stateFileOf(stateDir, sessionId),
      JSON.stringify({ keys: [...merged] })
    );
  } catch (err) {
    logHookError("plan-narration: state write failed", err);
  }
};
var appendPlanNarration = async ({
  authToken,
  chunk,
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  timeoutMs
}) => {
  try {
    const posted = await postGraphqlMutation({
      authToken,
      fetchImpl,
      field: "appendPlanOutput",
      graphqlUrl,
      query: APPEND_MUTATION,
      timeoutMs,
      variables: {
        input: {
          content: chunk.content,
          kind: CHUNK_KIND,
          planId: chunk.planId,
          taskId: chunk.taskId
        }
      }
    });
    if (!posted.ok) {
      logHookError("plan-narration: append failed", posted.reason);
    }
    return posted.ok;
  } catch (err) {
    logHookError("plan-narration: append threw", err);
    return false;
  }
};
var postPlanNarration = async ({
  append,
  chunks,
  sessionId,
  stateDir
}) => {
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      return await append(chunk) ? chunk.key : null;
    })
  );
  const stored = results.filter((key) => key !== null);
  recordNarratedKeys(stateDir, sessionId, stored);
  return stored;
};

// packages/agentic-hooks/src/data/read-new.ts
var import_node_fs3 = __toESM(require("node:fs"), 1);
var NEWLINE = 10;
var readNewBytes = ({
  filePath,
  maxBytes,
  offset
}) => {
  const unchanged = { lines: [], nextOffset: offset };
  let fd = null;
  try {
    fd = import_node_fs3.default.openSync(filePath, "r");
    const { size } = import_node_fs3.default.fstatSync(fd);
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
      const bytesRead = import_node_fs3.default.readSync(fd, buffer, 0, window, start);
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
        import_node_fs3.default.closeSync(fd);
      } catch {
      }
    }
  }
};

// packages/openthrottle-agentic-utils/src/utils/trajectory/claude-session.ts
var REGISTER_RUN_TOOL = "__register_plan_run";
var SUBAGENT_TRANSPORT_BYTES = 160 * 1024;
var stringOf = (value) => {
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
    const id = stringOf(block.id);
    const name = stringOf(block.name);
    const input = isRecord(block.input) ? block.input : {};
    return id === void 0 || name === void 0 ? [] : [{ id, input, name }];
  });
};
var toolResultText = (content) => {
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
    const toolUseId = stringOf(block.tool_use_id);
    const text = toolResultText(block.content);
    const isUsable = toolUseId !== void 0 && typeof text === "string";
    return isUsable ? [{ content: text, toolUseId }] : [];
  });
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
    return stringOf(run.id);
  } catch {
    return void 0;
  }
}
var claudeSessionToolUsesOf = (event) => {
  return isMainLine(event) ? toolUsesOf(event) : [];
};

// packages/agentic-hooks/src/adapters/claude/plan-run-binding.ts
var claudePlanRunTranscript = {
  planRunIdOf: (events) => {
    return findClaudeSessionPlanRunId(events) ?? null;
  },
  timestampMsOf: (event) => {
    if (!isRecord(event) || typeof event.timestamp !== "string") return null;
    const ms = Date.parse(event.timestamp);
    return Number.isNaN(ms) ? null : ms;
  },
  toolUsesOf: claudeSessionToolUsesOf
};

// packages/agentic-hooks/src/adapters/claude/plan-run-task-guard-output.ts
var import_node_fs4 = __toESM(require("node:fs"), 1);
var PLAN_RUN_GUARD_MAX_TAIL_BYTES = 6 * 1024 * 1024;
var parseTranscriptLines = (lines) => {
  return lines.flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
};
var readTranscriptTail = (transcriptPath, maxBytes = PLAN_RUN_GUARD_MAX_TAIL_BYTES) => {
  try {
    const { size } = import_node_fs4.default.statSync(transcriptPath);
    const { lines } = readNewBytes({
      filePath: transcriptPath,
      maxBytes: maxBytes + 1024,
      offset: Math.max(0, size - maxBytes)
    });
    return parseTranscriptLines(lines);
  } catch (err) {
    logHookError("plan-run-task-guard: transcript read failed", err);
    return [];
  }
};

// packages/agentic-hooks/src/adapters/claude/plan-narration-output.ts
var UPDATE_TASK_SUFFIX3 = "__update_task";
var nonEmptyString3 = (value) => {
  return typeof value === "string" && value !== "" ? value : null;
};
var titleOfTaskResult = (value) => {
  if (!isRecord(value) || !isRecord(value.task)) return null;
  return nonEmptyString3(value.task.title);
};
var parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
var contentBlocksOf = (response) => {
  if (Array.isArray(response)) return response;
  if (isRecord(response) && Array.isArray(response.content)) {
    return response.content;
  }
  return [];
};
var readTaskTitleFromResponse = (response) => {
  if (typeof response === "string") {
    return titleOfTaskResult(parseJson(response));
  }
  const direct = titleOfTaskResult(response);
  if (direct !== null) return direct;
  for (const block of contentBlocksOf(response)) {
    if (isRecord(block) && typeof block.text === "string") {
      const title = titleOfTaskResult(parseJson(block.text));
      if (title !== null) return title;
    }
  }
  return null;
};
var chunksFor = (raw, events, deps, stateDir, sessionId) => {
  if (raw.hook_event_name === "Stop") {
    return decideStopNarration({
      adapter: claudePlanRunTranscript,
      events,
      narratedKeys: readNarratedKeys(stateDir, sessionId)
    });
  }
  const toolName = nonEmptyString3(raw.tool_name);
  if (toolName === null || !toolName.endsWith(UPDATE_TASK_SUFFIX3)) return [];
  if (!isRecord(raw.tool_input)) return [];
  const chunk = decideTransitionNarration({
    adapter: claudePlanRunTranscript,
    events,
    nowMs: deps.nowMs(),
    status: raw.tool_input.status,
    taskId: nonEmptyString3(raw.tool_input.id),
    taskTitle: readTaskTitleFromResponse(raw.tool_response),
    toolUseId: nonEmptyString3(raw.tool_use_id)
  });
  return chunk === null ? [] : [chunk];
};
var runClaudePlanNarration = async (raw, deps) => {
  try {
    if (!isRecord(raw)) return [];
    const sessionId = nonEmptyString3(raw.session_id);
    const transcriptPath = nonEmptyString3(raw.transcript_path);
    if (sessionId === null || transcriptPath === null) return [];
    const readEvents = deps.readEvents ?? readTranscriptTail;
    const stateDir = deps.stateDir ?? defaultNarrationStateDir();
    const events = readEvents(transcriptPath);
    const chunks = chunksFor(raw, events, deps, stateDir, sessionId);
    if (chunks.length === 0) return [];
    return await postPlanNarration({
      append: deps.append,
      chunks,
      sessionId,
      stateDir
    });
  } catch (err) {
    logHookError("plan-narration: decision failed", err);
    return [];
  }
};

// packages/agentic-hooks/src/adapters/claude/plan-narration.ts
var APPEND_TIMEOUT_MS = 2e3;
var main = async () => {
  try {
    const stdinBuf = import_node_fs5.default.readFileSync(0, "utf8");
    if (!stdinBuf || !stdinBuf.trim()) return;
    let raw;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError("plan-narration: invalid JSON stdin", err);
      return;
    }
    const repoRoot = process.env.CLAUDE_PROJECT_DIR || process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd();
    await runClaudePlanNarration(raw, {
      append: (chunk) => appendPlanNarration({
        authToken: resolveAuthToken(repoRoot),
        chunk,
        graphqlUrl: resolveGraphqlUrl(repoRoot),
        timeoutMs: APPEND_TIMEOUT_MS
      }),
      nowMs: () => Date.now()
    });
  } catch (err) {
    logHookError("plan-narration failed", err);
  }
};
main().finally(() => {
  process.exit(0);
});
