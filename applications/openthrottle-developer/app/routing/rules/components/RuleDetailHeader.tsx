import { Badge, Button, cn, Switch } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { Link } from 'react-router';

import { RulesScopeBadges } from '~/routing/rules/components/RulesScopeBadges';
import type { TagActionRuleRowData } from '~/routing/rules/components/RulesTable';
import { RulesTableRowActions } from '~/routing/rules/components/RulesTableRowActions';
import { RULE_DETAIL_COPY, RULES_COPY } from '~/routing/rules/data/data.copy';
import {
  buildRuleScopeTrail,
  summarizeRuleAction,
} from '~/routing/rules/utils/formatters';

export interface RuleDetailHeaderProps {
  readonly className?: string;
  readonly onToggleEnabled: (rule: TagActionRuleRowData) => void;
  readonly pending: boolean;
  readonly repositoryNames: ReadonlyMap<string, string>;
  readonly rule: TagActionRuleRowData;
}

/**
 * @description Rule detail header: title, scope trail, action summary and match
 * tags, the enabled switch, an edit link, and the row-actions popover (enable,
 * edit, delete). Delete submits to the route action like the rules table does.
 */
export const RuleDetailHeader = (
  props: RuleDetailHeaderProps,
): React.ReactElement => {
  const { className, onToggleEnabled, pending, repositoryNames, rule } = props;

  // Hooks

  // Setup
  const trail = buildRuleScopeTrail(rule, repositoryNames);

  // Handlers
  const handleCheckedChange = (): void => {
    onToggleEnabled(rule);
  };

  // Markup
  const matchesEveryPlan = (
    <span className="text-muted-foreground text-xs italic">
      {RULES_COPY.matchesEveryPlan}
    </span>
  );
  const tagBadges = rule.tagAll.map((tag) => (
    <Badge className="bg-muted" key={tag}>
      {tag}
    </Badge>
  ));

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <header
      className={cn('flex flex-col gap-3', className)}
      data-testid="RuleDetailHeader"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <GlobalHeading heading="h1" title={rule.title} />
        <div className="flex items-center gap-2">
          <Switch
            aria-label={RULE_DETAIL_COPY.enabledLabel}
            checked={rule.enabled}
            disabled={pending}
            onCheckedChange={handleCheckedChange}
          />
          <Button asChild={true} size="sm" variant="outline">
            <Link to={`/rules/${rule.id}/edit`}>{RULES_COPY.editAction}</Link>
          </Button>
          <RulesTableRowActions
            onToggleEnabled={onToggleEnabled}
            pending={pending}
            rule={rule}
          />
        </div>
      </div>
      <RulesScopeBadges className="p-0" trail={trail} />
      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="secondary">{rule.actionType}</Badge>
        <span data-testid="RuleDetailActionSummary">
          {summarizeRuleAction(rule.actionType, rule.actionPayloadJson)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {rule.tagAll.length === 0 ? matchesEveryPlan : tagBadges}
      </div>
    </header>
  );
};
