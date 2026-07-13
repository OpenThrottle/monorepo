import * as React from 'react';
import { Badge, Card } from '@openthrottle/react-router-shadcn';

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

const STATE_STYLES: Record<string, string> = {
  applied: 'border-emerald-500/60 bg-emerald-500/10',
  flagged: 'border-red-500/60 bg-red-500/10',
  orphaned: 'border-amber-500/60 bg-amber-500/10',
  'pre-satisfied': 'border-sky-500/60 bg-sky-500/10',
};

const attentionRank = (state: string): number =>
  state === 'flagged' ? 0 : state === 'orphaned' ? 1 : 2;

const renderDetails = (
  detailsJson: string | null | undefined,
): string | null => {
  if (detailsJson == null || detailsJson === '') return null;
  try {
    const parsed: unknown = JSON.parse(detailsJson);
    if (typeof parsed !== 'object' || parsed === null) return detailsJson;
    return Object.entries(parsed)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(' · ');
  } catch {
    return detailsJson;
  }
};

export const PlanRuleApplications = (
  props: PlanRuleApplicationsProps,
): React.ReactElement | null => {
  const { applications } = props;

  // Hooks

  // Setup — flagged/orphaned rows are the attention queue; show them first.
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
    <Card className="p-4" data-testid="PlanRuleApplications">
      <h3 className="mb-2 text-sm font-semibold">Rule applications</h3>
      <ul className="flex flex-col gap-2">
        {ordered.map((application) => {
          const details = renderDetails(application.detailsJson);
          return (
            <li
              className="flex flex-wrap items-center gap-2 text-xs"
              key={application.id}
            >
              <Badge
                className={STATE_STYLES[application.state] ?? ''}
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
    </Card>
  );
};
