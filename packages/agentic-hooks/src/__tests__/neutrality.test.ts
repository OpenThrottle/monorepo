/**
 * The neutrality guard.
 *
 * Documentation does not stop the next feature from landing a tool-shaped
 * concept in the neutral core — that is exactly how the Claude/Cursor
 * divergence went unremarked. This suite makes the posture enforceable:
 *
 *   1. No file under `src/` outside `src/adapters/` may name a specific agent
 *      tool, in code OR in comments. Legitimate exceptions are an explicit,
 *      argued allowlist rather than a silent skip.
 *   2. Every directory under `src/adapters/` ships a `payload.ts` exporting a
 *      `*_SOURCE` producer id, so no adapter can emit unattributed events.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const srcRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const adaptersRoot = path.join(srcRoot, 'adapters');

/**
 * Identifiers that make a file tool-specific. Matched case-insensitively as
 * plain substrings, so `CLAUDE_PROJECT_DIR`, `.claude/` and `claude-code` are
 * all covered by `claude`; the longer forms are listed anyway because the
 * violation message names the identifier it matched.
 *
 * `cursor` is deliberately here despite being an ordinary word: the core has no
 * pagination cursors today, and if it ever grows one, that is an allowlist
 * entry with an argument attached rather than a hole punched in the list.
 */
const TOOL_IDENTIFIERS: readonly string[] = [
  '.claude/',
  '.cursor/',
  'antigravity',
  'claude',
  'claude_project_dir',
  'codex',
  'cursor',
  'cursor_project_dir',
  'gemini',
  'grok',
  'opencode',
];

interface Allowance {
  /** Path relative to `src/`, POSIX separators. */
  readonly file: string;
  /** The identifier from TOOL_IDENTIFIERS this allowance covers. */
  readonly identifier: string;
  /** Why this one is legitimate. An allowance without a reason is a hole. */
  readonly why: string;
}

/**
 * The complete set of legitimate tool mentions in the neutral core.
 *
 * Both entries below are prose naming which adapter consumes a neutral module —
 * they describe a caller, they do not couple the core to it. Encoding them here
 * rather than loosening the pattern means a future addition has to be argued
 * for in review rather than quietly appended.
 */
const ALLOWLIST: readonly Allowance[] = [
  {
    file: 'data/plan-runs.ts',
    identifier: 'claude',
    why: 'Module docblock naming the adapter that provides the fast path; describes a caller, does not depend on it.',
  },
];

/** Directories whose contents are exempt, with the reason for each. */
const EXEMPT_DIRECTORIES: ReadonlyMap<string, string> = new Map([
  [
    '__tests__',
    'Test files legitimately exercise producer ids as opaque `source` values, and this guard itself must name every tool it looks for.',
  ],
  [
    'adapters',
    'Per-tool adapters are the ONE place a tool name belongs — that is the whole architecture.',
  ],
]);

const listTypeScriptFiles = (dir: string): readonly string[] => {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXEMPT_DIRECTORIES.has(entry.name)) {
        continue;
      }
      out.push(...listTypeScriptFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
};

const relativeToSrc = (absolute: string): string =>
  path.relative(srcRoot, absolute).split(path.sep).join('/');

interface Violation {
  readonly file: string;
  readonly identifier: string;
  readonly line: number;
  readonly text: string;
}

const isAllowed = (file: string, identifier: string): boolean =>
  ALLOWLIST.some(
    (allowance) =>
      allowance.file === file && allowance.identifier === identifier,
  );

const findViolations = (): readonly Violation[] => {
  const violations: Violation[] = [];
  for (const absolute of listTypeScriptFiles(srcRoot)) {
    const file = relativeToSrc(absolute);
    const lines = fs.readFileSync(absolute, 'utf8').split('\n');
    lines.forEach((text, index) => {
      const haystack = text.toLowerCase();
      for (const identifier of TOOL_IDENTIFIERS) {
        if (!haystack.includes(identifier) || isAllowed(file, identifier)) {
          continue;
        }
        violations.push({
          file,
          identifier,
          line: index + 1,
          text: text.trim(),
        });
      }
    });
  }
  return violations;
};

const formatViolation = (violation: Violation): string =>
  `${violation.file}:${violation.line} matched "${violation.identifier}" — ${violation.text}`;

describe('the neutral core names no specific tool', () => {
  it('finds no tool-specific identifier outside src/adapters/', () => {
    const violations = findViolations();
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('has no stale allowlist entry', () => {
    // An allowance that no longer matches anything is dead weight that makes
    // the next reader think the core is dirtier than it is.
    const stale = ALLOWLIST.filter((allowance) => {
      const absolute = path.join(srcRoot, allowance.file);
      if (!fs.existsSync(absolute)) {
        return true;
      }
      return !fs
        .readFileSync(absolute, 'utf8')
        .toLowerCase()
        .includes(allowance.identifier);
    });
    expect(stale.map((allowance) => allowance.file)).toEqual([]);
  });

  it('turns red when a core file names a tool', () => {
    // A guard nobody has seen fail is a guard nobody knows works. Write a file
    // into the core, prove it is caught, remove it.
    const probe = path.join(srcRoot, 'config', '__neutrality-probe.ts');
    fs.writeFileSync(probe, '// claude was here\nexport const probe = 1;\n');
    try {
      const violations = findViolations();
      expect(
        violations.some(
          (violation) =>
            violation.file === 'config/__neutrality-probe.ts' &&
            violation.identifier === 'claude',
        ),
      ).toBe(true);
    } finally {
      fs.rmSync(probe, { force: true });
    }
  });
});

describe('every adapter is attributable', () => {
  const adapterDirectories = fs
    .readdirSync(adaptersRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  it('has at least one adapter', () => {
    expect(adapterDirectories.length).toBeGreaterThan(0);
  });

  it.each(adapterDirectories)(
    '%s exports a *_SOURCE producer id from payload.ts',
    (adapter) => {
      const payload = path.join(adaptersRoot, adapter, 'payload.ts');
      expect(fs.existsSync(payload)).toBe(true);
      expect(fs.readFileSync(payload, 'utf8')).toMatch(
        /export const [A-Z0-9_]+_SOURCE\s*=/,
      );
    },
  );
});
