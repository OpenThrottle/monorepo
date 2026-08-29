/**
 * @description Guards against documenting a worktree knob into existence. Two names
 * (`OPENTHROTTLE_WORKTREE_ROOT_FILE` and `OT_WORKTREE_ROOT`) sat in the env-var tables as live
 * configuration while being read by nothing at all — anyone who set them was silently ignored, and
 * nothing in the build noticed. Docs and the code that reads them are different runtimes with no
 * import between them, so only a test can hold them together.
 *
 * Sibling of `worktree-root-default.test.ts`, which pins the default's *value* across the same
 * boundary; this one pins the *set of names*. Scope is deliberately `OPENTHROTTLE_WORKTREE_*` only:
 * a general "every documented env var must exist" audit is a bigger, noisier idea and belongs in
 * its own change.
 *
 * Deliberately in its own file: the sibling resolver test mocks `node:fs`, which would also
 * intercept the real reads below.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '../../../../..');

const WORKTREE_ENV_PATTERN = /OPENTHROTTLE_WORKTREE_[A-Z0-9_]+/g;

/**
 * The files that state what a reader may configure. A name appearing here is a promise.
 */
const DOCUMENTING_FILES = [
  'docs/monorepo/environment-variables.md',
  'skills/ot-worktree/references/contract.md',
];

/**
 * Where that promise has to be kept. `root.sh` resolves the root ladder, its sibling scripts
 * (create/heal/destroy and the provisioning helpers) read the rest, and the server mirrors the
 * ladder in TypeScript. A name absent from all of them is implemented nowhere.
 */
const IMPLEMENTING_TREES = [
  'skills/ot-worktree/scripts',
  'applications/openthrottle-server/src',
];

const read = (relativePath: string): string =>
  readFileSync(join(REPO_ROOT, relativePath), 'utf-8');

const namesIn = (relativePath: string): readonly string[] => [
  ...new Set(read(relativePath).match(WORKTREE_ENV_PATTERN) ?? []),
];

const implementedNames = (): ReadonlySet<string> => {
  const found = new Set<string>();

  for (const tree of IMPLEMENTING_TREES) {
    const entries = readdirSync(join(REPO_ROOT, tree), {
      recursive: true,
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      // Skip this guard and the docs-side fixtures, so a name never counts as implemented
      // merely because a test mentions it.
      if (entry.name.endsWith('.test.ts')) {
        continue;
      }

      const contents = readFileSync(
        join(entry.parentPath, entry.name),
        'utf-8',
      );
      for (const name of contents.match(WORKTREE_ENV_PATTERN) ?? []) {
        found.add(name);
      }
    }
  }

  return found;
};

describe('documented OPENTHROTTLE_WORKTREE_* variables', () => {
  const implemented = implementedNames();

  for (const documentingFile of DOCUMENTING_FILES) {
    it(`are all implemented — ${documentingFile}`, () => {
      const phantoms = namesIn(documentingFile).filter(
        (name) => !implemented.has(name),
      );

      expect(
        phantoms,
        `${documentingFile} documents ${phantoms.join(', ')} as configuration, but ${
          phantoms.length === 1 ? 'it is' : 'they are'
        } read by nothing under ${IMPLEMENTING_TREES.join(' or ')}. Either implement it or delete the row — a documented knob that does nothing is worse than an undocumented one.`,
      ).toEqual([]);
    });
  }
});
