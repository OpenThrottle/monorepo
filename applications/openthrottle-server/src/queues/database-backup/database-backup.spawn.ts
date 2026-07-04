/**
 * @description Spawns `pnpm run database:backup` from the monorepo root.
 */

import { spawn } from 'node:child_process';

interface SpawnDatabaseBackupOptions {
  readonly cwd: string;
  readonly onStderr: (chunk: string) => void;
  readonly onStdout: (chunk: string) => void;
  readonly script: string;
}

/**
 * @description Runs the backup script via pnpm and waits for exit. Resolves with exit code or null if signaled.
 */
export function spawnDatabaseBackup(
  options: SpawnDatabaseBackupOptions,
): Promise<number | null> {
  const { cwd, onStderr, onStdout, script } = options;

  return new Promise((resolve, reject) => {
    // Allow it to run the -w (workspace) command in the root package.json
    const child = spawn('pnpm', ['-w', 'run', script], {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (data: Buffer) => onStdout(data.toString()));
    child.stderr?.on('data', (data: Buffer) => onStderr(data.toString()));
    child.on('error', reject);
    child.on('close', (code, signal) => {
      resolve(signal != null ? null : (code ?? null));
    });
  });
}
