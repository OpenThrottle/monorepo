#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/cursor/bash-guard.ts
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

// packages/agentic-hooks/src/adapters/cursor/bash-guard.ts
var import_node_fs = __toESM(require("node:fs"), 1);

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

// packages/agentic-hooks/src/data/bash-guard/gh-pr-lookup.ts
var import_node_child_process = require("node:child_process");

// packages/nodejs-utils/src/utils/is-record.ts
var isRecord = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

// packages/agentic-hooks/src/data/bash-guard/gh-pr-lookup.ts
var GH_PR_LOOKUP_TIMEOUT_MS = 3e3;
var UNKNOWN = { kind: "unknown" };
var runFile = (file, args, { cwd, timeoutMs }) => {
  return new Promise((resolve, reject) => {
    (0, import_node_child_process.execFile)(
      file,
      [...args],
      {
        cwd,
        env: { ...process.env, GH_PROMPT_DISABLED: "1", NO_COLOR: "1" },
        maxBuffer: 1024 * 1024,
        timeout: timeoutMs,
        windowsHide: true
      },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(String(stdout));
      }
    );
  });
};
var ghPrViewArgs = (query) => {
  return [
    "pr",
    "view",
    ...query.selector === null ? [] : [query.selector],
    ...query.repo === null ? [] : ["--repo", query.repo],
    "--json",
    "closedAt,mergedAt,number,state"
  ];
};
var readTimestamp = (value) => {
  return typeof value === "string" && value !== "" ? value : null;
};
var parseGhPrView = (stdout) => {
  let payload;
  try {
    payload = JSON.parse(stdout);
  } catch {
    return UNKNOWN;
  }
  if (!isRecord(payload)) return UNKNOWN;
  const { closedAt, mergedAt, number, state } = payload;
  if (typeof state !== "string" || typeof number !== "number") return UNKNOWN;
  let changedAt = null;
  if (state === "MERGED") changedAt = readTimestamp(mergedAt);
  else if (state === "CLOSED") changedAt = readTimestamp(closedAt);
  return { changedAt, kind: "found", number, state };
};
var createGhPrLookup = ({
  binary = "gh",
  run = runFile,
  timeoutMs = GH_PR_LOOKUP_TIMEOUT_MS
} = {}) => {
  return async (query) => {
    try {
      const stdout = await run(binary, ghPrViewArgs(query), {
        cwd: query.cwd,
        timeoutMs
      });
      return parseGhPrView(stdout);
    } catch {
      return UNKNOWN;
    }
  };
};

