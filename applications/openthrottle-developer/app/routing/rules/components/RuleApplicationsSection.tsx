import { Badge, cn } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { Link } from 'react-router';

import { PLAN_RULE_APPLICATION_STATE_STYLES } from '~/routing/plans/data/plan-rule-applications-state-styles';
import { RuleApplicationDetails } from '~/routing/rules/components/RuleApplicationDetails';
import { RULE_DETAIL_COPY } from '~/routing/rules/data/copy';
import { formatRulesDate } from '~/routing/rules/utils/formatters';
import type { RuleApplicationRowData } from '~/routing/rules/utils/rule-applications';
import { groupRuleApplicationsByState } from '~/routing/rules/utils/rule-applications';

export interface RuleApplicationsSectionProps {
  readonly applications: readonly RuleApplicationRowData[];
  readonly className?: string;
}

const SHORT_ID_LENGTH = 8;

/**
 * @description The rule's apply-once ledger grouped by state, attention queue
 * (flagged, orphaned) first. Each row links to its plan and shows its details;
 * groups with no rows are hidden, and a rule with no rows at all gets one empty
 * message.
 */
export const RuleApplicationsSection = (
  props: RuleApplicationsSectionProps,
): React.ReactElement => {
  const { applications, className } = props;

  // Hooks

  // Setup
  const groups = groupRuleApplicationsByState(applications);
  const stateLabels = new Map<string, string>(
    Object.entries(RULE_DETAIL_COPY.stateLabels),
  );

  // Handlers

  // Markup
  const groupSections = groups.map((group) => (
    <section
      className="flex flex-col gap-2"
      data-state={group.state}
      data-testid="RuleApplicationsGroup"
      key={group.state}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Badge className={PLAN_RULE_APPLICATION_STATE_STYLES[group.state]}>
          {stateLabels.get(group.state) ?? group.state}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {group.applications.length}
        </span>
      </h3>
      <ul className="bg-card ui-border divide-y rounded-lg border">
        {group.applications.map((application) => (
          <li
            className="flex flex-col gap-1 p-3"
            data-testid="RuleApplicationRow"
            key={application.id}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <Link
                className="hover:text-primary font-medium underline underline-offset-2"
                to={`/plans/${application.planId}`}
              >
                {application.planTitle ??
                  `${RULE_DETAIL_COPY.unknownPlanLabel} ${application.planId.slice(0, SHORT_ID_LENGTH)}`}
              </Link>
              {application.taskId != null && (
                <span className="text-muted-foreground text-xs">
                  {RULE_DETAIL_COPY.taskLabel}{' '}
                  {application.taskId.slice(0, SHORT_ID_LENGTH)}
                </span>
              )}
              <span className="text-muted-foreground ml-auto text-xs">
                {formatRulesDate(application.createdAt)}
              </span>
            </div>
            <RuleApplicationDetails detailsJson={application.detailsJson} />
          </li>
        ))}
      </ul>
    </section>
  ));
  const empty = (
    <p
      className="text-muted-foreground text-sm"
      data-testid="RuleApplicationsEmpty"
    >
      {RULE_DETAIL_COPY.applicationsEmpty}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className={cn('flex flex-col gap-4', className)}
      data-testid="RuleApplicationsSection"
    >
      <div>
        <GlobalHeading
          heading="h2"
          size="lg"
          title={RULE_DETAIL_COPY.applicationsTitle}
        />
        <p className="text-muted-foreground text-sm">
          {RULE_DETAIL_COPY.applicationsDescription}
        </p>
      </div>
      {groups.length === 0 ? empty : groupSections}
    </section>
  );
};
