import { describe, expect, it } from 'vitest';

import { mockCheckout } from '~/routing/settings/repositories/testing/mock-repositories';

import { deriveAgentConfigTrust } from '../deriveAgentConfigTrust';

describe('deriveAgentConfigTrust', () => {
  it('reports the OpenThrottle repository when no checkout is foreign', () => {
    expect(
      deriveAgentConfigTrust([mockCheckout({ id: 'ot', isForeign: false })]),
    ).toEqual({ kind: 'openthrottle' });
  });

  it('reports an untrusted foreign repository with its counts', () => {
    expect(
      deriveAgentConfigTrust([
        mockCheckout({
          branch: 'main',
          hookCount: 3,
          id: 'a',
          mcpServerCount: 2,
        }),
      ]),
    ).toEqual({
      hookCount: 3,
      kind: 'foreign',
      mcpServerCount: 2,
      trusted: false,
    });
  });

  it('is trusted only when every foreign checkout is', () => {
    const view = deriveAgentConfigTrust([
      mockCheckout({ agentConfigTrusted: true, id: 'a' }),
      mockCheckout({ agentConfigTrusted: false, id: 'b' }),
    ]);

    expect(view.kind === 'foreign' && view.trusted).toBe(false);
  });

  it('has no counts until a checkout has been scanned', () => {
    expect(
      deriveAgentConfigTrust([mockCheckout({ branch: null, id: 'a' })]),
    ).toEqual({
      hookCount: null,
      kind: 'foreign',
      mcpServerCount: null,
      trusted: false,
    });
  });
});
