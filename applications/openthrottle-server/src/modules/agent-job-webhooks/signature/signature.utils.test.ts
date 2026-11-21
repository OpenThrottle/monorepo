import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  buildSignedPayload,
  checkWebhookTimestamp,
  resolveSignatureRules,
  verifyWebhookSignature,
} from './signature.utils.ts';

const secret = 'topsecret';
const body = Buffer.from('{"a":1}');

const hmac = (signed: string | Buffer): Buffer => {
  return createHmac('sha256', secret).update(signed).digest();
};

const baseTrigger = {
  deliveryIdHeader: null,
  signatureEncoding: 'hex',
  signatureHeader: 'X-Sig',
  signaturePreset: 'custom',
  timestampHeader: null,
} as const;

describe('resolveSignatureRules', () => {
  it('fixes the generic preset regardless of the stored headers', () => {
    const rules = resolveSignatureRules({
      ...baseTrigger,
      signatureHeader: 'ignored',
      signaturePreset: 'generic',
    });

    expect(rules).toStrictEqual({
      deliveryIdHeader: 'X-OT-Webhook-Id',
      encoding: 'hex',
      prefix: '',
      signatureHeader: 'X-OT-Signature',
      timestampHeader: 'X-OT-Timestamp',
    });
  });

  it('fixes the github preset: sha256= prefix, no timestamp', () => {
    const rules = resolveSignatureRules({
      ...baseTrigger,
      signaturePreset: 'github',
    });

    expect(rules).toStrictEqual({
      deliveryIdHeader: 'X-GitHub-Delivery',
      encoding: 'hex',
      prefix: 'sha256=',
      signatureHeader: 'X-Hub-Signature-256',
      timestampHeader: null,
    });
  });

  it('uses the stored configuration for custom', () => {
    const rules = resolveSignatureRules({
      ...baseTrigger,
      deliveryIdHeader: 'X-Id',
      signatureEncoding: 'base64',
      timestampHeader: 'X-Ts',
    });

    expect(rules).toStrictEqual({
      deliveryIdHeader: 'X-Id',
      encoding: 'base64',
      prefix: '',
      signatureHeader: 'X-Sig',
      timestampHeader: 'X-Ts',
    });
  });
});

describe('buildSignedPayload', () => {
  it('is the raw body without a timestamp', () => {
    expect(buildSignedPayload(body, null)).toStrictEqual(body);
  });

  it('prefixes `<timestamp>.` when there is one', () => {
    expect(buildSignedPayload(body, '1700000000').toString()).toBe(
      '1700000000.{"a":1}',
    );
  });
});

