import { describe, expect, it } from 'vitest';

import { parseOutcomeArgs } from '../outcome-args.ts';

describe('parseOutcomeArgs', () => {
  it('returns no flags for an empty argv', () => {
    expect(parseOutcomeArgs([])).toEqual({});
  });

  describe('value flags', () => {
    it('pairs each flag with the token after it', () => {
      expect(
        parseOutcomeArgs([
          '--skill',
          'ot-plans',
          '--outcome',
          'success',
          '--duration-ms',
          '4200',
          '--session',
          'abc-123',
        ]),
      ).toEqual({
        'duration-ms': '4200',
        outcome: 'success',
        session: 'abc-123',
        skill: 'ot-plans',
      });
    });

    it('takes a single-dash token as a value, not a flag', () => {
      expect(parseOutcomeArgs(['--duration-ms', '-1'])).toEqual({
        'duration-ms': '-1',
      });
    });

    it('takes an empty string as a value', () => {
      expect(parseOutcomeArgs(['--session', ''])).toEqual({ session: '' });
    });

    it('keeps the last value of a repeated flag', () => {
      expect(
        parseOutcomeArgs(['--outcome', 'error', '--outcome', 'success']),
      ).toEqual({ outcome: 'success' });
    });

    it('does not split --flag=value', () => {
      expect(parseOutcomeArgs(['--outcome=success'])).toEqual({
        'outcome=success': '1',
      });
    });
  });

  describe('bare flags', () => {
    it("reads a trailing flag with no value as '1'", () => {
      expect(parseOutcomeArgs(['--skill', 'ot-plans', '--dry-run'])).toEqual({
        'dry-run': '1',
        skill: 'ot-plans',
      });
    });

    it("reads a flag followed by another flag as '1' and still parses the next", () => {
      expect(parseOutcomeArgs(['--verbose', '--outcome', 'success'])).toEqual({
        outcome: 'success',
        verbose: '1',
      });
    });

    it("reads consecutive bare flags each as '1'", () => {
      expect(parseOutcomeArgs(['--a', '--b', '--c'])).toEqual({
        a: '1',
        b: '1',
        c: '1',
      });
    });
  });

  describe('stray positionals', () => {
    it('skips tokens before the first flag', () => {
      expect(
        parseOutcomeArgs(['stray', 'more', '--skill', 'ot-plans']),
      ).toEqual({ skill: 'ot-plans' });
    });

    it('skips a token left over after a flag has taken its value', () => {
      expect(
        parseOutcomeArgs([
          '--skill',
          'ot-plans',
          'extra',
          '--outcome',
          'error',
        ]),
      ).toEqual({ outcome: 'error', skill: 'ot-plans' });
    });

    it('skips empty-string tokens that no flag consumes', () => {
      expect(parseOutcomeArgs(['', '--skill', 'ot-plans'])).toEqual({
        skill: 'ot-plans',
      });
    });
  });
});
