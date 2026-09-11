#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/memory-index-guard.ts
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
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/agentic-hooks/src/adapters/claude/memory-index-guard.ts
var memory_index_guard_exports = {};
__export(memory_index_guard_exports, {
  isMemoryIndexPath: () => isMemoryIndexPath,
  readEditedPath: () => readEditedPath
});
module.exports = __toCommonJS(memory_index_guard_exports);
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);

// packages/nodejs-utils/dist/src/utils/is-record.js
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

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

// packages/agentic-hooks/src/utils/privacy.ts
var PRIVACY_LEVELS = Object.freeze({
  FULL: "full",
  NAME_ONLY: "name-only",
  TRUNCATED: "truncated"
});
var DEFAULT_PRIVACY_LEVEL = PRIVACY_LEVELS.TRUNCATED;

// packages/agentic-hooks/src/data/events.ts
var SKILL_USAGE_OUTCOMES = Object.freeze({
  ABANDONED: "abandoned",
  ERROR: "error",
  SUCCESS: "success"
});

// packages/agentic-hooks/src/data/jsonl.ts
var import_node_path = __toESM(require("node:path"), 1);
var DEFAULT_JSONL_REL = import_node_path.default.join(
  ".cache",
  "skill-usage",
  "events.jsonl"
);
var DEFAULT_OUTCOMES_JSONL_REL = import_node_path.default.join(
  ".cache",
  "skill-usage",
  "outcomes.jsonl"
);
var DEFAULT_STARTS_DIR_REL = import_node_path.default.join(
  ".cache",
  "skill-usage",
  "starts"
);

// packages/agentic-hooks/src/data/persist.ts
var DEFAULT_ABANDONED_MS = 6 * 60 * 60 * 1e3;

// packages/agentic-hooks/src/data/plan-runs.ts
var import_node_path2 = __toESM(require("node:path"), 1);
var PLAN_RUNS_DIR_REL = import_node_path2.default.join(".cache", "plan-runs");
var PLAN_RUN_ABANDONED_MS = 6 * 60 * 60 * 1e3;

// packages/agentic-hooks/src/memory/index-budget.ts
var measureIndex = (content) => content.length;
var INFERRED_INJECTION_CAP = 25e3;
var DEFAULT_BUDGET = Math.floor(INFERRED_INJECTION_CAP * 0.9);
var ENTRY_PATTERN = /^\s*[-*]\s*\[([^\]]*)\]\(([^)]*)\)/;
var parseIndexEntries = (content) => {
  const entries = [];
  const lines = content.split("\n");
  let offset = 0;
  for (const [index, text] of lines.entries()) {
    const end = offset + text.length + 1;
    const match = ENTRY_PATTERN.exec(text);
    if (match) {
      entries.push({
        file: match[2] ?? "",
        line: index + 1,
        offsetEnd: end,
        title: match[1] ?? ""
      });
    }
    offset = end;
  }
  return entries;
};
var truncationOffset = (content, budget) => {
  if (content.length <= budget) return content.length;
  const lastNewline = content.lastIndexOf("\n", budget);
  return lastNewline === -1 ? 0 : lastNewline + 1;
};
var reportIndexBudget = (content, budget = DEFAULT_BUDGET) => {
  const size = measureIndex(content);
  const entries = parseIndexEntries(content);
  if (size <= budget) {
    return {
      budget,
      kept: entries,
      lost: [],
      overBudget: false,
      overBy: 0,
      size
    };
  }
  const cut = truncationOffset(content, budget);
  const kept = entries.filter((entry) => entry.offsetEnd <= cut);
  const lost = entries.filter((entry) => entry.offsetEnd > cut);
  return {
    budget,
    kept,
    lost,
    overBudget: true,
    overBy: size - budget,
    size
  };
};
var MAX_NAMED_LOST = 15;
var formatLostEntries = (lost) => {
  if (lost.length === 0) {
    return "  (no index entries past the cut — the overflow is trailing prose)";
  }
  const named = lost.slice(-MAX_NAMED_LOST);
  const elided = lost.length - named.length;
  const lines = named.map(
    (entry) => `  - ${entry.title} (${entry.file})  [line ${entry.line}]`
  );
  return elided > 0 ? [
    `  …and ${elided} earlier ${elided === 1 ? "entry" : "entries"}, plus these ${named.length} newest:`,
    ...lines
  ].join("\n") : lines.join("\n");
};
var formatBudgetReport = (report) => {
  if (!report.overBudget) return "";
  const header = [
    `MEMORY.md is ${report.size} characters, ${report.overBy} over the ${report.budget}-character budget.`,
    "The harness does NOT reject an over-cap index — it truncates at the last whole",
    "line and injects the rest, so the write will appear to succeed and these entries",
    "will simply be absent from every future session:"
  ].join("\n");
  const lost = formatLostEntries(report.lost);
  const remedy = [
    "",
    "Entries are appended and eviction is positional, so the NEWEST memories are the",
    "ones lost. Fix before continuing — demote landed work to the archive, consolidate",
    "a workstream into one topic file, or delete what is re-derivable. Shortening hooks",
    "will not help: the binding constraint is entry count, not verbosity."
  ].join("\n");
  return `${header}
${lost}
${remedy}`;
};

// packages/agentic-hooks/src/adapters/claude/memory-index-guard.ts
var isMemoryIndexPath = (filePath) => import_node_path3.default.basename(filePath) === "MEMORY.md" && import_node_path3.default.basename(import_node_path3.default.dirname(filePath)) === "memory";
var readEditedPath = (raw) => {
  if (!isRecord(raw)) return null;
  const toolInput = isRecord(raw.tool_input) ? raw.tool_input : {};
  const filePath = toolInput.file_path;
  return typeof filePath === "string" && filePath.trim() !== "" ? filePath : null;
};
var resolveBudget = () => {
  const raw = process.env.OPENTHROTTLE_MEMORY_INDEX_BUDGET;
  if (typeof raw !== "string" || raw.trim() === "") return DEFAULT_BUDGET;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BUDGET;
};
var main = () => {
  try {
    const stdinBuf = import_node_fs.default.readFileSync(0, "utf8");
    if (!stdinBuf || !stdinBuf.trim()) return 0;
    let raw;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError("memory-index-guard: invalid JSON stdin", err);
      return 0;
    }
    const filePath = readEditedPath(raw);
    if (!filePath || !isMemoryIndexPath(filePath)) return 0;
    if (!import_node_fs.default.existsSync(filePath)) return 0;
    const content = import_node_fs.default.readFileSync(filePath, "utf8");
    const report = reportIndexBudget(content, resolveBudget());
    if (!report.overBudget) return 0;
    process.stderr.write(`${formatBudgetReport(report)}
`);
    return 2;
  } catch (err) {
    logHookError("memory-index-guard failed", err);
    return 0;
  }
};
process.exit(main());
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isMemoryIndexPath,
  readEditedPath
});
