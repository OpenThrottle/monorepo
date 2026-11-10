/**
 * Scope detection: who a captured invocation belongs to.
 *
 * - `ours`        — authored in this repo under `skills/<name>/`, so every checkout has it.
 * - `personal`    — authored by the invoking user under their personal skills root
 *                   (`~/.openthrottle/skills` / `OPENTHROTTLE_PERSONAL_SKILLS_DIR`) and linked
 *                   into the repo by ot-skill-sync: on disk and invokable, but outside the repo,
 *                   so nobody else's checkout has it.
 * - `injected`    — authored under ANOTHER checkout's `skills/<name>/` and linked into this
 *                   repo by foreign skill injection, so this repo's other checkouts lack it.
 * - `third-party` — everything else (plugin-namespaced `a:b`, or a skills-lock install).
 *
 * This runs synchronously inside a hook on every Skill invocation, so the `ours` answer is
 * returned before any symlink resolution happens, and every throw fails open to `third-party`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Scope } from '../types.ts';
import { resolveCheckoutRoot } from './checkout-root.ts';

/** Env var overriding the personal skills root. */
const PERSONAL_SKILLS_DIR_ENV = 'OPENTHROTTLE_PERSONAL_SKILLS_DIR';

/**
 * Where ot-skill-sync links a personal skill into the repo. This is the canonical, tool-neutral
 * location: sync writes the real symlink here, and every per-tool fan-out folder is itself a link
 * that chains through it. Probing only this one keeps the core free of tool names — naming the
 * per-tool folders here is what `__tests__/neutrality.test.ts` exists to catch, and they would
 * resolve to the same target anyway.
 */
const SKILL_LINK_DIR = path.join('.agents', 'skills');

/**
 * Where a person's skills live. Vendored deliberately: the source of truth is
 * `resolvePersonalSkillsRoot` in
 * `packages/openthrottle-agentic-utils/src/utils/foreign-skill-injection/personal-skills-config.ts`,
 * but that package's only export is a barrel pulling in `openai`, the drivers package and
 * postgres — and these hooks are esbuild-bundled into committed `.cjs` files that must stay
 * runtime-dependency-free. A third implementation of the same six lines already exists in bash
 * (`resolve_personal_skills_root` in `skills/ot-skill-sync/scripts/common.sh`). Change one,
 * change all three.
 *
 * Note this is the ROOT resolver, never the `resolvePersonalSkillsDir` wrapper: that one is the
 * foreign-injection gate (`OPENTHROTTLE_PERSONAL_SKILLS_ENABLED`, default off), which has
 * nothing to do with the in-repo personal tier this classifies.
 */
const resolvePersonalSkillsRoot = (env: NodeJS.ProcessEnv): string => {
  const override = env[PERSONAL_SKILLS_DIR_ENV]?.trim();
  if (override !== undefined && override !== '') {
    return override;
  }
  return path.join(os.homedir(), '.openthrottle', 'skills');
};

/**
 * True when `candidate` resolves (after realpath) strictly inside `root`. Both sides are
 * realpath'd, because a personal skill reaches the agent as a symlink under a fan-out dir
 * pointing at the external root — a plain path-prefix test on the link would never match.
 * Unresolvable (missing, dangling, unreadable) ⇒ false.
 *
 * Mirrors `isPathInsideRoot` in the developer app's `skill-path-allowlist.server.ts`.
 */
const isPathInsideRoot = (root: string, candidate: string): boolean => {
  try {
    const realRoot = fs.realpathSync(root);
    return fs.realpathSync(candidate).startsWith(`${realRoot}${path.sep}`);
  } catch {
    return false;
  }
};

/**
 * Membership in the CURRENTLY RESOLVED personal root is the test, not "anything outside the
 * repo": a skill whose realpath escapes the checkout but lands somewhere other than this user's
 * personal root is nobody's personal tier and stays `third-party`. Same reasoning as
 * `deriveSkillProvenance` in the developer app's `discover-repo-skills.server.ts`.
 */
const isPersonalSkill = (
  skillName: string,
  repoRoot: string,
  env: NodeJS.ProcessEnv,
): boolean => {
  const personalRoot = resolvePersonalSkillsRoot(env);
  return isPathInsideRoot(
    personalRoot,
    path.join(repoRoot, SKILL_LINK_DIR, skillName),
  );
};

/**
 * @description True when the link at `.agents/skills/<name>` resolves to exactly
 * `<checkout>/skills/<name>` of a git checkout OTHER than the one `repoRoot` sits in — the shape
 * foreign skill injection writes. Requiring the `skills/<name>` tail keeps an arbitrary symlink
 * that merely lands inside some repo out of this tier.
 */
const isInjectedSkill = (skillName: string, repoRoot: string): boolean => {
  const target = fs.realpathSync(
    path.join(repoRoot, SKILL_LINK_DIR, skillName),
  );
  const sourceRoot = resolveCheckoutRoot(target);
  if (sourceRoot === null) {
    return false;
  }
  const isAuthoredDir = target === path.join(sourceRoot, 'skills', skillName);
  const ownRoot = resolveCheckoutRoot(fs.realpathSync(repoRoot));
  return isAuthoredDir && sourceRoot !== ownRoot;
};

/**
 * @public
 */
export const detectScope = (
  skillName: string,
  repoRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): Scope => {
  if (!skillName || skillName.includes(':')) {
    return 'third-party';
  }

  const authoredDir = path.join(repoRoot, 'skills', skillName);
  try {
    if (fs.existsSync(authoredDir) && fs.statSync(authoredDir).isDirectory()) {
      return 'ours';
    }
  } catch {
    // fail-open → fall through to the personal check, then third-party
  }

  try {
    if (isPersonalSkill(skillName, repoRoot, env)) {
      return 'personal';
    }
  } catch {
    // fail-open → fall through to the injected check, then third-party
  }

  try {
    if (isInjectedSkill(skillName, repoRoot)) {
      return 'injected';
    }
  } catch {
    // fail-open → treat as third-party (missing or dangling link included)
  }

  return 'third-party';
};
