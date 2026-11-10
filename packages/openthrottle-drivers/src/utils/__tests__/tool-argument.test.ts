/**
 * @description Unit tests for `formatToolLine`: one short argument per tool kind, one line, a hard
 * length cap, and a bare name wherever the input has nothing to show.
 */

import { describe, expect, it } from 'vitest';

import { formatToolLine } from '../tool-argument.ts';

const CWD = { cwd: '/work/repo' };

describe('formatToolLine', () => {
  describe.each(['Read', 'Edit', 'Write'])('%s', (tool) => {
    it('shows a path inside cwd relative to it', () => {
      expect(
        formatToolLine(tool, { file_path: '/work/repo/src/a.ts' }, CWD),
      ).toBe(`→ ${tool} src/a.ts`);
    });

    it('shows the last two segments of a path outside cwd', () => {
      expect(
        formatToolLine(tool, { file_path: '/elsewhere/deep/dir/argv.ts' }, CWD),
      ).toBe(`→ ${tool} dir/argv.ts`);
    });
  });

  describe('a relative path', () => {
    it('is left as given', () => {
      expect(formatToolLine('read', { path: 'src/a.ts' }, CWD)).toBe(
        '→ read src/a.ts',
      );
    });
  });

  describe('Bash', () => {
    it('shows a short command as is', () => {
      expect(formatToolLine('Bash', { command: 'pnpm nx test' }, CWD)).toBe(
        '→ Bash pnpm nx test',
      );
    });

    it('collapses a multi-line command to one line', () => {
      expect(
        formatToolLine('Bash', { command: 'git status\n\n  git diff' }, CWD),
      ).toBe('→ Bash git status git diff');
    });

    it('truncates a long command to 60 characters with an ellipsis', () => {
      const line = formatToolLine('Bash', { command: 'x'.repeat(200) }, CWD);

      expect(line).toBe(`→ Bash ${'x'.repeat(59)}…`);
      expect(line).not.toContain('\n');
    });
  });

  describe.each(['Grep', 'Glob'])('%s', (tool) => {
    it('shows the pattern', () => {
      expect(formatToolLine(tool, { pattern: '**/*.ts' }, CWD)).toBe(
        `→ ${tool} **/*.ts`,
      );
    });
  });

  describe('codex command_execution', () => {
    it('shows the item command', () => {
      expect(
        formatToolLine('command_execution', { command: 'ls -la' }, CWD),
      ).toBe('→ command_execution ls -la');
    });
  });

  describe('a tool with no mapped argument', () => {
    it('stays the bare name', () => {
      expect(formatToolLine('WebFetch', { url: 'https://x.dev' }, CWD)).toBe(
        '→ WebFetch',
      );
    });
  });

  describe('an input without the field, or that is not an object', () => {
    it('stays the bare name', () => {
      expect(formatToolLine('Read', {}, CWD)).toBe('→ Read');
      expect(formatToolLine('Read', null, CWD)).toBe('→ Read');
      expect(formatToolLine('Read', 'x', CWD)).toBe('→ Read');
      expect(formatToolLine('Read', { file_path: 3 }, CWD)).toBe('→ Read');
    });
  });

  describe('a very long path', () => {
    it('keeps its tail and stays within 100 characters', () => {
      const line = formatToolLine(
        'Read',
        { file_path: `${'a/'.repeat(100)}file.ts` },
        CWD,
      );

      expect(line.length).toBeLessThanOrEqual(100);
      expect(line.endsWith('file.ts')).toBe(true);
      expect(line).toContain('…');
    });
  });
});
