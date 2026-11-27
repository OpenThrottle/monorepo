import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  AUTH_PRINCIPAL_KIND_USER,
  getAuthPrincipalFromRequest,
} from '@openthrottle/nestjs-auth';
import { isRecord } from '@openthrottle/nodejs-utils';

import { ATTACHMENT_ORIGINAL_NAME_MAX_LENGTH } from './attachments.constants.ts';
import type { UploadedImageFile } from './attachments.types.ts';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @description Whether the text is a canonical UUID of any version (rows use uuidv7, so a
 * version-pinned pattern would reject them).
 */
export const isUuid = (value: string): boolean => {
  return UUID_PATTERN.test(value);
};

/**
 * @description Keeps the last path segment of a client filename, drops control characters and cuts
 * it to a sane length. Null when nothing usable is left. The name is display metadata only; it is
 * never used to build a path.
 */
export const sanitizeOriginalName = (name: unknown): string | null => {
  if (typeof name !== 'string') return null;

  const segments = name.split(/[\\/]/);
  const lastSegment = segments[segments.length - 1] ?? '';
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  const cleaned = lastSegment.replace(/[\u0000-\u001f\u007f]/g, '').trim();

  if (cleaned.length === 0) return null;
  return cleaned.slice(0, ATTACHMENT_ORIGINAL_NAME_MAX_LENGTH);
};

/**
 * @description Reads multer's in-memory file off the `unknown` the decorator hands over; null when
 * the request carried no file part.
 */
export const readUploadedImageFile = (
  file: unknown,
): UploadedImageFile | null => {
  if (!isRecord(file) || !(file.buffer instanceof Uint8Array)) return null;

  return {
    buffer: file.buffer,
    originalName: sanitizeOriginalName(file.originalname),
  };
};

/**
 * @description The authenticated human user's id. No principal is a 401 (the global guard already
 * refuses that; this is the backstop), a service account is a 403 because attachments are owned by
 * users.
 */
export const readAuthenticatedUserId = (req: unknown): string => {
  const principal = getAuthPrincipalFromRequest(req);
  if (principal === undefined) throw new UnauthorizedException();
  if (principal.kind !== AUTH_PRINCIPAL_KIND_USER) {
    throw new ForbiddenException('Attachments belong to a user account.');
  }
  return principal.sub;
};
