import { parseArgs } from 'node:util';
import type {
  WorkflowConfigDebug,
  WorkflowConfigRunner,
  WorkflowConfig,
} from '@openthrottle/openthrottle-agentic-workflow';
import { isDriverId } from '@openthrottle/openthrottle-drivers';
import {
  DEFAULT_WORKFLOW_DEBUG,
  DEFAULT_WORKFLOW_ITERATIONS,
  DEFAULT_WORKFLOW_RUNNER,
} from '../config/index.ts';
import type { Writable } from '../types/index.ts';

/**
 * @description Parses command line arguments into a WorkflowConfig object.
 */
export const parseWorkflowConfigFromArgs = (): WorkflowConfig => {
  const { positionals: _positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      cwdTarget: { type: 'string' },
      debug: { short: 'd', type: 'string' },
      iterations: { default: '10', short: 'i', type: 'string' },
      model: { short: 'm', type: 'string' },
      name: { short: 'n', type: 'string' },
      prompt: { short: 'p', type: 'string' },
      runner: { short: 'r', type: 'string' },
      worktree: { short: 'w', type: 'string' },
      worktreeBase: { type: 'string' },
      worktreeSkipSetup: { type: 'string' },
    },
    strict: true,
  });

  const config: Writable<WorkflowConfig> = {
    cwdOpenThrottle: process.cwd(),
    cwdTarget: values.cwdTarget
      ? safeParseString(values.cwdTarget)
      : process.cwd(),
    debug: safeParseDebug(values.debug),
    iterationTimeout: 1000,
    iterations: safeParseIterations(values.iterations ?? '10'),
    model: safeParseString(values.model ?? 'auto') || 'auto',
    prompt: safeParseString(values.prompt ?? ''),
    runner: safeParseRunner(values.runner ?? 'cursor'),
    timeout: 1000,
  };

  if (values.worktree) {
    config.worktree = safeParseString(values.worktree);
    config.worktreeBase = safeParseString(values.worktreeBase || 'main');
    config.worktreeSkipSetup = safeParseBoolean(
      values.worktreeSkipSetup || 'false',
    );
  }

  return config;
};

export const safeParseBoolean = (
  value: string | undefined,
  defaultValue: boolean = false,
): boolean => {
  if (value === undefined || value === null || typeof value !== 'string') {
    return defaultValue;
  }

  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  return defaultValue;
};

export const safeParseDebug = (
  debug: string | undefined,
): WorkflowConfigDebug => {
  if (debug === undefined) {
    return DEFAULT_WORKFLOW_DEBUG;
  }

  switch (debug) {
    case 'debug':
      return 'debug';
    case 'omit':
      return 'omit';
    case 'verbose':
      return 'verbose';

    default:
      return DEFAULT_WORKFLOW_DEBUG;
  }
};

export const safeParseIterations = (iterations: string): number => {
  const parsed = parseInt(iterations, 10);

  if (isNaN(parsed)) {
    return DEFAULT_WORKFLOW_ITERATIONS;
  }

  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_WORKFLOW_ITERATIONS;
  }

  const valueMax = Math.min(parsed, 100);
  const valueSafe = Math.max(1, valueMax);

  return valueSafe;
};

export const safeParseRunner = (
  runner: string | undefined,
): WorkflowConfigRunner => {
  if (runner !== undefined && isDriverId(runner)) {
    return runner;
  }

  return DEFAULT_WORKFLOW_RUNNER;
};

export const safeParseString = (value: string): string => {
  if (value === undefined || value === null || typeof value !== 'string') {
    return '';
  }

  return value.trim();
};