// packages/agentic-hooks/src/data/bash-guard/shell-words.ts
var import_node_path = __toESM(require("node:path"), 1);
var isBlank = (char) => {
  return char === " " || char === "	";
};
var skipHeredocBodies = (command, newlineIndex, heredocs) => {
  let lineEnd = newlineIndex;
  for (const { delimiter, stripTabs } of heredocs) {
    let found = false;
    while (!found && lineEnd < command.length) {
      const lineStart = lineEnd + 1;
      const nextNewline = command.indexOf("\n", lineStart);
      lineEnd = nextNewline === -1 ? command.length : nextNewline;
      const line = command.slice(lineStart, lineEnd);
      found = (stripTabs ? line.replace(/^\t+/, "") : line) === delimiter;
    }
  }
  return lineEnd;
};
var readRedirection = (command, index) => {
  const char = command.charAt(index);
  let end = char === "&" ? index + 2 : index + 1;
  const after = command.charAt(end);
  if (after === ">" || after === "|" || char === "<" && after === ">") {
    return { end: end + 1, hasInlineTarget: false };
  }
  if (after === "&" && char !== "&") {
    end += 1;
    const fd = /^(\d+|-)/.exec(command.slice(end));
    if (fd) return { end: end + fd[0].length, hasInlineTarget: true };
  }
  return { end, hasInlineTarget: false };
};
var splitShellSegments = (command) => {
  const segments = [];
  const heredocs = [];
  let words = [];
  let word = null;
  let quote = null;
  let dropNextWord = false;
  let pendingHeredoc = null;
  const endWord = () => {
    if (word === null) return;
    if (pendingHeredoc !== null) {
      heredocs.push({ delimiter: word, stripTabs: pendingHeredoc.stripTabs });
      pendingHeredoc = null;
    } else if (dropNextWord) {
      dropNextWord = false;
    } else {
      words.push(word);
    }
    word = null;
  };
  const endSegment = () => {
    endWord();
    if (words.length > 0) segments.push(words);
    words = [];
    dropNextWord = false;
    pendingHeredoc = null;
  };
  const append = (text) => {
    word = (word ?? "") + text;
  };
  let index = 0;
  while (index < command.length) {
    const char = command.charAt(index);
    const next = command.charAt(index + 1);
    if (quote === "'") {
      if (char === "'") quote = null;
      else append(char);
      index += 1;
      continue;
    }
    if (quote === '"') {
      if (char === '"') {
        quote = null;
      } else if (char === "\\" && '"\\$`\n'.includes(next) && next !== "") {
        if (next !== "\n") append(next);
        index += 1;
      } else {
        append(char);
      }
      index += 1;
      continue;
    }
    const isRedirection = char === ">" || char === "<" || char === "&" && next === ">";
    if (char === "'" || char === '"') {
      quote = char;
      append("");
    } else if (char === "\\") {
      if (next !== "\n" && next !== "") append(next);
      index += 1;
    } else if (isBlank(char)) {
      endWord();
    } else if (char === "#" && word === null) {
      while (index < command.length && command.charAt(index) !== "\n") {
        index += 1;
      }
      continue;
    } else if (char === "\n") {
      endSegment();
      if (heredocs.length > 0) {
        index = skipHeredocBodies(command, index, heredocs);
        heredocs.length = 0;
      }
    } else if (char === ";" || char === "(" || char === ")") {
      endSegment();
    } else if (isRedirection) {
      if (word !== null && /^\d+$/.test(word)) word = null;
      else endWord();
      if (command.startsWith("<<<", index)) {
        dropNextWord = true;
        index += 3;
        continue;
      }
      if (char === "<" && next === "<") {
        const stripTabs = command.charAt(index + 2) === "-";
        pendingHeredoc = { stripTabs };
        index += stripTabs ? 3 : 2;
        continue;
      }
      const redirection = readRedirection(command, index);
      dropNextWord = !redirection.hasInlineTarget;
      index = redirection.end;
      continue;
    } else if (char === "|") {
      endSegment();
      if (next === "|" || next === "&") index += 1;
    } else if (char === "&") {
      endSegment();
      if (next === "&") index += 1;
    } else {
      append(char);
    }
    index += 1;
  }
  endSegment();
  return segments;
};
var COMMAND_PREFIXES = /* @__PURE__ */ new Set([
  "command",
  "env",
  "exec",
  "nohup",
  "time"
]);
var ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
var stripCommandPrefixes = (words) => {
  const assignments = /* @__PURE__ */ new Map();
  let start = 0;
  for (const current of words) {
    if (ENV_ASSIGNMENT.test(current)) {
      const equals = current.indexOf("=");
      assignments.set(current.slice(0, equals), current.slice(equals + 1));
    } else if (!COMMAND_PREFIXES.has(current)) {
      break;
    }
    start += 1;
  }
  return { assignments, words: words.slice(start) };
};
var isStaticPath = (target) => {
  return !/[$`~*?]/.test(target) && target !== "-";
};
var parseBashCommand = (command, cwd) => {
  let current = cwd;
  const segments = [];
  for (const words of splitShellSegments(command)) {
    segments.push({ cwd: current, words });
    const { words: bare } = stripCommandPrefixes(words);
    if (bare[0] !== "cd") continue;
    const from = current;
    const target = bare[1];
    if (from === null || target === void 0 || !isStaticPath(target)) {
      current = null;
    } else {
      current = import_node_path.default.resolve(from, target);
    }
  }
  return { raw: command, segments };
};

// packages/agentic-hooks/src/data/bash-guard/types.ts
var BASH_RULE_ALLOW = { decision: "allow" };

// packages/agentic-hooks/src/data/bash-guard/stale-pr-write.ts
var STALE_PR_WRITE_RULE_ID = "stale-pr-write";
var VALUE_FLAGS = {
  close: /* @__PURE__ */ new Set(["-c", "--comment"]),
  comment: /* @__PURE__ */ new Set(["--attach", "-b", "--body", "-F", "--body-file"]),
  edit: /* @__PURE__ */ new Set([
    "--add-assignee",
    "--add-label",
    "--add-project",
    "--add-reviewer",
    "--attach",
    "-B",
    "--base",
    "-b",
    "--body",
    "-F",
    "--body-file",
    "-m",
    "--milestone",
    "--remove-assignee",
    "--remove-label",
    "--remove-project",
    "--remove-reviewer",
    "-t",
    "--title"
  ]),
  merge: /* @__PURE__ */ new Set([
    "-A",
    "--author-email",
    "-b",
    "--body",
    "-F",
    "--body-file",
    "--match-head-commit",
    "-t",
    "--subject"
  ]),
  ready: /* @__PURE__ */ new Set([]),
  review: /* @__PURE__ */ new Set(["-b", "--body", "-F", "--body-file"])
};
var BOOLEAN_FLAGS = {
  close: /* @__PURE__ */ new Set(["-d", "--delete-branch"]),
  comment: /* @__PURE__ */ new Set([
    "--create-if-none",
    "--delete-last",
    "--edit-last",
    "-e",
    "--editor",
    "-w",
    "--web",
    "--yes"
  ]),
  edit: /* @__PURE__ */ new Set(["--remove-milestone"]),
  merge: /* @__PURE__ */ new Set([
    "--admin",
    "--auto",
    "-d",
    "--delete-branch",
    "--disable-auto",
    "-m",
    "--merge",
    "-r",
    "--rebase",
    "-s",
    "--squash"
  ]),
  ready: /* @__PURE__ */ new Set(["--undo"]),
  review: /* @__PURE__ */ new Set([
    "-a",
    "--approve",
    "-c",
    "--comment",
    "-r",
    "--request-changes"
  ])
};
var REPO_FLAGS = /* @__PURE__ */ new Set(["-R", "--repo"]);
var TERMINAL_STATES = /* @__PURE__ */ new Set(["CLOSED", "MERGED"]);
var NONE = { kind: "none" };
var UNPARSEABLE = { kind: "unparseable" };
var isGhBinary = (word) => {
  return word === "gh" || (word?.endsWith("/gh") ?? false);
};
var isDynamic = (word) => {
  return word.includes("$") || word.includes("`");
};
var parseGhPrWrite = (rawWords) => {
  const { assignments, words } = stripCommandPrefixes(rawWords);
  if (!isGhBinary(words[0]) || words[1] !== "pr") return NONE;
  const subcommand = words[2] ?? "";
  const valueFlags = VALUE_FLAGS[subcommand];
  const booleanFlags = BOOLEAN_FLAGS[subcommand];
  if (valueFlags === void 0 || booleanFlags === void 0) return NONE;
  let repo = assignments.get("GH_REPO") ?? null;
  const positionals = [];
  let index = 3;
  while (index < words.length) {
    const word = words[index] ?? "";
    index += 1;
    if (word === "--") {
      positionals.push(...words.slice(index));
      break;
    }
    if (!word.startsWith("-") || word === "-") {
      positionals.push(word);
      continue;
    }
    if (word === "-h" || word === "--help") return NONE;
    const equals = word.indexOf("=");
    const flag = equals === -1 ? word : word.slice(0, equals);
    const inlineValue = equals === -1 ? null : word.slice(equals + 1);
    if (REPO_FLAGS.has(flag)) {
      repo = inlineValue ?? words[index] ?? null;
      if (inlineValue === null) index += 1;
    } else if (valueFlags.has(flag)) {
      if (inlineValue === null) index += 1;
    } else if (!booleanFlags.has(flag)) {
      return UNPARSEABLE;
    }
  }
  const selector = positionals[0] ?? null;
  const isUnreadable = positionals.length > 1 || selector !== null && isDynamic(selector) || repo !== null && isDynamic(repo);
  if (isUnreadable) return UNPARSEABLE;
  return { kind: "write", repo, selector, subcommand };
};
var UNKNOWN2 = { kind: "unknown" };
var lookupWithin = async (context, query) => {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      resolve(UNKNOWN2);
    }, context.lookupTimeoutMs);
  });
  try {
    return await Promise.race([context.lookupPullRequest(query), timeout]);
  } catch (err) {
    logHookError(`${STALE_PR_WRITE_RULE_ID}: PR lookup failed`, err);
    return UNKNOWN2;
  } finally {
    clearTimeout(timer);
  }
};
var describeTarget = (query) => {
  return query.selector === null ? "the current branch's PR" : `\`${query.selector}\``;
};
var formatDeny = (subcommand, query, state) => {
  const verb = state.state === "MERGED" ? "merged" : "closed";
  const when = state.changedAt === null ? "" : ` (${verb} ${state.changedAt})`;
  const repo = query.repo === null ? "" : ` in ${query.repo}`;
  return [
    `Refusing \`gh pr ${subcommand}\` on PR #${state.number}${repo}: GitHub reports it ${state.state}${when}.`,
    `The command targets ${describeTarget(query)}, and acting on it now would rest on a stale premise.`,
    "A chained `gh pr view … && …` does not protect against this: `&&` checks the exit code, not the state the view printed.",
    "Re-check the PR and what you meant to do. If you do mean to reopen it, `gh pr reopen` is not guarded."
  ].join(" ");
};
var toGuardedWrite = (segment) => {
  const write = parseGhPrWrite(segment.words);
  if (write.kind !== "write" || segment.cwd === null) return null;
  return {
    query: { cwd: segment.cwd, repo: write.repo, selector: write.selector },
    subcommand: write.subcommand
  };
};
var evaluate = async (command, context) => {
  if (!/\bgh\b/.test(command.raw) || !/\bpr\b/.test(command.raw)) {
    return BASH_RULE_ALLOW;
  }
  const writes = command.segments.map(toGuardedWrite).filter((write) => write !== null);
  if (writes.length === 0) return BASH_RULE_ALLOW;
  const states = await Promise.all(
    writes.map((write) => lookupWithin(context, write.query))
  );
  const reasons = writes.flatMap((write, index) => {
    const state = states[index];
    if (state?.kind !== "found" || !TERMINAL_STATES.has(state.state)) {
      return [];
    }
    return [formatDeny(write.subcommand, write.query, state)];
  });
  return reasons.length === 0 ? BASH_RULE_ALLOW : { decision: "deny", reason: reasons.join("\n") };
};
var stalePrWriteRule = {
  evaluate,
  id: STALE_PR_WRITE_RULE_ID
};

