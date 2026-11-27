import { homedir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  hashAttachment,
  isAttachmentExtension,
  isAttachmentSha256,
  isFileMissingError,
  readImageDimensions,
  resolveAttachmentsRoot,
  sniffImageExtension,
} from './attachment-store.utils.ts';

const png = (width: number, height: number): Buffer => {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'latin1');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
};

const gif = (width: number, height: number): Buffer => {
  const bytes = Buffer.alloc(13);
  bytes.write('GIF89a', 0, 'latin1');
  bytes.writeUInt16LE(width, 6);
  bytes.writeUInt16LE(height, 8);
  return bytes;
};

const webpHeader = (chunk: string): Buffer => {
  const bytes = Buffer.alloc(40);
  bytes.write('RIFF', 0, 'latin1');
  bytes.write('WEBP', 8, 'latin1');
  bytes.write(chunk, 12, 'latin1');
  return bytes;
};

const webpLossy = (width: number, height: number): Buffer => {
  const bytes = webpHeader('VP8 ');
  Buffer.from([0x9d, 0x01, 0x2a]).copy(bytes, 23);
  bytes.writeUInt16LE(width, 26);
  bytes.writeUInt16LE(height, 28);
  return bytes;
};

const webpLossless = (width: number, height: number): Buffer => {
  const bytes = webpHeader('VP8L');
  bytes[20] = 0x2f;
  bytes.writeUInt32LE(((width - 1) | ((height - 1) << 14)) >>> 0, 21);
  return bytes;
};

const webpExtended = (width: number, height: number): Buffer => {
  const bytes = webpHeader('VP8X');
  bytes.writeUIntLE(width - 1, 24, 3);
  bytes.writeUIntLE(height - 1, 27, 3);
  return bytes;
};

const jpeg = (width: number, height: number): Buffer => {
  const bytes = Buffer.alloc(40);
  Buffer.from([0xff, 0xd8]).copy(bytes);
  // APP0 segment of length 6, then SOF0.
  Buffer.from([0xff, 0xe0, 0x00, 0x06, 0, 0, 0, 0]).copy(bytes, 2);
  Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08]).copy(bytes, 10);
  bytes.writeUInt16BE(height, 15);
  bytes.writeUInt16BE(width, 17);
  return bytes;
};

describe('attachment-store utils', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('resolveAttachmentsRoot', () => {
    it('defaults to ~/.openthrottle/attachments', () => {
      vi.stubEnv('OPENTHROTTLE_ATTACHMENTS_DIR', '');
      expect(resolveAttachmentsRoot()).toBe(
        join(homedir(), '.openthrottle', 'attachments'),
      );
    });

    it('reads $HOME at call time', () => {
      vi.stubEnv('OPENTHROTTLE_ATTACHMENTS_DIR', '');
      vi.stubEnv('HOME', '/tmp/fake-home');
      expect(resolveAttachmentsRoot()).toBe(
        '/tmp/fake-home/.openthrottle/attachments',
      );
    });

    it('honours the override and expands ~', () => {
      vi.stubEnv('HOME', '/tmp/fake-home');
      expect(
        resolveAttachmentsRoot({ OPENTHROTTLE_ATTACHMENTS_DIR: '/srv/a' }),
      ).toBe('/srv/a');
      expect(
        resolveAttachmentsRoot({ OPENTHROTTLE_ATTACHMENTS_DIR: '~/a' }),
      ).toBe('/tmp/fake-home/a');
    });

    it('ignores a blank or relative override', () => {
      vi.stubEnv('HOME', '/tmp/fake-home');
      const fallback = '/tmp/fake-home/.openthrottle/attachments';
      expect(
        resolveAttachmentsRoot({ OPENTHROTTLE_ATTACHMENTS_DIR: '  ' }),
      ).toBe(fallback);
      expect(
        resolveAttachmentsRoot({ OPENTHROTTLE_ATTACHMENTS_DIR: 'rel/dir' }),
      ).toBe(fallback);
    });
  });

  describe('sniffImageExtension', () => {
    it('recognises each supported type by magic bytes', () => {
      expect(sniffImageExtension(png(1, 1))).toBe('png');
      expect(sniffImageExtension(jpeg(1, 1))).toBe('jpg');
      expect(sniffImageExtension(gif(1, 1))).toBe('gif');
      expect(sniffImageExtension(webpLossy(1, 1))).toBe('webp');
    });

    it('rejects text, empty input and RIFF that is not WebP', () => {
      expect(sniffImageExtension(Buffer.from('<svg></svg>'))).toBeNull();
      expect(sniffImageExtension(Buffer.alloc(0))).toBeNull();
      const wave = Buffer.alloc(16);
      wave.write('RIFF', 0, 'latin1');
      wave.write('WAVE', 8, 'latin1');
      expect(sniffImageExtension(wave)).toBeNull();
    });
  });

  describe('readImageDimensions', () => {
    it('reads png, gif, jpeg and every webp flavour', () => {
      expect(readImageDimensions(png(640, 480), 'png')).toEqual({
        height: 480,
        width: 640,
      });
      expect(readImageDimensions(gif(30, 20), 'gif')).toEqual({
        height: 20,
        width: 30,
      });
      expect(readImageDimensions(jpeg(800, 600), 'jpg')).toEqual({
        height: 600,
        width: 800,
      });
      expect(readImageDimensions(webpLossy(320, 200), 'webp')).toEqual({
        height: 200,
        width: 320,
      });
      expect(readImageDimensions(webpLossless(321, 201), 'webp')).toEqual({
        height: 201,
        width: 321,
      });
      expect(readImageDimensions(webpExtended(1920, 1080), 'webp')).toEqual({
        height: 1080,
        width: 1920,
      });
    });

    it('returns null for truncated or malformed headers instead of throwing', () => {
      expect(readImageDimensions(png(1, 1).subarray(0, 10), 'png')).toBeNull();
      expect(
        readImageDimensions(Buffer.from([0xff, 0xd8, 0xff]), 'jpg'),
      ).toBeNull();
      expect(readImageDimensions(webpHeader('JUNK'), 'webp')).toBeNull();
      expect(readImageDimensions(gif(0, 0), 'gif')).toBeNull();
    });
  });

  describe('validators', () => {
    it('accepts only a lowercase 64-hex sha256', () => {
      expect(isAttachmentSha256(hashAttachment(Buffer.from('x')))).toBe(true);
      expect(isAttachmentSha256('../etc/passwd')).toBe(false);
      expect(isAttachmentSha256('A'.repeat(64))).toBe(false);
      expect(isAttachmentSha256('a'.repeat(63))).toBe(false);
    });

    it('accepts only allowlisted extensions', () => {
      expect(isAttachmentExtension('png')).toBe(true);
      expect(isAttachmentExtension('jpeg')).toBe(false);
      expect(isAttachmentExtension('png/../x')).toBe(false);
    });
  });
});

describe('isFileMissingError', () => {
  it('is true for an ENOENT error', () => {
    const error = Object.assign(new Error('missing'), { code: 'ENOENT' });

    expect(isFileMissingError(error)).toBe(true);
  });

  it('is false for another code, a plain error and a non-error', () => {
    const denied = Object.assign(new Error('denied'), { code: 'EACCES' });

    expect(isFileMissingError(denied)).toBe(false);
    expect(isFileMissingError(new Error('x'))).toBe(false);
    expect(isFileMissingError('ENOENT')).toBe(false);
  });
});
