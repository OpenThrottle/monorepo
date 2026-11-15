/**
 * @description Unit tests for removal-audit normalization: untrusted values are trimmed, capped
 * and nulled, never thrown on.
 */

import { describe, expect, it } from 'vitest';

import { MAX_REMOVAL_AUDIT_COMMAND_LENGTH } from './worktree-checkout-prune.constants.ts';
import { normalizeWorktreeRemovalAudit } from './worktree-checkout-prune.utils.ts';

const empty = {
  agentSession: null,
  ancestry: null,
  branch: null,
  parent: null,
  pid: null,
  ppid: null,
  probe: null,
  result: null,
  ts: null,
};

describe('normalizeWorktreeRemovalAudit', () => {
  describe('when every field is missing', () => {
    it('returns all nulls', () => {
      expect(normalizeWorktreeRemovalAudit(empty)).toEqual({
        agentSession: null,
        ancestry: null,
        branch: null,
        parentCommand: null,
        pid: null,
        ppid: null,
        probe: null,
        removedAt: null,
        result: null,
      });
    });
  });

  describe('when values are blank, malformed or oversized', () => {
    it('nulls blanks, rejects bad ids and timestamps, and caps long text', () => {
      const normalized = normalizeWorktreeRemovalAudit({
        ...empty,
        agentSession: '   ',
        parent: 'x'.repeat(MAX_REMOVAL_AUDIT_COMMAND_LENGTH + 50),
        pid: -1,
        ppid: 1.5,
        result: '  removed  ',
        ts: 'not a date',
      });

      expect(normalized.agentSession).toBeNull();
      expect(normalized.parentCommand).toHaveLength(
        MAX_REMOVAL_AUDIT_COMMAND_LENGTH,
      );
      expect(normalized.pid).toBeNull();
      expect(normalized.ppid).toBeNull();
      expect(normalized.removedAt).toBeNull();
      expect(normalized.result).toBe('removed');
    });
  });

  describe('when values are well formed', () => {
    it('keeps them and parses the timestamp', () => {
      const normalized = normalizeWorktreeRemovalAudit({
        ...empty,
        pid: 42,
        ts: '2026-11-15T17:00:00Z',
      });

      expect(normalized.pid).toBe(42);
      expect(normalized.removedAt).toEqual(new Date('2026-11-15T17:00:00Z'));
    });
  });
});
