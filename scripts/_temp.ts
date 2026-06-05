#!/usr/bin/env node

import { parseWorkflowConfigFromArgs } from '@openthrottle/openthrottle-agentic-utils';

/**
 * Ralph: agentic plan/task runner. Single flow (Cortex required); see main() for steps.
 */
const main = async () => {
  const config = parseWorkflowConfigFromArgs();

  console.log('🔴 🔴 🔴 workflowConfigFromArgs', config);
};

main().catch((error) => {
  console.error('🚨 🚨 🚨 ', error);
  process.exit(1);
});
