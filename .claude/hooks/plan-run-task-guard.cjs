#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/plan-run-task-guard.ts
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

// packages/agentic-hooks/src/adapters/claude/plan-run-task-guard.ts
var import_node_fs3 = __toESM(require("node:fs"), 1);

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

// packages/nodejs-utils/src/utils/is-record.ts
var isRecord = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

// packages/agentic-hooks/src/data/read-new-bytes.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var NEWLINE = 10;
var readNewBytes = ({
  filePath,
  maxBytes,
  offset
}) => {
  const unchanged = { lines: [], nextOffset: offset };
  let fd = null;
  try {
    fd = import_node_fs.default.openSync(filePath, "r");
    const { size } = import_node_fs.default.fstatSync(fd);
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
      const bytesRead = import_node_fs.default.readSync(fd, buffer, 0, window, start);
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
        import_node_fs.default.closeSync(fd);
      } catch {
      }
    }
  }
};

// packages/agentic-hooks/src/adapters/claude/plan-run-task-guard-output.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_os = __toESM(require("node:os"), 1);

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
var PLAN_RUN_GUARD_MAX_TAIL_BYTES = 6 * 1024 * 1024;
var EDIT_TOOL_NAMES = /* @__PURE__ */ new Set([
  "Edit",
  "MultiEdit",
  "NotebookEdit",
  "Write"
]);
var REGISTER_RUN_SUFFIX = "__register_plan_run";
var SETTLE_RUN_SUFFIX = "__settle_plan_run";
var UPDATE_TASK_SUFFIX = "__update_task";
var IN_PROGRESS = "IN_PROGRESS";
var decidePlanRunTask = (events) => {
  let run = null;
  let latestStatus = null;
  for (const [eventIndex, event] of events.entries()) {
    for (const use of claudeSessionToolUsesOf(event)) {
      if (use.name.endsWith(REGISTER_RUN_SUFFIX)) {
        const { planId } = use.input;
        run = {
          eventIndex,
          planId: typeof planId === "string" ? planId : null
        };
        latestStatus = null;
      } else if (use.name.endsWith(SETTLE_RUN_SUFFIX)) {
        run = null;
      } else if (use.name.endsWith(UPDATE_TASK_SUFFIX) && run !== null) {
        const { status } = use.input;
        if (typeof status === "string" && status !== "") {
          latestStatus = status.toUpperCase();
        }
      }
    }
  }
  if (run === null || latestStatus === IN_PROGRESS) return { kind: "pass" };
  const runId = findClaudeSessionPlanRunId(events.slice(run.eventIndex)) ?? run.planId ?? "unknown";
  return { kind: "flag", runId };
};
var formatPlanRunTaskFlag = (runId) => {
  return `No task is IN_PROGRESS in plan run ${runId}: flip the task you're working on first.`;
};
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
    const { size } = import_node_fs2.default.statSync(transcriptPath);
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
var isScratchPath = (filePath, tempDirs = [
  import_node_os.default.tmpdir(),
  "/private/tmp",
  "/private/var/folders",
  "/tmp",
  "/var/folders"
]) => {
  return tempDirs.some((dir) => {
    const prefix = dir.endsWith("/") ? dir : `${dir}/`;
    return filePath.startsWith(prefix);
  });
};
var editTargetOf = (toolInput) => {
  if (!isRecord(toolInput)) return null;
  const { file_path: filePath, notebook_path: notebookPath } = toolInput;
  if (typeof filePath === "string") return filePath;
  return typeof notebookPath === "string" ? notebookPath : null;
};
var readEditTranscriptPath = (raw) => {
  if (!isRecord(raw) || typeof raw.tool_name !== "string") return null;
  if (!EDIT_TOOL_NAMES.has(raw.tool_name)) return null;
  const target = editTargetOf(raw.tool_input);
  if (target !== null && isScratchPath(target)) return null;
  const { transcript_path: transcriptPath } = raw;
  const hasPath = typeof transcriptPath === "string" && transcriptPath !== "";
  return hasPath ? transcriptPath : null;
};
var decideClaudePlanRunTaskGuard = (raw, readEvents = readTranscriptTail) => {
  const transcriptPath = readEditTranscriptPath(raw);
  if (transcriptPath === null) return null;
  const verdict = decidePlanRunTask(readEvents(transcriptPath));
  if (verdict.kind === "pass") return null;
  const hookSpecificOutput = {
    additionalContext: formatPlanRunTaskFlag(verdict.runId),
    hookEventName: "PreToolUse"
  };
  return `${JSON.stringify({ hookSpecificOutput })}
`;
};

// packages/agentic-hooks/src/adapters/claude/plan-run-task-guard.ts
var main = () => {
  try {
    const stdinBuf = import_node_fs3.default.readFileSync(0, "utf8");
    if (!stdinBuf || !stdinBuf.trim()) return;
    let raw;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError("plan-run-task-guard: invalid JSON stdin", err);
      return;
    }
    const output = decideClaudePlanRunTaskGuard(raw);
    if (output !== null) process.stdout.write(output);
  } catch (err) {
    logHookError("plan-run-task-guard failed", err);
  }
};
try {
  main();
} finally {
  process.exit(0);
}
