import { beforeEach, describe, expect, it, vi } from 'vitest';

const { execFileMock } = vi.hoisted(() => {
  return { execFileMock: vi.fn() };
});

vi.mock('node:child_process', () => {
  return { execFile: execFileMock };
});

import {
  GIT_COMMAND_TIMEOUT_MS,
  GIT_MAX_BUFFER_BYTES,
} from './git-runner.constants.ts';
import { GitRunnerService } from './git-runner.service.ts';

type ExecCallback = (
  error: Error | null,
  result?: { stderr: string; stdout: string },
) => void;

const succeedWith = (stdout: string): void => {
  execFileMock.mockImplementation(
    (
      _file: string,
      _args: readonly string[],
      _options: unknown,
      callback: ExecCallback,
    ) => {
      callback(null, { stderr: '', stdout });
    },
  );
};

const failWith = (error: Error): void => {
  execFileMock.mockImplementation(
    (
      _file: string,
      _args: readonly string[],
      _options: unknown,
      callback: ExecCallback,
    ) => {
      callback(error);
    },
  );
};

describe('GitRunnerService', () => {
  let service: GitRunnerService;

  beforeEach(() => {
    execFileMock.mockReset();
    service = new GitRunnerService();
  });

  describe('when git succeeds', () => {
    it('returns stdout and runs argv with the default bounds, no shell', async () => {
      succeedWith('main\n');

      const result = await service.run('/repo', ['rev-parse', 'HEAD']);

      expect(result).toEqual({ ok: true, stdout: 'main\n' });
      expect(execFileMock).toHaveBeenCalledWith(
        'git',
        ['-C', '/repo', 'rev-parse', 'HEAD'],
        { maxBuffer: GIT_MAX_BUFFER_BYTES, timeout: GIT_COMMAND_TIMEOUT_MS },
        expect.any(Function),
      );
    });

    it('lets a caller override either bound', async () => {
      succeedWith('');

      await service.run('/repo', ['diff'], { maxBufferBytes: 5, timeoutMs: 7 });
      await service.run('/repo', ['diff'], { timeoutMs: 9 });

      expect(execFileMock).toHaveBeenNthCalledWith(
        1,
        'git',
        ['-C', '/repo', 'diff'],
        { maxBuffer: 5, timeout: 7 },
        expect.any(Function),
      );
      expect(execFileMock).toHaveBeenNthCalledWith(
        2,
        'git',
        ['-C', '/repo', 'diff'],
        { maxBuffer: GIT_MAX_BUFFER_BYTES, timeout: 9 },
        expect.any(Function),
      );
    });
  });

  describe('when git fails', () => {
    it('returns the message and the stdout that arrived, without throwing', async () => {
      failWith(Object.assign(new Error('exit 1'), { stdout: 'partial' }));

      await expect(service.run('/repo', ['diff'])).resolves.toEqual({
        error: 'exit 1',
        ok: false,
        stdout: 'partial',
      });
    });

    it('returns empty stdout when the error carries none', async () => {
      failWith(new Error('timed out'));

      await expect(service.run('/repo', ['status'])).resolves.toEqual({
        error: 'timed out',
        ok: false,
        stdout: '',
      });
    });
  });
});
