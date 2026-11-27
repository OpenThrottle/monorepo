import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '../../types';
import { buildMcpServerRows } from '../session-environment';
import {
  deriveSessionMcpServers,
  parseMcpServers,
} from '../session-mcp-servers';

const session = (
  mcpServers: ReturnType<typeof parseMcpServers>,
  sortOrder: number,
): ChatMessage => {
  return {
    body: '',
    events: [{ kind: 'session', mcpServers, sessionId: null, sortOrder }],
    id: `m${sortOrder}`,
    role: 'assistant',
  };
};

describe('parseMcpServers', () => {
  it('keeps name/status strings and drops malformed entries', () => {
    expect(
      parseMcpServers([
        { name: 'a', status: 'connected', tools: [] },
        { name: 'b' },
        { status: 'failed' },
        'c',
      ]),
    ).toEqual([
      { name: 'a', status: 'connected' },
      { name: 'b', status: 'unknown' },
    ]);
  });

  it('is undefined for a non-list or an empty result', () => {
    expect(parseMcpServers(undefined)).toBeUndefined();
    expect(parseMcpServers('x')).toBeUndefined();
    expect(parseMcpServers([])).toBeUndefined();
  });
});

describe('deriveSessionMcpServers', () => {
  it('is empty when no turn reported servers', () => {
    expect(deriveSessionMcpServers([session(undefined, 0)])).toEqual([]);
  });

  it('uses the latest report', () => {
    const first = [{ name: 'a', status: 'failed' }];
    const second = [{ name: 'a', status: 'connected' }];

    expect(
      deriveSessionMcpServers([
        session(first, 0),
        session(second, 1),
        session(undefined, 2),
      ]),
    ).toEqual(second);
  });
});

describe('buildMcpServerRows', () => {
  const LABELS = {
    connected: 'Connected',
    disabled: 'Disabled',
    failed: 'Failed',
    'needs-auth': 'Needs auth',
    pending: 'Connecting',
  };

  it('maps known statuses to copy and tone, unknown ones verbatim', () => {
    expect(
      buildMcpServerRows(
        [
          { name: 'a', status: 'connected' },
          { name: 'b', status: 'failed' },
          { name: 'c', status: 'weird' },
        ],
        LABELS,
      ),
    ).toEqual([
      { label: 'Connected', name: 'a', tone: 'ok' },
      { label: 'Failed', name: 'b', tone: 'error' },
      { label: 'weird', name: 'c', tone: 'neutral' },
    ]);
  });
});
