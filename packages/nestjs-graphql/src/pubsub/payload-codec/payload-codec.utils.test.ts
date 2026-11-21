import { describe, expect, it } from 'vitest';

import {
  decodePubSubPayload,
  encodePubSubPayload,
} from './payload-codec.utils.ts';

describe('encodePubSubPayload / decodePubSubPayload', () => {
  it('round-trips a plain JSON payload unchanged', () => {
    const payload = {
      event: {
        event: 'plan.status_changed',
        planId: 'abc',
        severity: 'info',
        timestamp: '2026-11-20T00:00:00.000Z',
      },
    };

    expect(decodePubSubPayload(encodePubSubPayload(payload))).toEqual(payload);
  });

  it('restores nested Date values as Date instances', () => {
    const createdAt = new Date('2026-11-20T12:34:56.789Z');
    const decoded = decodePubSubPayload(
      encodePubSubPayload({
        planOutputChunkAdded: { content: 'hi', createdAt, list: [createdAt] },
      }),
    );

    expect(decoded).toEqual({
      planOutputChunkAdded: { content: 'hi', createdAt, list: [createdAt] },
    });
  });

  it('keeps an ISO-looking string a string', () => {
    const decoded = decodePubSubPayload(
      encodePubSubPayload({ timestamp: '2026-11-20T00:00:00.000Z' }),
    );

    expect(decoded).toEqual({ timestamp: '2026-11-20T00:00:00.000Z' });
  });

  it('encodes an invalid Date as null', () => {
    const decoded = decodePubSubPayload(
      encodePubSubPayload({ at: new Date(Number.NaN) }),
    );

    expect(decoded).toEqual({ at: null });
  });

  it('throws on a malformed message', () => {
    expect(() => {
      return decodePubSubPayload('{not json');
    }).toThrow();
  });
});
