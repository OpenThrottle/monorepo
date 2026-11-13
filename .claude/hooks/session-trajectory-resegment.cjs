#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/resegment.ts
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
var postGraphqlField = async (args) => {
  return postMutation(args);
};

// packages/agentic-hooks/src/data/readNewBytes.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);
var NEWLINE = 10;
var readNewBytes = ({
  filePath,
  maxBytes,
  offset
}) => {
  const unchanged = { lines: [], nextOffset: offset };
  let fd = null;
  try {
    fd = import_node_fs2.default.openSync(filePath, "r");
    const { size } = import_node_fs2.default.fstatSync(fd);
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
      const bytesRead = import_node_fs2.default.readSync(fd, buffer, 0, window, start);
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
        import_node_fs2.default.closeSync(fd);
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
var REPLACE_AGENT_TRAJECTORY_MUTATION = `
mutation ReplaceAgentTrajectoryFromHook(
  $id: ID!
  $input: ReplaceAgentTrajectoryInput!
) {
  replaceAgentTrajectory(id: $id, input: $input) {
    id
  }
}
`;
var TRAJECTORIES_BY_PLAN_RUN_QUERY = `
query AgentTrajectoriesByPlanRunFromHook($planRunId: ID!) {
  agentTrajectoriesByPlanRun(planRunId: $planRunId) {
    id
    idempotencyKey
    source
    taskId
    trajectoryJson
  }
}
`;
var TRAJECTORIES_BY_TASK_QUERY = `
query AgentTrajectoriesByTaskFromHook($taskId: ID!) {
  agentTrajectoriesByTask(taskId: $taskId) {
    id
    idempotencyKey
    source
    taskId
    trajectoryJson
  }
}
`;
var stepCountOf = (trajectoryJson) => {
  try {
    const parsed = JSON.parse(trajectoryJson);
    if (!isRecord(parsed) || !Array.isArray(parsed.steps)) {
      return 0;
    }
    return parsed.steps.length;
  } catch {
    return 0;
  }
};
var readStoredRow = (value) => {
  if (!isRecord(value) || typeof value.id !== "string" || value.id === "") {
    return void 0;
  }
  const trajectoryJson = typeof value.trajectoryJson === "string" ? value.trajectoryJson : "{}";
  return {
    id: value.id,
    idempotencyKey: typeof value.idempotencyKey === "string" ? value.idempotencyKey : null,
    source: typeof value.source === "string" ? value.source : "",
    stepCount: stepCountOf(trajectoryJson),
    taskId: typeof value.taskId === "string" ? value.taskId : null,
    trajectoryJson
  };
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
var replaceTrajectory = async ({
  authToken = "",
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  id,
  input,
  timeoutMs = DEFAULT_TRAJECTORY_POST_TIMEOUT_MS
}) => {
  return postGraphqlMutation({
    authToken,
    fetchImpl,
    field: "replaceAgentTrajectory",
    graphqlUrl,
    query: REPLACE_AGENT_TRAJECTORY_MUTATION,
    timeoutMs,
    variables: {
      id,
      input: {
        durationMs: input.durationMs,
        exitCode: input.exitCode,
        idempotencyKey: input.idempotencyKey,
        model: input.model,
        outcome: input.outcome,
        planRunId: input.planRunId,
        trajectoryJson: input.trajectoryJson
      }
    }
  });
};
var readTrajectoryList = (posted, field) => {
  if (!posted.ok) {
    return posted;
  }
  if (!Array.isArray(posted.data)) {
    return { ok: false, permanent: false, reason: `missing ${field}` };
  }
  return {
    ok: true,
    rows: posted.data.flatMap((entry) => {
      const row = readStoredRow(entry);
      return row === void 0 ? [] : [row];
    })
  };
};
var fetchTrajectoriesByPlanRun = async ({
  authToken = "",
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  planRunId,
  timeoutMs = DEFAULT_TRAJECTORY_POST_TIMEOUT_MS
}) => {
  return readTrajectoryList(
    await postGraphqlField({
      authToken,
      fetchImpl,
      field: "agentTrajectoriesByPlanRun",
      graphqlUrl,
      query: TRAJECTORIES_BY_PLAN_RUN_QUERY,
      timeoutMs,
      variables: { planRunId }
    }),
    "agentTrajectoriesByPlanRun"
  );
};
var fetchTrajectoriesByTask = async ({
  authToken = "",
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  taskId,
  timeoutMs = DEFAULT_TRAJECTORY_POST_TIMEOUT_MS
}) => {
  return readTrajectoryList(
    await postGraphqlField({
      authToken,
      fetchImpl,
      field: "agentTrajectoriesByTask",
      graphqlUrl,
      query: TRAJECTORIES_BY_TASK_QUERY,
      timeoutMs,
      variables: { taskId }
    }),
    "agentTrajectoriesByTask"
  );
};

// packages/agentic-hooks/src/adapters/claude/resegment-args.ts
var import_node_path3 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/adapters/claude/transcript-projects.ts
var import_node_os2 = __toESM(require("node:os"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);
var defaultClaudeProjectsDir = () => {
  return import_node_path2.default.join(import_node_os2.default.homedir(), ".claude", "projects");
};

// packages/agentic-hooks/src/adapters/claude/resegment-args.ts
var RESEGMENT_USAGE = `node .claude/hooks/session-trajectory-resegment.cjs --session <id> [--session <id> ...] [--dry-run] [--projects-dir <path>] [--repo-root <path>] [--timeout-ms <n>]`;
var DEFAULT_TIMEOUT_MS = 15e3;
var VALUE_FLAGS = /* @__PURE__ */ new Set([
  "--projects-dir",
  "--repo-root",
  "--session",
  "--timeout-ms"
]);
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set(["--dry-run", "--help"]);
var parseResegmentArgs = ({
  argv,
  cwd,
  env
}) => {
  const flags = /* @__PURE__ */ new Map();
  const switches = /* @__PURE__ */ new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index] ?? "";
    const [name = "", inline] = token.startsWith("--") ? token.split(/=(.*)/s, 2) : [token];
    if (BOOLEAN_FLAGS.has(name) && inline === void 0) {
      switches.add(name);
    } else if (VALUE_FLAGS.has(name)) {
      const value = inline ?? argv[index + 1];
      if (value === void 0 || value === "" || value.startsWith("--")) {
        return { error: `${name} needs a value`, kind: "error" };
      }
      const existing = flags.get(name) ?? [];
      flags.set(name, [...existing, value]);
      if (inline === void 0) {
        index += 1;
      }
    } else {
      return { error: `unknown argument: ${token}`, kind: "error" };
    }
  }
  if (switches.has("--help")) {
    return { kind: "help" };
  }
  const sessionIds = flags.get("--session") ?? [];
  if (sessionIds.length === 0) {
    return { error: "--session is required at least once", kind: "error" };
  }
  const timeoutRaw = flags.get("--timeout-ms")?.[0];
  const timeoutMs = timeoutRaw === void 0 ? DEFAULT_TIMEOUT_MS : Number(timeoutRaw);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    return {
      error: `--timeout-ms must be a positive integer: ${timeoutRaw}`,
      kind: "error"
    };
  }
  const projectsDirValues = flags.get("--projects-dir");
  const repoRootValues = flags.get("--repo-root");
  return {
    kind: "options",
    options: {
      dryRun: switches.has("--dry-run"),
      projectsDir: import_node_path3.default.resolve(
        projectsDirValues?.[0] ?? defaultClaudeProjectsDir()
      ),
      repoRoot: import_node_path3.default.resolve(
        repoRootValues?.[0] ?? env.CLAUDE_PROJECT_DIR ?? env.OPEN_THROTTLE_REPO_ROOT ?? cwd
      ),
      sessionIds,
      timeoutMs
    }
  };
};

// packages/agentic-hooks/src/adapters/claude/resegment-report.ts
var taskLabel = (taskId) => {
  return taskId === null ? "plan-level" : `task ${taskId}`;
};
var formatResegmentPlan = ({
  dryRun,
  plan
}) => {
  const lines = [
    dryRun ? `session-trajectory-resegment: DRY RUN for ${plan.sessionId}, nothing will be written` : `session-trajectory-resegment: about to write for ${plan.sessionId}`,
    `transcript: ${plan.transcriptPath}`,
    `open (skipped) segments: ${plan.openSegments}; actions: ${plan.actions.length}`
  ];
  for (const action of plan.actions) {
    if (action.action === "insert") {
      lines.push(
        `  INSERT  ${taskLabel(action.taskId)}  steps ${action.newStepCount}`
      );
      continue;
    }
    if (action.action === "skip") {
      lines.push(
        `  SKIP    ${taskLabel(action.taskId)}  id ${action.id}  steps ${action.oldStepCount} -> ${action.newStepCount}`
      );
      continue;
    }
    lines.push(
      `  UPDATE  ${taskLabel(action.taskId)}  id ${action.id}  steps ${action.oldStepCount} -> ${action.newStepCount}`
    );
  }
  return `${lines.join("\n")}
`;
};
var formatResegmentResult = (result) => {
  return `${[
    `replaced ${result.replaced}, inserted ${result.inserted}, skipped (identical) ${result.skipped}, failed ${result.failed}`
  ].join("\n")}
`;
};

// packages/agentic-hooks/src/adapters/claude/resegment-session.ts
var import_node_fs3 = __toESM(require("node:fs"), 1);
var import_node_path4 = __toESM(require("node:path"), 1);

// packages/openthrottle-drivers/src/registry/index.ts
var DRIVERS = {
  antigravity: "antigravity",
  claude: "claude",
  codex: "codex",
  cursor: "cursor",
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

// packages/openthrottle-agentic-utils/src/utils/conversation-backend/antigravity/events.ts
var TERMINAL_STEP_STATES = /* @__PURE__ */ new Set(["DONE", "ERROR"]);
var asString2 = (value) => {
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
    const stepType = asString2(payload.step_type);
    const state = asString2(payload.state) ?? "";
    if (stepType === "user_input") {
      return [];
    }
    if (stepType === "agent_response") {
      const delta = asString2(payload.text_delta);
      if (delta === void 0 || delta === "") {
        return [];
      }
      return [
        { delta, done: false, kind: CONVERSATION_STREAM_CHUNK_KINDS.text }
      ];
    }
    if (stepType === "tool") {
      const stepIndex = typeof payload.step_index === "number" ? payload.step_index : -1;
      const toolName = asString2(payload.tool_name);
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
    const name = asString2(event.event);
    const payload = isRecord(event[name ?? ""]) ? event[name ?? ""] : void 0;
    if (name === "init") {
      const init = isRecord(payload) ? payload : {};
      model = asString2(init.model) ?? model;
      const conversationId = asString2(event.conversation_id);
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
      const failed = asString2(payload.status) !== "SUCCESS";
      const errorMessage = asString2(payload.error);
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
var asString3 = (value) => {
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
    metadata: { sessionId: asString3(event.session_id) ?? null }
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
        delta: asString3(delta.text) ?? "",
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text
      };
    }
    if (delta.type === "thinking_delta") {
      return {
        delta: asString3(delta.thinking) ?? "",
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
          callId: asString3(block.id) ?? null,
          index: inner.index ?? null,
          name: asString3(block.name) ?? null,
          toolName: asString3(block.name) ?? null
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
      callId: asString3(block.id) ?? null,
      name: asString3(block.name) ?? null,
      toolCall: block.input ?? null,
      toolName: asString3(block.name) ?? null
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
    return part.type === "text" ? asString3(part.text) ?? "" : `[${asString3(part.type) ?? "content"}]`;
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
      callId: asString3(block.tool_use_id) ?? null,
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
    error: isError ? asString3(event.result) ?? "claude reported an error" : null,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
    metadata: {
      apiErrorStatus: event.api_error_status ?? null,
      modelUsage: event.modelUsage ?? null,
      result: asString3(event.result) ?? null,
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
var asString4 = (value) => {
  const isString = typeof value === "string";
  return isString ? value : void 0;
};
var itemType = (item) => {
  return asString4(item.item_type) ?? asString4(item.type);
};
function mapItemCompleted(event) {
  const item = event.item;
  if (!isRecord(item)) {
    return null;
  }
  const kind = itemType(item);
  if (kind === "agent_message") {
    return {
      delta: asString4(item.text) ?? "",
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.text
    };
  }
  if (kind === "reasoning") {
    return {
      delta: asString4(item.text) ?? "",
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
        metadata: { sessionId: asString4(event.thread_id) ?? null }
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
        error: asString4(error?.message) ?? "codex reported a failed turn",
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text
      };
    }
    case "error":
      return {
        delta: "",
        done: true,
        error: asString4(event.message) ?? "codex reported an error",
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text
      };
    default:
      return null;
  }
}

// packages/openthrottle-agentic-utils/src/utils/conversation-backend/grok/events.ts
var asString5 = (value) => {
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
          delta: asString5(event.data) ?? "",
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.thinking
        }
      ];
    case "text":
      return [
        {
          delta: asString5(event.data) ?? "",
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.text
        }
      ];
    case "end": {
      const chunks = [];
      const sessionId = asString5(event.sessionId);
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
          stopReason: asString5(event.stopReason) ?? null,
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
          error: asString5(event.message) ?? "grok reported an error",
          kind: CONVERSATION_STREAM_CHUNK_KINDS.text
        }
      ];
    default:
      return [];
  }
}

// packages/openthrottle-agentic-utils/src/utils/conversation-backend/opencode/events.ts
var asString6 = (value) => {
  const isString = typeof value === "string";
  return isString ? value : void 0;
};
function mapText(part, emittedLen) {
  const id = asString6(part.id);
  const full = asString6(part.text);
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
  const status = asString6(state?.status);
  const callId = asString6(part.callID) ?? null;
  const toolName = asString6(part.tool) ?? null;
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
    const errorText = isError ? asString6(state?.error) ?? "tool error" : null;
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
      const sessionId = asString6(event.sessionID);
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

// packages/openthrottle-agentic-utils/src/utils/trajectory/normalizeUsage.ts
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

// packages/openthrottle-agentic-utils/src/utils/trajectory/redactSecrets.ts
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

// packages/agentic-hooks/src/adapters/claude/resegment-session.ts
var MAX_RESEGMENT_TRANSCRIPT_BYTES = 64 * 1024 * 1024;
var MAX_RESEGMENT_SUBAGENT_BYTES = 4 * 1024 * 1024;
var SAFE_AGENT_ID = /^[A-Za-z0-9_-]+$/;
var SESSION_TRAJECTORY_SOURCE = "session_upload";
var SESSION_TRAJECTORY_DRIVER = "claude";
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
  const subagentsDir = import_node_path4.default.join(
    import_node_path4.default.dirname(transcriptPath),
    sessionId,
    "subagents"
  );
  return agentIds.flatMap((agentId) => {
    if (!SAFE_AGENT_ID.test(agentId)) {
      return [];
    }
    const { lines } = readNewBytes({
      filePath: import_node_path4.default.join(subagentsDir, `agent-${agentId}.jsonl`),
      maxBytes: MAX_RESEGMENT_SUBAGENT_BYTES,
      offset: 0
    });
    return lines.length === 0 ? [] : [{ agentId, events: parseJsonLines(lines) }];
  });
};
var findSessionTranscriptPath = ({
  projectsDir,
  sessionId
}) => {
  if (!import_node_fs3.default.existsSync(projectsDir)) {
    return null;
  }
  const fileName = `${sessionId}.jsonl`;
  const matches = [];
  for (const entry of import_node_fs3.default.readdirSync(projectsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const candidate = import_node_path4.default.join(projectsDir, entry.name, fileName);
    if (import_node_fs3.default.existsSync(candidate)) {
      matches.push(candidate);
    }
  }
  matches.sort((left, right) => {
    return left.localeCompare(right);
  });
  return matches[0] ?? null;
};
var stepCountOfJson = (trajectoryJson) => {
  try {
    const parsed = JSON.parse(trajectoryJson);
    return isRecord(parsed) && Array.isArray(parsed.steps) ? parsed.steps.length : 0;
  } catch {
    return 0;
  }
};
var stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value).sort((left, right) => {
      return left.localeCompare(right);
    });
    return `{${keys.map((key) => {
      return `${JSON.stringify(key)}:${stableStringify(value[key])}`;
    }).join(",")}}`;
  }
  return JSON.stringify(value);
};
var sameTrajectoryJson = (left, right) => {
  try {
    return stableStringify(JSON.parse(left)) === stableStringify(JSON.parse(right));
  } catch {
    return left === right;
  }
};
var matchExisting = ({
  existing,
  idempotencyKey,
  taskId
}) => {
  if (taskId !== null) {
    const byTask = existing.find((row) => {
      return row.source === SESSION_TRAJECTORY_SOURCE && row.taskId === taskId;
    });
    if (byTask !== void 0) {
      return byTask;
    }
  }
  return existing.find((row) => {
    return row.source === SESSION_TRAJECTORY_SOURCE && row.idempotencyKey === idempotencyKey;
  });
};
var planSessionResegment = async ({
  authToken,
  fetchImpl,
  graphqlUrl,
  projectsDir,
  sessionId,
  timeoutMs
}) => {
  const transcriptPath = findSessionTranscriptPath({ projectsDir, sessionId });
  if (transcriptPath === null) {
    return {
      error: `no transcript for session ${sessionId} under ${projectsDir}`,
      kind: "error"
    };
  }
  const { lines } = readNewBytes({
    filePath: transcriptPath,
    maxBytes: MAX_RESEGMENT_TRANSCRIPT_BYTES,
    offset: 0
  });
  const events = parseJsonLines(lines);
  const agentVersion = firstVersionOf(events);
  const segments = findClaudeSessionTaskSegments(events);
  const closed = segments.filter((segment) => {
    return segment.closed;
  });
  const openSegments = segments.length - closed.length;
  const planRunIds = [
    ...new Set(
      closed.flatMap((segment) => {
        const runId = findClaudeSessionPlanRunId(events.slice(0, segment.startIndex)) ?? findClaudeSessionPlanRunId(events);
        return runId === void 0 ? [] : [runId];
      })
    )
  ];
  const taskIds = [
    ...new Set(
      closed.flatMap((segment) => {
        return segment.taskId === null ? [] : [segment.taskId];
      })
    )
  ];
  const existingById = /* @__PURE__ */ new Map();
  const mergeRows = (rows) => {
    for (const row of rows) {
      existingById.set(row.id, row);
    }
  };
  for (const planRunId of planRunIds) {
    const fetched = await fetchTrajectoriesByPlanRun({
      authToken,
      fetchImpl,
      graphqlUrl,
      planRunId,
      timeoutMs
    });
    if (!fetched.ok) {
      return {
        error: `failed to list trajectories for plan run ${planRunId}: ${fetched.reason}`,
        kind: "error"
      };
    }
    mergeRows(fetched.rows);
  }
  for (const taskId of taskIds) {
    const fetched = await fetchTrajectoriesByTask({
      authToken,
      fetchImpl,
      graphqlUrl,
      taskId,
      timeoutMs
    });
    if (!fetched.ok) {
      return {
        error: `failed to list trajectories for task ${taskId}: ${fetched.reason}`,
        kind: "error"
      };
    }
    mergeRows(fetched.rows);
  }
  const existingRows = [...existingById.values()];
  const claimedIds = /* @__PURE__ */ new Set();
  const actions = [];
  for (const segment of closed) {
    const segmentRunId = findClaudeSessionPlanRunId(events.slice(0, segment.startIndex)) ?? findClaudeSessionPlanRunId(events);
    if (segmentRunId === void 0) {
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
      continue;
    }
    const idempotencyKey = `session:${sessionId}:${segment.toolUseId}`;
    const input = {
      driver: SESSION_TRAJECTORY_DRIVER,
      durationMs: built.durationMs,
      exitCode: null,
      idempotencyKey,
      model: built.model ?? null,
      outcome: built.outcome,
      planRunId: segmentRunId,
      source: SESSION_TRAJECTORY_SOURCE,
      taskId: segment.taskId,
      trajectoryJson: built.trajectoryJson
    };
    const newStepCount = stepCountOfJson(built.trajectoryJson);
    const available = existingRows.filter((row) => {
      return !claimedIds.has(row.id);
    });
    const matched = matchExisting({
      existing: available,
      idempotencyKey,
      taskId: segment.taskId
    });
    if (matched === void 0) {
      actions.push({
        action: "insert",
        input,
        newStepCount,
        taskId: segment.taskId
      });
      continue;
    }
    claimedIds.add(matched.id);
    if (sameTrajectoryJson(matched.trajectoryJson, built.trajectoryJson)) {
      actions.push({
        action: "skip",
        id: matched.id,
        newStepCount,
        oldStepCount: matched.stepCount,
        taskId: segment.taskId
      });
      continue;
    }
    actions.push({
      action: "update",
      id: matched.id,
      input,
      newStepCount,
      oldStepCount: matched.stepCount,
      taskId: segment.taskId
    });
  }
  return {
    kind: "plan",
    plan: {
      actions,
      openSegments,
      sessionId,
      transcriptPath
    }
  };
};
var applySessionResegment = async ({
  authToken,
  fetchImpl,
  graphqlUrl,
  plan,
  timeoutMs
}) => {
  let inserted = 0;
  let replaced = 0;
  let skipped = 0;
  let failed = 0;
  for (const action of plan.actions) {
    if (action.action === "skip") {
      skipped += 1;
      continue;
    }
    if (action.action === "insert") {
      const result2 = await postTrajectory({
        authToken,
        fetchImpl,
        graphqlUrl,
        input: action.input,
        timeoutMs
      });
      if (result2.ok) {
        inserted += 1;
      } else {
        failed += 1;
      }
      continue;
    }
    const result = await replaceTrajectory({
      authToken,
      fetchImpl,
      graphqlUrl,
      id: action.id,
      input: action.input,
      timeoutMs
    });
    if (result.ok) {
      replaced += 1;
    } else {
      failed += 1;
    }
  }
  return { failed, inserted, replaced, skipped };
};

