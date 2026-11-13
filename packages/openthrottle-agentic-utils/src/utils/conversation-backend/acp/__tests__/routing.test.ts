import { describe, expect, it } from 'vitest';

import { CHAT_ACP_BACKENDS_ENV, isAcpChatEnabled } from '../routing.ts';

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