// packages/agentic-hooks/src/data/bash-guard/registry.ts
var BASH_GUARD_RULES = [stalePrWriteRule];
var runRule = async (rule, command, context) => {
  try {
    return await rule.evaluate(command, context);
  } catch (err) {
    logHookError(`bash-guard: rule ${rule.id} threw`, err);
    return { decision: "allow" };
  }
};
var evaluateBashGuard = async (command, context, rules = BASH_GUARD_RULES) => {
  if (command.trim() === "") return { decision: "allow" };
  const parsed = parseBashCommand(command, context.cwd);
  const verdicts = await Promise.all(
    rules.map((rule) => runRule(rule, parsed, context))
  );
  const denies = [];
  const warns = [];
  verdicts.forEach((verdict, index) => {
    const ruleId = rules[index]?.id ?? "unknown";
    if (verdict.decision === "deny") {
      denies.push({ reason: verdict.reason, ruleId });
    } else if (verdict.decision === "warn") {
      warns.push({ reason: verdict.reason, ruleId });
    }
  });
  if (denies.length > 0) return { decision: "deny", findings: denies };
  if (warns.length > 0) return { decision: "warn", findings: warns };
  return { decision: "allow" };
};
var formatBashGuardFindings = (findings) => {
  return findings.map((finding) => `[bash-guard:${finding.ruleId}] ${finding.reason}`).join("\n");
};

