#!/usr/bin/env node

import { parseArgs } from 'node:util';
import type { WorkflowConfig } from '@openthrottle/openthrottle-agentic-workflow';
import {
  ensurePostgresReachable,
  getPostgresUrl,
} from '@openthrottle/openthrottle-agentic-utils';

const parseWorkflowConfigFromArgs = (): WorkflowConfig => {
  const config: WorkflowConfig = {
    cwdOpenThrottle: process.cwd(),
    cwdTarget: process.cwd(),
    debug: 'debug',
    iterationTimeout: 1000,
    iterations: 1,
    model: 'auto',
    prompt: '',
    runner: 'cursor',
    timeout: 1000,
    worktree: '',
    worktreeBase: '',
    worktreeSkipSetup: false,
  };

  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      debug: { short: 'd', type: 'string' },
      iterations: { default: '10', short: 'i', type: 'string' },
      model: { short: 'm', type: 'string' },
      name: { short: 'n', type: 'string' },
      prompt: { short: 'p', type: 'string' },
      runner: { short: 'r', type: 'string' },
      worktree: { short: 'w', type: 'string' },
    },
    strict: true,
  });

  const configMerged = Object.assign({}, config, values);

  console.log('🔴 🔴 🔴 ', { configMerged });

  return configMerged;
};

export const main = async (): Promise<void> => {
  const _config = parseWorkflowConfigFromArgs();

  /** Ensure our Postgres connection is reachable. */
  const connectionString = getPostgresUrl();
  await ensurePostgresReachable(connectionString);

  process.exit(0);
};

if (require.main === module) {
  main().catch((error) => {
    const FATAL_PREFIX = '🚨 🚨 🚨 ';

    console.error(`${FATAL_PREFIX}Fatal error:`, error);
    process.exit(1);
  });
}
