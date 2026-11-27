/**
 * @description Pure helpers for the attachment store: where the root is, what an upload really is
 * (magic bytes, never the client's MIME) and how big the picture is. Nothing here touches disk.
 */
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { isErrorWithCode } from '@openthrottle/nodejs-utils';

import { expandHome } from '../paths/expand-home/expand-home.utils.ts';
import type { AttachmentExtensionValue } from './attachment-store.constants.ts';
import {
  ATTACHMENT_EXTENSION,
  ATTACHMENT_MIME_TYPE,
  ATTACHMENTS_DIR_ENV_VAR,
  DEFAULT_ATTACHMENTS_RELATIVE_PATH,
} from './attachment-store.constants.ts';
import type { ImageDimensions } from './attachment-store.types.ts';

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

/**
 * @description The attachments root: `OPENTHROTTLE_ATTACHMENTS_DIR` (`~` expanded) when set and
 * non-blank, else `~/.openthrottle/attachments`. Resolved per call, so `$HOME` can change under
 * a test and a relative override is rejected by falling back to the default.
 */
export const resolveAttachmentsRoot = (
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const configured = (env[ATTACHMENTS_DIR_ENV_VAR] ?? '').trim();
  const expanded = configured === '' ? '' : expandHome(configured);
  if (expanded.startsWith('/')) return expanded;
  return join(homedir(), DEFAULT_ATTACHMENTS_RELATIVE_PATH);
};

/** Whether a filesystem error is "no such file" (`ENOENT`). */
export const isFileMissingError = (error: unknown): boolean => {
  return isErrorWithCode(error) && error.code === 'ENOENT';
};

export const isAttachmentSha256 = (value: string): boolean => {
  return SHA256_PATTERN.test(value);
};

/** Narrows a string to the extension allowlist. */
export const isAttachmentExtension = (
  value: string,
): value is AttachmentExtensionValue => {
  return Object.values<string>(ATTACHMENT_EXTENSION).includes(value);
};

export const hashAttachment = (bytes: Uint8Array): string => {
  return createHash('sha256').update(bytes).digest('hex');
};

const startsWithBytes = (
  bytes: Uint8Array,
  signature: readonly number[],
  offset = 0,
): boolean => {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const GIF87_SIGNATURE = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
const GIF89_SIGNATURE = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50];

/**
 * @description Identifies png/jpeg/gif/webp from magic bytes, or null. The client's filename and
 * MIME type are deliberately not inputs.
 */
export const sniffImageExtension = (
  bytes: Uint8Array,
): AttachmentExtensionValue | null => {
  if (startsWithBytes(bytes, PNG_SIGNATURE)) return ATTACHMENT_EXTENSION.PNG;
  if (startsWithBytes(bytes, JPEG_SIGNATURE)) return ATTACHMENT_EXTENSION.JPG;
  if (
    startsWithBytes(bytes, GIF87_SIGNATURE) ||
    startsWithBytes(bytes, GIF89_SIGNATURE)
  ) {
    return ATTACHMENT_EXTENSION.GIF;
  }
  if (
    startsWithBytes(bytes, RIFF_SIGNATURE) &&
    startsWithBytes(bytes, WEBP_SIGNATURE, 8)
  ) {
    return ATTACHMENT_EXTENSION.WEBP;
  }
  return null;
};

const u16be = (bytes: Uint8Array, offset: number): number => {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
};

const u16le = (bytes: Uint8Array, offset: number): number => {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
};

const u24le = (bytes: Uint8Array, offset: number): number => {
  return u16le(bytes, offset) | ((bytes[offset + 2] ?? 0) << 16);
};

const u32le = (bytes: Uint8Array, offset: number): number => {
  return (u16le(bytes, offset) | (u16le(bytes, offset + 2) << 16)) >>> 0;
};

const u32be = (bytes: Uint8Array, offset: number): number => {
  return ((u16be(bytes, offset) << 16) | u16be(bytes, offset + 2)) >>> 0;
};

const toDimensions = (
  width: number,
  height: number,
): ImageDimensions | null => {
  if (width <= 0 || height <= 0) return null;
  return { height, width };
};

const pngDimensions = (bytes: Uint8Array): ImageDimensions | null => {
  // 8 signature + 4 length + "IHDR" + 4 width + 4 height.
  if (bytes.length < 24) return null;
  if (!startsWithBytes(bytes, [0x49, 0x48, 0x44, 0x52], 12)) return null;
  return toDimensions(u32be(bytes, 16), u32be(bytes, 20));
};

const gifDimensions = (bytes: Uint8Array): ImageDimensions | null => {
  if (bytes.length < 10) return null;
  return toDimensions(u16le(bytes, 6), u16le(bytes, 8));
};

const webpDimensions = (bytes: Uint8Array): ImageDimensions | null => {
  if (bytes.length < 30) return null;
  const chunk = String.fromCharCode(...bytes.subarray(12, 16));

  if (chunk === 'VP8 ') {
    if (!startsWithBytes(bytes, [0x9d, 0x01, 0x2a], 23)) return null;
    return toDimensions(u16le(bytes, 26) & 0x3fff, u16le(bytes, 28) & 0x3fff);
  }

  if (chunk === 'VP8L') {
    if (bytes[20] !== 0x2f) return null;
    const packed = u32le(bytes, 21);
    return toDimensions((packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1);
  }

  if (chunk === 'VP8X') {
    return toDimensions(u24le(bytes, 24) + 1, u24le(bytes, 27) + 1);
  }

  return null;
};

/** SOF0-SOF15 carry the frame size, except DHT (c4), JPG (c8) and DAC (cc). */
const isJpegStartOfFrame = (marker: number): boolean => {
  return (
    marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
  );
};

const jpegDimensions = (bytes: Uint8Array): ImageDimensions | null => {
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1] ?? 0;

    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // Standalone markers (RSTn, SOI, EOI, TEM) carry no length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    if (isJpegStartOfFrame(marker)) {
      if (offset + 9 > bytes.length) return null;
      return toDimensions(u16be(bytes, offset + 7), u16be(bytes, offset + 5));
    }
    offset += 2 + u16be(bytes, offset + 2);
  }
  return null;
};

/**
 * @description Width and height from the image header, or null when it cannot be read cheaply.
 * Never throws and is never a reason to reject an upload.
 */
export const readImageDimensions = (
  bytes: Uint8Array,
  ext: AttachmentExtensionValue,
): ImageDimensions | null => {
  switch (ext) {
    case ATTACHMENT_EXTENSION.PNG:
      return pngDimensions(bytes);
    case ATTACHMENT_EXTENSION.GIF:
      return gifDimensions(bytes);
    case ATTACHMENT_EXTENSION.WEBP:
      return webpDimensions(bytes);
    case ATTACHMENT_EXTENSION.JPG:
      return jpegDimensions(bytes);
  }
};

/**
 * @description The file extension the store used for a stored MIME type (`image/jpeg` is `jpg`),
 * or null for a type the store never writes.
 */
export const extensionForMimeType = (
  mimeType: string,
): AttachmentExtensionValue | null => {
  for (const ext of Object.values(ATTACHMENT_EXTENSION)) {
    if (ATTACHMENT_MIME_TYPE[ext] === mimeType) return ext;
  }
  return null;
};
