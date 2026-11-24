import { isDriverId } from '@openthrottle/openthrottle-drivers';

import {
  DEFAULT_WORKFLOW_DEBUG,
  DEFAULT_WORKFLOW_ITERATIONS,
  DEFAULT_WORKFLOW_RUNNER,
} from '../config/index.ts';
import type {
  WorkflowConfigDebug,
  WorkflowConfigRunner,
} from '../types/workflow-config.ts';

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
