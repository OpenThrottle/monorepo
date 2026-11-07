#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/bash-guard.ts
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

// packages/agentic-hooks/src/adapters/claude/bash-guard.ts
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
var lexShellSegments = (command) => {
  const segments = [];
  let precededBy = null;
  const heredocs = [];
  let words = [];
  let rawWords = [];
  let wordStart = 0;
  let index = 0;
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
      rawWords.push(command.slice(wordStart, index));
    }
    word = null;
  };
  const endSegment = () => {
    endWord();
    if (words.length > 0) {
      segments.push({ precededBy, rawWords, words });
      precededBy = null;
    }
    words = [];
    rawWords = [];
    dropNextWord = false;
    pendingHeredoc = null;
  };
  const append = (text) => {
    if (word === null) wordStart = index;
    word = (word ?? "") + text;
  };
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
      precededBy = ";";
      if (heredocs.length > 0) {
        index = skipHeredocBodies(command, index, heredocs);
        heredocs.length = 0;
      }
    } else if (char === ";") {
      endSegment();
      precededBy = ";";
    } else if (char === "(" || char === ")") {
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
      if (next === "|") precededBy = "||";
      else if (next === "&") precededBy = "|&";
      else precededBy = "|";
      if (next === "|" || next === "&") index += 1;
    } else if (char === "&") {
      endSegment();
      precededBy = next === "&" ? "&&" : "&";
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
  for (const { precededBy, rawWords, words } of lexShellSegments(command)) {
    segments.push({ cwd: current, precededBy, rawWords, words });
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

// packages/agentic-hooks/src/data/bash-guard/bsd-sed-inplace.ts
var VALUE_FLAGS = /* @__PURE__ */ new Set(["-e", "-f"]);
var INPLACE_FLAG = /^-[Ealnrsu]*i$/;
var SUFFIX_WORD = /^\.[\w.-]*$/;
var isSedBinary = (word) => {
  return word === "sed" || (word?.endsWith("/sed") ?? false);
};
var readSedInPlace = (words) => {
  const { words: bare } = stripCommandPrefixes(words);
  if (!isSedBinary(bare[0])) return "none";
  for (let index = 1; index < bare.length; index += 1) {
    const word = bare[index] ?? "";
    if (word === "--" || !word.startsWith("-") || word === "-") return "none";
    if (/^-i./.test(word)) return "suffixed";
    if (VALUE_FLAGS.has(word)) {
      index += 1;
      continue;
    }
    if (INPLACE_FLAG.test(word)) {
      const next = bare[index + 1];
      if (next === void 0) return "none";
      const isSuffix = next === "" || next === "--" || SUFFIX_WORD.test(next);
      return isSuffix ? "suffixed" : "suffixless";
    }
  }
  return "none";
};
var REASON = `macOS ships BSD sed, where \`-i\` always takes the next word as a backup suffix, so the GNU form \`sed -i 's/…/…/' file\` fails ("command a expects \\ followed by text"). Write \`sed -i '' 's/…/…/' file\` (no backup) or \`sed -i.bak …\`, or make the edit with a script instead.`;
var bsdSedInPlaceRule = {
  evaluate: async (command, context) => {
    if (context.platform !== "darwin") return BASH_RULE_ALLOW;
    const uses = command.segments.map((segment) => {
      return readSedInPlace(segment.words);
    });
    const hit = uses.includes("suffixless") && !uses.includes("suffixed");
    return hit ? { decision: "deny", reason: REASON } : BASH_RULE_ALLOW;
  },
  id: "bsd-sed-inplace"
};

// packages/agentic-hooks/src/data/bash-guard/fs-glob-matcher.ts
var import_promises = __toESM(require("node:fs/promises"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);
var FS_GLOB_MAX_ENTRIES = 5e3;
var FS_GLOB_TIMEOUT_MS = 750;
var GlobBudgetExceeded = class extends Error {
};
var GLOB_CHARS = /(^|[^\\])[*?[]/;
var escapeRegex = (char) => {
  return /[\\^$.*+?()[\]{}|/]/.test(char) ? `\\${char}` : char;
};
var globSegmentToRegExp = (segment) => {
  if (!GLOB_CHARS.test(segment)) return null;
  let source = "";
  let index = 0;
  while (index < segment.length) {
    const char = segment.charAt(index);
    if (char === "\\" && index + 1 < segment.length) {
      source += escapeRegex(segment.charAt(index + 1));
      index += 2;
      continue;
    }
    if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else if (char === "[") {
      const close = segment.indexOf("]", index + 2);
      if (close === -1) {
        source += "\\[";
      } else {
        let body = segment.slice(index + 1, close);
        const negated = body.startsWith("!") || body.startsWith("^");
        if (negated) body = body.slice(1);
        source += `[${negated ? "^" : ""}${body.replace(/\\/g, "\\\\")}]`;
        index = close;
      }
    } else {
      source += escapeRegex(char);
    }
    index += 1;
  }
  return new RegExp(`^${source}$`);
};
var splitSegments = (pattern) => {
  const segments = [];
  let current = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern.charAt(index);
    if (char === "\\" && index + 1 < pattern.length) {
      current += char + pattern.charAt(index + 1);
      index += 1;
    } else if (char === "/") {
      segments.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  segments.push(current);
  return segments;
};
var unescape = (segment) => {
  return segment.replace(/\\(.)/g, "$1");
};
var isMissing = (err) => {
  const code = err instanceof Error && "code" in err ? String(err.code) : void 0;
  return code === "ENOENT" || code === "ENOTDIR";
};
var globHasMatch = async (pattern, cwd, maxEntries) => {
  let budget = maxEntries;
  const readDir = async (dir) => {
    try {
      const entries = await import_promises.default.readdir(dir, { withFileTypes: true });
      budget -= entries.length;
      if (budget < 0) throw new GlobBudgetExceeded();
      return entries.map((entry) => {
        return { isDir: entry.isDirectory(), name: entry.name };
      });
    } catch (err) {
      if (isMissing(err)) return [];
      throw err;
    }
  };
  const isAbsolute = pattern.startsWith("/");
  const segments = splitSegments(isAbsolute ? pattern.slice(1) : pattern);
  let dirs = [isAbsolute ? "/" : cwd];
  for (const [index, segment] of segments.entries()) {
    const isLast = index === segments.length - 1;
    if (segment === "" || segment === ".") continue;
    if (segment === "**") {
      const all = [];
      let frontier = dirs;
      while (frontier.length > 0) {
        all.push(...frontier);
        const listed = await Promise.all(frontier.map(readDir));
        frontier = listed.flatMap((entries, at) => {
          const parent = frontier[at] ?? "";
          return entries.filter((entry) => entry.isDir && !entry.name.startsWith(".")).map((entry) => import_node_path2.default.join(parent, entry.name));
        });
      }
      dirs = all;
      continue;
    }
    const regex = globSegmentToRegExp(segment);
    if (regex === null) {
      const name = unescape(segment);
      const candidates = dirs.map((dir) => import_node_path2.default.join(dir, name));
      const stats = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            return await import_promises.default.stat(candidate);
          } catch (err) {
            if (isMissing(err)) return null;
            throw err;
          }
        })
      );
      dirs = candidates.filter((_, at) => {
        const stat = stats[at];
        return stat !== null && stat !== void 0 && (isLast || stat.isDirectory());
      });
    } else {
      const allowDot = segment.startsWith(".");
      const listed = await Promise.all(dirs.map(readDir));
      dirs = listed.flatMap((entries, at) => {
        const parent = dirs[at] ?? "";
        return entries.filter((entry) => isLast || entry.isDir).filter((entry) => allowDot || !entry.name.startsWith(".")).filter((entry) => regex.test(entry.name)).map((entry) => import_node_path2.default.join(parent, entry.name));
      });
    }
    if (dirs.length === 0) return false;
  }
  return dirs.length > 0;
};
var createFsGlobMatcher = (options = {
  maxEntries: FS_GLOB_MAX_ENTRIES,
  timeoutMs: FS_GLOB_TIMEOUT_MS
}) => {
  return async (pattern, cwd) => {
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => {
        resolve(true);
      }, options.timeoutMs);
    });
    const walk = globHasMatch(pattern, cwd, options.maxEntries).catch(() => {
      return true;
    });
    try {
      return await Promise.race([walk, timeout]);
    } finally {
      clearTimeout(timer);
    }
  };
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

