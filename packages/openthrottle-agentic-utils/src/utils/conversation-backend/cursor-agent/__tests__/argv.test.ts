import { describe, expect, it } from 'vitest';

import { buildCursorAgentArgv } from '../argv.ts';
import { CONVERSATION_PERMISSION_MODES } from '../../types.ts';

/** The value after a flag, or undefined when the flag is absent. */
const valueAfter = (
  argv: readonly string[],
  flag: string,
): string | undefined =>
  argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined;

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

  describe('permission mode → --force', () => {
    it('fullAccess adds --force on top of the always-on --trust', () => {
      const argv = buildCursorAgentArgv({
        cwd: '/repo',
        permissionMode: CONVERSATION_PERMISSION_MODES.fullAccess,
        prompt: 'p',
        sessionId: 'c',
      });
      expect(argv).toContain('--trust');
      expect(argv).toContain('--force');
    });

    it('supervised/autoAcceptEdits/no-mode stay trust-only (no --force)', () => {
      for (const permissionMode of [
        CONVERSATION_PERMISSION_MODES.supervised,
        CONVERSATION_PERMISSION_MODES.autoAcceptEdits,
        undefined,
      ]) {
        const argv = buildCursorAgentArgv({
          cwd: '/repo',
          permissionMode,
          prompt: 'p',
          sessionId: 'c',
        });
        expect(argv).toContain('--trust');
        expect(argv).not.toContain('--force');
      }
    });
  });

  describe('model id (reasoning/tier are baked into the id, not composed)', () => {
    it('passes a concrete suffixed model id through verbatim', () => {
      // cursor `models` already lists reasoning/tier-encoded ids.
      expect(
        valueAfter(
          buildCursorAgentArgv({
            cwd: '/repo',
            model: 'claude-opus-4-8-high-fast',
            prompt: 'p',
            sessionId: 'c',
          }),
          '--model',
        ),
      ).toBe('claude-opus-4-8-high-fast');
    });

    it('never appends a `[…]` bracket suffix (rejected by cursor at run time)', () => {
      // `auto` is the regression case: `auto[fast=false]` was rejected.
      const argv = buildCursorAgentArgv({
        cwd: '/repo',
        model: 'auto',
        prompt: 'p',
        sessionId: 'c',
      });
      expect(valueAfter(argv, '--model')).toBe('auto');
      expect(argv.every((part) => !part.includes('['))).toBe(true);
    });
  });
});
