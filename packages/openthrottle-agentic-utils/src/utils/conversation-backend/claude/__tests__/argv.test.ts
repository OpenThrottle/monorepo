import { describe, expect, it } from 'vitest';

import { buildClaudeArgv } from '../argv.ts';
import {
  CONVERSATION_PERMISSION_MODES,
  CONVERSATION_REASONING_EFFORTS,
} from '../../types.ts';

const MCP_SERVERS = {
  'openthrottle-mcp': {
    args: ['./scripts/run-openthrottle-mcp.sh'],
    command: 'bash',
  },
} as const;

/** The value after a flag, or undefined when the flag is absent. */
const valueAfter = (
  argv: readonly string[],
  flag: string,
): string | undefined =>
  argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined;

describe('buildClaudeArgv', () => {
  it('creates the session with --session-id on the first turn', () => {
    const argv = buildClaudeArgv({
      prompt: 'hello',
      resume: false,
      sessionId: 'sid-1',
    });

    expect(argv).toEqual([
      '--print',
      '--output-format',
      'stream-json',
      '--include-partial-messages',
      '--verbose',
      '--session-id',
      'sid-1',
      '--',
      'hello',
    ]);
  });

  it('resumes with --resume on later turns', () => {
    const argv = buildClaudeArgv({
      prompt: 'again',
      resume: true,
      sessionId: 'sid-1',
    });

    expect(argv).toContain('--resume');
    expect(argv).not.toContain('--session-id');
    expect(argv.slice(-2)).toEqual(['--', 'again']);
  });

  it('adds --model and --append-system-prompt when provided, prompt stays last', () => {
    const argv = buildClaudeArgv({
      model: 'claude-opus-4-8',
      prompt: '---\nfrontmatter\n---\ndo it',
      resume: false,
      sessionId: 'sid-1',
      systemPrompt: 'You are the Architect.',
    });

    expect(argv).toContain('--model');
    expect(argv[argv.indexOf('--model') + 1]).toBe('claude-opus-4-8');
    expect(argv).toContain('--append-system-prompt');
    expect(argv[argv.indexOf('--append-system-prompt') + 1]).toBe(
      'You are the Architect.',
    );
    // The `--` terminator guards a prompt that itself starts with `---`.
    expect(argv.at(-2)).toBe('--');
    expect(argv.at(-1)).toBe('---\nfrontmatter\n---\ndo it');
  });

  it('omits --model and --append-system-prompt when blank', () => {
    const argv = buildClaudeArgv({
      model: '',
      prompt: 'hi',
      resume: false,
      sessionId: 'sid-1',
      systemPrompt: '   ',
    });

    expect(argv).not.toContain('--model');
    expect(argv).not.toContain('--append-system-prompt');
  });

  it('injects --mcp-config (inline JSON) + --strict-mcp-config when mcpServers are given, before the prompt', () => {
    const argv = buildClaudeArgv({
      mcpServers: {
        'openthrottle-mcp': {
          args: ['./scripts/run-openthrottle-mcp.sh'],
          command: 'bash',
        },
      },
      prompt: 'do it',
      resume: false,
      sessionId: 'sid-1',
    });

    const flagIndex = argv.indexOf('--mcp-config');
    expect(flagIndex).toBeGreaterThanOrEqual(0);
    expect(JSON.parse(argv[flagIndex + 1] ?? '')).toEqual({
      mcpServers: {
        'openthrottle-mcp': {
          args: ['./scripts/run-openthrottle-mcp.sh'],
          command: 'bash',
        },
      },
    });
    expect(argv).toContain('--strict-mcp-config');
    // MCP flags must precede the `--` terminator + prompt.
    expect(flagIndex).toBeLessThan(argv.indexOf('--'));
    expect(argv.at(-1)).toBe('do it');
  });

  it('omits MCP flags when mcpServers is absent or empty', () => {
    expect(
      buildClaudeArgv({ prompt: 'hi', resume: false, sessionId: 'sid-1' }),
    ).not.toContain('--mcp-config');
    expect(
      buildClaudeArgv({
        mcpServers: {},
        prompt: 'hi',
        resume: false,
        sessionId: 'sid-1',
      }),
    ).not.toContain('--mcp-config');
  });

  describe('permission mode', () => {
    it('default (no mode): scopes --allowedTools to the injected MCP servers, no --permission-mode', () => {
      const argv = buildClaudeArgv({
        mcpServers: MCP_SERVERS,
        prompt: 'do it',
        resume: false,
        sessionId: 'sid-1',
      });

      expect(valueAfter(argv, '--allowedTools')).toBe(
        'mcp__openthrottle-mcp__*',
      );
      expect(argv).not.toContain('--permission-mode');
      // The grant must precede the `--` terminator + prompt.
      expect(argv.indexOf('--allowedTools')).toBeLessThan(argv.indexOf('--'));
      expect(argv.at(-1)).toBe('do it');
    });

    it('supervised: same scoped allowlist as the default, no --permission-mode', () => {
      const argv = buildClaudeArgv({
        mcpServers: MCP_SERVERS,
        permissionMode: CONVERSATION_PERMISSION_MODES.supervised,
        prompt: 'do it',
        resume: false,
        sessionId: 'sid-1',
      });

      expect(valueAfter(argv, '--allowedTools')).toBe(
        'mcp__openthrottle-mcp__*',
      );
      expect(argv).not.toContain('--permission-mode');
    });

    it('autoAcceptEdits: emits --permission-mode acceptEdits AND the scoped allowlist', () => {
      const argv = buildClaudeArgv({
        mcpServers: MCP_SERVERS,
        permissionMode: CONVERSATION_PERMISSION_MODES.autoAcceptEdits,
        prompt: 'do it',
        resume: false,
        sessionId: 'sid-1',
      });

      expect(valueAfter(argv, '--permission-mode')).toBe('acceptEdits');
      expect(valueAfter(argv, '--allowedTools')).toBe(
        'mcp__openthrottle-mcp__*',
      );
    });

    it('fullAccess: emits --permission-mode bypassPermissions and NO allowlist', () => {
      const argv = buildClaudeArgv({
        mcpServers: MCP_SERVERS,
        permissionMode: CONVERSATION_PERMISSION_MODES.fullAccess,
        prompt: 'do it',
        resume: false,
        sessionId: 'sid-1',
      });

      expect(valueAfter(argv, '--permission-mode')).toBe('bypassPermissions');
      expect(argv).not.toContain('--allowedTools');
    });

    it('joins the allowlist across multiple injected servers with commas', () => {
      const argv = buildClaudeArgv({
        mcpServers: { alpha: { command: 'a' }, beta: { command: 'b' } },
        prompt: 'do it',
        resume: false,
        sessionId: 'sid-1',
      });

      expect(valueAfter(argv, '--allowedTools')).toBe(
        'mcp__alpha__*,mcp__beta__*',
      );
    });

    it('adds no permission flags when there are no MCP servers to allow', () => {
      const argv = buildClaudeArgv({
        permissionMode: CONVERSATION_PERMISSION_MODES.supervised,
        prompt: 'do it',
        resume: false,
        sessionId: 'sid-1',
      });

      expect(argv).not.toContain('--allowedTools');
      expect(argv).not.toContain('--permission-mode');
    });
  });

  describe('reasoning effort', () => {
    const effortFor = (
      reasoning: (typeof CONVERSATION_REASONING_EFFORTS)[keyof typeof CONVERSATION_REASONING_EFFORTS],
    ): string | undefined =>
      valueAfter(
        buildClaudeArgv({
          prompt: 'do it',
          reasoning,
          resume: false,
          sessionId: 'sid-1',
        }),
        '--effort',
      );

    it('maps low/medium/high straight through to --effort', () => {
      expect(effortFor(CONVERSATION_REASONING_EFFORTS.low)).toBe('low');
      expect(effortFor(CONVERSATION_REASONING_EFFORTS.medium)).toBe('medium');
      expect(effortFor(CONVERSATION_REASONING_EFFORTS.high)).toBe('high');
    });

    it('maps extraHigh → xhigh and (max, ultra) → max (claude vocab)', () => {
      expect(effortFor(CONVERSATION_REASONING_EFFORTS.extraHigh)).toBe('xhigh');
      expect(effortFor(CONVERSATION_REASONING_EFFORTS.max)).toBe('max');
      expect(effortFor(CONVERSATION_REASONING_EFFORTS.ultra)).toBe('max');
    });

    it('omits --effort when no reasoning level is given, prompt stays last', () => {
      const argv = buildClaudeArgv({
        prompt: 'do it',
        resume: false,
        sessionId: 'sid-1',
      });

      expect(argv).not.toContain('--effort');
      expect(argv.at(-1)).toBe('do it');
    });
  });
});