// packages/agentic-hooks/src/data/bash-guard/masked-exit.ts
var MASKED_EXIT_TRAILING_RULE_ID = "masked-exit-trailing";
var MASKED_EXIT_PIPELINE_RULE_ID = "masked-exit-pipeline";
var UNCONDITIONAL_OR_ON_FAILURE = /* @__PURE__ */ new Set([
  ";",
  "||"
]);
var PIPES = /* @__PURE__ */ new Set(["|", "|&"]);
var ECHOES = /* @__PURE__ */ new Set(["echo", "printf"]);
var NO_OPS = /* @__PURE__ */ new Set([":", "true"]);
var FILTERS = /* @__PURE__ */ new Set(["grep", "head", "tail"]);
var VALIDATORS = /* @__PURE__ */ new Set([
  "eslint",
  "nx",
  "tsc",
  "vitest"
]);
var PNPM_VALIDATING_SUBCOMMANDS = /* @__PURE__ */ new Set([
  "exec",
  "nx",
  "run",
  ...VALIDATORS
]);
var LAST_STATUS = /\$(\?|\{\?\})/;
var SUGGESTED_TRAILER = "`cmd; rc=$?; echo exit=$rc; exit $rc`";
var bareWords = (segment) => {
  return stripCommandPrefixes(segment.words).words;
};
var describeTrailing = (segment) => {
  const [head, ...rest] = bareWords(segment);
  if (head === void 0) return null;
  const isAfterAnything = segment.precededBy !== null && UNCONDITIONAL_OR_ON_FAILURE.has(segment.precededBy);
  if (!isAfterAnything) return null;
  if (ECHOES.has(head) && rest.some((word) => LAST_STATUS.test(word))) {
    return { isDeniable: true, what: `ends with \`${head} … $?\`` };
  }
  if (NO_OPS.has(head) && rest.length === 0) {
    const what = `ends with \`${segment.precededBy} ${head}\``;
    return { isDeniable: false, what };
  }
  return null;
};
var trailingReason = (what, background) => {
  const consequence = background ? "It runs in the background, where that exit status is the only result anyone sees." : "Only you can read the echoed number; the harness records success.";
  return [
    `This command ${what}, so the shell exits 0 whatever the work before it did.`,
    consequence,
    `Keep the status: ${SUGGESTED_TRAILER}.`
  ].join(" ");
};
var evaluateTrailing = async (command, context) => {
  const last = command.segments.at(-1);
  if (last === void 0 || command.segments.length < 2) {
    return BASH_RULE_ALLOW;
  }
  const mask = describeTrailing(last);
  if (mask === null) return BASH_RULE_ALLOW;
  const reason = trailingReason(mask.what, context.background);
  const isDenied = context.background && mask.isDeniable;
  return isDenied ? { decision: "deny", reason } : { decision: "warn", reason };
};
var maskedExitTrailingRule = {
  evaluate: evaluateTrailing,
  id: MASKED_EXIT_TRAILING_RULE_ID
};
var isValidation = (segment) => {
  const words = bareWords(segment);
  if (words.some((word) => word.includes("check:local"))) return true;
  const [head, sub] = words;
  if (head === void 0) return false;
  if (VALIDATORS.has(head)) return true;
  const isRunner = head === "pnpm" || head === "npx";
  return isRunner && sub !== void 0 && PNPM_VALIDATING_SUBCOMMANDS.has(sub);
};
var enablesPipefail = (segment) => {
  const [head, ...rest] = bareWords(segment);
  if (head === "setopt") return rest.includes("pipefail");
  if (head !== "set") return false;
  const index = rest.indexOf("pipefail");
  const flag = index > 0 ? rest[index - 1] : void 0;
  return flag !== void 0 && /^-[a-z]*o$/.test(flag);
};
var filterAfter = (segments, index) => {
  for (const segment of segments.slice(index + 1)) {
    if (!PIPES.has(segment.precededBy)) return null;
    const head = bareWords(segment)[0];
    if (head !== void 0 && FILTERS.has(head)) return head;
  }
  return null;
};
var evaluatePipeline = async (command) => {
  if (!/\|/.test(command.raw)) return BASH_RULE_ALLOW;
  const { segments } = command;
  const pipefailAt = segments.findIndex(enablesPipefail);
  const hit = segments.findIndex((segment2, index) => {
    const isGuarded = pipefailAt !== -1 && pipefailAt < index;
    return !isGuarded && isValidation(segment2) && filterAfter(segments, index);
  });
  const segment = segments[hit];
  if (segment === void 0) return BASH_RULE_ALLOW;
  const filter = filterAfter(segments, hit) ?? "a filter";
  const reason = [
    `\`${bareWords(segment).slice(0, 3).join(" ")}\` is piped into \`${filter}\`, so the pipeline exits with \`${filter}\`'s status, not the validation's.`,
    "Prefix the command with `set -o pipefail;` (bash and zsh) before reporting it as passing."
  ].join(" ");
  return { decision: "warn", reason };
};
var maskedExitPipelineRule = {
  evaluate: evaluatePipeline,
  id: MASKED_EXIT_PIPELINE_RULE_ID
};

