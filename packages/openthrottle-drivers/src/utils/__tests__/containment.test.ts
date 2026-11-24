import { describe, expect, it } from 'vitest';

import {
  ALL_DRIVERS,
  antigravityDriver,
  claudeDriver,
  codexDriver,
  cursorDriver,
  grokDriver,
  opencodeDriver,
} from '../../drivers/index.ts';
import type {
  DriverContainment,
  DriverInvocationConfig,
} from '../../types/index.ts';
import {
  claudeContainmentShellFlags,
  codexContainmentShellFlags,
  describeContainmentGaps,
} from '../containment.ts';

const PROMPT = 'do the thing';
const HOSTS = ['github.com', 'registry.npmjs.org'];

const defaultProfile: DriverContainment = {
  extraWritableRoots: [],
  filesystem: 'worktree-write',
  network: { hosts: HOSTS, mode: 'allowlist' },
};

const config = (
  extra: Omit<DriverInvocationConfig, 'iteration' | 'prompt'>,
): DriverInvocationConfig => {
  return { iteration: 1, prompt: PROMPT, ...extra };
};

/** Pulls the JSON out of `--settings "<json>"` so assertions read the settings, not the quoting. */
const claudeSettings = (command: string): unknown => {
  const match = /--settings "((?:[^"\\]|\\.)*)"/.exec(command);
  if (match?.[1] === undefined) {
    throw new Error(`no --settings in: ${command}`);
  }

  return JSON.parse(match[1].replace(/\\(.)/g, '$1'));
};

describe('claude containment', () => {
  it('emits sandbox settings for the default profile', () => {
    const command = claudeDriver.buildShellCommand(
      config({ containment: defaultProfile }),
    );

    expect(claudeSettings(command)).toEqual({
      permissions: {
        allow: [
          'WebFetch(domain:github.com)',
          'WebFetch(domain:registry.npmjs.org)',
        ],
      },
      sandbox: {
        allowUnsandboxedCommands: false,
        enabled: true,
        failIfUnavailable: false,
        network: { allowedDomains: HOSTS },
      },
    });
  });

  it('places --settings after --plugin-dir and before the worktree flag', () => {
    const command = claudeDriver.buildShellCommand(
      config({
        containment: defaultProfile,
        pluginDirs: ['/srv/plugins/ot'],
        worktree: { worktree: 'wt' },
      }),
    );

    const pluginAt = command.indexOf('--plugin-dir');
    const settingsAt = command.indexOf('--settings');
    const worktreeAt = command.indexOf(' -w ');

    expect(pluginAt).toBeGreaterThan(-1);
    expect(settingsAt).toBeGreaterThan(pluginAt);
    expect(worktreeAt).toBeGreaterThan(settingsAt);
  });

  it('adds extra writable roots under worktree-write', () => {
    const settings = claudeSettings(
      claudeContainmentShellFlags({
        ...defaultProfile,
        extraWritableRoots: ['/Users/me/Library/pnpm/store'],
      }),
    );

    expect(settings).toMatchObject({
      sandbox: { filesystem: { allowWrite: ['/Users/me/Library/pnpm/store'] } },
    });
  });

  it('opens writes with allowWrite / when the filesystem is unrestricted', () => {
    const settings = claudeSettings(
      claudeContainmentShellFlags({
        ...defaultProfile,
        filesystem: 'unrestricted',
      }),
    );

    expect(settings).toMatchObject({
      sandbox: { filesystem: { allowWrite: ['/'] } },
    });
  });

  it('denies every domain and the web tools when the network is denied', () => {
    const settings = claudeSettings(
      claudeContainmentShellFlags({
        ...defaultProfile,
        network: { mode: 'deny' },
      }),
    );

    expect(settings).toMatchObject({
      permissions: { deny: ['WebFetch', 'WebSearch'] },
      sandbox: { network: { allowedDomains: [] } },
    });
  });

  it('allows every domain when only the filesystem is restricted', () => {
    const settings = claudeSettings(
      claudeContainmentShellFlags({
        ...defaultProfile,
        network: { mode: 'unrestricted' },
      }),
    );

    expect(settings).not.toHaveProperty('permissions');
    expect(settings).toMatchObject({
      sandbox: { network: { allowedDomains: ['*'] } },
    });
  });

  it('emits nothing for a fully unrestricted profile', () => {
    expect(
      claudeContainmentShellFlags({
        extraWritableRoots: [],
        filesystem: 'unrestricted',
        network: { mode: 'unrestricted' },
      }),
    ).toBe('');
  });

  it('escapes shell-special characters in a writable root', () => {
    const flags = claudeContainmentShellFlags({
      ...defaultProfile,
      extraWritableRoots: ['/tmp/$(id)/`x`'],
    });

    expect(flags).toContain('\\$(id)');
    expect(flags).toContain('\\`x\\`');
    expect(claudeSettings(flags)).toMatchObject({
      sandbox: { filesystem: { allowWrite: ['/tmp/$(id)/`x`'] } },
    });
  });
});

