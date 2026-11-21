/**
 * @description A freshly minted URL token: the value shown once, the hash that is stored, and the
 * short prefix kept for display.
 */
export interface GeneratedWebhookToken {
  readonly token: string;
  readonly tokenHash: Buffer;
  readonly tokenPrefix: string;
}
