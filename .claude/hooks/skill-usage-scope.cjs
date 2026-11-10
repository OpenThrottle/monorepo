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
var import_node_fs3 = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);

// packages/nodejs-utils/src/utils/is-record.ts
var isRecord = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

// packages/agentic-hooks/src/utils/scope.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_os = __toESM(require("node:os"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);

// packages/agentic-hooks/src/utils/checkout-root.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var findGitAncestor = (dir) => {
  if (import_node_fs.default.existsSync(import_node_path.default.join(dir, ".git"))) {
    return dir;
  }
  const parent = import_node_path.default.dirname(dir);
  if (parent === dir) {
    return null;
  }
  return findGitAncestor(parent);
};
var resolveCheckoutRoot = (dir) => {
  if (dir === null || dir === "" || !import_node_path.default.isAbsolute(dir)) {
    return null;
  }
  try {
    return findGitAncestor(import_node_path.default.resolve(dir));
  } catch {
    return null;
  }
};

// packages/agentic-hooks/src/utils/scope.ts
var PERSONAL_SKILLS_DIR_ENV = "OPENTHROTTLE_PERSONAL_SKILLS_DIR";
var SKILL_LINK_DIR = import_node_path2.default.join(".agents", "skills");
var resolvePersonalSkillsRoot = (env) => {
  const override = env[PERSONAL_SKILLS_DIR_ENV]?.trim();
  if (override !== void 0 && override !== "") {
    return override;
  }
  return import_node_path2.default.join(import_node_os.default.homedir(), ".openthrottle", "skills");
};
var isPathInsideRoot = (root, candidate) => {
  try {
    const realRoot = import_node_fs2.default.realpathSync(root);
    return import_node_fs2.default.realpathSync(candidate).startsWith(`${realRoot}${import_node_path2.default.sep}`);
  } catch {
    return false;
  }
};
var isPersonalSkill = (skillName2, repoRoot2, env) => {
  const personalRoot = resolvePersonalSkillsRoot(env);
  return isPathInsideRoot(
    personalRoot,
    import_node_path2.default.join(repoRoot2, SKILL_LINK_DIR, skillName2)
  );
};
var isInjectedSkill = (skillName2, repoRoot2) => {
  const target = import_node_fs2.default.realpathSync(
    import_node_path2.default.join(repoRoot2, SKILL_LINK_DIR, skillName2)
  );
  const sourceRoot = resolveCheckoutRoot(target);
  if (sourceRoot === null) {
    return false;
  }
  const isAuthoredDir = target === import_node_path2.default.join(sourceRoot, "skills", skillName2);
  const ownRoot = resolveCheckoutRoot(import_node_fs2.default.realpathSync(repoRoot2));
  return isAuthoredDir && sourceRoot !== ownRoot;
};
var detectScope = (skillName2, repoRoot2, env = process.env) => {
  if (!skillName2 || skillName2.includes(":")) {
    return "third-party";
  }
  const authoredDir = import_node_path2.default.join(repoRoot2, "skills", skillName2);
  try {
    if (import_node_fs2.default.existsSync(authoredDir) && import_node_fs2.default.statSync(authoredDir).isDirectory()) {
      return "ours";
    }
  } catch {
  }
  try {
    if (isPersonalSkill(skillName2, repoRoot2, env)) {
      return "personal";
    }
  } catch {
  }
  try {
    if (isInjectedSkill(skillName2, repoRoot2)) {
      return "injected";
    }
  } catch {
  }
  return "third-party";
};

// packages/agentic-hooks/src/adapters/claude/scope.ts
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
} else if (scope === "personal") {
  reason = "linked from the personal skills root (outside the repo)";
  registryHit = import_node_path3.default.join(repoRoot, ".agents", "skills", skillName);
} else {
  const lockPath = import_node_path3.default.join(repoRoot, "skills-lock.json");
  try {
    if (import_node_fs3.default.existsSync(lockPath)) {
      const lock = JSON.parse(import_node_fs3.default.readFileSync(lockPath, "utf8"));
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
