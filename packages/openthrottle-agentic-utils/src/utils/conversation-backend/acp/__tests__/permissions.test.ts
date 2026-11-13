import type { RequestPermissionRequest } from '@agentclientprotocol/sdk';
import { describe, expect, it } from 'vitest';

import { decideAcpPermission } from '../permissions.ts';

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
