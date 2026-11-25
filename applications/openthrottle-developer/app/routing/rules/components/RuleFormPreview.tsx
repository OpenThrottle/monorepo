import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { RULE_PREVIEW_COPY } from '~/routing/rules/data/copy';
import type { UseRuleFormResult } from '~/routing/rules/hooks/useRuleForm';
import { useRulePreview } from '~/routing/rules/hooks/useRulePreview';
import { normalizeRuleFormChoice } from '~/routing/rules/utils/rule-preview-params';

export interface RuleFormPreviewProps {
  readonly className?: string;
  /** The rule form; only its match fields are read, and the summary follows them. */
  readonly form: Pick<
    UseRuleFormResult,
    | 'actionType'
    | 'environment'
    | 'projectId'
    | 'repositoryId'
    | 'status'
    | 'tagAll'
  >;
}

/**
 * @description The rule form's live "Matches N of M plans" line: a debounced read-only dry run of
 * the match fields currently in the form, so the user sees what a rule would match before
 * saving. Notes when the scan was truncated and when an environment qualifier makes the rule
 * match nothing today.
 */
export const RuleFormPreview = (
  props: RuleFormPreviewProps,
): React.ReactElement => {
  const { className, form } = props;

  // Hooks
  const environment = normalizeRuleFormChoice(form.environment);
  const { loading, state } = useRulePreview({
    match: {
      actionType: form.actionType,
      environment,
      projectId: normalizeRuleFormChoice(form.projectId),
      repositoryId: normalizeRuleFormChoice(form.repositoryId),
      status: normalizeRuleFormChoice(form.status),
      tagAll: form.tagAll,
    },
  });

  // Setup
  const preview = state?.kind === 'ready' ? state.preview : null;

  // Handlers

  // Markup
  const summary = preview != null && (
    <p data-testid="RuleFormPreviewSummary">
      {RULE_PREVIEW_COPY.summaryPrefix} <strong>{preview.matchedCount}</strong>{' '}
      {RULE_PREVIEW_COPY.summaryOf} {preview.evaluated}{' '}
      {RULE_PREVIEW_COPY.summaryPlans}
    </p>
  );
  const waiting = state == null && (
    <p className="text-muted-foreground">{RULE_PREVIEW_COPY.formLoading}</p>
  );
  const failure = state?.kind === 'error' && (
    <p className="text-destructive" role="alert">
      {RULE_PREVIEW_COPY.errorPrefix} {state.message}
    </p>
  );
  const truncated = preview?.truncated === true && (
    <p
      className="text-muted-foreground text-xs"
      data-testid="RuleFormPreviewTruncated"
    >
      {RULE_PREVIEW_COPY.truncatedNote}
    </p>
  );
  const environmentNote = environment != null && (
    <p
      className="text-muted-foreground text-xs"
      data-testid="RuleFormPreviewEnvironmentNote"
    >
      {RULE_PREVIEW_COPY.environmentQualifiedNote}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      aria-busy={loading}
      aria-live="polite"
      className={cn(
        'bg-muted/40 ui-border rounded-lg border p-3 text-sm',
        className,
      )}
      data-loading={loading}
      data-testid="RuleFormPreview"
    >
      {summary}
      {waiting}
      {failure}
      {truncated}
      {environmentNote}
    </div>
  );
};
