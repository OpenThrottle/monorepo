/**
 * @description Injection token for the host's {@link CmsWriteAuthorizer}. Without a provider for
 * it, every cms mutation is refused (fail closed).
 * @public
 */
export const CMS_WRITE_AUTHORIZER = 'CMS_WRITE_AUTHORIZER';

/**
 * @description Domain for the synthetic email of a profile whose OpenThrottle user has none
 * (`profiles.email` is NOT NULL). `.invalid` is reserved by RFC 2606, so it can never deliver.
 * @public
 */
export const CMS_PROFILE_PLACEHOLDER_EMAIL_DOMAIN = 'openthrottle.invalid';
