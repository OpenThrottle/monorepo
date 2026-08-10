#!/usr/bin/env node

/**
 * -------- GENERATED — DO NOT EDIT ------------------------------------
 * Source: packages/agentic-hooks/src/adapters/claude/scope.ts
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

// packages/agentic-hooks/src/adapters/claude/scope.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/utils/privacy.ts
var PRIVACY_LEVELS = Object.freeze({
  FULL: "full",
  NAME_ONLY: "name-only",
  TRUNCATED: "truncated"
});
var DEFAULT_PRIVACY_LEVEL = PRIVACY_LEVELS.TRUNCATED;

// packages/agentic-hooks/src/utils/scope.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var detectScope = (skillName2, repoRoot2) => {
  if (!skillName2 || skillName2.includes(":")) {
    return "third-party";
  }
  const authoredDir = import_node_path.default.join(repoRoot2, "skills", skillName2);
  try {
    if (import_node_fs.default.existsSync(authoredDir) && import_node_fs.default.statSync(authoredDir).isDirectory()) {
      return "ours";
    }
  } catch {
  }
  return "third-party";
};

// packages/agentic-hooks/src/data/events.ts
var SKILL_USAGE_OUTCOMES = Object.freeze({
  ABANDONED: "abandoned",
  ERROR: "error",
  SUCCESS: "success"
});

// packages/agentic-hooks/src/data/jsonl.ts
var import_node_path2 = __toESM(require("node:path"), 1);
var DEFAULT_JSONL_REL = import_node_path2.default.join(
  ".cache",
  "skill-usage",
  "events.jsonl"
);
var DEFAULT_OUTCOMES_JSONL_REL = import_node_path2.default.join(
  ".cache",
  "skill-usage",
  "outcomes.jsonl"
);
var DEFAULT_STARTS_DIR_REL = import_node_path2.default.join(
  ".cache",
  "skill-usage",
  "starts"
);

// packages/agentic-hooks/src/data/persist.ts
var DEFAULT_ABANDONED_MS = 6 * 60 * 60 * 1e3;

// packages/agentic-hooks/src/adapters/claude/scope.ts
var isRecord = (value) => value != null && typeof value === "object";
var skillName = process.argv[2];
var repoRoot = process.argv[3] || process.cwd();
if (!skillName) {
  process.stderr.write(
    "usage: skill-usage-scope.cjs <skill_name> [repo_root]\n"
  );
  process.exit(2);
}
var scope = detectScope(skillName, repoRoot);
var reason = "not under skills/ and not plugin-namespaced";
var registryHit = null;
if (skillName.includes(":")) {
  reason = "plugin-namespaced (contains :)";
} else if (scope === "ours") {
  reason = "directory under skills/";
  registryHit = import_node_path3.default.join(repoRoot, "skills", skillName);
} else {
  const lockPath = import_node_path3.default.join(repoRoot, "skills-lock.json");
  try {
    if (import_node_fs2.default.existsSync(lockPath)) {
      const lock = JSON.parse(import_node_fs2.default.readFileSync(lockPath, "utf8"));
      if (isRecord(lock) && isRecord(lock.skills) && lock.skills[skillName]) {
        reason = "skills-lock.json install (external; not under skills/)";
        registryHit = "skills-lock.json";
      }
    }
  } catch {
  }
}
process.stdout.write(
  `${JSON.stringify({ reason, registryHit, scope, skill_name: skillName })}
`
);