// packages/agentic-hooks/src/adapters/cursor/bash-guard-output.ts
var CURSOR_SHELL_ALLOW = `${JSON.stringify({ permission: "allow" })}
`;
var readNonEmpty = (value) => {
  return typeof value === "string" && value !== "" ? value : null;
};
var readCursorShellCall = (raw) => {
  if (!isRecord(raw) || typeof raw.command !== "string") return null;
  const event = raw.hook_event_name;
  if (event !== void 0 && event !== "beforeShellExecution") return null;
  const roots = Array.isArray(raw.workspace_roots) ? raw.workspace_roots : [];
  const cwd = readNonEmpty(raw.cwd) ?? readNonEmpty(roots[0]);
  return { command: raw.command, cwd };
};
var renderCursorBashGuard = (result) => {
  if (result.decision === "allow") return CURSOR_SHELL_ALLOW;
  const message = formatBashGuardFindings(result.findings);
  if (result.decision === "warn") {
    return `${JSON.stringify({ agent_message: message, permission: "allow" })}
`;
  }
  const ruleIds = result.findings.map((finding) => finding.ruleId).join(", ");
  return `${JSON.stringify({
    agent_message: message,
    permission: "deny",
    user_message: `Blocked by the bash guard (${ruleIds}).`
  })}
`;
};
var decideCursorBashGuard = async (raw, fallbackCwd, context) => {
  const call = readCursorShellCall(raw);
  if (call === null) return CURSOR_SHELL_ALLOW;
  const result = await evaluateBashGuard(call.command, {
    ...context,
    cwd: call.cwd ?? fallbackCwd
  });
  return renderCursorBashGuard(result);
};

// packages/agentic-hooks/src/adapters/cursor/bash-guard.ts
var decide = async () => {
  const stdinBuf = import_node_fs.default.readFileSync(0, "utf8");
  if (!stdinBuf || !stdinBuf.trim()) return CURSOR_SHELL_ALLOW;
  let raw;
  try {
    raw = JSON.parse(stdinBuf);
  } catch (err) {
    logHookError("bash-guard: invalid JSON stdin", err);
    return CURSOR_SHELL_ALLOW;
  }
  const fallbackCwd = process.env.CURSOR_PROJECT_DIR || process.cwd();
  return decideCursorBashGuard(raw, fallbackCwd, {
    lookupPullRequest: createGhPrLookup(),
    lookupTimeoutMs: GH_PR_LOOKUP_TIMEOUT_MS
  });
};
var main = async () => {
  let output = CURSOR_SHELL_ALLOW;
  try {
    output = await decide();
  } catch (err) {
    logHookError("bash-guard failed", err);
  }
  process.stdout.write(output);
};
main().finally(() => {
  process.exit(0);
});
