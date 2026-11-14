import { describe, expect, it } from 'vitest';

import { unwrapShellCommand } from '../tool-items.ts';

describe('unwrapShellCommand', () => {
  describe('a single-quoted login-shell command', () => {
    it('returns the inner command', () => {
      expect(
        unwrapShellCommand(`/bin/zsh -lc 'cat does-not-exist/missing.txt'`),
      ).toBe('cat does-not-exist/missing.txt');
    });

    it('restores escaped single quotes', () => {
      expect(unwrapShellCommand(`bash -lc 'echo '\\''hi'\\'''`)).toBe(
        `echo 'hi'`,
      );
    });
  });

  describe('a double-quoted login-shell command', () => {
    it('returns the inner command with its escapes undone', () => {
      expect(
        unwrapShellCommand(`/bin/zsh -lc "sed -n '1,240p' package.json"`),
      ).toBe(`sed -n '1,240p' package.json`);
      expect(unwrapShellCommand(`bash -lc "echo \\"\\$HOME\\""`)).toBe(
        `echo "$HOME"`,
      );
    });
  });

  describe('a bare single-word login-shell command', () => {
    it('returns the word', () => {
      expect(unwrapShellCommand('/bin/zsh -lc pwd')).toBe('pwd');
    });
  });

  describe('anything else', () => {
    it('is returned unchanged', () => {
      expect(unwrapShellCommand('git status')).toBe('git status');
    });
  });
});
