/**
 * Scope detection: a skill is `ours` when authored under `skills/<name>/`;
 * otherwise `third-party` (plugin-namespaced `a:b` or a skills-lock install).
 */
import fs from 'node:fs';
import path from 'node:path';

import type { Scope } from '../types';

/**
 * @public
 */
export const detectScope = (skillName: string, repoRoot: string): Scope => {
  if (!skillName || skillName.includes(':')) {
    return 'third-party';
  }

  const authoredDir = path.join(repoRoot, 'skills', skillName);
  try {
    if (fs.existsSync(authoredDir) && fs.statSync(authoredDir).isDirectory()) {
      return 'ours';
    }
  } catch {
    // fail-open → treat as third-party
  }

  return 'third-party';
};
