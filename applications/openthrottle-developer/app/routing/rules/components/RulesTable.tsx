import * as React from 'react';
import { Badge, Button, Card } from '@openthrottle/react-router-shadcn';
import { RULES_COPY } from '~/routing/rules/data/data.copy';

export interface TagActionRuleRowData {
  actionPayloadJson: string;
  actionType: string;
  enabled: boolean;
  environment?: string | null;
  id: string;
  status?: string | null;
  tagAll: string[];
}

export interface RulesTableProps {
  // className?: string;
  onDelete: (id: string) => void;
  onEdit: (rule: TagActionRuleRowData) => void;
  onToggleEnabled: (rule: TagActionRuleRowData) => void;
  pending?: boolean;
  rules: TagActionRuleRowData[];
}

export const RulesTable = (props: RulesTableProps): React.ReactElement => {
  const { onDelete, onEdit, onToggleEnabled, pending = false, rules } = props;

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
          className="flex flex-wrap items-center gap-2 p-3 text-sm"
          key={rule.id}
        >
          <Badge>{rule.actionType}</Badge>
          {rule.tagAll.length === 0 ? (
            <span className="text-muted-foreground text-xs">
              {RULES_COPY.matchesEveryPlan}
            </span>
          ) : (
            rule.tagAll.map((tag) => (
              <Badge className="bg-muted" key={tag}>
                {tag}
              </Badge>
            ))
          )}
          {rule.status != null ? (
            <span className="text-muted-foreground text-xs">
              status={rule.status}
            </span>
          ) : null}
          {rule.environment != null ? (
            <span className="text-muted-foreground text-xs">
              env={rule.environment}
            </span>
          ) : null}
          {!rule.enabled ? (
            <Badge className="border-amber-500/60 bg-amber-500/10">
              disabled
            </Badge>
          ) : null}
          <span className="grow" />
          <Button
            disabled={pending}
            onClick={() => onToggleEnabled(rule)}
            size="sm"
            type="button"
            variant="outline"
          >
            {rule.enabled ? RULES_COPY.disableAction : RULES_COPY.enableAction}
          </Button>
          <Button
            disabled={pending}
            onClick={() => onEdit(rule)}
            size="sm"
            type="button"
            variant="outline"
          >
            {RULES_COPY.editAction}
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
      ))}
    </Card>
  );
};
