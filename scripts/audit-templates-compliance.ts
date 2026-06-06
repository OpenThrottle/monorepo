/**
 * Flags .tsx files that may need alignment with generator templates and
 * .cursor/rules (default exports in component paths, missing React import).
 * See docs/tools/templates/AUDIT_CHECKLIST.md. Does not modify files.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { globSync } from 'glob';

const ROOT = process.cwd();

/** Paths that typically allow default export (routes, layout, entry). */
const ALLOW_DEFAULT_EXPORT_PATH =
  /(?:routes|route\.tsx|root\.tsx|entry\.|_layout|layout\.tsx|app[/\\]routes)/i;

/** In-scope globs for component/UI code (from AUDIT_SCOPE.md). */
const IN_SCOPE_GLOBS = [
  'applications/*/app/**/*.tsx',
  'packages/*/src/**/*.tsx',
];

interface Flag {
  readonly file: string;
  readonly reason: string;
}

/**
 * Returns true if the file path is likely a route/layout/entry (default export allowed).
 */
function isAllowedDefaultExportPath(filePath: string): boolean {
  const normalized = path.relative(ROOT, filePath);
  return ALLOW_DEFAULT_EXPORT_PATH.test(normalized);
}

/**
 * Returns true if content looks like it contains JSX.
 */
function hasJsx(content: string): boolean {
  return /<[A-Za-z][\w.-]*[\s/>]|<\s*\/\s*\w+/.test(content);
}

/**
 * Returns true if content uses React (JSX) but does not use the required import.
 */
function missingReactImport(content: string): boolean {
  if (!hasJsx(content)) return false;
  return !/import\s+\*\s+as\s+React\s+from\s+['"]react['"]/.test(content);
}

/**
 * Returns true if content has default export (and path is not in allowed list).
 */
function hasDisallowedDefaultExport(
  content: string,
  filePath: string,
): boolean {
  if (!/export\s+default\s+/.test(content)) return false;
  return !isAllowedDefaultExportPath(filePath);
}

function run(): void {
  const flags: Flag[] = [];

  for (const pattern of IN_SCOPE_GLOBS) {
    const files = globSync(pattern, { absolute: true, cwd: ROOT });
    for (const file of files) {
      let content: string;
      try {
        content = readFileSync(file, 'utf-8');
      } catch {
        continue;
      }

      const relativePath = path.relative(ROOT, file);
      if (hasDisallowedDefaultExport(content, file)) {
        flags.push({
          file: relativePath,
          reason:
            'default export in component-like path (use named export per coding/default-exports.mdc)',
        });
      }

      if (missingReactImport(content)) {
        flags.push({
          file: relativePath,
          reason:
            "JSX present but missing `import * as React from 'react'` (cursor-commands.mdc)",
        });
      }
    }
  }

  if (flags.length === 0) {
    console.log(
      'No files flagged. See docs/tools/templates/AUDIT_CHECKLIST.md for full checklist.',
    );
    return;
  }

  console.log('Flagged files (candidates for manual review):');
  console.log('');

  for (const { file, reason } of flags) {
    console.log(`${file}`);
    console.log(`  → ${reason}`);
  }

  console.log('');
  console.log(
    `Total: ${flags.length} flag(s). See docs/tools/templates/AUDIT_CHECKLIST.md.`,
  );
}

run();
