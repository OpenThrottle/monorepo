/**
 * Prompt-flattening tests for the gemini backend: gemini 0.25.2 has no
 * id-based resume, so persona + prior turns are folded into the one-shot
 * prompt the adapter pipes through stdin.
 */

import { describe, expect, it } from 'vitest';

import type { ConversationBackendRun } from '../../types.ts';
import { buildGeminiPrompt } from '../gemini.ts';

const run = (
  extra: Partial<ConversationBackendRun>,
): ConversationBackendRun => ({
  messages: [{ content: 'hello', role: 'user' }],
  model: 'gemini-2.5-pro',
  ...extra,
});

describe('buildGeminiPrompt', () => {
  it('uses the latest user message alone on a first turn', () => {
    expect(buildGeminiPrompt(run({}))).toBe('hello');
  });

  it('prefixes the persona system prompt (no --system flag exists)', () => {
    expect(buildGeminiPrompt(run({ systemPrompt: 'Be terse.' }))).toBe(
      'Be terse.\n\nhello',
    );
  });

  it('flattens prior turns into a transcript preamble (no id-based resume)', () => {
    const prompt = buildGeminiPrompt(
      run({
        messages: [
          { content: 'first question', role: 'user' },
          { content: 'first answer', role: 'assistant' },
          { content: 'second question', role: 'user' },
        ],
      }),
    );
    expect(prompt).toBe(
      'Previous conversation (for context):\nUser: first question\n\nAssistant: first answer\n\nsecond question',
    );
  });

  it('injects the file-mention preamble ahead of the latest message', () => {
    const prompt = buildGeminiPrompt(run({ fileMentions: ['src/a.ts'] }));
    expect(prompt).toContain('- src/a.ts');
    expect(prompt.endsWith('hello')).toBe(true);
  });
});
