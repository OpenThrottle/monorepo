/**
 * @description Unit tests for the ot-worktree script ladder, against real temp directories: each
 * rung wins in order, a directory without the script falls through, and nothing found comes back as
 * a result naming every searched path rather than a throw.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  OT_WORKTREE_ACTION,
  OT_WORKTREE_SCRIPT_RUNG,
} from './ot-worktree-script.constants.ts';
import { resolveOtWorktreeScript } from './ot-worktree-script.utils.ts';

const SCRIPTS = join('ot-worktree', 'scripts');

describe('resolveOtWorktreeScript', () => {
  let checkout: string;
  let otRoot: string;
  let scratch: string;

  /** Writes `<skillsRoot>/ot-worktree/scripts/<file>` and returns its path. */
  const plant = (skillsRoot: string, file = 'create.sh'): string => {
    const dir = join(skillsRoot, SCRIPTS);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, file);
    writeFileSync(path, '#!/usr/bin/env bash\n');
    return path;
  };

  const resolveCreate = (
    env: NodeJS.ProcessEnv = { WORKFLOW_RALPH_OT_ROOT: otRoot },
  ): ReturnType<typeof resolveOtWorktreeScript> => {
    return resolveOtWorktreeScript({
      action: OT_WORKTREE_ACTION.CREATE,
      baseCheckoutPath: checkout,
      env,
    });
  };

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), 'ot-worktree-script-'));
    checkout = join(scratch, 'checkout');
    otRoot = join(scratch, 'openthrottle');
    mkdirSync(checkout, { recursive: true });
    mkdirSync(otRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(scratch, { force: true, recursive: true });
  });

  describe('when the checkout ships its own skills/ot-worktree', () => {
    it('resolves the checkout-skills rung ahead of every overlay', () => {
      const expected = plant(join(checkout, 'skills'));
      plant(join(checkout, '.agents', 'skills'));
      plant(join(otRoot, 'skills'));

      expect(resolveCreate()).toEqual({
        ok: true,
        rung: OT_WORKTREE_SCRIPT_RUNG.CHECKOUT_SKILLS,
        scriptPath: expected,
      });
    });
  });

  describe('when only the .agents overlay is present', () => {
    it('resolves the agents-overlay rung ahead of .claude and the SSOT', () => {
      const expected = plant(join(checkout, '.agents', 'skills'));
      plant(join(checkout, '.claude', 'skills'));
      plant(join(otRoot, 'skills'));

      expect(resolveCreate()).toEqual({
        ok: true,
        rung: OT_WORKTREE_SCRIPT_RUNG.AGENTS_OVERLAY,
        scriptPath: expected,
      });
    });
  });

  describe('when only the .claude overlay is present', () => {
    it('resolves the claude-overlay rung ahead of the SSOT', () => {
      const expected = plant(join(checkout, '.claude', 'skills'));
      plant(join(otRoot, 'skills'));

      expect(resolveCreate()).toEqual({
        ok: true,
        rung: OT_WORKTREE_SCRIPT_RUNG.CLAUDE_OVERLAY,
        scriptPath: expected,
      });
    });
  });

  describe('when the checkout carries nothing', () => {
    it("falls back to the server's own SSOT", () => {
      const expected = plant(join(otRoot, 'skills'));

      expect(resolveCreate()).toEqual({
        ok: true,
        rung: OT_WORKTREE_SCRIPT_RUNG.OPENTHROTTLE_SSOT,
        scriptPath: expected,
      });
    });

    it('falls through an overlay directory that lacks the requested script', () => {
      plant(join(checkout, '.agents', 'skills'), 'destroy.sh');
      mkdirSync(join(checkout, 'skills', SCRIPTS), { recursive: true });
      const expected = plant(join(otRoot, 'skills'));

      expect(resolveCreate()).toMatchObject({
        rung: OT_WORKTREE_SCRIPT_RUNG.OPENTHROTTLE_SSOT,
        scriptPath: expected,
      });
    });
  });

  describe('when no rung has the script', () => {
    it('returns a result listing every searched path instead of throwing', () => {
      const result = resolveCreate();

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.searched).toEqual([
        join(checkout, 'skills', SCRIPTS, 'create.sh'),
        join(checkout, '.agents', 'skills', SCRIPTS, 'create.sh'),
        join(checkout, '.claude', 'skills', SCRIPTS, 'create.sh'),
        join(otRoot, 'skills', SCRIPTS, 'create.sh'),
      ]);
    });
  });

  describe('when the base checkout is the OpenThrottle monorepo itself', () => {
    it("resolves rung 1, the checkout's own skills/ot-worktree", () => {
      const monorepo = join(import.meta.dirname, '../../../../..');

      expect(
        resolveOtWorktreeScript({
          action: OT_WORKTREE_ACTION.CREATE,
          baseCheckoutPath: monorepo,
          env: {},
        }),
      ).toEqual({
        ok: true,
        rung: OT_WORKTREE_SCRIPT_RUNG.CHECKOUT_SKILLS,
        scriptPath: join(monorepo, 'skills', SCRIPTS, 'create.sh'),
      });
    });
  });

  describe('against the real repository', () => {
    it('resolves every action from the monorepo SSOT', () => {
      const actions = Object.values(OT_WORKTREE_ACTION);
      const results = actions.map((action) => {
        return resolveOtWorktreeScript({
          action,
          baseCheckoutPath: checkout,
          env: {},
        });
      });

      for (const result of results) {
        expect(result).toMatchObject({
          ok: true,
          rung: OT_WORKTREE_SCRIPT_RUNG.OPENTHROTTLE_SSOT,
        });
      }
    });
  });
});
