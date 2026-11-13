import { spawn } from 'node:child_process';

import type { SpawnCommand } from '../contract/index.ts';
import { UNCOLORED_ENV } from '../data/data.ansi.ts';
import { KILL_GRACE_MS } from '../data/data.constants.ts';

const EXIT_COMMAND_NOT_RUNNABLE = 127;

/**
 * @description `SpawnCommand` over `node:child_process` with a shell. On POSIX the child leads its
 * own process group so `kill()` takes the whole tree (Nx forks workers); SIGKILL follows after a
 * grace period if it has not closed.
 * @public
 */
export const spawnShellCommand: SpawnCommand = ({ command, cwd, onOutput }) => {
  const isPosix = process.platform !== 'win32';
  const child = spawn(command, {
    cwd,
    detached: isPosix,
    env: { ...process.env, ...UNCOLORED_ENV },
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let closed = false;

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (text: string) => {
    onOutput(text);
  });
  child.stderr.on('data', (text: string) => {
    onOutput(text);
  });

  const done = new Promise<{ readonly exitCode: number | null }>((resolve) => {
    child.on('error', (error) => {
      closed = true;
      onOutput(`${error.message}\n`);
      resolve({ exitCode: EXIT_COMMAND_NOT_RUNNABLE });
    });
    child.on('close', (exitCode) => {
      closed = true;
      resolve({ exitCode });
    });
  });

  const signalTree = (signal: NodeJS.Signals): void => {
    try {
      if (isPosix && child.pid !== undefined) {
        process.kill(-child.pid, signal);

        return;
      }

      child.kill(signal);
    } catch {
      // The group is already gone.
    }
  };

  const kill = (): void => {
    signalTree('SIGTERM');
    setTimeout(() => {
      if (!closed) {
        signalTree('SIGKILL');
      }
    }, KILL_GRACE_MS).unref();
  };

  return { done, kill };
};
