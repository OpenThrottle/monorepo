/**
 * Unit tests for the pure pieces of the ACP backend: update mapping, MCP
 * server conversion, the headless permission policy, the feature flag, and the
 * per-agent session-mode shims.
 */

import type { RequestPermissionRequest } from '@agentclientprotocol/sdk';
import { describe, expect, it } from 'vitest';

import type { ConversationPermissionMode } from '../../types.ts';
import { ACP_AGENT_SPECS } from '../agent-specs.ts';
import { acpTerminalChunk, createAcpUpdateMapper } from '../events.ts';
import { decideAcpPermission } from '../permissions.ts';
import { CHAT_ACP_BACKENDS_ENV, isAcpChatEnabled } from '../routing.ts';
import { toAcpMcpServers } from '../toAcpMcpServers.ts';

describe('createAcpUpdateMapper', () => {
  it('maps message and thought chunks to text and thinking', () => {
    const map = createAcpUpdateMapper();

    expect(
      map({
        content: { text: 'hi', type: 'text' },
        sessionUpdate: 'agent_message_chunk',
      }),
    ).toEqual([{ delta: 'hi', done: false, kind: 'text' }]);
    expect(
      map({
        content: { text: 'hmm', type: 'text' },
        sessionUpdate: 'agent_thought_chunk',
      }),
    ).toEqual([{ delta: 'hmm', done: false, kind: 'thinking' }]);
  });

  it('holds a tool call until its input is known, then emits call and result once', () => {
    const map = createAcpUpdateMapper();

    const announced = map({
      kind: 'edit',
      rawInput: {},
      sessionUpdate: 'tool_call',
      status: 'pending',
      title: 'Edit File',
      toolCallId: 'c1',
    });
    const filled = map({
      rawInput: { path: '/w/a.txt' },
      sessionUpdate: 'tool_call_update',
      toolCallId: 'c1',
    });
    const running = map({
      sessionUpdate: 'tool_call_update',
      status: 'in_progress',
      toolCallId: 'c1',
    });
    const done = map({
      rawOutput: { ok: true },
      sessionUpdate: 'tool_call_update',
      status: 'completed',
      toolCallId: 'c1',
    });

    expect(announced).toEqual([]);
    expect(filled).toEqual([
      {
        delta: '',
        done: false,
        kind: 'tool_call',
        metadata: {
          callId: 'c1',
          toolCall: { path: '/w/a.txt' },
          toolName: 'Edit File',
        },
      },
    ]);
    expect(running).toEqual([]);
    expect(done).toEqual([
      {
        delta: '',
        done: false,
        kind: 'tool_result',
        metadata: {
          callId: 'c1',
          toolCall: { output: { ok: true }, status: 'completed' },
          toolName: 'Edit File',
        },
      },
    ]);
  });

  it('emits the call when it starts running even without input', () => {
    const map = createAcpUpdateMapper();
    map({ sessionUpdate: 'tool_call', title: 'MCP: tool', toolCallId: 'c2' });

    const running = map({
      sessionUpdate: 'tool_call_update',
      status: 'in_progress',
      toolCallId: 'c2',
    });

    expect(running.map((chunk) => chunk.kind)).toEqual(['tool_call']);
  });

  it('ignores updates with no chat equivalent', () => {
    const map = createAcpUpdateMapper();

    expect(map({ sessionUpdate: 'session_info_update', title: 'x' })).toEqual(
      [],
    );
    expect(
      map({
        content: { text: 'replayed', type: 'text' },
        sessionUpdate: 'user_message_chunk',
      }),
    ).toEqual([]);
  });
});

describe('acpTerminalChunk', () => {
  it('is a clean finish for end_turn', () => {
    expect(acpTerminalChunk({ stopReason: 'end_turn' })).toMatchObject({
      done: true,
      error: null,
    });
  });

  it('surfaces every other stop reason as the error', () => {
    expect(acpTerminalChunk({ stopReason: 'cancelled' }).error).toBe(
      'cancelled',
    );
    expect(acpTerminalChunk({ stopReason: 'refusal' }).error).toMatch(
      /refused/,
    );
  });
});

describe('toAcpMcpServers', () => {
  it('converts stdio servers and merges the run mcpEnv into their env', () => {
    const servers = toAcpMcpServers({
      mcpEnv: { OT_TOKEN: 'secret' },
      mcpServers: {
        openthrottle: {
          args: ['serve'],
          command: 'ot-mcp',
          env: { MODE: 'stdio' },
        },
      },
    });

    expect(servers).toEqual([
      {
        args: ['serve'],
        command: 'ot-mcp',
        env: [
          { name: 'OT_TOKEN', value: 'secret' },
          { name: 'MODE', value: 'stdio' },
        ],
        name: 'openthrottle',
      },
    ]);
  });

  it('converts http servers and drops entries it cannot express', () => {
    const servers = toAcpMcpServers({
      mcpEnv: undefined,
      mcpServers: {
        broken: { description: 'no transport' },
        remote: {
          headers: { Authorization: 'Bearer x' },
          url: 'https://mcp.example/mcp',
        },
      },
    });

    expect(servers).toEqual([
      {
        headers: [{ name: 'Authorization', value: 'Bearer x' }],
        name: 'remote',
        type: 'http',
        url: 'https://mcp.example/mcp',
      },
    ]);
  });
});

