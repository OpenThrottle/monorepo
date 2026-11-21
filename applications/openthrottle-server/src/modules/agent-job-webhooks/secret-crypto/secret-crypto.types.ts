/** @description Result of resolving the encryption key from the environment. */
export type WebhookEncryptionKeyResult =
  | { readonly key: Buffer; readonly ok: true }
  | { readonly message: string; readonly ok: false };

/** @description Result of decrypting a stored secret. */
export type WebhookSecretDecryptResult =
  | { readonly ok: true; readonly secret: string }
  | { readonly message: string; readonly ok: false };
