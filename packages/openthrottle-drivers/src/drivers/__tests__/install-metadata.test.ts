/**
 * @description Guards the install/update descriptors that back the in-stack `/settings/agents`
 * feature against silent drift from `scripts/setup_software.sh`. Every agent CLI the setup script
 * installs (claude, codex, cursor, grok, opencode) must carry a `curl-shell` install descriptor with
 * the exact URL + installer shell the script uses, and a well-formed update descriptor. Descriptors
 * are pure data here — no subprocess is spawned (the executor lives in agentic-utils).
 */

import { describe, expect, it } from 'vitest';

import { ALL_DRIVERS, getDriver } from '../index.ts';

/** Mirrors the `# 👨‍💻 Agent CLIs` block in scripts/setup_software.sh (name/binary/shell/url). */
const EXPECTED_INSTALL: Record<
  string,
  { installerShell: 'bash' | 'sh'; url: string }
> = {
  claude: { installerShell: 'bash', url: 'https://claude.ai/install.sh' },
  codex: { installerShell: 'sh', url: 'https://chatgpt.com/codex/install.sh' },
  cursor: { installerShell: 'bash', url: 'https://cursor.com/install' },
  grok: { installerShell: 'bash', url: 'https://x.ai/cli/install.sh' },
  opencode: { installerShell: 'bash', url: 'https://opencode.ai/install' },
};

describe('driver install/update descriptors', () => {
  it('every driver carries a curl-shell install descriptor matching setup_software.sh', () => {
    for (const driver of ALL_DRIVERS) {
      expect(driver.install, `${driver.id} must be installable`).toBeDefined();
      expect(driver.install?.method).toBe('curl-shell');
      const expected = EXPECTED_INSTALL[driver.id];
      expect(
        expected,
        `no expected install mapping for ${driver.id}`,
      ).toBeDefined();
      expect(driver.install).toEqual({ method: 'curl-shell', ...expected });
    }
  });

  it('every driver carries a well-formed update descriptor (command argv non-empty)', () => {
    for (const driver of ALL_DRIVERS) {
      expect(
        driver.update,
        `${driver.id} must declare an update path`,
      ).toBeDefined();
      if (driver.update?.method === 'command') {
        expect(driver.update.argv.length).toBeGreaterThan(0);
      } else {
        expect(driver.update?.method).toBe('curl-shell');
      }
    }
  });

  it('records the researched per-CLI self-update mechanism', () => {
    expect(getDriver('claude').update).toEqual({
      argv: ['update'],
      method: 'command',
    });
    expect(getDriver('codex').update).toEqual({
      argv: ['update'],
      method: 'command',
    });
    expect(getDriver('grok').update).toEqual({
      argv: ['update'],
      method: 'command',
    });
    expect(getDriver('opencode').update).toEqual({
      argv: ['upgrade'],
      method: 'command',
    });
    // cursor-agent auto-updates and has no unambiguous subcommand → re-run the installer.
    expect(getDriver('cursor').update).toEqual({ method: 'curl-shell' });
  });
});
