import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GitRunnerService } from '../../../services/git-runner/git-runner.service.ts';
import {
  DIFF_GIT_MAX_BUFFER_BYTES,
  DIFF_GIT_TIMEOUT_MS,
  MAX_UNTRACKED_BYTES,
} from '../checkout-diff.constants.ts';
import { CheckoutDiffGitService } from './checkout-diff-git.service.ts';

const { execFileMock } = vi.hoisted(() => {
  return { execFileMock: vi.fn() };
});

vi.mock('node:child_process', () => {
  return { execFile: execFileMock };
});

describe('CheckoutDiffGitService', () => {
  let service: CheckoutDiffGitService;
  let sandbox: string;
  let root: string;

  beforeEach(async () => {
    service = new CheckoutDiffGitService(new GitRunnerService());
    sandbox = await mkdtemp(join(tmpdir(), 'checkout-diff-git-'));
    root = join(sandbox, 'repo');
    await mkdir(root);
  });

  afterEach(async () => {
    execFileMock.mockReset();
    await rm(sandbox, { force: true, recursive: true });
  });

  describe('run', () => {
    it('invokes git with `-C root` first and bounded options, no shell', async () => {
      execFileMock.mockImplementation(
        (
          _file: string,
          _args: readonly string[],
          _options: unknown,
          done: (...a: unknown[]) => void,
        ) => {
          done(null, { stderr: '', stdout: 'out' });
        },
      );

      const result = await service.run('/repo', ['diff', '--numstat']);

      expect(result).toEqual({ ok: true, stdout: 'out' });
      expect(execFileMock).toHaveBeenCalledWith(
        'git',
        ['-C', '/repo', 'diff', '--numstat'],
        { maxBuffer: DIFF_GIT_MAX_BUFFER_BYTES, timeout: DIFF_GIT_TIMEOUT_MS },
        expect.any(Function),
      );
    });

    it('answers ok: false and keeps the stdout that arrived when git fails', async () => {
      execFileMock.mockImplementation(
        (
          _file: string,
          _args: readonly string[],
          _options: unknown,
          done: (...a: unknown[]) => void,
        ) => {
          done(Object.assign(new Error('exit 1'), { stdout: 'partial' }));
        },
      );

      expect(await service.run('/repo', ['status'])).toEqual({
        ok: false,
        stdout: 'partial',
      });
    });

    it('answers ok: false with empty stdout when the error carries none', async () => {
      execFileMock.mockImplementation(
        (
          _file: string,
          _args: readonly string[],
          _options: unknown,
          done: (...a: unknown[]) => void,
        ) => {
          done(new Error('spawn git ENOENT'));
        },
      );

      expect(await service.run('/repo', ['status'])).toEqual({
        ok: false,
        stdout: '',
      });
    });
  });

  describe('readWorkingFile', () => {
    it('reads a normal text file', async () => {
      await writeFile(join(root, 'a.txt'), 'hello\nworld\n');

      expect(await service.readWorkingFile(root, 'a.txt')).toEqual({
        kind: 'text',
        text: 'hello\nworld\n',
      });
    });

    it('reads a file in a nested directory', async () => {
      await mkdir(join(root, 'src'));
      await writeFile(join(root, 'src', 'b.ts'), 'export {};\n');

      expect(await service.readWorkingFile(root, 'src/b.ts')).toEqual({
        kind: 'text',
        text: 'export {};\n',
      });
    });

    it('reports a missing file as missing', async () => {
      expect(await service.readWorkingFile(root, 'gone.txt')).toEqual({
        kind: 'missing',
      });
    });

    it('reports a symlink as binary', async () => {
      await writeFile(join(root, 'target.txt'), 'x');
      await symlink(join(root, 'target.txt'), join(root, 'link.txt'));

      expect(await service.readWorkingFile(root, 'link.txt')).toEqual({
        kind: 'binary',
      });
    });

    it('reports a directory as binary', async () => {
      await mkdir(join(root, 'dir'));

      expect(await service.readWorkingFile(root, 'dir')).toEqual({
        kind: 'binary',
      });
    });

    it('reports a path that escapes the root as binary and never reads it', async () => {
      await writeFile(join(sandbox, 'secret.txt'), 'secret');

      expect(await service.readWorkingFile(root, '../secret.txt')).toEqual({
        kind: 'binary',
      });
    });

    it('reports a file through a symlinked directory outside the root as binary', async () => {
      await mkdir(join(sandbox, 'outside'));
      await writeFile(join(sandbox, 'outside', 'secret.txt'), 'secret');
      await symlink(join(sandbox, 'outside'), join(root, 'escape'));

      expect(await service.readWorkingFile(root, 'escape/secret.txt')).toEqual({
        kind: 'binary',
      });
    });

    it('reports an oversized file as binary', async () => {
      await writeFile(
        join(root, 'big.txt'),
        Buffer.alloc(MAX_UNTRACKED_BYTES + 1, 'a'),
      );

      expect(await service.readWorkingFile(root, 'big.txt')).toEqual({
        kind: 'binary',
      });
    });

    it('reports a file with NUL bytes as binary', async () => {
      await writeFile(join(root, 'img.bin'), Buffer.from([0x89, 0x00, 0x01]));

      expect(await service.readWorkingFile(root, 'img.bin')).toEqual({
        kind: 'binary',
      });
    });
  });
});
