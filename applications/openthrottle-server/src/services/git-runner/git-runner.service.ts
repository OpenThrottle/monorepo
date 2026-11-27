import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';
import { isRecord, toErrorMessage } from '@openthrottle/nodejs-utils';

import {
  GIT_COMMAND_TIMEOUT_MS,
  GIT_MAX_BUFFER_BYTES,
} from './git-runner.constants.ts';
import type { GitRunOptions, GitRunResult } from './git-runner.types.ts';

const execFileAsync = promisify(execFile);

/**
 * @description The one bounded git runner: `git -C cwd ...args` through `execFile` (argv, no shell)
 * with a timeout and an output cap. It never throws; a caller that wants a null, a message or a
 * boolean maps the {@link GitRunResult} itself.
 */
@Injectable()
export class GitRunnerService {
  /**
   * @description Runs `git -C cwd ...args`. Pass `options` only where a caller legitimately needs
   * bounds other than the defaults in `git-runner.constants.ts`.
   */
  async run(
    cwd: string,
    args: readonly string[],
    options: Partial<GitRunOptions> = {},
  ): Promise<GitRunResult> {
    try {
      const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], {
        maxBuffer: options.maxBufferBytes ?? GIT_MAX_BUFFER_BYTES,
        timeout: options.timeoutMs ?? GIT_COMMAND_TIMEOUT_MS,
      });

      return { ok: true, stdout };
    } catch (error) {
      const stdout =
        isRecord(error) && typeof error.stdout === 'string' ? error.stdout : '';

      return { error: toErrorMessage(error), ok: false, stdout };
    }
  }

  /**
   * @description The checkout's `origin` remote URL, or null when it has none, is not a git
   * repository, or the probe fails — a missing remote is an answer here, not an error.
   */
  async readOriginRemote(cwd: string): Promise<string | null> {
    const result = await this.run(cwd, ['remote', 'get-url', 'origin']);
    if (!result.ok) return null;

    const remote = result.stdout.trim();
    return remote === '' ? null : remote;
  }
}
