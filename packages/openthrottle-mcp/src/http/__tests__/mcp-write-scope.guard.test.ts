import { describe, expect, it, vi } from 'vitest';

import {
  evaluateWriteScope,
  readCalledToolNames,
} from '../mcp-write-scope.guard.ts';
import type { McpPublicAuthMode } from '../protected-resource.ts';

const PUBLIC: McpPublicAuthMode = {
  allowStaticToken: false,
  issuer: 'https://api.example.com',
  kind: 'public',
  resource: 'https://mcp.example.com/mcp',
};

const call = (name: string): unknown => {
  return {
    id: 1,
    jsonrpc: '2.0',
    method: 'tools/call',
    params: { arguments: {}, name },
  };
};

describe('readCalledToolNames', () => {
  it('reads single and batched tools/call messages', () => {
    expect(readCalledToolNames(call('get_plan'))).toEqual(['get_plan']);
    expect(
      readCalledToolNames([
        call('get_plan'),
        { method: 'tools/list' },
        call('create_plan'),
      ]),
    ).toEqual(['get_plan', 'create_plan']);
  });

  it('treats a nameless call as a write', () => {
    expect(readCalledToolNames({ method: 'tools/call', params: {} })).toEqual([
      '',
    ]);
  });
});

describe('evaluateWriteScope', () => {
  const readOnly = vi.fn().mockResolvedValue(['mcp:read']);

  describe('in internal mode', () => {
    it('allows everything without a lookup', async () => {
      const lookup = vi.fn();

      expect(
        await evaluateWriteScope({
          authorization: 'Bearer ot_oat_a_b',
          body: call('create_plan'),
          lookup,
          mode: { kind: 'internal' },
        }),
      ).toEqual({ kind: 'allow' });
      expect(lookup).not.toHaveBeenCalled();
    });
  });

  describe('in public mode', () => {
    it('allows a read tool for a read-only token without a lookup', async () => {
      const lookup = vi.fn();

      expect(
        await evaluateWriteScope({
          authorization: 'Bearer ot_oat_a_b',
          body: call('get_plan'),
          lookup,
          mode: PUBLIC,
        }),
      ).toEqual({ kind: 'allow' });
      expect(lookup).not.toHaveBeenCalled();
    });

    it('denies a write tool for a read-only token with an insufficient_scope challenge', async () => {
      const decision = await evaluateWriteScope({
        authorization: 'Bearer ot_oat_a_b',
        body: call('create_plan'),
        lookup: readOnly,
        mode: PUBLIC,
      });

      expect(decision.kind).toBe('deny');
      const challenge = decision.kind === 'deny' ? decision.challenge : '';
      expect(challenge).toContain('error="insufficient_scope"');
      expect(challenge).toContain('scope="mcp:write"');
      expect(challenge).toContain(
        'resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource/mcp"',
      );
    });

    it('allows a write tool for a read-write token', async () => {
      expect(
        await evaluateWriteScope({
          authorization: 'Bearer ot_oat_a_b',
          body: call('create_plan'),
          lookup: vi.fn().mockResolvedValue(['mcp:read', 'mcp:write']),
          mode: PUBLIC,
        }),
      ).toEqual({ kind: 'allow' });
    });

    it('leaves non-OAuth bearers and unknown scopes to the API', async () => {
      expect(
        await evaluateWriteScope({
          authorization: 'Bearer ot_sa_a_b',
          body: call('create_plan'),
          lookup: readOnly,
          mode: PUBLIC,
        }),
      ).toEqual({ kind: 'allow' });
      expect(
        await evaluateWriteScope({
          authorization: 'Bearer ot_oat_a_b',
          body: call('create_plan'),
          lookup: vi.fn().mockResolvedValue(null),
          mode: PUBLIC,
        }),
      ).toEqual({ kind: 'allow' });
    });
  });
});
