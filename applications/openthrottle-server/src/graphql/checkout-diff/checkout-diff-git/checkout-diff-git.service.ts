import { execFile } from 'node:child_process';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';
import { isRecord } from '@openthrottle/nodejs-utils';

import {
  GIT_COMMAND_TIMEOUT_MS,
  GIT_MAX_BUFFER_BYTES,
  MAX_UNTRACKED_BYTES,
} from '../checkout-diff.constants.ts';
import { looksBinary } from '../checkout-diff.utils.ts';
import type {
  GitRunResult,
  WorkingFileRead,
} from './checkout-diff-git.types.ts';

const execFileAsync = promisify(execFile);

/**
 * @description The process boundary of the checkout diff: read-only git commands (argv, no shell,
 * timeboxed, bounded output) and bounded reads of working-tree files. Kept apart from
 * `CheckoutDiffService` so the service is testable with a stubbed runner.
 */
@Injectable()
export class CheckoutDiffGitService {
  /** @description Runs `git -C root ...args`; never throws. */
  async run(root: string, args: readonly string[]): Promise<GitRunResult> {
    try {
      const { stdout } = await execFileAsync('git', ['-C', root, ...args], {
        maxBuffer: GIT_MAX_BUFFER_BYTES,
        timeout: GIT_COMMAND_TIMEOUT_MS,
      });

      return { ok: true, stdout };
    } catch (error) {
      const stdout =
        isRecord(error) && typeof error.stdout === 'string' ? error.stdout : '';

      return { ok: false, stdout };
    }
  }

  /**
   * @description Reads a working-tree file for an untracked-file diff. Symlinks, files that resolve
   * outside `root`, oversized files and binaries come back as `binary`; a vanished file as `missing`.
   */
  async readWorkingFile(root: string, path: string): Promise<WorkingFileRead> {
    const absolute = join(root, path);

    try {
      const info = await lstat(absolute);

      if (!info.isFile()) return { kind: 'binary' };
      if (info.size > MAX_UNTRACKED_BYTES) return { kind: 'binary' };

      const [realRoot, realFile] = await Promise.all([
        realpath(root),
        realpath(absolute),
      ]);

      if (!realFile.startsWith(realRoot + sep)) return { kind: 'binary' };

      const bytes = await readFile(absolute);

      if (looksBinary(bytes)) return { kind: 'binary' };

      return { kind: 'text', text: bytes.toString('utf8') };
    } catch {
      return { kind: 'missing' };
    }
  }
}
