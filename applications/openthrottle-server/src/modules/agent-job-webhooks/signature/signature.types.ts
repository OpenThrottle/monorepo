/**
 * @description The signature rules a trigger resolves to. `generic` and `github` are fixed by their
 * preset regardless of what is stored; `custom` uses the stored header, encoding and timestamp.
 */
export interface WebhookSignatureRules {
  readonly deliveryIdHeader: string | null;
  readonly encoding: 'base64' | 'hex';
  readonly prefix: string;
  readonly signatureHeader: string;
  readonly timestampHeader: string | null;
}

/** @description Outcome of verifying a signature: ok, or why not. */
export type WebhookSignatureResult =
  | { readonly ok: false; readonly reason: 'bad_signature' }
  | { readonly ok: true };

/** @description Outcome of the replay-window check. */
export type WebhookTimestampResult =
  | {
      readonly ok: false;
      readonly reason: 'missing_timestamp' | 'stale_timestamp';
    }
  | { readonly ok: true; readonly timestamp: string };
