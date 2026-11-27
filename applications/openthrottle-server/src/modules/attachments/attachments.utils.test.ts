import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ATTACHMENT_ORIGINAL_NAME_MAX_LENGTH } from './attachments.constants.ts';
import {
  isUuid,
  readAuthenticatedUserId,
  readUploadedImageFile,
  sanitizeOriginalName,
} from './attachments.utils.ts';

describe('sanitizeOriginalName', () => {
  it.each([undefined, null, 5, {}])('is null for non-string %s', (value) => {
    expect(sanitizeOriginalName(value)).toBeNull();
  });

  it('keeps the last path segment of a posix or windows path', () => {
    expect(sanitizeOriginalName('../../etc/shot.png')).toBe('shot.png');
    expect(sanitizeOriginalName('C:\\Users\\me\\shot.png')).toBe('shot.png');
  });

  it('drops control characters', () => {
    expect(sanitizeOriginalName('sh\u0000o\u001ft\u007f.png')).toBe('shot.png');
  });

  it('is null when nothing usable is left', () => {
    expect(sanitizeOriginalName('')).toBeNull();
    expect(sanitizeOriginalName('dir/')).toBeNull();
    expect(sanitizeOriginalName('  \u0001 ')).toBeNull();
  });

  it('caps the length', () => {
    const name = 'a'.repeat(ATTACHMENT_ORIGINAL_NAME_MAX_LENGTH + 50);

    expect(sanitizeOriginalName(name)).toHaveLength(
      ATTACHMENT_ORIGINAL_NAME_MAX_LENGTH,
    );
  });
});

describe('readUploadedImageFile', () => {
  it.each([undefined, null, 'file', 3])(
    'is null for non-object %s',
    (value) => {
      expect(readUploadedImageFile(value)).toBeNull();
    },
  );

  it('is null when the buffer is missing or not bytes', () => {
    expect(readUploadedImageFile({ originalname: 'a.png' })).toBeNull();
    expect(
      readUploadedImageFile({ buffer: 'text', originalname: 'a.png' }),
    ).toBeNull();
  });

  it('returns the buffer and a sanitized name', () => {
    const buffer = Buffer.from([1, 2, 3]);

    expect(
      readUploadedImageFile({ buffer, originalname: 'x/shot.png' }),
    ).toEqual({ buffer, originalName: 'shot.png' });
  });

  it('has a null name when the client sent none', () => {
    const buffer = Buffer.from([1]);

    expect(readUploadedImageFile({ buffer })).toEqual({
      buffer,
      originalName: null,
    });
  });
});

describe('isUuid', () => {
  it('accepts a uuidv7 and an uppercase uuid', () => {
    expect(isUuid('01890a5d-ac96-774b-bcce-b302099a8057')).toBe(true);
    expect(isUuid('01890A5D-AC96-774B-BCCE-B302099A8057')).toBe(true);
  });

  it.each(['', 'not-a-uuid', '01890a5dac96774bbcceb302099a8057'])(
    'rejects %s',
    (value) => {
      expect(isUuid(value)).toBe(false);
    },
  );
});

describe('readAuthenticatedUserId', () => {
  it('is a 401 without a principal', () => {
    expect(() => readAuthenticatedUserId({})).toThrow(UnauthorizedException);
  });

  it('is a 403 for a service account', () => {
    const req = { user: { kind: 'service_account', sub: 'svc-1' } };

    expect(() => readAuthenticatedUserId(req)).toThrow(ForbiddenException);
  });

  it('returns the user id for a user', () => {
    const req = { user: { kind: 'user', sub: 'user-1' } };

    expect(readAuthenticatedUserId(req)).toBe('user-1');
  });
});
