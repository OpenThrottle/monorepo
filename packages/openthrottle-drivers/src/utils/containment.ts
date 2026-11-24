/**
 * @description Maps an OT containment profile ({@link DriverContainment}) onto each CLI's native
 * sandbox, and reports the axes a driver cannot enforce. Pure string building: nothing here touches
 * the filesystem or the network. Verified against claude 2.1.325 and codex 0.167.0 on 2026-11-22
 * (plan 01a204c6-e136-7d15-8456-6ecbdbc3da4e, research task output).
 */

import type {
  AgentDriver,
  DriverCapabilities,
  DriverContainment,
} from '../types/index.ts';
import { escapeShellArg } from './shell.ts';

/**
 * @description One containment axis a driver cannot enforce for a profile. The run still goes
 * ahead (warn, don't fail closed); the caller surfaces this at run start.
 * @public
 */
export interface ContainmentGap {
  readonly axis: 'filesystem' | 'network';
  readonly message: string;
}

/**
 * @description True when the profile asks for no containment on either axis.
 */
const isUnrestricted = (containment: DriverContainment): boolean => {
  return (
    containment.filesystem === 'unrestricted' &&
    containment.network.mode === 'unrestricted'
  );
};

/**
 * @description Claude Code's sandbox settings for a profile, passed as `--settings '<json>'`. The
 * CLI merges `--settings` additively over user and project settings, so nothing is written into the
 * target repo.
 *
 * Claude's sandbox bounds both axes at once, so an unrestricted axis is opened explicitly:
 * `allowWrite: ['/']` and `allowedDomains: ['*']`. `failIfUnavailable: false` keeps a host without
 * the OS sandbox (Linux without bubblewrap) running unsandboxed rather than exiting; that is the
 * maintainer's warn-not-fail decision. `autoAllowBashIfSandboxed` is deliberately not set, so which
 * Bash commands run unprompted is still decided by the repo's own permission rules.
 *
 * The sandbox covers Bash and its children only. WebFetch and WebSearch are permission-governed, so
 * the network mode is mirrored into permission rules as well.
 */
const buildClaudeSandboxSettings = (containment: DriverContainment) => {
  const { extraWritableRoots, filesystem, network } = containment;

  const allowWrite =
    filesystem === 'unrestricted' ? ['/'] : [...extraWritableRoots];

  let allowedDomains: readonly string[] = ['*'];
  if (network.mode === 'allowlist') {
    allowedDomains = network.hosts;
  } else if (network.mode === 'deny') {
    allowedDomains = [];
  }

  let permissions: Readonly<Record<string, readonly string[]>> | undefined;
  if (network.mode === 'allowlist') {
    permissions = {
      allow: network.hosts.map((host) => {
        return `WebFetch(domain:${host})`;
      }),
    };
  } else if (network.mode === 'deny') {
    permissions = { deny: ['WebFetch', 'WebSearch'] };
  }

  return {
    ...(permissions !== undefined ? { permissions } : {}),
    sandbox: {
      allowUnsandboxedCommands: false,
      enabled: true,
      failIfUnavailable: false,
      ...(allowWrite.length > 0 ? { filesystem: { allowWrite } } : {}),
      network: { allowedDomains },
    },
  };
};

/**
 * @description ` --settings '<json>'` for Claude Code, or `''` when there is no profile or it
 * restricts nothing.
 * @public
 */
export const claudeContainmentShellFlags = (
  containment: DriverContainment | undefined,
): string => {
  if (containment === undefined || isUnrestricted(containment)) {
    return '';
  }

  const settings = JSON.stringify(buildClaudeSandboxSettings(containment));

  return ` --settings ${escapeShellArg(settings)}`;
};

/**
 * @description Codex sandbox flags for a profile. With no profile this is exactly the historical
 * `--sandbox workspace-write`.
 *
 * `workspace-write` blocks egress unless `sandbox_workspace_write.network_access` is set, and codex
 * 0.167 has no usable host allowlist (its domain proxy is behind an experimental feature), so an
 * allowlist leaves network to codex's own config rather than opening every host: it is reported as a
 * gap instead. `unrestricted` filesystem maps to `danger-full-access`, which also opens the network.
 * @public
 */
export const codexContainmentShellFlags = (
  containment: DriverContainment | undefined,
): string => {
  if (containment === undefined) {
    return ' --sandbox workspace-write';
  }

  if (containment.filesystem === 'unrestricted') {
    return ' --sandbox danger-full-access';
  }

  let flags = ' --sandbox workspace-write';
  if (containment.network.mode === 'deny') {
    flags += ' -c sandbox_workspace_write.network_access=false';
  } else if (containment.network.mode === 'unrestricted') {
    flags += ' -c sandbox_workspace_write.network_access=true';
  }

  if (containment.extraWritableRoots.length > 0) {
    const roots = `sandbox_workspace_write.writable_roots=${JSON.stringify(
      containment.extraWritableRoots,
    )}`;
    flags += ` -c ${escapeShellArg(roots)}`;
  }

  return flags;
};

/**
 * @description The axes of `containment` that `driver` cannot enforce, as messages fit for a
 * run-start warning. Empty when the driver honours the whole profile or the profile restricts
 * nothing.
 * @public
 */
export const describeContainmentGaps = (
  driver: Pick<AgentDriver, 'capabilities' | 'label'>,
  containment: DriverContainment,
): readonly ContainmentGap[] => {
  const support = driver.capabilities.containment;
  const gaps: ContainmentGap[] = [];

  if (containment.filesystem === 'worktree-write' && !support.filesystem) {
    gaps.push({
      axis: 'filesystem',
      message: `${driver.label} cannot limit writes to the worktree; the run can write anywhere its user can`,
    });
  }

  const { network } = containment;
  if (network.mode === 'deny' && !support.networkDeny) {
    gaps.push({
      axis: 'network',
      message: `${driver.label} cannot block network access; egress is not contained`,
    });
  }

  if (network.mode === 'allowlist' && !support.networkAllowlist) {
    const fallback = support.networkDeny
      ? `network follows the CLI's own sandbox config`
      : `egress is not contained`;
    gaps.push({
      axis: 'network',
      message: `${driver.label} cannot limit egress to a host allowlist; ${fallback}`,
    });
  }

  return gaps;
};

/**
 * @description Support value for a CLI with no native sandbox OT can drive.
 * @public
 */
export const NO_CONTAINMENT_SUPPORT: DriverCapabilities['containment'] = {
  filesystem: false,
  networkAllowlist: false,
  networkDeny: false,
};
