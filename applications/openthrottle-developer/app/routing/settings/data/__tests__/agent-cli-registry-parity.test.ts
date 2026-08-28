/**
 * This is the gate the browser bundle cannot enforce for itself: `@openthrottle/openthrottle-drivers`
 * pulls node-only modules and cannot be imported into the bundle, so the catalog has to mirror the
 * registry by hand. Tests, however, run in node — so the comparison the shipped code cannot make is
 * free here.
 *
 * This is the gate the browser bundle cannot enforce for itself: `@openthrottle/openthrottle-drivers`
 * pulls node-only modules and cannot be imported into the bundle, so the catalog has to mirror the
 * registry by hand. Tests, however, run in node — so the comparison the shipped code cannot make is
 * free here.
 *
 * This test would have caught the bug that motivated it. Antigravity shipped in `ALL_DRIVERS`
 * (PR #440) and was never added to the catalog, and because `mergeAgentCliStatuses` iterates the
 * catalog rather than the discovery result, /settings/agents hid it while `discoverAgentClis` was
 * returning it installed. A docstring saying "keep this list in sync with the registry" is a
 * comment doing a type's job; this is the check.
 */

import { ALL_DRIVERS } from '@openthrottle/openthrottle-drivers';
import { describe, expect, it } from 'vitest';

import { AGENT_CLI_BACKENDS, mergeAgentCliStatuses } from '../agent-clis.data';

/**
 * Gemini is the one backend whose catalog link is NOT its driver's `install.url`: it installs via
 * npm (`@google/gemini-cli`) and geminicli.com serves no install script, so the catalog points at
 * the docs page instead. Verified against the driver descriptor rather than assumed.
 */
const DOCS_LINK_ONLY_BACKENDS = new Set<string>(['gemini']);

describe('agent CLI catalog / drivers registry parity', () => {
  it('lists exactly the registered driver ids', () => {
    expect(Object.values(AGENT_CLI_BACKENDS).sort()).toEqual(
      ALL_DRIVERS.map((driver) => driver.id).sort(),
    );
  });

  it('produces one status row per registered driver', () => {
    const rows = mergeAgentCliStatuses([]);

    expect(rows.map((row) => row.backend).sort()).toEqual(
      ALL_DRIVERS.map((driver) => driver.id).sort(),
    );
  });

  it('surfaces a driver the server reports installed', () => {
    // The antigravity regression, generalized: every driver must be able to reach the table as
    // installed. Iterating the catalog is what dropped one; iterating the vocabulary cannot.
    for (const driver of ALL_DRIVERS) {
      const rows = mergeAgentCliStatuses([
        {
          backend: driver.id,
          enabled: true,
          label: driver.label,
          modelOptions: [],
          version: '1.0.0',
        },
      ]);
      const row = rows.find((candidate) => candidate.backend === driver.id);

      expect(row?.installed).toBe(true);
      expect(row?.version).toBe('1.0.0');
    }
  });

  it('reuses each driver install url, except the documented docs-only backends', () => {
    const rows = mergeAgentCliStatuses([]);

    for (const driver of ALL_DRIVERS) {
      const row = rows.find((candidate) => candidate.backend === driver.id);
      const install = driver.install;

      // `install` is optional, and only the curl-shell method carries a url — npm-installed
      // CLIs have none, which is exactly the gemini case the catalog links around.
      if (install === undefined || install.method !== 'curl-shell') {
        expect(DOCS_LINK_ONLY_BACKENDS.has(driver.id)).toBe(true);
        continue;
      }

      expect(row?.installUrl).toBe(install.url);
    }
  });

  it('keeps the display label distinct from the driver binary label', () => {
    // Not a duplication to delete: the driver's label is the binary-ish name.
    const rows = mergeAgentCliStatuses([]);
    const claude = rows.find((row) => row.backend === 'claude');

    expect(claude?.label).toBe('Claude Code');
    expect(ALL_DRIVERS.find((driver) => driver.id === 'claude')?.label).toBe(
      'claude-code',
    );
  });
});
