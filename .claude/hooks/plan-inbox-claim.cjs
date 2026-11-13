#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/plan-inbox-claim.ts
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

// packages/agentic-hooks/src/adapters/claude/plan-inbox-claim.ts
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
var resolveTelemetryDir = () => {
  return process.env.OPENTHROTTLE_TELEMETRY_DIR?.trim() || import_node_path2.default.join(userConfigDir(), TELEMETRY_DIR_BASENAME);
};
var sanitizeSessionId = (sessionId) => {
  return String(sessionId).replace(/[^A-Za-z0-9._-]/g, "-");
};

// packages/nodejs-utils/src/utils/isRecord.ts
var isRecord = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

// packages/agentic-hooks/src/data/data.destructive-commands.ts
var AT_COMMAND = String.raw`(?:^|[;&|({\n]|\b(?:sudo|xargs|then|do|else))\s*`;
var GIT = String.raw`git\s+(?:-[cC]\s+\S+\s+)*`;
var ANY_ARGS = String.raw`[^;&|\n]*`;
var DESTRUCTIVE_COMMAND_PATTERNS = [
  new RegExp(`${AT_COMMAND}rm\\s`),
  new RegExp(`${AT_COMMAND}rmdir\\s`),
  new RegExp(`${AT_COMMAND}${GIT}rm\\s`),
  new RegExp(`${AT_COMMAND}${GIT}clean\\b`),
  new RegExp(`${AT_COMMAND}${GIT}reset\\b${ANY_ARGS}--hard\\b`),
  new RegExp(`${AT_COMMAND}${GIT}rebase\\b`),
  new RegExp(`${AT_COMMAND}${GIT}commit\\b${ANY_ARGS}--amend\\b`),
  new RegExp(`${AT_COMMAND}${GIT}push\\b`),
  new RegExp(`${AT_COMMAND}${GIT}branch\\s(?:${ANY_ARGS}\\s)?-D\\b`),
  new RegExp(
    `${AT_COMMAND}${GIT}branch\\s${ANY_ARGS}--delete\\b${ANY_ARGS}--force\\b`
  ),
  new RegExp(
    `${AT_COMMAND}${GIT}branch\\s${ANY_ARGS}--force\\b${ANY_ARGS}--delete\\b`
  ),
  new RegExp(`${AT_COMMAND}gh\\s+pr\\s+create\\b`),
  new RegExp(
    `${AT_COMMAND}(?:pnpm|npm|yarn)\\s+(?:run\\s+)?(?:\\S+\\s+)*?(?:worktree:remove|database:migrate)\\b`
  )
];

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

// packages/agentic-hooks/src/data/plan-inbox.ts
var CLAIM_MUTATION = `
mutation ClaimPlanMessagesFromHook($input: ClaimPlanMessagesInput!) {
  claimPlanMessages(input: $input) { messages { author body id kind } }
}
`;
var toMessage = (value) => {
  if (!isRecord(value)) return null;
  const { author, body, id, kind } = value;
  if (typeof author !== "string" || typeof body !== "string" || typeof id !== "string" || typeof kind !== "string") {
    return null;
  }
  return { author, body, id, kind };
};
var claimPlanInbox = async ({
  authToken,
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  target,
  timeoutMs
}) => {
  try {
    const input = { planId: target.planId };
    if (target.planRunId !== null) input.planRunId = target.planRunId;
    if (target.taskId !== null) input.taskId = target.taskId;
    const posted = await postGraphqlMutationNode({
      authToken,
      fetchImpl,
      field: "claimPlanMessages",
      graphqlUrl,
      query: CLAIM_MUTATION,
      timeoutMs,
      variables: { input }
    });
    if (!posted.ok) {
      logHookError("plan-inbox: claim failed", posted.reason);
      return null;
    }
    const { messages } = posted.node;
    if (!Array.isArray(messages)) return null;
    return messages.flatMap((message) => {
      const parsed = toMessage(message);
      return parsed === null ? [] : [parsed];
    });
  } catch (err) {
    logHookError("plan-inbox: claim threw", err);
    return null;
  }
};

