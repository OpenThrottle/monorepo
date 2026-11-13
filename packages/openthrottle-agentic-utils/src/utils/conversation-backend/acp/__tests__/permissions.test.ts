import type { RequestPermissionRequest } from '@agentclientprotocol/sdk';
import { describe, expect, it } from 'vitest';

import {
  awaitAcpPermission,
  decideAcpPermission,
  resolveAcpPermission,
} from '../permissions.ts';

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

describe('permission broker', () => {
  describe('resolveAcpPermission', () => {
    it('settles a pending request with the chosen option', async () => {
      const pending = awaitAcpPermission('r1', undefined);

      expect(resolveAcpPermission('r1', 'yes')).toBe(true);
      await expect(pending).resolves.toEqual({
        outcome: { optionId: 'yes', outcome: 'selected' },
      });
    });

    it('settles as cancelled for a null option', async () => {
      const pending = awaitAcpPermission('r2', undefined);

      expect(resolveAcpPermission('r2', null)).toBe(true);
      await expect(pending).resolves.toEqual({
        outcome: { outcome: 'cancelled' },
      });
    });

    it('returns false for an unknown id and for an already settled one', async () => {
      const pending = awaitAcpPermission('r3', undefined);
      resolveAcpPermission('r3', 'yes');
      await pending;

      expect(resolveAcpPermission('r3', 'yes')).toBe(false);
      expect(resolveAcpPermission('never-registered', 'yes')).toBe(false);
    });
  });

  describe('abort', () => {
    it('settles a pending request as cancelled', async () => {
      const controller = new AbortController();
      const pending = awaitAcpPermission('r4', controller.signal);

      controller.abort();

      await expect(pending).resolves.toEqual({
        outcome: { outcome: 'cancelled' },
      });
      expect(resolveAcpPermission('r4', 'yes')).toBe(false);
    });

    it('settles immediately when the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        awaitAcpPermission('r5', controller.signal),
      ).resolves.toEqual({ outcome: { outcome: 'cancelled' } });
    });
  });
});
