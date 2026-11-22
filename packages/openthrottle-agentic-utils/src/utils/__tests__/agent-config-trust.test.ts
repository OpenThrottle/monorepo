import { describe, expect, it } from 'vitest';

import {
  AGENT_CONFIG_POSTURE,
  AGENT_CONFIG_TRUST_REASON,
  isOpenThrottleCheckout,
  resolveAgentConfigTrust,
} from '../agent-config-trust.ts';

const FOREIGN = '/other/repo';

describe('isOpenThrottleCheckout', () => {
  it('is true for a context inside the OpenThrottle root', () => {
    expect(
      isOpenThrottleCheckout({ isForeign: false, openThrottleRoot: '/ot' }),
    ).toBe(true);
  });

  it('is false for a foreign context', () => {
    expect(
      isOpenThrottleCheckout({ isForeign: true, openThrottleRoot: '/ot' }),
    ).toBe(false);
  });

  it('fails closed when the OpenThrottle root is unresolved', () => {
    expect(
      isOpenThrottleCheckout({ isForeign: false, openThrottleRoot: undefined }),
    ).toBe(false);
  });
});

describe('resolveAgentConfigTrust', () => {
  it('trusts the OpenThrottle checkout even when its flag is false', () => {
    expect(
      resolveAgentConfigTrust({
        checkout: { agentConfigTrusted: false, filesystemPath: '/ot' },
        isOpenThrottleCheckout: true,
      }),
    ).toEqual({
      posture: AGENT_CONFIG_POSTURE.TRUSTED,
      reason: AGENT_CONFIG_TRUST_REASON.OPENTHROTTLE_CHECKOUT,
    });
  });

  it('isolates an unregistered foreign directory', () => {
    expect(
      resolveAgentConfigTrust({
        checkout: null,
        isOpenThrottleCheckout: false,
      }),
    ).toEqual({
      posture: AGENT_CONFIG_POSTURE.ISOLATED,
      reason: AGENT_CONFIG_TRUST_REASON.UNREGISTERED,
    });
  });

  it('trusts a foreign checkout the user trusted', () => {
    expect(
      resolveAgentConfigTrust({
        checkout: { agentConfigTrusted: true, filesystemPath: FOREIGN },
        isOpenThrottleCheckout: false,
      }),
    ).toEqual({
      posture: AGENT_CONFIG_POSTURE.TRUSTED,
      reason: AGENT_CONFIG_TRUST_REASON.USER_TRUSTED,
    });
  });

  it('isolates a foreign checkout the user has not trusted', () => {
    expect(
      resolveAgentConfigTrust({
        checkout: { agentConfigTrusted: false, filesystemPath: FOREIGN },
        isOpenThrottleCheckout: false,
      }),
    ).toEqual({
      posture: AGENT_CONFIG_POSTURE.ISOLATED,
      reason: AGENT_CONFIG_TRUST_REASON.UNTRUSTED,
    });
  });
});
