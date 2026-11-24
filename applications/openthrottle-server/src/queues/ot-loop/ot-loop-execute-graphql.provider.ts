import type { Provider } from '@nestjs/common';
import { executeGraphqlV2 } from '@openthrottle/nodejs-graphql';

import { OT_LOOP_EXECUTE_GRAPHQL } from './ot-loop.constants.ts';
import {
  buildPlanRunWorkerGraphqlOptions,
  resolvePlanRunWorkerGraphqlConfigFromEnv,
} from './ot-loop.utils.ts';
import { createOtLoopExecuteGraphql } from './ot-loop-execute-graphql.factory.ts';

/**
 * @description The worker-scoped GraphQL executor for OT Loop: worker credentials merged under each
 * call, per-call headers deep-merged.
 */
export const otLoopExecuteGraphqlProvider: Provider = {
  provide: OT_LOOP_EXECUTE_GRAPHQL,
  useFactory: () => {
    return createOtLoopExecuteGraphql(
      executeGraphqlV2,
      buildPlanRunWorkerGraphqlOptions(
        resolvePlanRunWorkerGraphqlConfigFromEnv(),
      ),
    );
  },
};
