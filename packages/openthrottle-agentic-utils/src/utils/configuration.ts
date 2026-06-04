import { parseArgs } from 'node:util';
import { z } from 'zod';
import type {
  WorkflowConfigDebug,
  WorkflowConfigRunner,
  WorkflowConfig,
} from '@openthrottle/openthrottle-agentic-workflow';
import {
  DEFAULT_WORKFLOW_DEBUG,
  DEFAULT_WORKFLOW_ITERATIONS,
} from '../config/index.js';
import type { Writable } from '../types/index.js';

const _workflowSchema = z.object({
  debug: z.enum(['debug', 'verbose', 'omit']).default('omit'),
  iterations: z.number().min(1).max(100).default(10),
  model: z.string().default('auto'),
  name: z.string().default(''),
  prompt: z.string().default(''),
  runner: z.enum(['cursor', 'claude', 'opencode']).default('cursor'),
  worktree: z.string().optional(),
  worktreeBase: z.string().default('main'),
  worktreeSkipSetup: z.boolean().default(false),
});

const parseWorkflowConfig = () => {
  const args = parseArgs({
    allowPositionals: true,
    options: {
      debug: { short: 'd', type: 'string' },
      iterations: { default: '10', short: 'i', type: 'string' },
      model: { default: 'auto', short: 'm', type: 'string' },
      name: { short: 'n', type: 'string' },
      prompt: { default: '', short: 'p', type: 'string' },
      runner: { default: 'cursor', short: 'r', type: 'string' },
      worktree: { short: 'w', type: 'string' },
      worktreeBase: { default: 'main', short: 'b', type: 'string' },
      worktreeSkipSetup: { default: 'false', short: 's', type: 'string' },
    },
    strict: true,
  });

  const config: Writable<WorkflowConfig> = {
    cwdOpenThrottle: process.cwd(),
    cwdTarget: process.cwd(),
    debug: safeParseDebug(args.values.debug),
    iterationTimeout: 1000,
    iterations: safeParseIterations(args.values.iterations),
    model: safeParseString(args.values.model),
    prompt: safeParseString(args.values.prompt),
    runner: safeParseRunner(args.values.runner),
    timeout: 1000,
  };

  if (args.values.worktree) {
    config.worktree = safeParseString(args.values.worktree);
    config.worktreeBase = safeParseString(args.values.worktreeBase);
    config.worktreeSkipSetup = safeParseBoolean(args.values.worktreeSkipSetup);
  }

  return config;
};

// /**
//  * @description Parses command line arguments into a WorkflowConfig object.
//  */
// export const parseWorkflowConfigFromArgs = (): WorkflowConfig => {
//   try {
//     return parseWorkflowConfig();
//   } catch (error) {
//     console.error(`🚨 ⚠️ 🚨 ⚠️ Failed to parse workflow config: ${error}`);
//     // TODO: Show tool usage here
//     process.exit(1);
//   }
// };
export const parseWorkflowConfigFromArgs = (): WorkflowConfig => {
  const config: Writable<WorkflowConfig> = {
    cwdOpenThrottle: process.cwd(),
    cwdTarget: process.cwd(),
    debug: 'debug',
    iterationTimeout: 1000,
    iterations: 1,
    model: 'auto',
    prompt: '',
    runner: 'cursor',
    timeout: 1000,
    // worktree: '',
    // worktreeBase: '',
    // worktreeSkipSetup: false,
  };

  const { positionals, values } = parseArgs({
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

  if (values.worktree) {
    config.worktree = safeParseString(values.worktree);
    config.worktreeBase = safeParseString(values.worktreeBase || 'main');
    config.worktreeSkipSetup = safeParseBoolean(
      values.worktreeSkipSetup || 'false',
    );
  }

  const configMerged = Object.assign({}, config, values);

  console.log('🔴 🔴 🔴 ', { configMerged, positionals });

  return configMerged;
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

export const safeParseRunner = (runner: string): WorkflowConfigRunner => {
  switch (runner) {
    case 'claude':
      return 'claude';
    case 'cursor':
      return 'cursor';
    case 'opencode':
      return 'opencode';
  }

  throw new Error(`Unknown runner: ${runner}`);
};

export const safeParseString = (value: string): string => {
  if (value === undefined || value === null || typeof value !== 'string') {
    return '';
  }

  return value.trim();
};
