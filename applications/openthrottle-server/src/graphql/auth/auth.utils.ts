import { createHash } from 'node:crypto';

import type { JwtSecretPolicyInput } from './auth.types.ts';

/**
 * SHA-256 digests of JWT secrets committed to the repo's `.env.default` files.
 * Stored as hashes so the literal is not repeated here. Add a digest whenever
 * a new committed default appears (`node -e` + `crypto.createHash('sha256')`).
 */
const COMMITTED_JWT_SECRET_SHA256: ReadonlySet<string> = new Set([
  '804ccce20f1847f610a63032184e2f2a5fabe10dce5c08ebd025027b5dd4eb21',
]);

/**
 * @description Whether `secret` is one of the JWT secrets committed to the repo.
 * Anyone who can read the repo can forge tokens signed with one.
 */
export function isCommittedJwtSecret(secret: string): boolean {
  const digest = createHash('sha256').update(secret, 'utf8').digest('hex');

  return COMMITTED_JWT_SECRET_SHA256.has(digest);
}

/**
 * @description Fails server boot when production runs on a committed JWT
 * secret. Missing and short secrets are already refused by `JwtStrategy`
 * (`@openthrottle/nestjs-auth`); this closes the gap where the committed
 * default is long enough to pass that check. Outside production, or with
 * `OPENTHROTTLE_ALLOW_DEFAULT_JWT_SECRET=true` (the root docker-compose
 * stack, which is local-only), the default is allowed. Throwing is
 * deliberate: the process must not start.
 */
export function assertJwtSecretAllowed(input: JwtSecretPolicyInput): void {
  const { allowDefault, nodeEnv, secret } = input;

  if (nodeEnv !== 'production' || secret === undefined) {
    return;
  }

  if (allowDefault?.trim().toLowerCase() === 'true') {
    return;
  }

  if (isCommittedJwtSecret(secret)) {
    throw new Error(
      `JWT_SECRET is the default committed to this repository, so anyone can forge login tokens. Set JWT_SECRET (OPENTHROTTLE_DEVELOPER_JWT_SECRET in compose) to a long random value, e.g. \`openssl rand -base64 48\`, and restart.`,
    );
  }
}
