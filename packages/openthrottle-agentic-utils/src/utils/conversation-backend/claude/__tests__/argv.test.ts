import { describe, expect, it } from 'vitest';

import { buildClaudeArgv } from '../argv.ts';

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
});