describe('verifyWebhookSignature', () => {
  const rulesFor = (
    preset: 'custom' | 'generic' | 'github',
    overrides = {},
  ) => {
    return resolveSignatureRules({
      ...baseTrigger,
      signaturePreset: preset,
      ...overrides,
    });
  };

  it('accepts a generic signature over `<timestamp>.<body>`', () => {
    const result = verifyWebhookSignature({
      providedSignature: hmac('1700000000.{"a":1}').toString('hex'),
      rawBody: body,
      rules: rulesFor('generic'),
      secret,
      timestamp: '1700000000',
    });

    expect(result).toStrictEqual({ ok: true });
  });

  it('accepts a github signature with the sha256= prefix over the body alone', () => {
    const result = verifyWebhookSignature({
      providedSignature: `sha256=${hmac(body).toString('hex')}`,
      rawBody: body,
      rules: rulesFor('github'),
      secret,
      timestamp: null,
    });

    expect(result).toStrictEqual({ ok: true });
  });

  it('accepts a custom hex signature', () => {
    const result = verifyWebhookSignature({
      providedSignature: hmac(body).toString('hex'),
      rawBody: body,
      rules: rulesFor('custom'),
      secret,
      timestamp: null,
    });

    expect(result).toStrictEqual({ ok: true });
  });

  it('accepts a custom base64 signature over a timestamp-prefixed string', () => {
    const result = verifyWebhookSignature({
      providedSignature: hmac('99.{"a":1}').toString('base64'),
      rawBody: body,
      rules: rulesFor('custom', {
        signatureEncoding: 'base64',
        timestampHeader: 'X-Ts',
      }),
      secret,
      timestamp: '99',
    });

    expect(result).toStrictEqual({ ok: true });
  });

  it('rejects a missing signature', () => {
    const result = verifyWebhookSignature({
      providedSignature: undefined,
      rawBody: body,
      rules: rulesFor('custom'),
      secret,
      timestamp: null,
    });

    expect(result).toStrictEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a signature made with another secret', () => {
    const forged = createHmac('sha256', 'other').update(body).digest('hex');

    expect(
      verifyWebhookSignature({
        providedSignature: forged,
        rawBody: body,
        rules: rulesFor('custom'),
        secret,
        timestamp: null,
      }).ok,
    ).toBe(false);
  });

  it('rejects a body that was edited after signing', () => {
    expect(
      verifyWebhookSignature({
        providedSignature: hmac(body).toString('hex'),
        rawBody: Buffer.from('{"a":2}'),
        rules: rulesFor('custom'),
        secret,
        timestamp: null,
      }).ok,
    ).toBe(false);
  });

  it('rejects a timestamp edited after signing (it is inside the signed string)', () => {
    expect(
      verifyWebhookSignature({
        providedSignature: hmac('1700000000.{"a":1}').toString('hex'),
        rawBody: body,
        rules: rulesFor('generic'),
        secret,
        timestamp: '1700000001',
      }).ok,
    ).toBe(false);
  });

  it.each([
    ['a too-short hex digest', 'abcd'],
    ['a too-long hex digest', `${hmac(body).toString('hex')}00`],
    ['non-hex characters', 'z'.repeat(64)],
    ['an empty value', ''],
  ])('rejects %s without throwing', (_label, provided) => {
    expect(
      verifyWebhookSignature({
        providedSignature: provided,
        rawBody: body,
        rules: rulesFor('custom'),
        secret,
        timestamp: null,
      }),
    ).toStrictEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a wrong-length base64 digest', () => {
    expect(
      verifyWebhookSignature({
        providedSignature: Buffer.alloc(31).toString('base64'),
        rawBody: body,
        rules: rulesFor('custom', { signatureEncoding: 'base64' }),
        secret,
        timestamp: null,
      }).ok,
    ).toBe(false);
  });

  it('rejects a github signature that lacks the sha256= prefix', () => {
    expect(
      verifyWebhookSignature({
        providedSignature: hmac(body).toString('hex'),
        rawBody: body,
        rules: rulesFor('github'),
        secret,
        timestamp: null,
      }).ok,
    ).toBe(false);
  });
});

describe('checkWebhookTimestamp', () => {
  const nowMs = 1_700_000_000_000;
  const check = (header: string | undefined, toleranceSeconds = 300) => {
    return checkWebhookTimestamp({ header, nowMs, toleranceSeconds });
  };

  it('accepts a timestamp inside the window', () => {
    expect(check('1700000100')).toStrictEqual({
      ok: true,
      timestamp: '1700000100',
    });
  });

  it('accepts a timestamp exactly at the tolerance', () => {
    expect(check('1699999700').ok).toBe(true);
  });

  it('rejects a stale timestamp', () => {
    expect(check('1699999000')).toStrictEqual({
      ok: false,
      reason: 'stale_timestamp',
    });
  });

  it('rejects a timestamp too far in the future', () => {
    expect(check('1700001000')).toStrictEqual({
      ok: false,
      reason: 'stale_timestamp',
    });
  });

  it('rejects a missing timestamp', () => {
    expect(check(undefined)).toStrictEqual({
      ok: false,
      reason: 'missing_timestamp',
    });
  });

  it('rejects a blank timestamp as missing', () => {
    expect(check('  ')).toStrictEqual({
      ok: false,
      reason: 'missing_timestamp',
    });
  });

  it('rejects a non-numeric timestamp', () => {
    expect(check('yesterday')).toStrictEqual({
      ok: false,
      reason: 'stale_timestamp',
    });
  });

  it('honours a configured tolerance', () => {
    expect(check('1699999900', 30).ok).toBe(false);
  });
});
