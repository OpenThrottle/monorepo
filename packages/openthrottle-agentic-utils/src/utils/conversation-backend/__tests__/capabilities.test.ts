import { describe, expect, it } from 'vitest';

import { resolveChatBackendCapabilities } from '../capabilities.ts';

const ACP_ENV = { OPENTHROTTLE_CHAT_ACP_BACKENDS: 'cursor,gemini' };

const ALL_BACKENDS = [
  'antigravity',
  'claude',
  'codex',
  'cursor',
  'gemini',
  'grok',
  'openai',
  'opencode',
];

describe('resolveChatBackendCapabilities (CLI paths)', () => {
  it('is headless everywhere: no approvals, steering, or image input', () => {
    for (const backend of ALL_BACKENDS) {
      expect(resolveChatBackendCapabilities(backend, {})).toMatchObject({
        approvals: false,
        imageInput: false,
        steering: false,
      });
    }
  });

  it('resumes by session id for claude, cursor, codex, grok, opencode and antigravity', () => {
    const resumable = ALL_BACKENDS.filter((backend) => {
      return resolveChatBackendCapabilities(backend, {}).resume;
    });

    expect(resumable).toEqual([
      'antigravity',
      'claude',
      'codex',
      'cursor',
      'grok',
      'opencode',
    ]);
  });

  it('replays full history for openai and CLI gemini, which cannot resume', () => {
    expect(resolveChatBackendCapabilities('openai', {})).toMatchObject({
      replaysFullHistory: true,
      resume: false,
    });
    expect(resolveChatBackendCapabilities('gemini', {})).toMatchObject({
      replaysFullHistory: true,
      resume: false,
    });
  });

  it('injects MCP only where the adapter consumes run.mcpServers', () => {
    const injecting = ALL_BACKENDS.filter((backend) => {
      return resolveChatBackendCapabilities(backend, {}).mcpInjection;
    });

    expect(injecting).toEqual(['claude', 'opencode']);
  });

  it('resolves an unknown backend to all false', () => {
    expect(resolveChatBackendCapabilities('nope', ACP_ENV)).toEqual({
      approvals: false,
      imageInput: false,
      mcpInjection: false,
      replaysFullHistory: false,
      resume: false,
      steering: false,
    });
  });
});

describe('resolveChatBackendCapabilities (ACP overlay)', () => {
  it('overlays cursor with approvals, resume, MCP injection and image input', () => {
    expect(resolveChatBackendCapabilities('cursor', ACP_ENV)).toEqual({
      approvals: true,
      imageInput: true,
      mcpInjection: true,
      replaysFullHistory: false,
      resume: true,
      steering: false,
    });
  });

  it('overlays gemini, which stops replaying history and has no image input', () => {
    expect(resolveChatBackendCapabilities('gemini', ACP_ENV)).toEqual({
      approvals: true,
      imageInput: false,
      mcpInjection: true,
      replaysFullHistory: false,
      resume: true,
      steering: false,
    });
  });

  it('applies only to the backends the flag lists', () => {
    const env = { OPENTHROTTLE_CHAT_ACP_BACKENDS: 'cursor' };

    expect(resolveChatBackendCapabilities('cursor', env).approvals).toBe(true);
    expect(resolveChatBackendCapabilities('gemini', env).approvals).toBe(false);
  });

  it('never overlays backends without an ACP spec, even with `all`', () => {
    const env = { OPENTHROTTLE_CHAT_ACP_BACKENDS: 'all' };

    expect(resolveChatBackendCapabilities('claude', env).approvals).toBe(false);
    expect(
      resolveChatBackendCapabilities('openai', env).replaysFullHistory,
    ).toBe(true);
  });
});
