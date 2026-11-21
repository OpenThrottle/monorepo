import { describe, expect, it } from 'vitest';

import {
  isJsonContentType,
  parseWebhookJson,
  pickAllowedHeaders,
  resolveDedupeKey,
  sha256Hex,
} from './request.utils.ts';

describe('isJsonContentType', () => {
  it.each([
    'application/json',
    'application/json; charset=utf-8',
    'Application/JSON',
  ])('accepts %s', (type) => {
    expect(isJsonContentType(type)).toBe(true);
  });

  it.each([
    undefined,
    'text/plain',
    'application/x-www-form-urlencoded',
    'application/jsonp',
    'application/csp-report',
  ])('rejects %s', (type) => {
    expect(isJsonContentType(type)).toBe(false);
  });
});

describe('pickAllowedHeaders', () => {
  it('keeps allow-listed headers and never the signature or authorization', () => {
    const picked = pickAllowedHeaders(
      {
        authorization: 'Bearer secret',
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-hub-signature-256': 'sha256=abc',
        'x-ot-signature': 'abc',
      },
      [],
    );

    expect(picked).toStrictEqual({
      'content-type': 'application/json',
      'x-github-event': 'push',
    });
  });

  it('adds the trigger configured headers', () => {
    expect(
      pickAllowedHeaders({ 'x-my-id': '7' }, ['X-My-Id', null]),
    ).toStrictEqual({ 'x-my-id': '7' });
  });

  it('truncates a long value', () => {
    const picked = pickAllowedHeaders({ 'user-agent': 'a'.repeat(1000) }, []);

    expect(picked['user-agent']).toHaveLength(256);
  });
});

describe('resolveDedupeKey', () => {
  const bodySha256 = 'deadbeef';

  it('prefers the sender delivery id', () => {
    expect(
      resolveDedupeKey({
        bodySha256,
        deliveryIdHeader: 'X-GitHub-Delivery',
        headers: { 'x-github-delivery': ' id-1 ' },
      }),
    ).toBe('id-1');
  });

  it('falls back to the body hash when the header is absent, blank or unconfigured', () => {
    expect(
      resolveDedupeKey({ bodySha256, deliveryIdHeader: 'X-Id', headers: {} }),
    ).toBe(bodySha256);
    expect(
      resolveDedupeKey({
        bodySha256,
        deliveryIdHeader: 'X-Id',
        headers: { 'x-id': ' ' },
      }),
    ).toBe(bodySha256);
    expect(
      resolveDedupeKey({
        bodySha256,
        deliveryIdHeader: null,
        headers: { 'x-id': '1' },
      }),
    ).toBe(bodySha256);
  });
});

describe('parseWebhookJson', () => {
  it('parses valid JSON', () => {
    expect(parseWebhookJson(Buffer.from('{"a":1}'))).toStrictEqual({
      ok: true,
      payload: { a: 1 },
    });
  });

  it.each(['', '{', 'not json'])(
    'reports invalid JSON for %j without throwing',
    (raw) => {
      expect(parseWebhookJson(Buffer.from(raw))).toStrictEqual({ ok: false });
    },
  );
});

describe('sha256Hex', () => {
  it('hashes the bytes', () => {
    expect(sha256Hex(Buffer.from('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
