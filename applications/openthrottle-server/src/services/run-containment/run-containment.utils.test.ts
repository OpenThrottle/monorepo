import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DriverContainment } from '@openthrottle/openthrottle-drivers';
import { getDriver } from '@openthrottle/openthrottle-drivers';
import { getDefaultPlanRunContainmentProfile } from '@openthrottle/openthrottle-plan-config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildRunContainment,
  describeRunContainmentWarning,
} from './run-containment.utils.ts';

const DEFAULT_CONTAINMENT: DriverContainment = {
  extraWritableRoots: [],
  ...getDefaultPlanRunContainmentProfile(),
};

describe('buildRunContainment', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'run-containment-'));
  });

  afterEach(async () => {
    await rm(cwd, { force: true, recursive: true });
  });

  describe('when the job predates containment', () => {
    it('uses the default profile', async () => {
      const containment = await buildRunContainment({
        cwd,
        profile: undefined,
      });

      expect(containment).toEqual(DEFAULT_CONTAINMENT);
    });
  });

  describe('when the job carries a profile', () => {
    it('keeps it', async () => {
      const containment = await buildRunContainment({
        cwd,
        profile: { filesystem: 'unrestricted', network: { mode: 'deny' } },
      });

      expect(containment).toMatchObject({
        filesystem: 'unrestricted',
        network: { mode: 'deny' },
      });
    });
  });

  describe('when cwd is a linked worktree', () => {
    it('opens its private git dir for writes', async () => {
      await writeFile(
        join(cwd, '.git'),
        'gitdir: /repo/.git/worktrees/plan-1\n',
      );

      const containment = await buildRunContainment({
        cwd,
        profile: undefined,
      });

      expect(containment.extraWritableRoots).toEqual([
        '/repo/.git/worktrees/plan-1',
      ]);
    });

    it('resolves a relative gitdir against the worktree', async () => {
      await writeFile(join(cwd, '.git'), 'gitdir: ../main/.git/worktrees/x');

      const containment = await buildRunContainment({
        cwd,
        profile: undefined,
      });

      expect(containment.extraWritableRoots).toEqual([
        join(cwd, '..', 'main', '.git', 'worktrees', 'x'),
      ]);
    });
  });

  describe('when cwd is a primary checkout', () => {
    it('adds no extra root, since .git is already inside cwd', async () => {
      await mkdir(join(cwd, '.git'));

      const containment = await buildRunContainment({
        cwd,
        profile: undefined,
      });

      expect(containment.extraWritableRoots).toEqual([]);
    });
  });
});

describe('describeRunContainmentWarning', () => {
  it('says nothing for a driver that enforces the whole profile', () => {
    expect(
      describeRunContainmentWarning(getDriver('claude'), DEFAULT_CONTAINMENT),
    ).toBeUndefined();
  });

  it('names the one axis a partially supporting driver cannot enforce', () => {
    expect(
      describeRunContainmentWarning(getDriver('codex'), DEFAULT_CONTAINMENT),
    ).toBe(
      `containment warning: codex cannot limit egress to a host allowlist; network follows the CLI's own sandbox config`,
    );
  });

  it('joins every gap into one line for a driver with no sandbox', () => {
    const warning = describeRunContainmentWarning(
      getDriver('opencode'),
      DEFAULT_CONTAINMENT,
    );

    expect(warning?.startsWith('containment warning: ')).toBe(true);
    expect(warning).toContain('cannot limit writes to the worktree');
    expect(warning).toContain('cannot limit egress to a host allowlist');
    expect(warning?.split('\n')).toHaveLength(1);
  });
});
