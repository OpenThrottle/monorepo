import { describe, expect, it } from 'vitest';

import { isPermissionAllowed } from './is-permission-allowed.ts';

const ORIGIN = 'http://127.0.0.1:5123';
const base = {
  allowedOrigins: [ORIGIN],
  mediaTypes: ['audio'],
  permission: 'media',
  requestingOrigin: ORIGIN,
};

describe('isPermissionAllowed', () => {
  it('allows audio-only media from the app origin', () => {
    expect(isPermissionAllowed(base)).toBe(true);
  });

  it('denies video, mixed and unknown media', () => {
    expect(isPermissionAllowed({ ...base, mediaTypes: ['video'] })).toBe(false);
    expect(
      isPermissionAllowed({ ...base, mediaTypes: ['audio', 'video'] }),
    ).toBe(false);
    expect(isPermissionAllowed({ ...base, mediaTypes: ['unknown'] })).toBe(
      false,
    );
    expect(isPermissionAllowed({ ...base, mediaTypes: [] })).toBe(false);
  });

  it('denies media from any other origin', () => {
    expect(
      isPermissionAllowed({ ...base, requestingOrigin: 'https://example.com' }),
    ).toBe(false);
    expect(isPermissionAllowed({ ...base, allowedOrigins: [] })).toBe(false);
  });

  it('denies every other permission, notifications included', () => {
    for (const permission of [
      'notifications',
      'geolocation',
      'display-capture',
      'clipboard-read',
      'openExternal',
      'midi',
      'unknown',
    ]) {
      expect(isPermissionAllowed({ ...base, permission })).toBe(false);
    }
  });
});
