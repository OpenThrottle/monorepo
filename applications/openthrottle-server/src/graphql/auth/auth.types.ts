export interface JwtSecretPolicyInput {
  /** `OPENTHROTTLE_ALLOW_DEFAULT_JWT_SECRET` — `true` lets a local-only stack keep the default. */
  readonly allowDefault: string | undefined;
  readonly nodeEnv: string | undefined;
  readonly secret: string | undefined;
}