// packages/agentic-hooks/src/data/read-new.ts
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

// packages/agentic-hooks/src/utils/claim-throttle.ts
var import_node_fs3 = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
var CLAIM_THROTTLE_WINDOW_MS = 2e4;
var CLAIM_STATE_DIR_BASENAME = "plan-inbox-claims";
var defaultClaimStateDir = () => {
  return import_node_path3.default.join(resolveTelemetryDir(), CLAIM_STATE_DIR_BASENAME);
};
var readLastClaimMs = (filePath) => {
  try {
    const parsed = JSON.parse(import_node_fs3.default.readFileSync(filePath, "utf8"));
    return isRecord(parsed) && typeof parsed.at === "number" ? parsed.at : null;
  } catch {
    return null;
  }
};
var tryTakeClaimSlot = ({
  nowMs,
  sessionId,
  stateDir,
  windowMs
}) => {
  const filePath = import_node_path3.default.join(stateDir, `${sanitizeSessionId(sessionId)}.json`);
  const last = readLastClaimMs(filePath);
  if (last !== null && nowMs - last < windowMs) return false;
  try {
    import_node_fs3.default.mkdirSync(stateDir, { recursive: true });
    import_node_fs3.default.writeFileSync(filePath, JSON.stringify({ at: nowMs }));
    return true;
  } catch {
    return false;
  }
};

