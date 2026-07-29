import { describe, expect, it } from 'vitest';

import { buildCodexArgv } from '../argv.ts';
import {
  CONVERSATION_PERMISSION_MODES,
  CONVERSATION_REASONING_EFFORTS,
} from '../../types.ts';

/** The value after a flag, or undefined when the flag is absent. */
const valueAfter = (
  argv: readonly string[],
  flag: string,
): string | undefined =>
  argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined;

describe('buildCodexArgv', () => {
  it('starts a fresh `exec` turn with --json and a read-only sandbox by default', () => {
    const argv = buildCodexArgv({ prompt: 'hello', resume: false });

    expect(argv).toEqual([
      'exec',
      '--json',
      '--skip-git-repo-check',
      '--sandbox',
      'read-only',
      '--',
      'hello',
    ]);
  });

  it('resumes via `exec resume <id>` with the prompt after the `--` marker', () => {
    const argv = buildCodexArgv({
      prompt: 'again',
      resume: true,
      sessionId: 'thread-1',
    });

    expect(argv.slice(0, 2)).toEqual(['exec', 'resume']);
    // Session id then prompt are the two positionals after the terminator.
    expect(argv.slice(-3)).toEqual(['--', 'thread-1', 'again']);
  });

  it('throws when resuming without a session id', () => {
    expect(() =>
      buildCodexArgv({ prompt: 'x', resume: true, sessionId: '  ' }),
    ).toThrow('requires a sessionId');
  });

  it('adds --model when provided, omits it for blank/auto', () => {
    expect(
      valueAfter(
        buildCodexArgv({ model: 'gpt-5-codex', prompt: 'p', resume: false }),
        '--model',
      ),
    ).toBe('gpt-5-codex');
    expect(
      buildCodexArgv({ model: 'auto', prompt: 'p', resume: false }),
    ).not.toContain('--model');
    expect(
      buildCodexArgv({ model: '', prompt: 'p', resume: false }),
    ).not.toContain('--model');
  });

  it('keeps the prompt last, after a `--` terminator (guards a leading-dash prompt)', () => {
    const argv = buildCodexArgv({ prompt: '--not-a-flag', resume: false });
    expect(argv.at(-2)).toBe('--');
    expect(argv.at(-1)).toBe('--not-a-flag');
  });

  describe('local endpoint (baseUrl)', () => {
    it('adds --oss + --local-provider ollama + a quoted base_url override', () => {
      const argv = buildCodexArgv({
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama3',
        prompt: 'p',
        resume: false,
      });

      expect(argv).toContain('--oss');
      expect(valueAfter(argv, '--local-provider')).toBe('ollama');
      expect(valueAfter(argv, '-c')).toBe(
        'model_providers.oss.base_url="http://localhost:11434/v1"',
      );
      expect(valueAfter(argv, '--model')).toBe('llama3');
    });

    it('omits the endpoint flags when no baseUrl is set', () => {
      const argv = buildCodexArgv({ prompt: 'p', resume: false });
      expect(argv).not.toContain('--oss');
      expect(argv).not.toContain('-c');
    });
  });

  describe('permission mode → sandbox policy', () => {
    it('fullAccess → --dangerously-bypass-approvals-and-sandbox (no --sandbox)', () => {
      const argv = buildCodexArgv({
        permissionMode: CONVERSATION_PERMISSION_MODES.fullAccess,
        prompt: 'p',
        resume: false,
      });
      expect(argv).toContain('--dangerously-bypass-approvals-and-sandbox');
      expect(argv).not.toContain('--sandbox');
    });

    it('autoAcceptEdits → --sandbox workspace-write', () => {
      const argv = buildCodexArgv({
        permissionMode: CONVERSATION_PERMISSION_MODES.autoAcceptEdits,
        prompt: 'p',
        resume: false,
      });
      expect(valueAfter(argv, '--sandbox')).toBe('workspace-write');
    });

    it('supervised → --sandbox read-only', () => {
      const argv = buildCodexArgv({
        permissionMode: CONVERSATION_PERMISSION_MODES.supervised,
        prompt: 'p',
        resume: false,
      });
      expect(valueAfter(argv, '--sandbox')).toBe('read-only');
    });
  });

  describe('reasoning effort → -c model_reasoning_effort', () => {
    const effortFor = (
      reasoning: (typeof CONVERSATION_REASONING_EFFORTS)[keyof typeof CONVERSATION_REASONING_EFFORTS],
    ): string | undefined =>
      valueAfter(
        buildCodexArgv({ prompt: 'p', reasoning, resume: false }),
        '-c',
      );

    it('maps low/medium straight through', () => {
      expect(effortFor(CONVERSATION_REASONING_EFFORTS.low)).toBe(
        'model_reasoning_effort=low',
      );
      expect(effortFor(CONVERSATION_REASONING_EFFORTS.medium)).toBe(
        'model_reasoning_effort=medium',
      );
    });

    it('caps high/extraHigh/max/ultra at high (OpenAI ceiling)', () => {
      for (const level of [
        CONVERSATION_REASONING_EFFORTS.high,
        CONVERSATION_REASONING_EFFORTS.extraHigh,
        CONVERSATION_REASONING_EFFORTS.max,
        CONVERSATION_REASONING_EFFORTS.ultra,
      ]) {
        expect(effortFor(level)).toBe('model_reasoning_effort=high');
      }
    });

    it('omits the override when no reasoning level is given, prompt stays last', () => {
      const argv = buildCodexArgv({ prompt: 'p', resume: false });
      expect(argv).not.toContain('-c');
      expect(argv.at(-1)).toBe('p');
    });
  });
});
