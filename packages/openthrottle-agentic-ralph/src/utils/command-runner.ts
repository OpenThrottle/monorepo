import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type {
  WorkflowRalphCommandResult,
  WorkflowRalphCommandRunner,
} from '../contract/ralph-orchestrator-deps.ts';

const execFileAsync = promisify(execFile);

/**
 * @description Default host command runner for plan-end finalize: `execFile` with no shell, argv
 * array only. Non-zero exits and spawn failures become {@link WorkflowRalphCommandResult} with a
 * non-zero `exitCode` (never thrown), so the finalize step can map them to handoff-owed.
 * @public
 */
export const createDefaultWorkflowRalphCommandRunner =
  (): WorkflowRalphCommandRunner => {
    return async ({
      args,
      command,
      cwd,
    }): Promise<WorkflowRalphCommandResult> => {
      try {
        const result = await execFileAsync(command, [...args], {
          cwd,
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
        });

        return {
          exitCode: 0,
          stderr: result.stderr,
          stdout: result.stdout,
        };
      } catch (error: unknown) {
        if (
          error !== null &&
          typeof error === 'object' &&
          'code' in error &&
          typeof error.code === 'number'
        ) {
          const stdout =
            'stdout' in error && typeof error.stdout === 'string'
              ? error.stdout
              : '';
          const stderr =
            'stderr' in error && typeof error.stderr === 'string'
              ? error.stderr
              : error instanceof Error
                ? error.message
                : String(error);

          return { exitCode: error.code, stderr, stdout };
        }

        const message = error instanceof Error ? error.message : String(error);

        return { exitCode: 1, stderr: message, stdout: '' };
      }
    };
  };
