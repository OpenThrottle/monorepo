#!/usr/bin/env node
/**
 * Phase 0 — scope-detection rule prototype (ours | third-party).
 *
 * Rule (chosen):
 * - If skill name contains `:`, treat as plugin-namespaced → third-party
 *   (e.g. vercel:deploy, engineering:code-review). Distinct and never "ours".
 * - Else if a directory exists at <repo>/skills/<name>/ → ours (OT-authored SSOT).
 * - Else → third-party (includes skills-lock.json installs and unknown names).
 *
 * skills-lock.json is NOT the "ours" set: it tracks installed external skills
 * under .agents/skills/. Authorship ownership is skills/ only.
 *
 * Usage: node skill-usage-scope.cjs <skill_name> [repo_root]
 */
const fs = require('node:fs');
const path = require('node:path');

const skillName = process.argv[2];
const repoRoot = process.argv[3] || process.cwd();

if (!skillName) {
  process.stderr.write('usage: skill-usage-scope.cjs <skill_name> [repo_root]\n');
  process.exit(2);
}

const detectScope = (name, root) => {
  if (name.includes(':')) {
    return {
      scope: 'third-party',
      reason: 'plugin-namespaced (contains :)',
      registryHit: null,
    };
  }

  const authoredDir = path.join(root, 'skills', name);
  if (fs.existsSync(authoredDir) && fs.statSync(authoredDir).isDirectory()) {
    return {
      scope: 'ours',
      reason: 'directory under skills/',
      registryHit: authoredDir,
    };
  }

  const lockPath = path.join(root, 'skills-lock.json');
  let inLock = false;
  if (fs.existsSync(lockPath)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      inLock = Boolean(lock?.skills?.[name]);
    } catch {
      inLock = false;
    }
  }

  return {
    scope: 'third-party',
    reason: inLock
      ? 'skills-lock.json install (external; not under skills/)'
      : 'not under skills/ and not plugin-namespaced',
    registryHit: inLock ? 'skills-lock.json' : null,
  };
};

const result = detectScope(skillName, repoRoot);
process.stdout.write(`${JSON.stringify({ skill_name: skillName, ...result })}\n`);