// packages/agentic-hooks/src/adapters/claude/transcript-backfill.ts
var CHUNK_BYTES = 8 * 1024 * 1024;
var resolveBackfillEndpoint = ({
  authToken,
  graphqlUrl,
  repoRoot
}) => {
  if (process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === "1") {
    return null;
  }
  const url = graphqlUrl ?? resolveGraphqlUrl(repoRoot);
  if (!url) {
    return null;
  }
  return {
    authToken: authToken ?? resolveAuthToken(repoRoot),
    graphqlUrl: url
  };
};

// packages/agentic-hooks/src/adapters/claude/runResegment.ts
var pickEndpoint = (injected, repoRoot) => {
  if (injected === void 0) {
    return resolveBackfillEndpoint({ repoRoot });
  }
  return injected;
};
var runResegment = async ({
  endpoint,
  fetchImpl,
  options,
  stderr,
  stdout
}) => {
  const target = pickEndpoint(endpoint, options.repoRoot);
  if (target === null) {
    stderr(
      "no OpenThrottle endpoint (set OPENTHROTTLE_GRAPHQL_URL, and unset OPENTHROTTLE_TELEMETRY_OFFLINE); nothing was planned or written\n"
    );
    return 1;
  }
  let exitCode = 0;
  for (const sessionId of options.sessionIds) {
    const planned = await planSessionResegment({
      authToken: target.authToken,
      fetchImpl,
      graphqlUrl: target.graphqlUrl,
      projectsDir: options.projectsDir,
      sessionId,
      timeoutMs: options.timeoutMs
    });
    if (planned.kind === "error") {
      stderr(`${planned.error}
`);
      exitCode = 1;
      continue;
    }
    stdout(formatResegmentPlan({ dryRun: options.dryRun, plan: planned.plan }));
    if (options.dryRun) {
      continue;
    }
    const result = await applySessionResegment({
      authToken: target.authToken,
      fetchImpl,
      graphqlUrl: target.graphqlUrl,
      plan: planned.plan,
      timeoutMs: options.timeoutMs
    });
    stdout(formatResegmentResult(result));
    if (result.failed > 0) {
      exitCode = 1;
    }
  }
  return exitCode;
};

// packages/agentic-hooks/src/adapters/claude/resegment.ts
var main = async () => {
  const parsed = parseResegmentArgs({
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    env: process.env
  });
  if (parsed.kind === "help") {
    process.stdout.write(`${RESEGMENT_USAGE}
`);
    return 0;
  }
  if (parsed.kind === "error") {
    process.stderr.write(`${parsed.error}
${RESEGMENT_USAGE}
`);
    return 1;
  }
  return runResegment({
    options: parsed.options,
    stderr: (text) => {
      process.stderr.write(text);
    },
    stdout: (text) => {
      process.stdout.write(text);
    }
  });
};
main().then((code) => {
  process.exitCode = code;
}).catch((err) => {
  logHookError("resegment failed", err);
  process.exitCode = 1;
});
