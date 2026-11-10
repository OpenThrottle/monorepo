import type { Provider } from '@nestjs/common';
import { executeGraphqlV2 } from '@openthrottle/nodejs-graphql';
import { buildWorkflowExecuteGraphqlV2Options } from '@openthrottle/openthrottle-agentic-ralph';

import { resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv } from '../agentic-ralph/agentic-ralph.utils.ts';
import { createAgenticRalphOrchestratorDeps } from '../agentic-ralph/agentic-ralph-orchestrator-deps.factory.ts';
import { OT_LOOP_EXECUTE_GRAPHQL } from './ot-loop.constants.ts';

/**
 * @description The worker-scoped GraphQL executor for OT Loop: Ralph's own `executeGraphqlV2` wiring
 * (worker credentials merged under each call, per-call headers deep-merged), so the two runners
 * authenticate identically.
 */
export const otLoopExecuteGraphqlProvider: Provider = {
  provide: OT_LOOP_EXECUTE_GRAPHQL,
  useFactory: () => {
    return createAgenticRalphOrchestratorDeps(
      executeGraphqlV2,
      buildWorkflowExecuteGraphqlV2Options(
        resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv(),
      ),
    ).executeGraphqlV2;
  },
};
