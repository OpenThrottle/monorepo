import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

/**
 * Engine boundary guard (runtime-independent companion to the package's ESLint
 * `@typescript-eslint/no-restricted-imports` rule).
 *
 * `@openthrottle/openthrottle-ide` is a server-only Node library whose runtime
 * exports pull Node-only deps (`@vscode/ripgrep`, `chokidar`, `ts-morph`) into
 * any consumer's bundle. This package is client-safe and may reference the
 * engine via TYPE-ONLY imports/exports (`import type` / `export type`) only.
 *
 * This test scans every source file and fails if it finds a VALUE import or
 * export from the engine — catching a regression even if the lint rule is
 * disabled or skipped.
 */

const ENGINE = '@openthrottle/openthrottle-ide';
const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function collectSourceFiles(dir: string): Array<string> {
  const out: Array<string> = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') {
        continue;
      }

      out.push(...collectSourceFiles(full));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }

  return out;
}

/**
 * Match `import …`/`export …` statements that pull from the engine. The capture
 * group preserves whatever follows the `import`/`export` keyword so we can tell
 * a type-only statement (`import type …`) from a value one.
 */
function engineStatements(source: string): Array<string> {
  const pattern = new RegExp(
    String.raw`(?:^|\n)\s*(import|export)\b([\s\S]*?)from\s*['"]` +
      ENGINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      String.raw`['"]`,
    'g',
  );

  const matches: Array<string> = [];
  let match: RegExpExecArray | null = pattern.exec(source);

  while (match !== null) {
    matches.push(`${match[1]}${match[2]}`);
    match = pattern.exec(source);
  }

  return matches;
}

describe('engine boundary', () => {
  const files = collectSourceFiles(SRC_ROOT);

  test('there is at least one source file to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test('every @openthrottle/openthrottle-ide reference is type-only', () => {
    const violations: Array<string> = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');

      for (const statement of engineStatements(source)) {
        const isTypeOnly = /^\s*(?:import|export)\s+type\b/.test(statement);

        if (!isTypeOnly) {
          violations.push(`${file}: ${statement.trim()}`);
        }
      }
    }

    expect(violations).toStrictEqual([]);
  });
});
