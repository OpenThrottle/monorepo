import { describe, expect, it } from 'vitest';

import {
  commandLineOf,
  decide,
  globToRegExp,
  parseDenyRules,
  splitCommandSegments,
} from '../antigravity-deny-hook.ts';

const DENY = [
  'git push*main*',
  'git push*--force *',
  'git push*--force',
  'git push*-f *',
  'git push*+*',
];

describe('splitCommandSegments', () => {
  it('splits chained commands and drops empties', () => {
    expect(splitCommandSegments('cd x && git push ; (git log) | cat\n')).toEqual(['cd x', 'git push', 'git log)', 'cat']); // prettier-ignore
  });
});

describe('globToRegExp', () => {
  it('treats * as any run of characters and the rest literally', () => {
    expect(globToRegExp('git push*main*').test('git push origin main')).toBe(true); // prettier-ignore
    expect(globToRegExp('a.b').test('axb')).toBe(false);
  });
});

describe('decide', () => {
  describe('when a chained command matches a deny glob', () => {
    it.each([
      'git push origin main',
      'git push -u origin main',
      'cd sub && git push origin HEAD:main',
      'git push --force',
      'git push origin --force feat',
      'git push -f origin feat',
      'git push origin +feat',
    ])('denies %s', (commandLine) => {
      const result = decide(commandLine, DENY);

      expect(result.decision).toBe('deny');
      expect(result.reason).toContain('.agents/agent-config.json');
    });
  });

  describe('when nothing matches', () => {
    it.each([
      'git status --short',
      'git push origin feat/x',
      'git push --force-with-lease origin feat/x',
      'echo main',
    ])('defers %s to agy with ask', (commandLine) => {
      expect(decide(commandLine, DENY)).toEqual({ decision: 'ask', reason: undefined }); // prettier-ignore
    });
  });
});

describe('commandLineOf', () => {
  it('reads toolCall.args.CommandLine', () => {
    expect(commandLineOf({ toolCall: { args: { CommandLine: 'ls' } } })).toBe('ls'); // prettier-ignore
  });

  it('is undefined for any other payload', () => {
    expect(commandLineOf({ toolCall: { args: {} } })).toBeUndefined();
    expect(commandLineOf(null)).toBeUndefined();
  });
});

describe('parseDenyRules', () => {
  it('returns the deny globs', () => {
    expect(parseDenyRules('{"deny":["a*"]}')).toEqual(['a*']);
  });

  it('rejects a non-string entry', () => {
    expect(parseDenyRules('{"deny":[1]}')).toBeUndefined();
  });
});
