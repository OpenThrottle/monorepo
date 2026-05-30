/**
 * @description Applies UI / GraphQL `ralphDebugCli` tuning to the in-process {@link ralphDebugLogger}
 * (orchestrator path parity with nested `workflow-ralph --debug` / `--verbose`).
 */

import { setRalphDebugLevel, type RalphDebugLevel } from './ralph-debug-logger';
import type { RalphNestedDebugCli } from './workflow-ralph-nested-argv';

const mapDebugCliToLevel = (debug: RalphNestedDebugCli): RalphDebugLevel => {
  switch (debug) {
    case 'debug':
      return 'debug';
    case 'verbose':
      return 'verbose';
    case 'omit':
      return 'off';
    default: {
      const _exhaustive: never = debug;
      return _exhaustive;
    }
  }
};

/**
 * @description Enables shim debug for in-process Ralph runs when tuning requests it.
 */
export const applyWorkflowRalphDebugCli = (
  debug: RalphNestedDebugCli,
): void => {
  setRalphDebugLevel(mapDebugCliToLevel(debug));
};
