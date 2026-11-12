import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  findPositionalFilterHits,
  main,
} from '../check-test-file-filter-docs.ts';
import { run } from '../utils/exec.ts';

describe('check-test-file-filter-docs', () => {
  let repoRoot: string;

  const write = (path: string, contents: string): void => {
    const absolute = join(repoRoot, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents);
    run('git', ['-C', repoRoot, 'add', '--all']);
  };

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ot-testfilter-'));
    run('git', ['init', '--quiet', repoRoot]);
  });

  afterEach(() => {
    rmSync(repoRoot, { force: true, recursive: true });
  });

  describe('when a tracked file documents the positional form', () => {
    it.each([
      'pnpm nx run <project>:test -- path/to/file.test.ts',
      'pnpm nx run openthrottle-server:test -- \\',
      'pnpm nx test openthrottle-mcp -- src/run-server.test.ts',
    ])('flags %s', (line) => {
      write('docs/example.md', `${line}\n`);

      expect(findPositionalFilterHits(repoRoot)).toHaveLength(1);
      expect(main(repoRoot)).toBe(1);
    });
  });

  describe('when every example uses the working form', () => {
    it.each([
      'pnpm nx run <project>:test --testFile=path/to/file.test.ts',
      'pnpm nx run <project>:test --watch',
      'pnpm nx run <project>:test',
      'pnpm run database:migrate -- --database cms',
    ])('passes %s', (line) => {
      write('docs/example.md', `${line}\n`);

      expect(findPositionalFilterHits(repoRoot)).toEqual([]);
      expect(main(repoRoot)).toBe(0);
    });
  });

  describe('when the match is outside documentation', () => {
    it('ignores recorded .jsonl snapshots and untracked files', () => {
      write('data/conversation.jsonl', '{"text":"nx run p:test -- a.ts"}\n');
      writeFileSync(join(repoRoot, 'scratch.md'), 'nx run p:test -- a.ts\n');

      expect(findPositionalFilterHits(repoRoot)).toEqual([]);
    });
  });
});
