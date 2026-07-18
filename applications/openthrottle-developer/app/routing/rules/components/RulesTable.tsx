import * as React from 'react';
import { Badge, Button, Card } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { summarizeRuleAction } from '~/routing/rules/utils/formatters';

export interface TagActionRuleRowData {
  actionPayloadJson: string;
  actionType: string;
  enabled: boolean;
  environment?: string | null;
  id: string;
  status?: string | null;
  tagAll: string[];
  title: string;
}

export interface RulesTableProps {
  // className?: string;
  onDelete: (id: string) => void;
  onToggleEnabled: (rule: TagActionRuleRowData) => void;
  pending?: boolean;
  rules: TagActionRuleRowData[];
}

export const RulesTable = (props: RulesTableProps): React.ReactElement => {
  const { onDelete, onToggleEnabled, pending = false, rules } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (rules.length === 0) {
    return (
      <Card className="p-6 text-sm" data-testid="RulesTable">
        <p className="font-medium">{RULES_COPY.emptyTitle}</p>
        <p className="text-muted-foreground mt-1">{RULES_COPY.emptyBody}</p>
      </Card>
    );
  }

  return (
    <Card className="divide-y p-0" data-testid="RulesTable">
      {rules.map((rule) => (
        <div
          className="flex items-start justify-between gap-4 p-4"
          key={rule.id}
        >
          <div className="min-w-0 space-y-2">
            {/* Primary: human-readable title */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{rule.title}</span>
              {rule.enabled ? null : (
                <Badge className="border-amber-500/60 bg-amber-500/10">
                  {RULES_COPY.disableAction}d
                </Badge>
              )}
            </div>

            {/* Secondary: action type + payload summary + qualifiers */}
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary">{rule.actionType}</Badge>
              <span>
                {summarizeRuleAction(rule.actionType, rule.actionPayloadJson)}
              </span>
              {rule.status != null && rule.status !== '' ? (
                <span>
                  {RULES_COPY.statusLabel}: {rule.status}
                </span>
              ) : null}
              {rule.environment != null && rule.environment !== '' ? (
                <span>
                  {RULES_COPY.environmentLabel}: {rule.environment}
                </span>
              ) : null}
            </div>

            {/* Match tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {rule.tagAll.length === 0 ? (
                <span className="text-muted-foreground text-xs italic">
                  {RULES_COPY.matchesEveryPlan}
                </span>
              ) : (
                rule.tagAll.map((tag) => (
                  <Badge className="bg-muted" key={tag}>
                    {tag}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              disabled={pending}
              onClick={() => onToggleEnabled(rule)}
              size="sm"
              type="button"
              variant="outline"
            >
              {rule.enabled
                ? RULES_COPY.disableAction
                : RULES_COPY.enableAction}
            </Button>
            <Button asChild={true} size="sm" type="button" variant="outline">
              <Link to={`/rules/${rule.id}/edit`}>{RULES_COPY.editAction}</Link>
            </Button>
            <Button
              disabled={pending}
              onClick={() => onDelete(rule.id)}
              size="sm"
              type="button"
              variant="destructive"
            >
              {RULES_COPY.deleteAction}
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
};
