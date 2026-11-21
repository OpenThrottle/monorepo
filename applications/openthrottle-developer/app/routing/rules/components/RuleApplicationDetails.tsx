import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import { RULE_DETAIL_COPY } from '~/routing/rules/data/data.copy';
import { parseRuleApplicationDetails } from '~/routing/rules/utils/rule-applications';

export interface RuleApplicationDetailsProps {
  readonly className?: string;
  readonly detailsJson: string | null | undefined;
}

const SHORT_ID_LENGTH = 8;

/**
 * @description A ledger row's `detailsJson` as readable parts: the reason as a
 * label, a referenced rule as a link to its detail page, a prompt as a short
 * id, and any leftover keys as `key: value`. Renders nothing for empty details.
 */
export const RuleApplicationDetails = (
  props: RuleApplicationDetailsProps,
): React.ReactElement | null => {
  const { className, detailsJson } = props;

  // Hooks

  // Setup
  const details = parseRuleApplicationDetails(detailsJson);
  const reasonLabels = new Map<string, string>(
    Object.entries(RULE_DETAIL_COPY.detailsReasonLabels),
  );
  const hasReason = details.reason != null;
  const reasonLabel = hasReason
    ? (reasonLabels.get(details.reason) ?? details.reason)
    : null;
  const isEmpty =
    reasonLabel == null &&
    details.ruleId == null &&
    details.promptId == null &&
    details.extras.length === 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (isEmpty) {
    return null;
  }

  return (
    <ul
      className={cn(
        'text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs',
        className,
      )}
      data-testid="RuleApplicationDetails"
    >
      {reasonLabel != null && (
        <li data-detail="reason">
          <span className="text-foreground font-medium">{reasonLabel}</span>
        </li>
      )}
      {details.ruleId != null && (
        <li data-detail="rule">
          {RULE_DETAIL_COPY.detailsRuleLabel}{' '}
          <Link
            className="hover:text-primary underline underline-offset-2"
            to={`/rules/${details.ruleId}`}
          >
            {details.ruleId.slice(0, SHORT_ID_LENGTH)}
          </Link>
        </li>
      )}
      {details.promptId != null && (
        <li data-detail="prompt">
          {RULE_DETAIL_COPY.detailsPromptLabel}{' '}
          <code>{details.promptId.slice(0, SHORT_ID_LENGTH)}</code>
        </li>
      )}
      {details.extras.map(([key, value]) => (
        <li data-detail="extra" key={key}>
          {key}: {value}
        </li>
      ))}
    </ul>
  );
};
