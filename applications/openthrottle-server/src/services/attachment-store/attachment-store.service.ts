/**
 * @description Content-addressed image store. Files live at `<root>/<sha256>.<ext>` and are the
 * only thing the store knows; the attachment id to (sha, ext) mapping is a database row owned by
 * the caller. Validation problems come back as `{ ok: false }` values, never throws.
 *
 * The file's mtime means "last referenced": a write that dedups, and `touch`, both move it to now,
 * which is the clock a retention janitor reads.
 */

import { randomUUID } from 'node:crypto';
import type { Stats } from 'node:fs';
import {
  chmod,
  lstat,
  mkdir,
  rename,
  rm,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

import { Injectable } from '@nestjs/common';
import { toErrorMessage } from '@openthrottle/nodejs-utils';

import { isPathWithin } from '../paths/path-containment/path-containment.utils.ts';
import { realPath } from '../paths/real-path/real-path.utils.ts';
import {
  ATTACHMENT_DIRECTORY_MODE,
  ATTACHMENT_FILE_MODE,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIME_TYPE,
  ATTACHMENT_STORE_FAILURE,
  ATTACHMENT_TEMP_PREFIX,
} from './attachment-store.constants.ts';
import type {
  AttachmentResolveResult,
  AttachmentStoreResult,
} from './attachment-store.types.ts';
import {
  hashAttachment,
  isAttachmentExtension,
  isAttachmentSha256,
  isFileMissingError,
  readImageDimensions,
  resolveAttachmentsRoot,
  sniffImageExtension,
} from './attachment-store.utils.ts';

@Injectable()
export class AttachmentStoreService {
  /** The resolved root, read fresh each call. May itself be a symlink. */
  rootDirectory(): string {
    return resolveAttachmentsRoot();
  }

  /** `lstat`, or null when the path does not exist. Any other error propagates. */
  private async lstatOrNull(path: string): Promise<Stats | null> {
    try {
      return await lstat(path);
    } catch (error) {
      if (isFileMissingError(error)) return null;
      throw error;
    }
  }

  /**
   * @description Validates (size, then magic bytes) and stores an image under its sha256. A second
   * upload of the same bytes writes nothing and only refreshes the mtime.
   */
  async store(bytes: Uint8Array): Promise<AttachmentStoreResult> {
    if (bytes.length > ATTACHMENT_MAX_BYTES) {
      return {
        message: `attachment exceeds ${ATTACHMENT_MAX_BYTES} bytes`,
        ok: false,
        reason: ATTACHMENT_STORE_FAILURE.TOO_LARGE,
      };
    }

    const ext = sniffImageExtension(bytes);
    if (ext === null) {
      return {
        message: 'attachment is not a png, jpeg, gif or webp image',
        ok: false,
        reason: ATTACHMENT_STORE_FAILURE.UNSUPPORTED_TYPE,
      };
    }

    const sha256 = hashAttachment(bytes);
    const dimensions = readImageDimensions(bytes, ext);
    const root = this.rootDirectory();
    const finalPath = join(root, `${sha256}.${ext}`);
    const tempPath = join(root, `${ATTACHMENT_TEMP_PREFIX}${randomUUID()}`);

    try {
      const created = await mkdir(root, {
        mode: ATTACHMENT_DIRECTORY_MODE,
        recursive: true,
      });
      // `mkdir` is subject to the umask; a directory we just made is pinned to 0700.
      if (created !== undefined) await chmod(root, ATTACHMENT_DIRECTORY_MODE);

      const existing = await this.lstatOrNull(finalPath);

      const deduplicated = existing !== null && existing.isFile();
      if (deduplicated) {
        const now = new Date();
        await utimes(finalPath, now, now);
      } else {
        await writeFile(tempPath, bytes, {
          flag: 'wx',
          mode: ATTACHMENT_FILE_MODE,
        });
        await rename(tempPath, finalPath);
      }

      return {
        ok: true,
        value: {
          byteSize: bytes.length,
          deduplicated,
          ext,
          height: dimensions?.height ?? null,
          mimeType: ATTACHMENT_MIME_TYPE[ext],
          sha256,
          width: dimensions?.width ?? null,
        },
      };
    } catch (error) {
      try {
        await rm(tempPath, { force: true });
      } catch {
        // Best-effort cleanup; the original failure is what gets reported.
      }
      return {
        message: toErrorMessage(error),
        ok: false,
        reason: ATTACHMENT_STORE_FAILURE.IO_ERROR,
      };
    }
  }

  /**
   * @description Turns `(sha256, ext)` into an absolute path, only when it is a regular file (a
   * symlink at the file is refused) whose real path stays inside the real root. The path is built
   * from validated parts, never from client input.
   */
  async resolve(sha256: string, ext: string): Promise<AttachmentResolveResult> {
    if (!isAttachmentSha256(sha256)) {
      return {
        message: 'sha256 must be 64 lowercase hex characters',
        ok: false,
        reason: ATTACHMENT_STORE_FAILURE.INVALID_SHA,
      };
    }
    if (!isAttachmentExtension(ext)) {
      return {
        message: 'unsupported attachment extension',
        ok: false,
        reason: ATTACHMENT_STORE_FAILURE.INVALID_EXT,
      };
    }

    const root = this.rootDirectory();
    const filePath = join(root, `${sha256}.${ext}`);

    try {
      const stats = await lstat(filePath);
      if (!stats.isFile()) {
        return {
          message: 'attachment is not a regular file',
          ok: false,
          reason: ATTACHMENT_STORE_FAILURE.NOT_REGULAR_FILE,
        };
      }
    } catch (error) {
      if (isFileMissingError(error)) {
        return {
          message: 'attachment not found',
          ok: false,
          reason: ATTACHMENT_STORE_FAILURE.NOT_FOUND,
        };
      }
      return {
        message: toErrorMessage(error),
        ok: false,
        reason: ATTACHMENT_STORE_FAILURE.IO_ERROR,
      };
    }

    if (!isPathWithin(realPath(root), realPath(filePath))) {
      return {
        message: 'attachment resolves outside the attachments root',
        ok: false,
        reason: ATTACHMENT_STORE_FAILURE.OUTSIDE_ROOT,
      };
    }

    return { ok: true, value: filePath };
  }

  /** @description Refreshes the mtime ("last referenced") of a stored attachment, after the same checks as {@link resolve}. */
  async touch(sha256: string, ext: string): Promise<AttachmentResolveResult> {
    const resolved = await this.resolve(sha256, ext);
    if (!resolved.ok) return resolved;

    try {
      const now = new Date();
      await utimes(resolved.value, now, now);
      return resolved;
    } catch (error) {
      return {
        message: toErrorMessage(error),
        ok: false,
        reason: ATTACHMENT_STORE_FAILURE.IO_ERROR,
      };
    }
  }
}
