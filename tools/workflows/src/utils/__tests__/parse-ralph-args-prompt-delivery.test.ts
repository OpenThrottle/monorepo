/**
 * @description Tests for `--prompt-file` and `--prompt-stdin` in {@link parseRalphArgs}.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const PLAN_UUID = '77cb14a0-5eb0-4061-87ea-d618b85e8818';

describe('parseRalphArgs (prompt file / stdin)', () => {
  const originalArgv = process.argv;
  const originalIsTTY = process.stdin.isTTY;

  beforeEach(() => {
    delete process.env.WORKFLOW_RALPH_DEBUG;
    delete process.env.RALPH_DEBUG;
    delete process.env.WORKFLOW_RALPH_VERBOSE;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.stdin.isTTY = originalIsTTY;
  });

  it('loads prompt text from --prompt-file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-arg-'));
    const origCwd = process.cwd();
    try {
      writeFileSync(join(dir, 'body.md'), 'File prompt body', 'utf8');
      process.chdir(dir);
      const expectedLabel = resolve(process.cwd(), 'body.md');
      process.argv = [
        'node',
        'ralph.js',
        '--plan',
        PLAN_UUID,
        '--prompt-file',
        'body.md',
      ];
      const { parseRalphArgs } = await import('../parsers');
      const args = parseRalphArgs();
      expect(args.prompt).toBe('File prompt body');
      expect(args.promptProfileKind).toBe('file');
      expect(args.promptProfileLabel).toBe(expectedLabel);
    } finally {
      process.chdir(origCwd);
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('loads prompt text from multiple --prompt-file flags in order', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-arg-'));
    const origCwd = process.cwd();
    try {
      writeFileSync(
        join(dir, 'persona.md'),
        '---\nname: architect\ndescription: x\n---\n\n# Architect\n',
        'utf8',
      );
      writeFileSync(join(dir, 'skill.md'), '# Skill body\n', 'utf8');
      process.chdir(dir);
      const expectedLabel = [
        resolve(process.cwd(), 'persona.md'),
        resolve(process.cwd(), 'skill.md'),
      ].join(', ');
      process.argv = [
        'node',
        'ralph.js',
        '--plan',
        PLAN_UUID,
        '--prompt-file',
        'persona.md',
        '--prompt-file',
        'skill.md',
      ];
      const { parseRalphArgs } = await import('../parsers');
      const args = parseRalphArgs();
      expect(args.prompt).toBe('# Architect\n\n# Skill body');
      expect(args.promptProfileKind).toBe('file');
      expect(args.promptProfileLabel).toBe(expectedLabel);
    } finally {
      process.chdir(origCwd);
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('throws when --prompt-file path is empty', async () => {
    process.argv = [
      'node',
      'ralph.js',
      '--plan',
      PLAN_UUID,
      '--prompt-file',
      '   ',
    ];
    const { parseRalphArgs } = await import('../parsers');
    expect(() => parseRalphArgs()).toThrow(/non-empty path/);
  });

  it('throws when --prompt and --prompt-file are combined', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-arg-'));
    const origCwd = process.cwd();
    try {
      writeFileSync(join(dir, 'b.md'), 'x', 'utf8');
      process.chdir(dir);
      process.argv = [
        'node',
        'ralph.js',
        '--plan',
        PLAN_UUID,
        '--prompt',
        '/agents/x',
        '--prompt-file',
        'b.md',
      ];
      const { parseRalphArgs } = await import('../parsers');
      expect(() => parseRalphArgs()).toThrow(/cannot be combined/);
    } finally {
      process.chdir(origCwd);
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('throws when --prompt-stdin is used with a TTY', async () => {
    process.stdin.isTTY = true;
    process.argv = ['node', 'ralph.js', '--plan', PLAN_UUID, '--prompt-stdin'];
    const { parseRalphArgs } = await import('../parsers');
    expect(() => parseRalphArgs()).toThrow(/piped stdin \(not a TTY\)/);
  });
});
