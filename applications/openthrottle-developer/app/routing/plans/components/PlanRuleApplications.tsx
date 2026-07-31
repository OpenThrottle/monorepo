import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import { PLAN_RULE_APPLICATION_STATE_STYLES } from '~/routing/plans/data/plan-rule-applications-state-styles';
import {
  attentionRank,
  renderDetails,
} from '~/routing/plans/utils/plan-rule-applications';

export interface PlanRuleApplicationRow {
  createdAt: string;
  detailsJson?: string | null;
  id: string;
  ruleId: string;
  state: string;
  taskId?: string | null;
}

export interface PlanRuleApplicationsProps {
  // className?: string;
  applications: PlanRuleApplicationRow[];
}

export const PlanRuleApplications = (
  props: PlanRuleApplicationsProps,
): React.ReactElement | null => {
  const { applications } = props;

  // Hooks

  // Setup
  // Flagged/orphaned rows are the attention queue; show them first.
  const ordered = [...applications].sort(
    (a, b) => attentionRank(a.state) - attentionRank(b.state),
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (applications.length === 0) {
    return null;
  }

  return (
    <div data-testid="PlanRuleApplications">
      <ul className="flex flex-col gap-2">
        {ordered.map((application) => {
          const details = renderDetails(application.detailsJson);
          return (
            <li
              className="flex flex-wrap items-center gap-2 text-xs"
              key={application.id}
            >
              <Badge
                className={
                  PLAN_RULE_APPLICATION_STATE_STYLES[application.state] ?? ''
                }
                title={`Rule ${application.ruleId}`}
              >
                {application.state}
              </Badge>
              <span className="text-muted-foreground">
                rule {application.ruleId.slice(0, 8)}…
              </span>
              {application.taskId != null ? (
                <span className="text-muted-foreground">
                  task {application.taskId.slice(0, 8)}…
                </span>
              ) : null}
              {details != null ? (
                <span className="text-muted-foreground">{details}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
