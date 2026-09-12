import type { PlanDetailOutputChunksQuery } from '@openthrottle/openthrottle-developer-codegen';
import { TabsContent } from '@openthrottle/react-router-shadcn';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import { LinkedArtifactsPanel } from '~/routing/plans/components/LinkedArtifactsPanel';
import { LinkedArtifactsPanelSkeleton } from '~/routing/plans/components/LinkedArtifactsPanelSkeleton';
import { OutputStream } from '~/routing/plans/components/OutputStream';
import { PlanDeferredSection } from '~/routing/plans/components/PlanDeferredSection';
import { PlanOutputStreamSkeleton } from '~/routing/plans/components/PlanOutputStreamSkeleton';
import {
  PLAN_DEFERRED_SECTION_COPY,
  PLAN_TAB_OUTPUT_COPY,
} from '~/routing/plans/data/data.copy';
import { usePlanDetailRouteData } from '~/routing/plans/hooks/usePlanDetailRouteData';

type Chunk = PlanDetailOutputChunksQuery['planOutputStreamChunks'][number];

export interface PlanTabOutputProps {
  chunks: Chunk[];
  className?: string;
}

export const PlanTabOutput = (
  props: PlanTabOutputProps,
): React.ReactElement => {
  const { chunks, className: _className } = props;

  // Hooks
  // The boundary gates on the loader's own snapshot promise, while the rendered
  // chunks come from `chunks` — the live-merged stream. That split is what keeps
  // the empty state honest: it can only appear once the snapshot has actually
  // resolved as empty, never as the pending state.
  // Linked artifacts come from the same loader, deferred on their own promise
  // so a slow ledger query never blocks the output stream.
  const { ledger, outputChunks } = usePlanDetailRouteData();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsContent
      className="w-full space-y-4 overflow-scroll rounded-lg"
      data-testid="PlanLoggerOutput"
      value="output"
    >
      <PlanDeferredSection
        errorText={PLAN_DEFERRED_SECTION_COPY.outputError}
        fallback={<PlanOutputStreamSkeleton />}
        resolve={outputChunks}
      >
        {() =>
          chunks.length === 0 ? (
            <div>
              <GlobalHeading
                className="mb-4"
                title="No plan output chunks yet."
              />
              <p className="text-muted-foreground text-sm">
                Iterations append here when agents call{' '}
                <code className="text-xs">appendPlanOutput</code> (for example
                from workflow-ralph or MCP). Local CLI runs log to your terminal
                instead.
              </p>
            </div>
          ) : (
            <OutputStream chunks={chunks} />
          )
        }
      </PlanDeferredSection>
      <OpenThrottleFieldset
        id="output-artifacts"
        legend={PLAN_TAB_OUTPUT_COPY.linkedArtifactsHeading}
      >
        <PlanDeferredSection
          errorText={PLAN_DEFERRED_SECTION_COPY.outputError}
          fallback={<LinkedArtifactsPanelSkeleton />}
          resolve={ledger}
        >
          {(data) =>
            data.linkedArtifacts.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {PLAN_TAB_OUTPUT_COPY.linkedArtifactsEmpty}
              </p>
            ) : (
              <LinkedArtifactsPanel artifacts={data.linkedArtifacts} />
            )
          }
        </PlanDeferredSection>
      </OpenThrottleFieldset>
    </TabsContent>
  );
};
