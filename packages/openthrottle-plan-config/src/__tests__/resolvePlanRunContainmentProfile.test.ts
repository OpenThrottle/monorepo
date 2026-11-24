import { describe, expect, it } from 'vitest';

import { DEFAULT_PLAN_RUN_CONTAINMENT_HOSTS } from '../plan-run-config-containment.constants.ts';
import { getDefaultPlanRunConfigStorage } from '../plan-run-config-storage.defaults.ts';
import { parsePlanRunConfigStorage } from '../plan-run-config-storage.validation.ts';
import {
  getDefaultPlanRunContainmentProfile,
  resolvePlanRunContainmentProfile,
} from '../resolvePlanRunContainmentProfile.ts';

const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';

describe('getDefaultPlanRunContainmentProfile', () => {
  it('limits writes to the worktree and egress to the default hosts', () => {
    expect(getDefaultPlanRunContainmentProfile()).toEqual({
      filesystem: 'worktree-write',
      network: {
        hosts: [...DEFAULT_PLAN_RUN_CONTAINMENT_HOSTS],
        mode: 'allowlist',
      },
    });
  });

  it('returns a fresh hosts array on each call', () => {
    const first = getDefaultPlanRunContainmentProfile();
    const second = getDefaultPlanRunContainmentProfile();

    expect(first.network).not.toBe(second.network);
  });
});

describe('resolvePlanRunContainmentProfile', () => {
  describe('when the stored config has no containment', () => {
    it('resolves a pre-containment row to the default profile', () => {
      const legacy = parsePlanRunConfigStorage(
        getDefaultPlanRunConfigStorage({ planId }),
      );

      expect(legacy).not.toHaveProperty('containment');
      expect(resolvePlanRunContainmentProfile(legacy)).toEqual(
        getDefaultPlanRunContainmentProfile(),
      );
    });
  });

  describe('when the stored config sets containment', () => {
    it('returns the stored profile unchanged', () => {
      const stored = parsePlanRunConfigStorage({
        ...getDefaultPlanRunConfigStorage({ planId }),
        containment: { filesystem: 'unrestricted', network: { mode: 'deny' } },
      });

      expect(resolvePlanRunContainmentProfile(stored)).toEqual({
        filesystem: 'unrestricted',
        network: { mode: 'deny' },
      });
    });
  });
});
