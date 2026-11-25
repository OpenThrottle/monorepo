import { describe, expect, it } from 'vitest';

import {
  fileMentionsPreamble,
  withFileMentions,
  withFileMentionsMessage,
} from '../file-mentions.ts';

describe('fileMentionsPreamble', () => {
  it('returns empty for undefined, empty, or all-blank input', () => {
    expect(fileMentionsPreamble(undefined)).toBe('');
    expect(fileMentionsPreamble([])).toBe('');
    expect(fileMentionsPreamble(['', '   '])).toBe('');
  });

  it('lists trimmed, deduped paths in first-seen order under a header', () => {
    const preamble = fileMentionsPreamble([
      ' src/app.ts ',
      'lib/util.ts',
      'src/app.ts',
    ]);

    expect(preamble).toBe(
      [
        'The user referenced these workspace files (paths relative to the repository root):',
        '- src/app.ts',
        '- lib/util.ts',
      ].join('\n'),
    );
  });

  it('caps the listed paths and collapses the overflow into a count', () => {
    const many = Array.from({ length: 105 }, (_, i) => `f${i}.ts`);
    const preamble = fileMentionsPreamble(many);
    const lines = preamble.split('\n');

    // 1 header + 100 listed + 1 overflow line.
    expect(lines).toHaveLength(102);
    expect(lines.at(-1)).toBe('- (+5 more)');
  });
});

describe('withFileMentions', () => {
  it('prepends the preamble to the prompt, separated by a blank line', () => {
    expect(withFileMentions('do it', ['a.ts'])).toBe(
      'The user referenced these workspace files (paths relative to the repository root):\n- a.ts\n\ndo it',
    );
  });

  it('returns the prompt unchanged when there are no mentions', () => {
    expect(withFileMentions('do it', undefined)).toBe('do it');
    expect(withFileMentions('do it', [])).toBe('do it');
  });
});

describe('withFileMentionsMessage', () => {
  it('prepends a system message carrying the preamble', () => {
    const messages = [{ content: 'hi', role: 'user' as const }];
    const result = withFileMentionsMessage(messages, ['a.ts']);

    expect(result).toHaveLength(2);
    expect(result[0]?.role).toBe('system');
    expect(result[0]?.content).toContain('- a.ts');
    expect(result[1]).toEqual({ content: 'hi', role: 'user' });
  });

  it('returns the same message list when there are no mentions', () => {
    const messages = [{ content: 'hi', role: 'user' as const }];
    expect(withFileMentionsMessage(messages, undefined)).toBe(messages);
  });
});
