import { describe, expect, test } from 'vitest';

import { applyLexicon } from '../lexicon';

describe('applyLexicon', () => {
  describe('when the written form is read', () => {
    test('speaks the verb as reed', () => {
      expect(applyLexicon('Your agent can read and write plans')).toBe(
        'Your agent can reed and write plans',
      );
    });

    test('leaves ready alone', () => {
      expect(applyLexicon('The plan and its tasks land, ready to run.')).toBe(
        'The plan and its tasks land, ready to run.',
      );
    });

    test('leaves already alone', () => {
      expect(applyLexicon('Agents already make plans')).toBe(
        'Agents already make plans',
      );
    });
  });

  describe('when the written form is an initialism', () => {
    test('still rewrites MCP and keeps a trailing s', () => {
      expect(applyLexicon('the OpenThrottle MCP')).toBe(
        'the Open Throttle M C P',
      );
      expect(applyLexicon('MCPs')).toBe('M C Ps');
    });
  });
});
