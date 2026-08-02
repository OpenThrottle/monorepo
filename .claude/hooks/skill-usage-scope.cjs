#!/usr/bin/env node
/**
 * CLI wrapper for Phase 0/1 scope-detection (ours | third-party).
 *
 * Usage: node skill-usage-scope.cjs <skill_name> [repo_root]
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { detectScope } = require('../../.agents/hooks/skill-usage/lib.cjs');

const skillName = process.argv[2];
const repoRoot = process.argv[3] || process.cwd();

if (!skillName) {
  process.stderr.write('usage: skill-usage-scope.cjs <skill_name> [repo_root]\n');
  process.exit(2);
}

const scope = detectScope(skillName, repoRoot);
let reason = 'not under skills/ and not plugin-namespaced';
let registryHit = null;

if (skillName.includes(':')) {
  reason = 'plugin-namespaced (contains :)';
} else if (scope === 'ours') {
  reason = 'directory under skills/';
  registryHit = path.join(repoRoot, 'skills', skillName);
} else {
  const lockPath = path.join(repoRoot, 'skills-lock.json');
  try {
    if (fs.existsSync(lockPath)) {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      if (lock?.skills?.[skillName]) {
        reason = 'skills-lock.json install (external; not under skills/)';
        registryHit = 'skills-lock.json';
      }
    }
  } catch {
    // ignore
  }
}

process.stdout.write(
  `${JSON.stringify({ skill_name: skillName, scope, reason, registryHit })}\n`,
);
