import { createHmac, timingSafeEqual } from 'node:crypto';

import type { ScheduledAgentJobWebhookTrigger } from '@openthrottle/nestjs-repositories-server';

import { WEBHOOK_PRESET_HEADERS } from '../agent-job-webhooks.constants.ts';
import type {
  WebhookSignatureResult,
  WebhookSignatureRules,
  WebhookTimestampResult,
} from './signature.types.ts';

const SHA256_BYTES = 32;
const HEX_SHA256 = /^[0-9a-f]{64}$/i;
const GITHUB_PREFIX = 'sha256=';

/** @description Resolves the effective signature rules of a trigger from its preset. */
export const resolveSignatureRules = (
  trigger: Pick<
    ScheduledAgentJobWebhookTrigger,
    | 'deliveryIdHeader'
    | 'signatureEncoding'
    | 'signatureHeader'
    | 'signaturePreset'
    | 'timestampHeader'
  >,
): WebhookSignatureRules => {
  if (trigger.signaturePreset === 'generic') {
    return {
      deliveryIdHeader: WEBHOOK_PRESET_HEADERS.generic.deliveryIdHeader,
      encoding: 'hex',
      prefix: '',
      signatureHeader: WEBHOOK_PRESET_HEADERS.generic.signatureHeader,
      timestampHeader: WEBHOOK_PRESET_HEADERS.generic.timestampHeader,
    };
  }

  if (trigger.signaturePreset === 'github') {
    return {
      deliveryIdHeader: WEBHOOK_PRESET_HEADERS.github.deliveryIdHeader,
      encoding: 'hex',
      prefix: GITHUB_PREFIX,
      signatureHeader: WEBHOOK_PRESET_HEADERS.github.signatureHeader,
      timestampHeader: null,
    };
  }

  return {
    deliveryIdHeader: trigger.deliveryIdHeader,
    encoding: trigger.signatureEncoding,
    prefix: '',
    signatureHeader: trigger.signatureHeader,
    timestampHeader: trigger.timestampHeader,
  };
};

/**
 * @description The bytes that are signed: `${timestamp}.${rawBody}` when the rules carry a
 * timestamp (so it cannot be edited without breaking the signature), else the raw body alone.
 */
export const buildSignedPayload = (
  rawBody: Buffer,
  timestamp: string | null,
): Buffer => {
  if (timestamp === null) {
    return rawBody;
  }

  return Buffer.concat([Buffer.from(`${timestamp}.`, 'utf8'), rawBody]);
};

/** @description HMAC-SHA256 of the signed payload under the secret, as raw digest bytes. */
export const computeWebhookHmac = (secret: string, signed: Buffer): Buffer => {
  return createHmac('sha256', secret).update(signed).digest();
};

/** @description Decodes the signature header into digest bytes, or null when it is not a valid SHA-256 digest. */
const decodeProvidedSignature = (
  header: string,
  rules: WebhookSignatureRules,
): Buffer | null => {
  if (!header.startsWith(rules.prefix)) {
    return null;
  }

  const value = header.slice(rules.prefix.length).trim();

  if (rules.encoding === 'hex') {
    return HEX_SHA256.test(value) ? Buffer.from(value, 'hex') : null;
  }

  const decoded = Buffer.from(value, 'base64');

  return decoded.length === SHA256_BYTES ? decoded : null;
};

/**
 * @description Verifies the signature over the RAW request bytes. The provided value is decoded
 * and compared with `timingSafeEqual` on equal-length buffers; an absent, malformed or
 * wrong-length signature is a plain reject.
 */
export const verifyWebhookSignature = (input: {
  readonly providedSignature: string | undefined;
  readonly rawBody: Buffer;
  readonly rules: WebhookSignatureRules;
  readonly secret: string;
  readonly timestamp: string | null;
}): WebhookSignatureResult => {
  if (input.providedSignature === undefined) {
    return { ok: false, reason: 'bad_signature' };
  }

  const provided = decodeProvidedSignature(
    input.providedSignature,
    input.rules,
  );

  if (provided === null) {
    return { ok: false, reason: 'bad_signature' };
  }

  const expected = computeWebhookHmac(
    input.secret,
    buildSignedPayload(input.rawBody, input.timestamp),
  );

  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return { ok: false, reason: 'bad_signature' };
  }

  return { ok: true };
};

/**
 * @description Checks the signed timestamp header: it must be present, a plain unix-seconds
 * integer, and within `toleranceSeconds` of `nowMs` in either direction.
 */
export const checkWebhookTimestamp = (input: {
  readonly header: string | undefined;
  readonly nowMs: number;
  readonly toleranceSeconds: number;
}): WebhookTimestampResult => {
  const raw = input.header?.trim() ?? '';

  if (raw === '') {
    return { ok: false, reason: 'missing_timestamp' };
  }

  if (!/^\d{1,12}$/.test(raw)) {
    return { ok: false, reason: 'stale_timestamp' };
  }

  const skewSeconds = Math.abs(input.nowMs / 1000 - Number(raw));

  if (skewSeconds > input.toleranceSeconds) {
    return { ok: false, reason: 'stale_timestamp' };
  }

  return { ok: true, timestamp: raw };
};
