import { describe, expect, it } from 'vitest';

import { buildCursorAgentArgv } from '../argv.ts';

describe('buildCursorAgentArgv', () => {
  it('emits the verified headless+stream+resume flags with the prompt last', () => {
    expect(
      buildCursorAgentArgv({
        cwd: '/repo',
        prompt: 'do the thing',
        sessionId: 'chat-1',
      }),
    ).toEqual([
      '--print',
      '--output-format',
      'stream-json',
      '--stream-partial-output',
      '--workspace',
      '/repo',
      '--trust',
      '--resume',
      'chat-1',
      '--',
      'do the thing',
    ]);
  });

  it('includes --model only when a model is provided', () => {
    const withModel = buildCursorAgentArgv({
      cwd: '/repo',
      model: 'sonnet-4',
      prompt: 'p',
      sessionId: 'c',
    });
    expect(withModel).toContain('--model');
    expect(withModel[withModel.indexOf('--model') + 1]).toBe('sonnet-4');
    expect(withModel.at(-1)).toBe('p');
  });

  it('keeps shell metacharacters inside a single prompt element (no interpolation)', () => {
    const argv = buildCursorAgentArgv({
      cwd: '/repo',
      prompt: '"; rm -rf / #',
      sessionId: 'c',
    });
    // The dangerous string is exactly one argv element, never split or expanded.
    expect(argv.at(-1)).toBe('"; rm -rf / #');
    expect(argv.filter((part) => part.includes('rm -rf'))).toHaveLength(1);
  });

  it('inserts -- before the prompt so YAML frontmatter is not parsed as a flag', () => {
    const argv = buildCursorAgentArgv({
      cwd: '/repo',
      prompt: '---\nname: product\n---\n\nBe concise.',
      sessionId: 'c',
    });
    expect(argv.at(-2)).toBe('--');
    expect(argv.at(-1)).toBe('---\nname: product\n---\n\nBe concise.');
  });
});