// packages/agentic-hooks/src/utils/destructive-command.ts
var isDestructiveCommand = (command) => {
  return DESTRUCTIVE_COMMAND_PATTERNS.some((pattern) => pattern.test(command));
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

// packages/agentic-hooks/src/adapters/claude/plan-inbox-claim-output.ts
var DELEGATION_TOOL_NAMES = /* @__PURE__ */ new Set(["Agent", "Task"]);
var REGISTER_RUN_SUFFIX = "__register_plan_run";
var SETTLE_RUN_SUFFIX = "__settle_plan_run";
var UPDATE_TASK_SUFFIX = "__update_task";
var IN_PROGRESS = "IN_PROGRESS";
var STEER = "STEER";
var isInboxClaimTool = (raw) => {
  if (!isRecord(raw) || typeof raw.tool_name !== "string") return false;
  if (DELEGATION_TOOL_NAMES.has(raw.tool_name)) return true;
  if (raw.tool_name !== "Bash" || !isRecord(raw.tool_input)) return false;
  const { command } = raw.tool_input;
  return typeof command === "string" && isDestructiveCommand(command);
};
var readCandidate = (raw) => {
  if (!isRecord(raw) || !isInboxClaimTool(raw)) return null;
  const { session_id: sessionId, transcript_path: transcriptPath } = raw;
  if (typeof sessionId !== "string" || sessionId === "") return null;
  if (typeof transcriptPath !== "string" || transcriptPath === "") return null;
  return { sessionId, transcriptPath };
};
var findActivePlanRun = (events) => {
  let run = null;
  let taskId = null;
  for (const [eventIndex, event] of events.entries()) {
    for (const use of claudeSessionToolUsesOf(event)) {
      if (use.name.endsWith(REGISTER_RUN_SUFFIX)) {
        run = { eventIndex, planId: use.input.planId };
        taskId = null;
      } else if (use.name.endsWith(SETTLE_RUN_SUFFIX)) {
        run = null;
        taskId = null;
      } else if (use.name.endsWith(UPDATE_TASK_SUFFIX) && run !== null) {
        const { id, status } = use.input;
        if (typeof id !== "string" || id === "") continue;
        if (typeof status !== "string" || status === "") continue;
        if (status.toUpperCase() === IN_PROGRESS) {
          taskId = id;
        } else if (id === taskId) {
          taskId = null;
        }
      }
    }
  }
  if (run === null || typeof run.planId !== "string" || run.planId === "") {
    return null;
  }
  return {
    planId: run.planId,
    planRunId: findClaudeSessionPlanRunId(events.slice(run.eventIndex)) ?? null,
    taskId
  };
};
var formatListing = (messages) => {
  return messages.map((message) => {
    return `[inbox:${message.kind} from @${message.author}] (message ${message.id})
${message.body}`;
  }).join("\n\n");
};
var formatSteerDenial = (messages, taskId) => {
  const task = taskId === null ? "the in-flight task" : `task ${taskId}`;
  return [
    `A STEER arrived in the plan inbox for ${task} before this step:`,
    "",
    formatListing(messages),
    "",
    `Weigh it: pause, redirect, or abort the task to BLOCKED. Acknowledge it via append_plan_output${taskId === null ? "" : ` with taskId ${taskId}`}, then re-issue this call only if it still applies. These messages are already claimed; do not claim them again for this.`
  ].join("\n");
};
var formatQueueContext = (messages, taskId) => {
  return [
    "New plan inbox messages were claimed for the upcoming work:",
    "",
    formatListing(messages),
    "",
    `Apply them and acknowledge via append_plan_output${taskId === null ? "" : ` with taskId ${taskId}`}. They are already claimed; do not claim them again.`
  ].join("\n");
};
var renderInboxOutput = (messages, taskId) => {
  if (messages.length === 0) return null;
  const hasSteer = messages.some((message) => message.kind === STEER);
  if (hasSteer) {
    const denial = {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: formatSteerDenial(messages, taskId)
    };
    return `${JSON.stringify({ hookSpecificOutput: denial })}
`;
  }
  const hookSpecificOutput = {
    additionalContext: formatQueueContext(messages, taskId),
    hookEventName: "PreToolUse"
  };
  return `${JSON.stringify({ hookSpecificOutput })}
`;
};
var decideClaudePlanInboxClaim = async (raw, deps) => {
  try {
    const candidate = readCandidate(raw);
    if (candidate === null) return null;
    const readEvents = deps.readEvents ?? readTranscriptTail;
    const run = findActivePlanRun(readEvents(candidate.transcriptPath));
    if (run === null) return null;
    const hasSlot = tryTakeClaimSlot({
      nowMs: deps.nowMs(),
      sessionId: candidate.sessionId,
      stateDir: deps.stateDir ?? defaultClaimStateDir(),
      windowMs: deps.windowMs ?? CLAIM_THROTTLE_WINDOW_MS
    });
    if (!hasSlot) return null;
    const messages = await deps.claim({
      planId: run.planId,
      planRunId: run.planRunId,
      taskId: run.taskId
    });
    return messages === null ? null : renderInboxOutput(messages, run.taskId);
  } catch (err) {
    logHookError("plan-inbox-claim: decision failed", err);
    return null;
  }
};

// packages/agentic-hooks/src/adapters/claude/plan-inbox-claim.ts
var CLAIM_TIMEOUT_MS = 2e3;
var main = async () => {
  try {
    const stdinBuf = import_node_fs5.default.readFileSync(0, "utf8");
    if (!stdinBuf || !stdinBuf.trim()) return;
    let raw;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError("plan-inbox-claim: invalid JSON stdin", err);
      return;
    }
    const repoRoot = process.env.CLAUDE_PROJECT_DIR || process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd();
    const output = await decideClaudePlanInboxClaim(raw, {
      claim: (target) => claimPlanInbox({
        authToken: resolveAuthToken(repoRoot),
        graphqlUrl: resolveGraphqlUrl(repoRoot),
        target,
        timeoutMs: CLAIM_TIMEOUT_MS
      }),
      nowMs: () => Date.now()
    });
    if (output !== null) process.stdout.write(output);
  } catch (err) {
    logHookError("plan-inbox-claim failed", err);
  }
};
main().finally(() => {
  process.exit(0);
});
