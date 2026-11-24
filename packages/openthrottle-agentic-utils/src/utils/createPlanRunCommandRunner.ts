import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type {
  PlanRunCommandResult,
  PlanRunCommandRunner,
} from '../types/plan-run.ts';

const readFailureStdout = (error: object): string => {
  if ('stdout' in error && typeof error.stdout === 'string') {
    return error.stdout;
  }
  return '';
};

const readFailureStderr = (error: object): string => {
  if ('stderr' in error && typeof error.stderr === 'string') {
    return error.stderr;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

/**
 * @description Default host command runner for a plan run's finish step: `execFile` with no shell, argv
 * array only. Non-zero exits and spawn failures become {@link PlanRunCommandResult} with a
 * non-zero `exitCode` (never thrown), so the finish step can map them to handoff-owed.
 * @public
 */
export const createPlanRunCommandRunner = (): PlanRunCommandRunner => {
  return async ({ args, command, cwd }): Promise<PlanRunCommandResult> => {
    try {
      // Resolved per call, not at module scope: this module sits behind the package barrel, so a
      // consumer that mocks `node:child_process` without `execFile` must still be able to import it.
      const result = await promisify(execFile)(command, [...args], {
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
        const stdout = readFailureStdout(error);
        const stderr = readFailureStderr(error);

        return { exitCode: error.code, stderr, stdout };
      }

      const message = error instanceof Error ? error.message : String(error);

      return { exitCode: 1, stderr: message, stdout: '' };
    }
  };
};
