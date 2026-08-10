/**
 * CLI wrapper for scope-detection (ours | third-party).
 *
 * Usage: node .claude/hooks/skill-usage-scope.cjs <skill_name> [repo_root]
 */
import fs from 'node:fs';
import path from 'node:path';

import { detectScope } from '../../index';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object';

const skillName = process.argv[2];
const repoRoot = process.argv[3] || process.cwd();

if (!skillName) {
  process.stderr.write(
    'usage: skill-usage-scope.cjs <skill_name> [repo_root]\n',
  );
  process.exit(2);
}

const scope = detectScope(skillName, repoRoot);
let reason = 'not under skills/ and not plugin-namespaced';
let registryHit: string | null = null;

if (skillName.includes(':')) {
  reason = 'plugin-namespaced (contains :)';
} else if (scope === 'ours') {
  reason = 'directory under skills/';
  registryHit = path.join(repoRoot, 'skills', skillName);
} else {
  const lockPath = path.join(repoRoot, 'skills-lock.json');
  try {
    if (fs.existsSync(lockPath)) {
      const lock: unknown = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      if (isRecord(lock) && isRecord(lock.skills) && lock.skills[skillName]) {
        reason = 'skills-lock.json install (external; not under skills/)';
        registryHit = 'skills-lock.json';
      }
    }
  } catch {
    // ignore
  }
}

process.stdout.write(
  `${JSON.stringify({ reason, registryHit, scope, skill_name: skillName })}\n`,
);
