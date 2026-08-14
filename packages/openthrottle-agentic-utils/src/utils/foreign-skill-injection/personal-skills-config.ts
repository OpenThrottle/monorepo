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
 * @description Resolves the per-user personal skills directory to feed the resolver's middle layer,
 * or `undefined` when the tier is disabled (the default). When enabled, an explicit
 * {@link PERSONAL_SKILLS_DIR_ENV} override wins; otherwise it defaults to `~/.openthrottle/skills`.
 * A configured directory that does not exist is not an error — discovery treats a missing root as
 * empty — so enabling the tier before creating the dir is harmless.
 *
 * @public
 */
export const resolvePersonalSkillsDir = (
  env: NodeJS.ProcessEnv = process.env,
): string | undefined => {
  if (!isEnabled(env)) {
    return undefined;
  }
  const override = env[PERSONAL_SKILLS_DIR_ENV]?.trim();
  if (override !== undefined && override !== '') {
    return override;
  }
  return join(homedir(), '.openthrottle', 'skills');
};