describe('codex containment', () => {
  it('keeps the historical sandbox flag when there is no profile', () => {
    expect(codexContainmentShellFlags(undefined)).toBe(
      ' --sandbox workspace-write',
    );
  });

  it('leaves network to codex config for an allowlist (no host allowlist exists)', () => {
    const command = codexDriver.buildShellCommand(
      config({ containment: defaultProfile }),
    );

    expect(command).toContain(
      '--sandbox workspace-write --skip-git-repo-check',
    );
    expect(command).not.toContain('network_access');
  });

  it('blocks egress explicitly when the network is denied', () => {
    expect(
      codexContainmentShellFlags({
        ...defaultProfile,
        network: { mode: 'deny' },
      }),
    ).toBe(
      ' --sandbox workspace-write -c sandbox_workspace_write.network_access=false',
    );
  });

  it('opens egress when only the filesystem is restricted', () => {
    expect(
      codexContainmentShellFlags({
        ...defaultProfile,
        network: { mode: 'unrestricted' },
      }),
    ).toBe(
      ' --sandbox workspace-write -c sandbox_workspace_write.network_access=true',
    );
  });

  it('passes extra writable roots as a TOML array', () => {
    expect(
      codexContainmentShellFlags({
        ...defaultProfile,
        extraWritableRoots: ['/store'],
      }),
    ).toBe(
      ` --sandbox workspace-write -c "sandbox_workspace_write.writable_roots=[\\"/store\\"]"`,
    );
  });

  it('uses danger-full-access when the filesystem is unrestricted', () => {
    expect(
      codexContainmentShellFlags({
        ...defaultProfile,
        filesystem: 'unrestricted',
      }),
    ).toBe(' --sandbox danger-full-access');
  });
});

describe('drivers without native containment', () => {
  it.each([
    ['cursor', cursorDriver],
    ['grok', grokDriver],
    ['antigravity', antigravityDriver],
    ['opencode', opencodeDriver],
  ])('%s emits the same command with or without a profile', (_id, driver) => {
    expect(
      driver.buildShellCommand(config({ containment: defaultProfile })),
    ).toBe(driver.buildShellCommand(config({})));
  });
});

describe('describeContainmentGaps', () => {
  describe('when the driver enforces the whole profile', () => {
    it('reports no gaps for claude', () => {
      expect(describeContainmentGaps(claudeDriver, defaultProfile)).toEqual([]);
    });
  });

  describe('when the driver enforces part of the profile', () => {
    it('reports only the allowlist for codex', () => {
      expect(describeContainmentGaps(codexDriver, defaultProfile)).toEqual([
        {
          axis: 'network',
          message: `codex cannot limit egress to a host allowlist; network follows the CLI's own sandbox config`,
        },
      ]);
    });

    it('reports nothing for codex when the network is denied', () => {
      expect(
        describeContainmentGaps(codexDriver, {
          ...defaultProfile,
          network: { mode: 'deny' },
        }),
      ).toEqual([]);
    });
  });

  describe('when the driver enforces nothing', () => {
    it('reports both axes for opencode', () => {
      expect(
        describeContainmentGaps(opencodeDriver, defaultProfile).map((gap) => {
          return gap.axis;
        }),
      ).toEqual(['filesystem', 'network']);
    });

    it('reports a denied network as uncontained', () => {
      expect(
        describeContainmentGaps(cursorDriver, {
          ...defaultProfile,
          network: { mode: 'deny' },
        }),
      ).toContainEqual({
        axis: 'network',
        message: `cursor-agent cannot block network access; egress is not contained`,
      });
    });
  });

  describe('when the profile restricts nothing', () => {
    it('reports no gaps on any driver', () => {
      const open: DriverContainment = {
        extraWritableRoots: [],
        filesystem: 'unrestricted',
        network: { mode: 'unrestricted' },
      };

      for (const driver of ALL_DRIVERS) {
        expect(describeContainmentGaps(driver, open)).toEqual([]);
      }
    });
  });
});
