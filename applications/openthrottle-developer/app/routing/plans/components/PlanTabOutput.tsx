import * as React from 'react';
import { PlanDetailIndexLoaderQuery } from '@openthrottle/openthrottle-developer-codegen';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { TabsContent } from '@openthrottle/react-router-shadcn';
import { OutputStream } from '~/routing/plans/components/OutputStream';
// import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
// import { LinkedArtifactsPanel } from '~/routing/plans/components/LinkedArtifactsPanel';
// import { PlanRuleApplications } from '~/routing/plans/components/PlanRuleApplications';
// import { PLAN_TAB_OUTPUT_COPY } from '~/routing/plans/data/data.copy';
// import { usePlanDetailRouteData } from '~/routing/plans/hooks/usePlanDetailRouteData';

type Chunk = PlanDetailIndexLoaderQuery['planOutputStreamChunks'][number];

export interface PlanTabOutputProps {
  chunks: Chunk[];
  className?: string;
}

export const PlanTabOutput = (
  props: PlanTabOutputProps,
): React.ReactElement => {
  const { chunks, className: _className } = props;

  // Hooks
  // Rule applications + linked artifacts come from the route loader
  // (same source as the tab shell) rather than being prop-drilled through tabs.
  // const { linkedArtifacts, ruleApplications } = usePlanDetailRouteData();

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
      {/* <Card className="p-4 md:p-8"> */}
      {chunks.length === 0 ? (
        <div>
          <GlobalHeading className="mb-4" title="No plan output chunks yet." />
          <p className="text-muted-foreground text-sm">
            Iterations append here when agents call{' '}
            <code className="text-xs">appendPlanOutput</code> (for example from
            workflow-ralph or MCP). Local CLI runs log to your terminal instead.
          </p>
        </div>
      ) : (
        <OutputStream chunks={chunks} />
      )}
      {/* </Card> */}

      {/* Agent output — what our agents write, iteration by iteration. */}
      {/* <OpenThrottleFieldset
        id="output-agent-output"
        legend={PLAN_TAB_OUTPUT_COPY.agentOutputHeading}
      >
        {chunks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No plan output chunks yet. Iterations append here when agents call{' '}
            <code className="text-xs">appendPlanOutput</code> (for example from
            workflow-ralph or MCP). Local CLI runs log to your terminal instead.
          </p>
        ) : (
          <OutputStream chunks={chunks} />
        )}
      </OpenThrottleFieldset> */}

      {/* Rule change log — the rule-applications ledger for this plan. */}
      {/* <OpenThrottleFieldset
        id="output-rule-change-log"
        legend={PLAN_TAB_OUTPUT_COPY.ruleChangeLogHeading}
      >
        {ruleApplications.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            {PLAN_TAB_OUTPUT_COPY.ruleChangeLogEmpty}
          </p>
        ) : (
          <PlanRuleApplications applications={ruleApplications} />
        )}
      </OpenThrottleFieldset> */}

      {/* Linked artifacts — what runs produced and linked to this plan. */}
      {/* <OpenThrottleFieldset
        id="output-artifacts"
        legend={PLAN_TAB_OUTPUT_COPY.linkedArtifactsHeading}
      >
        {linkedArtifacts.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            {PLAN_TAB_OUTPUT_COPY.linkedArtifactsEmpty}
          </p>
        ) : (
          <LinkedArtifactsPanel artifacts={linkedArtifacts} />
        )}
      </OpenThrottleFieldset> */}
    </TabsContent>
  );
};
