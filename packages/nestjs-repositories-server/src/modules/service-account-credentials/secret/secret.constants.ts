/**
 * @description Shortest `ot_sa_` secret a credential may be stored with. A minted secret is 32
 * alphanumeric characters (~190 bits), which is what makes a fast SHA-256 hash safe; an
 * operator-supplied token below this length is refused rather than hashed.
 * @public
 */
export const SERVICE_ACCOUNT_SECRET_MIN_LENGTH = 32;
