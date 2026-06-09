import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { rgPath } from '@vscode/ripgrep';

import type { ResolvedWorkspaceConfig } from '../config/workspace-config.js';

const execFileAsync = promisify(execFile);

/** ripgrep exits 1 when it ran successfully but found no matches. */
const RG_EXIT_NO_MATCHES = 1;

/** Generous buffer so large `rg --json` result sets are not truncated (32 MiB). */
const RG_MAX_BUFFER_BYTES = 32 * 1024 * 1024;

interface RunRipgrepResult {
  /** Raw stdout from ripgrep. Empty string when there were no matches. */
  stdout: string;
}

/**
 * Build the leading ripgrep flags implied by a workspace config (gitignore
 * handling, symlink following, and exclude globs). Callers append their own
 * mode-specific flags (e.g. `--files` or `--json <query>`).
 */
export function workspaceRipgrepArgs(
  config: ResolvedWorkspaceConfig,
): string[] {
  // `--hidden` surfaces dotfiles (.github, .env, …) like an IDE would; the
  // `.git` directory is kept out via the default exclude globs.
  const args: string[] = ['--hidden'];

  if (config.respectGitignore) {
    // Honor .gitignore even when the workspace is not (yet) a git repository.
    args.push('--no-require-git');
  } else {
    args.push('--no-ignore');
  }

  if (config.followSymlinks) {
    args.push('--follow');
  }

  for (const glob of config.exclude) {
    args.push('--glob', `!${glob}`);
  }

  return args;
}

/**
 * Run the bundled ripgrep binary with the given arguments, executed from
 * `config.root`. Treats "no matches" (exit code 1) as a successful empty
 * result rather than an error.
 *
 * @publicApi
 */
export async function runRipgrep(
  args: string[],
  config: ResolvedWorkspaceConfig,
): Promise<RunRipgrepResult> {
  try {
    const { stdout } = await execFileAsync(rgPath, args, {
      cwd: config.root,
      maxBuffer: RG_MAX_BUFFER_BYTES,
    });

    return { stdout };
  } catch (error) {
    if (isNoMatchError(error)) {
      return { stdout: '' };
    }

    throw error;
  }
}

function isNoMatchError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === RG_EXIT_NO_MATCHES
  );
}
