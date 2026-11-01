/**
 * @description The bootstrap login user's password policy.
 *
 * Local setup seeds a well-known default password so a fresh checkout can sign
 * in straight away. That default is public — it is in this repository — so it
 * must never be the password of a user on a deployed box:
 *
 * - `bootstrap` refuses to run in production without an explicit, non-default
 *   `OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD`, and rotates an existing user still
 *   on the default.
 * - Login refuses the default password in production, so a box bootstrapped
 *   before this rule existed is closed even before bootstrap is re-run.
 */

/** The public default password for the local bootstrap user. */
export const DEFAULT_BOOTSTRAP_USER_PASSWORD = 'FullThrottle2026!';

/**
 * @description The bootstrap user's password: the env value when set, else
 * the default — which is refused in production.
 * @throws Error in production when the value is unset or the default.
 */
export const resolveBootstrapUserPassword = (
  value: string | undefined,
  isProduction: boolean,
): string => {
  const password = value?.trim() || DEFAULT_BOOTSTRAP_USER_PASSWORD;

  if (isProduction && password === DEFAULT_BOOTSTRAP_USER_PASSWORD) {
    throw new Error(
      'OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD must be set to a non-default value in production: the default password is public. Pass it to `docker compose run --rm bootstrap`.',
    );
  }

  return password;
};

/**
 * @description True when this is a production login with the public default
 * password, which must be refused whatever the stored hash says.
 */
export const isRefusedDefaultPassword = (
  password: string,
  isProduction: boolean,
): boolean => isProduction && password === DEFAULT_BOOTSTRAP_USER_PASSWORD;
