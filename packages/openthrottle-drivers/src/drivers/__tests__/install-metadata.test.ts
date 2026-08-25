/**
 * @description Guards the install/update descriptors that back the in-stack `/settings/agents`
 * feature. The driver registry is the single source of truth for how each CLI installs
 * (`scripts/setup_software.sh` once carried a mirrored `curl | shell` block, but no longer installs
 * agent CLIs at all — do not point new descriptors at it). claude/codex/cursor/grok/opencode use
 * their vendors' official curl-shell installers; gemini has no official curl-shell installer
 * (geminicli.com serves no install script — verified 2026-08-25) and installs via npm instead.
 * Every driver must also carry a well-formed update descriptor. Descriptors are pure data here — no
 * subprocess is spawned (the executor lives in agentic-utils).
 */

import { describe, expect, it } from 'vitest';

import { ALL_DRIVERS, getDriver } from '../index.ts';

/** The vendors' official curl-shell installers (researched per CLI; registry is source of truth). */
const EXPECTED_CURL_INSTALL: Record<
  string,
  { installerShell: 'bash' | 'sh'; url: string }
> = {
  claude: { installerShell: 'bash', url: 'https://claude.ai/install.sh' },
  codex: { installerShell: 'sh', url: 'https://chatgpt.com/codex/install.sh' },
  cursor: { installerShell: 'bash', url: 'https://cursor.com/install' },
  grok: { installerShell: 'bash', url: 'https://x.ai/cli/install.sh' },
  opencode: { installerShell: 'bash', url: 'https://opencode.ai/install' },
};

/** CLIs distributed through npm only (no official curl-shell installer). */
const EXPECTED_NPM_INSTALL: Record<string, { packageName: string }> = {
  gemini: { packageName: '@google/gemini-cli' },
};

describe('driver install/update descriptors', () => {
  it('every driver carries an install descriptor matching its official channel', () => {
    for (const driver of ALL_DRIVERS) {
      expect(driver.install, `${driver.id} must be installable`).toBeDefined();

      const expectedCurl = EXPECTED_CURL_INSTALL[driver.id];
      const expectedNpm = EXPECTED_NPM_INSTALL[driver.id];
      expect(
        expectedCurl !== undefined || expectedNpm !== undefined,
        `no expected install mapping for ${driver.id}`,
      ).toBe(true);

      if (expectedCurl !== undefined) {
        expect(driver.install).toEqual({
          method: 'curl-shell',
          ...expectedCurl,
        });
      } else {
        expect(driver.install).toEqual({ method: 'npm', ...expectedNpm });
      }
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
        expect(driver.update?.method).toBe('reinstall');
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
    expect(getDriver('cursor').update).toEqual({ method: 'reinstall' });
    // gemini has no self-update subcommand (0.25.2) → re-run the npm install.
    expect(getDriver('gemini').update).toEqual({ method: 'reinstall' });
  });
});
