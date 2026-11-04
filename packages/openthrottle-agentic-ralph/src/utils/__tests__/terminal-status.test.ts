import { describe, expect, it } from 'vitest';

import {
  isRalphTerminalStatus,
  RALPH_TERMINAL_STATUSES,
} from '../terminal-status.ts';

describe('isRalphTerminalStatus', () => {
  it.each(['COMPLETED', 'PROMOTED', 'SKIPPED'])(
    'treats %s as terminal',
    (status) => {
      expect(isRalphTerminalStatus(status)).toBe(true);
    },
  );

  it.each([
    'BACKLOG',
    'BLOCKED',
    'CANCELED',
    'IN_PROGRESS',
    'PENDING',
    'QUEUED',
  ])('does not treat %s as terminal', (status) => {
    expect(isRalphTerminalStatus(status)).toBe(false);
  });

  it('exposes the set of terminal statuses', () => {
    expect([...RALPH_TERMINAL_STATUSES].sort()).toEqual([
      'COMPLETED',
      'PROMOTED',
      'SKIPPED',
    ]);
  });
});
