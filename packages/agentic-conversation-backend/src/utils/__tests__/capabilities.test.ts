import { describe, expect, it, vi } from 'vitest';

import {
  maxDirectoriesForBackend,
  resolveChatBackendCapabilities,
  warnUnsupportedAdditionalDirectories,
} from '../capabilities.ts';

const ACP_ENV = { OPENTHROTTLE_CHAT_ACP_BACKENDS: 'cursor' };

const ALL_BACKENDS = [
  'antigravity',
  'claude',
  'codex',
  'cursor',
  'grok',
  'openai',
  'opencode',
];

describe('resolveChatBackendCapabilities (CLI paths)', () => {
  it('is headless everywhere: no approvals, steering, or image input', () => {
    for (const backend of ALL_BACKENDS) {
      expect(resolveChatBackendCapabilities(backend, {})).toMatchObject({
        approvals: false,
        editApprovals: false,
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

  it('replays full history for openai, which cannot resume', () => {
    expect(resolveChatBackendCapabilities('openai', {})).toMatchObject({
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
      editApprovals: false,
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
      editApprovals: false,
      imageInput: true,
      mcpInjection: true,
      replaysFullHistory: false,
      resume: true,
      steering: false,
    });
  });

  it('overlays antigravity with approvals that cover edits', () => {
    const env = { OPENTHROTTLE_CHAT_ACP_BACKENDS: 'antigravity' };

    expect(resolveChatBackendCapabilities('antigravity', env)).toEqual({
      approvals: true,
      editApprovals: true,
      imageInput: true,
      mcpInjection: true,
      replaysFullHistory: false,
      resume: true,
      steering: false,
    });
  });

  it('applies only to the backends the flag lists', () => {
    const env = { OPENTHROTTLE_CHAT_ACP_BACKENDS: 'cursor' };

    expect(resolveChatBackendCapabilities('cursor', env).approvals).toBe(true);
    // cursor's ACP agent mode applies edits without asking (probed 2026-11-11).
    expect(resolveChatBackendCapabilities('cursor', env).editApprovals).toBe(
      false,
    );
    expect(resolveChatBackendCapabilities('codex', env).approvals).toBe(false);
  });

  it('never overlays backends without an ACP spec, even with `all`', () => {
    const env = { OPENTHROTTLE_CHAT_ACP_BACKENDS: 'all' };

    expect(resolveChatBackendCapabilities('claude', env).approvals).toBe(false);
    expect(
      resolveChatBackendCapabilities('openai', env).replaysFullHistory,
    ).toBe(true);
  });
});

describe('maxDirectoriesForBackend', () => {
  it('lets the --add-dir-capable backends exceed one', () => {
    expect(maxDirectoriesForBackend('antigravity')).toBeGreaterThan(1);
    expect(maxDirectoriesForBackend('claude')).toBeGreaterThan(1);
  });

  it('caps every backend without a repeatable directory flag at one', () => {
    for (const backend of ['codex', 'cursor', 'grok', 'opencode']) {
      expect(maxDirectoriesForBackend(backend)).toBe(1);
    }
  });

  it('caps an unknown backend conservatively', () => {
    expect(maxDirectoriesForBackend('brand-new-cli')).toBe(1);
  });
});

describe('warnUnsupportedAdditionalDirectories', () => {
  it('warns naming the backend and the count', () => {
    const warn = vi.fn();
    warnUnsupportedAdditionalDirectories('cursor', ['/a', '/b'], warn);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('cursor');
    expect(warn.mock.calls[0]?.[0]).toContain('2');
  });

  it('stays silent for an absent or empty list', () => {
    const warn = vi.fn();
    warnUnsupportedAdditionalDirectories('cursor', undefined, warn);
    warnUnsupportedAdditionalDirectories('cursor', [], warn);

    expect(warn).not.toHaveBeenCalled();
  });
});