describe('decideAcpPermission', () => {
  const request = (
    kind: RequestPermissionRequest['toolCall']['kind'],
    title: string,
  ): RequestPermissionRequest => {
    return {
      options: [
        { kind: 'allow_always', name: 'Always', optionId: 'always' },
        { kind: 'allow_once', name: 'Once', optionId: 'once' },
        { kind: 'reject_once', name: 'No', optionId: 'no' },
      ],
      sessionId: 's',
      toolCall: { kind, title, toolCallId: 't' },
    };
  };

  it('never grants allow_always', () => {
    expect(
      decideAcpPermission(request('execute', 'ls'), 'fullAccess', []),
    ).toEqual({
      outcome: { optionId: 'once', outcome: 'selected' },
    });
  });

  it('allows edits under autoAcceptEdits but not commands', () => {
    expect(
      decideAcpPermission(request('edit', 'Edit a.ts'), 'autoAcceptEdits', []),
    ).toEqual({
      outcome: { optionId: 'once', outcome: 'selected' },
    });
    expect(
      decideAcpPermission(request('execute', 'make'), 'autoAcceptEdits', []),
    ).toEqual({
      outcome: { optionId: 'no', outcome: 'selected' },
    });
  });

  it('allows managed MCP tools in supervised mode until approvals reach the UI', () => {
    expect(
      decideAcpPermission(request('other', 'openthrottle-x: x'), 'supervised', [
        'openthrottle',
      ]),
    ).toEqual({ outcome: { optionId: 'once', outcome: 'selected' } });
    expect(
      decideAcpPermission(request('edit', 'Edit a.ts'), 'supervised', [
        'openthrottle',
      ]),
    ).toEqual({
      outcome: { optionId: 'no', outcome: 'selected' },
    });
  });

  it('cancels when the agent offers no option of the wanted kind', () => {
    const onlyAllow: RequestPermissionRequest = {
      options: [{ kind: 'allow_once', name: 'Once', optionId: 'once' }],
      sessionId: 's',
      toolCall: { kind: 'execute', title: 'ls', toolCallId: 't' },
    };

    expect(decideAcpPermission(onlyAllow, undefined, [])).toEqual({
      outcome: { outcome: 'cancelled' },
    });
  });
});

describe('isAcpChatEnabled', () => {
  it('is off by default', () => {
    expect(isAcpChatEnabled('cursor', {})).toBe(false);
  });

  it('routes listed drivers that have an ACP spec', () => {
    const env = { [CHAT_ACP_BACKENDS_ENV]: 'Cursor, claude' };

    expect(isAcpChatEnabled('cursor', env)).toBe(true);
    expect(isAcpChatEnabled('claude', env)).toBe(false);
  });

  it('routes every spec-backed driver for all, and never one without a spec', () => {
    const env = { [CHAT_ACP_BACKENDS_ENV]: 'all' };

    expect(isAcpChatEnabled('cursor', env)).toBe(true);
    expect(isAcpChatEnabled('antigravity', env)).toBe(true);
    expect(isAcpChatEnabled('codex', env)).toBe(false);
  });
});

describe('ACP_AGENT_SPECS session modes', () => {
  describe('antigravity', () => {
    const spec = ACP_AGENT_SPECS['antigravity'];

    it('asks before edits under supervised and the no-mode default', () => {
      expect(spec?.sessionMode('supervised')).toBe('default');
      expect(spec?.sessionMode(undefined)).toBe('default');
      expect(spec?.asksBeforeEdits).toBe(true);
    });

    it('stops asking for edits under autoAcceptEdits', () => {
      expect(spec?.sessionMode('autoAcceptEdits')).toBe('accept-edits');
    });

    it('runs in auto under fullAccess', () => {
      expect(spec?.sessionMode('fullAccess')).toBe('auto');
    });
  });

  describe('cursor', () => {
    const spec = ACP_AGENT_SPECS['cursor'];

    it('pins agent mode for every posture and reports edits as unasked', () => {
      const postures: ReadonlyArray<ConversationPermissionMode | undefined> = [
        'autoAcceptEdits',
        'fullAccess',
        'supervised',
        undefined,
      ];
      for (const mode of postures) {
        expect(spec?.sessionMode(mode)).toBe('agent');
      }
      expect(spec?.asksBeforeEdits).toBe(false);
    });
  });
});
