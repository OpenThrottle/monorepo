/**
 * @description Opt-in configuration for the per-user personal/experimental skill tier. This is the
 * middle layer of foreign-skill injection (OT curated < personal < target repo): a private, per-user
 * directory of unreleased skills that a developer can inject into their own foreign runs WITHOUT
 * committing them to git or affecting any other user. It is OFF by default — nothing is injected from
 * here unless the toggle is explicitly enabled.
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Env var enabling the personal skill tier. OFF unless set to a truthy value
 * (`1`/`true`/`yes`/`on`, case-insensitive). Default OFF.
 *
 * @public
 */
export const PERSONAL_SKILLS_ENABLED_ENV =
  'OPENTHROTTLE_PERSONAL_SKILLS_ENABLED';

/**
 * Env var overriding the personal skills directory. Defaults to `~/.openthrottle/skills`.
 *
 * @public
 */
export const PERSONAL_SKILLS_DIR_ENV = 'OPENTHROTTLE_PERSONAL_SKILLS_DIR';

const TRUTHY = new Set(['1', 'on', 'true', 'yes']);

const isEnabled = (env: NodeJS.ProcessEnv): boolean => {
  const raw = env[PERSONAL_SKILLS_ENABLED_ENV]?.trim().toLowerCase();
  return raw !== undefined && TRUTHY.has(raw);
};

/**
 * @description Resolves WHERE a person's skills live, with no opinion on whether any given consumer
 * should use them. This is the single definition of the personal root, shared across the whole
 * codebase: an explicit {@link PERSONAL_SKILLS_DIR_ENV} override wins, otherwise `~/.openthrottle/skills`.
 * Always returns a path — a root that does not exist is not an error, since discovery treats a
 * missing root as empty.
 *
 * The same contract is implemented in bash by `resolve_personal_skills_root` in
 * `skills/ot-skill-sync/scripts/common.sh`, because the in-repo sync pipeline is shell. The two are
 * pinned to each other by a test rather than by a runtime dependency (a shell script that had to
 * boot Node to find a directory would be a worse trade). Change one, change both.
 *
 * @public
 */
export const resolvePersonalSkillsRoot = (
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const override = env[PERSONAL_SKILLS_DIR_ENV]?.trim();
  if (override !== undefined && override !== '') {
    return override;
  }
  return join(homedir(), '.openthrottle', 'skills');
};

/**
 * @description Resolves the personal skills directory FOR FOREIGN-SKILL INJECTION, or `undefined`
 * when that tier is disabled (the default). Delegates the path itself to
 * {@link resolvePersonalSkillsRoot}; all this adds is the {@link PERSONAL_SKILLS_ENABLED_ENV} gate.
 *
 * The gate is deliberately foreign-only. Injection writes into somebody else's repository, from a
 * machine-wide service, for repos the person never named — an explicit default-off toggle is the
 * right price for that. The in-repo tier (`ot-skill-sync`) has no such toggle: it writes gitignored
 * symlinks into the repo you are already standing in, so creating the directory is the opt-in. See
 * docs/monorepo/foreign-workspace-skill-injection.md §7.1.
 *
 * @public
 */
export const resolvePersonalSkillsDir = (
  env: NodeJS.ProcessEnv = process.env,
): string | undefined =>
  isEnabled(env) ? resolvePersonalSkillsRoot(env) : undefined;
