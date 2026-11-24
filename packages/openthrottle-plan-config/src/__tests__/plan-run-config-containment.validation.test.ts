import { describe, expect, it } from 'vitest';

import { buildPlanRunConfigSnapshot } from '../plan-run-config-snapshot.build.ts';
import { parsePlanRunConfigSnapshot } from '../plan-run-config-snapshot.validation.ts';
import { planHasCustomRunConfig } from '../plan-run-config-storage.compare.ts';
import { getDefaultPlanRunConfigStorage } from '../plan-run-config-storage.defaults.ts';
import {
  planRunConfigFromWorkflowUiState,
  workflowUiStateFromPlanRunConfig,
} from '../plan-run-config-storage.round-trip.ts';
import type { PlanRunContainmentProfile } from '../plan-run-config-storage.types.ts';
import {
  parsePlanRunConfigJson,
  parsePlanRunConfigStorage,
} from '../plan-run-config-storage.validation.ts';

const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';
const base = getDefaultPlanRunConfigStorage({ planId });

const allowlist: PlanRunContainmentProfile = {
  filesystem: 'worktree-write',
  network: { hosts: ['registry.npmjs.org', '*.github.com'], mode: 'allowlist' },
};

describe('containment in the stored run config', () => {
  it('leaves a config without containment unchanged and not custom', () => {
    const parsed = parsePlanRunConfigStorage(base);

    expect(parsed).not.toHaveProperty('containment');
    expect(planHasCustomRunConfig(base, { planId })).toBe(false);
  });

  it('accepts each network mode', () => {
    const deny = parsePlanRunConfigStorage({
      ...base,
      containment: { filesystem: 'worktree-write', network: { mode: 'deny' } },
    });
    const open = parsePlanRunConfigStorage({
      ...base,
      containment: {
        filesystem: 'unrestricted',
        network: { mode: 'unrestricted' },
      },
    });

    expect(deny.containment?.network).toEqual({ mode: 'deny' });
    expect(open.containment?.network).toEqual({ mode: 'unrestricted' });
  });

  it('normalizes allowlist hosts: lower-cased, de-duplicated, sorted', () => {
    const parsed = parsePlanRunConfigStorage({
      ...base,
      containment: {
        filesystem: 'worktree-write',
        network: {
          hosts: ['Registry.NPMJS.org', 'github.com', 'registry.npmjs.org'],
          mode: 'allowlist',
        },
      },
    });

    expect(parsed.containment?.network).toEqual({
      hosts: ['github.com', 'registry.npmjs.org'],
      mode: 'allowlist',
    });
  });

  it('marks a config with containment as custom', () => {
    expect(
      planHasCustomRunConfig({ ...base, containment: allowlist }, { planId }),
    ).toBe(true);
  });

  describe('rejects', () => {
    it.each([
      ['a host with a scheme', 'https://github.com'],
      ['a host with a port', 'github.com:443'],
      ['a host with a path', 'github.com/org'],
      ['a mid-label wildcard', 'git*.com'],
      ['an empty host', ''],
    ])('%s', (_label, host) => {
      expect(() => {
        return parsePlanRunConfigStorage({
          ...base,
          containment: {
            filesystem: 'worktree-write',
            network: { hosts: [host], mode: 'allowlist' },
          },
        });
      }).toThrow(/containment\.network\.hosts/);
    });

    it('hosts on a non-allowlist network mode', () => {
      expect(() => {
        return parsePlanRunConfigStorage({
          ...base,
          containment: {
            filesystem: 'worktree-write',
            network: { hosts: ['github.com'], mode: 'deny' },
          },
        });
      }).toThrow(/containment\.network/);
    });

    it('an unknown filesystem mode', () => {
      expect(() => {
        return parsePlanRunConfigStorage({
          ...base,
          containment: { filesystem: 'read-only', network: { mode: 'deny' } },
        });
      }).toThrow(/containment\.filesystem/);
    });
  });

  it('round-trips through JSON and the Configuration UI state', () => {
    const json = JSON.stringify({ ...base, containment: allowlist });
    const parsed = parsePlanRunConfigJson(json);

    if (parsed === undefined) {
      throw new Error('expected a parsed config');
    }

    const ui = workflowUiStateFromPlanRunConfig(planId, parsed);
    const back = planRunConfigFromWorkflowUiState(ui);

    expect(ui.containment).toEqual(parsed.containment);
    expect(back.containment).toEqual({
      filesystem: 'worktree-write',
      network: {
        hosts: ['*.github.com', 'registry.npmjs.org'],
        mode: 'allowlist',
      },
    });
  });
});

describe('containment in the run-config snapshot', () => {
  it('records the profile and survives the snapshot schema', () => {
    const snapshot = buildPlanRunConfigSnapshot({
      containment: allowlist,
      driver: 'claude',
      workingDirectory: '/tmp/repo',
    });

    expect(snapshot.containment).toEqual(allowlist);
    expect(parsePlanRunConfigSnapshot(snapshot)?.containment?.filesystem).toBe(
      'worktree-write',
    );
  });

  it('omits containment when none was passed', () => {
    const snapshot = buildPlanRunConfigSnapshot({
      driver: 'claude',
      workingDirectory: '/tmp/repo',
    });

    expect(snapshot).not.toHaveProperty('containment');
  });
});