// packages/agentic-hooks/src/data/bash-guard/stale-pr-write.ts
var STALE_PR_WRITE_RULE_ID = "stale-pr-write";
var VALUE_FLAGS2 = {
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
  const valueFlags = VALUE_FLAGS2[subcommand];
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

// packages/agentic-hooks/src/data/bash-guard/shell-quoting.ts
var readQuotedChars = (raw) => {
  const chars = [];
  let quote = null;
  let index = 0;
  while (index < raw.length) {
    const char = raw.charAt(index);
    const next = raw.charAt(index + 1);
    if (quote === "single") {
      if (char === "'") quote = null;
      else chars.push({ char, quote: "single" });
    } else if (quote === "ansi") {
      if (char === "'") {
        quote = null;
      } else if (char === "\\" && next !== "") {
        chars.push({ char: next, quote: "single" });
        index += 1;
      } else {
        chars.push({ char, quote: "single" });
      }
    } else if (quote === "double") {
      if (char === '"') {
        quote = null;
      } else if (char === "\\" && '"\\$`'.includes(next) && next !== "") {
        chars.push({ char: next, quote: "escaped" });
        index += 1;
      } else {
        chars.push({ char, quote: "double" });
      }
    } else if (char === "'") {
      quote = "single";
    } else if (char === "$" && next === "'") {
      quote = "ansi";
      index += 1;
    } else if (char === '"') {
      quote = "double";
    } else if (char === "\\") {
      if (next !== "" && next !== "\n") {
        chars.push({ char: next, quote: "escaped" });
      }
      index += 1;
    } else {
      chars.push({ char, quote: "none" });
    }
    index += 1;
  }
  return chars;
};

// packages/agentic-hooks/src/data/bash-guard/zsh-unquoted-glob.ts
var GLOB_CHARS2 = "*?[";
var GLOB_META = "*?[]\\";
var ASSIGNMENT_BUILTINS = /* @__PURE__ */ new Set([
  "declare",
  "export",
  "float",
  "integer",
  "local",
  "readonly",
  "typeset"
]);
var PATTERN_COMMANDS = /* @__PURE__ */ new Set(["[[", "case", "noglob"]);
var findUnquotedGlob = (raw) => {
  const chars = readQuotedChars(raw);
  let firstGlob = -1;
  let firstEquals = -1;
  chars.forEach(({ char, quote }, index) => {
    if (quote !== "none") return;
    if (char === "=" && firstEquals === -1) firstEquals = index;
    if (firstGlob !== -1 || !GLOB_CHARS2.includes(char)) return;
    const closesBracket = char !== "[" || chars.some((later, laterIndex) => {
      return laterIndex > index + 1 && later.char === "]" && later.quote === "none";
    });
    if (closesBracket) firstGlob = index;
  });
  if (firstGlob === -1) return null;
  const isUnevaluable = chars.some(({ char, quote }, index) => {
    if (char === "`" || char === "$" && quote !== "single") return true;
    if (quote !== "none") return false;
    return char === "{" || char === "~" && index === 0;
  });
  if (isUnevaluable) return null;
  const pattern = chars.map(({ char, quote }) => {
    const isLiteral = quote !== "none" && GLOB_META.includes(char);
    return isLiteral ? `\\${char}` : char;
  }).join("");
  const isFlagValue = firstEquals !== -1 && firstEquals < firstGlob;
  return { kind: isFlagValue ? "flag-value" : "path", pattern };
};
var quoteFlagValue = (word) => {
  const equals = word.indexOf("=");
  if (equals === -1 || word.includes("'")) return `'${word}'`;
  return `${word.slice(0, equals + 1)}'${word.slice(equals + 1)}'`;
};
var globCandidates = (segment) => {
  const { words: bare } = stripCommandPrefixes(segment.words);
  const command = bare[0];
  if (command === void 0) return [];
  if (PATTERN_COMMANDS.has(command) || ASSIGNMENT_BUILTINS.has(command)) {
    return [];
  }
  const offset = segment.words.length - bare.length;
  const candidates = [];
  segment.rawWords.slice(offset + 1).forEach((raw, index) => {
    const glob = findUnquotedGlob(raw);
    if (glob !== null) candidates.push({ glob, word: bare[index + 1] ?? raw });
  });
  return candidates;
};
var checkSegment = async (segment, context) => {
  const candidates = globCandidates(segment);
  const flagValue = candidates.find(({ glob }) => glob.kind === "flag-value");
  if (flagValue) {
    return `zsh treats the unquoted \`${flagValue.word}\` as a filename pattern and aborts with "no matches found" before the command runs. Quote the value: \`${quoteFlagValue(flagValue.word)}\`.`;
  }
  const { cwd } = segment;
  if (cwd === null) return null;
  const paths = candidates.filter(({ glob }) => glob.kind === "path");
  const matches = await Promise.all(
    paths.map(({ glob }) => context.globMatches(glob.pattern, cwd))
  );
  const unmatched = paths.find((_, index) => matches[index] === false);
  if (!unmatched) return null;
  return `zsh aborts with "no matches found": the unquoted glob \`${unmatched.word}\` matches nothing in ${cwd}. Quote it if the program should receive the pattern itself, or fix the path.`;
};
var zshUnquotedGlobRule = {
  evaluate: async (command, context) => {
    if (context.shell !== "zsh") return BASH_RULE_ALLOW;
    if (command.raw.includes("((")) return BASH_RULE_ALLOW;
    const reasons = await Promise.all(
      command.segments.map((segment) => checkSegment(segment, context))
    );
    const reason = reasons.find((found) => found !== null);
    return reason ? { decision: "deny", reason } : BASH_RULE_ALLOW;
  },
  id: "zsh-unquoted-glob"
};

// packages/agentic-hooks/src/data/bash-guard/zsh-var-modifier.ts
var MODIFIER_LETTERS = "hterlaAuqQ";
var NAME_START = /[A-Za-z_]/;
var NAME_CHAR = /[A-Za-z0-9_]/;
var findZshModifierExpansions = (raw) => {
  const chars = readQuotedChars(raw);
  const found = [];
  chars.forEach(({ char, quote }, index) => {
    if (char !== "$" || quote === "single" || quote === "escaped") return;
    if (!NAME_START.test(chars[index + 1]?.char ?? "")) return;
    let end = index + 1;
    while (NAME_CHAR.test(chars[end]?.char ?? "")) end += 1;
    const colon = chars[end];
    const modifier = chars[end + 1];
    if (colon?.char !== ":" || colon.quote !== quote) return;
    if (modifier === void 0 || modifier.quote !== quote) return;
    if (!MODIFIER_LETTERS.includes(modifier.char)) return;
    const name = chars.slice(index + 1, end).map((entry) => entry.char).join("");
    found.push(`$${name}:${modifier.char}`);
  });
  return found;
};
var zshVarModifierRule = {
  evaluate: async (command, context) => {
    if (context.shell !== "zsh") return BASH_RULE_ALLOW;
    const hits = command.segments.flatMap((segment) => {
      return segment.rawWords.flatMap(findZshModifierExpansions);
    });
    const first = hits[0];
    if (first === void 0) return BASH_RULE_ALLOW;
    const colon = first.indexOf(":");
    const name = first.slice(1, colon);
    const letter = first.slice(colon + 1);
    return {
      decision: "warn",
      reason: `zsh reads \`${first}…\` as \`$${name}\` with the \`:${letter}\` modifier applied, even inside double quotes. If you meant the variable followed by a colon, write \`\${${name}}:\`.`
    };
  },
  id: "zsh-var-modifier"
};

// packages/agentic-hooks/src/data/bash-guard/registry.ts
var BASH_GUARD_RULES = [
  bsdSedInPlaceRule,
  maskedExitPipelineRule,
  maskedExitTrailingRule,
  stalePrWriteRule,
  zshUnquotedGlobRule,
  zshVarModifierRule
];
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

// packages/agentic-hooks/src/data/bash-guard/shell-environment.ts
var import_node_path3 = __toESM(require("node:path"), 1);
var readShellName = (shell) => {
  const trimmed = shell?.trim() ?? "";
  return trimmed === "" ? null : import_node_path3.default.basename(trimmed);
};
var readShellEnvironment = (options) => {
  return {
    globMatches: options.globMatches,
    platform: options.platform,
    shell: readShellName(options.env.SHELL)
  };
};

// packages/agentic-hooks/src/adapters/claude/bash-guard-output.ts
var readClaudeBashCall = (raw) => {
  if (!isRecord(raw) || raw.tool_name !== "Bash") return null;
  if (!isRecord(raw.tool_input)) return null;
  const { command } = raw.tool_input;
  if (typeof command !== "string") return null;
  const cwd = typeof raw.cwd === "string" && raw.cwd !== "" ? raw.cwd : null;
  const background = raw.tool_input.run_in_background === true;
  return { background, command, cwd };
};
var renderClaudeBashGuard = (result) => {
  if (result.decision === "allow") return null;
  const message = formatBashGuardFindings(result.findings);
  if (result.decision === "warn") {
    const hookSpecificOutput2 = {
      additionalContext: message,
      hookEventName: "PreToolUse"
    };
    return `${JSON.stringify({ hookSpecificOutput: hookSpecificOutput2 })}
`;
  }
  const hookSpecificOutput = {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: message
  };
  return `${JSON.stringify({ hookSpecificOutput })}
`;
};
var decideClaudeBashGuard = async (raw, fallbackCwd, context) => {
  const call = readClaudeBashCall(raw);
  if (call === null) return null;
  const result = await evaluateBashGuard(call.command, {
    ...context,
    background: call.background,
    cwd: call.cwd ?? fallbackCwd
  });
  return renderClaudeBashGuard(result);
};

// packages/agentic-hooks/src/adapters/claude/bash-guard.ts
var main = async () => {
  try {
    const stdinBuf = import_node_fs.default.readFileSync(0, "utf8");
    if (!stdinBuf || !stdinBuf.trim()) return;
    let raw;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError("bash-guard: invalid JSON stdin", err);
      return;
    }
    const fallbackCwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const output = await decideClaudeBashGuard(raw, fallbackCwd, {
      lookupPullRequest: createGhPrLookup(),
      lookupTimeoutMs: GH_PR_LOOKUP_TIMEOUT_MS,
      ...readShellEnvironment({
        env: process.env,
        globMatches: createFsGlobMatcher(),
        platform: process.platform
      })
    });
    if (output !== null) process.stdout.write(output);
  } catch (err) {
    logHookError("bash-guard failed", err);
  }
};
main().finally(() => {
  process.exit(0);
});
