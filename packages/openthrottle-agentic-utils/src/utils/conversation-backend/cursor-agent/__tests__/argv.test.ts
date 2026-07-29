import { describe, expect, it } from 'vitest';

import { buildCursorAgentArgv } from '../argv.ts';
import {
  CONVERSATION_REASONING_EFFORTS,
  CONVERSATION_SERVICE_TIERS,
} from '../../types.ts';

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

  describe('reasoning + service tier → model-string bracket', () => {
    it('appends [effort=…] to the model when reasoning is set', () => {
      const argv = buildCursorAgentArgv({
        cwd: '/repo',
        model: 'sonnet-4',
        prompt: 'p',
        reasoning: CONVERSATION_REASONING_EFFORTS.high,
        sessionId: 'c',
      });
      expect(valueAfter(argv, '--model')).toBe('sonnet-4[effort=high]');
    });

    it('appends [fast=true] for the fast tier and [fast=false] for standard', () => {
      expect(
        valueAfter(
          buildCursorAgentArgv({
            cwd: '/repo',
            model: 'sonnet-4',
            prompt: 'p',
            serviceTier: CONVERSATION_SERVICE_TIERS.fast,
            sessionId: 'c',
          }),
          '--model',
        ),
      ).toBe('sonnet-4[fast=true]');
      expect(
        valueAfter(
          buildCursorAgentArgv({
            cwd: '/repo',
            model: 'sonnet-4',
            prompt: 'p',
            serviceTier: CONVERSATION_SERVICE_TIERS.standard,
            sessionId: 'c',
          }),
          '--model',
        ),
      ).toBe('sonnet-4[fast=false]');
    });

    it('combines effort + fast in one bracket, effort first', () => {
      const argv = buildCursorAgentArgv({
        cwd: '/repo',
        model: 'sonnet-4',
        prompt: 'p',
        reasoning: CONVERSATION_REASONING_EFFORTS.max,
        serviceTier: CONVERSATION_SERVICE_TIERS.fast,
        sessionId: 'c',
      });
      // max clamps to high in cursor's effort vocabulary.
      expect(valueAfter(argv, '--model')).toBe(
        'sonnet-4[effort=high,fast=true]',
      );
    });

    it('drops reasoning/tier silently when no model is selected (bracket needs a model)', () => {
      const argv = buildCursorAgentArgv({
        cwd: '/repo',
        prompt: 'p',
        reasoning: CONVERSATION_REASONING_EFFORTS.high,
        serviceTier: CONVERSATION_SERVICE_TIERS.fast,
        sessionId: 'c',
      });
      expect(argv).not.toContain('--model');
    });

    it('leaves the model bare when neither reasoning nor tier is set', () => {
      expect(
        valueAfter(
          buildCursorAgentArgv({
            cwd: '/repo',
            model: 'sonnet-4',
            prompt: 'p',
            sessionId: 'c',
          }),
          '--model',
        ),
      ).toBe('sonnet-4');
    });
  });
});
