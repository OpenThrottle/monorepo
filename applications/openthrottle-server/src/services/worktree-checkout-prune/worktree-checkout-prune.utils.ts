/**
 * @description Normalization of the untrusted removal audit a teardown sends with
 * deregisterWorktreeCheckout. Never throws: a malformed value becomes null.
 */

import {
  MAX_REMOVAL_AUDIT_COMMAND_LENGTH,
  MAX_REMOVAL_AUDIT_SHORT_LENGTH,
} from './worktree-checkout-prune.constants.ts';
import type {
  NormalizedWorktreeRemovalAudit,
  WorktreeRemovalAudit,
} from './worktree-checkout-prune.types.ts';

/** @description Trims, caps and nulls an empty or missing string. */
export function auditText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  return trimmed.slice(0, maxLength);
}

/** @description A positive safe integer, else null. */
export function auditProcessId(
  value: number | null | undefined,
): number | null {
  if (typeof value !== 'number') return null;
  if (!Number.isSafeInteger(value) || value <= 0) return null;
  return value;
}

/** @description A parseable timestamp, else null. */
export function auditTimestamp(value: string | null | undefined): Date | null {
  const text = auditText(value, MAX_REMOVAL_AUDIT_SHORT_LENGTH);
  if (text === null) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** @description Normalizes every field of a removal audit; never throws. */
export function normalizeWorktreeRemovalAudit(
  audit: WorktreeRemovalAudit,
): NormalizedWorktreeRemovalAudit {
  return {
    agentSession: auditText(audit.agentSession, MAX_REMOVAL_AUDIT_SHORT_LENGTH),
    ancestry: auditText(audit.ancestry, MAX_REMOVAL_AUDIT_COMMAND_LENGTH),
    branch: auditText(audit.branch, MAX_REMOVAL_AUDIT_SHORT_LENGTH),
    parentCommand: auditText(audit.parent, MAX_REMOVAL_AUDIT_COMMAND_LENGTH),
    pid: auditProcessId(audit.pid),
    ppid: auditProcessId(audit.ppid),
    probe: auditText(audit.probe, MAX_REMOVAL_AUDIT_SHORT_LENGTH),
    removedAt: auditTimestamp(audit.ts),
    result: auditText(audit.result, MAX_REMOVAL_AUDIT_SHORT_LENGTH),
  };
}
